// src/pyq-verification-workflow.js

/**
 * Rajasthan PYQ Master
 * PYQ Verification Workflow
 *
 * This module manages verification status.
 * It does not independently prove authenticity.
 */

export const PYQ_STATUS = Object.freeze({
  DRAFT: "draft",
  PENDING: "pending_verification",
  VERIFIED: "verified",
  REJECTED: "rejected"
});

const REQUIRED_FIELDS = [
  "examName",
  "year",
  "examDate",
  "shift",
  "paperCode",
  "sourceUrl",
  "answerKeySource"
];

function isValidString(value) {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

function validateSourceData(question) {
  const errors = [];

  REQUIRED_FIELDS.forEach((field) => {
    if (
      question[field] === undefined ||
      question[field] === null ||
      question[field] === ""
    ) {
      errors.push(`${field} is required.`);
    }
  });

  if (
    question.examDate &&
    !/^\d{4}-\d{2}-\d{2}$/.test(question.examDate)
  ) {
    errors.push("Exam date must use YYYY-MM-DD format.");
  }

  if (
    question.year &&
    !Number.isInteger(Number(question.year))
  ) {
    errors.push("Invalid examination year.");
  }

  if (!isValidString(question.sourceUrl)) {
    errors.push("Original question paper source is missing.");
  }

  if (!isValidString(question.answerKeySource)) {
    errors.push("Official answer key source is missing.");
  }

  return errors;
}

/**
 * Prepare a question for admin verification.
 */
export function preparePYQForVerification(question) {
  if (!question || typeof question !== "object") {
    throw new Error("Invalid question data.");
  }

  const errors = validateSourceData(question);

  if (errors.length > 0) {
    return {
      success: false,
      status: PYQ_STATUS.DRAFT,
      errors,
      question: null
    };
  }

  return {
    success: true,
    status: PYQ_STATUS.PENDING,
    errors: [],
    question: {
      ...question,
      questionType: "verified_pyq",
      verificationStatus: PYQ_STATUS.PENDING,
      isPublished: false,
      verificationHistory: []
    }
  };
}

/**
 * Record an admin verification decision.
 */
export function reviewPYQ(
  question,
  decision,
  adminId,
  remarks = ""
) {
  if (!question || typeof question !== "object") {
    throw new Error("Question not found.");
  }

  if (!isValidString(adminId)) {
    throw new Error("Admin ID is required.");
  }

  if (
    decision !== PYQ_STATUS.VERIFIED &&
    decision !== PYQ_STATUS.REJECTED
  ) {
    throw new Error("Invalid verification decision.");
  }

  const historyEntry = {
    decision,
    adminId,
    remarks: String(remarks).trim(),
    reviewedAt: new Date().toISOString()
  };

  return {
    ...question,
    verificationStatus: decision,
    isPublished: decision === PYQ_STATUS.VERIFIED,
    verificationHistory: [
      ...(question.verificationHistory || []),
      historyEntry
    ]
  };
}

/**
 * Check whether a question can be published.
 */
export function canPublishPYQ(question) {
  if (!question || typeof question !== "object") {
    return false;
  }

  return (
    question.questionType === "verified_pyq" &&
    question.verificationStatus === PYQ_STATUS.VERIFIED &&
    question.isPublished === true &&
    isValidString(question.sourceUrl) &&
    isValidString(question.answerKeySource)
  );
}

/**
 * Get verification summary.
 */
export function getPYQVerificationSummary(questions = []) {
  if (!Array.isArray(questions)) {
    throw new Error("Questions must be an array.");
  }

  return {
    total: questions.length,

    draft: questions.filter(
      q => q.verificationStatus === PYQ_STATUS.DRAFT
    ).length,

    pending: questions.filter(
      q => q.verificationStatus === PYQ_STATUS.PENDING
    ).length,

    verified: questions.filter(
      q => q.verificationStatus === PYQ_STATUS.VERIFIED
    ).length,

    rejected: questions.filter(
      q => q.verificationStatus === PYQ_STATUS.REJECTED
    ).length,

    published: questions.filter(
      canPublishPYQ
    ).length
  };
}
