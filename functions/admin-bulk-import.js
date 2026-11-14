"use strict";

const crypto = require("crypto");

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp, getApps } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

const REGION = "asia-south1";
const MAX_QUESTIONS_PER_IMPORT = 300;
const MAX_BATCH_SIZE = 400;

const ALLOWED_ROLES = ["super_admin", "admin"];

/**
 * Admin authorization
 */
function requireAdmin(request) {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "इस सुविधा के लिए लॉगिन जरूरी है।"
    );
  }

  const role = request.auth.token.role;

  if (!ALLOWED_ROLES.includes(role)) {
    throw new HttpsError(
      "permission-denied",
      "आपको प्रश्न इम्पोर्ट करने की अनुमति नहीं है।"
    );
  }

  return request.auth.uid;
}

/**
 * Safe string helper
 */
function cleanString(value, maxLength = 1000) {
  if (typeof value !== "string") return "";

  return value
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}

/**
 * Validate one question
 */
function validateQuestion(question, index) {
  const errors = [];

  if (!question || typeof question !== "object" || Array.isArray(question)) {
    return {
      valid: false,
      index,
      errors: ["प्रश्न का डेटा सही फॉर्मेट में नहीं है।"]
    };
  }

  const questionHindi = cleanString(question.questionHindi, 2000);
  const questionEnglish = cleanString(question.questionEnglish, 2000);

  if (!questionHindi) {
    errors.push("Hindi प्रश्न खाली है।");
  }

  if (!questionEnglish) {
    errors.push("English प्रश्न खाली है।");
  }

  if (!Array.isArray(question.options) || question.options.length !== 4) {
    errors.push("प्रश्न में ठीक 4 विकल्प होने चाहिए।");
  } else {
    question.options.forEach((option, optionIndex) => {
      if (!option || typeof option !== "object") {
        errors.push(`विकल्प ${optionIndex + 1} गलत है।`);
        return;
      }

      if (!cleanString(option.hindi, 500)) {
        errors.push(`विकल्प ${optionIndex + 1} का Hindi टेक्स्ट खाली है।`);
      }

      if (!cleanString(option.english, 500)) {
        errors.push(`विकल्प ${optionIndex + 1} का English टेक्स्ट खाली है।`);
      }
    });
  }

  const correctAnswer = Number(question.correctAnswer);

  if (
    !Number.isInteger(correctAnswer) ||
    correctAnswer < 0 ||
    correctAnswer > 3
  ) {
    errors.push("सही उत्तर 0 से 3 के बीच होना चाहिए।");
  }

  const examId = cleanString(question.examId, 100);
  const subject = cleanString(question.subject, 150);
  const topic = cleanString(question.topic, 150);
  const source = cleanString(question.source, 500);

  if (!examId) errors.push("Exam ID जरूरी है।");
  if (!subject) errors.push("Subject जरूरी है।");
  if (!topic) errors.push("Topic जरूरी है।");
  if (!source) errors.push("Source की जानकारी जरूरी है।");

  const year = Number(question.year);

  if (
    !Number.isInteger(year) ||
    year < 2000 ||
    year > new Date().getFullYear()
  ) {
    errors.push("प्रश्न का वर्ष सही नहीं है।");
  }

  const shift = cleanString(question.shift, 100);

  if (!shift) {
    errors.push("Exam shift की जानकारी जरूरी है।");
  }

  return {
    valid: errors.length === 0,
    index,
    errors
  };
}

/**
 * Create a consistent fingerprint for duplicate prevention.
 */
function createFingerprint(question) {
  const normalized = {
    questionHindi: cleanString(question.questionHindi, 2000).toLowerCase(),
    questionEnglish: cleanString(question.questionEnglish, 2000).toLowerCase(),

    options: Array.isArray(question.options)
      ? question.options.map((option) => ({
          hindi: cleanString(option.hindi, 500).toLowerCase(),
          english: cleanString(option.english, 500).toLowerCase()
        }))
      : [],

    correctAnswer: Number(question.correctAnswer)
  };

  return crypto
    .createHash("sha256")
    .update(JSON.stringify(normalized))
    .digest("hex");
}

/**
 * Prepare a clean Firestore question document.
 */
function prepareQuestion(question, fingerprint, uid) {
  return {
    questionHindi: cleanString(question.questionHindi, 2000),
    questionEnglish: cleanString(question.questionEnglish, 2000),

    options: question.options.map((option) => ({
      hindi: cleanString(option.hindi, 500),
      english: cleanString(option.english, 500)
    })),

    correctAnswer: Number(question.correctAnswer),

    explanationHindi: cleanString(question.explanationHindi, 3000),
    explanationEnglish: cleanString(question.explanationEnglish, 3000),

    examId: cleanString(question.examId, 100),
    year: Number(question.year),
    shift: cleanString(question.shift, 100),

    subject: cleanString(question.subject, 150),
    topic: cleanString(question.topic, 150),
    subtopic: cleanString(question.subtopic, 150),

    source: cleanString(question.source, 500),
    sourceUrl: cleanString(question.sourceUrl, 1000),

    fingerprint,

    // Import किए गए प्रश्न पहले Draft रहेंगे।
    isPublished: false,
    pyqVerified: false,
    verificationStatus: "pending",
    status: "draft",

    importedBy: uid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  };
}

