import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  limit
} from "firebase/firestore";

import { db } from "./firebase.js";
import { getQuestionById } from "./question-service.js";

/*
|--------------------------------------------------------------------------
| DAILY QUIZ CONFIGURATION
|--------------------------------------------------------------------------
*/

export const DAILY_QUIZ_CONFIG = {
  COLLECTION: "dailyQuiz",
  TIMEZONE: "Asia/Kolkata",
  DEFAULT_MARKS: 1,
  DEFAULT_NEGATIVE_MARKS: 0.25,
  DEFAULT_DURATION_MINUTES: 15,
  MAX_QUESTION_LIMIT: 100
};

export const DAILY_QUIZ_STATUS = {
  PUBLISHED: "published",
  DRAFT: "draft",
  ARCHIVED: "archived"
};

/*
|--------------------------------------------------------------------------
| DAILY DATE - INDIA TIMEZONE
|--------------------------------------------------------------------------
*/

export function getIndiaDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: DAILY_QUIZ_CONFIG.TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  const values = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  }

  return `${values.year}-${values.month}-${values.day}`;
}

/*
|--------------------------------------------------------------------------
| DAILY QUIZ DOCUMENT
|--------------------------------------------------------------------------
*/

function normalizeQuizDocument(id, data) {
  return {
    id,
    dateKey: data.dateKey || id,
    title: data.title || {},
    description: data.description || {},
    status: data.status,
    questionIds: Array.isArray(data.questionIds)
      ? data.questionIds
      : [],
    questions: Array.isArray(data.questions)
      ? data.questions
      : [],
    examIds: Array.isArray(data.examIds)
      ? data.examIds
      : [],
    durationMinutes:
      Number(data.durationMinutes) ||
      DAILY_QUIZ_CONFIG.DEFAULT_DURATION_MINUTES,
    marksPerQuestion:
      Number(data.marksPerQuestion) ||
      DAILY_QUIZ_CONFIG.DEFAULT_MARKS,
    negativeMarks:
      Number(data.negativeMarks) >= 0
        ? Number(data.negativeMarks)
        : DAILY_QUIZ_CONFIG.DEFAULT_NEGATIVE_MARKS,
    totalQuestions: Number(data.totalQuestions) || 0,
    createdAt: data.createdAt || null,
    publishedAt: data.publishedAt || null
  };
}

/*
|--------------------------------------------------------------------------
| FETCH TODAY'S DAILY QUIZ
|--------------------------------------------------------------------------
*/

export async function getTodayDailyQuiz() {
  const dateKey = getIndiaDateKey();

  return getDailyQuizByDate(dateKey);
}

/*
|--------------------------------------------------------------------------
| FETCH QUIZ BY DATE
|--------------------------------------------------------------------------
*/

export async function getDailyQuizByDate(dateKey) {
  if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    throw new Error("Invalid daily quiz date.");
  }

  try {
    // First check direct document ID.
    const directRef = doc(db, DAILY_QUIZ_CONFIG.COLLECTION, dateKey);
    const directSnapshot = await getDoc(directRef);

    if (directSnapshot.exists()) {
      const data = normalizeQuizDocument(
        directSnapshot.id,
        directSnapshot.data()
      );

      if (data.status !== DAILY_QUIZ_STATUS.PUBLISHED) {
        return null;
      }

      return data;
    }

    // Fallback: find by dateKey field.
    const quizQuery = query(
      collection(db, DAILY_QUIZ_CONFIG.COLLECTION),
      where("dateKey", "==", dateKey),
      where("status", "==", DAILY_QUIZ_STATUS.PUBLISHED),
      limit(1)
    );

    const snapshot = await getDocs(quizQuery);

    if (snapshot.empty) {
      return null;
    }

    const quizDoc = snapshot.docs[0];

    return normalizeQuizDocument(
      quizDoc.id,
      quizDoc.data()
    );

  } catch (error) {
    console.error("Daily quiz fetch failed:", error);
    throw new Error("Daily quiz load नहीं हो पाया।");
  }
}

