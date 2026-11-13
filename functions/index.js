/**
 * RAJASTHAN PYQ MASTER
 * Firebase Cloud Functions
 * File: functions/index.js
 */

const admin = require("firebase-admin");

const {
  onCall,
  HttpsError,
} = require("firebase-functions/v2/https");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const auth = admin.auth();

const REGION = "asia-south1";

function requireAuth(request) {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "कृपया पहले लॉगिन करें।"
    );
  }

  return request.auth;
}

function requireAdmin(request) {
  const user = requireAuth(request);

  if (
    user.token.role !== "admin" &&
    user.token.role !== "super_admin"
  ) {
    throw new HttpsError(
      "permission-denied",
      "Admin permission required."
    );
  }

  return user;
}

function requireSuperAdmin(request) {
  const user = requireAuth(request);

  if (user.token.role !== "super_admin") {
    throw new HttpsError(
      "permission-denied",
      "Super Admin permission required."
    );
  }

  return user;
}

function callable(handler, options = {}) {
  return onCall(
    {
      region: REGION,
      ...options,
    },
    handler
  );
}

async function logActivity(uid, action, details = {}) {
  await db.collection("activityLogs").add({
    uid,
    action,
    details,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

// ============================================
// ADMIN DASHBOARD STATS
// ============================================

exports.getAdminDashboardStats = callable(async (request) => {
  requireAdmin(request);

  const users = await db.collection("users").count().get();
  const questions = await db.collection("questions").count().get();
  const attempts = await db.collection("testAttempts").count().get();
  const reports = await db.collection("questionReports").count().get();

  return {
    totalUsers: users.data().count,
    totalQuestions: questions.data().count,
    totalAttempts: attempts.data().count,
    totalReports: reports.data().count,
  };
});

// ============================================
// ADMIN QUESTION LIST
// ============================================

exports.adminListQuestions = callable(async (request) => {
  requireAdmin(request);

  const limit = Math.min(
    Number(request.data?.limit) || 50,
    100
  );

  const snapshot = await db
    .collection("questions")
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  return {
    questions: snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })),
  };
});

// ============================================
// GET SINGLE QUESTION
// ============================================

exports.adminGetQuestion = callable(async (request) => {
  requireAdmin(request);

  const questionId = request.data?.questionId;

  if (!questionId) {
    throw new HttpsError("invalid-argument", "Question ID required.");
  }

  const doc = await db.collection("questions").doc(questionId).get();

  if (!doc.exists) {
    throw new HttpsError("not-found", "Question not found.");
  }

  return {
    id: doc.id,
    ...doc.data(),
  };
});

// ============================================
// CREATE QUESTION
// ============================================

