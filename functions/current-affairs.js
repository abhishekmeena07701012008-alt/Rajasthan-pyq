const admin = require("firebase-admin");
const { onCall, HttpsError } = require("firebase-functions/v2/https");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

const COLLECTION = "currentAffairs";
const REGION = "asia-south1";

const ALLOWED_CATEGORIES = [
  "National",
  "International",
  "Rajasthan",
  "Economy",
  "Science",
  "Sports",
  "Awards",
  "Appointments",
  "Government Schemes",
  "Environment",
  "Other"
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
      "आपको यह कार्य करने की अनुमति नहीं है।"
    );
  }

  return uid;
}

function cleanText(value, maxLength = 5000) {
  if (typeof value !== "string") return "";

  return value.trim().slice(0, maxLength);
}

function validateArticle(data) {
  if (!data || typeof data !== "object") {
    throw new HttpsError(
      "invalid-argument",
      "अमान्य Current Affairs डेटा।"
    );
  }

  const title = cleanText(data.title, 300);
  const titleHindi = cleanText(data.titleHindi, 300);
  const description = cleanText(data.description, 10000);
  const descriptionHindi = cleanText(data.descriptionHindi, 10000);
  const category = cleanText(data.category, 100);
  const source = cleanText(data.source, 1000);
  const sourceUrl = cleanText(data.sourceUrl, 2000);
  const examRelevance = Array.isArray(data.examRelevance)
    ? data.examRelevance
        .filter(item => typeof item === "string")
        .map(item => item.trim())
        .filter(Boolean)
        .slice(0, 30)
    : [];

  if (!title || !titleHindi) {
    throw new HttpsError(
      "invalid-argument",
      "हिंदी और English दोनों में शीर्षक जरूरी हैं।"
    );
  }

  if (!description || !descriptionHindi) {
    throw new HttpsError(
      "invalid-argument",
      "हिंदी और English दोनों में विवरण जरूरी हैं।"
    );
  }

  if (!ALLOWED_CATEGORIES.includes(category)) {
    throw new HttpsError(
      "invalid-argument",
      "अमान्य Current Affairs कैटेगरी।"
    );
  }

  if (sourceUrl && !/^https?:\/\/\S+$/i.test(sourceUrl)) {
    throw new HttpsError(
      "invalid-argument",
      "Source URL सही नहीं है।"
    );
  }

  const date = cleanText(data.date, 30);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new HttpsError(
      "invalid-argument",
      "तारीख YYYY-MM-DD फॉर्मेट में होनी चाहिए।"
    );
  }

  const parsedDate = new Date(`${date}T00:00:00.000Z`);

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== date
  ) {
    throw new HttpsError(
      "invalid-argument",
      "अमान्य तारीख।"
    );
  }

  return {
    title,
    titleHindi,
    description,
    descriptionHindi,
    category,
    date,
    source,
    sourceUrl,
    examRelevance,
    tags: Array.isArray(data.tags)
      ? data.tags
          .filter(tag => typeof tag === "string")
          .map(tag => tag.trim())
          .filter(Boolean)
          .slice(0, 30)
      : []
  };
}

/**
 * Admin: सभी Current Affairs प्राप्त करें।
 */
exports.adminListCurrentAffairs = onCall(
  { region: REGION },
  async (request) => {
    requireAdmin(request);

    const limit = Math.min(
      Math.max(Number(request.data?.limit) || 50, 1),
      100
    );

    const snapshot = await db
      .collection(COLLECTION)
      .orderBy("date", "desc")
      .limit(limit)
      .get();

    return {
      success: true,
      items: snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    };
  }
);

/**
 * Public: केवल प्रकाशित Current Affairs प्राप्त करें।
 */
