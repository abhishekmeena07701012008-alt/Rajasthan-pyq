// ============================================
// RAJASTHAN PYQ MASTER
// FIRESTORE DATABASE SYSTEM
// File: src/firestore.js
// ============================================

import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    collection,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    deleteDoc,
    serverTimestamp,
    onSnapshot,
    writeBatch,
    increment
} from "firebase/firestore";

import { db } from "./firebase.js";

// ============================================
// COLLECTION NAMES
// ============================================

export const COLLECTIONS = {
    USERS: "users",
    QUESTIONS: "questions",
    EXAMS: "exams",
    SUBJECTS: "subjects",
    TOPICS: "topics",
    SUBTOPICS: "subtopics",
    TEST_ATTEMPTS: "testAttempts",
    LEADERBOARD: "leaderboard",
    DAILY_QUIZ: "dailyQuiz",
    ANNOUNCEMENTS: "announcements",
    NOTIFICATIONS: "notifications",
    ADMIN_ROLES: "adminRoles",
    REPORTS: "reports",
    ACTIVITY_LOGS: "activityLogs",
    BOOKMARKS: "userBookmarks",
    NOTES: "userNotes",
    CURRENT_AFFAIRS: "currentAffairs",
    PYQ_SOURCES: "pyqSources",
    AI_RESEARCH_JOBS: "aiResearchJobs",
    APP_SETTINGS: "appSettings"
};

// ============================================
// VALIDATION
// ============================================

function validateUser(user) {
    if (!user || !user.uid) {
        throw new Error("Valid logged-in user जरूरी है।");
    }

    return user.uid;
}

// ============================================
// CREATE USER PROFILE
// ============================================

