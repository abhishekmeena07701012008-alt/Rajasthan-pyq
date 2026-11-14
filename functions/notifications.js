const admin = require("firebase-admin");
const { onCall } = require("firebase-functions/v2/https");
const { HttpsError } = require("firebase-functions/v2/https");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const messaging = admin.messaging();

const REGION = "asia-south1";

const NOTIFICATIONS = "notifications";
const USERS = "users";
const TOKENS = "fcmTokens";

const ALLOWED_TYPES = [
  "general",
  "exam",
  "result",
  "current_affairs",
  "daily_quiz",
  "important"
];

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
      "आपको Notification भेजने की अनुमति नहीं है।"
    );
  }

  return uid;
}

function cleanText(value, maxLength = 500) {
  return typeof value === "string"
    ? value.trim().slice(0, maxLength)
    : "";
}

function validateNotification(data) {
  const titleHindi = cleanText(data?.titleHindi, 150);
  const titleEnglish = cleanText(data?.titleEnglish, 150);
  const bodyHindi = cleanText(data?.bodyHindi, 1000);
  const bodyEnglish = cleanText(data?.bodyEnglish, 1000);
  const type = cleanText(data?.type, 50);

  if (
    !titleHindi ||
    !titleEnglish ||
    !bodyHindi ||
    !bodyEnglish
  ) {
    throw new HttpsError(
      "invalid-argument",
      "Notification का हिंदी और English Content जरूरी है।"
    );
  }

  if (!ALLOWED_TYPES.includes(type)) {
    throw new HttpsError(
      "invalid-argument",
      "Notification Type सही नहीं है।"
    );
  }

  return {
    titleHindi,
    titleEnglish,
    bodyHindi,
    bodyEnglish,
    type
  };
}

/**
 * FCM Tokens प्राप्त करें।
 * यह मानता है कि हर Token का Document ID Token ही है।
 */
async function getUserTokens(uid) {
  const snapshot = await db
    .collection(TOKENS)
    .where("uid", "==", uid)
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    token: doc.data().token || doc.id
  })).filter(item => typeof item.token === "string" && item.token.length > 0);
}

/**
 * FCM Messages को 500 के Batch में भेजें।
 */
async function sendPushNotifications(tokens, notification, language) {
  const invalidTokens = [];
  let successCount = 0;
  let failureCount = 0;

  const selectedTitle = language === "en"
    ? notification.titleEnglish
    : notification.titleHindi;

  const selectedBody = language === "en"
    ? notification.bodyEnglish
    : notification.bodyHindi;

  for (let i = 0; i < tokens.length; i += 500) {
    const batch = tokens.slice(i, i + 500);

    const response = await messaging.sendEachForMulticast({
      tokens: batch.map(item => item.token),

      notification: {
        title: selectedTitle,
        body: selectedBody
      },

      data: {
        notificationId: notification.id || "",
        type: notification.type,
        titleHindi: notification.titleHindi,
        titleEnglish: notification.titleEnglish,
        bodyHindi: notification.bodyHindi,
        bodyEnglish: notification.bodyEnglish
      },

      android: {
        priority: "high",
        notification: {
          channelId: "rajasthan_pyq_notifications"
        }
      }
    });

    successCount += response.successCount;
    failureCount += response.failureCount;

    response.responses.forEach((result, index) => {
      if (
        !result.success &&
        (
          result.error?.code === "messaging/invalid-registration-token" ||
          result.error?.code === "messaging/registration-token-not-registered"
        )
      ) {
        invalidTokens.push(batch[index].id);
      }
    });
  }

  if (invalidTokens.length > 0) {
    const batch = db.batch();

    invalidTokens.forEach(id => {
      batch.delete(db.collection(TOKENS).doc(id));
    });

    await batch.commit();
  }

  return {
    successCount,
    failureCount,
    invalidTokenCount: invalidTokens.length
  };
}

/**
 * Admin: सभी विद्यार्थियों को Notification भेजें।
 */
