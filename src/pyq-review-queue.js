// src/pyq-review-queue.js

/**
 * Rajasthan PYQ Master
 * Admin PYQ Review Queue
 *
 * Frontend helper only.
 * Actual admin authorization and database writes
 * must be enforced by Firebase Cloud Functions.
 */

const STATUSES = {
  PENDING: "pending_verification",
  VERIFIED: "verified",
  REJECTED: "rejected",
  DRAFT: "draft"
};

function hasText(value) {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

function hasValidUrl(value) {
  if (!hasText(value)) return false;

  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Check whether essential source information exists.
 */
export function checkPYQSourceCompleteness(question = {}) {
  const missing = [];

  const requiredFields = [
    ["examName", "Exam name"],
    ["year", "Exam year"],
    ["examDate", "Exam date"],
    ["shift", "Exam shift"],
    ["paperCode", "Paper code"],
    ["questionNumber", "Question number"]
  ];

  requiredFields.forEach(([field, label]) => {
    if (
      question[field] === undefined ||
      question[field] === null ||
      String(question[field]).trim() === ""
    ) {
      missing.push(label);
    }
  });

  if (!hasValidUrl(question.sourceUrl)) {
    missing.push("HTTPS original paper source");
  }

  if (!hasValidUrl(question.answerKeySource)) {
    missing.push("HTTPS official answer key source");
  }

  return {
    complete: missing.length === 0,
    missing
  };
}

/**
 * Filter questions for the admin review queue.
 */
export function getPYQReviewQueue(
  questions = [],
  filters = {}
) {
  if (!Array.isArray(questions)) {
    return [];
  }

  const {
    examId = "all",
    year = "all",
    status = STATUSES.PENDING,
    search = ""
  } = filters;

  const searchText = String(search).trim().toLowerCase();

  return questions
    .filter((question) => {
      if (!question || typeof question !== "object") {
        return false;
      }

      if (
        question.questionType !== "verified_pyq"
      ) {
        return false;
      }

      if (
        status !== "all" &&
        question.verificationStatus !== status
      ) {
        return false;
      }

      if (
        examId !== "all" &&
        question.examId !== examId
      ) {
        return false;
      }

      if (
        year !== "all" &&
        String(question.year) !== String(year)
      ) {
        return false;
      }

      if (searchText) {
        const searchable = [
          question.examName,
          question.paperCode,
          question.questionNumber,
          question.translations?.hi?.question,
          question.translations?.en?.question
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!searchable.includes(searchText)) {
          return false;
        }
      }

      return true;
    })
    .map((question) => ({
      ...question,
      sourceCheck: checkPYQSourceCompleteness(question)
    }));
}

/**
 * Summarize verification queue.
 */
export function getPYQReviewQueueStats(questions = []) {
  if (!Array.isArray(questions)) {
    throw new Error("Questions must be an array.");
  }

  const pyqs = questions.filter(
    (question) =>
      question?.questionType === "verified_pyq"
  );

  const pending = pyqs.filter(
    (q) => q.verificationStatus === STATUSES.PENDING
  );

  return {
    totalPYQ: pyqs.length,

    pending: pending.length,

    verified: pyqs.filter(
      (q) => q.verificationStatus === STATUSES.VERIFIED
    ).length,

    rejected: pyqs.filter(
      (q) => q.verificationStatus === STATUSES.REJECTED
    ).length,

    drafts: pyqs.filter(
      (q) => q.verificationStatus === STATUSES.DRAFT
    ).length,

    incompleteSources: pending.filter(
      (q) => !checkPYQSourceCompleteness(q).complete
    ).length
  };
}

/**
 * Sort review queue.
 */
export function sortPYQReviewQueue(
  questions = [],
  sortBy = "oldest"
) {
  const result = [...questions];

  if (sortBy === "newest") {
    return result.sort(
      (a, b) =>
        new Date(b.createdAt || 0) -
        new Date(a.createdAt || 0)
    );
  }

  if (sortBy === "oldest") {
    return result.sort(
      (a, b) =>
        new Date(a.createdAt || 0) -
        new Date(b.createdAt || 0)
    );
  }

  if (sortBy === "year") {
    return result.sort(
      (a, b) =>
        Number(b.year || 0) -
        Number(a.year || 0)
    );
  }

  return result;
}
