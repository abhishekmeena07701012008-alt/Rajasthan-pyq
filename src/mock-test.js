// src/mock-test.js

import {
    startPractice,
    getCurrentQuestion,
    selectAnswer,
    clearAnswer,
    nextQuestion,
    previousQuestion,
    goToQuestion,
    toggleMarkQuestion,
    getPracticeProgress,
    getPracticeQuestionsList,
    getPracticeSession,
    submitPractice,
    getCompletePracticeResult,
    resetPractice
} from "./practice.js";

import { QUESTION_TYPES } from "./question-service.js";

/*
|--------------------------------------------------------------------------
| Mock Test State
|--------------------------------------------------------------------------
*/

const mockTestState = {
    active: false,
    submitted: false,
    examId: null,
    testId: null,
    title: "",
    durationSeconds: 0,
    startedAt: null,
    deadline: null,
    remainingSeconds: 0,
    timerId: null,
    warningShown: [],
    settings: {},
    result: null,
    onTick: null,
    onWarning: null,
    onAutoSubmit: null
};

/*
|--------------------------------------------------------------------------
| Default Mock Test Settings
|--------------------------------------------------------------------------
*/

const DEFAULT_SETTINGS = {
    questionCount: 100,
    durationMinutes: 120,

    marksPerQuestion: 1,

    negativeMarking: true,
    negativeMarks: 0.25,

    shuffleQuestions: true,
    shuffleOptions: true,

    showExplanation: false,

    language: "hi",

    warningAtMinutes: [15, 5, 1],

    questionType: QUESTION_TYPES.PYQ
};

/*
|--------------------------------------------------------------------------
| Validate Mock Test Configuration
|--------------------------------------------------------------------------
*/

function validateMockTestConfig(config) {
    const settings = {
        ...DEFAULT_SETTINGS,
        ...config
    };

    if (!settings.examId) {
        throw new Error("परीक्षा चुनना आवश्यक है।");
    }

    if (
        !Number.isFinite(Number(settings.questionCount)) ||
        Number(settings.questionCount) < 1 ||
        Number(settings.questionCount) > 100
    ) {
        throw new Error("प्रश्नों की संख्या 1 से 100 के बीच होनी चाहिए।");
    }

    if (
        !Number.isFinite(Number(settings.durationMinutes)) ||
        Number(settings.durationMinutes) <= 0
    ) {
        throw new Error("परीक्षा का समय सही होना चाहिए।");
    }

    if (
        !Number.isFinite(Number(settings.marksPerQuestion)) ||
        Number(settings.marksPerQuestion) <= 0
    ) {
        throw new Error("प्रति प्रश्न अंक सही होने चाहिए।");
    }

    if (
        settings.negativeMarking &&
        (
            !Number.isFinite(Number(settings.negativeMarks)) ||
            Number(settings.negativeMarks) < 0
        )
    ) {
        throw new Error("नेगेटिव मार्किंग सही दर्ज करें।");
    }

    return settings;
}

/*
|--------------------------------------------------------------------------
| Start Mock Test
|--------------------------------------------------------------------------
*/

