import {
  getAdminQuestions,
  getAdminQuestionById,
  createAdminQuestion,
  updateAdminQuestion,
  deleteAdminQuestion,
  publishAdminQuestion,
  verifyAdminPYQ,
  requireAdmin,
  ADMIN_PERMISSIONS
} from "./admin.js";

import { EXAMS, SUBJECTS } from "./exam-data.js";

/* =========================================
   RAJASTHAN PYQ MASTER
   ADMIN QUESTION MANAGEMENT
========================================= */

const PAGE_SIZE = 20;

const state = {
  questions: [],
  selectedQuestion: null,
  filters: {
    search: "",
    examId: "",
    subjectId: "",
    type: "",
    status: "",
    verificationStatus: ""
  },
  page: 1,
  loading: false,
  error: null
};

let rootElement = null;
let onNavigate = null;
let onRefresh = null;

const escapeHTML = (value = "") =>
  String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);

const textValue = value =>
  typeof value === "string" ? value.trim() : "";

const getExamOptions = () =>
  Array.isArray(EXAMS) ? EXAMS : [];

const getSubjectOptions = () =>
  Array.isArray(SUBJECTS) ? SUBJECTS : [];

const getOptionLabel = item => {
  if (!item) return "";

  return item.name?.hi ||
    item.name?.en ||
    item.name ||
    item.title?.hi ||
    item.title?.en ||
    item.title ||
    item.id ||
    "";
};

function notify(message, type = "info") {
  rootElement?.dispatchEvent(
    new CustomEvent("admin-question-notification", {
      bubbles: true,
      detail: { message, type }
    })
  );

  if (!rootElement) {
    console.log(`[${type}] ${message}`);
  }
}

function hasPermission(permission) {
  try {
    return requireAdmin(permission);
  } catch {
    return false;
  }
}

function requirePermission(permission) {
  if (!hasPermission(permission)) {
    notify("आपके पास इस काम की अनुमति नहीं है।", "error");
    return false;
  }

  return true;
}

/* =========================================
   DATA LOADING
========================================= */

export async function loadAdminQuestions(options = {}) {
  if (!requirePermission(ADMIN_PERMISSIONS.VIEW_QUESTIONS)) {
    return [];
  }

  state.loading = true;
  state.error = null;

  try {
    const filters = {
      ...state.filters,
      page: state.page,
      pageSize: options.pageSize || PAGE_SIZE
    };

    const result = await getAdminQuestions(filters);

    state.questions = Array.isArray(result)
      ? result
      : Array.isArray(result?.questions)
        ? result.questions
        : [];

    return state.questions;

  } catch (error) {
    state.error = error;
    console.error("Admin question loading failed:", error);

    notify(
      error.message || "प्रश्न लोड नहीं हो पाए।",
      "error"
    );

    return [];

  } finally {
    state.loading = false;
  }
}

export async function loadAdminQuestion(questionId) {
  if (!requirePermission(ADMIN_PERMISSIONS.VIEW_QUESTIONS)) {
    return null;
  }

  try {
    const question = await getAdminQuestionById(questionId);

    state.selectedQuestion = question || null;

    return state.selectedQuestion;

  } catch (error) {
    console.error("Question details error:", error);

    notify("प्रश्न की जानकारी लोड नहीं हुई।", "error");

    return null;
  }
}

/* =========================================
   FILTERS
========================================= */

export function updateQuestionFilters(filters = {}) {
  state.filters = {
    ...state.filters,
    ...filters
  };

  state.page = 1;

  return state.filters;
}

export function resetQuestionFilters() {
  state.filters = {
    search: "",
    examId: "",
    subjectId: "",
    type: "",
    status: "",
    verificationStatus: ""
  };

  state.page = 1;
}

/* =========================================
   QUESTION FORM
========================================= */

