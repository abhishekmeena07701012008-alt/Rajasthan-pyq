/**
 * RAJASTHAN PYQ MASTER
 * File 31: Admin Reports Management
 *
 * Reports are read and updated through trusted backend callbacks.
 * Backend must verify admin permissions and ownership.
 */

const PAGE_SIZE = 20;

const REPORT_STATUS = {
  PENDING: "pending",
  REVIEWING: "reviewing",
  RESOLVED: "resolved",
  REJECTED: "rejected"
};

const REPORT_TYPES = {
  WRONG_QUESTION: "wrong_question",
  WRONG_ANSWER: "wrong_answer",
  WRONG_EXPLANATION: "wrong_explanation",
  DUPLICATE: "duplicate",
  TRANSLATION: "translation",
  OTHER: "other"
};

const TEXT = {
  hi: {
    title: "रिपोर्ट मैनेजमेंट",
    subtitle: "छात्रों द्वारा भेजी गई समस्याओं की जाँच करें",
    refresh: "रिफ्रेश",
    all: "सभी रिपोर्ट",
    pending: "लंबित",
    reviewing: "जाँच जारी",
    resolved: "हल की गई",
    rejected: "अस्वीकृत",
    search: "रिपोर्ट या प्रश्न खोजें...",
    filter: "स्टेटस",
    type: "रिपोर्ट का प्रकार",
    student: "छात्र",
    question: "प्रश्न",
    reason: "रिपोर्ट का विवरण",
    date: "तारीख",
    status: "स्थिति",
    actions: "एक्शन",
    view: "देखें",
    review: "जाँच शुरू करें",
    resolve: "समस्या हल करें",
    reject: "अस्वीकार करें",
    back: "वापस",
    noReports: "कोई रिपोर्ट नहीं मिली।",
    loading: "रिपोर्ट लोड हो रही हैं...",
    loadError: "रिपोर्ट लोड नहीं हो सकीं।",
    updateError: "रिपोर्ट अपडेट नहीं हो सकी।",
    updateSuccess: "रिपोर्ट की स्थिति अपडेट हो गई।",
    resolution: "समाधान का विवरण",
    resolutionPlaceholder: "समस्या का समाधान लिखें...",
    confirmResolve: "क्या आप इस रिपोर्ट को हल करना चाहते हैं?",
    confirmReject: "क्या आप इस रिपोर्ट को अस्वीकार करना चाहते हैं?",
    required: "कृपया समाधान का विवरण लिखें।",
    next: "अगला पेज",
    previous: "पिछला पेज",
    total: "कुल रिपोर्ट",
    questionId: "प्रश्न ID",
    reportId: "रिपोर्ट ID",
    source: "स्रोत",
    unknown: "अज्ञात",
    wrongQuestion: "गलत प्रश्न",
    wrongAnswer: "गलत उत्तर",
    wrongExplanation: "गलत व्याख्या",
    duplicate: "डुप्लिकेट प्रश्न",
    translation: "अनुवाद की समस्या",
    other: "अन्य समस्या",
    details: "रिपोर्ट की जानकारी",
    close: "बंद करें"
  },

  en: {
    title: "Report Management",
    subtitle: "Review issues submitted by students",
    refresh: "Refresh",
    all: "All Reports",
    pending: "Pending",
    reviewing: "Reviewing",
    resolved: "Resolved",
    rejected: "Rejected",
    search: "Search reports or questions...",
    filter: "Status",
    type: "Report Type",
    student: "Student",
    question: "Question",
    reason: "Report Details",
    date: "Date",
    status: "Status",
    actions: "Actions",
    view: "View",
    review: "Start Review",
    resolve: "Resolve",
    reject: "Reject",
    back: "Back",
    noReports: "No reports found.",
    loading: "Loading reports...",
    loadError: "Could not load reports.",
    updateError: "Could not update report.",
    updateSuccess: "Report status updated.",
    resolution: "Resolution Details",
    resolutionPlaceholder: "Describe the resolution...",
    confirmResolve: "Resolve this report?",
    confirmReject: "Reject this report?",
    required: "Please enter resolution details.",
    next: "Next Page",
    previous: "Previous Page",
    total: "Total Reports",
    questionId: "Question ID",
    reportId: "Report ID",
    source: "Source",
    unknown: "Unknown",
    wrongQuestion: "Wrong Question",
    wrongAnswer: "Wrong Answer",
    wrongExplanation: "Wrong Explanation",
    duplicate: "Duplicate Question",
    translation: "Translation Issue",
    other: "Other Issue",
    details: "Report Details",
    close: "Close"
  }
};

