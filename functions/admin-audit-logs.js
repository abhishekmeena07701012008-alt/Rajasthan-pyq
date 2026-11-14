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
  getFirestore,
  FieldValue
} = require("firebase-admin/firestore");

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

const REGION = "asia-south1";

const ALLOWED_ROLES = [
  "super_admin",
  "admin"
];

const ALLOWED_ACTIONS = [
  "question_create",
  "question_update",
  "question_delete",
  "question_publish",
  "question_verify",
  "bulk_question_import",
  "bulk_question_export",
  "user_role_update",
  "user_status_update",
  "notification_send",
  "current_affairs_create",
  "current_affairs_update",
  "current_affairs_publish",
  "current_affairs_delete",
  "daily_quiz_create",
  "daily_quiz_update",
  "daily_quiz_publish",
  "settings_update",
  "backup_create",
  "backup_restore"
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
      "आपको Admin Logs देखने की अनुमति नहीं है।"
    );
  }

  return {
    uid: request.auth.uid,
    role
  };
}

function cleanString(value, maxLength = 200) {
  if (typeof value !== "string") return "";

  return value.trim().slice(0, maxLength);
}

/**
 * ADMIN: Create audit log
 *
 * इसे केवल trusted backend functions से call करें।
 * Frontend को सीधे logs बनाने की अनुमति न दें।
 */
exports.createAdminAuditLog = onCall(
  {
    region: REGION,
    timeoutSeconds: 30,
    memory: "256MiB"
  },
  async (request) => {
    const admin = requireAdmin(request);

    const action = cleanString(
      request.data?.action,
      100
    );

    const targetId = cleanString(
      request.data?.targetId,
      200
    );

    const targetType = cleanString(
      request.data?.targetType,
      100
    );

    const description = cleanString(
      request.data?.description,
      1000
    );

    if (!ALLOWED_ACTIONS.includes(action)) {
      throw new HttpsError(
        "invalid-argument",
        "यह Audit Action मान्य नहीं है।"
      );
    }

    const logRef = await db
      .collection("adminActivityLogs")
      .add({
        action,
        performedBy: admin.uid,
        performedByRole: admin.role,

        targetId: targetId || null,
        targetType: targetType || null,
        description: description || null,

        createdAt: FieldValue.serverTimestamp()
      });

    return {
      success: true,
      logId: logRef.id
    };
  }
);

/**
 * ADMIN: Read audit logs
 */
exports.adminGetAuditLogs = onCall(
  {
    region: REGION,
    timeoutSeconds: 60,
    memory: "256MiB"
  },
  async (request) => {
    requireAdmin(request);

    const pageSizeInput = Number(
      request.data?.pageSize || 50
    );

    const pageSize = Math.min(
      Math.max(pageSizeInput, 1),
      100
    );

    const action = cleanString(
      request.data?.action,
      100
    );

    const performedBy = cleanString(
      request.data?.performedBy,
      128
    );

    const cursorId = cleanString(
      request.data?.cursorId,
      200
    );

    if (
      action &&
      !ALLOWED_ACTIONS.includes(action)
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Audit Action सही नहीं है।"
      );
    }

    let query = db
      .collection("adminActivityLogs");

    if (action) {
      query = query.where(
        "action",
        "==",
        action
      );
    }

    if (performedBy) {
      query = query.where(
        "performedBy",
        "==",
        performedBy
      );
    }

    query = query
      .orderBy("createdAt", "desc")
      .limit(pageSize + 1);

    if (cursorId) {
      const cursorDoc = await db
        .collection("adminActivityLogs")
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

    const hasMore =
      snapshot.docs.length > pageSize;

    const docs = hasMore
      ? snapshot.docs.slice(0, pageSize)
      : snapshot.docs;

    const logs = docs.map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        action: data.action || "",
        performedBy: data.performedBy || "",
        performedByRole: data.performedByRole || "",
        targetId: data.targetId || null,
        targetType: data.targetType || null,
        description: data.description || null,
        createdAt: data.createdAt
          ? data.createdAt.toDate().toISOString()
          : null
      };
    });

    return {
      success: true,
      count: logs.length,
      hasMore,
      nextCursorId:
        hasMore && docs.length
          ? docs[docs.length - 1].id
          : null,
      logs
    };
  }
);

/**
 * ADMIN: Get audit log statistics
 */
exports.adminGetAuditStatistics = onCall(
  {
    region: REGION,
    timeoutSeconds: 60,
    memory: "256MiB"
  },
  async (request) => {
    requireAdmin(request);

    const snapshot = await db
      .collection("adminActivityLogs")
      .orderBy("createdAt", "desc")
      .limit(1000)
      .get();

    const statistics = {};

    snapshot.forEach((doc) => {
      const action = doc.data().action || "unknown";

      statistics[action] =
        (statistics[action] || 0) + 1;
    });

    return {
      success: true,
      scannedRecords: snapshot.size,
      statistics
    };
  }
);