export async function createUserProfile(user) {
    try {
        const uid = validateUser(user);
        const userRef = doc(db, COLLECTIONS.USERS, uid);

        const snapshot = await getDoc(userRef);

        if (snapshot.exists()) {
            return {
                success: true,
                created: false,
                data: snapshot.data()
            };
        }

        const profile = {
            uid,
            name: user.displayName || "Student",
            email: user.email || "",
            photoURL: user.photoURL || "",
            preferredLanguage: "hi",
            role: "user",
            district: "",
            examPreferences: [],
            totalTests: 0,
            totalQuestionsAttempted: 0,
            correctAnswers: 0,
            streak: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        await setDoc(userRef, profile);

        return {
            success: true,
            created: true,
            data: profile
        };

    } catch (error) {
        console.error("Create Profile Error:", error);

        return {
            success: false,
            message: error.message
        };
    }
}

// ============================================
// GET USER PROFILE
// ============================================

export async function getUserProfile(uid) {
    try {
        if (!uid) {
            throw new Error("User ID नहीं मिला।");
        }

        const snapshot = await getDoc(
            doc(db, COLLECTIONS.USERS, uid)
        );

        if (!snapshot.exists()) {
            return {
                success: false,
                data: null
            };
        }

        return {
            success: true,
            data: snapshot.data()
        };

    } catch (error) {
        console.error("Get Profile Error:", error);

        return {
            success: false,
            message: error.message
        };
    }
}

// ============================================
// UPDATE USER PROFILE
// ============================================

export async function updateUserProfile(uid, updates) {
    try {
        if (!uid) {
            throw new Error("User ID जरूरी है।");
        }

        const allowedFields = [
            "name",
            "photoURL",
            "preferredLanguage",
            "district",
            "examPreferences"
        ];

        const safeUpdates = {};

        for (const field of allowedFields) {
            if (Object.prototype.hasOwnProperty.call(updates, field)) {
                safeUpdates[field] = updates[field];
            }
        }

        if (Object.keys(safeUpdates).length === 0) {
            throw new Error("अपडेट करने के लिए कोई मान्य जानकारी नहीं मिली।");
        }

        safeUpdates.updatedAt = serverTimestamp();

        await updateDoc(
            doc(db, COLLECTIONS.USERS, uid),
            safeUpdates
        );

        return {
            success: true,
            message: "प्रोफाइल अपडेट हो गई।"
        };

    } catch (error) {
        console.error("Update Profile Error:", error);

        return {
            success: false,
            message: error.message
        };
    }
}

// ============================================
// GENERIC DOCUMENT GETTER
// ============================================

export async function getDocument(collectionName, documentId) {
    try {
        const snapshot = await getDoc(
            doc(db, collectionName, documentId)
        );

        if (!snapshot.exists()) {
            return {
                success: false,
                data: null
            };
        }

        return {
            success: true,
            data: {
                id: snapshot.id,
                ...snapshot.data()
            }
        };

    } catch (error) {
        console.error("Get Document Error:", error);

        return {
            success: false,
            message: error.message
        };
    }
}

// ============================================
// GET COLLECTION DOCUMENTS
// ============================================

export async function getCollectionData(
    collectionName,
    options = {}
) {
    try {
        const {
            filters = [],
            sortField = "",
            sortDirection = "asc",
            maxResults = 50
        } = options;

        const constraints = [];

        filters.forEach((filter) => {
            if (
                filter.field &&
                filter.operator &&
                filter.value !== undefined
            ) {
                constraints.push(
                    where(
                        filter.field,
                        filter.operator,
                        filter.value
                    )
                );
            }
        });

        if (sortField) {
            constraints.push(
                orderBy(sortField, sortDirection)
            );
        }

        constraints.push(limit(maxResults));

        const q = query(
            collection(db, collectionName),
            ...constraints
        );

        const snapshot = await getDocs(q);

        return {
            success: true,
            data: snapshot.docs.map((item) => ({
                id: item.id,
                ...item.data()
            }))
        };

    } catch (error) {
        console.error("Get Collection Error:", error);

        return {
            success: false,
            data: [],
            message: error.message
        };
    }
}

// ============================================
// SAVE BOOKMARK
// ============================================

export async function saveBookmark(uid, questionId) {
    try {
        if (!uid || !questionId) {
            throw new Error("User ID और Question ID जरूरी हैं।");
        }

        const bookmarkId = `${uid}_${questionId}`;

        await setDoc(
            doc(db, COLLECTIONS.BOOKMARKS, bookmarkId),
            {
                uid,
                questionId,
                createdAt: serverTimestamp()
            }
        );

        return {
            success: true,
            message: "Question Bookmark हो गया।"
        };

    } catch (error) {
        console.error("Bookmark Error:", error);

        return {
            success: false,
            message: error.message
        };
    }
}

// ============================================
// REMOVE BOOKMARK
// ============================================

export async function removeBookmark(uid, questionId) {
    try {
        const bookmarkId = `${uid}_${questionId}`;

        await deleteDoc(
            doc(db, COLLECTIONS.BOOKMARKS, bookmarkId)
        );

        return {
            success: true
        };

    } catch (error) {
        console.error("Remove Bookmark Error:", error);

        return {
            success: false,
            message: error.message
        };
    }
}

// ============================================
// GET USER BOOKMARKS
// ============================================

export async function getUserBookmarks(uid) {
    return getCollectionData(
        COLLECTIONS.BOOKMARKS,
        {
            filters: [
                {
                    field: "uid",
                    operator: "==",
                    value: uid
                }
            ],
            maxResults: 200
        }
    );
}

// ============================================
// SAVE USER NOTE
// ============================================

export async function saveUserNote(uid, note) {
    try {
        if (!uid || !note?.title || !note?.content) {
            throw new Error("Note का Title और Content जरूरी है।");
        }

        const noteRef = await addDoc(
            collection(db, COLLECTIONS.NOTES),
            {
                uid,
                title: String(note.title).slice(0, 150),
                content: String(note.content).slice(0, 10000),
                subjectId: note.subjectId || "",
                topicId: note.topicId || "",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            }
        );

        return {
            success: true,
            noteId: noteRef.id
        };

    } catch (error) {
        console.error("Save Note Error:", error);

        return {
            success: false,
            message: error.message
        };
    }
}

// ============================================
// GET USER NOTES
// ============================================

export async function getUserNotes(uid) {
    return getCollectionData(
        COLLECTIONS.NOTES,
        {
            filters: [
                {
                    field: "uid",
                    operator: "==",
                    value: uid
                }
            ],
            maxResults: 200
        }
    );
}

// ============================================
// DELETE USER NOTE
// ============================================

export async function deleteUserNote(uid, noteId) {
    try {
        const noteRef = doc(
            db,
            COLLECTIONS.NOTES,
            noteId
        );

        const snapshot = await getDoc(noteRef);

        if (!snapshot.exists() || snapshot.data().uid !== uid) {
            throw new Error("यह Note उपलब्ध नहीं है।");
        }

        await deleteDoc(noteRef);

        return {
            success: true
        };

    } catch (error) {
        console.error("Delete Note Error:", error);

        return {
            success: false,
            message: error.message
        };
    }
}

// ============================================
// REAL-TIME COLLECTION LISTENER
// ============================================

export function listenToCollection(
    collectionName,
    callback,
    filters = []
) {
    const constraints = filters.map((filter) =>
        where(
            filter.field,
            filter.operator,
            filter.value
        )
    );

    const q = query(
        collection(db, collectionName),
        ...constraints
    );

    return onSnapshot(
        q,
        (snapshot) => {
            const data = snapshot.docs.map((item) => ({
                id: item.id,
                ...item.data()
            }));

            callback(data);
        },
        (error) => {
            console.error("Realtime Listener Error:", error);
        }
    );
}

// ============================================
// BATCH WRITE
// ============================================

export async function saveBatchDocuments(
    collectionName,
    documents
) {
    try {
        if (!Array.isArray(documents) || documents.length === 0) {
            throw new Error("Documents की सूची खाली है।");
        }

        if (documents.length > 450) {
            throw new Error(
                "एक Batch में अधिकतम 450 Documents भेजें।"
            );
        }

        const batch = writeBatch(db);

        documents.forEach((item) => {
            const ref = item.id
                ? doc(db, collectionName, item.id)
                : doc(collection(db, collectionName));

            batch.set(ref, {
                ...item.data,
                updatedAt: serverTimestamp()
            });
        });

        await batch.commit();

        return {
            success: true,
            count: documents.length
        };

    } catch (error) {
        console.error("Batch Write Error:", error);

        return {
            success: false,
            message: error.message
        };
    }
}

// ============================================
// UPDATE USER ACTIVITY
// ============================================

export async function updateUserActivity(uid) {
    try {
        if (!uid) {
            throw new Error("User ID जरूरी है।");
        }

        await setDoc(
            doc(db, COLLECTIONS.USERS, uid),
            {
                lastActiveAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            },
            {
                merge: true
            }
        );

        return {
            success: true
        };

    } catch (error) {
        console.error("Activity Update Error:", error);

        return {
            success: false,
            message: error.message
        };
    }
}

// ============================================
// DATABASE CONNECTION CHECK
// ============================================

export async function checkDatabaseConnection() {
    try {
        await getDoc(
            doc(db, COLLECTIONS.APP_SETTINGS, "appInfo")
        );

        return {
            connected: true,
            message: "Firestore Database Connected"
        };

    } catch (error) {
        console.error("Firestore Connection Error:", error);

        return {
            connected: false,
            message: error.message
        };
    }
}