let container = null;
let language = "hi";
let reports = [];
let selectedReport = null;
let currentStatus = "pending";
let currentType = "all";
let currentPage = 0;
let searchText = "";
let isLoading = false;
let isUpdating = false;
let nextCursor = null;
let cursorHistory = [];
let callbacks = {};

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

function formatDate(value) {
  if (!value) return t("unknown");

  const date = value?.toDate
    ? value.toDate()
    : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return t("unknown");
  }

  return date.toLocaleString(
    language === "hi" ? "hi-IN" : "en-IN"
  );
}

function getStatusLabel(status) {
  const labels = {
    pending: t("pending"),
    reviewing: t("reviewing"),
    resolved: t("resolved"),
    rejected: t("rejected")
  };

  return labels[status] || status || t("unknown");
}

function getTypeLabel(type) {
  const labels = {
    wrong_question: t("wrongQuestion"),
    wrong_answer: t("wrongAnswer"),
    wrong_explanation: t("wrongExplanation"),
    duplicate: t("duplicate"),
    translation: t("translation"),
    other: t("other")
  };

  return labels[type] || t("other");
}

function showMessage(message, type = "info") {
  if (typeof callbacks.onMessage === "function") {
    callbacks.onMessage(message, type);
    return;
  }

  const element = container?.querySelector(
    "[data-report-message]"
  );

  if (!element) return;

  element.textContent = message;
  element.dataset.type = type;
  element.hidden = false;
}

function renderHeader() {
  return `
    <header class="admin-reports-header">
      <div>
        <h2>${t("title")}</h2>
        <p>${t("subtitle")}</p>
      </div>

      <button
        type="button"
        class="admin-btn admin-btn-secondary"
        data-report-refresh
      >
        ${t("refresh")}
      </button>
    </header>
  `;
}

function renderFilters() {
  return `
    <section class="admin-reports-filters">

      <input
        type="search"
        data-report-search
        placeholder="${t("search")}"
        value="${escapeHTML(searchText)}"
      />

      <select data-report-status>
        <option value="pending" ${currentStatus === "pending" ? "selected" : ""}>
          ${t("pending")}
        </option>

        <option value="reviewing" ${currentStatus === "reviewing" ? "selected" : ""}>
          ${t("reviewing")}
        </option>

        <option value="resolved" ${currentStatus === "resolved" ? "selected" : ""}>
          ${t("resolved")}
        </option>

        <option value="rejected" ${currentStatus === "rejected" ? "selected" : ""}>
          ${t("rejected")}
        </option>

        <option value="all" ${currentStatus === "all" ? "selected" : ""}>
          ${t("all")}
        </option>
      </select>

      <select data-report-type>
        <option value="all">${t("all")}</option>
        ${Object.entries(REPORT_TYPES).map(([key, value]) => `
          <option
            value="${value}"
            ${currentType === value ? "selected" : ""}
          >
            ${getTypeLabel(value)}
          </option>
        `).join("")}
      </select>

    </section>
  `;
}

function renderReportRow(report) {
  return `
    <tr>
      <td>${escapeHTML(report.id || "")}</td>

      <td>${escapeHTML(report.userName || t("unknown"))}</td>

      <td>${escapeHTML(getTypeLabel(report.type))}</td>

      <td>${escapeHTML(report.questionId || "-")}</td>

      <td>${escapeHTML(
        String(report.reason || report.description || "-").slice(0, 100)
      )}</td>

      <td>${escapeHTML(formatDate(report.createdAt))}</td>

      <td>
        <span class="admin-report-status status-${escapeHTML(report.status || "pending")}">
          ${escapeHTML(getStatusLabel(report.status))}
        </span>
      </td>

      <td>
        <button
          type="button"
          class="admin-btn admin-btn-small"
          data-report-view="${escapeHTML(report.id)}"
        >
          ${t("view")}
        </button>
      </td>
    </tr>
  `;
}

