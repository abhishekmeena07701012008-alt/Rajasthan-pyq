// src/practice.js

import {
    getVerifiedPYQQuestions,
    getPracticeQuestions,
    shuffleQuestions,
    getQuestionLanguage,
    QUESTION_TYPES
} from "./question-service.js";

/*
|--------------------------------------------------------------------------
| Practice State
|--------------------------------------------------------------------------
*/

const practiceState = {
    questions: [],
    currentIndex: 0,
    answers: {},
    markedQuestions: [],
    submitted: false,
    startedAt: null,
    completedAt: null,
    language: "hi",

    settings: {
        negativeMarking: false,
        negativeMarks: 0,
        marksPerQuestion: 1,
        shuffleQuestions: true,
        shuffleOptions: true,
        showExplanation: true
    }
};

/*
|--------------------------------------------------------------------------
| Shuffle Array
|--------------------------------------------------------------------------
*/

function shuffleArray(array = []) {
    const result = [...array];

    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));

        [result[i], result[j]] = [
            result[j],
            result[i]
        ];
    }

    return result;
}

/*
|--------------------------------------------------------------------------
| Shuffle Question Options
|--------------------------------------------------------------------------
| Hindi and English options use the SAME shuffled order.
| Correct answer index is updated automatically.
|--------------------------------------------------------------------------
*/

function shuffleQuestionOptions(question) {
    if (!question || !question.options) {
        return question;
    }

    const hindiOptions = question.options.hi || [];
    const englishOptions = question.options.en || [];

    const optionCount = Math.max(
        hindiOptions.length,
        englishOptions.length
    );

    if (optionCount < 2) {
        return question;
    }

    const optionIndexes = Array.from(
        { length: optionCount },
        (_, index) => index
    );

    const shuffledIndexes = shuffleArray(optionIndexes);

    const shuffledHindi = shuffledIndexes.map(
        index => hindiOptions[index] ?? ""
    );

    const shuffledEnglish = shuffledIndexes.map(
        index => englishOptions[index] ?? ""
    );

    const originalCorrectAnswer = Number(
        question.correctAnswer
    );

    const newCorrectAnswer = shuffledIndexes.indexOf(
        originalCorrectAnswer
    );

    return {
        ...question,

        options: {
            ...question.options,
            hi: shuffledHindi,
            en: shuffledEnglish
        },

        correctAnswer: newCorrectAnswer
    };
}

/*
|--------------------------------------------------------------------------
| Prepare Questions
|--------------------------------------------------------------------------
*/

function prepareQuestions(questions, settings) {
    let prepared = [...questions];

    // Shuffle question order
    if (settings.shuffleQuestions) {
        prepared = shuffleQuestions(prepared);
    }

    // Shuffle options independently for each question
    if (settings.shuffleOptions) {
        prepared = prepared.map(question =>
            shuffleQuestionOptions(question)
        );
    }

    return prepared;
}

/*
|--------------------------------------------------------------------------
| Start Practice
|--------------------------------------------------------------------------
*/

export async function startPractice({
    examId = null,
    subjectId = null,
    topicId = null,
    subtopicId = null,
    year = null,
    shift = null,
    difficulty = null,

    type = QUESTION_TYPES.PYQ,
    language = "hi",

    questionLimit = 20,

    shuffle = true,
    shuffleOptions = true,

    negativeMarking = false,
    negativeMarks = 0,
    marksPerQuestion = 1,

    showExplanation = true
} = {}) {

    try {
        resetPractice();

        practiceState.language =
            language === "en" ? "en" : "hi";

        practiceState.settings = {
            negativeMarking,
            negativeMarks,
            marksPerQuestion,
            shuffleQuestions: shuffle,
            shuffleOptions,
            showExplanation
        };

        const safeLimit = Math.max(
            1,
            Math.min(Number(questionLimit) || 20, 100)
        );

        const filters = {
            examId,
            subjectId,
            topicId,
            subtopicId,
            year,
            shift,
            difficulty,
            type,
            language: practiceState.language
        };

        let result;

        if (type === QUESTION_TYPES.PYQ) {
            result = await getVerifiedPYQQuestions(
                filters,
                { pageSize: safeLimit }
            );
        } else if (type === QUESTION_TYPES.AI_PRACTICE) {
            result = await getPracticeQuestions(
                filters,
                { pageSize: safeLimit }
            );
        } else {
            return {
                success: false,
                message: "अमान्य प्रश्न प्रकार चुना गया है।"
            };
        }

        if (!result.success) {
            return {
                success: false,
                message: result.error ||
                    "प्रश्न लोड नहीं हो सके।"
            };
        }

        if (!result.questions.length) {
            return {
                success: false,
                message:
                    "इस चयन के लिए अभी कोई प्रकाशित प्रश्न उपलब्ध नहीं है।"
            };
        }

        practiceState.questions = prepareQuestions(
            result.questions.slice(0, safeLimit),
            practiceState.settings
        );

        practiceState.startedAt = Date.now();

        return {
            success: true,
            totalQuestions: practiceState.questions.length,
            currentQuestion: getCurrentQuestion(),
            progress: getPracticeProgress(),
            message: "अभ्यास शुरू हो गया है।"
        };

    } catch (error) {
        console.error("Start Practice Error:", error);

        return {
            success: false,
            message: error.message
        };
    }
}

