/**
 * RAJASTHAN PYQ MASTER
 * FILE 33: ADMIN TOOLS
 *
 * Includes:
 * - Bulk Question Import / Export
 * - JSON / CSV Support
 * - Question Validation
 * - Duplicate Detection
 * - Bulk Update / Delete
 * - Database Health
 * - Backup / Restore
 * - Admin Activity Logs
 *
 * IMPORTANT:
 * All database writes and privileged operations
 * must be executed by trusted backend functions.
 */

const MAX_IMPORT_SIZE = 10 * 1024 * 1024;
const MAX_IMPORT_RECORDS = 5000;
const MAX_EXPORT_RECORDS = 50000;

const IMPORT_TYPES = {
  QUESTIONS: "questions",
  CURRENT_AFFAIRS: "currentAffairs",
  EXAMS: "exams",
  SUBJECTS: "subjects"
};

const IMPORT_STATUS = {
  READY: "ready",
  INVALID: "invalid",
  DUPLICATE: "duplicate"
};

const TEXT = {
  hi: {
    title: "एडमिन टूल्स",
    subtitle: "डेटाबेस और प्रश्नों को मैनेज करने के सभी टूल",

    importExport: "इम्पोर्ट / एक्सपोर्ट",
    bulkQuestions: "बल्क प्रश्न मैनेजमेंट",
    database: "डेटाबेस मैनेजमेंट",
    backup: "बैकअप और रिस्टोर",
    activity: "एडमिन एक्टिविटी",

    import: "डेटा इम्पोर्ट करें",
    export: "डेटा एक्सपोर्ट करें",
    chooseFile: "फाइल चुनें",
    preview: "Preview देखें",
    confirmImport: "इम्पोर्ट शुरू करें",
    cancel: "रद्द करें",

    json: "JSON फाइल",
    csv: "CSV फाइल",

    questions: "प्रश्न",
    currentAffairs: "करंट अफेयर्स",
    exams: "परीक्षाएँ",
    subjects: "विषय",

    total: "कुल रिकॉर्ड",
    valid: "सही रिकॉर्ड",
    invalid: "गलत रिकॉर्ड",
    duplicates: "डुप्लिकेट",
    selected: "चयनित रिकॉर्ड",

    selectAll: "सभी चुनें",
    clearSelection: "चयन हटाएँ",
    bulkDelete: "चयनित प्रश्न हटाएँ",
    bulkUpdate: "चयनित प्रश्न अपडेट करें",

    databaseHealth: "डेटाबेस हेल्थ",
    checkHealth: "डेटाबेस चेक करें",
    healthy: "डेटाबेस सही काम कर रहा है",
    unhealthy: "डेटाबेस में समस्या मिली",

    createBackup: "बैकअप बनाएँ",
    restoreBackup: "बैकअप रिस्टोर करें",
    backupHistory: "बैकअप हिस्ट्री",

    exportBackup: "बैकअप डाउनलोड करें",
    restoreWarning: "रिस्टोर करने से मौजूदा डेटा प्रभावित हो सकता है।",

    activityLogs: "एक्टिविटी लॉग",
    action: "एक्शन",
    admin: "एडमिन",
    date: "तारीख",
    status: "स्थिति",

    loading: "लोड हो रहा है...",
    noData: "कोई डेटा उपलब्ध नहीं है।",
    noFile: "कृपया पहले फाइल चुनें।",
    invalidFile: "यह फाइल मान्य नहीं है।",
    fileTooLarge: "फाइल 10 MB से बड़ी नहीं हो सकती।",
    tooManyRecords: "अधिकतम 5000 रिकॉर्ड ही इम्पोर्ट कर सकते हैं।",

    importSuccess: "डेटा इम्पोर्ट हो गया।",
    importError: "डेटा इम्पोर्ट नहीं हो सका।",
    exportSuccess: "एक्सपोर्ट तैयार हो गया।",
    operationError: "ऑपरेशन पूरा नहीं हो सका।",

    confirmDelete: "क्या आप चयनित प्रश्न हटाना चाहते हैं?",
    confirmRestore: "क्या आप बैकअप रिस्टोर करना चाहते हैं?",

    all: "सभी",
    ready: "तैयार",
    failed: "असफल",
    completed: "पूरा हुआ",

    search: "खोजें...",
    refresh: "रिफ्रेश",

    download: "डाउनलोड",
    restore: "रिस्टोर",
    view: "देखें",

    type: "डेटा का प्रकार",
    format: "फाइल फॉर्मेट",

    source: "डेटा स्रोत",
    verifiedOnly: "केवल Verified PYQ",
    includePractice: "AI Practice भी शामिल करें",

    adminOnly: "इस सुविधा के लिए एडमिन अनुमति जरूरी है।",

    backupReady: "बैकअप तैयार है।",
    backupError: "बैकअप नहीं बन सका।",

    previewTitle: "इम्पोर्ट Preview",
    record: "रिकॉर्ड",
    errors: "गलतियाँ",
    warnings: "चेतावनियाँ",

    unknown: "अज्ञात"
  },

  en: {
    title: "Admin Tools",
    subtitle: "Tools for managing questions and database",

    importExport: "Import / Export",
    bulkQuestions: "Bulk Question Management",
    database: "Database Management",
    backup: "Backup & Restore",
    activity: "Admin Activity",

    import: "Import Data",
    export: "Export Data",
    chooseFile: "Choose File",
    preview: "Preview",
    confirmImport: "Start Import",
    cancel: "Cancel",

    json: "JSON File",
    csv: "CSV File",

    questions: "Questions",
    currentAffairs: "Current Affairs",
    exams: "Exams",
    subjects: "Subjects",

    total: "Total Records",
    valid: "Valid Records",
    invalid: "Invalid Records",
    duplicates: "Duplicates",
    selected: "Selected Records",

    selectAll: "Select All",
    clearSelection: "Clear Selection",
    bulkDelete: "Delete Selected Questions",
    bulkUpdate: "Update Selected Questions",

    databaseHealth: "Database Health",
    checkHealth: "Check Database",
    healthy: "Database is healthy",
    unhealthy: "Database issues detected",

    createBackup: "Create Backup",
    restoreBackup: "Restore Backup",
    backupHistory: "Backup History",

    exportBackup: "Download Backup",
    restoreWarning: "Restoring may affect existing data.",

    activityLogs: "Activity Logs",
    action: "Action",
    admin: "Admin",
    date: "Date",
    status: "Status",

    loading: "Loading...",
    noData: "No data available.",
    noFile: "Please select a file first.",
    invalidFile: "Invalid file.",
    fileTooLarge: "File cannot exceed 10 MB.",
    tooManyRecords: "Maximum 5000 records can be imported.",

    importSuccess: "Data imported successfully.",
    importError: "Data import failed.",
    exportSuccess: "Export prepared successfully.",
    operationError: "Operation failed.",

    confirmDelete: "Delete selected questions?",
    confirmRestore: "Restore this backup?",

    all: "All",
    ready: "Ready",
    failed: "Failed",
    completed: "Completed",

    search: "Search...",
    refresh: "Refresh",

    download: "Download",
    restore: "Restore",
    view: "View",

    type: "Data Type",
    format: "File Format",

    source: "Data Source",
    verifiedOnly: "Verified PYQ only",
    includePractice: "Include AI Practice",

    adminOnly: "Admin permission required.",

    backupReady: "Backup is ready.",
    backupError: "Could not create backup.",

    previewTitle: "Import Preview",
    record: "Record",
    errors: "Errors",
    warnings: "Warnings",

    unknown: "Unknown"
  }
};