function renderTable() {
  if (isLoading) {
    return `<p class="admin-reports-loading">${t("loading")}</p>`;
  }

  if (!reports.length) {
    return `<p class="admin-reports-empty">${t("noReports")}</p>`;
  }

  return `
    <div class="admin-reports-table-wrapper">
      <table class="admin-reports-table">
        <thead>
          <tr>
            <th>${t("reportId")}</th>
            <th>${t("student")}</th>
            <th>${t("type")}</th>
            <th>${t("questionId")}</th>
            <th>${t("reason")}</th>
            <th>${t("date")}</th>
            <th>${t("status")}</th>
            <th>${t("actions")}</th>
          </tr>
        </thead>

        <tbody>
          ${reports.map(renderReportRow).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderPagination() {
  return `
    <footer class="admin-reports-pagination">
      <button
        type="button"
        data-report-previous
        ${currentPage === 0 ? "disabled" : ""}
      >
        ${t("previous")}
      </button>

      <span>${currentPage + 1}</span>

      <button
        type="button"
        data-report-next
        ${!nextCursor ? "disabled" : ""}
      >
        ${t("next")}
      </button>
    </footer>
  `;
}

function renderReportDetails() {
  if (!selectedReport) return "";

  const report = selectedReport;

  return `
    <div class="admin-report-modal-backdrop" data-report-backdrop>
      <section
        class="admin-report-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-detail-title"
      >
        <header>
          <h3 id="report-detail-title">${t("details")}</h3>

          <button
            type="button"
            data-report-close
            aria-label="${t("close")}"
          >
            ×
          </button>
        </header>

        <div class="admin-report-detail-body">

          <p><strong>${t("reportId")}:</strong>
            ${escapeHTML(report.id || "")}
          </p>

          <p><strong>${t("student")}:</strong>
            ${escapeHTML(report.userName || t("unknown"))}
          </p>

          <p><strong>${t("type")}:</strong>
            ${escapeHTML(getTypeLabel(report.type))}
          </p>

          <p><strong>${t("questionId")}:</strong>
            ${escapeHTML(report.questionId || "-")}
          </p>

          <p><strong>${t("date")}:</strong>
            ${escapeHTML(formatDate(report.createdAt))}
          </p>

          <p><strong>${t("reason")}:</strong></p>

          <div class="admin-report-reason">
            ${escapeHTML(report.reason || report.description || "-")}
          </div>

          ${report.source ? `
            <p><strong>${t("source")}:</strong>
              ${escapeHTML(report.source)}
            </p>
          ` : ""}

          ${report.resolution ? `
            <p><strong>${t("resolution")}:</strong></p>
            <div class="admin-report-resolution">
              ${escapeHTML(report.resolution)}
            </div>
          ` : ""}

          <label class="admin-settings-field">
            <span>${t("resolution")}</span>

            <textarea
              data-report-resolution
              rows="4"
              maxlength="2000"
              placeholder="${t("resolutionPlaceholder")}"
            >${escapeHTML(report.resolution || "")}</textarea>
          </label>

        </div>

        <footer>
          <button
            type="button"
            data-report-review
            ${isUpdating ? "disabled" : ""}
          >
            ${t("review")}
          </button>

          <button
            type="button"
            data-report-resolve
            ${isUpdating ? "disabled" : ""}
          >
            ${t("resolve")}
          </button>

          <button
            type="button"
            data-report-reject
            ${isUpdating ? "disabled" : ""}
          >
            ${t("reject")}
          </button>
        </footer>
      </section>
    </div>
  `;
}

function renderAdminReports() {
  if (!container) return;

  container.innerHTML = `
    <div class="admin-reports-page">

      ${renderHeader()}

      <div
        data-report-message
        class="admin-reports-message"
        role="status"
        hidden
      ></div>

      ${renderFilters()}

      ${renderTable()}

      ${renderPagination()}

      ${renderReportDetails()}

    </div>
  `;

  bindEvents();
}

function bindEvents() {
  container.querySelector("[data-report-refresh]")
    ?.addEventListener("click", () => {
      currentPage = 0;
      cursorHistory = [];
      loadReports();
    });

  container.querySelector("[data-report-status]")
    ?.addEventListener("change", event => {
      currentStatus = event.target.value;
      currentPage = 0;
      cursorHistory = [];
      loadReports();
    });

  container.querySelector("[data-report-type]")
    ?.addEventListener("change", event => {
      currentType = event.target.value;
      currentPage = 0;
      cursorHistory = [];
      loadReports();
    });

  let searchTimer;

  container.querySelector("[data-report-search]")
    ?.addEventListener("input", event => {
      clearTimeout(searchTimer);

      searchTimer = setTimeout(() => {
        searchText = event.target.value.trim();
        currentPage = 0;
        cursorHistory = [];
        loadReports();
      }, 350);
    });

  container.querySelectorAll("[data-report-view]")
    .forEach(button => {
      button.addEventListener("click", () => {
        const report = reports.find(
          item => item.id === button.dataset.reportView
        );

        if (report) {
          selectedReport = report;
          renderAdminReports();
        }
      });
    });

  container.querySelector("[data-report-close]")
    ?.addEventListener("click", closeReportDetails);

  container.querySelector("[data-report-backdrop]")
    ?.addEventListener("click", event => {
      if (event.target === event.currentTarget) {
        closeReportDetails();
      }
    });

  container.querySelector("[data-report-review]")
    ?.addEventListener("click", () => updateReportStatus("reviewing"));

  container.querySelector("[data-report-resolve]")
    ?.addEventListener("click", () => updateReportStatus("resolved"));

  container.querySelector("[data-report-reject]")
    ?.addEventListener("click", () => updateReportStatus("rejected"));

  container.querySelector("[data-report-next]")
    ?.addEventListener("click", nextPage);

  container.querySelector("[data-report-previous]")
    ?.addEventListener("click", previousPage);
}

function closeReportDetails() {
  selectedReport = null;
  renderAdminReports();
}

async function loadReports() {
  if (isLoading) return;

  isLoading = true;
  renderAdminReports();

  try {
    const result = await callbacks.loadReports({
      status: currentStatus,
      type: currentType === "all" ? null : currentType,
      search: searchText,
      pageSize: PAGE_SIZE,
      cursor: cursorHistory[currentPage] || null
    });

    reports = (result?.reports || []).map(report => ({
      ...report,
      id: String(report.id)
    }));

    nextCursor = result?.nextCursor || null;

  } catch (error) {
    console.error("Admin reports load error:", error);
    reports = [];
    nextCursor = null;
    showMessage(t("loadError"), "error");

  } finally {
    isLoading = false;
    renderAdminReports();
  }
}

async function updateReportStatus(status) {
  if (!selectedReport || isUpdating) return;

  if (status === "resolved" && !window.confirm(t("confirmResolve"))) {
    return;
  }

  if (status === "rejected" && !window.confirm(t("confirmReject"))) {
    return;
  }

  const resolution = container
    .querySelector("[data-report-resolution]")
    ?.value.trim() || "";

  if (
    (status === "resolved" || status === "rejected") &&
    !resolution
  ) {
    showMessage(t("required"), "error");
    return;
  }

  isUpdating = true;
  renderAdminReports();

  try {
    const result = await callbacks.updateReport({
      reportId: selectedReport.id,
      status,
      resolution
    });

    if (result?.success === false) {
      throw new Error(result.message || "Report update failed");
    }

    selectedReport = null;

    showMessage(t("updateSuccess"), "success");

    await loadReports();

  } catch (error) {
    console.error("Report update error:", error);
    showMessage(t("updateError"), "error");

  } finally {
    isUpdating = false;
    renderAdminReports();
  }
}

async function nextPage() {
  if (!nextCursor) return;

  cursorHistory[currentPage + 1] = nextCursor;
  currentPage++;

  await loadReports();
}

async function previousPage() {
  if (currentPage <= 0) return;

  currentPage--;
  await loadReports();
}

/**
 * Mount Admin Reports page.
 *
 * Required:
 * container: DOM element
 * loadReports: trusted backend read function
 * updateReport: trusted backend update function
 *
 * Optional:
 * language: "hi" | "en"
 * onMessage(message, type)
 */
export async function mountAdminReports(options = {}) {
  if (!options.container) {
    throw new Error("Reports container is required.");
  }

  if (
    typeof options.loadReports !== "function" ||
    typeof options.updateReport !== "function"
  ) {
    throw new Error(
      "Secure loadReports and updateReport callbacks are required."
    );
  }

  container = options.container;

  callbacks = {
    loadReports: options.loadReports,
    updateReport: options.updateReport,
    onMessage: options.onMessage
  };

  language = options.language === "en" ? "en" : "hi";

  reports = [];
  selectedReport = null;
  currentPage = 0;
  cursorHistory = [];
  nextCursor = null;

  container.innerHTML = `
    <div class="admin-reports-loading">
      ${t("loading")}
    </div>
  `;

  await loadReports();
}

export function setAdminReportsLanguage(value = "hi") {
  language = value === "en" ? "en" : "hi";
  renderAdminReports();
}

export function getAdminReportTypes() {
  return { ...REPORT_TYPES };
}

export function getAdminReportStatuses() {
  return { ...REPORT_STATUS };
}