/*
|--------------------------------------------------------------------------
| Get Current Question
|--------------------------------------------------------------------------
*/

export function getCurrentQuestion() {
    const question =
        practiceState.questions[practiceState.currentIndex];

    if (!question) return null;

    const translated = getQuestionLanguage(
        question,
        practiceState.language
    );

    return {
        id: question.id,

        number: practiceState.currentIndex + 1,

        total: practiceState.questions.length,

        question: translated.question,

        options: translated.options,

        subject: translated.subject,

        topic: translated.topic,

        difficulty: question.difficulty || "medium",

        selectedAnswer:
            practiceState.answers[question.id] ?? null,

        marked:
            practiceState.markedQuestions.includes(question.id),

        type: question.type,

        source:
            question.type === QUESTION_TYPES.PYQ
                ? {
                    examName: question.examName || null,
                    year: question.year || null,
                    examDate: question.examDate || null,
                    shift: question.shift || null,
                    paperName: question.paperName || null,
                    source: question.source || null
                }
                : null
    };
}

/*
|--------------------------------------------------------------------------
| Select Answer
|--------------------------------------------------------------------------
*/

export function selectAnswer(optionIndex) {
    if (practiceState.submitted) {
        return {
            success: false,
            message: "अभ्यास पूरा हो चुका है।"
        };
    }

    const question = getCurrentQuestion();

    if (!question) {
        return {
            success: false,
            message: "कोई प्रश्न उपलब्ध नहीं है।"
        };
    }

    if (
        !Number.isInteger(optionIndex) ||
        optionIndex < 0 ||
        optionIndex >= question.options.length
    ) {
        return {
            success: false,
            message: "कृपया सही विकल्प चुनें।"
        };
    }

    practiceState.answers[question.id] = optionIndex;

    return {
        success: true,
        selectedAnswer: optionIndex,
        question: getCurrentQuestion()
    };
}

/*
|--------------------------------------------------------------------------
| Clear Selected Answer
|--------------------------------------------------------------------------
*/

export function clearAnswer() {
    if (practiceState.submitted) {
        return {
            success: false,
            message: "अभ्यास जमा हो चुका है।"
        };
    }

    const question = getCurrentQuestion();

    if (!question) {
        return {
            success: false,
            message: "प्रश्न उपलब्ध नहीं है।"
        };
    }

    delete practiceState.answers[question.id];

    return {
        success: true,
        question: getCurrentQuestion()
    };
}

/*
|--------------------------------------------------------------------------
| Next Question
|--------------------------------------------------------------------------
*/

export function nextQuestion() {
    if (
        practiceState.currentIndex <
        practiceState.questions.length - 1
    ) {
        practiceState.currentIndex++;

        return {
            success: true,
            question: getCurrentQuestion(),
            progress: getPracticeProgress()
        };
    }

    return {
        success: false,
        message: "यह अंतिम प्रश्न है।"
    };
}

/*
|--------------------------------------------------------------------------
| Previous Question
|--------------------------------------------------------------------------
*/

