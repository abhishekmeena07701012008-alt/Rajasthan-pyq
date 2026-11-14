// src/wrong-questions.js

import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "./firebase.js";
import { getQuestionById } from "./question-service.js";

const functions = getFunctions(app, "asia-south1");

const getMyTestHistoryCallable = httpsCallable(
    functions,
    "getMyTestHistory"
);

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

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

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeAnswer(item, attempt) {
    const status = String(item.status || "").toLowerCase();

    const isCorrect = typeof item.isCorrect === "boolean"
        ? item.isCorrect
        : status === "correct";

    return {
        questionId: item.questionId || null,

        selectedAnswer: item.selectedAnswer ?? null,

        correctAnswer: item.correctAnswer ?? null,

        isCorrect,

        status: status || (isCorrect ? "correct" : "wrong"),

        explanation: {
            hi: item.explanationHindi || "",
            en: item.explanationEnglish || ""
        },

        subjectId: item.subjectId || null,
        subjectName: item.subjectName || null,

        topicId: item.topicId || null,
        topicName: item.topicName || null,

        question: item.question || null,
        options: item.options || null,

        examId: attempt.examId || null,
        examName: attempt.examName || null,

        attemptId: attempt.id || null,

        submittedAt: normalizeDate(
            attempt.submittedAt || attempt.createdAt
        )
    };
}

function getAttemptAnswers(attempt) {
    if (Array.isArray(attempt.answers)) {
        return attempt.answers;
    }

    if (Array.isArray(attempt.questionReview)) {
        return attempt.questionReview;
    }

    return [];
}

function extractWrongAnswers(attempt) {
    return getAttemptAnswers(attempt)
        .map(item => normalizeAnswer(item, attempt))
        .filter(item => {
            return item.questionId && item.isCorrect === false;
        });
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
        /*
         * Backend getMyTestHistory currently returns
         * maximum 50 attempts and does not support cursor pagination.
         */

        if (options.cursor) {
            return {
                success: true,
                attempts: [],
                lastDocument: null,
                hasMore: false,
                count: 0
            };
        }

        const response = await getMyTestHistoryCallable();

        const data = response.data || {};

        if (!Array.isArray(data.attempts)) {
            throw new Error("Invalid test history response.");
        }

        const attempts = data.attempts
            .map(attempt => ({
                ...attempt,
                id: attempt.id || "",
                submittedAt: normalizeDate(
                    attempt.submittedAt || attempt.createdAt
                )
            }))
            .sort((a, b) => {
                const dateA = a.submittedAt?.getTime() || 0;
                const dateB = b.submittedAt?.getTime() || 0;

                return dateB - dateA;
            })
            .slice(0, pageSize);

        return {
            success: true,
            attempts,
            lastDocument: null,
            hasMore: false,
            count: attempts.length
        };

    } catch (error) {
        console.error("Wrong question attempts error:", error);

        return {
            success: false,
            attempts: [],
            lastDocument: null,
            hasMore: false,
            count: 0,
            error: error.message || "Unable to load test attempts."
        };
    }
}

/* =========================================
   EXTRACT WRONG QUESTIONS
========================================= */

export function extractWrongQuestions(attempts = []) {
    if (!Array.isArray(attempts)) return [];

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
        lastDocument: null,
        hasMore: false
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
                question: null,
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
            question: null,
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
        extractWrongAnswers(attempt).forEach(item => {
            const subjectId = item.subjectId || "uncategorized";

            if (!subjects[subjectId]) {
                subjects[subjectId] = {
                    subjectId,
                    subjectName: item.subjectName || subjectId,
                    wrongCount: 0,
                    questionIds: []
                };
            }

            subjects[subjectId].wrongCount++;

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
