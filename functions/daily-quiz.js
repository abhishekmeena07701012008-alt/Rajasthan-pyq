const admin = require("firebase-admin");
const { onCall, HttpsError } = require("firebase-functions/v2/https");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

const REGION = "asia-south1";
const QUIZ_COLLECTION = "dailyQuizzes";
const ATTEMPT_COLLECTION = "dailyQuizAttempts";

function requireAuth(request) {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "कृपया पहले लॉगिन करें।"
    );
  }

  return request.auth.uid;
}

function requireAdmin(request) {
  const uid = requireAuth(request);
  const role = request.auth.token.role;

  if (!["super_admin", "admin"].includes(role)) {
    throw new HttpsError(
      "permission-denied",
      "आपको यह अनुमति नहीं है।"
    );
  }

  return uid;
}

function cleanText(value, maxLength = 1000) {
  return typeof value === "string"
    ? value.trim().slice(0, maxLength)
    : "";
}

function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function validateQuestions(questions) {
  if (!Array.isArray(questions) || questions.length < 1 || questions.length > 100) {
    throw new HttpsError(
      "invalid-argument",
      "क्विज़ में 1 से 100 प्रश्न होने चाहिए।"
    );
  }

  return questions.map((question, index) => {
    const textHindi = cleanText(question.textHindi, 2000);
    const textEnglish = cleanText(question.textEnglish, 2000);

    if (!textHindi || !textEnglish) {
      throw new HttpsError(
        "invalid-argument",
        `प्रश्न ${index + 1} का हिंदी और English टेक्स्ट जरूरी है।`
      );
    }

    if (!Array.isArray(question.options) || question.options.length !== 4) {
      throw new HttpsError(
        "invalid-argument",
        `प्रश्न ${index + 1} में ठीक 4 विकल्प होने चाहिए।`
      );
    }

    const options = question.options.map((option, optionIndex) => {
      const hindi = cleanText(option?.hindi, 500);
      const english = cleanText(option?.english, 500);

      if (!hindi || !english) {
        throw new HttpsError(
          "invalid-argument",
          `प्रश्न ${index + 1} के विकल्प ${optionIndex + 1} अधूरे हैं।`
        );
      }

      return { hindi, english };
    });

    const correctAnswer = Number(question.correctAnswer);

    if (
      !Number.isInteger(correctAnswer) ||
      correctAnswer < 0 ||
      correctAnswer > 3
    ) {
      throw new HttpsError(
        "invalid-argument",
        `प्रश्न ${index + 1} का सही उत्तर 0 से 3 के बीच होना चाहिए।`
      );
    }

    return {
      textHindi,
      textEnglish,
      options,
      correctAnswer,
      explanationHindi: cleanText(question.explanationHindi, 3000),
      explanationEnglish: cleanText(question.explanationEnglish, 3000),
      subject: cleanText(question.subject, 100),
      topic: cleanText(question.topic, 150),
      source: cleanText(question.source, 1000)
    };
  });
}

function getTodayIndia() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

/**
 * Admin: नया Daily Quiz बनाएँ।
 */