/*
|--------------------------------------------------------------------------
| LOAD DAILY QUIZ QUESTIONS
|--------------------------------------------------------------------------
*/

export async function loadDailyQuizQuestions(quiz) {
  if (!quiz) {
    throw new Error("Daily quiz उपलब्ध नहीं है।");
  }

  let questions = [];

  // Option 1: Questions embedded in dailyQuiz document.
  if (quiz.questions.length > 0) {
    questions = quiz.questions;
  }

  // Option 2: Questions stored separately in questions collection.
  else if (quiz.questionIds.length > 0) {
    const questionResults = await Promise.all(
      quiz.questionIds.map(async (questionId) => {
        try {
          return await getQuestionById(questionId);
        } catch (error) {
          console.error(
            `Question ${questionId} could not be loaded:`,
            error
          );

          return null;
        }
      })
    );

    questions = questionResults.filter(Boolean);
  }

  if (!questions.length) {
    throw new Error("इस Daily Quiz में अभी प्रश्न उपलब्ध नहीं हैं।");
  }

  return questions.slice(
    0,
    DAILY_QUIZ_CONFIG.MAX_QUESTION_LIMIT
  );
}

/*
|--------------------------------------------------------------------------
| BILINGUAL QUESTION SUPPORT
|--------------------------------------------------------------------------
*/

export function getDailyQuizQuestionText(question, language = "hi") {
  const selectedLanguage = language === "en" ? "en" : "hi";

  const text = question?.question;

  if (typeof text === "string") {
    return text;
  }

  return (
    text?.[selectedLanguage] ||
    text?.hi ||
    text?.en ||
    ""
  );
}

export function getDailyQuizOptions(question, language = "hi") {
  const selectedLanguage = language === "en" ? "en" : "hi";

  const options = question?.options;

  if (Array.isArray(options)) {
    return options;
  }

  if (!options) {
    return [];
  }

  return (
    options[selectedLanguage] ||
    options.hi ||
    options.en ||
    []
  );
}

export function getDailyQuizExplanation(question, language = "hi") {
  const selectedLanguage = language === "en" ? "en" : "hi";

  const explanation = question?.explanation;

  if (typeof explanation === "string") {
    return explanation;
  }

  return (
    explanation?.[selectedLanguage] ||
    explanation?.hi ||
    explanation?.en ||
    ""
  );
}

/*
|--------------------------------------------------------------------------
| OPTION RANDOMIZATION
|--------------------------------------------------------------------------
*/

function randomizeQuestionOptions(question) {
  const hindiOptions = getDailyQuizOptions(question, "hi");
  const englishOptions = getDailyQuizOptions(question, "en");

  if (!hindiOptions.length) {
    return {
      ...question,
      correctAnswer: Number(question.correctAnswer)
    };
  }

  const originalCorrectAnswer = Number(question.correctAnswer);

  const indexes = hindiOptions.map((_, index) => index);

  // Fisher-Yates shuffle.
  for (let i = indexes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [indexes[i], indexes[j]] = [
      indexes[j],
      indexes[i]
    ];
  }

  const newCorrectAnswer = indexes.indexOf(
    originalCorrectAnswer
  );

  const shuffledHindi = indexes.map(
    index => hindiOptions[index]
  );

  const shuffledEnglish = englishOptions.length
    ? indexes.map(index => englishOptions[index] ?? "")
    : [];

  return {
    ...question,
    options: {
      hi: shuffledHindi,
      en: shuffledEnglish
    },
    correctAnswer: newCorrectAnswer
  };
}

/*
|--------------------------------------------------------------------------
| SHUFFLE QUESTIONS
|--------------------------------------------------------------------------
*/

