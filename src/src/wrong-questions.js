// src/wrong-questions.js

import {
    collection,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    getDocs
} from "firebase/firestore";

import { db } from "./firebase.js";
import { getQuestionById } from "./question-service.js";

const TEST_ATTEMPTS_COLLECTION = "testAttempts";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/* =========================================
   HELPERS
========================================= */

function validateUserId(userId) {
    if (!userId || typeof userId !== "string") {
        throw new Error("Valid user ID is required.");
    }
}

function safeNumber(value, fallback = 0) {
    const number = Number(value);

    return Number.isFinite(number) ? number : fallback;
}

function normalizeDate(value) {
    if (!value) return null;

    if (typeof value.toDate === "function") {
        return value.toDate();
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
}

/* =========================================
   GET WRONG ANSWERS FROM ATTEMPT
========================================= */

function extractWrongAnswers(attempt) {
    if (!Array.isArray(attempt.questionReview)) {
        return [];
    }

    return attempt.questionReview
        .filter(item => item.isCorrect === false)
        .map(item => ({
            questionId: item.questionId || null,
            selectedAnswer: item.selectedAnswer ?? null,
            correctAnswer: item.correctAnswer ?? null,
            explanation: item.explanation || null,

            examId: attempt.examId || null,
            examName: attempt.examName || null,

            attemptId: attempt.id,
            submittedAt: normalizeDate(attempt.submittedAt),

            questionSnapshot: item.question || null,
            optionsSnapshot: item.options || null
        }))
        .filter(item => item.questionId);
}

/* =========================================
   LOAD TEST ATTEMPTS
========================================= */

export async function getWrongQuestionAttempts(
    userId,
    options = {}
) {
    validateUserId(userId);

    const pageSize = Math.min(
        Math.max(
            safeNumber(options.pageSize, DEFAULT_PAGE_SIZE),
            1
        ),
        MAX_PAGE_SIZE
    );

    try {
        const constraints = [
            where("userId", "==", userId),
            orderBy("submittedAt", "desc"),
            limit(pageSize)
        ];

        if (options.cursor) {
            constraints.splice(
                constraints.length - 1,
                0,
                startAfter(options.cursor)
            );
        }

        const attemptsQuery = query(
            collection(db, TEST_ATTEMPTS_COLLECTION),
            ...constraints
        );

        const snapshot = await getDocs(attemptsQuery);

        const attempts = snapshot.docs.map(document => ({
            id: document.id,
            ...document.data()
        }));

        const lastDocument = snapshot.docs.length
            ? snapshot.docs[snapshot.docs.length - 1]
            : null;

        return {
            success: true,
            attempts,
            lastDocument,
            hasMore: snapshot.size === pageSize
        };

    } catch (error) {
        console.error("Wrong question attempts error:", error);

        return {
            success: false,
            attempts: [],
            lastDocument: null,
            hasMore: false,
            error: error.message
        };
    }
}

/* =========================================
   EXTRACT WRONG QUESTIONS
========================================= */

export function extractWrongQuestions(attempts = []) {
    const wrongQuestions = [];

    attempts.forEach(attempt => {
        wrongQuestions.push(
            ...extractWrongAnswers(attempt)
        );
    });

    return wrongQuestions;
}

/* =========================================
   REMOVE DUPLICATE WRONG QUESTIONS
========================================= */

/**
 * Keeps one entry per question.
 * The latest occurrence is retained when attempts
 * are ordered newest first.
 */

export function getUniqueWrongQuestions(attempts = []) {
    const wrongQuestions = extractWrongQuestions(attempts);

    const uniqueQuestions = new Map();

    wrongQuestions.forEach(item => {
        if (!uniqueQuestions.has(item.questionId)) {
            uniqueQuestions.set(item.questionId, item);
        }
    });

    return Array.from(uniqueQuestions.values());
}

/* =========================================
   GET WRONG QUESTION LIST
========================================= */

export async function getWrongQuestions(
    userId,
    options = {}
) {
    const result = await getWrongQuestionAttempts(
        userId,
        options
    );

    if (!result.success) {
        return result;
    }

    const wrongQuestions = getUniqueWrongQuestions(
        result.attempts
    );

    return {
        success: true,
        wrongQuestions,
        count: wrongQuestions.length,
        lastDocument: result.lastDocument,
        hasMore: result.hasMore
    };
}

/* =========================================
   GET QUESTION DETAILS
========================================= */

export async function getWrongQuestionDetails(
    userId,
    questionId
) {
    validateUserId(userId);

    if (!questionId) {
        throw new Error("Question ID is required.");
    }

    try {
        const result = await getQuestionById(questionId);

        if (!result?.success || !result.question) {
            return {
                success: false,
                error: "Question not found or unavailable."
            };
        }

        return {
            success: true,
            question: result.question
        };

    } catch (error) {
        console.error("Wrong question details error:", error);

        return {
            success: false,
            error: error.message
        };
    }
}

/* =========================================
   FILTER WRONG QUESTIONS
========================================= */

export function filterWrongQuestions(
    questions = [],
    filters = {}
) {
    return questions.filter(question => {
        if (
            filters.examId &&
            question.examId !== filters.examId
        ) {
            return false;
        }

        if (
            filters.subjectId &&
            question.subjectId !== filters.subjectId
        ) {
            return false;
        }

        if (
            filters.topicId &&
            question.topicId !== filters.topicId
        ) {
            return false;
        }

        return true;
    });
}

/* =========================================
   WRONG QUESTION STATISTICS
========================================= */

export function getWrongQuestionStatistics(
    attempts = []
) {
    const wrongQuestions = extractWrongQuestions(attempts);

    const uniqueQuestions = getUniqueWrongQuestions(attempts);

    const examCounts = {};
    const questionCounts = {};

    wrongQuestions.forEach(item => {
        const examId = item.examId || "unknown";

        examCounts[examId] = (examCounts[examId] || 0) + 1;

        questionCounts[item.questionId] =
            (questionCounts[item.questionId] || 0) + 1;
    });

    const repeatedMistakes = Object.entries(questionCounts)
        .filter(([, count]) => count > 1)
        .map(([questionId, count]) => ({
            questionId,
            wrongAttempts: count
        }))
        .sort((a, b) => b.wrongAttempts - a.wrongAttempts);

    return {
        totalWrongAttempts: wrongQuestions.length,

        uniqueWrongQuestions: uniqueQuestions.length,

        repeatedMistakes,

        examCounts
    };
}

/* =========================================
   GET MOST REPEATED MISTAKES
========================================= */

export function getRepeatedWrongQuestions(
    attempts = []
) {
    const wrongQuestions = extractWrongQuestions(attempts);

    const counts = {};

    wrongQuestions.forEach(item => {
        counts[item.questionId] =
            (counts[item.questionId] || 0) + 1;
    });

    return Object.entries(counts)
        .filter(([, count]) => count > 1)
        .map(([questionId, wrongAttempts]) => ({
            questionId,
            wrongAttempts
        }))
        .sort((a, b) => b.wrongAttempts - a.wrongAttempts);
}

/* =========================================
   GET WRONG QUESTIONS BY SUBJECT
========================================= */

export function getWrongQuestionsBySubject(
    attempts = []
) {
    const subjects = {};

    attempts.forEach(attempt => {
        const reviews = Array.isArray(attempt.questionReview)
            ? attempt.questionReview
            : [];

        reviews
            .filter(item => item.isCorrect === false)
            .forEach(item => {
                const subjectId =
                    item.subjectId || "uncategorized";

                if (!subjects[subjectId]) {
                    subjects[subjectId] = {
                        subjectId,
                        subjectName:
                            item.subjectName || subjectId,
                        wrongCount: 0,
                        questionIds: []
                    };
                }

                subjects[subjectId].wrongCount += 1;

                if (
                    item.questionId &&
                    !subjects[subjectId].questionIds.includes(
                        item.questionId
                    )
                ) {
                    subjects[subjectId].questionIds.push(
                        item.questionId
                    );
                }
            });
    });

    return Object.values(subjects).sort(
        (a, b) => b.wrongCount - a.wrongCount
    );
}

/* =========================================
   PREPARE WRONG QUESTIONS FOR RETRY
========================================= */

/**
 * Returns actual question IDs for a future retry session.
 * The practice module can use these IDs to retrieve
 * the corresponding question documents.
 */

export function prepareWrongQuestionsForRetry(
    wrongQuestions = []
) {
    const questionIds = [
        ...new Set(
            wrongQuestions
                .map(item => item.questionId)
                .filter(Boolean)
        )
    ];

    return {
        questionIds,
        totalQuestions: questionIds.length,
        questionType: "WRONG_QUESTIONS"
    };
}

/* =========================================
   COMPLETE WRONG QUESTION REPORT
========================================= */

export function generateWrongQuestionReport(
    attempts = []
) {
    const wrongQuestions = getUniqueWrongQuestions(attempts);

    const statistics = getWrongQuestionStatistics(attempts);

    const subjectAnalysis = getWrongQuestionsBySubject(attempts);

    const repeatedMistakes = getRepeatedWrongQuestions(attempts);

    return {
        totalUniqueWrongQuestions: wrongQuestions.length,

        wrongQuestions,

        statistics,

        subjectAnalysis,

        repeatedMistakes,

        generatedAt: new Date()
    };
}
