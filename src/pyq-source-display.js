// src/pyq-source-display.js

/**
 * Rajasthan PYQ Master
 * Official PYQ Source Information Display
 */

function safeText(value, fallback = "उपलब्ध नहीं") {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return fallback;
  }

  return String(value).trim();
}

function formatDate(date, language = "hi") {
  if (!date) {
    return safeText(null);
  }

  const parsedDate = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return safeText(null);
  }

  return new Intl.DateTimeFormat(
    language === "en" ? "en-IN" : "hi-IN",
    {
      day: "2-digit",
      month: "long",
      year: "numeric"
    }
  ).format(parsedDate);
}

/**
 * Prepare official PYQ metadata for display.
 */
export function getPYQSourceDetails(
  question,
  language = "hi"
) {
  if (!question || typeof question !== "object") {
    return null;
  }

  const isEnglish = language === "en";

  return {
    title: isEnglish
      ? "Previous Year Question"
      : "पिछले वर्ष का प्रश्न",

    examName: safeText(question.examName),

    year: safeText(question.year),

    examDate: formatDate(
      question.examDate,
      language
    ),

    shift: safeText(question.shift),

    examTime: safeText(
      question.examTime,
      isEnglish ? "Not provided" : "उपलब्ध नहीं"
    ),

    paperCode: safeText(question.paperCode),

    questionNumber: safeText(
      question.questionNumber,
      isEnglish ? "Not provided" : "उपलब्ध नहीं"
    ),

    source: safeText(question.source),

    sourceUrl: safeText(question.sourceUrl),

    answerKeySource: safeText(
      question.answerKeySource
    ),

    verificationStatus: getVerificationLabel(
      question.verificationStatus,
      language
    )
  };
}

/**
 * Localized verification status.
 */
export function getVerificationLabel(
  status,
  language = "hi"
) {
  const labels = {
    verified: {
      hi: "सत्यापित",
      en: "Verified"
    },

    pending_verification: {
      hi: "सत्यापन बाकी",
      en: "Pending Verification"
    },

    rejected: {
      hi: "अस्वीकृत",
      en: "Rejected"
    },

    draft: {
      hi: "ड्राफ्ट",
      en: "Draft"
    }
  };

  return (
    labels[status]?.[language === "en" ? "en" : "hi"] ||
    (language === "en" ? "Unknown" : "अज्ञात")
  );
}

/**
 * Check whether an official source link is usable.
 */
export function isValidSourceUrl(url) {
  try {
    const parsed = new URL(url);

    return (
      parsed.protocol === "https:" ||
      parsed.protocol === "http:"
    );
  } catch {
    return false;
  }
}

/**
 * Return source links only when they are valid URLs.
 */
export function getPYQSourceLinks(question) {
  if (!question || typeof question !== "object") {
    return [];
  }

  const links = [
    {
      label: "Original Question Paper",
      url: question.sourceUrl
    },
    {
      label: "Official Answer Key",
      url: question.answerKeySource
    }
  ];

  return links.filter(
    (item) => isValidSourceUrl(item.url)
  );
}
