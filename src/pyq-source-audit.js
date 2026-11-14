/**
 * RAJASTHAN PYQ MASTER
 * Official Source Audit
 *
 * Checks source URL metadata before PYQ review.
 * This module does NOT prove that a question is genuine.
 */

const OFFICIAL_DOMAINS = [
  "rsmssb.rajasthan.gov.in",
  "rssb.rajasthan.gov.in",
  "rpsc.rajasthan.gov.in",
  "rajasthan.gov.in"
];

function normalizeDomain(hostname) {
  return String(hostname || "")
    .toLowerCase()
    .replace(/^www\./, "");
}

function isOfficialDomain(hostname) {
  const domain = normalizeDomain(hostname);

  return OFFICIAL_DOMAINS.some(
    official =>
      domain === official ||
      domain.endsWith(`.${official}`)
  );
}

function inspectURL(value) {
  try {
    const url = new URL(String(value));

    if (url.protocol !== "https:") {
      return {
        valid: false,
        official: false,
        reason: "Source must use HTTPS"
      };
    }

    if (url.username || url.password) {
      return {
        valid: false,
        official: false,
        reason: "URL must not contain embedded credentials"
      };
    }

    const official = isOfficialDomain(url.hostname);

    return {
      valid: true,
      official,
      hostname: normalizeDomain(url.hostname),
      url: url.href,
      reason: official
        ? "Official domain recognized"
        : "Domain is not in the official domain list"
    };
  } catch {
    return {
      valid: false,
      official: false,
      reason: "Invalid source URL"
    };
  }
}

/**
 * Audits source information for one question.
 */
export function auditPYQSource(question = {}) {
  const sourceURL =
    question.source ||
    question.sourceUrl ||
    question.sourceURL ||
    "";

  const result = inspectURL(sourceURL);

  const issues = [];

  if (!result.valid) {
    issues.push(result.reason);
  } else if (!result.official) {
    issues.push("Source domain is not recognized as official");
  }

  if (!question.examName) {
    issues.push("Exam name is missing");
  }

  if (!question.year) {
    issues.push("Exam year is missing");
  }

  if (!question.questionNumber) {
    issues.push("Question number is missing");
  }

  if (!question.answerKeySource) {
    issues.push("Answer key source is missing");
  }

  return {
    sourceValid: result.valid,
    officialDomain: result.official,
    sourceDomain: result.hostname || null,
    sourceURL: result.url || null,
    issues,
    requiresManualReview: true,
    verificationStatus: "pending"
  };
}

/**
 * Audits multiple questions.
 */
export function auditPYQSources(questions = []) {
  if (!Array.isArray(questions)) {
    throw new TypeError("Questions must be an array");
  }

  const results = questions.map((question, index) => ({
    row: index + 1,
    questionId:
      question?.id ||
      question?.questionId ||
      null,
    audit: auditPYQSource(question)
  }));

  return {
    total: results.length,
    officialDomainCount: results.filter(
      item => item.audit.officialDomain
    ).length,
    invalidSourceCount: results.filter(
      item => !item.audit.sourceValid
    ).length,
    manualReviewCount: results.length,
    results
  };
}
