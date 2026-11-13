// src/analytics.js

import { getTestHistory, generateStudentAnalysis } from "./test-history.js";

const PAGE_SIZE = 100;

/* =========================================
   HELPERS
========================================= */

function safeNumber(value, fallback = 0) {
    const number = Number(value);

    return Number.isFinite(number) ? number : fallback;
}

function getDateKey(date) {
    const d = new Date(date);

    if (Number.isNaN(d.getTime())) return null;

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getMonthKey(date) {
    const d = new Date(date);

    if (Number.isNaN(d.getTime())) return null;

    return `${d.getFullYear()}-${String(
        d.getMonth() + 1
    ).padStart(2, "0")}`;
}

/* =========================================
   LOAD COMPLETE AVAILABLE HISTORY
========================================= */

/**
 * Loads all available test attempts page by page.
 * The number of reads depends on the user's history.
 */

export async function loadCompleteTestHistory(userId) {
    let allAttempts = [];
    let cursor = null;
    let hasMore = true;

    while (hasMore) {
        const result = await getTestHistory(userId, {
            pageSize: PAGE_SIZE,
            cursor
        });

        if (!result.success) {
            throw new Error(
                result.error || "Unable to load test history."
            );
        }

        allAttempts = allAttempts.concat(result.attempts);

        cursor = result.lastDocument;
        hasMore = result.hasMore && Boolean(cursor);
    }

    return allAttempts;
}

/* =========================================
   DASHBOARD ANALYTICS
========================================= */

export function getDashboardAnalytics(attempts = []) {
    const analysis = generateStudentAnalysis(attempts);

    const totalQuestions = attempts.reduce(
        (sum, item) => sum + safeNumber(item.totalQuestions),
        0
    );

    const totalAttempted = attempts.reduce(
        (sum, item) => sum + safeNumber(item.attemptedQuestions),
        0
    );

    const totalCorrect = attempts.reduce(
        (sum, item) => sum + safeNumber(item.correctAnswers),
        0
    );

    const totalWrong = attempts.reduce(
        (sum, item) => sum + safeNumber(item.wrongAnswers),
        0
    );

    const totalSkipped = attempts.reduce(
        (sum, item) => sum + safeNumber(item.skippedQuestions),
        0
    );

    const overallAccuracy = totalAttempted > 0
        ? (totalCorrect / totalAttempted) * 100
        : 0;

    return {
        ...analysis,

        questionStats: {
            totalQuestions,
            totalAttempted,
            totalCorrect,
            totalWrong,
            totalSkipped
        },

        overallAccuracy: Number(overallAccuracy.toFixed(2))
    };
}

/* =========================================
   EXAM-WISE ANALYSIS
========================================= */

export function getExamWiseAnalytics(attempts = []) {
    const exams = {};

    attempts.forEach(attempt => {
        const examId = attempt.examId;

        if (!examId) return;

        if (!exams[examId]) {
            exams[examId] = {
                examId,
                examName: attempt.examName || examId,
                totalTests: 0,
                totalScore: 0,
                totalPercentage: 0,
                bestScore: 0,
                latestDate: null
            };
        }

        const item = exams[examId];

        item.totalTests += 1;

        item.totalScore += safeNumber(attempt.score);

        item.totalPercentage += safeNumber(
            attempt.percentage
        );

        item.bestScore = Math.max(
            item.bestScore,
            safeNumber(attempt.score)
        );

        const submittedAt = attempt.submittedAt
            ? new Date(attempt.submittedAt)
            : null;

        if (
            submittedAt &&
            !Number.isNaN(submittedAt.getTime()) &&
            (!item.latestDate || submittedAt > item.latestDate)
        ) {
            item.latestDate = submittedAt;
        }
    });

    return Object.values(exams).map(item => ({
        ...item,

        averageScore: Number(
            (item.totalScore / item.totalTests).toFixed(2)
        ),

        averagePercentage: Number(
            (item.totalPercentage / item.totalTests).toFixed(2)
        )
    })).sort(
        (a, b) => b.averagePercentage - a.averagePercentage
    );
}

/* =========================================
   TOPIC-WISE ANALYSIS
========================================= */

/**
 * Expected optional attempt field:
 *
 * topicScores: [
 *   {
 *     topicId: "history-topic-01",
 *     topicName: { hi: "इतिहास", en: "History" },
 *     totalQuestions: 10,
 *     correctAnswers: 7,
 *     wrongAnswers: 3
 *   }
 * ]
 */

export function getTopicWiseAnalytics(attempts = []) {
    const topics = {};

    attempts.forEach(attempt => {
        const topicScores = attempt.topicScores || [];

        topicScores.forEach(topic => {
            if (!topic.topicId) return;

            if (!topics[topic.topicId]) {
                topics[topic.topicId] = {
                    topicId: topic.topicId,
                    topicName: topic.topicName || topic.topicId,
                    tests: 0,
                    totalQuestions: 0,
                    correctAnswers: 0,
                    wrongAnswers: 0
                };
            }

            const item = topics[topic.topicId];

            item.tests += 1;

            item.totalQuestions += safeNumber(
                topic.totalQuestions
            );

            item.correctAnswers += safeNumber(
                topic.correctAnswers
            );

            item.wrongAnswers += safeNumber(
                topic.wrongAnswers
            );
        });
    });

    return Object.values(topics).map(topic => {
        const attempted =
            topic.correctAnswers + topic.wrongAnswers;

        const accuracy = attempted > 0
            ? (topic.correctAnswers / attempted) * 100
            : 0;

        return {
            ...topic,
            attemptedQuestions: attempted,
            accuracy: Number(accuracy.toFixed(2)),
            status: accuracy >= 80
                ? "strong"
                : accuracy < 50
                    ? "weak"
                    : "average"
        };
    }).sort((a, b) => a.accuracy - b.accuracy);
}

/* =========================================
   MONTHLY PROGRESS
========================================= */

export function getMonthlyProgress(attempts = []) {
    const months = {};

    attempts.forEach(attempt => {
        if (!attempt.submittedAt) return;

        const monthKey = getMonthKey(attempt.submittedAt);

        if (!monthKey) return;

        if (!months[monthKey]) {
            months[monthKey] = {
                month: monthKey,
                tests: 0,
                totalScore: 0,
                totalPercentage: 0
            };
        }

        months[monthKey].tests += 1;

        months[monthKey].totalScore += safeNumber(
            attempt.score
        );

        months[monthKey].totalPercentage += safeNumber(
            attempt.percentage
        );
    });

    return Object.values(months)
        .map(month => ({
            ...month,

            averageScore: Number(
                (month.totalScore / month.tests).toFixed(2)
            ),

            averagePercentage: Number(
                (month.totalPercentage / month.tests).toFixed(2)
            )
        }))
        .sort((a, b) => a.month.localeCompare(b.month));
}

/* =========================================
   DAILY STUDY ACTIVITY
========================================= */

export function getDailyActivity(attempts = []) {
    const activity = {};

    attempts.forEach(attempt => {
        if (!attempt.submittedAt) return;

        const dateKey = getDateKey(attempt.submittedAt);

        if (!dateKey) return;

        if (!activity[dateKey]) {
            activity[dateKey] = {
                date: dateKey,
                tests: 0,
                questions: 0,
                correctAnswers: 0
            };
        }

        activity[dateKey].tests += 1;

        activity[dateKey].questions += safeNumber(
            attempt.totalQuestions
        );

        activity[dateKey].correctAnswers += safeNumber(
            attempt.correctAnswers
        );
    });

    return Object.values(activity).sort(
        (a, b) => a.date.localeCompare(b.date)
    );
}

/* =========================================
   STUDY STREAK
========================================= */

/**
 * Calculates consecutive days on which a test was submitted.
 * This is a test-activity streak, not a complete study streak.
 */

export function getTestActivityStreak(attempts = []) {
    const activeDates = new Set(
        attempts
            .filter(item => item.submittedAt)
            .map(item => getDateKey(item.submittedAt))
            .filter(Boolean)
    );

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const todayKey = getDateKey(today);
    const yesterday = new Date(today);

    yesterday.setDate(yesterday.getDate() - 1);

    const yesterdayKey = getDateKey(yesterday);

    let currentStreak = 0;

    const startDate = activeDates.has(todayKey)
        ? today
        : activeDates.has(yesterdayKey)
            ? yesterday
            : null;

    if (startDate) {
        const currentDate = new Date(startDate);

        while (activeDates.has(getDateKey(currentDate))) {
            currentStreak += 1;
            currentDate.setDate(currentDate.getDate() - 1);
        }
    }

    return {
        currentStreak,
        activeDays: activeDates.size,
        lastActiveDate: [...activeDates].sort().pop() || null
    };
}

/* =========================================
   STUDY RECOMMENDATIONS
========================================= */

export function getStudyRecommendations(
    subjectAnalysis = [],
    topicAnalysis = []
) {
    const recommendations = [];

    const weakSubjects = subjectAnalysis
        .filter(item => item.accuracy < 50)
        .sort((a, b) => a.accuracy - b.accuracy);

    const weakTopics = topicAnalysis
        .filter(item => item.accuracy < 50)
        .sort((a, b) => a.accuracy - b.accuracy);

    weakSubjects.slice(0, 5).forEach(subject => {
        recommendations.push({
            type: "subject",
            id: subject.subjectId,
            name: subject.subjectName,
            accuracy: subject.accuracy,
            priority: "high",
            message: "इस विषय का दोबारा अभ्यास करें।"
        });
    });

    weakTopics.slice(0, 10).forEach(topic => {
        recommendations.push({
            type: "topic",
            id: topic.topicId,
            name: topic.topicName,
            accuracy: topic.accuracy,
            priority: "high",
            message: "इस टॉपिक के गलत सवाल दोबारा हल करें।"
        });
    });

    return recommendations;
}

/* =========================================
   COMPLETE ANALYTICS REPORT
========================================= */

export function generateCompleteAnalytics(attempts = []) {
    const dashboard = getDashboardAnalytics(attempts);

    const examWise = getExamWiseAnalytics(attempts);

    const topicWise = getTopicWiseAnalytics(attempts);

    const monthlyProgress = getMonthlyProgress(attempts);

    const dailyActivity = getDailyActivity(attempts);

    const streak = getTestActivityStreak(attempts);

    const recommendations = getStudyRecommendations(
        dashboard.subjectAnalysis,
        topicWise
    );

    return {
        dashboard,
        examWise,
        topicWise,
        monthlyProgress,
        dailyActivity,
        streak,
        recommendations,

        generatedAt: new Date(),

        dataAvailable: attempts.length > 0
    };
}

/* =========================================
   LOAD STUDENT ANALYTICS FROM FIRESTORE
========================================= */

/**
 * Loads the current user's available test history
 * and generates an analytics report.
 */

export async function loadStudentAnalytics(userId) {
    if (!userId || typeof userId !== "string") {
        throw new Error("Valid user ID is required.");
    }

    const attempts = await loadCompleteTestHistory(userId);

    return {
        success: true,
        totalAttempts: attempts.length,
        report: generateCompleteAnalytics(attempts)
    };
}

/* =========================================
   EXPORT ANALYTICS
========================================= */

export function exportAnalyticsSummary(report) {
    if (!report) {
        throw new Error("Analytics report is required.");
    }

    return {
        generatedAt: report.generatedAt,

        totalTests: report.dashboard.summary.totalTests,

        averageScore: report.dashboard.summary.averageScore,

        averageAccuracy: report.dashboard.overallAccuracy,

        bestScore: report.dashboard.summary.bestScore,

        weakSubjects: report.dashboard.weakSubjects,

        strongSubjects: report.dashboard.strongSubjects,

        examWise: report.examWise,

        topicWise: report.topicWise,

        monthlyProgress: report.monthlyProgress,

        streak: report.streak,

        recommendations: report.recommendations
    };
}
