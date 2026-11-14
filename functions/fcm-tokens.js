const admin = require("firebase-admin");
const crypto = require("crypto");
const { onCall, HttpsError } = require("firebase-functions/v2/https");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const REGION = "asia-south1";
const TOKEN_COLLECTION = "fcmTokens";

function requireAuth(request) {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "कृपया पहले लॉगिन करें।"
    );
  }

  return request.auth.uid;
}

function cleanText(value, maxLength = 500) {
  return typeof value === "string"
    ? value.trim().slice(0, maxLength)
    : "";
}

function getTokenId(token) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

/**
 * विद्यार्थी: अपना FCM Token Register करें।
 *
 * Request:
 * {
 *   token: "FCM_TOKEN",
 *   platform: "android" | "web" | "ios",
 *   language: "hi" | "en"
 * }
 */
exports.registerFcmToken = onCall(
  { region: REGION },
  async (request) => {
    const uid = requireAuth(request);

    const token = cleanText(request.data?.token, 5000);
    const platform = cleanText(request.data?.platform, 20);
    const language = cleanText(request.data?.language, 5);

    if (!token || token.length < 20) {
      throw new HttpsError(
        "invalid-argument",
        "FCM Token सही नहीं है।"
      );
    }

    if (!["android", "web", "ios"].includes(platform)) {
      throw new HttpsError(
        "invalid-argument",
        "Platform सही नहीं है।"
      );
    }

    if (!["hi", "en"].includes(language)) {
      throw new HttpsError(
        "invalid-argument",
        "Language सही नहीं है।"
      );
    }

    const tokenId = getTokenId(token);
    const tokenRef = db.collection(TOKEN_COLLECTION).doc(tokenId);

    await db.runTransaction(async transaction => {
      const existing = await transaction.get(tokenRef);

      if (existing.exists && existing.data().uid !== uid) {
        throw new HttpsError(
          "permission-denied",
          "यह Token किसी दूसरे अकाउंट से जुड़ा हुआ है।"
        );
      }

      transaction.set(
        tokenRef,
        {
          uid,
          token,
          platform,
          language,
          isActive: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: existing.exists
            ? existing.data().createdAt
            : admin.firestore.FieldValue.serverTimestamp()
        },
        { merge: true }
      );
    });

    return {
      success: true,
      message: "FCM Token सफलतापूर्वक Register हो गया।"
    };
  }
);

/**
 * विद्यार्थी: अपने डिवाइस का FCM Token हटाएँ।
 *
 * Request:
 * {
 *   token: "FCM_TOKEN"
 * }
 */
exports.removeFcmToken = onCall(
  { region: REGION },
  async (request) => {
    const uid = requireAuth(request);

    const token = cleanText(request.data?.token, 5000);

    if (!token || token.length < 20) {
      throw new HttpsError(
        "invalid-argument",
        "FCM Token सही नहीं है।"
      );
    }

    const tokenId = getTokenId(token);
    const tokenRef = db.collection(TOKEN_COLLECTION).doc(tokenId);

    await db.runTransaction(async transaction => {
      const snapshot = await transaction.get(tokenRef);

      if (!snapshot.exists) {
        return;
      }

      if (snapshot.data().uid !== uid) {
        throw new HttpsError(
          "permission-denied",
          "आप इस Token को हटाने की अनुमति नहीं रखते।"
        );
      }

      transaction.delete(tokenRef);
    });

    return {
      success: true,
      message: "FCM Token हटा दिया गया।"
    };
  }
);

/**
 * विद्यार्थी: अपने Registered Devices देखें।
 * वास्तविक FCM Token सुरक्षा के लिए वापस नहीं भेजा जाता।
 */
exports.getMyFcmDevices = onCall(
  { region: REGION },
  async (request) => {
    const uid = requireAuth(request);

    const snapshot = await db
      .collection(TOKEN_COLLECTION)
      .where("uid", "==", uid)
      .where("isActive", "==", true)
      .get();

    return {
      success: true,
      devices: snapshot.docs.map(doc => {
        const data = doc.data();

        return {
          id: doc.id,
          platform: data.platform || "unknown",
          language: data.language || "hi",
          createdAt: data.createdAt || null,
          updatedAt: data.updatedAt || null
        };
      })
    };
  }
);
