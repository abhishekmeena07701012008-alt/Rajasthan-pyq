// src/bookmarks.js

import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp
} from "firebase/firestore";

import { db } from "./firebase.js";
import { getQuestionById } from "./question-service.js";

const COLLECTION_NAME = "userBookmarks";
const DEFAULT_PAGE_SIZE = 30;
const MAX_PAGE_SIZE = 100;

/* =========================================
   HELPERS
========================================= */

function validateUserId(userId) {
    if (!userId || typeof userId !== "string") {
        throw new Error("Valid user ID is required.");
    }
}

function validateQuestionId(questionId) {
    if (!questionId || typeof questionId !== "string") {
        throw new Error("Valid question ID is required.");
    }
}

function createBookmarkId(userId, questionId) {
    return `${encodeURIComponent(userId)}_${encodeURIComponent(questionId)}`;
}

function normalizeBookmark(snapshot) {
    const data = snapshot.data();

    return {
        id: snapshot.id,
        ...data,

        createdAt: data.createdAt?.toDate
            ? data.createdAt.toDate()
            : data.createdAt || null
    };
}

/* =========================================
   ADD BOOKMARK
========================================= */

export async function addBookmark(
    userId,
    question
) {
    validateUserId(userId);

    if (!question?.id) {
        throw new Error("Valid question data is required.");
    }

    const questionId = question.id;

    const bookmarkId = createBookmarkId(
        userId,
        questionId
    );

    try {
        const bookmarkRef = doc(
            db,
            COLLECTION_NAME,
            bookmarkId
        );

        const existing = await getDoc(bookmarkRef);

        if (existing.exists()) {
            return {
                success: true,
                alreadyBookmarked: true,
                message: "Question is already bookmarked."
            };
        }

        await setDoc(bookmarkRef, {
            userId,
            questionId,

            examId: question.examId || null,
            subjectId: question.subjectId || null,
            topicId: question.topicId || null,
            subtopicId: question.subtopicId || null,

            questionType: question.type || null,

            createdAt: serverTimestamp()
        });

        return {
            success: true,
            alreadyBookmarked: false,
            message: "Question bookmarked successfully."
        };

    } catch (error) {
        console.error("Add bookmark error:", error);

        return {
            success: false,
            error: error.message
        };
    }
}

/* =========================================
   REMOVE BOOKMARK
========================================= */

export async function removeBookmark(
    userId,
    questionId
) {
    validateUserId(userId);
    validateQuestionId(questionId);

    try {
        const bookmarkId = createBookmarkId(
            userId,
            questionId
        );

        const bookmarkRef = doc(
            db,
            COLLECTION_NAME,
            bookmarkId
        );

        const snapshot = await getDoc(bookmarkRef);

        if (!snapshot.exists()) {
            return {
                success: true,
                removed: false
            };
        }

        if (snapshot.data().userId !== userId) {
            return {
                success: false,
                error: "You cannot remove another user's bookmark."
            };
        }

        await deleteDoc(bookmarkRef);

        return {
            success: true,
            removed: true
        };

    } catch (error) {
        console.error("Remove bookmark error:", error);

        return {
            success: false,
            error: error.message
        };
    }
}

/* =========================================
   CHECK BOOKMARK STATUS
========================================= */

export async function isBookmarked(
    userId,
    questionId
) {
    validateUserId(userId);
    validateQuestionId(questionId);

    try {
        const bookmarkId = createBookmarkId(
            userId,
            questionId
        );

        const bookmarkRef = doc(
            db,
            COLLECTION_NAME,
            bookmarkId
        );

        const snapshot = await getDoc(bookmarkRef);

        if (!snapshot.exists()) {
            return false;
        }

        return snapshot.data().userId === userId;

    } catch (error) {
        console.error("Bookmark status error:", error);
        return false;
    }
}

/* =========================================
   GET BOOKMARK LIST
========================================= */

