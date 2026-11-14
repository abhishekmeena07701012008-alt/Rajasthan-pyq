const admin = require("firebase-admin");
const { onCall, HttpsError } = require("firebase-functions/v2/https");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const REGION = "asia-south1";
const ATTEMPTS_COLLECTION = "testAttempts";

function requireAuth(request) {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "कृपया पहले लॉगिन करें।"
    );
  }

  return request.auth.uid;
}

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function calculateAccuracy(correct, total) {
  return total > 0
    ? Number(((correct / total) * 100).toFixed(2))
    : 0;
}

function aggregatePerformance(attempts, field) {
  const result = {};

  for (const attempt of attempts) {
    const groups = attempt[field];

    if (!groups || typeof groups !== "object") {
      continue;
    }

    for (const [name, data] of Object.entries(groups)) {
      if (!result[name]) {
        result[name] = {
          total: 0,
          correct: 0,
          wrong: 0,
          skipped: 0,
          score: 0
        };
      }

      result[name].total += safeNumber(data.total);
      result[name].correct += safeNumber(data.correct);
      result[name].wrong += safeNumber(data.wrong);
      result[name].skipped += safeNumber(data.skipped);
      result[name].score += safeNumber(data.score);
    }
  }

  return Object.entries(result)
    .map(([name, data]) => ({
      name,
      ...data,
      accuracy: calculateAccuracy(data.correct, data.total)
    }))
    .sort((a, b) => b.accuracy - a.accuracy);
}

function createRecommendations(subjects, topics) {
  const recommendations = [];

  const weakSubjects = subjects
    .filter(item => item.total >= 5 && item.accuracy < 50)
    .sort((a, b) => a.accuracy - b.accuracy);

  const weakTopics = topics
    .filter(item => item.total >= 3 && item.accuracy < 50)
    .sort((a, b) => a.accuracy - b.accuracy);

  for (const subject of weakSubjects.slice(0, 3)) {
    recommendations.push({
      type: "subject",
      name: subject.name,
      accuracy: subject.accuracy,
      message: `${subject.name} विषय में नियमित अभ्यास करें।`
    });
  }

  for (const topic of weakTopics.slice(0, 5)) {
    recommendations.push({
      type: "topic",
      name: topic.name,
      accuracy: topic.accuracy,
      message: `${topic.name} टॉपिक के प्रश्न दोबारा हल करें।`
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      type: "general",
      name: "अभ्यास जारी रखें",
      message: "अभी पर्याप्त कमजोर क्षेत्र नहीं मिले हैं। नियमित Mock Test देते रहें।"
    });
  }

  return recommendations;
}

/**
 * विद्यार्थी का Performance Analytics प्राप्त करें।
 *
 * यह केवल लॉगिन किए हुए विद्यार्थी के अपने Attempts पढ़ता है।
 */
