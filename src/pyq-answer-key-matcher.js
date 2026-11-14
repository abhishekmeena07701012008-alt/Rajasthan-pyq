// src/pyq-answer-key-matcher.js

/**
 * Rajasthan PYQ Master
 * Official Answer Key Matcher
 *
 * This module compares imported answers with an
 * official answer-key dataset.
 *
 * It does NOT independently establish authenticity.
 */

const VALID_OPTIONS = ["A", "B", "C", "D"];

function normalizeAnswer(answer) {
  if (answer === null || answer === undefined) {
    return "";
  }

  const value = String(answer).trim().toUpperCase();

  return VALID_OPTIONS.includes(value) ? value : "";
}

function normalizeQuestionNumber(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

/**
 * Validate answer-key metadata.
 */
export function validateAnswerKey(answerKey) {
  const errors = [];

  if (!answerKey || typeof answerKey !== "object") {
    return {
      valid: false,
      errors: ["Invalid answer key."]
    };
  }

  if (!answerKey.examId) {
    errors.push("Exam ID is required.");
  }

  if (!answerKey.examName) {
    errors.push("Exam name is required.");
  }

  if (!answerKey.year) {
    errors.push("Exam year is required.");
  }

  if (!answerKey.paperCode) {
    errors.push("Paper code is required.");
  }

  if (!answerKey.sourceUrl) {
    errors.push("Official answer key source is required.");
  }

  if (
    !answerKey.answers ||
    typeof answerKey.answers !== "object"
  ) {
    errors.push("Answer key answers are missing.");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Match one question against an official answer key.
 */
export function matchQuestionAnswer(
  question,
  answerKey
) {
  if (!question || !answerKey) {
    return {
      matched: false,
      status: "invalid_input",
      message: "Question or answer key is missing."
    };
  }

  const metadataMatches =
    String(question.examId) === String(answerKey.examId) &&
    Number(question.year) === Number(answerKey.year) &&
    String(question.paperCode) === String(answerKey.paperCode);

  if (!metadataMatches) {
    return {
      matched: false,
      status: "metadata_mismatch",
      message: "Exam, year or paper code does not match."
    };
  }

  const questionNumber = normalizeQuestionNumber(
    question.questionNumber
  );

  const officialAnswer = normalizeAnswer(
    answerKey.answers[questionNumber]
  );

  const suppliedAnswer = normalizeAnswer(
    question.correctAnswer
  );

  if (!questionNumber) {
    return {
      matched: false,
      status: "missing_question_number",
      message: "Question number is missing."
    };
  }

  if (!officialAnswer) {
    return {
      matched: false,
      status: "official_answer_missing",
      message: "Official answer not found."
    };
  }

  if (!suppliedAnswer) {
    return {
      matched: false,
      status: "supplied_answer_invalid",
      message: "Question answer is missing or invalid."
    };
  }

  const matched = officialAnswer === suppliedAnswer;

  return {
    matched,
    status: matched ? "answer_matched" : "answer_mismatch",
    suppliedAnswer,
    officialAnswer,
    requiresAdminReview: !matched
  };
}

/**
 * Match a complete question batch.
 */
export function matchAnswerKeyBatch(
  questions = [],
  answerKey
) {
  if (!Array.isArray(questions)) {
    throw new Error("Questions must be an array.");
  }

  const keyValidation = validateAnswerKey(answerKey);

  if (!keyValidation.valid) {
    return {
      valid: false,
      errors: keyValidation.errors,
      total: questions.length,
      matched: 0,
      mismatched: 0,
      unresolved: questions.length,
      results: []
    };
  }

  const results = questions.map((question) => ({
    questionId: question?.id || null,
    questionNumber: question?.questionNumber || null,
    ...matchQuestionAnswer(question, answerKey)
  }));

  const matched = results.filter(
    (item) => item.status === "answer_matched"
  ).length;

  const mismatched = results.filter(
    (item) => item.status === "answer_mismatch"
  ).length;

  return {
    valid: mismatched === 0,
    total: results.length,
    matched,
    mismatched,
    unresolved: results.length - matched - mismatched,
    results
  };
}

/**
 * Get questions requiring manual review.
 */
export function getQuestionsForManualReview(results = []) {
  if (!Array.isArray(results)) {
    return [];
  }

  return results.filter(
    (item) =>
      item.requiresAdminReview === true ||
      item.matched !== true
  );
}