export async function startMockTest(config = {}) {
    try {
        if (mockTestState.active) {
            return {
                success: false,
                message: "एक Mock Test पहले से चल रहा है।"
            };
        }

        const settings = validateMockTestConfig(config);

        resetMockTestState();

        const result = await startPractice({
            examId: settings.examId,

            subjectId: settings.subjectId || null,

            topicId: settings.topicId || null,

            subtopicId: settings.subtopicId || null,

            year: settings.year || null,

            shift: settings.shift || null,

            difficulty: settings.difficulty || null,

            type: settings.questionType,

            language: settings.language,

            questionLimit: Number(settings.questionCount),

            shuffle: settings.shuffleQuestions,

            shuffleOptions: settings.shuffleOptions,

            negativeMarking: settings.negativeMarking,

            negativeMarks: Number(settings.negativeMarks),

            marksPerQuestion: Number(settings.marksPerQuestion),

            showExplanation: settings.showExplanation
        });

        if (!result.success) {
            return result;
        }

        const durationSeconds =
            Number(settings.durationMinutes) * 60;

        mockTestState.active = true;

        mockTestState.submitted = false;

        mockTestState.examId = settings.examId;

        mockTestState.testId =
            `mock_${Date.now()}_${Math.random()
                .toString(36)
                .slice(2, 8)}`;

        mockTestState.title =
            settings.title || "Mock Test";

        mockTestState.durationSeconds = durationSeconds;

        mockTestState.startedAt = Date.now();

        mockTestState.deadline =
            mockTestState.startedAt + durationSeconds * 1000;

        mockTestState.remainingSeconds = durationSeconds;

        mockTestState.settings = settings;

        mockTestState.warningShown = [];

        startTimer();

        return {
            success: true,

            testId: mockTestState.testId,

            title: mockTestState.title,

            totalQuestions: result.totalQuestions,

            durationMinutes: settings.durationMinutes,

            currentQuestion: getCurrentQuestion(),

            timer: getTimerStatus(),

            progress: getMockTestProgress()
        };

    } catch (error) {
        console.error("Mock Test Start Error:", error);

        return {
            success: false,
            message: error.message
        };
    }
}

/*
|--------------------------------------------------------------------------
| Timer
|--------------------------------------------------------------------------
*/

function startTimer() {
    stopTimer();

    mockTestState.timerId = setInterval(() => {
        updateRemainingTime();

        if (mockTestState.remainingSeconds <= 0) {
            stopTimer();

            autoSubmitMockTest();
            return;
        }

        checkTimerWarnings();

        if (typeof mockTestState.onTick === "function") {
            mockTestState.onTick(getTimerStatus());
        }

    }, 1000);
}

/*
|--------------------------------------------------------------------------
| Update Remaining Time
|--------------------------------------------------------------------------
*/

function updateRemainingTime() {
    if (!mockTestState.deadline) return;

    const remainingMilliseconds =
        mockTestState.deadline - Date.now();

    mockTestState.remainingSeconds = Math.max(
        0,
        Math.ceil(remainingMilliseconds / 1000)
    );
}

/*
|--------------------------------------------------------------------------
| Stop Timer
|--------------------------------------------------------------------------
*/

function stopTimer() {
    if (mockTestState.timerId !== null) {
        clearInterval(mockTestState.timerId);
        mockTestState.timerId = null;
    }
}

/*
|--------------------------------------------------------------------------
| Get Timer Status
|--------------------------------------------------------------------------
*/

export function getTimerStatus() {
    updateRemainingTime();

    const seconds = mockTestState.remainingSeconds;

    const hours = Math.floor(seconds / 3600);

    const minutes = Math.floor((seconds % 3600) / 60);

    const remainingSeconds = seconds % 60;

    return {
        totalSeconds: seconds,

        hours,

        minutes,

        seconds: remainingSeconds,

        formatted:
            `${String(hours).padStart(2, "0")}:` +
            `${String(minutes).padStart(2, "0")}:` +
            `${String(remainingSeconds).padStart(2, "0")}`,

        expired: seconds <= 0
    };
}

/*
|--------------------------------------------------------------------------
| Timer Warnings
|--------------------------------------------------------------------------
*/

function checkTimerWarnings() {
    const remainingMinutes =
        Math.ceil(mockTestState.remainingSeconds / 60);

    const warningTimes =
        mockTestState.settings.warningAtMinutes || [];

    warningTimes.forEach(minutes => {
        if (
            remainingMinutes <= minutes &&
            !mockTestState.warningShown.includes(minutes)
        ) {
            mockTestState.warningShown.push(minutes);

            if (typeof mockTestState.onWarning === "function") {
                mockTestState.onWarning({
                    minutesRemaining: minutes,

                    message:
                        `${minutes} मिनट शेष हैं।`
                });
            }
        }
    });
}

/*
|--------------------------------------------------------------------------
| Register Timer Events
|--------------------------------------------------------------------------
*/

