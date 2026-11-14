/**
 * RAJASTHAN PYQ MASTER
 * File: functions/leaderboard-reader.js
 *
 * Leaderboard Reader Backend
 */

const admin = require("firebase-admin");

const {
  onCall,
  HttpsError,
} = require("firebase-functions/v2/https");

const db = admin.firestore();

const REGION = "asia-south1";

// ============================================
// AUTHENTICATION
// ============================================

function requireAuth(request) {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "कृपया पहले Login करें।"
    );
  }

  return request.auth;
}

// ============================================
// VALIDATE INPUT
// ============================================

function validateInput(data) {
  const period = data.period || "allTime";
  const scope = data.scope || "global";

  const allowedPeriods = [
    "daily",
    "weekly",
    "monthly",
    "allTime",
  ];

  if (!allowedPeriods.includes(period)) {
    throw new HttpsError(
      "invalid-argument",
      "Invalid leaderboard period."
    );
  }

  if (
    typeof scope !== "string" ||
    !/^(global|state_[a-zA-Z0-9_-]+|exam_[a-zA-Z0-9_-]+)$/.test(scope)
  ) {
    throw new HttpsError(
      "invalid-argument",
      "Invalid leaderboard scope."
    );
  }

  return { period, scope };
}

// ============================================
// GET PERIOD KEY
// ============================================

function getPeriodKey(period, suppliedKey) {
  if (suppliedKey) {
    const key = String(suppliedKey);

    const validFormats = {
      daily: /^\d{4}-\d{2}-\d{2}$/,
      weekly: /^\d{4}-W\d{2}$/,
      monthly: /^\d{4}-\d{2}$/,
      allTime: /^all$/,
    };

    if (!validFormats[period].test(key)) {
      throw new HttpsError(
        "invalid-argument",
        "Invalid period key."
      );
    }

    return key;
  }

  const now = new Date();

  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");

  if (period === "daily") {
    return `${year}-${month}-${day}`;
  }

  if (period === "monthly") {
    return `${year}-${month}`;
  }

  if (period === "weekly") {
    const date = new Date(
      Date.UTC(year, now.getUTCMonth(), now.getUTCDate())
    );

    const weekday = date.getUTCDay() || 7;

    date.setUTCDate(date.getUTCDate() - weekday + 1);

    const weekYear = date.getUTCFullYear();

    const firstDay = new Date(Date.UTC(weekYear, 0, 1));

    const weekNumber = Math.ceil(
      (
        (date - firstDay) / 86400000 +
        (firstDay.getUTCDay() || 7)
      ) / 7
    );

    return `${weekYear}-W${String(weekNumber).padStart(2, "0")}`;
  }

  return "all";
}

// ============================================
// GET LEADERBOARD
// ============================================

exports.getLeaderboard = onCall(
  {
    region: REGION,
  },
  async (request) => {
    const user = requireAuth(request);

    const {
      period,
      scope,
    } = validateInput(request.data || {});

    const periodKey = getPeriodKey(
      period,
      request.data?.periodKey
    );

    const limit = Math.min(
      Math.max(
        Number(request.data?.limit) || 50,
        1
      ),
      100
    );

    try {
      const snapshot = await db
        .collection("leaderboard")
        .where("period", "==", period)
        .where("periodKey", "==", periodKey)
        .where("scope", "==", scope)
        .orderBy("score", "desc")
        .limit(limit)
        .get();

      const leaderboard = [];

      let currentUserRank = null;

      for (let i = 0; i < snapshot.docs.length; i++) {
        const doc = snapshot.docs[i];

        const data = doc.data();

        const profile = await db
          .collection("users")
          .doc(data.uid)
          .get();

        const profileData = profile.exists
          ? profile.data()
          : {};

        const entry = {
          rank: i + 1,
          uid: data.uid,
          name:
            profileData.displayName ||
            profileData.name ||
            "Student",
          photoURL: profileData.photoURL || null,
          score: Number(data.score) || 0,
          examId: data.examId || null,
          state: data.state || null,
        };

        leaderboard.push(entry);

        if (data.uid === user.uid) {
          currentUserRank = entry;
        }
      }

      return {
        success: true,
        period,
        periodKey,
        scope,
        totalReturned: leaderboard.length,
        currentUserRank,
        leaderboard,
      };

    } catch (error) {
      console.error(
        "Leaderboard fetch error:",
        error
      );

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        "internal",
        "Leaderboard लोड नहीं हो पाया।"
      );
    }
  }
);
