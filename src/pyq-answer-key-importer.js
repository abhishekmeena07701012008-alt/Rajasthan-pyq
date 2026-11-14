// src/pyq-answer-key-importer.js

/**
 * Rajasthan PYQ Master
 * Official Answer Key Importer
 *
 * Accepts structured answer-key data.
 * Does not invent answers or verify authenticity itself.
 */

const VALID_ANSWERS = ["A", "B", "C", "D"];

function clean(value) {
  return value === null || value === undefined
    ? ""
    : String(value).trim();
}

function normalizeAnswer(value) {
  const answer = clean(value).toUpperCase();

  return VALID_ANSWERS.includes(answer)
    ? answer
    : "";
}

/**
 * Validate answer-key metadata.
 */
export function validateAnswerKeyMetadata(metadata = {}) {
  const errors = [];

  if (!clean(metadata.examId)) {
    errors.push("Exam ID is required.");
  }

  if (!clean(metadata.examName)) {
    errors.push("Exam name is required.");
  }

  if (!Number.isInteger(Number(metadata.year))) {
    errors.push("Valid exam year is required.");
  }

  if (!clean(metadata.paperCode)) {
    errors.push("Paper code is required.");
  }

  if (!clean(metadata.sourceUrl)) {
    errors.push("Official source URL is required.");
  }

  if (!clean(metadata.examDate)) {
    errors.push("Exam date is required.");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Prepare answer-key records.
 *
 * Input:
 * [
 *   { questionNumber: 1, answer: "B" },
 *   { questionNumber: 2, answer: "D" }
 * ]
 */
export function prepareAnswerKeyImport(
  metadata = {},
  records = []
) {
  if (!Array.isArray(records)) {
    throw new Error("Answer key records must be an array.");
  }

  const metadataValidation =
    validateAnswerKeyMetadata(metadata);

  if (!metadataValidation.valid) {
    return {
      success: false,
      errors: metadataValidation.errors,
      answerKey: null
    };
  }

  const answers = {};
  const errors = [];
  const seen = new Set();

  records.forEach((record, index) => {
    const questionNumber = clean(
      record?.questionNumber
    );

    const answer = normalizeAnswer(record?.answer);

    if (!questionNumber) {
      errors.push({
        index,
        error: "Question number is missing."
      });
      return;
    }

    if (!answer) {
      errors.push({
        index,
        questionNumber,
        error: "Invalid answer. Expected A, B, C or D."
      });
      return;
    }

    if (seen.has(questionNumber)) {
      errors.push({
        index,
        questionNumber,
        error: "Duplicate question number."
      });
      return;
    }

    seen.add(questionNumber);
    answers[questionNumber] = answer;
  });

  const answerCount = Object.keys(answers).length;

  return {
    success: answerCount > 0 && errors.length === 0,

    totalRecords: records.length,
    importedAnswers: answerCount,
    rejectedRecords: errors.length,

    errors,

    answerKey: {
      examId: clean(metadata.examId),
      examName: clean(metadata.examName),
      year: Number(metadata.year),
      examDate: clean(metadata.examDate),
      shift: clean(metadata.shift),
      paperCode: clean(metadata.paperCode),

      sourceUrl: clean(metadata.sourceUrl),

      answers,

      verificationStatus: "pending_verification",
      isPublished: false
    }
  };
}

/**
 * Export answer key as CSV.
 */
export function exportAnswerKeyCSV(answerKey) {
  if (
    !answerKey ||
    !answerKey.answers ||
    typeof answerKey.answers !== "object"
  ) {
    throw new Error("Invalid answer key.");
  }

  const rows = [
    ["Question Number", "Official Answer"]
  ];

  Object.entries(answerKey.answers)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .forEach(([number, answer]) => {
      rows.push([number, answer]);
    });

  return rows
    .map((row) =>
      row.map((value) => {
        const text = String(value ?? "");
        return `"${text.replace(/"/g, '""')}"`;
      }).join(",")
    )
    .join("\n");
}
