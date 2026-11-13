import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getDoc,
  doc,
  startAfter,
  Timestamp
} from "firebase/firestore";

import { db } from "./firebase.js";

/*
|--------------------------------------------------------------------------
| CONFIGURATION
|--------------------------------------------------------------------------
*/

export const CURRENT_AFFAIRS_CONFIG = {
  COLLECTION: "currentAffairs",
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  DEFAULT_LANGUAGE: "hi"
};

export const CURRENT_AFFAIRS_STATUS = {
  DRAFT: "draft",
  PUBLISHED: "published",
  ARCHIVED: "archived"
};

export const CURRENT_AFFAIRS_CATEGORIES = [
  { id: "national", hi: "राष्ट्रीय घटनाएँ", en: "National Affairs" },
  { id: "international", hi: "अंतरराष्ट्रीय घटनाएँ", en: "International Affairs" },
  { id: "rajasthan", hi: "राजस्थान करेंट अफेयर्स", en: "Rajasthan Current Affairs" },
  { id: "politics", hi: "राजनीति", en: "Politics" },
  { id: "economy", hi: "अर्थव्यवस्था", en: "Economy" },
  { id: "science", hi: "विज्ञान एवं तकनीक", en: "Science & Technology" },
  { id: "environment", hi: "पर्यावरण", en: "Environment" },
  { id: "sports", hi: "खेल", en: "Sports" },
  { id: "awards", hi: "पुरस्कार एवं सम्मान", en: "Awards & Honours" },
  { id: "appointments", hi: "नियुक्तियाँ", en: "Appointments" },
  { id: "government-schemes", hi: "सरकारी योजनाएँ", en: "Government Schemes" },
  { id: "reports", hi: "रिपोर्ट एवं सूचकांक", en: "Reports & Indices" },
  { id: "important-days", hi: "महत्वपूर्ण दिवस", en: "Important Days" },
  { id: "other", hi: "अन्य", en: "Other" }
];

/*
|--------------------------------------------------------------------------
| LANGUAGE HELPERS
|--------------------------------------------------------------------------
*/

function normalizeLanguage(language) {
  return language === "en" ? "en" : "hi";
}

export function getLocalizedValue(value, language = "hi") {
  const lang = normalizeLanguage(language);

  if (typeof value === "string") {
    return value;
  }

  if (!value || typeof value !== "object") {
    return "";
  }

  return value[lang] || value.hi || value.en || "";
}

/*
|--------------------------------------------------------------------------
| DATE HELPERS
|--------------------------------------------------------------------------
*/

export function getIndiaDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  const result = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      result[part.type] = part.value;
    }
  }

  return `${result.year}-${result.month}-${result.day}`;
}

export function formatCurrentAffairsDate(
  dateValue,
  language = "hi"
) {
  if (!dateValue) return "";

  let date;

  if (dateValue instanceof Date) {
    date = dateValue;
  } else if (dateValue?.toDate) {
    date = dateValue.toDate();
  } else {
    date = new Date(dateValue);
  }

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(
    normalizeLanguage(language) === "hi" ? "hi-IN" : "en-IN",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Kolkata"
    }
  ).format(date);
}

/*
|--------------------------------------------------------------------------
| DOCUMENT NORMALIZATION
|--------------------------------------------------------------------------
*/

function normalizeCurrentAffairs(id, data) {
  return {
    id,

    title: data.title || {},
    summary: data.summary || {},
    content: data.content || {},
    keyPoints: data.keyPoints || {},
    facts: data.facts || {},
    question: data.question || {},
    explanation: data.explanation || {},

    category: data.category || "other",

    tags: Array.isArray(data.tags) ? data.tags : [],
    examIds: Array.isArray(data.examIds)
      ? data.examIds
      : [],

    language: data.language || "both",

    eventDate: data.eventDate || null,
    publishedAt: data.publishedAt || null,
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,

    source: data.source || null,
    sourceUrl: data.sourceUrl || null,

    status: data.status || CURRENT_AFFAIRS_STATUS.DRAFT,

    isImportant: Boolean(data.isImportant),
    isVerified: Boolean(data.isVerified),

    difficulty: data.difficulty || "medium"
  };
}

/*
|--------------------------------------------------------------------------
| FETCH SINGLE CURRENT AFFAIR
|--------------------------------------------------------------------------
*/

