/**
 * RAJASTHAN PYQ MASTER
 * Firebase Cloud Functions v2
 *
 * File: functions/index.js
 * Region: asia-south1
 *
 * IMPORTANT:
 * - Admin permissions are checked on the server.
 * - PYQ questions are never auto-verified by AI.
 * - AI output is always a draft.
 * - Never place service account keys in frontend code.
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const { defineSecret } = require("firebase-functions/params");

const { initializeApp, getApps } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");

const crypto = require("crypto");

// --------------------------------------------------
// INITIALIZATION
// --------------------------------------------------

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();
const adminAuth = getAuth();

setGlobalOptions({
  region: "asia-south1",
  maxInstances: 10,
  timeoutSeconds: 60,
  memory: "512MiB"
});

// Gemini API key is stored as a Firebase Secret.
// Never write the actual key in this file.
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

// --------------------------------------------------
// COLLECTIONS
// --------------------------------------------------

const COLLECTIONS = {
  USERS: "users",
  QUESTIONS: "questions",
  EXAMS: "exams",
  SUBJECTS: "subjects",
  TOPICS: "topics",
  CURRENT_AFFAIRS: "currentAffairs",
  ANNOUNCEMENTS: "announcements",
  REPORTS: "reports",
  ACTIVITY_LOGS: "activityLogs",
  ADMIN_ROLES: "adminRoles",
  APP_SETTINGS: "appSettings",
  AI_RESEARCH_JOBS: "aiResearchJobs",
  PYQ_SOURCES: "pyqSources"
};

// --------------------------------------------------
// ROLES AND PERMISSIONS
// --------------------------------------------------

const ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN_EDITOR: "admin_editor",
  USER: "user"
};

const PERMISSIONS = {
  VIEW_DASHBOARD: "VIEW_DASHBOARD",
  VIEW_QUESTIONS: "VIEW_QUESTIONS",
  CREATE_QUESTION: "CREATE_QUESTION",
  EDIT_QUESTION: "EDIT_QUESTION",
  DELETE_QUESTION: "DELETE_QUESTION",
  PUBLISH_QUESTION: "PUBLISH_QUESTION",
  VERIFY_PYQ: "VERIFY_PYQ",
  IMPORT_DATA: "IMPORT_DATA",
  EXPORT_DATA: "EXPORT_DATA",
  VIEW_USERS: "VIEW_USERS",
  MANAGE_USERS: "MANAGE_USERS",
  VIEW_REPORTS: "VIEW_REPORTS",
  MANAGE_REPORTS: "MANAGE_REPORTS",
  VIEW_ANALYTICS: "VIEW_ANALYTICS",
  MANAGE_SETTINGS: "MANAGE_SETTINGS",
  VIEW_ACTIVITY_LOGS: "VIEW_ACTIVITY_LOGS",
  AI_RESEARCH: "AI_RESEARCH"
};

const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS),

  [ROLES.ADMIN_EDITOR]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_QUESTIONS,
    PERMISSIONS.CREATE_QUESTION,
    PERMISSIONS.EDIT_QUESTION,
    PERMISSIONS.IMPORT_DATA,
    PERMISSIONS.EXPORT_DATA,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.MANAGE_REPORTS,
    PERMISSIONS.AI_RESEARCH
  ],

  [ROLES.USER]: []
};

// --------------------------------------------------
// COMMON HELPERS
// --------------------------------------------------

function cleanString(value, maxLength = 5000) {
  if (typeof value !== "string") return "";

  return value.trim().slice(0, maxLength);
}

function requireAuth(request) {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError(
      "unauthenticated",
      "इस सुविधा के लिए लॉगिन जरूरी है।"
    );
  }

  return request.auth.uid;
}

function getRole(request) {
  const token = request.auth?.token || {};

  if (token.superAdmin === true) {
    return ROLES.SUPER_ADMIN;
  }

  return token.role || ROLES.USER;
}

function requireRole(request, allowedRoles) {
  const uid = requireAuth(request);
  const role = getRole(request);

  if (!allowedRoles.includes(role)) {
    throw new HttpsError(
      "permission-denied",
      "आपके पास इस काम की अनुमति नहीं है।"
    );
  }

  return { uid, role };
}

function requirePermission(request, permission) {
  const { uid, role } = requireRole(request, [
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN_EDITOR
  ]);

  const permissions = ROLE_PERMISSIONS[role] || [];

  if (!permissions.includes(permission)) {
    throw new HttpsError(
      "permission-denied",
      `Permission denied: ${permission}`
    );
  }

  return { uid, role };
}

function requireSuperAdmin(request) {
  return requireRole(request, [ROLES.SUPER_ADMIN]);
}

function validateId(id, fieldName = "ID") {
  if (
    typeof id !== "string" ||
    id.length < 1 ||
    id.length > 150 ||
    id.includes("/")
  ) {
    throw new HttpsError(
      "invalid-argument",
      `${fieldName} सही नहीं है।`
    );
  }

  return id;
}

function validateBilingual(value, fieldName) {
  if (!value || typeof value !== "object") {
    throw new HttpsError(
      "invalid-argument",
      `${fieldName} का Hindi और English डेटा जरूरी है।`
    );
  }

  const hi = cleanString(value.hi, 10000);
  const en = cleanString(value.en, 10000);

  if (!hi || !en) {
    throw new HttpsError(
      "invalid-argument",
      `${fieldName} दोनों भाषाओं में होना चाहिए।`
    );
  }

  return { hi, en };
}

function validateQuestion(data) {
  if (!data || typeof data !== "object") {
    throw new HttpsError("invalid-argument", "Question डेटा नहीं मिला।");
  }

  const question = validateBilingual(
    data.question,
    "Question"
  );

  if (!Array.isArray(data.options) || data.options.length !== 4) {
    throw new HttpsError(
      "invalid-argument",
      "प्रश्न के ठीक चार विकल्प होने चाहिए।"
    );
  }

  const options = data.options.map((option, index) => {
    return validateBilingual(option, `Option ${index + 1}`);
  });

  const correctAnswer = Number(data.correctAnswer);

  if (
    !Number.isInteger(correctAnswer) ||
    correctAnswer < 0 ||
    correctAnswer > 3
  ) {
    throw new HttpsError(
      "invalid-argument",
      "Correct answer 0 से 3 के बीच होना चाहिए।"
    );
  }

  const explanation = validateBilingual(
    data.explanation,
    "Explanation"
  );

  const examIds = Array.isArray(data.examIds)
    ? [...new Set(data.examIds.map(id => validateId(id, "Exam ID")))]
    : [];

  if (examIds.length === 0) {
    throw new HttpsError(
      "invalid-argument",
      "कम से कम एक Exam चुनना जरूरी है।"
    );
  }

  const subjectId = validateId(data.subjectId, "Subject ID");
  const topicId = validateId(data.topicId, "Topic ID");

  const subtopicId = data.subtopicId
    ? validateId(data.subtopicId, "Subtopic ID")
    : null;

  const type = data.type === "AI_PRACTICE"
    ? "AI_PRACTICE"
    : "PYQ";

  const year = data.year === undefined || data.year === null
    ? null
    : Number(data.year);

  if (
    year !== null &&
    (!Number.isInteger(year) || year < 1990 || year > 2100)
  ) {
    throw new HttpsError("invalid-argument", "Year सही नहीं है।");
  }

  return {
    question,
    options,
    correctAnswer,
    explanation,
    examIds,
    subjectId,
    topicId,
    subtopicId,
    year,
    shift: cleanString(data.shift, 100),
    difficulty: ["EASY", "MEDIUM", "HARD"].includes(data.difficulty)
      ? data.difficulty
      : "MEDIUM",
    type,
    examName: cleanString(data.examName, 200),
    examDate: cleanString(data.examDate, 50),
    paperName: cleanString(data.paperName, 200),
    source: {
      name: cleanString(data.source?.name, 300),
      url: cleanString(data.source?.url, 1000),
      reference: cleanString(data.source?.reference, 1000)
    },
    availableLanguages: ["hi", "en"]
  };
}

async function writeActivityLog({
  uid,
  action,
  targetType,
  targetId,
  details = {}
}) {
  await db.collection(COLLECTIONS.ACTIVITY_LOGS).add({
    uid,
    action,
    targetType,
    targetId: targetId || null,
    details,
    createdAt: FieldValue.serverTimestamp()
  });
}

function makeQuestionHash(data) {
  const source = [
    data.question?.en || "",
    data.question?.hi || "",
    data.year || "",
    data.examIds?.slice().sort().join(",") || ""
  ].join("|").toLowerCase();

  return crypto
    .createHash("sha256")
    .update(source)
    .digest("hex");
}

// --------------------------------------------------
// 1. ADMIN DASHBOARD
// --------------------------------------------------

exports.adminGetDashboardStats = onCall(async (request) => {
  requirePermission(request, PERMISSIONS.VIEW_DASHBOARD);

  const collections = [
    COLLECTIONS.USERS,
    COLLECTIONS.QUESTIONS,
    COLLECTIONS.CURRENT_AFFAIRS,
    COLLECTIONS.REPORTS
  ];

  const results = await Promise.all(
    collections.map(async name => {
      const snapshot = await db.collection(name).count().get();
      return [name, snapshot.data().count || 0];
    })
  );

  const stats = Object.fromEntries(results);

  const pendingPYQ = await db.collection(COLLECTIONS.QUESTIONS)
    .where("type", "==", "PYQ")
    .where("verificationStatus", "==", "PENDING")
    .count()
    .get();

  return {
    users: stats[COLLECTIONS.USERS],
    questions: stats[COLLECTIONS.QUESTIONS],
    currentAffairs: stats[COLLECTIONS.CURRENT_AFFAIRS],
    reports: stats[COLLECTIONS.REPORTS],
    pendingPYQ: pendingPYQ.data().count || 0,
    generatedAt: new Date().toISOString()
  };
});

// --------------------------------------------------
// 2. ADMIN QUESTION LIST
// --------------------------------------------------

exports.adminGetQuestions = onCall(async (request) => {
  requirePermission(request, PERMISSIONS.VIEW_QUESTIONS);

  const data = request.data || {};
  const pageSize = Math.min(
    Math.max(Number(data.pageSize) || 25, 1),
    100
  );

  let query = db.collection(COLLECTIONS.QUESTIONS);

  if (data.status) {
    query = query.where("status", "==", cleanString(data.status, 30));
  }

  if (data.type) {
    query = query.where("type", "==", cleanString(data.type, 30));
  }

  if (data.subjectId) {
    query = query.where(
      "subjectId",
      "==",
      validateId(data.subjectId, "Subject ID")
    );
  }

  if (data.examId) {
    query = query.where(
      "examIds",
      "array-contains",
      validateId(data.examId, "Exam ID")
    );
  }

  if (data.verificationStatus) {
    query = query.where(
      "verificationStatus",
      "==",
      cleanString(data.verificationStatus, 30)
    );
  }

  query = query.orderBy("createdAt", "desc");

  if (data.lastId) {
    const lastDoc = await db
      .collection(COLLECTIONS.QUESTIONS)
      .doc(validateId(data.lastId))
      .get();

    if (lastDoc.exists) {
      query = query.startAfter(lastDoc);
    }
  }

  const snapshot = await query.limit(pageSize + 1).get();

  const hasMore = snapshot.docs.length > pageSize;
  const docs = snapshot.docs.slice(0, pageSize);

  return {
    questions: docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })),
    hasMore,
    nextCursor: docs.length
      ? docs[docs.length - 1].id
      : null
  };
});

// --------------------------------------------------
// 3. GET SINGLE QUESTION
// --------------------------------------------------

exports.adminGetQuestionById = onCall(async (request) => {
  requirePermission(request, PERMISSIONS.VIEW_QUESTIONS);

  const id = validateId(request.data?.questionId, "Question ID");

  const doc = await db
    .collection(COLLECTIONS.QUESTIONS)
    .doc(id)
    .get();

  if (!doc.exists) {
    throw new HttpsError("not-found", "Question नहीं मिला।");
  }

  return {
    id: doc.id,
    ...doc.data()
  };
});

// --------------------------------------------------
// 4. CREATE QUESTION
// --------------------------------------------------

exports.adminCreateQuestion = onCall(async (request) => {
  const { uid } = requirePermission(
    request,
    PERMISSIONS.CREATE_QUESTION
  );

  const questionData = validateQuestion(request.data?.question);

  const questionRef = db.collection(COLLECTIONS.QUESTIONS).doc();

  const isPYQ = questionData.type === "PYQ";

  const document = {
    ...questionData,

    status: "DRAFT",

    verificationStatus: isPYQ
      ? "PENDING"
      : "NOT_APPLICABLE",

    isVerified: false,
    isPublished: false,

    createdBy: uid,
    updatedBy: uid,

    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),

    questionHash: makeQuestionHash(questionData)
  };

  await questionRef.set(document);

  await writeActivityLog({
    uid,
    action: "QUESTION_CREATED",
    targetType: "question",
    targetId: questionRef.id,
    details: {
      type: questionData.type,
      subjectId: questionData.subjectId
    }
  });

  return {
    success: true,
    questionId: questionRef.id
  };
});

// --------------------------------------------------
// 5. UPDATE QUESTION
// --------------------------------------------------

exports.adminUpdateQuestion = onCall(async (request) => {
  const { uid } = requirePermission(
    request,
    PERMISSIONS.EDIT_QUESTION
  );

  const questionId = validateId(
    request.data?.questionId,
    "Question ID"
  );

  const questionData = validateQuestion(request.data?.question);

  const ref = db.collection(COLLECTIONS.QUESTIONS).doc(questionId);
  const existing = await ref.get();

  if (!existing.exists) {
    throw new HttpsError("not-found", "Question नहीं मिला।");
  }

  const oldData = existing.data();

  // Any meaningful PYQ edit requires verification again.
  const verificationStatus = questionData.type === "PYQ"
    ? "PENDING"
    : "NOT_APPLICABLE";

  await ref.update({
    ...questionData,
    verificationStatus,
    isVerified: false,
    isPublished: false,
    status: "DRAFT",
    questionHash: makeQuestionHash(questionData),
    updatedBy: uid,
    updatedAt: FieldValue.serverTimestamp()
  });

  await writeActivityLog({
    uid,
    action: "QUESTION_UPDATED",
    targetType: "question",
    targetId: questionId,
    details: {
      previousStatus: oldData.status || "UNKNOWN"
    }
  });

  return { success: true };
});

// --------------------------------------------------
// 6. DELETE QUESTION
// --------------------------------------------------

exports.adminDeleteQuestion = onCall(async (request) => {
  const { uid } = requirePermission(
    request,
    PERMISSIONS.DELETE_QUESTION
  );

  const questionId = validateId(
    request.data?.questionId,
    "Question ID"
  );

  const ref = db.collection(COLLECTIONS.QUESTIONS).doc(questionId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new HttpsError("not-found", "Question नहीं मिला।");
  }

  await ref.delete();

  await writeActivityLog({
    uid,
    action: "QUESTION_DELETED",
    targetType: "question",
    targetId: questionId
  });

  return { success: true };
});

// --------------------------------------------------
// 7. VERIFY PYQ
// --------------------------------------------------

exports.adminVerifyPYQ = onCall(async (request) => {
  const { uid } = requirePermission(
    request,
    PERMISSIONS.VERIFY_PYQ
  );

  const questionId = validateId(
    request.data?.questionId,
    "Question ID"
  );

  const decision = request.data?.decision;

  if (!["APPROVE", "REJECT"].includes(decision)) {
    throw new HttpsError(
      "invalid-argument",
      "Decision APPROVE या REJECT होना चाहिए।"
    );
  }

  const note = cleanString(request.data?.note, 1000);

  const ref = db.collection(COLLECTIONS.QUESTIONS).doc(questionId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new HttpsError("not-found", "Question नहीं मिला।");
  }

  const question = doc.data();

  if (question.type !== "PYQ") {
    throw new HttpsError(
      "failed-precondition",
      "यह Verified PYQ नहीं है।"
    );
  }

  if (
    !question.source?.name ||
    !question.source?.url
  ) {
    throw new HttpsError(
      "failed-precondition",
      "PYQ का विश्वसनीय Source URL और नाम जरूरी है।"
    );
  }

  const approved = decision === "APPROVE";

  await ref.update({
    verificationStatus: approved ? "VERIFIED" : "REJECTED",
    isVerified: approved,
    isPublished: false,
    status: approved ? "VERIFIED" : "REJECTED",
    verifiedBy: uid,
    verifiedAt: FieldValue.serverTimestamp(),
    verificationNote: note,
    updatedAt: FieldValue.serverTimestamp()
  });

  await writeActivityLog({
    uid,
    action: approved ? "PYQ_VERIFIED" : "PYQ_REJECTED",
    targetType: "question",
    targetId: questionId,
    details: { note }
  });

  return {
    success: true,
    verificationStatus: approved ? "VERIFIED" : "REJECTED"
  };
});

// --------------------------------------------------
// 8. PUBLISH QUESTION
// --------------------------------------------------

exports.adminPublishQuestion = onCall(async (request) => {
  const { uid } = requirePermission(
    request,
    PERMISSIONS.PUBLISH_QUESTION
  );

  const questionId = validateId(
    request.data?.questionId,
    "Question ID"
  );

  const ref = db.collection(COLLECTIONS.QUESTIONS).doc(questionId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new HttpsError("not-found", "Question नहीं मिला।");
  }

  const question = doc.data();

  if (question.type === "PYQ") {
    if (
      question.verificationStatus !== "VERIFIED" ||
      question.isVerified !== true
    ) {
      throw new HttpsError(
        "failed-precondition",
        "पहले PYQ को Verify करना जरूरी है।"
      );
    }
  }

  await ref.update({
    status: "PUBLISHED",
    isPublished: true,
    publishedBy: uid,
    publishedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });

  await writeActivityLog({
    uid,
    action: "QUESTION_PUBLISHED",
    targetType: "question",
    targetId: questionId
  });

  return { success: true };
});

// --------------------------------------------------
// 9. USER MANAGEMENT
// --------------------------------------------------

exports.adminGetUsers = onCall(async (request) => {
  requirePermission(request, PERMISSIONS.VIEW_USERS);

  const pageSize = Math.min(
    Math.max(Number(request.data?.pageSize) || 25, 1),
    100
  );

  const result = await adminAuth.listUsers(pageSize);

  const users = await Promise.all(
    result.users.map(async user => {
      const profile = await db
        .collection(COLLECTIONS.USERS)
        .doc(user.uid)
        .get();

      return {
        uid: user.uid,
        email: user.email || "",
        displayName: user.displayName || "",
        photoURL: user.photoURL || "",
        disabled: user.disabled,
        emailVerified: user.emailVerified,
        role: user.customClaims?.role || ROLES.USER,
        createdAt: user.metadata.creationTime || null,
        lastSignInTime: user.metadata.lastSignInTime || null,
        profile: profile.exists ? profile.data() : null
      };
    })
  );

  return {
    users,
    pageToken: result.pageToken || null
  };
});

// --------------------------------------------------
// 10. CHANGE USER ROLE
// --------------------------------------------------

exports.adminSetUserRole = onCall(async (request) => {
  const { uid: actorUid } = requireSuperAdmin(request);

  const targetUid = validateId(
    request.data?.uid,
    "User UID"
  );

  const newRole = request.data?.role;

  if (!Object.values(ROLES).includes(newRole)) {
    throw new HttpsError("invalid-argument", "Role सही नहीं है।");
  }

  if (actorUid === targetUid) {
    throw new HttpsError(
      "failed-precondition",
      "आप अपने ही Admin Role को यहाँ से नहीं बदल सकते।"
    );
  }

  const target = await adminAuth.getUser(targetUid);
  const oldRole = target.customClaims?.role || ROLES.USER;

  // Prevent accidentally removing the last Super Admin.
  if (oldRole === ROLES.SUPER_ADMIN) {
    const admins = await adminAuth.listUsers(1000);

    const otherSuperAdmins = admins.users.filter(user => {
      return (
        user.uid !== targetUid &&
        user.customClaims?.role === ROLES.SUPER_ADMIN
      );
    });

    if (otherSuperAdmins.length === 0) {
      throw new HttpsError(
        "failed-precondition",
        "आखिरी Super Admin को हटाया नहीं जा सकता।"
      );
    }
  }

  await adminAuth.setCustomUserClaims(targetUid, {
    ...(target.customClaims || {}),
    role: newRole,
    superAdmin: newRole === ROLES.SUPER_ADMIN
  });

  await db.collection(COLLECTIONS.USERS)
    .doc(targetUid)
    .set({
      role: newRole,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

  await writeActivityLog({
    uid: actorUid,
    action: "USER_ROLE_CHANGED",
    targetType: "user",
    targetId: targetUid,
    details: {
      oldRole,
      newRole
    }
  });

  return {
    success: true,
    role: newRole
  };
});

// --------------------------------------------------
// 11. ENABLE / DISABLE USER
// --------------------------------------------------

exports.adminSetUserStatus = onCall(async (request) => {
  const { uid: actorUid } = requireSuperAdmin(request);

  const targetUid = validateId(
    request.data?.uid,
    "User UID"
  );

  const disabled = request.data?.disabled;

  if (typeof disabled !== "boolean") {
    throw new HttpsError(
      "invalid-argument",
      "Disabled true या false होना चाहिए।"
    );
  }

  if (targetUid === actorUid) {
    throw new HttpsError(
      "failed-precondition",
      "आप अपना अकाउंट यहाँ से Disable नहीं कर सकते।"
    );
  }

  await adminAuth.updateUser(targetUid, { disabled });

  await db.collection(COLLECTIONS.USERS)
    .doc(targetUid)
    .set({
      disabled,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

  await writeActivityLog({
    uid: actorUid,
    action: disabled ? "USER_DISABLED" : "USER_ENABLED",
    targetType: "user",
    targetId: targetUid
  });

  return { success: true };
});

// --------------------------------------------------
// 12. GET USER TEST HISTORY
// --------------------------------------------------

exports.adminGetUserTestHistory = onCall(async (request) => {
  requirePermission(request, PERMISSIONS.VIEW_USERS);

  const userId = validateId(
    request.data?.userId,
    "User ID"
  );

  const pageSize = Math.min(
    Math.max(Number(request.data?.pageSize) || 20, 1),
    100
  );

  let query = db.collection("testAttempts")
    .where("userId", "==", userId)
    .orderBy("submittedAt", "desc");

  if (request.data?.lastId) {
    const lastDoc = await db
      .collection("testAttempts")
      .doc(validateId(request.data.lastId))
      .get();

    if (lastDoc.exists) {
      query = query.startAfter(lastDoc);
    }
  }

  const snapshot = await query.limit(pageSize + 1).get();

  const hasMore = snapshot.docs.length > pageSize;
  const docs = snapshot.docs.slice(0, pageSize);

  return {
    attempts: docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })),
    hasMore,
    nextCursor: docs.length
      ? docs[docs.length - 1].id
      : null
  };
});

// --------------------------------------------------
// 13. ADMIN ACTIVITY LOGS
// --------------------------------------------------

exports.adminGetActivityLogs = onCall(async (request) => {
  requirePermission(request, PERMISSIONS.VIEW_ACTIVITY_LOGS);

  const pageSize = Math.min(
    Math.max(Number(request.data?.pageSize) || 30, 1),
    100
  );

  let query = db.collection(COLLECTIONS.ACTIVITY_LOGS)
    .orderBy("createdAt", "desc");

  if (request.data?.lastId) {
    const lastDoc = await db
      .collection(COLLECTIONS.ACTIVITY_LOGS)
      .doc(validateId(request.data.lastId))
      .get();

    if (lastDoc.exists) {
      query = query.startAfter(lastDoc);
    }
  }

  const snapshot = await query.limit(pageSize + 1).get();

  const hasMore = snapshot.docs.length > pageSize;
  const docs = snapshot.docs.slice(0, pageSize);

  return {
    logs: docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })),
    hasMore,
    nextCursor: docs.length
      ? docs[docs.length - 1].id
      : null
  };
});

// --------------------------------------------------
// 14. APP SETTINGS
// --------------------------------------------------

exports.adminGetAppSettings = onCall(async (request) => {
  requirePermission(request, PERMISSIONS.VIEW_DASHBOARD);

  const doc = await db
    .collection(COLLECTIONS.APP_SETTINGS)
    .doc("main")
    .get();

  return doc.exists ? doc.data() : {};
});

exports.adminUpdateAppSettings = onCall(async (request) => {
  const { uid } = requireSuperAdmin(request);

  const settings = request.data?.settings;

  if (!settings || typeof settings !== "object") {
    throw new HttpsError(
      "invalid-argument",
      "Settings डेटा सही नहीं है।"
    );
  }

  const allowedKeys = [
    "maintenanceMode",
    "maintenanceMessage",
    "appName",
    "supportEmail",
    "adsEnabled",
    "dailyQuizEnabled",
    "leaderboardEnabled",
    "notificationsEnabled"
  ];

  const update = {};

  for (const key of allowedKeys) {
    if (Object.prototype.hasOwnProperty.call(settings, key)) {
      update[key] = settings[key];
    }
  }

  await db.collection(COLLECTIONS.APP_SETTINGS)
    .doc("main")
    .set({
      ...update,
      updatedBy: uid,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

  await writeActivityLog({
    uid,
    action: "APP_SETTINGS_UPDATED",
    targetType: "appSettings",
    targetId: "main",
    details: { changedKeys: Object.keys(update) }
  });

  return { success: true };
});

// --------------------------------------------------
// 15. AI QUESTION DRAFT
// --------------------------------------------------

exports.adminGenerateQuestionDraft = onCall(
  {
    secrets: [GEMINI_API_KEY],
    timeoutSeconds: 120,
    memory: "512MiB"
  },
  async (request) => {
    const { uid } = requirePermission(
      request,
      PERMISSIONS.AI_RESEARCH
    );

    const topic = cleanString(request.data?.topic, 300);
    const subject = cleanString(request.data?.subject, 200);
    const language = request.data?.language === "en" ? "en" : "hi";

    if (!topic || !subject) {
      throw new HttpsError(
        "invalid-argument",
        "Subject और Topic देना जरूरी है।"
      );
    }

    const apiKey = GEMINI_API_KEY.value();

    if (!apiKey) {
      throw new HttpsError(
        "failed-precondition",
        "Gemini API Secret configure नहीं है।"
      );
    }

    const prompt = `
You are an educational question drafting assistant.

Create ONE original practice question for Rajasthan competitive exam preparation.

Subject: ${subject}
Topic: ${topic}
Preferred language: ${language}

Return valid JSON only, with this structure:

{
  "question": {
    "hi": "Hindi question",
    "en": "English question"
  },
  "options": [
    {"hi":"Hindi option 1","en":"English option 1"},
    {"hi":"Hindi option 2","en":"English option 2"},
    {"hi":"Hindi option 3","en":"English option 3"},
    {"hi":"Hindi option 4","en":"English option 4"}
  ],
  "correctAnswer": 0,
  "explanation": {
    "hi": "Hindi explanation",
    "en": "English explanation"
  },
  "difficulty": "MEDIUM"
}

Rules:
- Exactly four options.
- correctAnswer must be zero-based.
- Both languages must have equivalent meaning.
- Do not claim this is an actual previous-year question.
- Do not invent a paper year, exam shift, or source.
- Create original practice content.
`;

    let response;

    try {
      response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
        encodeURIComponent(apiKey),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: prompt }]
            }],
            generationConfig: {
              temperature: 0.4,
              responseMimeType: "application/json"
            }
          })
        }
      );
    } catch (error) {
      console.error("Gemini request failed:", error);

      throw new HttpsError(
        "unavailable",
        "AI सेवा अभी उपलब्ध नहीं है।"
      );
    }

    if (!response.ok) {
      console.error(
        "Gemini API error:",
        response.status,
        await response.text()
      );

      throw new HttpsError(
        "internal",
        "AI से प्रश्न तैयार नहीं हो पाया।"
      );
    }

    const result = await response.json();

    const generatedText =
      result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      throw new HttpsError(
        "internal",
        "AI ने खाली जवाब दिया।"
      );
    }

    let draft;

    try {
      draft = JSON.parse(generatedText);
    } catch {
      throw new HttpsError(
        "internal",
        "AI का जवाब सही JSON फॉर्मेट में नहीं है।"
      );
    }

    // Validate the generated structure before storing.
    const validated = validateQuestion({
      ...draft,
      examIds: request.data?.examIds,
      subjectId: request.data?.subjectId,
      topicId: request.data?.topicId,
      subtopicId: request.data?.subtopicId,
      type: "AI_PRACTICE"
    });

    const jobRef = db
      .collection(COLLECTIONS.AI_RESEARCH_JOBS)
      .doc();

    await jobRef.set({
      createdBy: uid,
      status: "DRAFT_REVIEW_REQUIRED",
      type: "AI_PRACTICE",
      topic,
      subject,
      question: validated,
      automaticallyVerified: false,
      createdAt: FieldValue.serverTimestamp()
    });

    await writeActivityLog({
      uid,
      action: "AI_QUESTION_DRAFT_CREATED",
      targetType: "aiResearchJob",
      targetId: jobRef.id
    });

    return {
      success: true,
      jobId: jobRef.id,
      status: "DRAFT_REVIEW_REQUIRED",
      draft: validated
    };
  }
);

// --------------------------------------------------
// 16. IMPORT QUESTIONS
// --------------------------------------------------

exports.adminImportQuestions = onCall(async (request) => {
  const { uid } = requirePermission(
    request,
    PERMISSIONS.IMPORT_DATA
  );

  const questions = request.data?.questions;

  if (!Array.isArray(questions) || questions.length === 0) {
    throw new HttpsError(
      "invalid-argument",
      "Import के लिए Questions की सूची जरूरी है।"
    );
  }

  if (questions.length > 400) {
    throw new HttpsError(
      "resource-exhausted",
      "एक बार में अधिकतम 400 प्रश्न Import करें।"
    );
  }

  const batch = db.batch();
  const results = [];

  for (const rawQuestion of questions) {
    const data = validateQuestion(rawQuestion);
    const ref = db.collection(COLLECTIONS.QUESTIONS).doc();

    const isPYQ = data.type === "PYQ";

    batch.set(ref, {
      ...data,
      status: "DRAFT",
      isPublished: false,
      isVerified: false,
      verificationStatus: isPYQ ? "PENDING" : "NOT_APPLICABLE",
      questionHash: makeQuestionHash(data),
      createdBy: uid,
      updatedBy: uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    results.push(ref.id);
  }

  await batch.commit();

  await writeActivityLog({
    uid,
    action: "QUESTIONS_IMPORTED",
    targetType: "question",
    details: {
      importedCount: results.length
    }
  });

  return {
    success: true,
    importedCount: results.length,
    questionIds: results
  };
});

// --------------------------------------------------
// 17. REPORT QUESTION
// --------------------------------------------------

exports.reportQuestion = onCall(async (request) => {
  const uid = requireAuth(request);

  const questionId = validateId(
    request.data?.questionId,
    "Question ID"
  );

  const reason = cleanString(request.data?.reason, 1000);

  if (!reason) {
    throw new HttpsError(
      "invalid-argument",
      "Report का कारण लिखना जरूरी है।"
    );
  }

  const questionRef = db
    .collection(COLLECTIONS.QUESTIONS)
    .doc(questionId);

  const question = await questionRef.get();

  if (!question.exists) {
    throw new HttpsError("not-found", "Question नहीं मिला।");
  }

  const existing = await db.collection(COLLECTIONS.REPORTS)
    .where("userId", "==", uid)
    .where("questionId", "==", questionId)
    .limit(1)
    .get();

  if (!existing.empty) {
    throw new HttpsError(
      "already-exists",
      "आप इस प्रश्न को पहले ही Report कर चुके हैं।"
    );
  }

  const reportRef = db.collection(COLLECTIONS.REPORTS).doc();

  await reportRef.set({
    userId: uid,
    questionId,
    reason,
    status: "PENDING",
    createdAt: FieldValue.serverTimestamp()
  });

  return {
    success: true,
    reportId: reportRef.id
  };
});

// --------------------------------------------------
// 18. CHECK DATABASE HEALTH
// --------------------------------------------------

exports.adminCheckDatabaseHealth = onCall(async (request) => {
  requirePermission(request, PERMISSIONS.VIEW_DASHBOARD);

  const start = Date.now();

  await db.collection(COLLECTIONS.APP_SETTINGS)
    .doc("health-check")
    .get();

  return {
    firestore: "connected",
    responseTimeMs: Date.now() - start,
    checkedAt: new Date().toISOString()
  };
});
