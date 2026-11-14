// src/pyq-paper-importer.js

/**
 * Rajasthan PYQ Master
 * Previous Year Paper Importer
 *
 * This module prepares extracted paper data.
 * It does not download PDFs or perform OCR.
 * It never marks questions as verified automatically.
 */

import { validateQuestion } from "./question-validator.js";
import { normalizeQuestion } from "./question-normalizer.js";

function clean(value) {
  return value === null || value === undefined
    ? ""
    : String(value).trim();
}

function createQuestionId(question, paper) {
  return [
    clean(paper.examId),
    clean(paper.year),
    clean(paper.paperCode),
    clean(question.questionNumber)
  ].join("_").toLowerCase();
}

function validatePaperMetadata(paper) {
  const errors = [];

  if (!clean(paper?.examId)) {
    errors.push("Exam ID is required.");
  }

  if (!clean(paper?.examName)) {
    errors.push("Exam name is required.");
  }

  if (!paper?.year) {
    errors.push("Exam year is required.");
  }

  if (!clean(paper?.paperCode)) {
    errors.push("Paper code is required.");
  }

  if (!clean(paper?.sourceUrl)) {
    errors.push("Original paper source URL is required.");
  }

  if (!clean(paper?.answerKeySource)) {
    errors.push("Official answer key source is required.");
  }

  return errors;
}

/**
 * Prepare one extracted question.
 */
export function prepareImportedPYQ(question, paper) {
  const errors = validatePaperMetadata(paper);

  if (!question || typeof question !== "object") {
    errors.push("Invalid question data.");
  }

  if (!clean(question?.questionNumber)) {
    errors.push("Question number is required.");
  }

  if (errors.length > 0) {
    return {
      success: false,
      errors,
      question: null
    };
  }

  const rawQuestion = {
    ...question,

    id: createQuestionId(question, paper),

    questionType: "verified_pyq",

    examId: paper.examId,
    examName: paper.examName,
    year: Number(paper.year),

    examDate: clean(paper.examDate),
    shift: clean(paper.shift),
    examTime: clean(paper.examTime),

    paperCode: paper.paperCode,

    source: paper.sourceName || paper.examName,
    sourceUrl: paper.sourceUrl,
    answerKeySource: paper.answerKeySource,

    verificationStatus: "pending_verification",
    isPublished: false
  };

  try {
    const normalized = normalizeQuestion(rawQuestion);

    const validation = validateQuestion(normalized);

    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors,
        warnings: validation.warnings,
        question: normalized
      };
    }

    return {
      success: true,
      errors: [],
      warnings: validation.warnings,
      question: {
        ...normalized,
        questionNumber: clean(question.questionNumber),
        examDate: clean(paper.examDate),
        examTime: clean(paper.examTime),
        answerKeySource: clean(paper.answerKeySource),
        verificationStatus: "pending_verification",
        isPublished: false
      }
    };
  } catch (error) {
    return {
      success: false,
      errors: [error.message],
      question: null
    };
  }
}

/**
 * Prepare an entire paper import.
 */
export function preparePaperImport(paper, questions = []) {
  if (!Array.isArray(questions)) {
    throw new Error("Questions must be an array.");
  }

  const results = questions.map((question) =>
    prepareImportedPYQ(question, paper)
  );

  const successful = results.filter(
    (result) => result.success
  );

  const failed = results.filter(
    (result) => !result.success
  );

  return {
    examName: clean(paper?.examName),
    year: paper?.year || null,
    paperCode: clean(paper?.paperCode),

    total: questions.length,
    successful: successful.length,
    failed: failed.length,

    questions: successful.map(
      (result) => result.question
    ),

    errors: failed.map((result, index) => ({
      index,
      errors: result.errors
    })),

    readyForAdminReview: successful.length > 0
  };
}

/**
 * Detect duplicate question IDs in an import.
 */
export function findImportDuplicates(questions = []) {
  const seen = new Set();
  const duplicates = new Set();

  questions.forEach((question) => {
    const id = clean(question?.id);

    if (!id) return;

    if (seen.has(id)) {
      duplicates.add(id);
    } else {
      seen.add(id);
    }
  });

  return [...duplicates];
}