export async function getBookmarks(
    userId,
    options = {}
) {
    validateUserId(userId);

    const pageSize = Math.min(
        Math.max(
            Number(options.pageSize) || DEFAULT_PAGE_SIZE,
            1
        ),
        MAX_PAGE_SIZE
    );

    try {
        const constraints = [
            where("userId", "==", userId),
            orderBy("createdAt", "desc"),
            limit(pageSize)
        ];

        const bookmarkQuery = query(
            collection(db, COLLECTION_NAME),
            ...constraints
        );

        const snapshot = await getDocs(bookmarkQuery);

        const bookmarks = snapshot.docs.map(
            normalizeBookmark
        );

        return {
            success: true,
            bookmarks,
            count: bookmarks.length,
            hasMore: bookmarks.length === pageSize
        };

    } catch (error) {
        console.error("Get bookmarks error:", error);

        return {
            success: false,
            bookmarks: [],
            count: 0,
            hasMore: false,
            error: error.message
        };
    }
}

/* =========================================
   GET BOOKMARKED QUESTIONS
========================================= */

/**
 * Fetches actual question documents using saved question IDs.
 * Missing or unpublished questions are skipped.
 */

export async function getBookmarkedQuestions(
    userId,
    options = {}
) {
    const bookmarkResult = await getBookmarks(
        userId,
        options
    );

    if (!bookmarkResult.success) {
        return bookmarkResult;
    }

    const results = await Promise.all(
        bookmarkResult.bookmarks.map(async bookmark => {
            try {
                const result = await getQuestionById(
                    bookmark.questionId
                );

                if (!result?.success || !result.question) {
                    return null;
                }

                return {
                    ...result.question,
                    bookmarkId: bookmark.id,
                    bookmarkedAt: bookmark.createdAt
                };

            } catch (error) {
                console.error(
                    "Bookmarked question fetch error:",
                    error
                );

                return null;
            }
        })
    );

    const questions = results.filter(Boolean);

    return {
        success: true,
        questions,
        count: questions.length,
        hasMore: bookmarkResult.hasMore
    };
}

/* =========================================
   GET BOOKMARKS BY SUBJECT
========================================= */

export async function getBookmarksBySubject(
    userId,
    subjectId
) {
    validateUserId(userId);

    if (!subjectId) {
        throw new Error("Subject ID is required.");
    }

    try {
        const bookmarkQuery = query(
            collection(db, COLLECTION_NAME),
            where("userId", "==", userId),
            where("subjectId", "==", subjectId),
            orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(bookmarkQuery);

        return {
            success: true,
            bookmarks: snapshot.docs.map(normalizeBookmark),
            count: snapshot.size
        };

    } catch (error) {
        console.error("Subject bookmarks error:", error);

        return {
            success: false,
            bookmarks: [],
            count: 0,
            error: error.message
        };
    }
}

/* =========================================
   GET BOOKMARK COUNTS BY SUBJECT
========================================= */

export async function getBookmarkSubjectCounts(userId) {
    validateUserId(userId);

    const result = await getBookmarks(userId, {
        pageSize: MAX_PAGE_SIZE
    });

    if (!result.success) {
        return result;
    }

    const counts = {};

    result.bookmarks.forEach(bookmark => {
        const subjectId = bookmark.subjectId || "uncategorized";

        counts[subjectId] = (counts[subjectId] || 0) + 1;
    });

    return {
        success: true,
        counts,
        total: result.count,
        complete: !result.hasMore
    };
}

/* =========================================
   TOGGLE BOOKMARK
========================================= */

export async function toggleBookmark(
    userId,
    question
) {
    validateUserId(userId);

    if (!question?.id) {
        throw new Error("Valid question data is required.");
    }

    const alreadySaved = await isBookmarked(
        userId,
        question.id
    );

    if (alreadySaved) {
        return removeBookmark(userId, question.id);
    }

    return addBookmark(userId, question);
}