exports.adminCreateQuestion = callable(async (request) => {
  const user = requireAdmin(request);

  const question = request.data?.question;

  if (!question || !question.questionText) {
    throw new HttpsError(
      "invalid-argument",
      "Question text required."
    );
  }

  const ref = await db.collection("questions").add({
    ...question,
    verificationStatus: "pending",
    isPublished: false,
    createdBy: user.uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await logActivity(user.uid, "question_created", {
    questionId: ref.id,
  });

  return {
    success: true,
    questionId: ref.id,
  };
});

// ============================================
// UPDATE QUESTION
// ============================================

exports.adminUpdateQuestion = callable(async (request) => {
  const user = requireAdmin(request);

  const { questionId, question } = request.data || {};

  if (!questionId || !question) {
    throw new HttpsError("invalid-argument", "Invalid data.");
  }

  await db.collection("questions").doc(questionId).update({
    ...question,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await logActivity(user.uid, "question_updated", { questionId });

  return { success: true };
});

// ============================================
// DELETE QUESTION
// ============================================

exports.adminDeleteQuestion = callable(async (request) => {
  const user = requireAdmin(request);

  const questionId = request.data?.questionId;

  if (!questionId) {
    throw new HttpsError("invalid-argument", "Question ID required.");
  }

  await db.collection("questions").doc(questionId).delete();

  await logActivity(user.uid, "question_deleted", { questionId });

  return { success: true };
});

// ============================================
// PYQ VERIFICATION
// ============================================

exports.adminVerifyPYQ = callable(async (request) => {
  const user = requireAdmin(request);

  const { questionId, source, examYear } = request.data || {};

  if (!questionId || !source || !examYear) {
    throw new HttpsError("invalid-argument", "Required data missing.");
  }

  await db.collection("questions").doc(questionId).update({
    verificationStatus: "verified",
    source,
    examYear,
    verifiedBy: user.uid,
    verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await logActivity(user.uid, "pyq_verified", { questionId });

  return { success: true };
});

// ============================================
// PUBLISH QUESTION
// ============================================

exports.adminPublishQuestion = callable(async (request) => {
  const user = requireAdmin(request);

  const questionId = request.data?.questionId;

  const ref = db.collection("questions").doc(questionId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new HttpsError("not-found", "Question not found.");
  }

  if (doc.data().verificationStatus !== "verified") {
    throw new HttpsError(
      "failed-precondition",
      "पहले Question verify करें।"
    );
  }

  await ref.update({
    isPublished: true,
    publishedBy: user.uid,
    publishedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true };
});

// ============================================
// USER MANAGEMENT
// ============================================

exports.adminListUsers = callable(async (request) => {
  requireAdmin(request);

  const snapshot = await db
    .collection("users")
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();

  return {
    users: snapshot.docs.map((doc) => ({
      uid: doc.id,
      ...doc.data(),
    })),
  };
});

// ============================================
// CHANGE USER ROLE
// ============================================

exports.adminSetUserRole = callable(async (request) => {
  const user = requireSuperAdmin(request);

  const { uid, role } = request.data || {};

  const allowedRoles = ["user", "admin", "super_admin"];

  if (!uid || !allowedRoles.includes(role)) {
    throw new HttpsError("invalid-argument", "Invalid role.");
  }

  const target = await auth.getUser(uid);

  await auth.setCustomUserClaims(uid, {
    ...(target.customClaims || {}),
    role,
  });

  await db.collection("users").doc(uid).set(
    { role },
    { merge: true }
  );

  await logActivity(user.uid, "user_role_changed", { uid, role });

  return { success: true };
});

// ============================================
// USER STATUS
// ============================================

exports.adminSetUserStatus = callable(async (request) => {
  const user = requireAdmin(request);

  const { uid, disabled } = request.data || {};

  if (!uid || typeof disabled !== "boolean") {
    throw new HttpsError("invalid-argument", "Invalid data.");
  }

  await auth.updateUser(uid, { disabled });

  await db.collection("users").doc(uid).set(
    { disabled },
    { merge: true }
  );

  await logActivity(user.uid, "user_status_changed", {
    uid,
    disabled,
  });

  return { success: true };
});

// ============================================
// TEST HISTORY
// ============================================

exports.getMyTestHistory = callable(async (request) => {
  const user = requireAuth(request);

  const snapshot = await db
    .collection("testAttempts")
    .where("uid", "==", user.uid)
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();

  return {
    attempts: snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })),
  };
});

// ============================================
// ACTIVITY LOGS
// ============================================

exports.adminGetActivityLogs = callable(async (request) => {
  requireAdmin(request);

  const snapshot = await db
    .collection("activityLogs")
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();

  return {
    logs: snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })),
  };
});

// ============================================
// APP SETTINGS
// ============================================

exports.getPublicAppSettings = callable(async () => {
  const sections = [
    "app",
    "questions",
    "mockTests",
    "leaderboard",
    "dailyQuiz",
    "ads",
    "notifications",
    "legal",
  ];

  const settings = {};

  for (const section of sections) {
    const doc = await db.collection("appSettings").doc(section).get();

    if (doc.exists) {
      settings[section] = doc.data();
    }
  }

  return settings;
});

exports.adminSaveAppSettings = callable(async (request) => {
  const user = requireAdmin(request);

  const { section, settings } = request.data || {};

  if (!section || !settings) {
    throw new HttpsError("invalid-argument", "Invalid settings.");
  }

  await db.collection("appSettings").doc(section).set(
    {
      ...settings,
      updatedBy: user.uid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { success: true };
});

// ============================================
// AI DRAFT
// ============================================

exports.adminCreateAIDraft = callable(async (request) => {
  const user = requireAdmin(request);

  const prompt = request.data?.prompt;

  if (!prompt) {
    throw new HttpsError("invalid-argument", "Prompt required.");
  }

  const ref = await db.collection("aiDrafts").add({
    prompt,
    status: "needs_review",
    createdBy: user.uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    success: true,
    draftId: ref.id,
    message: "Draft created. AI provider integration is still required.",
  };
});

// ============================================
// BULK IMPORT
// ============================================

exports.adminBulkImportQuestions = callable(async (request) => {
  const user = requireAdmin(request);

  const questions = request.data?.questions;

  if (!Array.isArray(questions) || questions.length > 400) {
    throw new HttpsError("invalid-argument", "Invalid questions list.");
  }

  const batch = db.batch();
  let imported = 0;

  for (const question of questions) {
    if (!question?.questionText) continue;

    const ref = db.collection("questions").doc();

    batch.set(ref, {
      ...question,
      verificationStatus: "pending",
      isPublished: false,
      createdBy: user.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    imported++;
  }

  await batch.commit();

  return {
    success: true,
    imported,
  };
});

// ============================================
// REPORT QUESTION
// ============================================

exports.reportQuestion = callable(async (request) => {
  const user = requireAuth(request);

  const { questionId, reason } = request.data || {};

  if (!questionId || !reason) {
    throw new HttpsError("invalid-argument", "Report details required.");
  }

  const ref = await db.collection("questionReports").add({
    questionId,
    reason,
    uid: user.uid,
    status: "open",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    success: true,
    reportId: ref.id,
  };
});

// ============================================
// DATABASE HEALTH
// ============================================

exports.adminDatabaseHealth = callable(async (request) => {
  requireAdmin(request);

  const start = Date.now();

  await db.collection("_health").doc("ping").set({
    checkedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    firestore: "ok",
    latencyMs: Date.now() - start,
  };
});

// ============================================
// ACCOUNT DELETION
// ============================================

exports.deleteMyAccount = callable(async (request) => {
  const user = requireAuth(request);
  const uid = user.uid;

  try {
    // यूज़र document और उसकी subcollections हटाएँ
    await db.recursiveDelete(
      db.collection("users").doc(uid)
    );

    // Firebase Authentication account हटाएँ
    await auth.deleteUser(uid);

    return {
      success: true,
      message: "Account successfully deleted.",
    };

  } catch (error) {
    console.error("Account deletion error:", error);

    throw new HttpsError(
      "internal",
      "Account deletion failed."
    );
  }
});