function renderSelect(name, label, options, selected = "") {
  const optionHTML = options.map(item => {
    const id = item.id || item.value || "";

    return `
      <option
        value="${escapeHTML(id)}"
        ${String(selected) === String(id) ? "selected" : ""}
      >
        ${escapeHTML(getOptionLabel(item))}
      </option>
    `;
  }).join("");

  return `
    <label class="admin-field">
      <span>${escapeHTML(label)}</span>
      <select name="${escapeHTML(name)}">
        <option value="">चुनें</option>
        ${optionHTML}
      </select>
    </label>
  `;
}

function renderTextField(name, label, value = "", type = "text") {
  return `
    <label class="admin-field">
      <span>${escapeHTML(label)}</span>
      <input
        type="${escapeHTML(type)}"
        name="${escapeHTML(name)}"
        value="${escapeHTML(value)}"
      />
    </label>
  `;
}

function renderTextArea(name, label, value = "") {
  return `
    <label class="admin-field admin-field-full">
      <span>${escapeHTML(label)}</span>
      <textarea
        name="${escapeHTML(name)}"
        rows="3"
      >${escapeHTML(value)}</textarea>
    </label>
  `;
}

function renderQuestionForm(question = {}) {
  const q = question.question || {};
  const options = question.options || {};
  const explanation = question.explanation || {};

  const hindiOptions = options.hi || ["", "", "", ""];
  const englishOptions = options.en || ["", "", "", ""];

  const exams = getExamOptions();
  const subjects = getSubjectOptions();

  return `
    <form id="admin-question-form" class="admin-question-form">

      <input
        type="hidden"
        name="questionId"
        value="${escapeHTML(question.id || question.questionId || "")}"
      />

      <h3>प्रश्न की जानकारी</h3>

      ${renderSelect(
        "examId",
        "परीक्षा",
        exams,
        question.examIds?.[0] || ""
      )}

      ${renderSelect(
        "subjectId",
        "विषय",
        subjects,
        question.subjectId || ""
      )}

      ${renderTextField(
        "topicId",
        "Topic ID",
        question.topicId || ""
      )}

      ${renderTextField(
        "subtopicId",
        "Subtopic ID",
        question.subtopicId || ""
      )}

      <h3>प्रश्न — हिंदी</h3>

      ${renderTextArea("questionHi", "प्रश्न", q.hi || "")}

      <h3>Question — English</h3>

      ${renderTextArea("questionEn", "Question", q.en || "")}

      <h3>विकल्प / Options</h3>

      <div class="admin-options-grid">
        ${[0, 1, 2, 3].map(index => `
          <div class="admin-option-item">

            ${renderTextField(
              `optionHi${index}`,
              `विकल्प ${index + 1} — हिंदी`,
              hindiOptions[index] || ""
            )}

            ${renderTextField(
              `optionEn${index}`,
              `Option ${index + 1} — English`,
              englishOptions[index] || ""
            )}

          </div>
        `).join("")}
      </div>

      <h3>सही उत्तर और व्याख्या</h3>

      <label class="admin-field">
        <span>सही उत्तर चुनें</span>

        <select name="correctAnswer">
          ${[0, 1, 2, 3].map(index => `
            <option
              value="${index}"
              ${Number(question.correctAnswer) === index ? "selected" : ""}
            >
              Option ${index + 1}
            </option>
          `).join("")}
        </select>
      </label>

      ${renderTextArea(
        "explanationHi",
        "व्याख्या — हिंदी",
        explanation.hi || ""
      )}

      ${renderTextArea(
        "explanationEn",
        "Explanation — English",
        explanation.en || ""
      )}

      <h3>परीक्षा और स्रोत की जानकारी</h3>

      ${renderTextField("year", "परीक्षा वर्ष", question.year || "", "number")}

      ${renderTextField("shift", "Shift", question.shift || "")}

      ${renderTextField(
        "examDate",
        "परीक्षा की तारीख",
        question.examDate || "",
        "date"
      )}

      ${renderTextField(
        "paperName",
        "पेपर का नाम",
        question.paperName || ""
      )}

      ${renderTextField(
        "sourceUrl",
        "प्रश्न का स्रोत URL",
        question.source?.url || ""
      )}

      ${renderTextField(
        "sourceName",
        "स्रोत का नाम",
        question.source?.name || ""
      )}

      <h3>प्रश्न का प्रकार</h3>

      <label class="admin-field">
        <span>Difficulty</span>
        <select name="difficulty">
          ${["easy", "medium", "hard"].map(value => `
            <option
              value="${value}"
              ${question.difficulty === value ? "selected" : ""}
            >
              ${value.toUpperCase()}
            </option>
          `).join("")}
        </select>
      </label>

      <label class="admin-field">
        <span>Question Type</span>
        <select name="type">
          <option value="PYQ" ${question.type === "PYQ" ? "selected" : ""}>
            Previous Year Question
          </option>

          <option value="AI_PRACTICE"
            ${question.type === "AI_PRACTICE" ? "selected" : ""}>
            AI Practice
          </option>
        </select>
      </label>

      <label class="admin-field">
        <span>Verification Status</span>
        <select name="verificationStatus">
          <option value="pending">Pending</option>
          <option value="verified"
            ${question.verificationStatus === "verified" ? "selected" : ""}>
            Verified
          </option>
          <option value="rejected"
            ${question.verificationStatus === "rejected" ? "selected" : ""}>
            Rejected
          </option>
        </select>
      </label>

      <div class="admin-form-actions">

        <button type="submit" class="admin-btn-primary">
          ${question.id ? "प्रश्न अपडेट करें" : "प्रश्न सेव करें"}
        </button>

        <button type="button" data-action="cancel-form">
          Cancel
        </button>

      </div>

    </form>
  `;
}