exports.getCurrentAffairs = onCall(
  { region: REGION },
  async (request) => {
    requireAuth(request);

    const limit = Math.min(
      Math.max(Number(request.data?.limit) || 30, 1),
      100
    );

    const category = cleanText(request.data?.category, 100);
    const startDate = cleanText(request.data?.startDate, 30);
    const endDate = cleanText(request.data?.endDate, 30);

    let query = db
      .collection(COLLECTION)
      .where("isPublished", "==", true);

    if (category) {
      if (!ALLOWED_CATEGORIES.includes(category)) {
        throw new HttpsError(
          "invalid-argument",
          "अमान्य कैटेगरी।"
        );
      }

      query = query.where("category", "==", category);
    }

    if (startDate) {
      query = query.where("date", ">=", startDate);
    }

    if (endDate) {
      query = query.where("date", "<=", endDate);
    }

    const snapshot = await query
      .orderBy("date", "desc")
      .limit(limit)
      .get();

    return {
      success: true,
      items: snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    };
  }
);

/**
 * Admin: नया Current Affairs जोड़ें।
 */
exports.createCurrentAffair = onCall(
  { region: REGION },
  async (request) => {
    const uid = requireAdmin(request);
    const article = validateArticle(request.data);

    const now = admin.firestore.FieldValue.serverTimestamp();

    const docRef = await db.collection(COLLECTION).add({
      ...article,
      isPublished: false,
      createdBy: uid,
      updatedBy: uid,
      createdAt: now,
      updatedAt: now
    });

    await db.collection("adminActivityLogs").add({
      action: "CURRENT_AFFAIR_CREATED",
      targetId: docRef.id,
      performedBy: uid,
      createdAt: now
    });

    return {
      success: true,
      id: docRef.id,
      message: "Current Affairs सफलतापूर्वक जोड़ा गया।"
    };
  }
);

/**
 * Admin: Current Affairs अपडेट करें।
 */
exports.updateCurrentAffair = onCall(
  { region: REGION },
  async (request) => {
    const uid = requireAdmin(request);

    const id = cleanText(request.data?.id, 150);

    if (!id || id.includes("/")) {
      throw new HttpsError(
        "invalid-argument",
        "सही Article ID जरूरी है।"
      );
    }

    const article = validateArticle(request.data);

    const ref = db.collection(COLLECTION).doc(id);
    const existing = await ref.get();

    if (!existing.exists) {
      throw new HttpsError(
        "not-found",
        "यह Current Affairs रिकॉर्ड नहीं मिला।"
      );
    }

    await ref.update({
      ...article,
      updatedBy: uid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      message: "Current Affairs अपडेट हो गया।"
    };
  }
);

/**
 * Admin: Publish / Unpublish करें।
 */
exports.publishCurrentAffair = onCall(
  { region: REGION },
  async (request) => {
    const uid = requireAdmin(request);

    const id = cleanText(request.data?.id, 150);
    const isPublished = request.data?.isPublished;

    if (!id || id.includes("/") || typeof isPublished !== "boolean") {
      throw new HttpsError(
        "invalid-argument",
        "Article ID और Publish स्थिति जरूरी है।"
      );
    }

    const ref = db.collection(COLLECTION).doc(id);
    const existing = await ref.get();

    if (!existing.exists) {
      throw new HttpsError(
        "not-found",
        "Current Affairs रिकॉर्ड नहीं मिला।"
      );
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
      message: isPublished
        ? "Current Affairs प्रकाशित हो गया।"
        : "Current Affairs Unpublish हो गया।"
    };
  }
);

/**
 * Admin: Current Affairs को हटाएँ।
 */
exports.deleteCurrentAffair = onCall(
  { region: REGION },
  async (request) => {
    const uid = requireAdmin(request);

    const id = cleanText(request.data?.id, 150);

    if (!id || id.includes("/")) {
      throw new HttpsError(
        "invalid-argument",
        "सही Article ID जरूरी है।"
      );
    }

    const ref = db.collection(COLLECTION).doc(id);
    const existing = await ref.get();

    if (!existing.exists) {
      throw new HttpsError(
        "not-found",
        "Current Affairs रिकॉर्ड नहीं मिला।"
      );
    }

    await ref.update({
      isDeleted: true,
      isPublished: false,
      deletedBy: uid,
      deletedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      message: "Current Affairs हटाया गया।"
    };
  }
);
