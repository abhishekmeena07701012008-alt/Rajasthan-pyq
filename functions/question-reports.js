const admin = require("firebase-admin");
const { onCall, HttpsError } = require("firebase-functions/v2/https");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

const REGION = "asia-south1";
const REPORTS = "questionReports";
const QUESTIONS = "questions";

const ALLOWED_REASONS = [
  "wrong_question",
  "wrong_answer",
  "wrong_explanation",
  "duplicate_question",
  "outdated_information",
  "translation_error",
  "other"
];

const ALLOWED_STATUSES = [
  "pending",
  "reviewing",
  "resolved",
  "rejected"
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
      "केवल Admin यह कार्य कर सकता है।"
    );
  }

  return uid;
}

function cleanText(value, maxLength = 1000) {
  return typeof value === "string"
    ? value.trim().slice(0, maxLength)
    : "";
}

/**
 * विद्यार्थी: किसी प्रश्न की शिकायत करें।
 */
exports.reportQuestion = onCall(
  { region: REGION },
  async (request) => {
    const uid = requireAuth(request);

    const questionId = cleanText(request.data?.questionId, 150);
    const reason = cleanText(request.data?.reason, 100);
    const description = cleanText(request.data?.description, 2000);
    const language = cleanText(request.data?.language, 10);

    if (!questionId || questionId.includes("/")) {
      throw new HttpsError(
        "invalid-argument",
        "सही Question ID जरूरी है।"
      );
    }

    if (!ALLOWED_REASONS.includes(reason)) {
      throw new HttpsError(
        "invalid-argument",
        "शिकायत का कारण सही नहीं है।"
      );
    }

    if (description.length < 5) {
      throw new HttpsError(
        "invalid-argument",
        "कृपया शिकायत का थोड़ा विवरण लिखें।"
      );
    }

    if (!["hi", "en"].includes(language)) {
      throw new HttpsError(
        "invalid-argument",
        "सही भाषा चुनें।"
      );
    }

    const questionRef = db.collection(QUESTIONS).doc(questionId);

    const questionSnapshot = await questionRef.get();

    if (!questionSnapshot.exists) {
      throw new HttpsError(
        "not-found",
        "यह प्रश्न उपलब्ध नहीं है।"
      );
    }

    const reportId = `${uid}_${questionId}`;
    const reportRef = db.collection(REPORTS).doc(reportId);

    await db.runTransaction(async (transaction) => {
      const existing = await transaction.get(reportRef);

      if (existing.exists) {
        throw new HttpsError(
          "already-exists",
          "आप इस प्रश्न की शिकायत पहले ही कर चुके हैं।"
        );
      }

      transaction.create(reportRef, {
        uid,
        questionId,
        reason,
        description,
        language,
        status: "pending",
        adminNote: "",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        resolvedAt: null,
        resolvedBy: null
      });
    });

    return {
      success: true,
      reportId,
      message: "आपकी शिकायत सफलतापूर्वक दर्ज हो गई है।"
    };
  }
);

/**
 * विद्यार्थी: अपनी शिकायतों की स्थिति देखें।
 */
exports.getMyQuestionReports = onCall(
  { region: REGION },
  async (request) => {
    const uid = requireAuth(request);

    const limit = Math.min(
      Math.max(Number(request.data?.limit) || 30, 1),
      100
    );

    const snapshot = await db
      .collection(REPORTS)
      .where("uid", "==", uid)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    return {
      success: true,
      reports: snapshot.docs.map(doc => {
        const data = doc.data();

        return {
          id: doc.id,
          questionId: data.questionId,
          reason: data.reason,
          description: data.description,
          status: data.status,
          adminNote: data.adminNote || "",
          createdAt: data.createdAt
        };
      })
    };
  }
);

/**
 * Admin: सभी शिकायतें देखें।
 */
exports.adminGetQuestionReports = onCall(
  { region: REGION },
  async (request) => {
    requireAdmin(request);

    const limit = Math.min(
      Math.max(Number(request.data?.limit) || 50, 1),
      100
    );

    const status = cleanText(request.data?.status, 30);

    let query = db.collection(REPORTS);

    if (status) {
      if (!ALLOWED_STATUSES.includes(status)) {
        throw new HttpsError(
          "invalid-argument",
          "अमान्य Report Status।"
        );
      }

      query = query.where("status", "==", status);
    }

    const snapshot = await query
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    return {
      success: true,
      reports: snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    };
  }
);

/**
 * Admin: शिकायत की स्थिति अपडेट करें।
 */
exports.adminUpdateQuestionReport = onCall(
  { region: REGION },
  async (request) => {
    const adminUid = requireAdmin(request);

    const reportId = cleanText(request.data?.reportId, 300);
    const status = cleanText(request.data?.status, 30);
    const adminNote = cleanText(request.data?.adminNote, 2000);

    if (!reportId || reportId.includes("/")) {
      throw new HttpsError(
        "invalid-argument",
        "सही Report ID जरूरी है।"
      );
    }

    if (!ALLOWED_STATUSES.includes(status)) {
      throw new HttpsError(
        "invalid-argument",
        "अमान्य Report Status।"
      );
    }

    const reportRef = db.collection(REPORTS).doc(reportId);

    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reportRef);

      if (!snapshot.exists) {
        throw new HttpsError(
          "not-found",
          "यह शिकायत उपलब्ध नहीं है।"
        );
      }

      const updateData = {
        status,
        adminNote,
        updatedBy: adminUid,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      if (status === "resolved" || status === "rejected") {
        updateData.resolvedBy = adminUid;
        updateData.resolvedAt =
          admin.firestore.FieldValue.serverTimestamp();
      } else {
        updateData.resolvedBy = null;
        updateData.resolvedAt = null;
      }

      transaction.update(reportRef, updateData);
    });

    return {
      success: true,
      message: "शिकायत की स्थिति अपडेट हो गई है।"
    };
  }
);

/**
 * Admin: शिकायत से जुड़े प्रश्न की जानकारी देखें।
 */
exports.adminGetReportedQuestion = onCall(
  { region: REGION },
  async (request) => {
    requireAdmin(request);

    const questionId = cleanText(request.data?.questionId, 150);

    if (!questionId || questionId.includes("/")) {
      throw new HttpsError(
        "invalid-argument",
        "सही Question ID जरूरी है।"
      );
    }

    const snapshot = await db
      .collection(QUESTIONS)
      .doc(questionId)
      .get();

    if (!snapshot.exists) {
      throw new HttpsError(
        "not-found",
        "प्रश्न उपलब्ध नहीं है।"
      );
    }

    return {
      success: true,
      question: {
        id: snapshot.id,
        ...snapshot.data()
      }
    };
  }
);
