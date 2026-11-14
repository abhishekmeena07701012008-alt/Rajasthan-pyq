// src/question-validator.js

/**
 * Rajasthan PYQ Master
 * Question Data Validation
 *
 * Checks:
 * - Question text
 * - Four options
 * - Correct answer
 * - Hindi and English translations
 * - Exam, subject, topic and subtopic
 * - Authentic PYQ source information
 */

const VALID_DIFFICULTIES = [
  "easy",
  "medium",
  "hard"
];

const VALID_TYPES = [
  "verified_pyq",
  "ai_practice",
  "practice"
];

const VALID_ANSWERS = ["A", "B", "C", "D"];

function isNonEmptyString(value) {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

function validateOptions(options, language) {
  const errors = [];

  if (!Array.isArray(options)) {
    return [`${language}: Options must be an array.`];
  }

  if (options.length !== 4) {
    errors.push(
      `${language}: Exactly four options are required.`
    );
  }

  options.forEach((option, index) => {
    if (!isNonEmptyString(option)) {
      errors.push(
        `${language}: Option ${index + 1} is missing.`
      );
    }
  });

  return errors;
}

function validateTranslation(translation, language) {
  const errors = [];

  if (!translation || typeof translation !== "object") {
    return [`${language}: Translation is missing.`];
  }

  if (!isNonEmptyString(translation.question)) {
    errors.push(
      `${language}: Question text is missing.`
    );
  }

  errors.push(
    ...validateOptions(translation.options, language)
  );

  if (!isNonEmptyString(translation.explanation)) {
    errors.push(
      `${language}: Explanation is missing.`
    );
  }

  return errors;
}

export function validateQuestion(question = {}) {
  const errors = [];
  const warnings = [];

  if (!question || typeof question !== "object") {
    return {
      valid: false,
      errors: ["Invalid question object."],
      warnings
    };
  }

  // Unique question ID
  if (!isNonEmptyString(question.id)) {
    errors.push("Question ID is required.");
  }

  // Question type
  if (!VALID_TYPES.includes(question.questionType)) {
    errors.push("Invalid question type.");
  }

  // Exam
  if (!isNonEmptyString(question.examId)) {
    errors.push("Exam ID is required.");
  }

  // Subject
  if (!isNonEmptyString(question.subjectId)) {
    errors.push("Subject ID is required.");
  }

  // Topic
  if (!isNonEmptyString(question.topicId)) {
    errors.push("Topic ID is required.");
  }

  // Subtopic
  if (!isNonEmptyString(question.subtopicId)) {
    errors.push("Subtopic ID is required.");
  }

  // Hindi content
  errors.push(
    ...validateTranslation(
      question.translations?.hi,
      "Hindi"
    )
  );

  // English content
  errors.push(
    ...validateTranslation(
      question.translations?.en,
      "English"
    )
  );

  // Correct answer
  if (!VALID_ANSWERS.includes(question.correctAnswer)) {
    errors.push(
      "Correct answer must be A, B, C or D."
    );
  }

  // Explanation
  if (
    !isNonEmptyString(
      question.translations?.hi?.explanation
    ) ||
    !isNonEmptyString(
      question.translations?.en?.explanation
    )
  ) {
    warnings.push(
      "Both language explanations should be reviewed."
    );
  }

  // Difficulty
  if (
    !VALID_DIFFICULTIES.includes(question.difficulty)
  ) {
    errors.push("Invalid difficulty level.");
  }

  // PYQ authenticity
  if (question.questionType === "verified_pyq") {
    if (!isNonEmptyString(question.source)) {
      errors.push(
        "Verified PYQ requires a source."
      );
    }

    if (!Number.isInteger(Number(question.year))) {
      errors.push(
        "Verified PYQ requires a valid exam year."
      );
    }

    if (!isNonEmptyString(question.examName)) {
      errors.push(
        "Verified PYQ requires an exam name."
      );
    }

    if (!isNonEmptyString(question.verificationStatus)) {
      errors.push(
        "PYQ verification status is required."
      );
    }

    if (
      question.verificationStatus !== "verified"
    ) {
      errors.push(
        "PYQ must be verified before publishing."
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate multiple questions.
 */
export function validateQuestionBatch(questions = []) {
  if (!Array.isArray(questions)) {
    return {
      valid: false,
      total: 0,
      passed: 0,
      failed: 0,
      results: []
    };
  }

  const results = questions.map((question, index) => ({
    index,
    id: question?.id || null,
    ...validateQuestion(question)
  }));

  const passed = results.filter(
    (result) => result.valid
  ).length;

  return {
    valid: passed === questions.length,
    total: questions.length,
    passed,
    failed: questions.length - passed,
    results
  };
}

/**
 * Detect duplicate question IDs.
 */
export function findDuplicateQuestionIds(questions = []) {
  const seen = new Set();
  const duplicates = new Set();

  questions.forEach((question) => {
    const id = question?.id;

    if (!id) return;

    if (seen.has(id)) {
      duplicates.add(id);
    } else {
      seen.add(id);
    }
  });

  return [...duplicates];
}
