// src/leaderboard.js

import {
    collection,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    getDoc,
    doc,
    startAfter
} from "firebase/firestore";

import { db } from "./firebase.js";

/*
|--------------------------------------------------------------------------
| Collection
|--------------------------------------------------------------------------
*/

const LEADERBOARD_COLLECTION = "leaderboard";

/*
|--------------------------------------------------------------------------
| Leaderboard Types
|--------------------------------------------------------------------------
*/

export const LEADERBOARD_TYPES = {
    GLOBAL: "global",
    RAJASTHAN: "rajasthan",
    DISTRICT: "district",
    EXAM: "exam"
};

/*
|--------------------------------------------------------------------------
| Leaderboard Periods
|--------------------------------------------------------------------------
*/

export const LEADERBOARD_PERIODS = {
    DAILY: "daily",
    WEEKLY: "weekly",
    MONTHLY: "monthly",
    ALL_TIME: "all_time"
};

/*
|--------------------------------------------------------------------------
| Date Helpers
|--------------------------------------------------------------------------
*/

function getDateKey(date = new Date()) {
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0")
    ].join("-");
}

function getWeekKey(date = new Date()) {
    const current = new Date(date);

    current.setHours(0, 0, 0, 0);

    const day = current.getDay() || 7;

    current.setDate(current.getDate() + 4 - day);

    const yearStart = new Date(current.getFullYear(), 0, 1);

    const week = Math.ceil(
        (((current - yearStart) / 86400000) + 1) / 7
    );

    return `${current.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function getMonthKey(date = new Date()) {
    return `${date.getFullYear()}-${String(
        date.getMonth() + 1
    ).padStart(2, "0")}`;
}

/*
|--------------------------------------------------------------------------
| Get Period Key
|--------------------------------------------------------------------------
*/

export function getLeaderboardPeriodKey(
    period = LEADERBOARD_PERIODS.DAILY,
    date = new Date()
) {
    switch (period) {
        case LEADERBOARD_PERIODS.DAILY:
            return getDateKey(date);

        case LEADERBOARD_PERIODS.WEEKLY:
            return getWeekKey(date);

        case LEADERBOARD_PERIODS.MONTHLY:
            return getMonthKey(date);

        case LEADERBOARD_PERIODS.ALL_TIME:
            return "all_time";

        default:
            throw new Error("अमान्य Leaderboard Period।");
    }
}

/*
|--------------------------------------------------------------------------
| Validate Filters
|--------------------------------------------------------------------------
*/

function validateLeaderboardFilters({
    type = LEADERBOARD_TYPES.GLOBAL,
    period = LEADERBOARD_PERIODS.DAILY,
    district = null,
    examId = null
} = {}) {
    const validTypes = Object.values(LEADERBOARD_TYPES);

    const validPeriods = Object.values(LEADERBOARD_PERIODS);

    if (!validTypes.includes(type)) {
        throw new Error("अमान्य Leaderboard Type।");
    }

    if (!validPeriods.includes(period)) {
        throw new Error("अमान्य Leaderboard Period।");
    }

    if (
        type === LEADERBOARD_TYPES.DISTRICT &&
        !district
    ) {
        throw new Error("District चुनना आवश्यक है।");
    }

    if (
        type === LEADERBOARD_TYPES.EXAM &&
        !examId
    ) {
        throw new Error("Exam चुनना आवश्यक है।");
    }

    return true;
}

/*
|--------------------------------------------------------------------------
| Build Leaderboard Query
|--------------------------------------------------------------------------
*/

function buildLeaderboardQuery(filters = {}, options = {}) {
    const {
        type = LEADERBOARD_TYPES.GLOBAL,
        period = LEADERBOARD_PERIODS.DAILY,
        district = null,
        examId = null
    } = filters;

    validateLeaderboardFilters(filters);

    const periodKey = getLeaderboardPeriodKey(period);

    const constraints = [
        where("period", "==", period),
        where("periodKey", "==", periodKey),
        where("scope", "==", type)
    ];

    if (type === LEADERBOARD_TYPES.DISTRICT) {
        constraints.push(
            where("district", "==", district)
        );
    }

    if (type === LEADERBOARD_TYPES.EXAM) {
        constraints.push(
            where("examId", "==", examId)
        );
    }

    if (type === LEADERBOARD_TYPES.RAJASTHAN) {
        constraints.push(
            where("stateCode", "==", "RJ")
        );
    }

    constraints.push(
        orderBy("score", "desc"),
        orderBy("accuracy", "desc"),
        orderBy("updatedAt", "asc")
    );

    if (options.lastDocument) {
        constraints.push(
            startAfter(options.lastDocument)
        );
    }

    constraints.push(
        limit(Math.min(Number(options.pageSize) || 20, 100))
    );

    return query(
        collection(db, LEADERBOARD_COLLECTION),
        ...constraints
    );
}

/*
|--------------------------------------------------------------------------
| Format Leaderboard Entry
|--------------------------------------------------------------------------
*/

function formatLeaderboardEntry(document, index = 0) {
    const data = document.data();

    return {
        id: document.id,

        userId: data.userId || null,

        displayName: data.displayName || "विद्यार्थी",

        photoURL: data.photoURL || null,

        district: data.district || null,

        state: data.state || "Rajasthan",

        examId: data.examId || null,

        score: Number(data.score) || 0,

        accuracy: Number(data.accuracy) || 0,

        totalTests: Number(data.totalTests) || 0,

        rank: Number(data.rank) || index + 1,

        period: data.period || null,

        periodKey: data.periodKey || null
    };
}

/*
|--------------------------------------------------------------------------
| Get Leaderboard
|--------------------------------------------------------------------------
*/

export async function getLeaderboard(
    filters = {},
    options = {}
) {
    try {
        const leaderboardQuery = buildLeaderboardQuery(
            filters,
            options
        );

        const snapshot = await getDocs(leaderboardQuery);

        const entries = snapshot.docs.map(
            (document, index) =>
                formatLeaderboardEntry(document, index)
        );

        return {
            success: true,

            entries,

            count: entries.length,

            lastDocument:
                snapshot.docs.length > 0
                    ? snapshot.docs[snapshot.docs.length - 1]
                    : null,

            hasMore:
                entries.length ===
                Math.min(Number(options.pageSize) || 20, 100)
        };

    } catch (error) {
        console.error("Leaderboard Error:", error);

        return {
            success: false,

            entries: [],

            count: 0,

            lastDocument: null,

            hasMore: false,

            error: error.message
        };
    }
}

/*
|--------------------------------------------------------------------------
| Global Leaderboard
|--------------------------------------------------------------------------
*/

export async function getGlobalLeaderboard(
    period = LEADERBOARD_PERIODS.DAILY,
    options = {}
) {
    return getLeaderboard(
        {
            type: LEADERBOARD_TYPES.GLOBAL,
            period
        },
        options
    );
}

/*
|--------------------------------------------------------------------------
| Rajasthan Leaderboard
|--------------------------------------------------------------------------
*/

export async function getRajasthanLeaderboard(
    period = LEADERBOARD_PERIODS.DAILY,
    options = {}
) {
    return getLeaderboard(
        {
            type: LEADERBOARD_TYPES.RAJASTHAN,
            period
        },
        options
    );
}

/*
|--------------------------------------------------------------------------
| District Leaderboard
|--------------------------------------------------------------------------
*/

export async function getDistrictLeaderboard(
    district,
    period = LEADERBOARD_PERIODS.DAILY,
    options = {}
) {
    return getLeaderboard(
        {
            type: LEADERBOARD_TYPES.DISTRICT,
            district,
            period
        },
        options
    );
}

/*
|--------------------------------------------------------------------------
| Exam Leaderboard
|--------------------------------------------------------------------------
*/

export async function getExamLeaderboard(
    examId,
    period = LEADERBOARD_PERIODS.ALL_TIME,
    options = {}
) {
    return getLeaderboard(
        {
            type: LEADERBOARD_TYPES.EXAM,
            examId,
            period
        },
        options
    );
}

/*
|--------------------------------------------------------------------------
| Get User Rank
|--------------------------------------------------------------------------
*/

export async function getUserLeaderboardEntry({
    userId,
    type = LEADERBOARD_TYPES.GLOBAL,
    period = LEADERBOARD_PERIODS.DAILY,
    district = null,
    examId = null
} = {}) {
    try {
        if (!userId) {
            throw new Error("User ID आवश्यक है।");
        }

        const periodKey = getLeaderboardPeriodKey(period);

        const entryId = [
            type,
            periodKey,
            userId
        ].join("_");

        const reference = doc(
            db,
            LEADERBOARD_COLLECTION,
            entryId
        );

        const snapshot = await getDoc(reference);

        if (!snapshot.exists()) {
            return {
                success: true,
                found: false,
                entry: null,
                message: "अभी आपकी रैंक उपलब्ध नहीं है।"
            };
        }

        const data = snapshot.data();

        if (
            data.scope !== type ||
            data.period !== period ||
            data.periodKey !== periodKey ||
            (type === LEADERBOARD_TYPES.DISTRICT &&
                data.district !== district) ||
            (type === LEADERBOARD_TYPES.EXAM &&
                data.examId !== examId)
        ) {
            return {
                success: true,
                found: false,
                entry: null
            };
        }

        return {
            success: true,
            found: true,
            entry: {
                id: snapshot.id,
                ...data
            }
        };

    } catch (error) {
        console.error("User Rank Error:", error);

        return {
            success: false,
            found: false,
            entry: null,
            error: error.message
        };
    }
}

/*
|--------------------------------------------------------------------------
| Get Current User Rank Summary
|--------------------------------------------------------------------------
*/

export async function getUserRankSummary(userId) {
    if (!userId) {
        return {
            success: false,
            message: "User ID आवश्यक है।"
        };
    }

    try {
        const periods = [
            LEADERBOARD_PERIODS.DAILY,
            LEADERBOARD_PERIODS.WEEKLY,
            LEADERBOARD_PERIODS.MONTHLY,
            LEADERBOARD_PERIODS.ALL_TIME
        ];

        const results = await Promise.all(
            periods.map(async period => {
                const result = await getUserLeaderboardEntry({
                    userId,
                    type: LEADERBOARD_TYPES.GLOBAL,
                    period
                });

                return {
                    period,
                    rank: result.entry?.rank ?? null,
                    score: result.entry?.score ?? 0,
                    found: result.found
                };
            })
        );

        return {
            success: true,
            ranks: results
        };

    } catch (error) {
        return {
            success: false,
            ranks: [],
            error: error.message
        };
    }
}

/*
|--------------------------------------------------------------------------
| Leaderboard Display Helpers
|--------------------------------------------------------------------------
*/

export function getRankBadge(rank) {
    const position = Number(rank);

    if (position === 1) {
        return {
            label: "Gold",
            emoji: "🥇"
        };
    }

    if (position === 2) {
        return {
            label: "Silver",
            emoji: "🥈"
        };
    }

    if (position === 3) {
        return {
            label: "Bronze",
            emoji: "🥉"
        };
    }

    if (position > 0 && position <= 10) {
        return {
            label: "Top 10",
            emoji: "🏅"
        };
    }

    return {
        label: "Participant",
        emoji: "📘"
    };
}

/*
|--------------------------------------------------------------------------
| Leaderboard Statistics
|--------------------------------------------------------------------------
*/

export function getLeaderboardStatistics(entries = []) {
    if (!Array.isArray(entries) || entries.length === 0) {
        return {
            participants: 0,
            averageScore: 0,
            highestScore: 0,
            averageAccuracy: 0
        };
    }

    const totalScore = entries.reduce(
        (sum, entry) => sum + Number(entry.score || 0),
        0
    );

    const totalAccuracy = entries.reduce(
        (sum, entry) => sum + Number(entry.accuracy || 0),
        0
    );

    return {
        participants: entries.length,

        averageScore: Math.round(
            totalScore / entries.length
        ),

        highestScore: Math.max(
            ...entries.map(entry => Number(entry.score || 0))
        ),

        averageAccuracy: Math.round(
            totalAccuracy / entries.length
        )
    };
}

/*
|--------------------------------------------------------------------------
| Period Labels
|--------------------------------------------------------------------------
*/

export function getLeaderboardPeriodLabel(
    period,
    language = "hi"
) {
    const labels = {
        daily: {
            hi: "आज",
            en: "Daily"
        },

        weekly: {
            hi: "इस सप्ताह",
            en: "Weekly"
        },

        monthly: {
            hi: "इस महीने",
            en: "Monthly"
        },

        all_time: {
            hi: "सभी समय",
            en: "All Time"
        }
    };

    return labels[period]?.[language] || period;
}

/*
|--------------------------------------------------------------------------
| Leaderboard Scope Labels
|--------------------------------------------------------------------------
*/

export function getLeaderboardScopeLabel(
    type,
    language = "hi"
) {
    const labels = {
        global: {
            hi: "ग्लोबल रैंकिंग",
            en: "Global Ranking"
        },

        rajasthan: {
            hi: "राजस्थान रैंकिंग",
            en: "Rajasthan Ranking"
        },

        district: {
            hi: "जिला रैंकिंग",
            en: "District Ranking"
        },

        exam: {
            hi: "परीक्षा रैंकिंग",
            en: "Exam Ranking"
        }
    };

    return labels[type]?.[language] || type;
}
