// src/question-service.js

import {
    collection,
    doc,
    getDoc,
    getDocs,
    getCountFromServer,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    addDoc,
    serverTimestamp
} from "firebase/firestore";

import { db } from "./firebase.js";
import { COLLECTIONS } from "./firestore.js";

const QUESTIONS_COLLECTION = COLLECTIONS.QUESTIONS || "questions";

/*
|--------------------------------------------------------------------------
| Question Types
|--------------------------------------------------------------------------
*/

export const QUESTION_TYPES = {
    PYQ: "PYQ",
    AI_PRACTICE: "AI_PRACTICE"
};

export const QUESTION_STATUS = {
    PUBLISHED: "published",
    DRAFT: "draft",
    PENDING: "pending"
};

export const VERIFICATION_STATUS = {
    VERIFIED: "verified",
    PENDING: "pending",
    REJECTED: "rejected"
};

/*
|--------------------------------------------------------------------------
| Helper: Build Question Query
|--------------------------------------------------------------------------
*/

function buildQuestionQuery(filters = {}, options = {}) {
    const constraints = [];

    // केवल प्रकाशित प्रश्न
    constraints.push(
        where("status", "==", QUESTION_STATUS.PUBLISHED)
    );

    // PYQ और AI Practice को अलग रखना
    if (filters.type) {
        constraints.push(
            where("type", "==", filters.type)
        );
    }

    // वास्तविक सत्यापित PYQ
    if (filters.type === QUESTION_TYPES.PYQ) {
        constraints.push(
            where(
                "verificationStatus",
                "==",
                VERIFICATION_STATUS.VERIFIED
            )
        );
    }

    // AI Practice प्रश्न
    if (filters.type === QUESTION_TYPES.AI_PRACTICE) {
        constraints.push(
            where("type", "==", QUESTION_TYPES.AI_PRACTICE)
        );
    }

    // परीक्षा
    if (filters.examId) {
        constraints.push(
            where("examIds", "array-contains", filters.examId)
        );
    }

    // विषय
    if (filters.subjectId) {
        constraints.push(
            where("subjectId", "==", filters.subjectId)
        );
    }

    // Topic
    if (filters.topicId) {
        constraints.push(
            where("topicId", "==", filters.topicId)
        );
    }

    // Subtopic
    if (filters.subtopicId) {
        constraints.push(
            where("subtopicId", "==", filters.subtopicId)
        );
    }

    // वर्ष
    if (filters.year) {
        constraints.push(
            where("year", "==", Number(filters.year))
        );
    }

    // शिफ्ट
    if (filters.shift) {
        constraints.push(
            where("shift", "==", filters.shift)
        );
    }

    // कठिनाई स्तर
    if (filters.difficulty) {
        constraints.push(
            where("difficulty", "==", filters.difficulty)
        );
    }

    // भाषा
    if (filters.language) {
        constraints.push(
            where("availableLanguages", "array-contains", filters.language)
        );
    }

    // परीक्षा के अनुसार प्रश्न क्रम
    constraints.push(
        orderBy("createdAt", "desc")
    );

    // पिछला पेज
    if (options.lastDocument) {
        constraints.push(
            startAfter(options.lastDocument)
        );
    }

    // Limit
    constraints.push(
        limit(Math.min(Number(options.pageSize) || 30, 100))
    );

    return query(
        collection(db, QUESTIONS_COLLECTION),
        ...constraints
    );
}

/*
|--------------------------------------------------------------------------
| Get Questions
|--------------------------------------------------------------------------
*/

export async function getQuestions(filters = {}, options = {}) {
    try {
        const questionQuery = buildQuestionQuery(filters, options);

        const snapshot = await getDocs(questionQuery);

        const questions = snapshot.docs.map(document => ({
            id: document.id,
            ...document.data()
        }));

        return {
            success: true,
            questions,
            count: questions.length,
            lastDocument:
                snapshot.docs.length > 0
                    ? snapshot.docs[snapshot.docs.length - 1]
                    : null,
            hasMore: snapshot.docs.length ===
                Math.min(Number(options.pageSize) || 30, 100)
        };

    } catch (error) {
        console.error("Question Fetch Error:", error);

        return {
            success: false,
            questions: [],
            count: 0,
            lastDocument: null,
            hasMore: false,
            error: error.message
        };
    }
}

/*
|--------------------------------------------------------------------------
| Get Verified Previous Year Questions
|--------------------------------------------------------------------------
*/

export async function getVerifiedPYQQuestions(filters = {}, options = {}) {
    return getQuestions(
        {
            ...filters,
            type: QUESTION_TYPES.PYQ
        },
        options
    );
}

/*
|--------------------------------------------------------------------------
| Get AI Practice Questions
|--------------------------------------------------------------------------
*/