export function shuffleDailyQuizQuestions(questions) {
  const result = [...questions];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [result[i], result[j]] = [
      result[j],
      result[i]
    ];
  }

  return result.map(randomizeQuestionOptions);
}

/*
|--------------------------------------------------------------------------
| DAILY QUIZ SESSION STATE
|--------------------------------------------------------------------------
*/

let dailyQuizSession = null;

export function startDailyQuiz(quiz, questions, options = {}) {
  if (!quiz || !Array.isArray(questions) || !questions.length) {
    throw new Error("Daily quiz शुरू नहीं किया जा सकता।");
  }

  const preparedQuestions = options.shuffle === false
    ? questions.map(randomizeQuestionOptions)
    : shuffleDailyQuizQuestions(questions);

  const durationMinutes =
    Number(options.durationMinutes || quiz.durationMinutes) ||
    DAILY_QUIZ_CONFIG.DEFAULT_DURATION_MINUTES;

  const now = Date.now();

  dailyQuizSession = {
    quizId: quiz.id,
    dateKey: quiz.dateKey,
    questions: preparedQuestions,

    currentIndex: 0,

    answers: {},
    markedQuestions: [],

    language: options.language === "en" ? "en" : "hi",

    marksPerQuestion: quiz.marksPerQuestion,
    negativeMarks: quiz.negativeMarks,

    startedAt: now,
    expiresAt: now + durationMinutes * 60 * 1000,

    durationMinutes,
    submitted: false
  };

  return getDailyQuizSession();
}

/*
|--------------------------------------------------------------------------
| SESSION ACCESS
|--------------------------------------------------------------------------
*/

export function getDailyQuizSession() {
  if (!dailyQuizSession) {
    return null;
  }

  return {
    ...dailyQuizSession,
    questions: [...dailyQuizSession.questions],
    answers: { ...dailyQuizSession.answers },
    markedQuestions: [...dailyQuizSession.markedQuestions]
  };
}

export function getCurrentDailyQuizQuestion() {
  if (!dailyQuizSession) {
    return null;
  }

  return dailyQuizSession.questions[
    dailyQuizSession.currentIndex
  ] || null;
}

export function getDailyQuizProgress() {
  if (!dailyQuizSession) {
    return null;
  }

  const total = dailyQuizSession.questions.length;
  const answered = Object.keys(
    dailyQuizSession.answers
  ).length;

  return {
    total,
    answered,
    unanswered: total - answered,
    current: dailyQuizSession.currentIndex + 1,
    percentage: total
      ? Math.round((answered / total) * 100)
      : 0
  };
}

/*
|--------------------------------------------------------------------------
| NAVIGATION
|--------------------------------------------------------------------------
*/

export function goToDailyQuizQuestion(index) {
  if (!dailyQuizSession || dailyQuizSession.submitted) {
    return false;
  }

  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= dailyQuizSession.questions.length
  ) {
    return false;
  }

  dailyQuizSession.currentIndex = index;

  return getCurrentDailyQuizQuestion();
}

export function nextDailyQuizQuestion() {
  if (!dailyQuizSession) {
    return false;
  }

  return goToDailyQuizQuestion(
    dailyQuizSession.currentIndex + 1
  );
}

export function previousDailyQuizQuestion() {
  if (!dailyQuizSession) {
    return false;
  }

  return goToDailyQuizQuestion(
    dailyQuizSession.currentIndex - 1
  );
}

/*
|--------------------------------------------------------------------------
| ANSWER SELECTION
|--------------------------------------------------------------------------
*/

export function selectDailyQuizAnswer(optionIndex) {
  if (!dailyQuizSession || dailyQuizSession.submitted) {
    return false;
  }

  if (isDailyQuizTimeOver()) {
    return false;
  }

  const question = getCurrentDailyQuizQuestion();

  if (!question) {
    return false;
  }

  const options = getDailyQuizOptions(
    question,
    dailyQuizSession.language
  );

  if (
    !Number.isInteger(optionIndex) ||
    optionIndex < 0 ||
    optionIndex >= options.length
  ) {
    return false;
  }

  dailyQuizSession.answers[question.id] = optionIndex;

  return true;
}