export function previousQuestion() {
    if (practiceState.currentIndex > 0) {
        practiceState.currentIndex--;

        return {
            success: true,
            question: getCurrentQuestion(),
            progress: getPracticeProgress()
        };
    }

    return {
        success: false,
        message: "यह पहला प्रश्न है।"
    };
}

/*
|--------------------------------------------------------------------------
| Jump To Question
|--------------------------------------------------------------------------
*/

export function goToQuestion(questionNumber) {
    const index = Number(questionNumber) - 1;

    if (
        !Number.isInteger(index) ||
        index < 0 ||
        index >= practiceState.questions.length
    ) {
        return {
            success: false,
            message: "अमान्य प्रश्न संख्या।"
        };
    }

    practiceState.currentIndex = index;

    return {
        success: true,
        question: getCurrentQuestion()
    };
}

/*
|--------------------------------------------------------------------------
| Mark / Unmark Question
|--------------------------------------------------------------------------
*/

export function toggleMarkQuestion() {
    if (practiceState.submitted) {
        return {
            success: false,
            message: "अभ्यास जमा हो चुका है।"
        };
    }

    const question = getCurrentQuestion();

    if (!question) {
        return {
            success: false,
            message: "प्रश्न उपलब्ध नहीं है।"
        };
    }

    const id = question.id;

    const index = practiceState.markedQuestions.indexOf(id);

    if (index === -1) {
        practiceState.markedQuestions.push(id);
    } else {
        practiceState.markedQuestions.splice(index, 1);
    }

    return {
        success: true,
        marked: practiceState.markedQuestions.includes(id),
        question: getCurrentQuestion()
    };
}

/*
|--------------------------------------------------------------------------
| Get Progress
|--------------------------------------------------------------------------
*/

export function getPracticeProgress() {
    const total = practiceState.questions.length;

    const attempted = Object.keys(
        practiceState.answers
    ).length;

    const unanswered = total - attempted;

    return {
        total,
        attempted,
        unanswered,

        marked: practiceState.markedQuestions.length,

        percentage: total
            ? Math.round((attempted / total) * 100)
            : 0
    };
}

/*
|--------------------------------------------------------------------------
| Get Question Navigation List
|--------------------------------------------------------------------------
*/

export function getPracticeQuestionsList() {
    return practiceState.questions.map(
        (question, index) => ({
            id: question.id,

            number: index + 1,

            answered:
                practiceState.answers[question.id] !== undefined,

            marked:
                practiceState.markedQuestions.includes(question.id),

            current:
                index === practiceState.currentIndex
        })
    );
}

/*
|--------------------------------------------------------------------------
| Calculate Result
|--------------------------------------------------------------------------
*/

export function calculatePracticeResult() {
    let correct = 0;
    let wrong = 0;
    let skipped = 0;

    const details = [];

    practiceState.questions.forEach((question, index) => {
        const selected =
            practiceState.answers[question.id];

        const correctAnswer =
            Number(question.correctAnswer);

        if (selected === undefined) {
            skipped++;

            details.push({
                questionId: question.id,
                number: index + 1,
                status: "skipped",
                selectedAnswer: null,
                correctAnswer
            });

            return;
        }

        const isCorrect =
            Number(selected) === correctAnswer;

        if (isCorrect) {
            correct++;
        } else {
            wrong++;
        }

        details.push({
            questionId: question.id,
            number: index + 1,
            status: isCorrect ? "correct" : "wrong",
            selectedAnswer: selected,
            correctAnswer
        });
    });

    const marksPerQuestion =
        Number(practiceState.settings.marksPerQuestion) || 1;

    const negativeMarks =
        practiceState.settings.negativeMarking
            ? Number(practiceState.settings.negativeMarks) || 0
            : 0;

    const score =
        (correct * marksPerQuestion) -
        (wrong * negativeMarks);

    const totalMarks =
        practiceState.questions.length * marksPerQuestion;

    const accuracy =
        correct + wrong > 0
            ? Math.round(
                (correct / (correct + wrong)) * 100
            )
            : 0;

    const percentage =
        totalMarks > 0
            ? Math.round((score / totalMarks) * 100)
            : 0;

    const timeTaken =
        practiceState.completedAt && practiceState.startedAt
            ? Math.floor(
                (practiceState.completedAt -
                    practiceState.startedAt) / 1000
            )
            : 0;

    return {
        totalQuestions: practiceState.questions.length,

        attempted: correct + wrong,

        correct,

        wrong,

        skipped,

        score,

        totalMarks,

        accuracy,

        percentage,

        timeTaken,

        details
    };
}

