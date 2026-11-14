// src/pyq-source-registry.js

/**
 * Rajasthan PYQ Master
 * Official Previous Year Paper Source Registry
 *
 * IMPORTANT:
 * This registry stores source references.
 * It does not automatically verify question authenticity.
 */

export const OFFICIAL_SOURCE_REGISTRY = [
  {
    id: "rssb_cet_2024_sr_sec",
    board: "RSSB",
    examName: "CET Senior Secondary",
    year: 2024,
    questionPaperArchive:
      "https://rsmssb.rajasthan.gov.in/show_archived?menuName=Xj4lCb9vGxpQnfLs%2FxlZ2g%3D%3D&theme=Default",
    answerKeyArchive:
      "https://rsmssb.rajasthan.gov.in/show_archived?menuName=AGDAnN3xlANlxQ9BZvzaeg%3D%3D&theme=Red",
    paperCodes: ["V23", "P12", "T19", "R15", "Q13", "S17"],
    status: "source_listed"
  },
  {
    id: "rssb_cet_graduate_2022",
    board: "RSSB",
    examName: "CET Graduation Level",
    year: 2022,
    questionPaperArchive:
      "https://rsmssb.rajasthan.gov.in/show_archived?menuName=Xj4lCb9vGxpQnfLs%2FxlZ2g%3D%3D&theme=Default",
    answerKeyArchive:
      "https://rsmssb.rajasthan.gov.in/show_archived?menuName=AGDAnN3xlANlxQ9BZvzaeg%3D%3D&theme=Red",
    paperCodes: ["131A", "131B", "131C", "131D"],
    status: "source_listed"
  },
  {
    id: "rssb_patwar_2021",
    board: "RSSB",
    examName: "Patwar",
    year: 2021,
    questionPaperArchive:
      "https://rsmssb.rajasthan.gov.in/show_archived?menuName=Xj4lCb9vGxpQnfLs%2FxlZ2g%3D%3D&theme=Default",
    answerKeyArchive:
      "https://rsmssb.rajasthan.gov.in/show_archived?menuName=AGDAnN3xlANlxQ9BZvzaeg%3D%3D&theme=Red",
    paperCodes: ["104A", "104B", "104C", "104D"],
    examDates: [
      "2021-10-23",
      "2021-10-24"
    ],
    status: "source_listed"
  },
  {
    id: "rssb_vdo_2021",
    board: "RSSB",
    examName: "Village Development Officer",
    year: 2021,
    questionPaperArchive:
      "https://rsmssb.rajasthan.gov.in/show_archived?menuName=Xj4lCb9vGxpQnfLs%2FxlZ2g%3D%3D&theme=Default",
    answerKeyArchive:
      "https://rsmssb.rajasthan.gov.in/show_archived?menuName=AGDAnN3xlANlxQ9BZvzaeg%3D%3D&theme=Red",
    examDates: [
      "2021-12-27",
      "2021-12-28"
    ],
    shifts: ["Morning", "Evening"],
    status: "source_listed"
  }
];

/**
 * Find source by ID.
 */
export function getPYQSource(sourceId) {
  return (
    OFFICIAL_SOURCE_REGISTRY.find(
      (source) => source.id === sourceId
    ) || null
  );
}

/**
 * Find sources by exam name.
 */
export function getSourcesByExam(examName) {
  const search = String(examName || "").toLowerCase();

  return OFFICIAL_SOURCE_REGISTRY.filter(
    (source) =>
      source.examName.toLowerCase().includes(search)
  );
}

/**
 * Find sources by year.
 */
export function getSourcesByYear(year) {
  return OFFICIAL_SOURCE_REGISTRY.filter(
    (source) => Number(source.year) === Number(year)
  );
}

/**
 * Check whether a question has source metadata.
 * This is not proof of authenticity.
 */
export function hasSourceMetadata(question) {
  return Boolean(
    question &&
    question.source &&
    question.sourceUrl &&
    question.examName &&
    question.year &&
    question.paperCode
  );
}

/**
 * Check whether a PYQ has complete exam metadata.
 */
export function validatePYQMetadata(question) {
  const errors = [];

  if (!question?.examName) errors.push("Exam name missing.");
  if (!question?.year) errors.push("Exam year missing.");
  if (!question?.examDate) errors.push("Exam date missing.");
  if (!question?.shift) errors.push("Exam shift missing.");
  if (!question?.paperCode) errors.push("Paper code missing.");
  if (!question?.sourceUrl) errors.push("Source URL missing.");
  if (!question?.answerKeySource) {
    errors.push("Answer key source missing.");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
