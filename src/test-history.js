// src/test-history.js

import {
    collection,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    getDocs,
    doc,
    getDoc
} from "firebase/firestore";

import { db } from "./firebase.js";

const TEST_ATTEMPTS_COLLECTION = "testAttempts";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function getSafeNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

function getDateValue(value) {
    if (!value) return null;

    if (typeof value.toDate === "function") {
        return value.toDate();
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeAttempt(snapshot) {
    const data = snapshot.data();

    return {
        id: snapshot.id,
        ...data,
        score: getSafeNumber(data.score),
        percentage: getSafeNumber(data.percentage),
        accuracy: getSafeNumber(data.accuracy),
        totalQuestions: getSafeNumber(data.totalQuestions),
        attemptedQuestions: getSafeNumber(data.attemptedQuestions),
        correctAnswers: getSafeNumber(data.correctAnswers),
        wrongAnswers: getSafeNumber(data.wrongAnswers),
        skippedQuestions: getSafeNumber(data.skippedQuestions),
        submittedAt: getDateValue(data.submittedAt),
        startedAt: getDateValue(data.startedAt)
    };
}

function validateUserId(userId) {
    if (!userId || typeof userId !== "string") {
        throw new Error("Valid user ID is required.");
    }
}

export async function getTestHistory(userId, options = {}) {
    validateUserId(userId);

    const pageSize = Math.min(
        Math.max(
            getSafeNumber(options.pageSize, DEFAULT_PAGE_SIZE),
            1
        ),
        MAX_PAGE_SIZE
    );

    try {
        const constraints = [
            where("userId", "==", userId),
            orderBy("submittedAt", "desc")
        ];

        if (options.cursor) {
            constraints.push(startAfter(options.cursor));
        }

        constraints.push(limit(pageSize));

        const historyQuery = query(
            collection(db, TEST_ATTEMPTS_COLLECTION),
            ...constraints
        );

        const snapshot = await getDocs(historyQuery);

        const attempts = snapshot.docs.map(normalizeAttempt);

        const lastDocument = snapshot.docs.length
            ? snapshot.docs[snapshot.docs.length - 1]
            : null;

        return {
            success: true,
            attempts,
            lastDocument,
            hasMore: snapshot.docs.length === pageSize,
            count: attempts.length
        };

    } catch (error) {
        console.error("Test history error:", error);

        return {
            success: false,
            attempts: [],
            lastDocument: null,
            hasMore: false,
            error: error.message
        };
    }
}

export async function getTestAttemptById(userId, attemptId) {
    validateUserId(userId);

    if (!attemptId) {
        throw new Error("Attempt ID is required.");
    }

    try {
        const attemptRef = doc(
            db,
            TEST_ATTEMPTS_COLLECTION,
            attemptId
        );

        const snapshot = await getDoc(attemptRef);

        if (!snapshot.exists()) {
            return {
                success: false,
                error: "Test attempt not found."
            };
        }

        const attempt = normalizeAttempt(snapshot);

        if (attempt.userId !== userId) {
            return {
                success: false,
                error: "You are not authorized to view this attempt."
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

export function analyzeSubjectPerformance(attempts = []) {
    const subjects = {};

    attempts.forEach(attempt => {
        const subjectScores = Array.isArray(attempt.subjectScores)
            ? attempt.subjectScores
            : [];

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

            item.tests += 1;
            item.totalQuestions += getSafeNumber(subject.totalQuestions);
            item.correctAnswers += getSafeNumber(subject.correctAnswers);
            item.wrongAnswers += getSafeNumber(subject.wrongAnswers);
            item.skippedQuestions += getSafeNumber(subject.skippedQuestions);
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

export function getPerformanceTrend(attempts = []) {
    return [...attempts]
        .filter(item => item.submittedAt)
        .sort((a, b) => {
            return new Date(a.submittedAt) - new Date(b.submittedAt);
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

export function getWrongAnswerReview(attempt) {
    if (!attempt || !Array.isArray(attempt.questionReview)) {
        return [];
    }

    return attempt.questionReview.filter(
        question => question.isCorrect === false
    );
}

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
        note: "Analysis is based only on the test attempts provided."
    };
}

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