/* =========================================
   FORM DATA
========================================= */

function getFormQuestionData(form) {
  const data = new FormData(form);

  const value = name => textValue(data.get(name));

  const correctAnswer = Number(data.get("correctAnswer"));

  if (!Number.isInteger(correctAnswer) ||
      correctAnswer < 0 ||
      correctAnswer > 3) {
    throw new Error("सही उत्तर चुनना आवश्यक है।");
  }

  const examId = value("examId");
  const subjectId = value("subjectId");

  const questionHi = value("questionHi");
  const questionEn = value("questionEn");

  if (!examId) {
    throw new Error("परीक्षा चुनें।");
  }

  if (!subjectId) {
    throw new Error("विषय चुनें।");
  }

  if (!questionHi || !questionEn) {
    throw new Error("हिंदी और English दोनों प्रश्न भरें।");
  }

  const optionsHi = [0, 1, 2, 3].map(
    index => value(`optionHi${index}`)
  );

  const optionsEn = [0, 1, 2, 3].map(
    index => value(`optionEn${index}`)
  );

  if (optionsHi.some(item => !item) ||
      optionsEn.some(item => !item)) {
    throw new Error("सभी चारों विकल्प दोनों भाषाओं में भरें।");
  }

  const type = value("type");

  if (!["PYQ", "AI_PRACTICE"].includes(type)) {
    throw new Error("अमान्य प्रश्न प्रकार।");
  }

  const verificationStatus = value("verificationStatus");

  if (!["pending", "verified", "rejected"].includes(verificationStatus)) {
    throw new Error("अमान्य verification status।");
  }

  const yearValue = value("year");
  const year = yearValue ? Number(yearValue) : null;

  if (yearValue && (!Number.isInteger(year) || year < 1900 || year > 2100)) {
    throw new Error("परीक्षा वर्ष सही भरें।");
  }

  return {
    examIds: [examId],
    subjectId,
    topicId: value("topicId"),
    subtopicId: value("subtopicId"),

    question: {
      hi: questionHi,
      en: questionEn
    },

    options: {
      hi: optionsHi,
      en: optionsEn
    },

    correctAnswer,

    explanation: {
      hi: value("explanationHi"),
      en: value("explanationEn")
    },

    year,
    shift: value("shift"),
    examDate: value("examDate"),
    paperName: value("paperName"),

    source: {
      url: value("sourceUrl"),
      name: value("sourceName")
    },

    difficulty: value("difficulty"),
    type,
    verificationStatus,

    availableLanguages: ["hi", "en"]
  };
}