exports.sendGlobalNotification = onCall(
  { region: REGION },
  async (request) => {
    const adminUid = requireAdmin(request);

    const notification = validateNotification(request.data);

    const notificationRef = db.collection(NOTIFICATIONS).doc();

    const notificationData = {
      ...notification,
      audience: "all",
      createdBy: adminUid,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await notificationRef.set(notificationData);

    let lastDoc = null;
    let totalSuccess = 0;
    let totalFailure = 0;
    let processedUsers = 0;

    while (true) {
      let query = db
        .collection(USERS)
        .orderBy(admin.firestore.FieldPath.documentId())
        .limit(100);

      if (lastDoc) {
        query = query.startAfter(lastDoc);
      }

      const usersSnapshot = await query.get();

      if (usersSnapshot.empty) break;

      lastDoc = usersSnapshot.docs[usersSnapshot.docs.length - 1];

      for (const userDoc of usersSnapshot.docs) {
        const user = userDoc.data();

        if (user.disabled === true || user.status === "disabled") {
          continue;
        }

        const tokens = await getUserTokens(userDoc.id);

        if (tokens.length === 0) continue;

        const result = await sendPushNotifications(
          tokens,
          {
            ...notification,
            id: notificationRef.id
          },
          user.language === "en" ? "en" : "hi"
        );

        totalSuccess += result.successCount;
        totalFailure += result.failureCount;
      }

      processedUsers += usersSnapshot.size;
    }

    await notificationRef.update({
      pushCompleted: true,
      processedUsers,
      pushSuccessCount: totalSuccess,
      pushFailureCount: totalFailure,
      pushCompletedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      notificationId: notificationRef.id,
      processedUsers,
      successCount: totalSuccess,
      failureCount: totalFailure
    };
  }
);

/**
 * Admin: किसी विशेष विद्यार्थी को Notification भेजें।
 */
exports.sendUserNotification = onCall(
  { region: REGION },
  async (request) => {
    const adminUid = requireAdmin(request);

    const uid = cleanText(request.data?.uid, 150);
    const notification = validateNotification(request.data);

    if (!uid || uid.includes("/")) {
      throw new HttpsError(
        "invalid-argument",
        "सही User ID जरूरी है।"
      );
    }

    const userRef = db.collection(USERS).doc(uid);
    const userSnapshot = await userRef.get();

    if (!userSnapshot.exists) {
      throw new HttpsError(
        "not-found",
        "यह विद्यार्थी उपलब्ध नहीं है।"
      );
    }

    const user = userSnapshot.data();

    if (user.disabled === true || user.status === "disabled") {
      throw new HttpsError(
        "failed-precondition",
        "यह विद्यार्थी अकाउंट Disabled है।"
      );
    }

    const notificationRef = db.collection(NOTIFICATIONS).doc();

    await notificationRef.set({
      ...notification,
      audience: "user",
      targetUid: uid,
      createdBy: adminUid,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const tokens = await getUserTokens(uid);

    let pushResult = {
      successCount: 0,
      failureCount: 0
    };

    if (tokens.length > 0) {
      pushResult = await sendPushNotifications(
        tokens,
        {
          ...notification,
          id: notificationRef.id
        },
        user.language === "en" ? "en" : "hi"
      );
    }

    await notificationRef.update({
      pushCompleted: true,
      pushSuccessCount: pushResult.successCount,
      pushFailureCount: pushResult.failureCount
    });

    return {
      success: true,
      notificationId: notificationRef.id,
      ...pushResult
    };
  }
);

/**
 * विद्यार्थी: अपनी Notification History देखें।
 */
exports.getMyNotifications = onCall(
  { region: REGION },
  async (request) => {
    const uid = requireAuth(request);

    const limit = Math.min(
      Math.max(Number(request.data?.limit) || 30, 1),
      100
    );

    const snapshot = await db
      .collection(NOTIFICATIONS)
      .where("audience", "in", ["all", "user"])
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();

    const notifications = snapshot.docs
      .filter(doc => {
        const data = doc.data();

        return (
          data.audience === "all" ||
          data.targetUid === uid
        );
      })
      .slice(0, limit)
      .map(doc => ({
        id: doc.id,
        titleHindi: doc.data().titleHindi,
        titleEnglish: doc.data().titleEnglish,
        bodyHindi: doc.data().bodyHindi,
        bodyEnglish: doc.data().bodyEnglish,
        type: doc.data().type,
        createdAt: doc.data().createdAt
      }));

    return {
      success: true,
      notifications
    };
  }
);

/**
 * विद्यार्थी: Notification को Read Mark करें।
 */
exports.markNotificationRead = onCall(
  { region: REGION },
  async (request) => {
    const uid = requireAuth(request);

    const notificationId = cleanText(
      request.data?.notificationId,
      150
    );

    if (!notificationId || notificationId.includes("/")) {
      throw new HttpsError(
        "invalid-argument",
        "सही Notification ID जरूरी है।"
      );
    }

    const notificationRef = db
      .collection(NOTIFICATIONS)
      .doc(notificationId);

    const readRef = notificationRef
      .collection("reads")
      .doc(uid);

    await db.runTransaction(async transaction => {
      const notificationSnapshot = await transaction.get(notificationRef);

      if (!notificationSnapshot.exists) {
        throw new HttpsError(
          "not-found",
          "Notification नहीं मिला।"
        );
      }

      const notification = notificationSnapshot.data();

      if (
        notification.audience !== "all" &&
        notification.targetUid !== uid
      ) {
        throw new HttpsError(
          "permission-denied",
          "आप इस Notification को नहीं पढ़ सकते।"
        );
      }

      transaction.set(readRef, {
        uid,
        readAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    return {
      success: true,
      message: "Notification Read Mark हो गया।"
    };
  }
);

/**
 * विद्यार्थी: अपनी Notification Read स्थिति देखें।
 */
exports.getNotificationReadStatus = onCall(
  { region: REGION },
  async (request) => {
    const uid = requireAuth(request);

    const notificationId = cleanText(
      request.data?.notificationId,
      150
    );

    if (!notificationId || notificationId.includes("/")) {
      throw new HttpsError(
        "invalid-argument",
        "सही Notification ID जरूरी है।"
      );
    }

    const notificationRef = db
      .collection(NOTIFICATIONS)
      .doc(notificationId);

    const notificationSnapshot = await notificationRef.get();

    if (!notificationSnapshot.exists) {
      throw new HttpsError(
        "not-found",
        "Notification नहीं मिला।"
      );
    }

    const notification = notificationSnapshot.data();

    if (
      notification.audience !== "all" &&
      notification.targetUid !== uid
    ) {
      throw new HttpsError(
        "permission-denied",
        "आप इस Notification को नहीं पढ़ सकते।"
      );
    }

    const readSnapshot = await notificationRef
      .collection("reads")
      .doc(uid)
      .get();

    return {
      success: true,
      isRead: readSnapshot.exists
    };
  }
);
