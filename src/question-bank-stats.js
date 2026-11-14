// src/question-bank-stats.js

/**
 * Rajasthan PYQ Master
 * Question Bank Statistics
 */

function isAvailable(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function createCounter() {
  return {};
}

function increment(counter, key) {
  if (!key) return;
  counter[key] = (counter[key] || 0) + 1;
}

function hasHindi(question) {
  const data = question?.translations?.hi;

  return Boolean(
    isAvailable(data?.question) &&
    Array.isArray(data?.options) &&
    data.options.length === 4
  );
}

function hasEnglish(question) {
  const data = question?.translations?.en;

  return Boolean(
    isAvailable(data?.question) &&
    Array.isArray(data?.options) &&
    data.options.length === 4
  );
}

/**
 * Generate complete question bank statistics.
 */
export function generateQuestionBankStats(questions = []) {
  if (!Array.isArray(questions)) {
    throw new Error("Questions must be an array.");
  }

  const stats = {
    total: questions.length,
    published: 0,
    unpublished: 0,

    verifiedPYQ: 0,
    unverifiedPYQ: 0,
    aiPractice: 0,
    normalPractice: 0,

    hindiAvailable: 0,
    englishAvailable: 0,
    bilingualAvailable: 0,

    byExam: createCounter(),
    bySubject: createCounter(),
    byTopic: createCounter(),
    byYear: createCounter(),
    byDifficulty: createCounter(),

    missingSource: 0,
    missingExplanation: 0,
    missingTranslation: 0
  };

  questions.forEach((question) => {
    if (!question || typeof question !== "object") {
      return;
    }

    if (question.isPublished === true) {
      stats.published++;
    } else {
      stats.unpublished++;
    }

    const type = question.questionType;

    if (
      type === "verified_pyq" &&
      question.verificationStatus === "verified" &&
      isAvailable(question.source)
    ) {
      stats.verifiedPYQ++;
    } else if (type === "verified_pyq") {
      stats.unverifiedPYQ++;
    } else if (type === "ai_practice") {
      stats.aiPractice++;
    } else {
      stats.normalPractice++;
    }

    const hindi = hasHindi(question);
    const english = hasEnglish(question);

    if (hindi) stats.hindiAvailable++;
    if (english) stats.englishAvailable++;

    if (hindi && english) {
      stats.bilingualAvailable++;
    }

    if (!hindi || !english) {
      stats.missingTranslation++;
    }

    increment(stats.byExam, question.examId);
    increment(stats.bySubject, question.subjectId);
    increment(stats.byTopic, question.topicId);
    increment(stats.byYear, question.year);
    increment(stats.byDifficulty, question.difficulty);

    if (
      question.questionType === "verified_pyq" &&
      !isAvailable(question.source)
    ) {
      stats.missingSource++;
    }

    if (
      !isAvailable(question.translations?.hi?.explanation) ||
      !isAvailable(question.translations?.en?.explanation)
    ) {
      stats.missingExplanation++;
    }
  });

  return stats;
}

/**
 * Get statistics for a specific subject.
 */
export function getSubjectStats(questions = [], subjectId) {
  const filtered = questions.filter(
    (question) => question?.subjectId === subjectId
  );

  return {
    subjectId,
    total: filtered.length,
    verifiedPYQ: filtered.filter(
      (question) =>
        question.questionType === "verified_pyq" &&
        question.verificationStatus === "verified" &&
        isAvailable(question.source)
    ).length,
    aiPractice: filtered.filter(
      (question) => question.questionType === "ai_practice"
    ).length
  };
}

/**
 * Get statistics for a specific exam.
 */
export function getExamStats(questions = [], examId) {
  const filtered = questions.filter(
    (question) =>
      question?.examId === examId ||
      question?.examIds?.includes(examId)
  );

  return {
    examId,
    total: filtered.length,
    published: filtered.filter(
      (question) => question.isPublished === true
    ).length
  };
}

/**
 * Get questions missing important data.
 */
export function getIncompleteQuestions(questions = []) {
  return questions.filter((question) => {
    if (!question || typeof question !== "object") {
      return true;
    }

    return (
      !isAvailable(question.id) ||
      !isAvailable(question.subjectId) ||
      !isAvailable(question.topicId) ||
      !hasHindi(question) ||
      !hasEnglish(question) ||
      !isAvailable(question.correctAnswer)
    );
  });
}
