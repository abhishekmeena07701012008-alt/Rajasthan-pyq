/**
 * RAJASTHAN PYQ MASTER
 * PYQ Import Preview & Validation Report
 *
 * Purpose:
 * - Preview questions before Firebase import
 * - Detect duplicate question IDs
 * - Detect missing bilingual content
 * - Detect missing source metadata
 * - Separate valid and invalid questions
 * - Generate an import summary
 *
 * Important:
 * This module does not publish or verify PYQs.
 * Final verification must happen through secure Cloud Functions.
 */

import { validateQuestion } from "./question-validator.js";
import { normalizeQuestion } from "./question-normalizer.js";

const REQUIRED_SOURCE_FIELDS = [
  "examName",
  "year",
  "source",
  "questionNumber"
];

function getQuestionId(question) {
  return String(
    question?.id ||
    question?.questionId ||
    ""
  ).trim();
}

function getQuestionText(question, language) {
  return String(
    question?.question?.[language] ||
    question?.translations?.[language]?.question ||
    question?.[language]?.question ||
    ""
  ).trim();
}

function getSourceMetadataIssues(question) {
  const issues = [];

  for (const field of REQUIRED_SOURCE_FIELDS) {
    const value = question?.[field];

    if (
      value === undefined ||
      value === null ||
      String(value).trim() === ""
    ) {
      issues.push(`Missing source metadata: ${field}`);
    }
  }

  return issues;
}

function checkBilingualContent(question) {
  const issues = [];

  const hindiQuestion = getQuestionText(question, "hi");
  const englishQuestion = getQuestionText(question, "en");

  if (!hindiQuestion) {
    issues.push("Hindi question is missing");
  }

  if (!englishQuestion) {
    issues.push("English question is missing");
  }

  return issues;
}

function checkQuestionOptions(question) {
  const issues = [];

  const options =
    question?.options ||
    question?.question?.options ||
    {};

  const hindiOptions = options?.hi;
  const englishOptions = options?.en;

  if (!hindiOptions || !englishOptions) {
    issues.push("Bilingual options are missing");
    return issues;
  }

  const keys = ["A", "B", "C", "D"];

  for (const key of keys) {
    if (!String(hindiOptions[key] || "").trim()) {
      issues.push(`Hindi option ${key} is missing`);
    }

    if (!String(englishOptions[key] || "").trim()) {
      issues.push(`English option ${key} is missing`);
    }
  }

  return issues;
}

function safeNormalize(question) {
  try {
    return normalizeQuestion(question);
  } catch (error) {
    return {
      normalizationError:
        error?.message || "Question normalization failed"
    };
  }
}

function safeValidate(question) {
  try {
    const result = validateQuestion(question);

    if (result === true) {
      return [];
    }

    if (Array.isArray(result)) {
      return result.map(String);
    }

    if (result && Array.isArray(result.errors)) {
      return result.errors.map(String);
    }

    if (result && result.valid === false) {
      return ["Question validation failed"];
    }

    return [];
  } catch (error) {
    return [
      error?.message || "Question validation failed"
    ];
  }
}

/**
 * Creates a preview report for imported questions.
 *
 * @param {Array} questions
 * @param {Array} existingQuestions
 * @returns {Object}
 */
export function createPYQImportPreview(
  questions = [],
  existingQuestions = []
) {
  if (!Array.isArray(questions)) {
    throw new TypeError("Questions must be an array");
  }

  if (!Array.isArray(existingQuestions)) {
    throw new TypeError(
      "Existing questions must be an array"
    );
  }

  const existingIds = new Set(
    existingQuestions
      .map(getQuestionId)
      .filter(Boolean)
  );

  const importedIds = new Set();

  const validQuestions = [];
  const invalidQuestions = [];
  const duplicateQuestions = [];

  const records = [];

  questions.forEach((originalQuestion, index) => {
    const issues = [];

    if (
      !originalQuestion ||
      typeof originalQuestion !== "object" ||
      Array.isArray(originalQuestion)
    ) {
      records.push({
        row: index + 1,
        status: "invalid",
        issues: ["Invalid question object"],
        question: originalQuestion
      });

      invalidQuestions.push(originalQuestion);
      return;
    }

    const question = safeNormalize(originalQuestion);

    if (question?.normalizationError) {
      issues.push(question.normalizationError);
    }

    const normalizedQuestion =
      question?.normalizationError
        ? originalQuestion
        : {
            ...originalQuestion,
            ...question
          };

    const questionId = getQuestionId(
      normalizedQuestion
    );

    if (!questionId) {
      issues.push("Question ID is missing");
    } else {
      if (existingIds.has(questionId)) {
        issues.push("Question already exists in database");
      }

      if (importedIds.has(questionId)) {
        issues.push("Duplicate ID inside import file");
      }

      importedIds.add(questionId);
    }

    issues.push(
      ...checkBilingualContent(normalizedQuestion)
    );

    issues.push(
      ...checkQuestionOptions(normalizedQuestion)
    );

    issues.push(
      ...getSourceMetadataIssues(normalizedQuestion)
    );

    issues.push(
      ...safeValidate(normalizedQuestion)
    );

    const uniqueIssues = [...new Set(issues)];

    const record = {
      row: index + 1,
      questionId: questionId || null,
      status: uniqueIssues.length ? "invalid" : "valid",
      issues: uniqueIssues,
      question: normalizedQuestion
    };

    records.push(record);

    if (
      uniqueIssues.some(issue =>
        String(issue).toLowerCase().includes("already exists") ||
        String(issue).toLowerCase().includes("duplicate")
      )
    ) {
      duplicateQuestions.push(record);
    }

    if (uniqueIssues.length) {
      invalidQuestions.push(record);
    } else {
      validQuestions.push(normalizedQuestion);
    }
  });

  return {
    success: true,

    generatedAt: new Date().toISOString(),

    summary: {
      total: questions.length,
      valid: validQuestions.length,
      invalid: invalidQuestions.length,
      duplicates: duplicateQuestions.length
    },

    validQuestions,
    invalidQuestions,
    duplicateQuestions,
    records
  };
}

/**
 * Exports the preview report as JSON.
 */
export function exportPYQPreviewJSON(report) {
  if (!report || typeof report !== "object") {
    throw new TypeError("Invalid preview report");
  }

  return JSON.stringify(report, null, 2);
}

/**
 * Creates a downloadable CSV report.
 */
export function exportPYQPreviewCSV(report) {
  if (!report || !Array.isArray(report.records)) {
    throw new TypeError("Invalid preview report");
  }

  const escapeCSV = value => {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
  };

  const rows = [
    [
      "Row",
      "Question ID",
      "Status",
      "Issues"
    ]
  ];

  report.records.forEach(record => {
    rows.push([
      record.row,
      record.questionId || "",
      record.status,
      (record.issues || []).join("; ")
    ]);
  });

  return rows
    .map(row => row.map(escapeCSV).join(","))
    .join("\n");
}

/**
 * Downloads a generated report in the browser.
 */
export function downloadPYQReport(
  content,
  filename = "pyq-import-report.json",
  mimeType = "application/json"
) {
  if (typeof document === "undefined") {
    throw new Error("Browser environment required");
  }

  const blob = new Blob(
    [content],
    { type: mimeType }
  );

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}