/**
 * PREVIEW IMPORT
 *
 * यह फंक्शन केवल प्रश्नों की जाँच करता है।
 * Firestore में कोई डेटा सेव नहीं करता।
 */
exports.adminValidateQuestionImport = onCall(
  {
    region: REGION,
    timeoutSeconds: 60,
    memory: "256MiB"
  },
  async (request) => {
    requireAdmin(request);

    const questions = request.data?.questions;

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new HttpsError(
        "invalid-argument",
        "कम से कम एक प्रश्न भेजना जरूरी है।"
      );
    }

    if (questions.length > MAX_QUESTIONS_PER_IMPORT) {
      throw new HttpsError(
        "invalid-argument",
        `एक बार में अधिकतम ${MAX_QUESTIONS_PER_IMPORT} प्रश्न भेज सकते हैं।`
      );
    }

    const results = questions.map((question, index) =>
      validateQuestion(question, index)
    );

    const validCount = results.filter((item) => item.valid).length;
    const invalidCount = results.length - validCount;

    return {
      success: true,
      total: questions.length,
      validCount,
      invalidCount,
      canImport: invalidCount === 0,
      results
    };
  }
);

/**
 * BULK IMPORT QUESTIONS
 *
 * यह फंक्शन केवल पूरी तरह valid प्रश्नों को सेव करता है।
 * Duplicate प्रश्नों को fingerprint के आधार पर skip करता है।
 */
exports.adminBulkImportQuestions = onCall(
  {
    region: REGION,
    timeoutSeconds: 300,
    memory: "512MiB"
  },
  async (request) => {
    const uid = requireAdmin(request);

    const questions = request.data?.questions;

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new HttpsError(
        "invalid-argument",
        "इम्पोर्ट करने के लिए प्रश्नों की सूची जरूरी है।"
      );
    }

    if (questions.length > MAX_QUESTIONS_PER_IMPORT) {
      throw new HttpsError(
        "invalid-argument",
        `एक बार में अधिकतम ${MAX_QUESTIONS_PER_IMPORT} प्रश्न इम्पोर्ट कर सकते हैं।`
      );
    }

    // सभी प्रश्नों की validation
    const validationResults = questions.map((question, index) =>
      validateQuestion(question, index)
    );

    const invalidQuestions = validationResults.filter(
      (item) => !item.valid
    );

    if (invalidQuestions.length > 0) {
      return {
        success: false,
        message: "कुछ प्रश्नों में गलत जानकारी है। पहले उन्हें ठीक करें।",
        total: questions.length,
        imported: 0,
        invalidCount: invalidQuestions.length,
        errors: invalidQuestions
      };
    }

    let imported = 0;
    let duplicates = 0;

    const importResults = [];

    let batch = db.batch();
    let batchCount = 0;

    for (let index = 0; index < questions.length; index++) {
      const question = questions[index];

      const fingerprint = createFingerprint(question);

      // Stable document ID से duplicate import रोका जाता है।
      const documentId = `q_${fingerprint}`;

      const questionRef = db
        .collection("questions")
        .doc(documentId);

      // पहले से मौजूद प्रश्न को दोबारा import न करें।
      const existing = await questionRef.get();

      if (existing.exists) {
        duplicates++;

        importResults.push({
          index,
          status: "duplicate",
          questionId: documentId
        });

        continue;
      }

      const questionData = prepareQuestion(
        question,
        fingerprint,
        uid
      );

      batch.set(questionRef, questionData);

      batchCount++;
      imported++;

      importResults.push({
        index,
        status: "imported",
        questionId: documentId
      });

      // Firestore batch की सीमा से नीचे commit करें।
      if (batchCount >= MAX_BATCH_SIZE) {
        await batch.commit();

        batch = db.batch();
        batchCount = 0;
      }
    }

    // बाकी बचे प्रश्न सेव करें।
    if (batchCount > 0) {
      await batch.commit();
    }

    // Admin activity log
    await db.collection("adminActivityLogs").add({
      action: "bulk_question_import",
      performedBy: uid,

      totalReceived: questions.length,
      imported,
      duplicates,

      createdAt: FieldValue.serverTimestamp()
    });

    return {
      success: true,
      message: "Bulk import पूरा हुआ।",
      total: questions.length,
      imported,
      duplicates,
      failed: 0,
      results: importResults
    };
  }
);
