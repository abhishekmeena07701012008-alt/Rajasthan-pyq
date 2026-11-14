"use strict";

const {
  onCall,
  HttpsError
} = require("firebase-functions/v2/https");

const {
  initializeApp,
  getApps
} = require("firebase-admin/app");

const {
  getFirestore
} = require("firebase-admin/firestore");

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

const REGION = "asia-south1";
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

const ALLOWED_ROLES = [
  "super_admin",
  "admin"
];

function requireAdmin(request) {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "पहले लॉगिन करें।"
    );
  }

  const role = request.auth.token.role;

  if (!ALLOWED_ROLES.includes(role)) {
    throw new HttpsError(
      "permission-denied",
      "आपको प्रश्न एक्सपोर्ट करने की अनुमति नहीं है।"
    );
  }

  return request.auth.uid;
}

function cleanString(value, maxLength = 150) {
  if (typeof value !== "string") return "";

  return value.trim().slice(0, maxLength);
}

function serializeQuestion(doc) {
  const data = doc.data();

  return {
    id: doc.id,

    questionHindi: data.questionHindi || "",
    questionEnglish: data.questionEnglish || "",

    options: Array.isArray(data.options)
      ? data.options
      : [],

    correctAnswer:
      Number.isInteger(data.correctAnswer)
        ? data.correctAnswer
        : null,

    explanationHindi: data.explanationHindi || "",
    explanationEnglish: data.explanationEnglish || "",

    examId: data.examId || "",
    year: data.year || null,
    shift: data.shift || "",

    subject: data.subject || "",
    topic: data.topic || "",
    subtopic: data.subtopic || "",

    source: data.source || "",
    sourceUrl: data.sourceUrl || "",

    isPublished: data.isPublished === true,
    pyqVerified: data.pyqVerified === true,

    verificationStatus: data.verificationStatus || "pending",
    status: data.status || "draft",

    fingerprint: data.fingerprint || ""
  };
}

/**
 * ADMIN BULK QUESTION EXPORT
 *
 * Supports:
 * - Exam filter
 * - Subject filter
 * - Topic filter
 * - Year filter
 * - Published/Draft filter
 * - Verified/Unverified filter
 * - Pagination
 */
exports.adminBulkExportQuestions = onCall(
  {
    region: REGION,
    timeoutSeconds: 120,
    memory: "512MiB"
  },
  async (request) => {
    const uid = requireAdmin(request);

    const filters = request.data?.filters || {};

    const examId = cleanString(filters.examId);
    const subject = cleanString(filters.subject);
    const topic = cleanString(filters.topic);

    const year =
      filters.year === undefined ||
      filters.year === null ||
      filters.year === ""
        ? null
        : Number(filters.year);

    const isPublished =
      typeof filters.isPublished === "boolean"
        ? filters.isPublished
        : null;

    const pyqVerified =
      typeof filters.pyqVerified === "boolean"
        ? filters.pyqVerified
        : null;

    const requestedPageSize = Number(
      request.data?.pageSize || DEFAULT_PAGE_SIZE
    );

    const pageSize = Math.min(
      Math.max(requestedPageSize, 1),
      MAX_PAGE_SIZE
    );

    const cursorId = cleanString(
      request.data?.cursorId,
      200
    );

    if (
      year !== null &&
      (!Number.isInteger(year) || year < 2000 ||
       year > new Date().getFullYear())
    ) {
      throw new HttpsError(
        "invalid-argument",
        "वर्ष सही नहीं है।"
      );
    }

    let query = db.collection("questions");

    if (examId) {
      query = query.where("examId", "==", examId);
    }

    if (subject) {
      query = query.where("subject", "==", subject);
    }

    if (topic) {
      query = query.where("topic", "==", topic);
    }

    if (year !== null) {
      query = query.where("year", "==", year);
    }

    if (isPublished !== null) {
      query = query.where("isPublished", "==", isPublished);
    }

    if (pyqVerified !== null) {
      query = query.where("pyqVerified", "==", pyqVerified);
    }

    query = query.orderBy("__name__").limit(pageSize + 1);

    if (cursorId) {
      const cursorDoc = await db
        .collection("questions")
        .doc(cursorId)
        .get();

      if (!cursorDoc.exists) {
        throw new HttpsError(
          "invalid-argument",
          "Pagination cursor नहीं मिला।"
        );
      }

      query = query.startAfter(cursorDoc);
    }

    const snapshot = await query.get();

    const hasMore = snapshot.docs.length > pageSize;

    const pageDocs = hasMore
      ? snapshot.docs.slice(0, pageSize)
      : snapshot.docs;

    const questions = pageDocs.map(serializeQuestion);

    const nextCursorId =
      hasMore && pageDocs.length > 0
        ? pageDocs[pageDocs.length - 1].id
        : null;

    await db.collection("adminActivityLogs").add({
      action: "bulk_question_export",
      performedBy: uid,
      exportedCount: questions.length,
      filters: {
        examId,
        subject,
        topic,
        year,
        isPublished,
        pyqVerified
      },
      createdAt: new Date()
    });

    return {
      success: true,
      count: questions.length,
      pageSize,
      hasMore,
      nextCursorId,
      questions
    };
  }
);