export async function getPracticeQuestions(filters = {}, options = {}) {
    return getQuestions(
        {
            ...filters,
            type: QUESTION_TYPES.AI_PRACTICE
        },
        options
    );
}

/*
|--------------------------------------------------------------------------
| Get Single Question
|--------------------------------------------------------------------------
*/

export async function getQuestionById(questionId) {
    try {
        if (!questionId) {
            throw new Error("Question ID आवश्यक है।");
        }

        const reference = doc(
            db,
            QUESTIONS_COLLECTION,
            questionId
        );

        const snapshot = await getDoc(reference);

        if (!snapshot.exists()) {
            return {
                success: false,
                question: null,
                error: "प्रश्न उपलब्ध नहीं है।"
            };
        }

        return {
            success: true,
            question: {
                id: snapshot.id,
                ...snapshot.data()
            }
        };

    } catch (error) {
        return {
            success: false,
            question: null,
            error: error.message
        };
    }
}

/*
|--------------------------------------------------------------------------
| Get Question Counts
|--------------------------------------------------------------------------
*/

export async function getQuestionCounts(filters = {}) {
    try {
        const baseFilters = {
            ...filters
        };

        delete baseFilters.type;

        const [pyqSnapshot, practiceSnapshot] = await Promise.all([
            getCountFromServer(
                buildQuestionQuery(
                    {
                        ...baseFilters,
                        type: QUESTION_TYPES.PYQ
                    },
                    { pageSize: 100 }
                )
            ),

            getCountFromServer(
                buildQuestionQuery(
                    {
                        ...baseFilters,
                        type: QUESTION_TYPES.AI_PRACTICE
                    },
                    { pageSize: 100 }
                )
            )
        ]);

        return {
            success: true,
            verifiedPYQ: pyqSnapshot.data().count,
            aiPractice: practiceSnapshot.data().count,
            total:
                pyqSnapshot.data().count +
                practiceSnapshot.data().count
        };

    } catch (error) {
        console.error("Question Count Error:", error);

        return {
            success: false,
            verifiedPYQ: 0,
            aiPractice: 0,
            total: 0,
            error: error.message
        };
    }
}

/*
|--------------------------------------------------------------------------
| Get Available PYQ Years
|--------------------------------------------------------------------------
*/

export async function getAvailablePYQYears(filters = {}) {
    const result = await getVerifiedPYQQuestions(
        filters,
        { pageSize: 100 }
    );

    if (!result.success) {
        return [];
    }

    return [
        ...new Set(
            result.questions
                .map(question => question.year)
                .filter(Boolean)
        )
    ].sort((a, b) => b - a);
}

/*
|--------------------------------------------------------------------------
| Randomize Questions
|--------------------------------------------------------------------------
*/

export function shuffleQuestions(questions = []) {
    const shuffled = [...questions];

    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));

        [shuffled[i], shuffled[j]] = [
            shuffled[j],
            shuffled[i]
        ];
    }

    return shuffled;
}

/*
|--------------------------------------------------------------------------
| Report Question
|--------------------------------------------------------------------------
*/

export async function reportQuestion({
    questionId,
    userId,
    reason,
    details = ""
}) {
    try {
        if (!questionId || !userId || !reason) {
            throw new Error(
                "Question ID, User ID और Report Reason आवश्यक हैं।"
            );
        }

        await addDoc(
            collection(db, "reports"),
            {
                questionId,
                userId,
                reason,
                details,
                status: "pending",
                createdAt: serverTimestamp()
            }
        );

        return {
            success: true,
            message: "आपकी रिपोर्ट दर्ज कर दी गई है।"
        };

    } catch (error) {
        console.error("Question Report Error:", error);

        return {
            success: false,
            message: error.message
        };
    }
}

/*
|--------------------------------------------------------------------------
| Question Language Helper
|--------------------------------------------------------------------------
*/

export function getQuestionLanguage(question, language = "hi") {
    if (!question) return null;

    const selectedLanguage =
        language === "en" ? "en" : "hi";

    return {
        question:
            question.question?.[selectedLanguage] || "",

        options:
            question.options?.[selectedLanguage] || [],

        explanation:
            question.explanation?.[selectedLanguage] || "",

        subject:
            question.subjectName?.[selectedLanguage] || "",

        topic:
            question.topicName?.[selectedLanguage] || ""
    };
}

/*
|--------------------------------------------------------------------------
| PYQ Source Information
|--------------------------------------------------------------------------
*/

export function getPYQSourceInfo(question) {
    if (
        !question ||
        question.type !== QUESTION_TYPES.PYQ
    ) {
        return null;
    }

    return {
        examName: question.examName || null,
        year: question.year || null,
        examDate: question.examDate || null,
        shift: question.shift || null,
        paperName: question.paperName || null,
        source: question.source || null,
        verificationStatus:
            question.verificationStatus || "pending"
    };
}
