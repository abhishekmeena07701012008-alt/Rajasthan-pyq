/**
 * RAJASTHAN PYQ MASTER
 * File: functions/leaderboard.js
 *
 * Server-side Leaderboard
 */

const admin = require("firebase-admin");

const {
  onDocumentCreated,
} = require("firebase-functions/v2/firestore");

const db = admin.firestore();

const REGION = "asia-south1";

function getDateKeys(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  const start = new Date(Date.UTC(year, date.getUTCMonth(), date.getUTCDate()));
  const weekday = start.getUTCDay() || 7;
  start.setUTCDate(start.getUTCDate() - weekday + 1);

  const weekYear = start.getUTCFullYear();
  const weekNumber = Math.ceil(
    ((start - new Date(Date.UTC(weekYear, 0, 1))) / 86400000 +
      new Date(Date.UTC(weekYear, 0, 1)).getUTCDay() +
      1) / 7
  );

  return {
    day: `${year}-${month}-${day}`,
    week: `${weekYear}-W${String(weekNumber).padStart(2, "0")}`,
    month: `${year}-${month}`,
  };
}

async function updateLeaderboard({
  uid,
  score,
  examId,
  state,
  createdAt,
}) {
  const keys = getDateKeys(
    createdAt instanceof Date ? createdAt : new Date()
  );

  const periods = [
    ["daily", keys.day],
    ["weekly", keys.week],
    ["monthly", keys.month],
    ["allTime", "all"],
  ];

  const scopes = [
    "global",
    state ? `state_${state}` : null,
    examId ? `exam_${examId}` : null,
  ].filter(Boolean);

  const batch = db.batch();

  for (const [period, periodKey] of periods) {
    for (const scope of scopes) {
      const docId = `${period}_${periodKey}_${scope}_${uid}`;

      const ref = db.collection("leaderboard").doc(docId);

      batch.set(
        ref,
        {
          uid,
          score: admin.firestore.FieldValue.increment(score),
          examId: examId || null,
          state: state || null,
          period,
          periodKey,
          scope,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }
  }

  await batch.commit();
}

/**
 * New test attempt triggers leaderboard update.
 */
exports.updateLeaderboardOnTestSubmit =
  onDocumentCreated(
    {
      document: "testAttempts/{attemptId}",
      region: REGION,
    },
    async (event) => {
      const attempt = event.data?.data();

      if (!attempt || !attempt.uid) {
        console.log("Invalid test attempt.");
        return;
      }

      const score = Number(attempt.score);

      if (!Number.isFinite(score)) {
        console.log("Invalid score.");
        return;
      }

      const userDoc = await db
        .collection("users")
        .doc(attempt.uid)
        .get();

      const user = userDoc.exists ? userDoc.data() : {};

      await updateLeaderboard({
        uid: attempt.uid,
        score,
        examId: attempt.examId || null,
        state: user.state || user.district || null,
        createdAt: attempt.createdAt?.toDate?.() || new Date(),
      });

      console.log(
        `Leaderboard updated for user ${attempt.uid}`
      );
    }
  );

/**
 * Get leaderboard data.
 */
exports.getLeaderboard = require("./leaderboard-reader")
  .getLeaderboard;
