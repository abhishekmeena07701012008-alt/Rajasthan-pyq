/* =========================================
   RAJASTHAN PYQ MASTER
   ADMIN IMPORT / EXPORT
========================================= */

const state = {
  importData: [],
  importType: "questions",
  errors: [],
  validRecords: [],
  importing: false
};

let root = null;
let importHandler = null;

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_RECORDS = 5000;

const escapeHTML = value =>
  String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);

function notify(message, type = "info") {
  root?.dispatchEvent(
    new CustomEvent("admin-import-export-notification", {
      bubbles: true,
      detail: { message, type }
    })
  );

  if (!root) console.log(message);
}

/* =========================================
   EXPORT HELPERS
========================================= */

function downloadBlob(content, filename, mimeType) {
  const blob = new Blob([content], {
    type: mimeType
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}

function exportJSON(records, filename) {
  const content = JSON.stringify(records, null, 2);

  downloadBlob(
    content,
    filename,
    "application/json;charset=utf-8"
  );
}

function csvEscape(value) {
  const text = String(value ?? "");

  return `"${text.replace(/"/g, '""')}"`;
}

function flattenObject(object, prefix = "", result = {}) {
  for (const [key, value] of Object.entries(object || {})) {
    const path = prefix ? `${prefix}.${key}` : key;

    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      flattenObject(value, path, result);
    } else {
      result[path] = Array.isArray(value)
        ? JSON.stringify(value)
        : value;
    }
  }

  return result;
}

function exportCSV(records, filename) {
  if (!records.length) {
    throw new Error("Export करने के लिए डेटा उपलब्ध नहीं है।");
  }

  const flattened = records.map(record =>
    flattenObject(record)
  );

  const headers = [
    ...new Set(flattened.flatMap(item => Object.keys(item)))
  ];

  const rows = [
    headers.map(csvEscape).join(","),

    ...flattened.map(item =>
      headers.map(header =>
        csvEscape(item[header] ?? "")
      ).join(",")
    )
  ];

  const csv = "\uFEFF" + rows.join("\r\n");

  downloadBlob(
    csv,
    filename,
    "text/csv;charset=utf-8"
  );
}

/* =========================================
   PUBLIC EXPORT FUNCTIONS
========================================= */

export function exportQuestionsJSON(questions) {
  if (!Array.isArray(questions) || !questions.length) {
    throw new Error("Questions उपलब्ध नहीं हैं।");
  }

  exportJSON(
    questions,
    `rajasthan-pyq-questions-${Date.now()}.json`
  );
}

export function exportQuestionsCSV(questions) {
  exportCSV(
    questions,
    `rajasthan-pyq-questions-${Date.now()}.csv`
  );
}

export function exportCurrentAffairsJSON(items) {
  if (!Array.isArray(items) || !items.length) {
    throw new Error("Current Affairs उपलब्ध नहीं हैं।");
  }

  exportJSON(
    items,
    `rajasthan-current-affairs-${Date.now()}.json`
  );
}

export function exportCurrentAffairsCSV(items) {
  exportCSV(
    items,
    `rajasthan-current-affairs-${Date.now()}.csv`
  );
}

/* =========================================
   JSON FILE READER
========================================= */

function readJSONFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result));
      } catch {
        reject(new Error("JSON फ़ाइल का Format सही नहीं है।"));
      }
    };

    reader.onerror = () => {
      reject(new Error("फ़ाइल पढ़ने में समस्या हुई।"));
    };

    reader.readAsText(file, "UTF-8");
  });
}

/* =========================================
   CSV PARSER
========================================= */

function parseCSV(text) {
  const rows = [];

  let row = [];
  let cell = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && insideQuotes && next === '"') {
      cell += '"';
      i++;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === "," && !insideQuotes) {
      row.push(cell);
      cell = "";
    } else if (
      (char === "\n" || char === "\r") &&
      !insideQuotes
    ) {
      if (char === "\r" && next === "\n") i++;

      row.push(cell);

      if (row.some(value => value.trim() !== "")) {
        rows.push(row);
      }

      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (insideQuotes) {
    throw new Error("CSV में quotation marks सही नहीं हैं।");
  }

  row.push(cell);

  if (row.some(value => value.trim() !== "")) {
    rows.push(row);
  }

  if (!rows.length) return [];

  const headers = rows[0].map(value =>
    value.trim().replace(/^\uFEFF/, "")
  );

  return rows.slice(1).map(values => {
    const record = {};

    headers.forEach((header, index) => {
      record[header] = values[index] ?? "";
    });

    return record;
  });
}

/* =========================================
   NESTED CSV VALUES
========================================= */