/*
|--------------------------------------------------------------------------
| Submit Practice
|--------------------------------------------------------------------------
*/

export function submitPractice() {
    if (practiceState.submitted) {
        return {
            success: false,
            message: "अभ्यास पहले ही जमा किया जा चुका है।"
        };
    }

    if (!practiceState.questions.length) {
        return {
            success: false,
            message: "कोई प्रश्न उपलब्ध नहीं है।"
        };
    }

    practiceState.submitted = true;

    practiceState.completedAt = Date.now();

    return {
        success: true,
        result: calculatePracticeResult()
    };
}

/*
|--------------------------------------------------------------------------
| Get Answer Explanation
|--------------------------------------------------------------------------
*/

export function getAnswerExplanation(questionId) {
    if (!practiceState.submitted) {
        return {
            success: false,
            message:
                "अभ्यास जमा करने के बाद ही व्याख्या देख सकते हैं।"
        };
    }

    const question = practiceState.questions.find(
        item => item.id === questionId
    );

    if (!question) {
        return {
            success: false,
            message: "प्रश्न नहीं मिला।"
        };
    }

    const translated = getQuestionLanguage(
        question,
        practiceState.language
    );

    const selected =
        practiceState.answers[questionId] ?? null;

    const correctAnswer =
        Number(question.correctAnswer);

    return {
        success: true,

        correctAnswer,

        selectedAnswer: selected,

        isCorrect:
            selected !== null &&
            Number(selected) === correctAnswer,

        explanation: translated.explanation,

        options: translated.options,

        showExplanation:
            practiceState.settings.showExplanation
    };
}

/*
|--------------------------------------------------------------------------
| Complete Result With Explanations
|--------------------------------------------------------------------------
*/

export function getCompletePracticeResult() {
    if (!practiceState.submitted) {
        return null;
    }

    const result = calculatePracticeResult();

    const explanations = practiceState.questions.map(
        (question, index) => {
            const translated = getQuestionLanguage(
                question,
                practiceState.language
            );

            const selected =
                practiceState.answers[question.id] ?? null;

            const correctAnswer =
                Number(question.correctAnswer);

            return {
                questionId: question.id,

                number: index + 1,

                question: translated.question,

                options: translated.options,

                explanation: translated.explanation,

                correctAnswer,

                selectedAnswer: selected,

                isCorrect:
                    selected !== null &&
                    Number(selected) === correctAnswer,

                status:
                    selected === null
                        ? "skipped"
                        : Number(selected) === correctAnswer
                            ? "correct"
                            : "wrong"
            };
        }
    );

    return {
        ...result,
        explanations
    };
}

/*
|--------------------------------------------------------------------------
| Change Language
|--------------------------------------------------------------------------
*/

export function setPracticeLanguage(language) {
    if (!["hi", "en"].includes(language)) {
        return {
            success: false,
            message: "अमान्य भाषा।"
        };
    }

    practiceState.language = language;

    return {
        success: true,
        language,
        question: getCurrentQuestion()
    };
}

/*
|--------------------------------------------------------------------------
| Get Practice Session
|--------------------------------------------------------------------------
*/

export function getPracticeSession() {
    return {
        currentIndex: practiceState.currentIndex,

        totalQuestions: practiceState.questions.length,

        submitted: practiceState.submitted,

        startedAt: practiceState.startedAt,

        completedAt: practiceState.completedAt,

        answers: {
            ...practiceState.answers
        },

        markedQuestions: [
            ...practiceState.markedQuestions
        ],

        progress: getPracticeProgress()
    };
}

/*
|--------------------------------------------------------------------------
| Reset Practice
|--------------------------------------------------------------------------
*/

export function resetPractice() {
    practiceState.questions = [];

    practiceState.currentIndex = 0;

    practiceState.answers = {};

    practiceState.markedQuestions = [];

    practiceState.submitted = false;

    practiceState.startedAt = null;

    practiceState.completedAt = null;

    return {
        success: true,
        message: "अभ्यास रीसेट हो गया।"
    };
}