/* =========================================
   SAVE / UPDATE QUESTION
========================================= */

export async function saveAdminQuestion(form) {
  const questionId = form.elements.questionId?.value;

  try {
    const payload = getFormQuestionData(form);

    if (questionId) {
      if (!requirePermission(ADMIN_PERMISSIONS.EDIT_QUESTIONS)) {
        return false;
      }

      await updateAdminQuestion(questionId, payload);

      notify("प्रश्न सफलतापूर्वक अपडेट हुआ।", "success");

    } else {
      if (!requirePermission(ADMIN_PERMISSIONS.CREATE_QUESTIONS)) {
        return false;
      }

      await createAdminQuestion(payload);

      notify("नया प्रश्न सेव हो गया।", "success");
    }

    state.selectedQuestion = null;

    await loadAdminQuestions();

    renderAdminQuestions();

    return true;

  } catch (error) {
    console.error("Question save error:", error);

    notify(error.message || "प्रश्न सेव नहीं हुआ।", "error");

    return false;
  }
}

/* =========================================
   DELETE QUESTION
========================================= */

export async function removeAdminQuestion(questionId) {
  if (!requirePermission(ADMIN_PERMISSIONS.DELETE_QUESTIONS)) {
    return false;
  }

  const confirmed = window.confirm(
    "क्या आप इस प्रश्न को स्थायी रूप से डिलीट करना चाहते हैं?"
  );

  if (!confirmed) return false;

  try {
    await deleteAdminQuestion(questionId);

    notify("प्रश्न डिलीट हो गया।", "success");

    await loadAdminQuestions();

    renderAdminQuestions();

    return true;

  } catch (error) {
    console.error("Question delete error:", error);

    notify(error.message || "प्रश्न डिलीट नहीं हुआ।", "error");

    return false;
  }
}

/* =========================================
   PUBLISH QUESTION
========================================= */

export async function publishQuestion(questionId) {
  if (!requirePermission(ADMIN_PERMISSIONS.PUBLISH_QUESTIONS)) {
    return false;
  }

  try {
    await publishAdminQuestion(questionId);

    notify("प्रश्न Publish करने का अनुरोध सफल हुआ।", "success");

    await loadAdminQuestions();

    renderAdminQuestions();

    return true;

  } catch (error) {
    console.error("Publish error:", error);

    notify(error.message || "प्रश्न Publish नहीं हुआ।", "error");

    return false;
  }
}

/* =========================================
   VERIFY PYQ
========================================= */

export async function verifyPYQQuestion(questionId) {
  if (!requirePermission(ADMIN_PERMISSIONS.VERIFY_PYQ)) {
    return false;
  }

  const confirmed = window.confirm(
    "क्या आपने मूल प्रश्नपत्र और उत्तर कुंजी से इस PYQ को जाँच लिया है?"
  );

  if (!confirmed) return false;

  try {
    await verifyAdminPYQ(questionId, {
      verificationStatus: "verified"
    });

    notify("PYQ Verification अनुरोध सफल हुआ।", "success");

    await loadAdminQuestions();

    renderAdminQuestions();

    return true;

  } catch (error) {
    console.error("PYQ verification error:", error);

    notify(error.message || "PYQ Verify नहीं हुआ।", "error");

    return false;
  }
}

/* =========================================
   QUESTION LIST UI
========================================= */

