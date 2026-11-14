// src/question-normalizer.js

/**
 * Rajasthan PYQ Master
 * Question Data Normalizer
 *
 * Standardizes question data received from:
 * - Firestore
 * - Admin imports
 * - Question bank
 * - Practice modules
 * - Mock tests
 */

function cleanString(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function normalizeOptions(options) {
  if (!Array.isArray(options)) {
    return [];
  }

  return options.map((option) => cleanString(option));
}

function normalizeTranslation(data = {}) {
  return {
    question: cleanString(data.question),
    options: normalizeOptions(data.options),
    explanation: cleanString(data.explanation)
  };
}

function normalizeYear(value) {
  const year = Number(value);

  if (
    Number.isInteger(year) &&
    year >= 1950 &&
    year <= new Date().getFullYear() + 1
  ) {
    return year;
  }

  return null;
}

function normalizeDifficulty(value) {
  const difficulty = cleanString(value).toLowerCase();

  const allowed = ["easy", "medium", "hard"];

  return allowed.includes(difficulty)
    ? difficulty
    : "medium";
}

function normalizeQuestionType(value) {
  const type = cleanString(value).toLowerCase();

  const allowed = [
    "verified_pyq",
    "ai_practice",
    "practice"
  ];

  return allowed.includes(type)
    ? type
    : "practice";
}

function normalizeCorrectAnswer(value) {
  const answer = cleanString(value).toUpperCase();

  if (["A", "B", "C", "D"].includes(answer)) {
    return answer;
  }

  return "";
}

/**
 * Normalize one question.
 */
export function normalizeQuestion(
  question = {},
  documentId = null
) {
  if (!question || typeof question !== "object") {
    throw new Error("Invalid question data.");
  }

  const hindi = normalizeTranslation(
    question.translations?.hi || {
      question: question.questionHi || question.question,
      options: question.optionsHi || question.options,
      explanation: question.explanationHi
    }
  );

  const english = normalizeTranslation(
    question.translations?.en || {
      question: question.questionEn,
      options: question.optionsEn,
      explanation: question.explanationEn
    }
  );

  const questionId =
    cleanString(question.id) ||
    cleanString(documentId);

  return {
    id: questionId,

    questionType: normalizeQuestionType(
      question.questionType
    ),

    examId: cleanString(question.examId),

    examIds: Array.isArray(question.examIds)
      ? question.examIds.map(cleanString).filter(Boolean)
      : [],

    examName: cleanString(question.examName),

    year: normalizeYear(question.year),

    shift: cleanString(question.shift),

    subjectId: cleanString(question.subjectId),

    subjectNameHi: cleanString(question.subjectNameHi),

    subjectNameEn: cleanString(question.subjectNameEn),

    topicId: cleanString(question.topicId),

    topicNameHi: cleanString(question.topicNameHi),

    topicNameEn: cleanString(question.topicNameEn),

    subtopicId: cleanString(question.subtopicId),

    subtopicNameHi: cleanString(question.subtopicNameHi),

    subtopicNameEn: cleanString(question.subtopicNameEn),

    translations: {
      hi: hindi,
      en: english
    },

    correctAnswer: normalizeCorrectAnswer(
      question.correctAnswer
    ),

    difficulty: normalizeDifficulty(
      question.difficulty
    ),

    source: cleanString(question.source),

    sourceUrl: cleanString(question.sourceUrl),

    verificationStatus: cleanString(
      question.verificationStatus
    ),

    isPublished: question.isPublished === true,

    createdAt: question.createdAt || null,

    updatedAt: question.updatedAt || null
  };
}

/**
 * Normalize multiple questions.
 */
export function normalizeQuestionBatch(questions = []) {
  if (!Array.isArray(questions)) {
    throw new Error("Questions must be an array.");
  }

  const normalized = [];
  const errors = [];

  questions.forEach((question, index) => {
    try {
      normalized.push(
        normalizeQuestion(question)
      );
    } catch (error) {
      errors.push({
        index,
        message: error.message
      });
    }
  });

  return {
    total: questions.length,
    successful: normalized.length,
    failed: errors.length,
    questions: normalized,
    errors
  };
}

/**
 * Get localized question content.
 */
export function getLocalizedQuestion(
  question,
  language = "hi"
) {
  const selectedLanguage =
    language === "en" ? "en" : "hi";

  const translation =
    question?.translations?.[selectedLanguage];

  if (!translation) {
    return {
      question: "",
      options: [],
      explanation: ""
    };
  }

  return {
    question: translation.question,
    options: [...translation.options],
    explanation: translation.explanation
  };
}
