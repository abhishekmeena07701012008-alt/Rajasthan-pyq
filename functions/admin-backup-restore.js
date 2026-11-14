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

const {
  getStorage
} = require("firebase-admin/storage");

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();
const bucket = getStorage().bucket();

const REGION = "asia-south1";

const ALLOWED_ROLES = [
  "super_admin"
];

// केवल ऐप के जरूरी सार्वजनिक/प्रशासनिक डेटा का बैकअप।
const BACKUP_COLLECTIONS = [
  "questions",
  "currentAffairs",
  "dailyQuizzes",
  "mockTests",
  "appSettings"
];

const PAGE_SIZE = 400;
const MAX_DOCUMENTS_PER_COLLECTION = 5000;
const MAX_BACKUP_BYTES = 40 * 1024 * 1024;

function requireSuperAdmin(request) {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "पहले लॉगिन करें।"
    );
  }

  if (!ALLOWED_ROLES.includes(request.auth.token.role)) {
    throw new HttpsError(
      "permission-denied",
      "यह सुविधा केवल Super Admin के लिए है।"
    );
  }

  return request.auth.uid;
}

function serializeValue(value) {
  if (value && typeof value.toDate === "function") {
    return {
      __type: "timestamp",
      value: value.toDate().toISOString()
    };
  }

  if (Array.isArray(value)) {
    return value.map(serializeValue);
  }

  if (value && typeof value === "object") {
    const result = {};

    for (const [key, item] of Object.entries(value)) {
      result[key] = serializeValue(item);
    }

    return result;
  }

  return value;
}

function restoreValue(value) {
  if (Array.isArray(value)) {
    return value.map(restoreValue);
  }

  if (value && typeof value === "object") {
    if (
      value.__type === "timestamp" &&
      typeof value.value === "string"
    ) {
      const date = new Date(value.value);

      if (Number.isNaN(date.getTime())) {
        throw new HttpsError(
          "data-loss",
          "Backup में गलत Timestamp मिला।"
        );
      }

      return new Date(date);
    }

    const result = {};

    for (const [key, item] of Object.entries(value)) {
      result[key] = restoreValue(item);
    }

    return result;
  }

  return value;
}

function createBackupId() {
  return `backup_${Date.now()}`;
}

/**
 * BACKUP
 *
 * प्रश्न, Mock Tests, Current Affairs,
 * Daily Quiz और App Settings का बैकअप।
 *
 * User accounts और private user data इसमें शामिल नहीं हैं।
 */
exports.adminCreateBackup = onCall(
  {
    region: REGION,
    timeoutSeconds: 540,
    memory: "1GiB"
  },
  async (request) => {
    const uid = requireSuperAdmin(request);

    const backupId = createBackupId();
    const backupData = {
      formatVersion: 1,
      backupId,
      createdAt: new Date().toISOString(),
      createdBy: uid,
      collections: {}
    };

    const collectionCounts = {};

    for (const collectionName of BACKUP_COLLECTIONS) {
      const collectionRef = db.collection(collectionName);

      let lastDocument = null;
      let documents = [];
      let total = 0;

      while (true) {
        let query = collectionRef
          .orderBy("__name__")
          .limit(PAGE_SIZE);

        if (lastDocument) {
          query = query.startAfter(lastDocument);
        }

        const snapshot = await query.get();

        if (snapshot.empty) break;

        for (const doc of snapshot.docs) {
          documents.push({
            id: doc.id,
            data: serializeValue(doc.data())
          });

          total++;

          if (total > MAX_DOCUMENTS_PER_COLLECTION) {
            throw new HttpsError(
              "resource-exhausted",
              `${collectionName} में दस्तावेजों की संख्या बैकअप सीमा से अधिक है।`
            );
          }
        }

        lastDocument = snapshot.docs[snapshot.docs.length - 1];

        if (snapshot.size < PAGE_SIZE) break;
      }

      backupData.collections[collectionName] = documents;
      collectionCounts[collectionName] = total;
    }

    const json = JSON.stringify(backupData);
    const size = Buffer.byteLength(json, "utf8");

    if (size > MAX_BACKUP_BYTES) {
      throw new HttpsError(
        "resource-exhausted",
        "बैकअप का आकार निर्धारित सीमा से अधिक है।"
      );
    }

    const filePath = `admin-backups/${backupId}.json`;

    const file = bucket.file(filePath);

    await file.save(json, {
      resumable: false,
      contentType: "application/json",
      metadata: {
        metadata: {
          backupId,
          createdBy: uid,
          formatVersion: "1"
        }
      }
    });

    await db.collection("adminBackups").doc(backupId).set({
      backupId,
      filePath,
      createdBy: uid,
      createdAt: FieldValue.serverTimestamp(),
      sizeBytes: size,
      collectionCounts,
      status: "completed",
      formatVersion: 1
    });

    await db.collection("adminActivityLogs").add({
      action: "backup_create",
      performedBy: uid,
      targetId: backupId,
      targetType: "backup",
      createdAt: FieldValue.serverTimestamp()
    });

    return {
      success: true,
      backupId,
      sizeBytes: size,
      collectionCounts,
      message: "बैकअप सफलतापूर्वक बन गया।"
    };
  }
);