function renderQuestionCard(question) {
  const q = question.question || {};

  const title = q.hi || q.en || "Untitled Question";

  const status = question.status || "draft";
  const verification = question.verificationStatus || "pending";

  return `
    <article class="admin-question-card">

      <div class="admin-question-card-header">

        <span class="admin-status status-${escapeHTML(status)}">
          ${escapeHTML(status)}
        </span>

        <span class="admin-status verification-${escapeHTML(verification)}">
          ${escapeHTML(verification)}
        </span>

      </div>

      <h3>${escapeHTML(title)}</h3>

      <div class="admin-question-meta">

        <span>Year: ${escapeHTML(question.year || "N/A")}</span>

        <span>Shift: ${escapeHTML(question.shift || "N/A")}</span>

        <span>Type: ${escapeHTML(question.type || "N/A")}</span>

        <span>Difficulty: ${escapeHTML(question.difficulty || "N/A")}</span>

      </div>

      <div class="admin-question-actions">

        <button
          data-action="edit"
          data-id="${escapeHTML(question.id)}"
        >
          Edit
        </button>

        ${
          hasPermission(ADMIN_PERMISSIONS.PUBLISH_QUESTIONS) &&
          status !== "published"
            ? `
              <button
                data-action="publish"
                data-id="${escapeHTML(question.id)}"
              >
                Publish
              </button>
            `
            : ""
        }

        ${
          hasPermission(ADMIN_PERMISSIONS.VERIFY_PYQ) &&
          question.type === "PYQ" &&
          verification !== "verified"
            ? `
              <button
                data-action="verify"
                data-id="${escapeHTML(question.id)}"
              >
                Verify PYQ
              </button>
            `
            : ""
        }

        ${
          hasPermission(ADMIN_PERMISSIONS.DELETE_QUESTIONS)
            ? `
              <button
                class="admin-danger-btn"
                data-action="delete"
                data-id="${escapeHTML(question.id)}"
              >
                Delete
              </button>
            `
            : ""
        }

      </div>

    </article>
  `;
}

function renderFilters() {
  return `
    <div class="admin-question-filters">

      <input
        type="search"
        id="admin-question-search"
        placeholder="प्रश्न खोजें..."
        value="${escapeHTML(state.filters.search)}"
      />

      <select id="admin-filter-type">
        <option value="">सभी प्रकार</option>
        <option value="PYQ">PYQ</option>
        <option value="AI_PRACTICE">AI Practice</option>
      </select>

      <select id="admin-filter-status">
        <option value="">सभी Status</option>
        <option value="draft">Draft</option>
        <option value="published">Published</option>
      </select>

      <select id="admin-filter-verification">
        <option value="">सभी Verification</option>
        <option value="pending">Pending</option>
        <option value="verified">Verified</option>
        <option value="rejected">Rejected</option>
      </select>

      <button data-action="apply-filters">
        Filter
      </button>

      <button data-action="reset-filters">
        Reset
      </button>

    </div>
  `;
}

/* =========================================
   MAIN RENDER
========================================= */

export function renderAdminQuestions() {
  if (!rootElement) return;

  const canCreate = hasPermission(
    ADMIN_PERMISSIONS.CREATE_QUESTIONS
  );

  rootElement.innerHTML = `
    <section class="admin-questions-page">

      <header class="admin-page-header">

        <div>
          <h2>Question Management</h2>
          <p>प्रश्न जोड़ें, एडिट करें और Verify करें।</p>
        </div>

        ${
          canCreate
            ? `
              <button
                class="admin-btn-primary"
                data-action="new-question"
              >
                + नया प्रश्न जोड़ें
              </button>
            `
            : ""
        }

      </header>

      ${renderFilters()}

      <div id="admin-question-form-container"></div>

      <div class="admin-question-list">

        ${
          state.loading
            ? "<p>प्रश्न लोड हो रहे हैं...</p>"
            : state.questions.length
              ? state.questions.map(renderQuestionCard).join("")
              : `
                <div class="admin-empty-state">
                  <h3>कोई प्रश्न उपलब्ध नहीं है।</h3>
                  <p>फ़िल्टर बदलकर दोबारा कोशिश करें।</p>
                </div>
              `
        }

      </div>

      <div class="admin-pagination">

        <button
          data-action="previous-page"
          ${state.page <= 1 ? "disabled" : ""}
        >
          पिछला
        </button>

        <span>Page ${state.page}</span>

        <button data-action="next-page">
          अगला
        </button>

      </div>

    </section>
  `;

  bindAdminQuestionEvents();
}