export function clearDailyQuizAnswer() {
  if (!dailyQuizSession || dailyQuizSession.submitted) {
    return false;
  }

  const question = getCurrentDailyQuizQuestion();

  if (!question) {
    return false;
  }

  delete dailyQuizSession.answers[question.id];

  return true;
}

export function getDailyQuizSelectedAnswer(questionId) {
  if (!dailyQuizSession) {
    return null;
  }

  return dailyQuizSession.answers[questionId] ?? null;
}

/*
|--------------------------------------------------------------------------
| MARK FOR REVIEW
|--------------------------------------------------------------------------
*/

export function toggleDailyQuizMark(questionId) {
  if (!dailyQuizSession || dailyQuizSession.submitted) {
    return false;
  }

  const index = dailyQuizSession.markedQuestions.indexOf(
    questionId
  );

  if (index === -1) {
    dailyQuizSession.markedQuestions.push(questionId);
  } else {
    dailyQuizSession.markedQuestions.splice(index, 1);
  }

  return dailyQuizSession.markedQuestions.includes(
    questionId
  );
}

export function isDailyQuizQuestionMarked(questionId) {
  return dailyQuizSession?.markedQuestions.includes(
    questionId
  ) || false;
}

/*
|--------------------------------------------------------------------------
| TIMER
|--------------------------------------------------------------------------
*/

export function getDailyQuizRemainingTime() {
  if (!dailyQuizSession) {
    return 0;
  }

  if (dailyQuizSession.submitted) {
    return 0;
  }

  return Math.max(
    0,
    Math.floor(
      (dailyQuizSession.expiresAt - Date.now()) / 1000
    )
  );
}