export function setMockTestCallbacks({
    onTick = null,
    onWarning = null,
    onAutoSubmit = null
} = {}) {
    mockTestState.onTick = onTick;

    mockTestState.onWarning = onWarning;

    mockTestState.onAutoSubmit = onAutoSubmit;
}

/*
|--------------------------------------------------------------------------
| Answer Selection
|--------------------------------------------------------------------------
*/

export function selectMockTestAnswer(optionIndex) {
    if (!mockTestState.active || mockTestState.submitted) {
        return {
            success: false,
            message: "Mock Test सक्रिय नहीं है।"
        };
    }

    updateRemainingTime();

    if (mockTestState.remainingSeconds <= 0) {
        autoSubmitMockTest();

        return {
            success: false,
            message: "परीक्षा का समय समाप्त हो गया है।"
        };
    }

    return selectAnswer(optionIndex);
}

/*
|--------------------------------------------------------------------------
| Clear Answer
|--------------------------------------------------------------------------
*/

export function clearMockTestAnswer() {
    if (!mockTestState.active || mockTestState.submitted) {
        return {
            success: false,
            message: "Mock Test सक्रिय नहीं है।"
        };
    }

    return clearAnswer();
}

/*
|--------------------------------------------------------------------------
| Question Navigation
|--------------------------------------------------------------------------
*/

export function nextMockQuestion() {
    if (!mockTestState.active || mockTestState.submitted) {
        return {
            success: false,
            message: "Mock Test सक्रिय नहीं है।"
        };
    }

    return nextQuestion();
}

export function previousMockQuestion() {
    if (!mockTestState.active || mockTestState.submitted) {
        return {
            success: false,
            message: "Mock Test सक्रिय नहीं है।"
        };
    }

    return previousQuestion();
}

export function jumpToMockQuestion(questionNumber) {
    if (!mockTestState.active || mockTestState.submitted) {
        return {
            success: false,
            message: "Mock Test सक्रिय नहीं है।"
        };
    }

    return goToQuestion(questionNumber);
}

/*
|--------------------------------------------------------------------------
| Mark For Review
|--------------------------------------------------------------------------
*/

export function markMockQuestion() {
    if (!mockTestState.active || mockTestState.submitted) {
        return {
            success: false,
            message: "Mock Test सक्रिय नहीं है।"
        };
    }

    return toggleMarkQuestion();
}

/*
|--------------------------------------------------------------------------
| Mock Test Progress
|--------------------------------------------------------------------------
*/

export function getMockTestProgress() {
    const progress = getPracticeProgress();

    const questions = getPracticeQuestionsList();

    const answered = questions.filter(
        question => question.answered
    ).length;

    const unanswered = questions.filter(
        question => !question.answered
    ).length;

    const marked = questions.filter(
        question => question.marked
    ).length;

    return {
        total: questions.length,

        answered,

        unanswered,

        marked,

        currentQuestion:
            getPracticeSession().currentIndex + 1,

        percentage: questions.length
            ? Math.round(
                (answered / questions.length) * 100
            )
            : 0,

        details: progress
    };
}

/*
|--------------------------------------------------------------------------
| Question Palette
|--------------------------------------------------------------------------
*/

export function getMockQuestionPalette() {
    return getPracticeQuestionsList().map(question => ({
        number: question.number,

        id: question.id,

        answered: question.answered,

        marked: question.marked,

        current: question.current,

        status: question.answered
            ? "answered"
            : question.marked
                ? "marked"
                : "not-visited"
    }));
}

/*
|--------------------------------------------------------------------------
| Submit Mock Test
|--------------------------------------------------------------------------
*/

export function submitMockTest() {
    if (!mockTestState.active || mockTestState.submitted) {
        return {
            success: false,
            message: "Mock Test जमा नहीं किया जा सकता।"
        };
    }

    stopTimer();

    const submission = submitPractice();

    if (!submission.success) {
        return submission;
    }

    mockTestState.active = false;

    mockTestState.submitted = true;

    mockTestState.remainingSeconds = Math.max(
        0,
        mockTestState.remainingSeconds
    );

    mockTestState.result = buildMockTestResult(
        submission.result,
        false
    );

    return {
        success: true,
        result: mockTestState.result
    };
}