/* =========================================
   EVENT HANDLING
========================================= */

function showQuestionForm(question = {}) {
  const container = rootElement?.querySelector(
    "#admin-question-form-container"
  );

  if (!container) return;

  container.innerHTML = renderQuestionForm(question);

  container.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function bindAdminQuestionEvents() {
  if (!rootElement) return;

  rootElement.onclick = async event => {
    const button = event.target.closest("[data-action]");

    if (!button) return;

    const action = button.dataset.action;
    const questionId = button.dataset.id;

    switch (action) {
      case "new-question":
        if (requirePermission(ADMIN_PERMISSIONS.CREATE_QUESTIONS)) {
          showQuestionForm();
        }
        break;

      case "cancel-form":
        rootElement.querySelector(
          "#admin-question-form-container"
        ).innerHTML = "";
        break;

      case "edit": {
        const question = await loadAdminQuestion(questionId);

        if (question) showQuestionForm(question);

        break;
      }

      case "delete":
        await removeAdminQuestion(questionId);
        break;

      case "publish":
        await publishQuestion(questionId);
        break;

      case "verify":
        await verifyPYQQuestion(questionId);
        break;

      case "apply-filters": {
        state.filters.search =
          rootElement.querySelector("#admin-question-search")?.value || "";

        state.filters.type =
          rootElement.querySelector("#admin-filter-type")?.value || "";

        state.filters.status =
          rootElement.querySelector("#admin-filter-status")?.value || "";

        state.filters.verificationStatus =
          rootElement.querySelector("#admin-filter-verification")?.value || "";

        state.page = 1;

        await loadAdminQuestions();

        renderAdminQuestions();

        break;
      }

      case "reset-filters":
        resetQuestionFilters();

        await loadAdminQuestions();

        renderAdminQuestions();

        break;

      case "previous-page":
        if (state.page > 1) {
          state.page--;

          await loadAdminQuestions();

          renderAdminQuestions();
        }
        break;

      case "next-page":
        state.page++;

        await loadAdminQuestions();

        renderAdminQuestions();

        break;
    }
  };

  rootElement.onsubmit = async event => {
    if (event.target.id !== "admin-question-form") return;

    event.preventDefault();

    await saveAdminQuestion(event.target);
  };
}

/* =========================================
   MOUNT MODULE
========================================= */

export async function mountAdminQuestions(
  container,
  options = {}
) {
  if (!container) {
    throw new Error("Admin questions container नहीं मिला।");
  }

  rootElement = container;
  onNavigate = options.onNavigate || null;
  onRefresh = options.onRefresh || null;

  if (!requirePermission(ADMIN_PERMISSIONS.VIEW_QUESTIONS)) {
    rootElement.innerHTML = `
      <div class="admin-access-denied">
        <h2>Access Denied</h2>
        <p>आपको प्रश्न मैनेजमेंट देखने की अनुमति नहीं है।</p>
      </div>
    `;

    return;
  }

  rootElement.innerHTML = `
    <div class="admin-loading">
      प्रश्न लोड हो रहे हैं...
    </div>
  `;

  await loadAdminQuestions();

  renderAdminQuestions();

  return {
    refresh: async () => {
      await loadAdminQuestions();
      renderAdminQuestions();
    },

    getQuestions: () => [...state.questions],

    getFilters: () => ({ ...state.filters })
  };
}

export function getAdminQuestionState() {
  return {
    questions: [...state.questions],
    selectedQuestion: state.selectedQuestion,
    filters: { ...state.filters },
    page: state.page,
    loading: state.loading,
    error: state.error
  };
}