export function formatDailyQuizTime(seconds) {
  const safeSeconds = Math.max(0, Number(seconds) || 0);

  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds
  ).padStart(2, "0")}`;
}

export function isDailyQuizTimeOver() {
  return Boolean(
    dailyQuizSession &&
    Date.now() >= dailyQuizSession.expiresAt
  );
}

/*
|--------------------------------------------------------------------------
| RESULT CALCULATION
|--------------------------------------------------------------------------
*/

export function calculateDailyQuizResult() {
  if (!dailyQuizSession) {
    throw new Error("कोई active quiz session नहीं है।");
  }

  const questions = dailyQuizSession.questions;
  const answers = dailyQuizSession.answers;

  let correct = 0;
  let incorrect = 0;
  let unanswered = 0;

  const review = [];

  questions.forEach((question, index) => {
    const selectedAnswer = answers[question.id];

    const hasAnswered =
      selectedAnswer !== undefined &&
      selectedAnswer !== null;

    const isCorrect = hasAnswered &&
      Number(selectedAnswer) === Number(question.correctAnswer);

    if (!hasAnswered) {
      unanswered++;
    } else if (isCorrect) {
      correct++;
    } else {
      incorrect++;
    }

    review.push({
      questionId: question.id,
      questionNumber: index + 1,
      selectedAnswer: hasAnswered ? selectedAnswer : null,
      correctAnswer: Number(question.correctAnswer),
      isCorrect: Boolean(isCorrect),
      status: !hasAnswered
        ? "unanswered"
        : isCorrect
          ? "correct"
          : "incorrect"
    });
  });

  const total = questions.length;

  const positiveMarks =
    correct * dailyQuizSession.marksPerQuestion;

  const negativeMarks =
    incorrect * dailyQuizSession.negativeMarks;

  const score = positiveMarks - negativeMarks;

  const maximumMarks =
    total * dailyQuizSession.marksPerQuestion;

  const percentage = maximumMarks > 0
    ? Math.max(0, (score / maximumMarks) * 100)
    : 0;

  const timeTakenSeconds = Math.max(
    0,
    Math.floor(
      (Date.now() - dailyQuizSession.startedAt) / 1000
    )
  );

  return {
    quizId: dailyQuizSession.quizId,
    dateKey: dailyQuizSession.dateKey,

    totalQuestions: total,
    attempted: correct + incorrect,

    correct,
    incorrect,
    unanswered,

    positiveMarks,
    negativeMarks,
    score,
    maximumMarks,

    percentage: Number(percentage.toFixed(2)),

    accuracy: correct + incorrect > 0
      ? Number(
          (
            correct / (correct + incorrect) * 100
          ).toFixed(2)
        )
      : 0,

    timeTakenSeconds,

    review,

    completedAt: new Date().toISOString()
  };
}

/*
|--------------------------------------------------------------------------
| SUBMIT QUIZ
|--------------------------------------------------------------------------
*/

export function submitDailyQuiz(options = {}) {
  if (!dailyQuizSession) {
    throw new Error("Daily quiz session नहीं मिला।");
  }

  if (dailyQuizSession.submitted) {
    throw new Error("यह quiz पहले ही submit हो चुका है।");
  }

  if (
    isDailyQuizTimeOver() &&
    options.autoSubmit !== true
  ) {
    throw new Error("Quiz का समय समाप्त हो चुका है।");
  }

  const result = calculateDailyQuizResult();

  dailyQuizSession.submitted = true;

  return result;
}

/*
|--------------------------------------------------------------------------
| POST-SUBMISSION REVIEW
|--------------------------------------------------------------------------
*/

export function getDailyQuizReview(language) {
  if (!dailyQuizSession || !dailyQuizSession.submitted) {
    return [];
  }

  const selectedLanguage =
    language === "en" ? "en" : "hi";

  return dailyQuizSession.questions.map(
    (question, index) => {
      const selectedAnswer =
        dailyQuizSession.answers[question.id] ?? null;

      const correctAnswer = Number(
        question.correctAnswer
      );

      const options = getDailyQuizOptions(
        question,
        selectedLanguage
      );

      return {
        questionId: question.id,
        questionNumber: index + 1,

        question: getDailyQuizQuestionText(
          question,
          selectedLanguage
        ),

        options,

        selectedAnswer,
        correctAnswer,

        isCorrect:
          selectedAnswer !== null &&
          Number(selectedAnswer) === correctAnswer,

        explanation: getDailyQuizExplanation(
          question,
          selectedLanguage
        )
      };
    }
  );
}

/*
|--------------------------------------------------------------------------
| LANGUAGE SWITCH
|--------------------------------------------------------------------------
*/

export function setDailyQuizLanguage(language) {
  if (!dailyQuizSession) {
    return false;
  }

  dailyQuizSession.language =
    language === "en" ? "en" : "hi";

  return dailyQuizSession.language;
}

/*
|--------------------------------------------------------------------------
| RESET SESSION
|--------------------------------------------------------------------------
*/

export function resetDailyQuiz() {
  dailyQuizSession = null;
  return true;
}

/*
|--------------------------------------------------------------------------
| COMPLETE DAILY QUIZ INITIALIZATION
|--------------------------------------------------------------------------
*/

export async function initializeTodayDailyQuiz(options = {}) {
  const quiz = await getTodayDailyQuiz();

  if (!quiz) {
    return {
      available: false,
      message: "आज का Daily Quiz अभी प्रकाशित नहीं हुआ है।"
    };
  }

  const questions = await loadDailyQuizQuestions(quiz);

  startDailyQuiz(quiz, questions, options);

  return {
    available: true,
    quiz: {
      id: quiz.id,
      dateKey: quiz.dateKey,
      title: quiz.title,
      description: quiz.description,
      durationMinutes: quiz.durationMinutes,
      totalQuestions: questions.length
    },
    session: getDailyQuizSession()
  };
}
