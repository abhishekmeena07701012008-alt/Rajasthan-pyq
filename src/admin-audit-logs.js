import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase.js";

const getAuditLogsCallable = httpsCallable(
  functions,
  "adminGetAuditLogs"
);

const getAuditStatisticsCallable = httpsCallable(
  functions,
  "adminGetAuditStatistics"
);

const PAGE_SIZE = 50;

export const AUDIT_ACTIONS = [
  "question_create",
  "question_update",
  "question_delete",
  "question_publish",
  "question_verify",
  "bulk_question_import",
  "bulk_question_export",
  "user_role_update",
  "user_status_update",
  "notification_send",
  "current_affairs_create",
  "current_affairs_update",
  "current_affairs_publish",
  "current_affairs_delete",
  "daily_quiz_create",
  "daily_quiz_update",
  "daily_quiz_publish",
  "settings_update",
  "backup_create",
  "backup_restore"
];

let currentCursor = null;
let currentFilters = {};
let hasMoreLogs = false;

/**
 * तारीख को पढ़ने योग्य फॉर्मेट में बदलें।
 */
export function formatAuditDate(value) {
  if (!value) return "उपलब्ध नहीं";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "अमान्य तारीख";
  }

  return new Intl.DateTimeFormat("hi-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

/**
 * Action का हिंदी नाम।
 */
export function getAuditActionLabel(action) {
  const labels = {
    question_create: "प्रश्न बनाया",
    question_update: "प्रश्न अपडेट किया",
    question_delete: "प्रश्न हटाया",
    question_publish: "प्रश्न प्रकाशित किया",
    question_verify: "PYQ सत्यापित किया",

    bulk_question_import: "Bulk Import किया",
    bulk_question_export: "Bulk Export किया",

    user_role_update: "User Role बदला",
    user_status_update: "User Status बदला",

    notification_send: "Notification भेजा",

    current_affairs_create: "Current Affairs बनाया",
    current_affairs_update: "Current Affairs अपडेट किया",
    current_affairs_publish: "Current Affairs प्रकाशित किया",
    current_affairs_delete: "Current Affairs हटाया",

    daily_quiz_create: "Daily Quiz बनाया",
    daily_quiz_update: "Daily Quiz अपडेट किया",
    daily_quiz_publish: "Daily Quiz प्रकाशित किया",

    settings_update: "App Settings बदली",

    backup_create: "Backup बनाया",
    backup_restore: "Backup Restore किया"
  };

  return labels[action] || action || "अज्ञात गतिविधि";
}

/**
 * Logs प्राप्त करें।
 *
 * नए filters देने पर pagination शुरू से होगी।
 */
export async function loadAuditLogs(filters = {}, options = {}) {
  const reset = options.reset !== false;

  if (reset) {
    currentCursor = null;
    currentFilters = { ...filters };
  }

  const response = await getAuditLogsCallable({
    pageSize: PAGE_SIZE,
    action: currentFilters.action || "",
    performedBy: currentFilters.performedBy || "",
    cursorId: reset ? "" : currentCursor || ""
  });

  const data = response.data;

  if (!data || data.success !== true) {
    throw new Error("Audit Logs प्राप्त नहीं हुए।");
  }

  currentCursor = data.nextCursorId || null;
  hasMoreLogs = data.hasMore === true;

  return {
    logs: Array.isArray(data.logs) ? data.logs : [],
    hasMore: hasMoreLogs,
    nextCursorId: currentCursor
  };
}

/**
 * अगला Page प्राप्त करें।
 */
export async function loadMoreAuditLogs() {
  if (!hasMoreLogs || !currentCursor) {
    return {
      logs: [],
      hasMore: false
    };
  }

  return loadAuditLogs(currentFilters, {
    reset: false
  });
}

/**
 * Audit Statistics प्राप्त करें।
 */
export async function loadAuditStatistics() {
  const response = await getAuditStatisticsCallable();

  if (!response.data?.success) {
    throw new Error("Audit Statistics प्राप्त नहीं हुए।");
  }

  return {
    scannedRecords: response.data.scannedRecords || 0,
    statistics: response.data.statistics || {}
  };
}

/**
 * Statistics को readable list में बदलें।
 */
export function formatAuditStatistics(statistics = {}) {
  return Object.entries(statistics).map(([action, count]) => ({
    action,
    label: getAuditActionLabel(action),
    count: Number(count) || 0
  })).sort((a, b) => b.count - a.count);
}

/**
 * Filter reset करें।
 */
export function resetAuditFilters() {
  currentCursor = null;
  currentFilters = {};
  hasMoreLogs = false;
}

/**
 * वर्तमान pagination स्थिति।
 */
export function getAuditPaginationState() {
  return {
    hasMore: hasMoreLogs,
    cursor: currentCursor
  };
}