let root = null;
let language = "hi";

let selectedFile = null;
let parsedRecords = [];
let previewResults = [];

let selectedQuestionIds = new Set();

let importType = IMPORT_TYPES.QUESTIONS;
let exportFormat = "json";

let isBusy = false;

let callbacks = {};

let databaseHealth = null;
let backupHistory = [];
let activityLogs = [];

function t(key) {
  return TEXT[language]?.[key] || TEXT.hi[key] || key;
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function showMessage(message, type = "info") {
  if (typeof callbacks.onMessage === "function") {
    callbacks.onMessage(message, type);
    return;
  }

  const element = root?.querySelector("[data-admin-tools-message]");

  if (!element) return;

  element.textContent = message;
  element.dataset.type = type;
  element.hidden = false;
}

function setBusy(value) {
  isBusy = Boolean(value);

  root?.querySelectorAll("[data-admin-action]")
    .forEach(button => {
      button.disabled = isBusy;
    });
}

/* =================================
   IMPORT / EXPORT INTERFACE
================================= */

function renderImportExport() {
  return `
    <section class="admin-tools-card">

      <h3>${t("importExport")}</h3>

      <div class="admin-tools-grid">

        <label>
          <span>${t("type")}</span>

          <select data-import-type>
            <option value="questions">${t("questions")}</option>
            <option value="currentAffairs">${t("currentAffairs")}</option>
            <option value="exams">${t("exams")}</option>
            <option value="subjects">${t("subjects")}</option>
          </select>
        </label>

        <label>
          <span>${t("chooseFile")}</span>

          <input
            type="file"
            data-import-file
            accept=".json,.csv"
          />
        </label>

      </div>

      <div class="admin-tools-actions">

        <button
          type="button"
          data-admin-action
          data-preview-import
        >
          ${t("preview")}
        </button>

        <button
          type="button"
          data-admin-action
          data-confirm-import
          disabled
        >
          ${t("confirmImport")}
        </button>

        <button
          type="button"
          data-admin-action
          data-export-json
        >
          ${t("export")} JSON
        </button>

        <button
          type="button"
          data-admin-action
          data-export-csv
        >
          ${t("export")} CSV
        </button>

      </div>

      <div data-import-preview></div>

    </section>
  `;
}

/* =================================
   FILE PARSING
================================= */

function parseCSVLine(line) {
  const values = [];

  let value = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        value += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      values.push(value);
      value = "";
    } else {
      value += char;
    }
  }

  values.push(value);

  return values;
}