export async function getCurrentAffairById(id) {
  if (!id) {
    throw new Error("Current Affairs ID आवश्यक है।");
  }

  try {
    const reference = doc(
      db,
      CURRENT_AFFAIRS_CONFIG.COLLECTION,
      id
    );

    const snapshot = await getDoc(reference);

    if (!snapshot.exists()) {
      return null;
    }

    const data = normalizeCurrentAffairs(
      snapshot.id,
      snapshot.data()
    );

    if (data.status !== CURRENT_AFFAIRS_STATUS.PUBLISHED) {
      return null;
    }

    return data;

  } catch (error) {
    console.error("Current affair fetch error:", error);
    throw new Error("Current Affairs लोड नहीं हो पाया।");
  }
}

/*
|--------------------------------------------------------------------------
| BUILD FIRESTORE FILTER QUERY
|--------------------------------------------------------------------------
*/

function buildCurrentAffairsQuery(filters = {}, pageSize = 20) {
  const constraints = [];

  constraints.push(
    where("status", "==", CURRENT_AFFAIRS_STATUS.PUBLISHED)
  );

  if (filters.category) {
    constraints.push(
      where("category", "==", filters.category)
    );
  }

  if (filters.examId) {
    constraints.push(
      where("examIds", "array-contains", filters.examId)
    );
  }

  if (filters.important === true) {
    constraints.push(
      where("isImportant", "==", true)
    );
  }

  if (filters.verified === true) {
    constraints.push(
      where("isVerified", "==", true)
    );
  }

  if (filters.startDate) {
    constraints.push(
      where("eventDate", ">=", filters.startDate)
    );
  }

  if (filters.endDate) {
    constraints.push(
      where("eventDate", "<=", filters.endDate)
    );
  }

  constraints.push(orderBy("publishedAt", "desc"));
  constraints.push(limit(pageSize));

  return query(
    collection(db, CURRENT_AFFAIRS_CONFIG.COLLECTION),
    ...constraints
  );
}

/*
|--------------------------------------------------------------------------
| FETCH CURRENT AFFAIRS PAGE
|--------------------------------------------------------------------------
*/

export async function getCurrentAffairs(filters = {}, options = {}) {
  const pageSize = Math.min(
    Math.max(
      Number(options.pageSize) ||
        CURRENT_AFFAIRS_CONFIG.DEFAULT_PAGE_SIZE,
      1
    ),
    CURRENT_AFFAIRS_CONFIG.MAX_PAGE_SIZE
  );

  try {
    const constraints = [];

    constraints.push(
      where("status", "==", CURRENT_AFFAIRS_STATUS.PUBLISHED)
    );

    if (filters.category) {
      constraints.push(
        where("category", "==", filters.category)
      );
    }

    if (filters.examId) {
      constraints.push(
        where("examIds", "array-contains", filters.examId)
      );
    }

    if (filters.important === true) {
      constraints.push(
        where("isImportant", "==", true)
      );
    }

    if (filters.verified === true) {
      constraints.push(
        where("isVerified", "==", true)
      );
    }

    if (filters.startDate) {
      constraints.push(
        where("eventDate", ">=", filters.startDate)
      );
    }

    if (filters.endDate) {
      constraints.push(
        where("eventDate", "<=", filters.endDate)
      );
    }

    constraints.push(orderBy("publishedAt", "desc"));

    if (options.lastDocument) {
      constraints.push(startAfter(options.lastDocument));
    }

    constraints.push(limit(pageSize));

    const affairsQuery = query(
      collection(db, CURRENT_AFFAIRS_CONFIG.COLLECTION),
      ...constraints
    );

    const snapshot = await getDocs(affairsQuery);

    const items = snapshot.docs.map(item =>
      normalizeCurrentAffairs(
        item.id,
        item.data()
      )
    );

    return {
      items,
      lastDocument: snapshot.docs.length
        ? snapshot.docs[snapshot.docs.length - 1]
        : null,
      hasMore: snapshot.docs.length === pageSize,
      count: items.length
    };

  } catch (error) {
    console.error("Current affairs list error:", error);
    throw new Error(
      "Current Affairs की सूची लोड नहीं हो सकी।"
    );
  }
}

/*
|--------------------------------------------------------------------------
| FETCH TODAY'S CURRENT AFFAIRS
|--------------------------------------------------------------------------
*/

export async function getTodayCurrentAffairs(options = {}) {
  const today = getIndiaDateKey();

  return getCurrentAffairs(
    {
      startDate: today,
      endDate: today
    },
    options
  );
}