exports.createDailyQuiz = onCall(
  { region: REGION },
  async (request) => {
    const uid = requireAdmin(request);

    const date = cleanText(request.data?.date, 10);
    const titleHindi = cleanText(request.data?.titleHindi, 200);
    const titleEnglish = cleanText(request.data?.titleEnglish, 200);
    const questions = validateQuestions(request.data?.questions);

    if (!validDate(date)) {
      throw new HttpsError(
        "invalid-argument",
        "क्विज़ की तारीख YYYY-MM-DD फॉर्मेट में होनी चाहिए।"
      );
    }

    if (!titleHindi || !titleEnglish) {
      throw new HttpsError(
        "invalid-argument",
        "हिंदी और English दोनों में क्विज़ का नाम जरूरी है।"
      );
    }

    const quizRef = db.collection(QUIZ_COLLECTION).doc(date);

    const existing = await quizRef.get();

    if (existing.exists) {
      throw new HttpsError(
        "already-exists",
        "इस तारीख का Daily Quiz पहले से मौजूद है।"
      );
    }

    await quizRef.create({
      date,
      titleHindi,
      titleEnglish,
      questions,
      totalQuestions: questions.length,
      isPublished: false,
      createdBy: uid,
      updatedBy: uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      quizId: date,
      totalQuestions: questions.length
    };
  }
);

/**
 * Admin: Daily Quiz अपडेट करें।
 */
exports.updateDailyQuiz = onCall(
  { region: REGION },
  async (request) => {
    const uid = requireAdmin(request);

    const quizId = cleanText(request.data?.quizId, 10);

    if (!validDate(quizId)) {
      throw new HttpsError(
        "invalid-argument",
        "सही Quiz ID जरूरी है।"
      );
    }

    const titleHindi = cleanText(request.data?.titleHindi, 200);
    const titleEnglish = cleanText(request.data?.titleEnglish, 200);
    const questions = validateQuestions(request.data?.questions);

    if (!titleHindi || !titleEnglish) {
      throw new HttpsError(
        "invalid-argument",
        "दोनों भाषाओं में क्विज़ का नाम जरूरी है।"
      );
    }

    const ref = db.collection(QUIZ_COLLECTION).doc(quizId);
    const existing = await ref.get();

    if (!existing.exists) {
      throw new HttpsError("not-found", "क्विज़ नहीं मिला।");
    }

    await ref.update({
      titleHindi,
      titleEnglish,
      questions,
      totalQuestions: questions.length,
      updatedBy: uid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true };
  }
);

/**
 * Admin: Quiz Publish / Unpublish करें।
 */
exports.publishDailyQuiz = onCall(
  { region: REGION },
  async (request) => {
    const uid = requireAdmin(request);

    const quizId = cleanText(request.data?.quizId, 10);
    const isPublished = request.data?.isPublished;

    if (!validDate(quizId) || typeof isPublished !== "boolean") {
      throw new HttpsError(
        "invalid-argument",
        "Quiz ID और Publish स्थिति जरूरी है।"
      );
    }

    const ref = db.collection(QUIZ_COLLECTION).doc(quizId);
    const existing = await ref.get();

    if (!existing.exists) {
      throw new HttpsError("not-found", "क्विज़ नहीं मिला।");
    }

    await ref.update({
      isPublished,
      publishedAt: isPublished
        ? admin.firestore.FieldValue.serverTimestamp()
        : null,
      updatedBy: uid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      isPublished
    };
  }
);

/**
 * विद्यार्थी: आज का प्रकाशित Daily Quiz प्राप्त करें।
 * सही उत्तर इस API में नहीं भेजे जाते।
 */
exports.getTodayDailyQuiz = onCall(
  { region: REGION },
  async (request) => {
    const uid = requireAuth(request);
    const date = getTodayIndia();

    const ref = db.collection(QUIZ_COLLECTION).doc(date);
    const snapshot = await ref.get();

    if (!snapshot.exists || snapshot.data().isPublished !== true) {
      return {
        success: true,
        available: false,
        message: "आज का Daily Quiz अभी उपलब्ध नहीं है।"
      };
    }

    const attemptId = `${date}_${uid}`;
    const previousAttempt = await db
      .collection(ATTEMPT_COLLECTION)
      .doc(attemptId)
      .get();

    const quiz = snapshot.data();

    const safeQuestions = quiz.questions.map((question, index) => ({
      id: String(index),
      textHindi: question.textHindi,
      textEnglish: question.textEnglish,
      options: question.options,
      subject: question.subject || "",
      topic: question.topic || ""
    }));

    return {
      success: true,
      available: true,
      quizId: date,
      titleHindi: quiz.titleHindi,
      titleEnglish: quiz.titleEnglish,
      totalQuestions: quiz.totalQuestions,
      questions: safeQuestions,
      alreadyAttempted: previousAttempt.exists,
      previousResult: previousAttempt.exists
        ? {
            score: previousAttempt.data().score,
            correct: previousAttempt.data().correct,
            wrong: previousAttempt.data().wrong,
            submittedAt: previousAttempt.data().submittedAt
          }
        : null
    };
  }
);

/**
 * विद्यार्थी: Daily Quiz Submit करें।
 * स्कोर और सही उत्तर सर्वर पर जाँचे जाते हैं।
 */
exports.submitDailyQuiz = onCall(
  { region: REGION },
  async (request) => {
    const uid = requireAuth(request);

    const quizId = cleanText(request.data?.quizId, 10);
    const answers = request.data?.answers;

    if (!validDate(quizId) || !Array.isArray(answers)) {
      throw new HttpsError(
        "invalid-argument",
        "Quiz ID या Answers सही नहीं हैं।"
      );
    }

    if (quizId !== getTodayIndia()) {
      throw new HttpsError(
        "failed-precondition",
        "केवल आज का Daily Quiz जमा किया जा सकता है।"
      );
    }

    const quizRef = db.collection(QUIZ_COLLECTION).doc(quizId);
    const attemptRef = db
      .collection(ATTEMPT_COLLECTION)
      .doc(`${quizId}_${uid}`);

    const result = await db.runTransaction(async (transaction) => {
      const quizSnapshot = await transaction.get(quizRef);
      const attemptSnapshot = await transaction.get(attemptRef);

      if (!quizSnapshot.exists || quizSnapshot.data().isPublished !== true) {
        throw new HttpsError(
          "not-found",
          "प्रकाशित Daily Quiz उपलब्ध नहीं है।"
        );
      }

      if (attemptSnapshot.exists) {
        throw new HttpsError(
          "already-exists",
          "आप यह Daily Quiz पहले ही जमा कर चुके हैं।"
        );
      }

      const quiz = quizSnapshot.data();
      const questions = quiz.questions;

      if (answers.length !== questions.length) {
        throw new HttpsError(
          "invalid-argument",
          "सभी प्रश्नों के जवाब भेजना जरूरी है।"
        );
      }

      let correct = 0;
      let wrong = 0;
      let skipped = 0;

      const answerDetails = [];

      questions.forEach((question, index) => {
        const answer = answers[index];

        const selected = answer === null || answer === undefined
          ? -1
          : Number(answer);

        if (!Number.isInteger(selected) || selected < -1 || selected > 3) {
          throw new HttpsError(
            "invalid-argument",
            `प्रश्न ${index + 1} का जवाब अमान्य है।`
          );
        }

        let status = "skipped";

        if (selected === -1) {
          skipped++;
        } else if (selected === question.correctAnswer) {
          correct++;
          status = "correct";
        } else {
          wrong++;
          status = "wrong";
        }

        answerDetails.push({
          questionIndex: index,
          selectedAnswer: selected,
          correctAnswer: question.correctAnswer,
          status
        });
      });

      const total = questions.length;
      const score = correct;
      const percentage = total > 0
        ? Number(((correct / total) * 100).toFixed(2))
        : 0;

      const attemptData = {
        uid,
        quizId,
        date: quizId,
        totalQuestions: total,
        correct,
        wrong,
        skipped,
        score,
        percentage,
        answers: answerDetails,
        submittedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      transaction.create(attemptRef, attemptData);

      return {
        totalQuestions: total,
        correct,
        wrong,
        skipped,
        score,
        percentage,
        answerDetails
      };
    });

    return {
      success: true,
      ...result,
      message: "आपका Daily Quiz सफलतापूर्वक जमा हो गया।"
    };
  }
);

/**
 * विद्यार्थी: अपनी Daily Quiz History देखें।
 */
exports.getDailyQuizHistory = onCall(
  { region: REGION },
  async (request) => {
    const uid = requireAuth(request);

    const limit = Math.min(
      Math.max(Number(request.data?.limit) || 30, 1),
      100
    );

    const snapshot = await db
      .collection(ATTEMPT_COLLECTION)
      .where("uid", "==", uid)
      .orderBy("date", "desc")
      .limit(limit)
      .get();

    return {
      success: true,
      attempts: snapshot.docs.map(doc => {
        const data = doc.data();

        return {
          quizId: data.quizId,
          date: data.date,
          totalQuestions: data.totalQuestions,
          correct: data.correct,
          wrong: data.wrong,
          skipped: data.skipped,
          score: data.score,
          percentage: data.percentage
        };
      })
    };
  }
);
