// src/question-filters.js

/**
 * Rajasthan PYQ Master
 * Question Filtering System
 *
 * Supports:
 * Exam → Subject → Topic → Subtopic
 * Hindi and English question search
 */

export function filterQuestions(questions = [], filters = {}) {
  if (!Array.isArray(questions)) {
    return [];
  }

  const {
    examId = "all",
    subjectId = "all",
    topicId = "all",
    subtopicId = "all",
    language = "hi",
    search = "",
    questionType = "all",
    year = "all",
    difficulty = "all"
  } = filters;

  const searchText = String(search).trim().toLowerCase();

  return questions.filter((question) => {
    if (!question || typeof question !== "object") {
      return false;
    }

    // Exam filter
    if (
      examId !== "all" &&
      question.examId !== examId &&
      !question.examIds?.includes(examId)
    ) {
      return false;
    }

    // Subject filter
    if (
      subjectId !== "all" &&
      question.subjectId !== subjectId
    ) {
      return false;
    }

    // Topic filter
    if (
      topicId !== "all" &&
      question.topicId !== topicId
    ) {
      return false;
    }

    // Subtopic filter
    if (
      subtopicId !== "all" &&
      question.subtopicId !== subtopicId
    ) {
      return false;
    }

    // Question type filter
    if (
      questionType !== "all" &&
      question.questionType !== questionType
    ) {
      return false;
    }

    // Year filter
    if (
      year !== "all" &&
      String(question.year) !== String(year)
    ) {
      return false;
    }

    // Difficulty filter
    if (
      difficulty !== "all" &&
      question.difficulty !== difficulty
    ) {
      return false;
    }

    // Language-based question content
    const content = getQuestionContent(question, language);

    // Search filter
    if (searchText) {
      const searchableText = [
        content.question,
        ...(content.options || []),
        content.explanation,
        question.topicName,
        question.subtopicName
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (!searchableText.includes(searchText)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Get question content in selected language.
 */
export function getQuestionContent(question, language = "hi") {
  const selectedLanguage =
    language === "en" ? "en" : "hi";

  const translated =
    question.translations?.[selectedLanguage];

  if (translated) {
    return {
      question: translated.question || "",
      options: Array.isArray(translated.options)
        ? translated.options
        : [],
      explanation: translated.explanation || ""
    };
  }

  return {
    question:
      selectedLanguage === "en"
        ? question.questionEn || question.question || ""
        : question.questionHi || question.question || "",

    options:
      selectedLanguage === "en"
        ? question.optionsEn || question.options || []
        : question.optionsHi || question.options || [],

    explanation:
      selectedLanguage === "en"
        ? question.explanationEn || question.explanation || ""
        : question.explanationHi || question.explanation || ""
  };
}

/**
 * Get available subjects for selected exam.
 */
export function getAvailableSubjects(
  questions = [],
  examId = "all"
) {
  const subjects = new Map();

  questions.forEach((question) => {
    if (!question?.subjectId) return;

    const matchesExam =
      examId === "all" ||
      question.examId === examId ||
      question.examIds?.includes(examId);

    if (!matchesExam) return;

    subjects.set(question.subjectId, {
      id: question.subjectId,
      nameHi: question.subjectNameHi || "",
      nameEn: question.subjectNameEn || ""
    });
  });

  return [...subjects.values()];
}

/**
 * Get available topics for selected subject.
 */
export function getAvailableTopics(
  questions = [],
  subjectId,
  examId = "all"
) {
  const topics = new Map();

  questions.forEach((question) => {
    if (
      !question?.topicId ||
      question.subjectId !== subjectId
    ) {
      return;
    }

    const matchesExam =
      examId === "all" ||
      question.examId === examId ||
      question.examIds?.includes(examId);

    if (!matchesExam) return;

    topics.set(question.topicId, {
      id: question.topicId,
      nameHi: question.topicNameHi || "",
      nameEn: question.topicNameEn || ""
    });
  });

  return [...topics.values()];
}

/**
 * Get available subtopics for selected topic.
 */
export function getAvailableSubtopics(
  questions = [],
  topicId
) {
  const subtopics = new Map();

  questions.forEach((question) => {
    if (
      !question?.subtopicId ||
      question.topicId !== topicId
    ) {
      return;
    }

    subtopics.set(question.subtopicId, {
      id: question.subtopicId,
      nameHi: question.subtopicNameHi || "",
      nameEn: question.subtopicNameEn || ""
    });
  });

  return [...subtopics.values()];
}

/**
 * Count questions matching filters.
 */
export function countFilteredQuestions(
  questions = [],
  filters = {}
) {
  return filterQuestions(questions, filters).length;
}

/**
 * Sort questions.
 */
export function sortQuestions(
  questions = [],
  sortBy = "newest"
) {
  const result = [...questions];

  switch (sortBy) {
    case "oldest":
      return result.sort(
        (a, b) => Number(a.year || 0) - Number(b.year || 0)
      );

    case "newest":
      return result.sort(
        (a, b) => Number(b.year || 0) - Number(a.year || 0)
      );

    case "easy":
      return result.sort(
        (a, b) =>
          difficultyValue(a.difficulty) -
          difficultyValue(b.difficulty)
      );

    case "hard":
      return result.sort(
        (a, b) =>
          difficultyValue(b.difficulty) -
          difficultyValue(a.difficulty)
      );

    default:
      return result;
  }
}

function difficultyValue(value) {
  const levels = {
    easy: 1,
    medium: 2,
    hard: 3
  };

  return levels[String(value || "").toLowerCase()] || 0;
}