/*
|--------------------------------------------------------------------------
| CATEGORY HELPERS
|--------------------------------------------------------------------------
*/

export function getCurrentAffairsCategories(language = "hi") {
  const lang = normalizeLanguage(language);

  return CURRENT_AFFAIRS_CATEGORIES.map(category => ({
    id: category.id,
    name: category[lang]
  }));
}

export function getCurrentAffairsCategoryName(
  categoryId,
  language = "hi"
) {
  const category = CURRENT_AFFAIRS_CATEGORIES.find(
    item => item.id === categoryId
  );

  if (!category) {
    return normalizeLanguage(language) === "en"
      ? "Other"
      : "अन्य";
  }

  return category[normalizeLanguage(language)];
}

/*
|--------------------------------------------------------------------------
| CONTENT HELPERS
|--------------------------------------------------------------------------
*/

export function getCurrentAffairsContent(
  affair,
  language = "hi"
) {
  if (!affair) return null;

  const lang = normalizeLanguage(language);

  return {
    id: affair.id,

    title: getLocalizedValue(affair.title, lang),

    summary: getLocalizedValue(
      affair.summary,
      lang
    ),

    content: getLocalizedValue(
      affair.content,
      lang
    ),

    keyPoints: getLocalizedValue(
      affair.keyPoints,
      lang
    ),

    facts: getLocalizedValue(
      affair.facts,
      lang
    ),

    question: getLocalizedValue(
      affair.question,
      lang
    ),

    explanation: getLocalizedValue(
      affair.explanation,
      lang
    ),

    category: affair.category,

    categoryName: getCurrentAffairsCategoryName(
      affair.category,
      lang
    ),

    tags: affair.tags,

    eventDate: affair.eventDate,

    formattedDate: formatCurrentAffairsDate(
      affair.eventDate,
      lang
    ),

    source: affair.source,
    sourceUrl: affair.sourceUrl,

    isImportant: affair.isImportant,
    isVerified: affair.isVerified,

    difficulty: affair.difficulty
  };
}

/*
|--------------------------------------------------------------------------
| SEARCH CURRENT AFFAIRS
|--------------------------------------------------------------------------
| Firestore does not provide full-text search by default.
| This function searches within the records supplied to it.
|--------------------------------------------------------------------------
*/

