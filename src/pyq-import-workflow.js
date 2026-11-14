/**
 * RAJASTHAN PYQ MASTER
 * PYQ Import Workflow
 *
 * Combines:
 * 1. Question import preview
 * 2. Source audit
 *
 * This module does not upload or publish questions.
 */

import {
  createPYQImportPreview
} from "./pyq-import-preview.js";

import {
  auditPYQSources
} from "./pyq-source-audit.js";

/**
 * Runs the complete pre-import review.
 */
export function runPYQImportWorkflow(
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

  const preview = createPYQImportPreview(
    questions,
    existingQuestions
  );

  const sourceAudit = auditPYQSources(questions);

  const sourceResults = new Map(
    sourceAudit.results.map(item => [
      String(item.questionId || ""),
      item.audit
    ])
  );

  const reviewedQuestions = preview.records.map(record => {
    const source = sourceResults.get(
      String(record.questionId || "")
    );

    const sourceIssues = source?.issues || [];

    return {
      ...record,

      sourceAudit: source || null,

      allIssues: [
        ...new Set([
          ...(record.issues || []),
          ...sourceIssues
        ])
      ]
    };
  });

  const readyForAdminReview = reviewedQuestions.filter(
    item =>
      item.allIssues.length === 0 &&
      item.sourceAudit?.officialDomain === true
  );

  const needsCorrection = reviewedQuestions.filter(
    item => item.allIssues.length > 0
  );

  return {
    success: true,

    generatedAt: new Date().toISOString(),

    summary: {
      total: questions.length,
      validPreview: preview.summary.valid,
      invalidPreview: preview.summary.invalid,
      officialSources: sourceAudit.officialDomainCount,
      invalidSources: sourceAudit.invalidSourceCount,
      readyForAdminReview: readyForAdminReview.length,
      needsCorrection: needsCorrection.length
    },

    reviewedQuestions,
    readyForAdminReview,
    needsCorrection,

    notice:
      "Ready for Admin Review does not mean Verified PYQ. " +
      "An authorized Admin must compare the original paper " +
      "and official answer key before verification."
  };
}