exports.getMyPerformanceAnalytics = onCall(
  { region: REGION },
  async (request) => {
    const uid = requireAuth(request);

    const requestedLimit = Number(request.data?.limit) || 50;
    const limit = Math.min(Math.max(requestedLimit, 1), 100);

    const snapshot = await db
      .collection(ATTEMPTS_COLLECTION)
      .where("uid", "==", uid)
      .where("status", "in", ["submitted", "autoSubmitted"])
      .orderBy("submittedAt", "desc")
      .limit(limit)
      .get();

    const attempts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    if (attempts.length === 0) {
      return {
        success: true,
        hasData: false,
        message: "अभी कोई पूरा किया हुआ Mock Test उपलब्ध नहीं है।",
        summary: {
          totalTests: 0,
          totalQuestions: 0,
          correct: 0,
          wrong: 0,
          skipped: 0,
          totalScore: 0,
          averageScore: 0,
          averageAccuracy: 0
        },
        subjects: [],
        topics: [],
        recentTests: [],
        recommendations: []
      };
    }

    let totalQuestions = 0;
    let correct = 0;
    let wrong = 0;
    let skipped = 0;
    let totalScore = 0;
    let totalMaximumScore = 0;
    let totalAccuracy = 0;

    for (const attempt of attempts) {
      totalQuestions += safeNumber(attempt.totalQuestions);
      correct += safeNumber(attempt.correct);
      wrong += safeNumber(attempt.wrong);
      skipped += safeNumber(attempt.skipped);
      totalScore += safeNumber(attempt.score);
      totalMaximumScore += safeNumber(attempt.maximumScore);
      totalAccuracy += safeNumber(attempt.percentage);
    }

    const subjects = aggregatePerformance(attempts, "subjectScores");
    const topics = aggregatePerformance(attempts, "topicScores");

    const recentTests = attempts.slice(0, 10).map(attempt => ({
      attemptId: attempt.id,
      testId: attempt.testId || "",
      examId: attempt.examId || "",
      date: attempt.submittedAt?.toDate
        ? attempt.submittedAt.toDate().toISOString()
        : null,
      totalQuestions: safeNumber(attempt.totalQuestions),
      correct: safeNumber(attempt.correct),
      wrong: safeNumber(attempt.wrong),
      skipped: safeNumber(attempt.skipped),
      score: safeNumber(attempt.score),
      maximumScore: safeNumber(attempt.maximumScore),
      percentage: safeNumber(attempt.percentage),
      status: attempt.status
    }));

    const averageScore = attempts.length > 0
      ? Number((totalScore / attempts.length).toFixed(2))
      : 0;

    const averageAccuracy = attempts.length > 0
      ? Number((totalAccuracy / attempts.length).toFixed(2))
      : 0;

    const overallAccuracy = calculateAccuracy(correct, totalQuestions);

    const summary = {
      totalTests: attempts.length,
      totalQuestions,
      correct,
      wrong,
      skipped,
      totalScore: Number(totalScore.toFixed(2)),
      totalMaximumScore: Number(totalMaximumScore.toFixed(2)),
      averageScore,
      averageAccuracy,
      overallAccuracy
    };

    return {
      success: true,
      hasData: true,
      summary,
      subjects,
      topics,
      recentTests,
      recommendations: createRecommendations(subjects, topics)
    };
  }
);

/**
 * Admin: किसी विद्यार्थी का Performance Analytics देखें।
 */
exports.adminGetUserPerformanceAnalytics = onCall(
  { region: REGION },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "कृपया पहले लॉगिन करें।"
      );
    }

    const role = request.auth.token.role;

    if (!["super_admin", "admin"].includes(role)) {
      throw new HttpsError(
        "permission-denied",
        "केवल Admin यह जानकारी देख सकता है।"
      );
    }

    const uid = typeof request.data?.uid === "string"
      ? request.data.uid.trim()
      : "";

    if (!uid || uid.includes("/")) {
      throw new HttpsError(
        "invalid-argument",
        "सही User ID जरूरी है।"
      );
    }

    const snapshot = await db
      .collection(ATTEMPTS_COLLECTION)
      .where("uid", "==", uid)
      .where("status", "in", ["submitted", "autoSubmitted"])
      .orderBy("submittedAt", "desc")
      .limit(100)
      .get();

    const attempts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const totalTests = attempts.length;

    const totalQuestions = attempts.reduce(
      (sum, item) => sum + safeNumber(item.totalQuestions),
      0
    );

    const correct = attempts.reduce(
      (sum, item) => sum + safeNumber(item.correct),
      0
    );

    const wrong = attempts.reduce(
      (sum, item) => sum + safeNumber(item.wrong),
      0
    );

    const skipped = attempts.reduce(
      (sum, item) => sum + safeNumber(item.skipped),
      0
    );

    const totalScore = attempts.reduce(
      (sum, item) => sum + safeNumber(item.score),
      0
    );

    return {
      success: true,
      uid,
      summary: {
        totalTests,
        totalQuestions,
        correct,
        wrong,
        skipped,
        totalScore: Number(totalScore.toFixed(2)),
        averageScore: totalTests
          ? Number((totalScore / totalTests).toFixed(2))
          : 0,
        overallAccuracy: calculateAccuracy(correct, totalQuestions)
      },
      subjects: aggregatePerformance(attempts, "subjectScores"),
      topics: aggregatePerformance(attempts, "topicScores")
    };
  }
);