export function searchCurrentAffairs(
  affairs,
  searchText,
  language = "hi"
) {
  if (!Array.isArray(affairs)) {
    return [];
  }

  const search = String(searchText || "")
    .trim()
    .toLocaleLowerCase();

  if (!search) {
    return affairs;
  }

  const lang = normalizeLanguage(language);

  return affairs.filter(affair => {
    const content = getCurrentAffairsContent(
      affair,
      lang
    );

    const searchableText = [
      content.title,
      content.summary,
      content.content,
      content.keyPoints,
      content.facts,
      content.categoryName,
      ...affair.tags
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase();

    return searchableText.includes(search);
  });
}

/*
|--------------------------------------------------------------------------
| FILTER LOCAL DATA
|--------------------------------------------------------------------------
*/

export function filterCurrentAffairs(
  affairs,
  filters = {}
) {
  if (!Array.isArray(affairs)) {
    return [];
  }

  return affairs.filter(affair => {
    if (
      filters.category &&
      affair.category !== filters.category
    ) {
      return false;
    }

    if (
      filters.important === true &&
      !affair.isImportant
    ) {
      return false;
    }

    if (
      filters.verified === true &&
      !affair.isVerified
    ) {
      return false;
    }

    if (
      filters.examId &&
      !affair.examIds.includes(filters.examId)
    ) {
      return false;
    }

    return true;
  });
}

/*
|--------------------------------------------------------------------------
| IMPORTANT CURRENT AFFAIRS
|--------------------------------------------------------------------------
*/

export async function getImportantCurrentAffairs(options = {}) {
  return getCurrentAffairs(
    { important: true },
    options
  );
}

/*
|--------------------------------------------------------------------------
| VERIFIED CURRENT AFFAIRS
|--------------------------------------------------------------------------
*/

export async function getVerifiedCurrentAffairs(options = {}) {
  return getCurrentAffairs(
    { verified: true },
    options
  );
}

/*
|--------------------------------------------------------------------------
| EXAM-WISE CURRENT AFFAIRS
|--------------------------------------------------------------------------
*/

export async function getCurrentAffairsByExam(
  examId,
  options = {}
) {
  if (!examId) {
    throw new Error("Exam ID आवश्यक है।");
  }

  return getCurrentAffairs(
    { examId },
    options
  );
}

/*
|--------------------------------------------------------------------------
| MONTHLY CURRENT AFFAIRS
|--------------------------------------------------------------------------
*/

export async function getMonthlyCurrentAffairs(
  year,
  month,
  options = {}
) {
  const numericYear = Number(year);
  const numericMonth = Number(month);

  if (
    !Number.isInteger(numericYear) ||
    !Number.isInteger(numericMonth) ||
    numericMonth < 1 ||
    numericMonth > 12
  ) {
    throw new Error("सही Year और Month दर्ज करें।");
  }

  const startDate =
    `${numericYear}-${String(numericMonth).padStart(2, "0")}-01`;

  const lastDay = new Date(
    Date.UTC(numericYear, numericMonth, 0)
  ).getUTCDate();

  const endDate =
    `${numericYear}-${String(numericMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  return getCurrentAffairs(
    {
      startDate,
      endDate
    },
    options
  );
}

/*
|--------------------------------------------------------------------------
| FETCH ALL PAGES
|--------------------------------------------------------------------------
| Use carefully: this may require multiple Firestore reads.
|--------------------------------------------------------------------------
*/

export async function getAllCurrentAffairs(
  filters = {},
  options = {}
) {
  const allItems = [];
  let lastDocument = null;
  let hasMore = true;

  const maxPages = Math.max(
    1,
    Number(options.maxPages) || 10
  );

  let pagesLoaded = 0;

  while (hasMore && pagesLoaded < maxPages) {
    const result = await getCurrentAffairs(
      filters,
      {
        pageSize: options.pageSize || 50,
        lastDocument
      }
    );

    allItems.push(...result.items);

    lastDocument = result.lastDocument;
    hasMore = result.hasMore;

    pagesLoaded++;

    if (!result.items.length) {
      break;
    }
  }

  return {
    items: allItems,
    count: allItems.length,
    hasMore,
    pagesLoaded
  };
}

/*
|--------------------------------------------------------------------------
| CURRENT AFFAIRS STATISTICS
|--------------------------------------------------------------------------
| Statistics are based only on the records passed to this function.
|--------------------------------------------------------------------------
*/

export function calculateCurrentAffairsStatistics(affairs = []) {
  const stats = {
    total: affairs.length,
    important: 0,
    verified: 0,
    categories: {},
    exams: {}
  };

  for (const affair of affairs) {
    if (affair.isImportant) {
      stats.important++;
    }

    if (affair.isVerified) {
      stats.verified++;
    }

    stats.categories[affair.category] =
      (stats.categories[affair.category] || 0) + 1;

    for (const examId of affair.examIds || []) {
      stats.exams[examId] =
        (stats.exams[examId] || 0) + 1;
    }
  }

  return stats;
}

/*
|--------------------------------------------------------------------------
| CURRENT AFFAIRS QUESTION
|--------------------------------------------------------------------------
*/

export function getCurrentAffairsQuestion(
  affair,
  language = "hi"
) {
  if (!affair) return null;

  const lang = normalizeLanguage(language);

  const question = getLocalizedValue(
    affair.question,
    lang
  );

  if (!question) return null;

  return {
    id: affair.id,

    question,

    options: Array.isArray(affair.options?.[lang])
      ? affair.options[lang]
      : Array.isArray(affair.options?.hi)
        ? affair.options.hi
        : [],

    correctAnswer:
      Number.isInteger(Number(affair.correctAnswer))
        ? Number(affair.correctAnswer)
        : null,

    explanation: getLocalizedValue(
      affair.explanation,
      lang
    )
  };
}

/*
|--------------------------------------------------------------------------
| BATCH QUESTION EXTRACTION
|--------------------------------------------------------------------------
*/

export function getCurrentAffairsQuestions(
  affairs = [],
  language = "hi"
) {
  return affairs
    .map(affair =>
      getCurrentAffairsQuestion(affair, language)
    )
    .filter(question =>
      question &&
      question.question &&
      question.options.length > 0 &&
      question.correctAnswer !== null
    );
}

/*
|--------------------------------------------------------------------------
| CLEAR PAGINATION STATE
|--------------------------------------------------------------------------
*/

export function createCurrentAffairsPaginationState() {
  return {
    items: [],
    lastDocument: null,
    hasMore: true,
    loading: false,
    error: null
  };
}