/**
 * BACKUP LIST
 */
exports.adminListBackups = onCall(
  {
    region: REGION,
    timeoutSeconds: 60,
    memory: "256MiB"
  },
  async (request) => {
    requireSuperAdmin(request);

    const snapshot = await db
      .collection("adminBackups")
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const backups = snapshot.docs.map((doc) => {
      const data = doc.data();

      return {
        backupId: doc.id,
        createdBy: data.createdBy || "",
        createdAt: data.createdAt
          ? data.createdAt.toDate().toISOString()
          : null,
        sizeBytes: data.sizeBytes || 0,
        collectionCounts: data.collectionCounts || {},
        status: data.status || "unknown",
        formatVersion: data.formatVersion || 1
      };
    });

    return {
      success: true,
      count: backups.length,
      backups
    };
  }
);

/**
 * RESTORE
 *
 * Restore करने से पहले Super Admin को
 * confirmationText भेजना अनिवार्य है।
 *
 * यह केवल BACKUP_COLLECTIONS में शामिल
 * collections को बदलता है।
 */
exports.adminRestoreBackup = onCall(
  {
    region: REGION,
    timeoutSeconds: 540,
    memory: "1GiB"
  },
  async (request) => {
    const uid = requireSuperAdmin(request);

    const backupId = request.data?.backupId;
    const confirmationText = request.data?.confirmationText;

    if (
      typeof backupId !== "string" ||
      !/^backup_[0-9]+$/.test(backupId)
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Backup ID सही नहीं है।"
      );
    }

    if (confirmationText !== "RESTORE BACKUP") {
      throw new HttpsError(
        "failed-precondition",
        'Restore के लिए confirmationText में "RESTORE BACKUP" भेजें।'
      );
    }

    const metadataRef = db
      .collection("adminBackups")
      .doc(backupId);

    const metadataSnapshot = await metadataRef.get();

    if (!metadataSnapshot.exists) {
      throw new HttpsError(
        "not-found",
        "यह Backup नहीं मिला।"
      );
    }

    const metadata = metadataSnapshot.data();

    if (metadata.status !== "completed") {
      throw new HttpsError(
        "failed-precondition",
        "यह Backup Restore के लिए उपलब्ध नहीं है।"
      );
    }

    const file = bucket.file(metadata.filePath);

    const [exists] = await file.exists();

    if (!exists) {
      throw new HttpsError(
        "not-found",
        "Backup फ़ाइल Storage में नहीं मिली।"
      );
    }

    const [contents] = await file.download();

    if (contents.length > MAX_BACKUP_BYTES) {
      throw new HttpsError(
        "resource-exhausted",
        "Backup फ़ाइल बहुत बड़ी है।"
      );
    }

    let backup;

    try {
      backup = JSON.parse(contents.toString("utf8"));
    } catch {
      throw new HttpsError(
        "data-loss",
        "Backup JSON पढ़ा नहीं जा सका।"
      );
    }

    if (
      backup.formatVersion !== 1 ||
      backup.backupId !== backupId ||
      !backup.collections ||
      typeof backup.collections !== "object"
    ) {
      throw new HttpsError(
        "data-loss",
        "Backup का फॉर्मेट सही नहीं है।"
      );
    }

    // Restore से पहले सभी collections की जाँच।
    for (const collectionName of BACKUP_COLLECTIONS) {
      const docs = backup.collections[collectionName];

      if (!Array.isArray(docs)) {
        throw new HttpsError(
          "data-loss",
          `Backup में ${collectionName} का डेटा सही नहीं है।`
        );
      }

      if (docs.length > MAX_DOCUMENTS_PER_COLLECTION) {
        throw new HttpsError(
          "resource-exhausted",
          `${collectionName} में बहुत अधिक रिकॉर्ड हैं।`
        );
      }

      for (const item of docs) {
        if (
          !item ||
          typeof item.id !== "string" ||
          !item.id ||
          item.id.includes("/") ||
          !item.data ||
          typeof item.data !== "object" ||
          Array.isArray(item.data)
        ) {
          throw new HttpsError(
            "data-loss",
            `${collectionName} में गलत रिकॉर्ड मिला।`
          );
        }
      }
    }

    const restoreId = `restore_${Date.now()}`;

    await db.collection("adminRestoreJobs").doc(restoreId).set({
      restoreId,
      backupId,
      performedBy: uid,
      status: "running",
      startedAt: FieldValue.serverTimestamp()
    });

    try {
      const restoredCounts = {};

      for (const collectionName of BACKUP_COLLECTIONS) {
        const incomingDocs = backup.collections[collectionName];

        const collectionRef = db.collection(collectionName);

        // पुराने documents हटाएँ।
        let lastDocument = null;

        while (true) {
          let query = collectionRef
            .orderBy("__name__")
            .limit(PAGE_SIZE);

          if (lastDocument) {
            query = query.startAfter(lastDocument);
          }

          const snapshot = await query.get();

          if (snapshot.empty) break;

          const batch = db.batch();

          snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
          });

          lastDocument = snapshot.docs[snapshot.docs.length - 1];

          await batch.commit();

          if (snapshot.size < PAGE_SIZE) break;
        }

        // Backup के documents वापस लिखें।
        let batch = db.batch();
        let batchCount = 0;

        for (const item of incomingDocs) {
          const ref = collectionRef.doc(item.id);

          batch.set(ref, restoreValue(item.data));

          batchCount++;

          if (batchCount >= PAGE_SIZE) {
            await batch.commit();

            batch = db.batch();
            batchCount = 0;
          }
        }

        if (batchCount > 0) {
          await batch.commit();
        }

        restoredCounts[collectionName] = incomingDocs.length;
      }

      await db.collection("adminRestoreJobs").doc(restoreId).update({
        status: "completed",
        restoredCounts,
        completedAt: FieldValue.serverTimestamp()
      });

      await db.collection("adminActivityLogs").add({
        action: "backup_restore",
        performedBy: uid,
        targetId: backupId,
        targetType: "backup",
        createdAt: FieldValue.serverTimestamp()
      });

      return {
        success: true,
        restoreId,
        backupId,
        restoredCounts,
        message: "Restore प्रक्रिया पूरी हुई।"
      };
    } catch (error) {
      await db.collection("adminRestoreJobs").doc(restoreId).update({
        status: "failed",
        errorMessage: String(error.message || error).slice(0, 500),
        failedAt: FieldValue.serverTimestamp()
      });

      throw new HttpsError(
        "internal",
        "Restore पूरा नहीं हो सका। Admin Restore Job में विवरण देखें।"
      );
    }
  }
);
