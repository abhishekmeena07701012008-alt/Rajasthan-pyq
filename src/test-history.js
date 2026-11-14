// src/test-history.js

import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "./firebase.js";

const REGION = "asia-south1";
const MAX_PAGE_SIZE = 50;

const functions = getFunctions(app, REGION);
const getMyTestHistoryCallable = httpsCallable(
    functions,
    "getMyTestHistory"
);

/* =========================================
   HELPERS
========================================= */

function getSafeNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

function getDateValue(value) {
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

function normalizeSubjectScores(value) {
    if (!value) return [];

    const entries = Array.isArray(value)
        ? value.map((item, index) => [item.subjectId || item.subjectName || String(index), item])
        : Object.entries(value);

    return entries.map(([id, subject]) => ({
        subjectId: subject.subjectId || id,
        subjectName: subject.subjectName || id,

        totalQuestions: getSafeNumber(
            subject.totalQuestions ?? subject.total
        ),

        correctAnswers: getSafeNumber(
            subject.correctAnswers ?? subject.correct
        ),

        wrongAnswers: getSafeNumber(
            subject.wrongAnswers ?? subject.wrong
        ),

        skippedQuestions: getSafeNumber(
            subject.skippedQuestions ?? subject.skipped
        ),

        score: getSafeNumber(subject.score)
    }));
}

function normalizeQuestionReview(answers) {
    if (!Array.isArray(answers)) return [];

    return answers.map(answer => ({
        questionId: answer.questionId,
        selectedAnswer: answer.selectedAnswer,
        correctAnswer: answer.correctAnswer,

        isCorrect: answer.status === "correct",

        status: answer.status,
        marks: getSafeNumber(answer.marks),

        explanation: {
            hi: answer.explanationHindi || "",
            en: answer.explanationEnglish || ""
        }
    }));
}

function normalizeAttempt(data) {
    const correctAnswers = getSafeNumber(
        data.correctAnswers ?? data.correct
    );

    const wrongAnswers = getSafeNumber(
        data.wrongAnswers ?? data.wrong
    );

    const skippedQuestions = getSafeNumber(
        data.skippedQuestions ?? data.skipped
    );

    const totalQuestions = getSafeNumber(data.totalQuestions);

    const attemptedQuestions = correctAnswers + wrongAnswers;

    const accuracy = attemptedQuestions > 0
        ? (correctAnswers / attemptedQuestions) * 100
        : 0;

    return {
        ...data,

        id: data.id || "",

        uid: data.uid || "",

        score: getSafeNumber(data.score),

        percentage: getSafeNumber(data.percentage),

        accuracy: getSafeNumber(data.accuracy, accuracy),

        totalQuestions,

        attemptedQuestions,

        correctAnswers,

        wrongAnswers,

        skippedQuestions,

        submittedAt: getDateValue(
            data.submittedAt || data.createdAt
        ),

        createdAt: getDateValue(data.createdAt),

        startedAt: getDateValue(data.startedAt),

        subjectScores: normalizeSubjectScores(
            data.subjectScores
        ),

        questionReview: normalizeQuestionReview(
            data.answers || data.questionReview
        )
    };
}

function validateUserId(userId) {
    if (!userId || typeof userId !== "string") {
        throw new Error("Valid user ID is required.");
    }
}

/* =========================================
   GET TEST HISTORY
========================================= */

export async function getTestHistory(userId, options = {}) {
    validateUserId(userId);

    try {
        const requestedPageSize = getSafeNumber(
            options.pageSize,
            MAX_PAGE_SIZE
        );

        const pageSize = Math.min(
            Math.max(requestedPageSize, 1),
            MAX_PAGE_SIZE
        );

        /*
         * Backend currently returns a maximum of 50 attempts.
         * It does not support cursor pagination yet.
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
            throw new Error(
                "Backend returned an invalid test history response."
            );
        }

        const attempts = data.attempts
            .map(normalizeAttempt)
            .slice(0, pageSize);

        attempts.sort((a, b) => {
            const dateA = a.submittedAt
                ? a.submittedAt.getTime()
                : 0;

            const dateB = b.submittedAt
                ? b.submittedAt.getTime()
                : 0;

            return dateB - dateA;
        });

        return {
            success: true,
            attempts,
            lastDocument: null,
            hasMore: false,
            count: attempts.length
        };

    } catch (error) {
        console.error("Test history error:", error);

        return {
            success: false,
            attempts: [],
            lastDocument: null,
            hasMore: false,
            count: 0,
            error: error.message || "Unable to load test history."
        };
    }
}

/* =========================================
   GET SINGLE TEST ATTEMPT
========================================= */

export async function getTestAttemptById(userId, attemptId) {
    validateUserId(userId);

    if (!attemptId) {
        throw new Error("Attempt ID is required.");
    }

    try {
        const result = await getTestHistory(userId, {
            pageSize: MAX_PAGE_SIZE
        });

        if (!result.success) {
            return {
                success: false,
                error: result.error
            };
        }

        const attempt = result.attempts.find(
            item => item.id === attemptId
        );

        if (!attempt) {
            return {
                success: false,
                error: "Test attempt not found in available history."
            };
        }

        return {
            success: true,
            attempt
        };

    } catch (error) {
        console.error("Get test attempt error:", error);

        return {
            success: false,
            error: error.message
        };
    }
}

/* =========================================
   TEST HISTORY SUMMARY
========================================= */

export function calculateTestHistorySummary(attempts = []) {
    if (!Array.isArray(attempts) || attempts.length === 0) {
        return {
            totalTests: 0,
            averageScore: 0,
            averagePercentage: 0,
            averageAccuracy: 0,
            bestScore: 0,
            latestScore: 0,
            totalCorrect: 0,
            totalWrong: 0,
            totalSkipped: 0
        };
    }

    const totalTests = attempts.length;

    const totalScore = attempts.reduce(
        (sum, item) => sum + getSafeNumber(item.score),
        0
    );

    const totalPercentage = attempts.reduce(
        (sum, item) => sum + getSafeNumber(item.percentage),
        0
    );

    const totalAccuracy = attempts.reduce(
        (sum, item) => sum + getSafeNumber(item.accuracy),
        0
    );

    const totalCorrect = attempts.reduce(
        (sum, item) => sum + getSafeNumber(item.correctAnswers),
        0
    );

    const totalWrong = attempts.reduce(
        (sum, item) => sum + getSafeNumber(item.wrongAnswers),
        0
    );

    const totalSkipped = attempts.reduce(
        (sum, item) => sum + getSafeNumber(item.skippedQuestions),
        0
    );

    const bestScore = Math.max(
        ...attempts.map(item => getSafeNumber(item.score))
    );

    return {
        totalTests,

        averageScore: Number(
            (totalScore / totalTests).toFixed(2)
        ),

        averagePercentage: Number(
            (totalPercentage / totalTests).toFixed(2)
        ),

        averageAccuracy: Number(
            (totalAccuracy / totalTests).toFixed(2)
        ),

        bestScore,

        latestScore: getSafeNumber(attempts[0]?.score),

        totalCorrect,
        totalWrong,
        totalSkipped
    };
}

/* =========================================
   SUBJECT PERFORMANCE ANALYSIS
========================================= */

export function analyzeSubjectPerformance(attempts = []) {
    const subjects = {};

    attempts.forEach(attempt => {
        const subjectScores = normalizeSubjectScores(
            attempt.subjectScores
        );

        subjectScores.forEach(subject => {
            const id = subject.subjectId;

            if (!id) return;

            if (!subjects[id]) {
                subjects[id] = {
                    subjectId: id,
                    subjectName: subject.subjectName || id,
                    tests: 0,
                    totalQuestions: 0,
                    correctAnswers: 0,
                    wrongAnswers: 0,
                    skippedQuestions: 0,
                    totalScore: 0
                };
            }

            const item = subjects[id];

            item.tests++;

            item.totalQuestions += getSafeNumber(
                subject.totalQuestions
            );

            item.correctAnswers += getSafeNumber(
                subject.correctAnswers
            );

            item.wrongAnswers += getSafeNumber(
                subject.wrongAnswers
            );

            item.skippedQuestions += getSafeNumber(
                subject.skippedQuestions
            );

            item.totalScore += getSafeNumber(subject.score);
        });
    });

    return Object.values(subjects).map(subject => {
        const attempted =
            subject.correctAnswers + subject.wrongAnswers;

        const accuracy = attempted > 0
            ? (subject.correctAnswers / attempted) * 100
            : 0;

        let performance = "average";

        if (accuracy >= 80) {
            performance = "strong";
        } else if (accuracy < 50) {
            performance = "weak";
        }

        return {
            ...subject,

            accuracy: Number(accuracy.toFixed(2)),

            averageScore: Number(
                (subject.totalScore / subject.tests).toFixed(2)
            ),

            performance
        };
    }).sort((a, b) => b.accuracy - a.accuracy);
}

/* =========================================
   WEAK AND STRONG SUBJECTS
========================================= */

export function getWeakSubjects(subjectAnalysis = []) {
    return subjectAnalysis
        .filter(subject => subject.performance === "weak")
        .sort((a, b) => a.accuracy - b.accuracy);
}

export function getStrongSubjects(subjectAnalysis = []) {
    return subjectAnalysis
        .filter(subject => subject.performance === "strong")
        .sort((a, b) => b.accuracy - a.accuracy);
}

/* =========================================
   PERFORMANCE TREND
========================================= */

export function getPerformanceTrend(attempts = []) {
    return [...attempts]
        .filter(item => item.submittedAt)
        .sort((a, b) => {
            return new Date(a.submittedAt) -
                new Date(b.submittedAt);
        })
        .map((attempt, index) => ({
            attemptNumber: index + 1,
            attemptId: attempt.id,
            examId: attempt.examId || null,
            score: getSafeNumber(attempt.score),
            percentage: getSafeNumber(attempt.percentage),
            accuracy: getSafeNumber(attempt.accuracy),
            submittedAt: attempt.submittedAt
        }));
}

/* =========================================
   WRONG ANSWER REVIEW
========================================= */

export function getWrongAnswerReview(attempt) {
    if (!attempt) return [];

    const review = attempt.questionReview ||
        normalizeQuestionReview(attempt.answers);

    if (!Array.isArray(review)) return [];

    return review.filter(question => {
        return question.isCorrect === false;
    });
}

/* =========================================
   COMPLETE STUDENT ANALYSIS
========================================= */

export function generateStudentAnalysis(attempts = []) {
    const summary = calculateTestHistorySummary(attempts);

    const subjectAnalysis = analyzeSubjectPerformance(attempts);

    const weakSubjects = getWeakSubjects(subjectAnalysis);

    const strongSubjects = getStrongSubjects(subjectAnalysis);

    const trend = getPerformanceTrend(attempts);

    const recommendations = weakSubjects.map(subject => ({
        subjectId: subject.subjectId,
        subjectName: subject.subjectName,
        accuracy: subject.accuracy,
        recommendation:
            "Revise this subject and practice more questions."
    }));

    return {
        summary,
        subjectAnalysis,
        weakSubjects,
        strongSubjects,
        trend,
        recommendations,

        analysisAvailable: attempts.length > 0,

        note:
            "Analysis is based only on the test attempts provided. The backend currently returns at most 50 attempts."
    };
}

/* =========================================
   EXPORT HISTORY DATA
========================================= */

export function exportTestHistory(attempts = []) {
    return attempts.map(attempt => ({
        attemptId: attempt.id,
        examId: attempt.examId || "",
        examName: attempt.examName || "",
        score: getSafeNumber(attempt.score),
        percentage: getSafeNumber(attempt.percentage),
        accuracy: getSafeNumber(attempt.accuracy),
        totalQuestions: getSafeNumber(attempt.totalQuestions),
        correctAnswers: getSafeNumber(attempt.correctAnswers),
        wrongAnswers: getSafeNumber(attempt.wrongAnswers),
        skippedQuestions: getSafeNumber(attempt.skippedQuestions),

        submittedAt: attempt.submittedAt
            ? new Date(attempt.submittedAt).toISOString()
            : ""
    }));
}