/*
|--------------------------------------------------------------------------
| Auto Submit
|--------------------------------------------------------------------------
*/

function autoSubmitMockTest() {
    if (!mockTestState.active || mockTestState.submitted) {
        return;
    }

    mockTestState.remainingSeconds = 0;

    const result = submitMockTest();

    if (
        result.success &&
        typeof mockTestState.onAutoSubmit === "function"
    ) {
        mockTestState.onAutoSubmit(result.result);
    }
}

/*
|--------------------------------------------------------------------------
| Build Final Result
|--------------------------------------------------------------------------
*/

function buildMockTestResult(practiceResult, autoSubmitted) {
    const totalDuration =
        mockTestState.durationSeconds;

    const remaining =
        mockTestState.remainingSeconds;

    const timeSpent = Math.max(
        0,
        totalDuration - remaining
    );

    return {
        testId: mockTestState.testId,

        title: mockTestState.title,

        examId: mockTestState.examId,

        totalQuestions: practiceResult.totalQuestions,

        attempted: practiceResult.attempted,

        correct: practiceResult.correct,

        wrong: practiceResult.wrong,

        skipped: practiceResult.skipped,

        score: practiceResult.score,

        totalMarks: practiceResult.totalMarks,

        accuracy: practiceResult.accuracy,

        percentage: practiceResult.percentage,

        timeSpent,

        remainingTime: remaining,

        autoSubmitted,

        startedAt: mockTestState.startedAt,

        completedAt: Date.now(),

        details: practiceResult.details
    };
}

/*
|--------------------------------------------------------------------------
| Get Result With Explanations
|--------------------------------------------------------------------------
*/

export function getMockTestResult() {
    if (!mockTestState.submitted) {
        return {
            success: false,
            message: "पहले Mock Test जमा करें।"
        };
    }

    return {
        success: true,

        result: mockTestState.result,

        explanations: mockTestState.settings.showExplanation
            ? getCompletePracticeResult()?.explanations || []
            : []
    };
}

/*
|--------------------------------------------------------------------------
| Test Information
|--------------------------------------------------------------------------
*/

export function getMockTestInfo() {
    return {
        active: mockTestState.active,

        submitted: mockTestState.submitted,

        testId: mockTestState.testId,

        examId: mockTestState.examId,

        title: mockTestState.title,

        settings: mockTestState.settings,

        timer: getTimerStatus(),

        progress: getMockTestProgress()
    };
}

/*
|--------------------------------------------------------------------------
| Reset Mock Test
|--------------------------------------------------------------------------
*/

function resetMockTestState() {
    stopTimer();

    resetPractice();

    mockTestState.active = false;

    mockTestState.submitted = false;

    mockTestState.examId = null;

    mockTestState.testId = null;

    mockTestState.title = "";

    mockTestState.durationSeconds = 0;

    mockTestState.startedAt = null;

    mockTestState.deadline = null;

    mockTestState.remainingSeconds = 0;

    mockTestState.warningShown = [];

    mockTestState.settings = {};

    mockTestState.result = null;
}

/*
|--------------------------------------------------------------------------
| Exit Mock Test
|--------------------------------------------------------------------------
*/

export function exitMockTest() {
    if (mockTestState.active && !mockTestState.submitted) {
        return {
            success: false,

            requiresConfirmation: true,

            message:
                "आपकी परीक्षा चल रही है। बाहर निकलने पर वर्तमान प्रयास समाप्त हो सकता है।"
        };
    }

    stopTimer();

    return {
        success: true,
        message: "Mock Test से बाहर निकल गए।"
    };
}

/*
|--------------------------------------------------------------------------
| Confirm Exit
|--------------------------------------------------------------------------
*/

export function confirmExitMockTest() {
    stopTimer();

    resetMockTestState();

    return {
        success: true,
        message: "Mock Test समाप्त कर दिया गया है।"
    };
}