function parseCSVValue(value) {
  if (typeof value !== "string") return value;

  const trimmed = value.trim();

  if (
    (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
    (trimmed.startsWith("{") && trimmed.endsWith("}"))
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }

  return value;
}

function unflattenRecord(record) {
  const result = {};

  for (const [path, rawValue] of Object.entries(record)) {
    const parts = path.split(".");
    let current = result;

    parts.forEach((part, index) => {
      if (index === parts.length - 1) {
        current[part] = parseCSVValue(rawValue);
      } else {
        current[part] ??= {};
        current = current[part];
      }
    });
  }

  return result;
}

/* =========================================
   FILE VALIDATION
========================================= */

function validateFile(file) {
  if (!file) {
    throw new Error("पहले फ़ाइल चुनें।");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("फ़ाइल का आकार 10 MB से कम होना चाहिए।");
  }

  const extension = file.name.split(".").pop().toLowerCase();

  if (!["json", "csv"].includes(extension)) {
    throw new Error("केवल JSON और CSV फ़ाइलें स्वीकार हैं।");
  }

  return extension;
}

/* =========================================
   RECORD VALIDATION
========================================= */

function validateQuestion(record, index) {
  const errors = [];

  if (!record.examIds?.length) {
    errors.push("examIds आवश्यक हैं।");
  }

  if (!record.subjectId) {
    errors.push("subjectId आवश्यक है।");
  }

  if (!record.question?.hi || !record.question?.en) {
    errors.push("Hindi और English प्रश्न आवश्यक हैं।");
  }

  if (
    !Array.isArray(record.options?.hi) ||
    !Array.isArray(record.options?.en) ||
    record.options.hi.length !== 4 ||
    record.options.en.length !== 4
  ) {
    errors.push("दोनों भाषाओं में चार विकल्प आवश्यक हैं।");
  }

  if (
    !Number.isInteger(Number(record.correctAnswer)) ||
    Number(record.correctAnswer) < 0 ||
    Number(record.correctAnswer) > 3
  ) {
    errors.push("correctAnswer 0 से 3 के बीच होना चाहिए।");
  }

  if (!["PYQ", "AI_PRACTICE"].includes(record.type)) {
    errors.push("Question type सही नहीं है।");
  }

  if (
    record.type === "PYQ" &&
    !["pending", "verified", "rejected"].includes(
      record.verificationStatus
    )
  ) {
    errors.push("PYQ verificationStatus सही नहीं है।");
  }

  return errors.map(error => ({
    row: index + 1,
    error
  }));
}

function validateCurrentAffair(record, index) {
  const errors = [];

  if (!record.category) {
    errors.push("Category आवश्यक है।");
  }

  if (!record.eventDate) {
    errors.push("eventDate आवश्यक है।");
  }

  if (!record.title?.hi || !record.title?.en) {
    errors.push("Hindi और English title आवश्यक हैं।");
  }

  if (!record.summary?.hi || !record.summary?.en) {
    errors.push("Hindi और English summary आवश्यक हैं।");
  }

  if (!record.content?.hi || !record.content?.en) {
    errors.push("Hindi और English content आवश्यक हैं।");
  }

  return errors.map(error => ({
    row: index + 1,
    error
  }));
}

/* =========================================
   PREVIEW IMPORT
========================================= */

export async function previewImport(file, type = "questions") {
  const extension = validateFile(file);

  let records;

  if (extension === "json") {
    records = await readJSONFile(file);

    if (!Array.isArray(records)) {
      throw new Error("JSON में records की Array होनी चाहिए।");
    }
  } else {
    const text = await file.text();

    records = parseCSV(text).map(unflattenRecord);
  }

  if (!records.length) {
    throw new Error("फ़ाइल में कोई रिकॉर्ड नहीं मिला।");
  }

  if (records.length > MAX_RECORDS) {
    throw new Error(
      `एक बार में अधिकतम ${MAX_RECORDS} रिकॉर्ड स्वीकार हैं।`
    );
  }

  state.importType = type;
  state.importData = records;
  state.errors = [];
  state.validRecords = [];

  records.forEach((record, index) => {
    const errors = type === "questions"
      ? validateQuestion(record, index)
      : validateCurrentAffair(record, index);

    if (errors.length) {
      state.errors.push(...errors);
    } else {
      state.validRecords.push(record);
    }
  });

  return {
    total: records.length,
    valid: state.validRecords.length,
    invalid: state.errors.length,
    errors: [...state.errors],
    preview: records.slice(0, 10)
  };
}

/* =========================================
   IMPORT EXECUTION
========================================= */

export function setImportHandler(handler) {
  if (typeof handler !== "function") {
    throw new Error("Import handler एक function होना चाहिए।");
  }

  importHandler = handler;
}

export async function executeImport() {
  if (state.importing) {
    throw new Error("Import पहले से चल रहा है।");
  }

  if (!importHandler) {
    throw new Error(
      "Backend import handler अभी configure नहीं किया गया है।"
    );
  }

  if (state.errors.length) {
    throw new Error(
      "फ़ाइल में गलत रिकॉर्ड हैं। पहले उन्हें ठीक करें।"
    );
  }

  if (!state.validRecords.length) {
    throw new Error("Import करने के लिए valid records नहीं हैं।");
  }

  const confirmed = window.confirm(
    `${state.validRecords.length} रिकॉर्ड Import करने हैं?`
  );

  if (!confirmed) return null;

  state.importing = true;

  try {
    const result = await importHandler({
      type: state.importType,
      records: state.validRecords
    });

    notify("Import अनुरोध पूरा हुआ।", "success");

    state.importData = [];
    state.validRecords = [];
    state.errors = [];

    return result;

  } catch (error) {
    console.error("Import failed:", error);

    notify(
      error.message || "Import असफल रहा।",
      "error"
    );

    throw error;

  } finally {
    state.importing = false;
  }
}

/* =========================================
   IMPORT PREVIEW UI
========================================= */

function renderImportPreview() {
  const total = state.importData.length;
  const valid = state.validRecords.length;
  const invalid = state.errors.length;

  return `
    <section class="admin-import-preview">

      <h3>Import Preview</h3>

      <div class="admin-import-stats">

        <div>
          <strong>${total}</strong>
          <span>Total Records</span>
        </div>

        <div>
          <strong>${valid}</strong>
          <span>Valid</span>
        </div>

        <div>
          <strong>${invalid}</strong>
          <span>Errors</span>
        </div>

      </div>

      ${
        invalid
          ? `
            <div class="admin-import-errors">

              <h4>Validation Errors</h4>

              ${state.errors.slice(0, 50).map(item => `
                <p>
                  Record ${item.row}:
                  ${escapeHTML(item.error)}
                </p>
              `).join("")}

              ${
                invalid > 50
                  ? `<p>और ${invalid - 50} Errors बाकी हैं।</p>`
                  : ""
              }

            </div>
          `
          : `<p>सभी रिकॉर्ड Validation में पास हो गए।</p>`
      }

      <button
        data-action="execute-import"
        ${invalid || !valid || state.importing ? "disabled" : ""}
      >
        ${state.importing ? "Importing..." : "Import Valid Records"}
      </button>

    </section>
  `;
}

/* =========================================
   MAIN UI
========================================= */

export function renderAdminImportExport() {
  if (!root) return;

  root.innerHTML = `
    <section class="admin-import-export-page">

      <header class="admin-page-header">

        <div>
          <h2>Bulk Import / Export</h2>
          <p>Questions और Current Affairs का डेटा मैनेज करें।</p>
        </div>

      </header>

      <div class="admin-import-panel">

        <h3>Import Data</h3>

        <label class="admin-field">
          <span>Data Type</span>

          <select id="import-type">
            <option value="questions">Questions</option>
            <option value="currentAffairs">Current Affairs</option>
          </select>
        </label>

        <label class="admin-field">
          <span>JSON या CSV फ़ाइल चुनें</span>

          <input
            type="file"
            id="import-file"
            accept=".json,.csv,application/json,text/csv"
          />
        </label>

        <button data-action="preview-import">
          Validate & Preview
        </button>

        <div id="import-preview-container"></div>

      </div>

      <div class="admin-export-panel">

        <h3>Export Data</h3>

        <p>
          Export करने के लिए पहले डेटा लोड करने वाला स्रोत
          Configure करना आवश्यक है।
        </p>

        <button data-action="export-json">
          Export Loaded Data as JSON
        </button>

        <button data-action="export-csv">
          Export Loaded Data as CSV
        </button>

      </div>

    </section>
  `;

  bindEvents();
}

/* =========================================
   EVENT HANDLING
========================================= */

function bindEvents() {
  if (!root) return;

  root.onclick = async event => {
    const button = event.target.closest("[data-action]");

    if (!button) return;

    const action = button.dataset.action;

    try {
      if (action === "preview-import") {
        const file = root.querySelector("#import-file")?.files?.[0];

        const type = root.querySelector("#import-type")?.value;

        const result = await previewImport(file, type);

        root.querySelector(
          "#import-preview-container"
        ).innerHTML = renderImportPreview();

        notify(
          `कुल ${result.total} रिकॉर्ड जाँचे गए।`,
          "success"
        );
      }

      if (action === "execute-import") {
        await executeImport();

        root.querySelector(
          "#import-preview-container"
        ).innerHTML = "";

      }

      if (action === "export-json") {
        root.dispatchEvent(
          new CustomEvent("admin-export-request", {
            bubbles: true,
            detail: { format: "json" }
          })
        );
      }

      if (action === "export-csv") {
        root.dispatchEvent(
          new CustomEvent("admin-export-request", {
            bubbles: true,
            detail: { format: "csv" }
          })
        );
      }

    } catch (error) {
      notify(error.message || "कार्य पूरा नहीं हुआ।", "error");
    }
  };
}

/* =========================================
   MOUNT
========================================= */

export function mountAdminImportExport(container, options = {}) {
  if (!container) {
    throw new Error("Import Export container नहीं मिला।");
  }

  root = container;

  if (options.onImport) {
    setImportHandler(options.onImport);
  }

  renderAdminImportExport();

  return {
    preview: previewImport,
    execute: executeImport,
    setImportHandler,
    getState: () => ({
      total: state.importData.length,
      valid: state.validRecords.length,
      errors: [...state.errors],
      importing: state.importing
    })
  };
}