function parseCSV(text) {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter(line => line.trim());

  if (!lines.length) return [];

  const headers = parseCSVLine(lines[0]);

  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const record = {};

    headers.forEach((header, index) => {
      record[header.trim()] = values[index] ?? "";
    });

    return record;
  });
}

async function parseImportFile(file) {
  if (!file) {
    throw new Error(t("noFile"));
  }

  if (file.size > MAX_IMPORT_SIZE) {
    throw new Error(t("fileTooLarge"));
  }

  const text = await file.text();

  const extension = file.name.split(".").pop().toLowerCase();

  let records;

  if (extension === "json") {
    const parsed = JSON.parse(text);

    records = Array.isArray(parsed)
      ? parsed
      : parsed.records;

  } else if (extension === "csv") {
    records = parseCSV(text);

  } else {
    throw new Error(t("invalidFile"));
  }

  if (!Array.isArray(records)) {
    throw new Error(t("invalidFile"));
  }

  if (records.length > MAX_IMPORT_RECORDS) {
    throw new Error(t("tooManyRecords"));
  }

  return records;
}

/* =================================
   QUESTION VALIDATION
================================= */

function validateQuestion(question) {
  const errors = [];

  if (!question || typeof question !== "object") {
    return {
      valid: false,
      errors: ["Invalid question object."]
    };
  }

  if (!question.id) {
    errors.push("Missing question ID.");
  }

  if (!question.subjectId) {
    errors.push("Missing subjectId.");
  }

  if (!question.topicId) {
    errors.push("Missing topicId.");
  }

  if (!question.subtopicId) {
    errors.push("Missing subtopicId.");
  }

  if (!question.question?.hi || !question.question?.en) {
    errors.push("Hindi and English question required.");
  }

  const hindiOptions = question.options?.hi;
  const englishOptions = question.options?.en;

  if (
    !Array.isArray(hindiOptions) ||
    hindiOptions.length !== 4
  ) {
    errors.push("Exactly four Hindi options required.");
  }

  if (
    !Array.isArray(englishOptions) ||
    englishOptions.length !== 4
  ) {
    errors.push("Exactly four English options required.");
  }

  if (
    !Number.isInteger(question.correctAnswer) ||
    question.correctAnswer < 0 ||
    question.correctAnswer > 3
  ) {
    errors.push("Invalid correctAnswer.");
  }

  if (!question.explanation?.hi || !question.explanation?.en) {
    errors.push("Bilingual explanation required.");
  }

  if (
    question.type === "PYQ" &&
    (
      !question.year ||
      !question.source ||
      !question.examIds?.length
    )
  ) {
    errors.push("PYQ requires year, source and examIds.");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/* =================================
   DUPLICATE DETECTION
================================= */

function normalizeQuestionText(value = "") {
  return String(value)
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

function findLocalDuplicates(records) {
  const seenIds = new Set();
  const seenTexts = new Set();

  const duplicates = [];

  records.forEach((record, index) => {
    const id = String(record.id || "");
    const text = normalizeQuestionText(record.question?.hi || "");

    if (
      (id && seenIds.has(id)) ||
      (text && seenTexts.has(text))
    ) {
      duplicates.push(index);
    }

    if (id) seenIds.add(id);
    if (text) seenTexts.add(text);
  });

  return duplicates;
}

/* =================================
   IMPORT PREVIEW
================================= */

function buildPreview(records) {
  const duplicates = new Set(findLocalDuplicates(records));

  return records.map((record, index) => {
    const validation = importType === IMPORT_TYPES.QUESTIONS
      ? validateQuestion(record)
      : { valid: Boolean(record && typeof record === "object"), errors: [] };

    const duplicate = duplicates.has(index);

    return {
      index,
      record,
      status: !validation.valid
        ? IMPORT_STATUS.INVALID
        : duplicate
          ? IMPORT_STATUS.DUPLICATE
          : IMPORT_STATUS.READY,
      errors: validation.errors || []
    };
  });
}

function renderPreview() {
  const target = root?.querySelector("[data-import-preview]");

  if (!target) return;

  if (!previewResults.length) {
    target.innerHTML = "";
    return;
  }

  const valid = previewResults.filter(
    item => item.status === IMPORT_STATUS.READY
  ).length;

  const invalid = previewResults.filter(
    item => item.status === IMPORT_STATUS.INVALID
  ).length;

  const duplicates = previewResults.filter(
    item => item.status === IMPORT_STATUS.DUPLICATE
  ).length;

  target.innerHTML = `
    <div class="admin-import-preview">

      <h4>${t("previewTitle")}</h4>

      <div class="admin-import-summary">

        <span>${t("total")}: ${previewResults.length}</span>

        <span>${t("valid")}: ${valid}</span>

        <span>${t("invalid")}: ${invalid}</span>

        <span>${t("duplicates")}: ${duplicates}</span>

      </div>

      <div class="admin-import-records">

        ${previewResults.slice(0, 50).map(item => `
          <article class="admin-import-record status-${item.status}">

            <strong>
              ${t("record")} #${item.index + 1}
            </strong>

            <span>${escapeHTML(item.status)}</span>

            ${
              item.errors.length
                ? `<p>${escapeHTML(item.errors.join(" "))}</p>`
                : ""
            }

          </article>
        `).join("")}

      </div>

      ${
        previewResults.length > 50
          ? `<p>केवल पहले 50 रिकॉर्ड दिखाए गए हैं।</p>`
          : ""
      }

    </div>
  `;

  const confirmButton = root.querySelector(
    "[data-confirm-import]"
  );

  if (confirmButton) {
    confirmButton.disabled = valid === 0 || isBusy;
  }
}

/* =================================
   RUN IMPORT
================================= */

async function previewImport() {
  const file = root.querySelector("[data-import-file]")?.files?.[0];

  try {
    selectedFile = file;
    parsedRecords = await parseImportFile(file);

    importType = root.querySelector("[data-import-type]")?.value ||
      IMPORT_TYPES.QUESTIONS;

    previewResults = buildPreview(parsedRecords);

    renderPreview();

  } catch (error) {
    console.error("Import preview error:", error);
    showMessage(error.message || t("invalidFile"), "error");
  }
}

async function confirmImport() {
  if (isBusy || !previewResults.length) return;

  if (typeof callbacks.importData !== "function") {
    showMessage(t("importError"), "error");
    return;
  }

  const validRecords = previewResults
    .filter(item => item.status === IMPORT_STATUS.READY)
    .map(item => item.record);

  if (!validRecords.length) {
    showMessage(t("invalidFile"), "error");
    return;
  }

  setBusy(true);

  try {
    const result = await callbacks.importData({
      type: importType,
      records: validRecords
    });

    if (result?.success === false) {
      throw new Error(result.message || "Import failed");
    }

    showMessage(
      `${t("importSuccess")} ${result?.importedCount ?? validRecords.length}`,
      "success"
    );

    selectedFile = null;
    parsedRecords = [];
    previewResults = [];

    const fileInput = root.querySelector("[data-import-file]");
    if (fileInput) fileInput.value = "";

    renderPreview();

    await refreshAdminTools();

  } catch (error) {
    console.error("Import error:", error);
    showMessage(t("importError"), "error");

  } finally {
    setBusy(false);
  }
}

/* =================================
   EXPORT
================================= */

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function convertToCSV(records) {
  if (!records.length) return "";

  const headers = Object.keys(records[0]);

  const escapeCSV = value => {
    const text = typeof value === "object"
      ? JSON.stringify(value)
      : String(value ?? "");

    return `"${text.replace(/"/g, '""')}"`;
  };

  const rows = records.map(record =>
    headers.map(header => escapeCSV(record[header])).join(",")
  );

  return [
    headers.map(escapeCSV).join(","),
    ...rows
  ].join("\n");
}

async function exportData(format) {
  if (isBusy) return;

  if (typeof callbacks.exportData !== "function") {
    showMessage(t("exportSuccess"), "info");
    return;
  }

  setBusy(true);

  try {
    const result = await callbacks.exportData({
      type: importType,
      format,
      limit: MAX_EXPORT_RECORDS
    });

    const records = result?.records;

    if (!Array.isArray(records)) {
      throw new Error("Invalid export result.");
    }

    if (records.length > MAX_EXPORT_RECORDS) {
      throw new Error("Export limit exceeded.");
    }

    const content = format === "csv"
      ? convertToCSV(records)
      : JSON.stringify(records, null, 2);

    downloadFile(
      content,
      `rajasthan-pyq-${importType}-${Date.now()}.${format}`,
      format === "csv"
        ? "text/csv;charset=utf-8"
        : "application/json"
    );

    showMessage(t("exportSuccess"), "success");

  } catch (error) {
    console.error("Export error:", error);
    showMessage(t("operationError"), "error");

  } finally {
    setBusy(false);
  }
}

/* =================================
   BULK QUESTION MANAGEMENT
================================= */

function renderBulkManagement() {
  return `
    <section class="admin-tools-card">

      <h3>${t("bulkQuestions")}</h3>

      <div class="admin-tools-actions">

        <button type="button" data-select-all>
          ${t("selectAll")}
        </button>

        <button type="button" data-clear-selection>
          ${t("clearSelection")}
        </button>

        <button type="button" data-bulk-delete>
          ${t("bulkDelete")}
        </button>

      </div>

      <p>
        ${t("selected")}:
        <strong data-selected-count>0</strong>
      </p>

      <div data-bulk-question-list></div>

    </section>
  `;
}

function renderBulkQuestionList(records = []) {
  const target = root?.querySelector("[data-bulk-question-list]");

  if (!target) return;

  if (!records.length) {
    target.innerHTML = `<p>${t("noData")}</p>`;
    return;
  }

  target.innerHTML = records.map(record => `
    <label class="admin-bulk-question">

      <input
        type="checkbox"
        data-question-select="${escapeHTML(record.id)}"
        ${selectedQuestionIds.has(record.id) ? "checked" : ""}
      />

      <span>
        ${escapeHTML(record.question?.hi || record.id)}
      </span>

    </label>
  `).join("");

  updateSelectedCount();
}

function updateSelectedCount() {
  const element = root?.querySelector("[data-selected-count]");

  if (element) {
    element.textContent = selectedQuestionIds.size;
  }
}

async function loadBulkQuestions() {
  if (typeof callbacks.loadBulkQuestions !== "function") return;

  try {
    const result = await callbacks.loadBulkQuestions({
      limit: PAGE_SIZE
    });

    renderBulkQuestionList(result?.questions || []);

  } catch (error) {
    console.error("Bulk questions load error:", error);
    showMessage(t("operationError"), "error");
  }
}

async function deleteSelectedQuestions() {
  if (!selectedQuestionIds.size || isBusy) return;

  if (!window.confirm(t("confirmDelete"))) return;

  if (typeof callbacks.bulkDeleteQuestions !== "function") {
    showMessage(t("operationError"), "error");
    return;
  }

  setBusy(true);

  try {
    const result = await callbacks.bulkDeleteQuestions({
      questionIds: [...selectedQuestionIds]
    });

    if (result?.success === false) {
      throw new Error(result.message || "Delete failed");
    }

    selectedQuestionIds.clear();

    showMessage(t("completed"), "success");

    await loadBulkQuestions();

  } catch (error) {
    console.error("Bulk delete error:", error);
    showMessage(t("operationError"), "error");

  } finally {
    setBusy(false);
    updateSelectedCount();
  }
}

/* =================================
   DATABASE HEALTH
================================= */

function renderDatabaseHealth() {
  return `
    <section class="admin-tools-card">

      <h3>${t("databaseHealth")}</h3>

      <button
        type="button"
        data-admin-action
        data-check-health
      >
        ${t("checkHealth")}
      </button>

      <div data-database-health>
        ${t("noData")}
      </div>

    </section>
  `;
}

async function checkDatabaseHealth() {
  if (typeof callbacks.checkDatabaseHealth !== "function") {
    showMessage(t("operationError"), "error");
    return;
  }

  const target = root.querySelector("[data-database-health]");

  if (target) target.textContent = t("loading");

  try {
    databaseHealth = await callbacks.checkDatabaseHealth();

    const healthy = databaseHealth?.healthy === true;

    if (target) {
      target.innerHTML = `
        <div class="admin-database-health ${healthy ? "healthy" : "unhealthy"}">
          <strong>
            ${healthy ? t("healthy") : t("unhealthy")}
          </strong>

          <pre>${escapeHTML(
            JSON.stringify(databaseHealth, null, 2)
          )}</pre>
        </div>
      `;
    }

  } catch (error) {
    console.error("Database health error:", error);

    if (target) {
      target.textContent = t("unhealthy");
    }
  }
}

/* =================================
   BACKUP AND RESTORE
================================= */

function renderBackupSection() {
  return `
    <section class="admin-tools-card">

      <h3>${t("backup")}</h3>

      <p>${t("restoreWarning")}</p>

      <div class="admin-tools-actions">

        <button
          type="button"
          data-admin-action
          data-create-backup
        >
          ${t("createBackup")}
        </button>

        <button
          type="button"
          data-admin-action
          data-load-backups
        >
          ${t("backupHistory")}
        </button>

      </div>

      <div data-backup-history></div>

    </section>
  `;
}

async function createBackup() {
  if (typeof callbacks.createBackup !== "function") {
    showMessage(t("backupError"), "error");
    return;
  }

  setBusy(true);

  try {
    const result = await callbacks.createBackup();

    if (result?.success === false) {
      throw new Error("Backup failed.");
    }

    showMessage(t("backupReady"), "success");

    await loadBackupHistory();

  } catch (error) {
    console.error("Backup error:", error);
    showMessage(t("backupError"), "error");

  } finally {
    setBusy(false);
  }
}

async function loadBackupHistory() {
  if (typeof callbacks.loadBackupHistory !== "function") {
    return;
  }

  const target = root.querySelector("[data-backup-history]");

  if (!target) return;

  target.textContent = t("loading");

  try {
    const result = await callbacks.loadBackupHistory();

    backupHistory = result?.backups || [];

    if (!backupHistory.length) {
      target.textContent = t("noData");
      return;
    }

    target.innerHTML = backupHistory.map(backup => `
      <article class="admin-backup-item">

        <div>
          <strong>${escapeHTML(backup.id || "")}</strong>
          <span>${escapeHTML(
            new Date(backup.createdAt).toLocaleString()
          )}</span>
        </div>

        <button
          type="button"
          data-backup-download="${escapeHTML(backup.id)}"
        >
          ${t("download")}
        </button>

        <button
          type="button"
          data-backup-restore="${escapeHTML(backup.id)}"
        >
          ${t("restore")}
        </button>

      </article>
    `).join("");

    bindBackupEvents();

  } catch (error) {
    console.error("Backup history error:", error);
    target.textContent = t("operationError");
  }
}

async function downloadBackup(backupId) {
  if (typeof callbacks.downloadBackup !== "function") return;

  try {
    const result = await callbacks.downloadBackup(backupId);

    if (!result?.url) {
      throw new Error("Backup URL unavailable.");
    }

    const link = document.createElement("a");
    link.href = result.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.click();

  } catch (error) {
    console.error("Backup download error:", error);
    showMessage(t("operationError"), "error");
  }
}

async function restoreBackup(backupId) {
  if (!window.confirm(t("confirmRestore"))) return;

  if (typeof callbacks.restoreBackup !== "function") {
    showMessage(t("operationError"), "error");
    return;
  }

  setBusy(true);

  try {
    const result = await callbacks.restoreBackup({
      backupId,
      confirmation: true
    });

    if (result?.success === false) {
      throw new Error("Restore failed.");
    }

    showMessage(t("completed"), "success");

    await refreshAdminTools();

  } catch (error) {
    console.error("Backup restore error:", error);
    showMessage(t("operationError"), "error");

  } finally {
    setBusy(false);
  }
}

function bindBackupEvents() {
  root.querySelectorAll("[data-backup-download]")
    .forEach(button => {
      button.addEventListener("click", () => {
        downloadBackup(button.dataset.backupDownload);
      });
    });

  root.querySelectorAll("[data-backup-restore]")
    .forEach(button => {
      button.addEventListener("click", () => {
        restoreBackup(button.dataset.backupRestore);
      });
    });
}

/* =================================
   ADMIN ACTIVITY LOG
================================= */

function renderActivitySection() {
  return `
    <section class="admin-tools-card">

      <h3>${t("activityLogs")}</h3>

      <button
        type="button"
        data-admin-action
        data-load-activity
      >
        ${t("refresh")}
      </button>

      <div data-admin-activity-list></div>

    </section>
  `;
}

async function loadActivityLogs() {
  if (typeof callbacks.loadActivityLogs !== "function") {
    return;
  }

  const target = root.querySelector("[data-admin-activity-list]");

  if (!target) return;

  target.textContent = t("loading");

  try {
    const result = await callbacks.loadActivityLogs({
      limit: 50
    });

    activityLogs = result?.logs || [];

    if (!activityLogs.length) {
      target.textContent = t("noData");
      return;
    }

    target.innerHTML = `
      <div class="admin-activity-list">

        ${activityLogs.map(log => `
          <article class="admin-activity-item">

            <strong>${escapeHTML(log.action || "-")}</strong>

            <span>${escapeHTML(log.adminEmail || "-")}</span>

            <span>${escapeHTML(
              new Date(log.createdAt).toLocaleString()
            )}</span>

            <span>${escapeHTML(log.status || "-")}</span>

          </article>
        `).join("")}

      </div>
    `;

  } catch (error) {
    console.error("Activity log error:", error);
    target.textContent = t("operationError");
  }
}

/* =================================
   MAIN RENDER
================================= */

function renderAdminTools() {
  if (!root) return;

  root.innerHTML = `
    <div class="admin-tools-page">

      <header class="admin-tools-header">

        <div>
          <h2>${t("title")}</h2>
          <p>${t("subtitle")}</p>
        </div>

      </header>

      <div
        data-admin-tools-message
        role="status"
        hidden
      ></div>

      ${renderImportExport()}

      ${renderBulkManagement()}

      ${renderDatabaseHealth()}

      ${renderBackupSection()}

      ${renderActivitySection()}

    </div>
  `;

  bindEvents();
}

/* =================================
   EVENT BINDING
================================= */

function bindEvents() {
  root.querySelector("[data-import-file]")
    ?.addEventListener("change", event => {
      selectedFile = event.target.files?.[0] || null;
      parsedRecords = [];
      previewResults = [];
      renderPreview();
    });

  root.querySelector("[data-import-type]")
    ?.addEventListener("change", event => {
      importType = event.target.value;
      parsedRecords = [];
      previewResults = [];
      renderPreview();
    });

  root.querySelector("[data-preview-import]")
    ?.addEventListener("click", previewImport);

  root.querySelector("[data-confirm-import]")
    ?.addEventListener("click", confirmImport);

  root.querySelector("[data-export-json]")
    ?.addEventListener("click", () => exportData("json"));

  root.querySelector("[data-export-csv]")
    ?.addEventListener("click", () => exportData("csv"));

  root.querySelector("[data-select-all]")
    ?.addEventListener("click", () => {
      usersSelectAll();
    });

  root.querySelector("[data-clear-selection]")
    ?.addEventListener("click", () => {
      selectedQuestionIds.clear();
      loadBulkQuestions();
    });

  root.querySelector("[data-bulk-delete]")
    ?.addEventListener("click", deleteSelectedQuestions);

  root.querySelectorAll("[data-question-select]")
    .forEach(input => {
      input.addEventListener("change", () => {
        const id = input.dataset.questionSelect;

        if (input.checked) {
          selectedQuestionIds.add(id);
        } else {
          selectedQuestionIds.delete(id);
        }

        updateSelectedCount();
      });
    });

  root.querySelector("[data-check-health]")
    ?.addEventListener("click", checkDatabaseHealth);

  root.querySelector("[data-create-backup]")
    ?.addEventListener("click", createBackup);

  root.querySelector("[data-load-backups]")
    ?.addEventListener("click", loadBackupHistory);

  root.querySelector("[data-load-activity]")
    ?.addEventListener("click", loadActivityLogs);
}

function usersSelectAll() {
  root.querySelectorAll("[data-question-select]")
    .forEach(input => {
      input.checked = true;
      selectedQuestionIds.add(input.dataset.questionSelect);
    });

  updateSelectedCount();
}

/* =================================
   REFRESH
================================= */

async function refreshAdminTools() {
  await Promise.allSettled([
    loadBulkQuestions(),
    loadBackupHistory(),
    loadActivityLogs()
  ]);
}

/* =================================
   MOUNT
================================= */

/**
 * Required callbacks:
 *
 * importData
 * exportData
 * loadBulkQuestions
 * bulkDeleteQuestions
 *
 * Optional callbacks:
 *
 * checkDatabaseHealth
 * createBackup
 * loadBackupHistory
 * downloadBackup
 * restoreBackup
 * loadActivityLogs
 *
 * Backend must enforce all permissions.
 */

export async function mountAdminTools(options = {}) {
  if (!options.container) {
    throw new Error("Admin tools container is required.");
  }

  if (
    typeof options.importData !== "function" ||
    typeof options.exportData !== "function" ||
    typeof options.loadBulkQuestions !== "function" ||
    typeof options.bulkDeleteQuestions !== "function"
  ) {
    throw new Error("Required Admin Tools callbacks are missing.");
  }

  root = options.container;

  language = options.language === "en" ? "en" : "hi";

  callbacks = {
    importData: options.importData,
    exportData: options.exportData,
    loadBulkQuestions: options.loadBulkQuestions,
    bulkDeleteQuestions: options.bulkDeleteQuestions,

    checkDatabaseHealth: options.checkDatabaseHealth,
    createBackup: options.createBackup,
    loadBackupHistory: options.loadBackupHistory,
    downloadBackup: options.downloadBackup,
    restoreBackup: options.restoreBackup,
    loadActivityLogs: options.loadActivityLogs,

    onMessage: options.onMessage
  };

  selectedFile = null;
  parsedRecords = [];
  previewResults = [];

  selectedQuestionIds.clear();

  renderAdminTools();

  await refreshAdminTools();
}

/* =================================
   PUBLIC HELPERS
================================= */

export function setAdminToolsLanguage(value = "hi") {
  language = value === "en" ? "en" : "hi";
  renderAdminTools();
}

export function getImportPreview() {
  return previewResults.map(item => ({
    index: item.index,
    status: item.status,
    errors: [...item.errors]
  }));
}

export function getSelectedQuestionIds() {
  return [...selectedQuestionIds];
}

export function getDatabaseHealth() {
  return databaseHealth;
}

export function getBackupHistory() {
  return [...backupHistory];
}

export function getAdminActivityLogs() {
  return [...activityLogs];
}

export { IMPORT_TYPES };
