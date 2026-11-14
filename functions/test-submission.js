const admin = require("firebase-admin");
const { onCall, HttpsError } = require("firebase-functions/v2/https");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const REGION = "asia-south1";

const TESTS = "mockTests";
const QUESTIONS = "questions";
const ATTEMPTS = "testAttempts";

function requireAuth(request) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "कृपया पहले लॉगिन करें।");
  }

  return request.auth.uid;
}

function cleanText(value, max = 200) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function shuffle(items) {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function getQuestionOptions(question) {
  if (!Array.isArray(question.options) || question.options.length !== 4) {
    throw new HttpsError(
      "failed-precondition",
      "टेस्ट में एक प्रश्न के विकल्प सही तरीके से उपलब्ध नहीं हैं।"
    );
  }

  return question.options.map(option => ({
    hindi: cleanText(option.hindi, 500),
    english: cleanText(option.english, 500)
  }));
}

/**
 * Mock Test शुरू करें।
 *
 * mockTests/{testId} में अपेक्षित fields:
 * titleHindi, titleEnglish, questionIds, durationMinutes,
 * marksPerQuestion, negativeMarking, isPublished
 *
 * questions/{questionId} में अपेक्षित fields:
 * questionHindi, questionEnglish, options, correctAnswer,
 * explanationHindi, explanationEnglish, subject, topic
 */
exports.startMockTest = onCall(
  { region: REGION },
  async (request) => {
    const uid = requireAuth(request);
    const testId = cleanText(request.data?.testId, 150);

    if (!testId || testId.includes("/")) {
      throw new HttpsError("invalid-argument", "सही Test ID जरूरी है।");
    }

    const testRef = db.collection(TESTS).doc(testId);
    const testSnapshot = await testRef.get();

    if (!testSnapshot.exists || testSnapshot.data().isPublished !== true) {
      throw new HttpsError("not-found", "यह Mock Test उपलब्ध नहीं है।");
    }

    const test = testSnapshot.data();

    if (
      !Array.isArray(test.questionIds) ||
      test.questionIds.length < 1 ||
      test.questionIds.length > 200
    ) {
      throw new HttpsError(
        "failed-precondition",
        "इस टेस्ट के प्रश्न सही तरीके से सेट नहीं हैं।"
      );
    }

    const durationMinutes = Number(test.durationMinutes);
    const marksPerQuestion = Number(test.marksPerQuestion ?? 1);
    const negativeMarking = Number(test.negativeMarking ?? 0);

    if (
      !Number.isFinite(durationMinutes) ||
      durationMinutes < 1 ||
      durationMinutes > 300 ||
      !Number.isFinite(marksPerQuestion) ||
      marksPerQuestion <= 0 ||
      marksPerQuestion > 100 ||
      !Number.isFinite(negativeMarking) ||
      negativeMarking < 0 ||
      negativeMarking > marksPerQuestion
    ) {
      throw new HttpsError(
        "failed-precondition",
        "टेस्ट की समय-सीमा या मार्किंग सेटिंग अमान्य है।"
      );
    }

    const attemptRef = db.collection(ATTEMPTS).doc();
    const questionIds = shuffle(test.questionIds);

    const questionRefs = questionIds.map(id =>
      db.collection(QUESTIONS).doc(String(id))
    );

    const questionSnapshots = await db.getAll(...questionRefs);

    const safeQuestions = questionSnapshots.map((snapshot, index) => {
      if (!snapshot.exists) {
        throw new HttpsError(
          "failed-precondition",
          `टेस्ट का प्रश्न ${index + 1} उपलब्ध नहीं है।`
        );
      }

      const question = snapshot.data();

      if (question.isPublished !== true) {
        throw new HttpsError(
          "failed-precondition",
          `टेस्ट का प्रश्न ${index + 1} प्रकाशित नहीं है।`
        );
      }

      return {
        id: snapshot.id,
        questionHindi: cleanText(question.questionHindi, 3000),
        questionEnglish: cleanText(question.questionEnglish, 3000),
        options: getQuestionOptions(question),
        subject: cleanText(question.subject, 100),
        topic: cleanText(question.topic, 150)
      };
    });

    const now = admin.firestore.Timestamp.now();
    const expiresAt = admin.firestore.Timestamp.fromMillis(
      now.toMillis() + durationMinutes * 60 * 1000
    );

    await db.runTransaction(async transaction => {
      const freshTest = await transaction.get(testRef);

      if (!freshTest.exists || freshTest.data().isPublished !== true) {
        throw new HttpsError(
          "failed-precondition",
          "यह टेस्ट अब उपलब्ध नहीं है।"
        );
      }

      transaction.create(attemptRef, {
        uid,
        testId,
        examId: cleanText(test.examId, 100),
        state: cleanText(test.state, 100),
        questionIds,
        status: "inProgress",
        totalQuestions: questionIds.length,
        durationMinutes,
        marksPerQuestion,
        negativeMarking,
        startedAt: now,
        expiresAt,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    return {
      success: true,
      attemptId: attemptRef.id,
      testId,
      titleHindi: cleanText(test.titleHindi, 300),
      titleEnglish: cleanText(test.titleEnglish, 300),
      durationMinutes,
      totalQuestions: safeQuestions.length,
      marksPerQuestion,
      negativeMarking,
      startedAt: now.toMillis(),
      expiresAt: expiresAt.toMillis(),
      questions: safeQuestions
    };
  }
);

/**
 * Mock Test जमा करें।
 *
 * Answers का प्रारूप:
 * {
 *   "questionId1": 0,
 *   "questionId2": 2,
 *   "questionId3": -1
 * }
 *
 * -1 का अर्थ प्रश्न छोड़ा गया।
 */
exports.submitMockTest = onCall(
  { region: REGION },
  async (request) => {
    const uid = requireAuth(request);

    const attemptId = cleanText(request.data?.attemptId, 150);
    const answers = request.data?.answers;

    if (
      !attemptId ||
      attemptId.includes("/") ||
      !answers ||
      typeof answers !== "object" ||
      Array.isArray(answers)
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Attempt ID या Answers सही नहीं हैं।"
      );
    }

    const attemptRef = db.collection(ATTEMPTS).doc(attemptId);
    const attemptSnapshot = await attemptRef.get();

    if (!attemptSnapshot.exists) {
      throw new HttpsError("not-found", "Test Attempt नहीं मिला।");
    }

    const attempt = attemptSnapshot.data();

    if (attempt.uid !== uid) {
      throw new HttpsError(
        "permission-denied",
        "आप इस Test Attempt को जमा नहीं कर सकते।"
      );
    }

    if (attempt.status !== "inProgress") {
      throw new HttpsError(
        "failed-precondition",
        "यह टेस्ट पहले ही जमा किया जा चुका है।"
      );
    }

    const questionIds = attempt.questionIds;

    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      throw new HttpsError(
        "failed-precondition",
        "Attempt में प्रश्न उपलब्ध नहीं हैं।"
      );
    }

    const receivedIds = Object.keys(answers);

    if (
      receivedIds.length !== questionIds.length ||
      receivedIds.some(id => !questionIds.includes(id))
    ) {
      throw new HttpsError(
        "invalid-argument",
        "जवाबों में प्रश्नों की सूची सही नहीं है।"
      );
    }

    const questionRefs = questionIds.map(id =>
      db.collection(QUESTIONS).doc(String(id))
    );

    const questionSnapshots = await db.getAll(...questionRefs);

    const questions = questionSnapshots.map((snapshot, index) => {
      if (!snapshot.exists) {
        throw new HttpsError(
          "failed-precondition",
          `प्रश्न ${index + 1} उपलब्ध नहीं है।`
        );
      }

      const question = snapshot.data();
      const correctAnswer = Number(question.correctAnswer);

      if (
        !Number.isInteger(correctAnswer) ||
        correctAnswer < 0 ||
        correctAnswer > 3
      ) {
        throw new HttpsError(
          "failed-precondition",
          `प्रश्न ${index + 1} का सही उत्तर सेट नहीं है।`
        );
      }

      return {
        id: snapshot.id,
        correctAnswer,
        subject: cleanText(question.subject, 100) || "Other",
        topic: cleanText(question.topic, 150) || "Other",
        explanationHindi: cleanText(question.explanationHindi, 3000),
        explanationEnglish: cleanText(question.explanationEnglish, 3000)
      };
    });

    const result = await db.runTransaction(async transaction => {
      const freshAttempt = await transaction.get(attemptRef);

      if (!freshAttempt.exists) {
        throw new HttpsError("not-found", "Attempt नहीं मिला।");
      }

      const current = freshAttempt.data();

      if (current.uid !== uid) {
        throw new HttpsError(
          "permission-denied",
          "यह Attempt आपका नहीं है।"
        );
      }

      if (current.status !== "inProgress") {
        throw new HttpsError(
          "already-exists",
          "यह टेस्ट पहले ही जमा हो चुका है।"
        );
      }

      const now = admin.firestore.Timestamp.now();
      const expired = now.toMillis() > current.expiresAt.toMillis();

      const marksPerQuestion = Number(current.marksPerQuestion);
      const negativeMarking = Number(current.negativeMarking);

      let correct = 0;
      let wrong = 0;
      let skipped = 0;

      const subjectScores = {};
      const topicScores = {};
      const answerDetails = [];

      questions.forEach((question, index) => {
        const rawAnswer = answers[question.id];

        const selected = rawAnswer === null || rawAnswer === undefined
          ? -1
          : Number(rawAnswer);

        if (
          !Number.isInteger(selected) ||
          selected < -1 ||
          selected > 3
        ) {
          throw new HttpsError(
            "invalid-argument",
            `प्रश्न ${index + 1} का जवाब अमान्य है।`
          );
        }

        let status = "skipped";
        let marks = 0;

        if (selected === -1) {
          skipped++;
        } else if (selected === question.correctAnswer) {
          correct++;
          status = "correct";
          marks = marksPerQuestion;
        } else {
          wrong++;
          status = "wrong";
          marks = -negativeMarking;
        }

        const subject = question.subject;
        const topic = question.topic;

        if (!subjectScores[subject]) {
          subjectScores[subject] = {
            total: 0,
            correct: 0,
            wrong: 0,
            skipped: 0,
            score: 0
          };
        }

        if (!topicScores[topic]) {
          topicScores[topic] = {
            total: 0,
            correct: 0,
            wrong: 0,
            skipped: 0,
            score: 0
          };
        }

        for (const bucket of [
          subjectScores[subject],
          topicScores[topic]
        ]) {
          bucket.total++;
          bucket[status]++;
          bucket.score += marks;
        }

        answerDetails.push({
          questionId: question.id,
          selectedAnswer: selected,
          correctAnswer: question.correctAnswer,
          status,
          marks,
          explanationHindi: question.explanationHindi,
          explanationEnglish: question.explanationEnglish
        });
      });

      const totalQuestions = questions.length;
      const score = Number(
        (correct * marksPerQuestion - wrong * negativeMarking).toFixed(2)
      );

      const maximumScore = totalQuestions * marksPerQuestion;

      const percentage = maximumScore > 0
        ? Number(((score / maximumScore) * 100).toFixed(2))
        : 0;

      const finalResult = {
        uid,
        testId: current.testId,
        examId: current.examId || "",
        state: current.state || "",
        totalQuestions,
        correct,
        wrong,
        skipped,
        score,
        maximumScore,
        percentage,
        subjectScores,
        topicScores,
        answers: answerDetails,
        status: expired ? "autoSubmitted" : "submitted",
        startedAt: current.startedAt,
        expiresAt: current.expiresAt,
        submittedAt: now,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      transaction.update(attemptRef, finalResult);

      return {
        totalQuestions,
        correct,
        wrong,
        skipped,
        score,
        maximumScore,
        percentage,
        subjectScores,
        topicScores,
        answers: answerDetails,
        status: finalResult.status
      };
    });

    return {
      success: true,
      ...result,
      message: "आपका टेस्ट सफलतापूर्वक जमा हो गया।"
    };
  }
);
