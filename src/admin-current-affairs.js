import {
  requireAdmin,
  ADMIN_PERMISSIONS,
  getAdminCurrentAffairs,
  createAdminCurrentAffair,
  updateAdminCurrentAffair,
  deleteAdminCurrentAffair,
  publishAdminCurrentAffair
} from "./admin.js";

/* =========================================
   RAJASTHAN PYQ MASTER
   ADMIN CURRENT AFFAIRS
========================================= */

const PAGE_SIZE = 20;

const CATEGORIES = [
  "Rajasthan",
  "National",
  "International",
  "Economy",
  "Politics",
  "Science",
  "Technology",
  "Sports",
  "Environment",
  "Awards",
  "Appointments",
  "Government Schemes",
  "Important Days"
];

const state = {
  items: [],
  selectedItem: null,
  loading: false,
  page: 1,
  filters: {
    search: "",
    category: "",
    status: "",
    month: ""
  }
};

let root = null;

const escapeHTML = value =>
  String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);

const clean = value =>
  typeof value === "string" ? value.trim() : "";

function notify(message, type = "info") {
  root?.dispatchEvent(
    new CustomEvent("admin-current-affairs-notification", {
      bubbles: true,
      detail: { message, type }
    })
  );

  if (!root) console.log(message);
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
    notify("आपको इस कार्य की अनुमति नहीं है।", "error");
    return false;
  }

  return true;
}

/* =========================================
   LOAD CURRENT AFFAIRS
========================================= */

export async function loadAdminCurrentAffairs() {
  if (!requirePermission(ADMIN_PERMISSIONS.VIEW_CURRENT_AFFAIRS)) {
    return [];
  }

  state.loading = true;

  try {
    const result = await getAdminCurrentAffairs({
      ...state.filters,
      page: state.page,
      pageSize: PAGE_SIZE
    });

    state.items = Array.isArray(result)
      ? result
      : result?.items || result?.currentAffairs || [];

    return state.items;

  } catch (error) {
    console.error("Current affairs loading error:", error);

    notify(
      error.message || "Current Affairs लोड नहीं हो सके।",
      "error"
    );

    state.items = [];

    return [];

  } finally {
    state.loading = false;
  }
}

/* =========================================
   LOAD SINGLE ITEM
========================================= */

export async function loadAdminCurrentAffair(id) {
  if (!requirePermission(ADMIN_PERMISSIONS.VIEW_CURRENT_AFFAIRS)) {
    return null;
  }

  const item = state.items.find(entry => entry.id === id);

  if (item) {
    state.selectedItem = item;
    return item;
  }

  return null;
}

/* =========================================
   FORM FIELDS
========================================= */

function textField(name, label, value = "", type = "text") {
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

function textArea(name, label, value = "") {
  return `
    <label class="admin-field admin-field-full">
      <span>${escapeHTML(label)}</span>
      <textarea
        name="${escapeHTML(name)}"
        rows="4"
      >${escapeHTML(value)}</textarea>
    </label>
  `;
}

function renderCategorySelect(selected = "") {
  return `
    <label class="admin-field">
      <span>Category</span>

      <select name="category">
        <option value="">Category चुनें</option>

        ${CATEGORIES.map(category => `
          <option
            value="${escapeHTML(category)}"
            ${selected === category ? "selected" : ""}
          >
            ${escapeHTML(category)}
          </option>
        `).join("")}

      </select>
    </label>
  `;
}

/* =========================================
   MCQ EDITOR
========================================= */

function renderMCQ(item = {}) {
  const mcq = item.mcq || {};

  const optionsHi = mcq.options?.hi || ["", "", "", ""];
  const optionsEn = mcq.options?.en || ["", "", "", ""];

  return `
    <section class="admin-current-affairs-mcq">

      <h3>Daily Quiz / MCQ</h3>

      ${textArea(
        "mcqQuestionHi",
        "प्रश्न — हिंदी",
        mcq.question?.hi || ""
      )}

      ${textArea(
        "mcqQuestionEn",
        "Question — English",
        mcq.question?.en || ""
      )}

      ${[0, 1, 2, 3].map(index => `
        <div class="admin-option-item">

          ${textField(
            `mcqOptionHi${index}`,
            `विकल्प ${index + 1} — हिंदी`,
            optionsHi[index] || ""
          )}

          ${textField(
            `mcqOptionEn${index}`,
            `Option ${index + 1} — English`,
            optionsEn[index] || ""
          )}

        </div>
      `).join("")}

      <label class="admin-field">
        <span>सही उत्तर</span>

        <select name="mcqCorrectAnswer">
          ${[0, 1, 2, 3].map(index => `
            <option
              value="${index}"
              ${Number(mcq.correctAnswer) === index ? "selected" : ""}
            >
              Option ${index + 1}
            </option>
          `).join("")}
        </select>
      </label>

      ${textArea(
        "mcqExplanationHi",
        "व्याख्या — हिंदी",
        mcq.explanation?.hi || ""
      )}

      ${textArea(
        "mcqExplanationEn",
        "Explanation — English",
        mcq.explanation?.en || ""
      )}

    </section>
  `;
}

/* =========================================
   MAIN FORM
========================================= */

function renderCurrentAffairForm(item = {}) {
  const title = item.title || {};
  const summary = item.summary || {};
  const content = item.content || {};

  return `
    <form id="admin-current-affairs-form">

      <input
        type="hidden"
        name="itemId"
        value="${escapeHTML(item.id || "")}"
      />

      <h3>खबर की जानकारी</h3>

      ${renderCategorySelect(item.category || "")}

      ${textField(
        "eventDate",
        "खबर की तारीख",
        item.eventDate || "",
        "date"
      )}

      ${textField(
        "sourceName",
        "समाचार स्रोत",
        item.source?.name || ""
      )}

      ${textField(
        "sourceUrl",
        "मूल समाचार का URL",
        item.source?.url || ""
      )}

      <h3>शीर्षक</h3>

      ${textField(
        "titleHi",
        "शीर्षक — हिंदी",
        title.hi || ""
      )}

      ${textField(
        "titleEn",
        "Title — English",
        title.en || ""
      )}

      <h3>संक्षिप्त जानकारी</h3>

      ${textArea(
        "summaryHi",
        "सारांश — हिंदी",
        summary.hi || ""
      )}

      ${textArea(
        "summaryEn",
        "Summary — English",
        summary.en || ""
      )}

      <h3>विस्तृत जानकारी</h3>

      ${textArea(
        "contentHi",
        "विस्तृत जानकारी — हिंदी",
        content.hi || ""
      )}

      ${textArea(
        "contentEn",
        "Detailed Information — English",
        content.en || ""
      )}

      ${renderMCQ(item)}

      <div class="admin-form-actions">

        <button
          type="submit"
          class="admin-btn-primary"
        >
          ${item.id ? "Update" : "Save Current Affairs"}
        </button>

        <button
          type="button"
          data-action="cancel-form"
        >
          Cancel
        </button>

      </div>

    </form>
  `;
}

/* =========================================
   FORM VALIDATION
========================================= */

function getFormPayload(form) {
  const data = new FormData(form);

  const value = name => clean(data.get(name));

  const category = value("category");
  const eventDate = value("eventDate");

  const titleHi = value("titleHi");
  const titleEn = value("titleEn");

  const summaryHi = value("summaryHi");
  const summaryEn = value("summaryEn");

  const contentHi = value("contentHi");
  const contentEn = value("contentEn");

  if (!CATEGORIES.includes(category)) {
    throw new Error("सही Category चुनें।");
  }

  if (!eventDate || Number.isNaN(Date.parse(eventDate))) {
    throw new Error("खबर की सही तारीख भरें।");
  }

  if (!titleHi || !titleEn) {
    throw new Error("हिंदी और English दोनों शीर्षक भरें।");
  }

  if (!summaryHi || !summaryEn) {
    throw new Error("दोनों भाषाओं में सारांश भरें।");
  }

  if (!contentHi || !contentEn) {
    throw new Error("दोनों भाषाओं में विस्तृत जानकारी भरें।");
  }

  const questionHi = value("mcqQuestionHi");
  const questionEn = value("mcqQuestionEn");

  const hasMCQ = Boolean(questionHi || questionEn);

  let mcq = null;

  if (hasMCQ) {
    if (!questionHi || !questionEn) {
      throw new Error("MCQ दोनों भाषाओं में भरें।");
    }

    const optionsHi = [0, 1, 2, 3].map(
      index => value(`mcqOptionHi${index}`)
    );

    const optionsEn = [0, 1, 2, 3].map(
      index => value(`mcqOptionEn${index}`)
    );

    if (
      optionsHi.some(option => !option) ||
      optionsEn.some(option => !option)
    ) {
      throw new Error("MCQ के सभी विकल्प भरें।");
    }

    const correctAnswer = Number(value("mcqCorrectAnswer"));

    if (
      !Number.isInteger(correctAnswer) ||
      correctAnswer < 0 ||
      correctAnswer > 3
    ) {
      throw new Error("MCQ का सही उत्तर चुनें।");
    }

    mcq = {
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
        hi: value("mcqExplanationHi"),
        en: value("mcqExplanationEn")
      }
    };
  }

  const sourceUrl = value("sourceUrl");

  if (sourceUrl && !/^https?:\/\//i.test(sourceUrl)) {
    throw new Error("Source URL सही नहीं है।");
  }

  return {
    category,
    eventDate,

    title: {
      hi: titleHi,
      en: titleEn
    },

    summary: {
      hi: summaryHi,
      en: summaryEn
    },

    content: {
      hi: contentHi,
      en: contentEn
    },

    source: {
      name: value("sourceName"),
      url: sourceUrl
    },

    mcq
  };
}

/* =========================================
   CREATE / UPDATE
========================================= */

export async function saveCurrentAffair(form) {
  const itemId = form.elements.itemId?.value;

  try {
    const payload = getFormPayload(form);

    if (itemId) {
      if (!requirePermission(ADMIN_PERMISSIONS.EDIT_CURRENT_AFFAIRS)) {
        return false;
      }

      await updateAdminCurrentAffair(itemId, payload);

      notify("Current Affairs अपडेट हो गया।", "success");

    } else {
      if (!requirePermission(ADMIN_PERMISSIONS.CREATE_CURRENT_AFFAIRS)) {
        return false;
      }

      await createAdminCurrentAffair(payload);

      notify("Current Affairs सेव हो गया।", "success");
    }

    state.selectedItem = null;

    await loadAdminCurrentAffairs();

    renderAdminCurrentAffairs();

    return true;

  } catch (error) {
    console.error("Current affairs save error:", error);

    notify(error.message || "जानकारी सेव नहीं हुई।", "error");

    return false;
  }
}

/* =========================================
   DELETE
========================================= */

export async function removeCurrentAffair(id) {
  if (!requirePermission(ADMIN_PERMISSIONS.DELETE_CURRENT_AFFAIRS)) {
    return false;
  }

  if (!window.confirm("क्या आप यह Current Affairs डिलीट करना चाहते हैं?")) {
    return false;
  }

  try {
    await deleteAdminCurrentAffair(id);

    notify("Current Affairs डिलीट हो गया।", "success");

    await loadAdminCurrentAffairs();

    renderAdminCurrentAffairs();

    return true;

  } catch (error) {
    console.error("Delete current affairs error:", error);

    notify(error.message || "डिलीट नहीं हो पाया।", "error");

    return false;
  }
}

/* =========================================
   PUBLISH
========================================= */

export async function publishCurrentAffair(id) {
  if (!requirePermission(ADMIN_PERMISSIONS.PUBLISH_CURRENT_AFFAIRS)) {
    return false;
  }

  try {
    await publishAdminCurrentAffair(id);

    notify("Publish अनुरोध सफल हुआ।", "success");

    await loadAdminCurrentAffairs();

    renderAdminCurrentAffairs();

    return true;

  } catch (error) {
    console.error("Publish current affairs error:", error);

    notify(error.message || "Publish नहीं हो पाया।", "error");

    return false;
  }
}

/* =========================================
   CARD UI
========================================= */

function renderCard(item) {
  const title = item.title?.hi || item.title?.en || "Untitled";

  return `
    <article class="admin-current-affairs-card">

      <div class="admin-card-header">

        <span class="admin-status">
          ${escapeHTML(item.status || "draft")}
        </span>

        <span>
          ${escapeHTML(item.category || "")}
        </span>

      </div>

      <h3>${escapeHTML(title)}</h3>

      <p>
        ${escapeHTML(item.summary?.hi || item.summary?.en || "")}
      </p>

      <div class="admin-card-meta">

        <span>
          Date: ${escapeHTML(item.eventDate || "N/A")}
        </span>

        <span>
          MCQ: ${item.mcq ? "Available" : "Not added"}
        </span>

      </div>

      <div class="admin-card-actions">

        ${
          hasPermission(ADMIN_PERMISSIONS.EDIT_CURRENT_AFFAIRS)
            ? `
              <button
                data-action="edit"
                data-id="${escapeHTML(item.id)}"
              >
                Edit
              </button>
            `
            : ""
        }

        ${
          hasPermission(ADMIN_PERMISSIONS.PUBLISH_CURRENT_AFFAIRS) &&
          item.status !== "published"
            ? `
              <button
                data-action="publish"
                data-id="${escapeHTML(item.id)}"
              >
                Publish
              </button>
            `
            : ""
        }

        ${
          hasPermission(ADMIN_PERMISSIONS.DELETE_CURRENT_AFFAIRS)
            ? `
              <button
                class="admin-danger-btn"
                data-action="delete"
                data-id="${escapeHTML(item.id)}"
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

/* =========================================
   FILTER UI
========================================= */

function renderFilters() {
  return `
    <div class="admin-current-affairs-filters">

      <input
        type="search"
        id="ca-search"
        placeholder="खबर खोजें..."
        value="${escapeHTML(state.filters.search)}"
      />

      <select id="ca-category">
        <option value="">सभी Categories</option>

        ${CATEGORIES.map(category => `
          <option
            value="${escapeHTML(category)}"
            ${state.filters.category === category ? "selected" : ""}
          >
            ${escapeHTML(category)}
          </option>
        `).join("")}

      </select>

      <select id="ca-status">
        <option value="">सभी Status</option>
        <option value="draft">Draft</option>
        <option value="published">Published</option>
      </select>

      <input
        type="month"
        id="ca-month"
        value="${escapeHTML(state.filters.month)}"
      />

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

export function renderAdminCurrentAffairs() {
  if (!root) return;

  root.innerHTML = `
    <section class="admin-current-affairs-page">

      <header class="admin-page-header">

        <div>
          <h2>Current Affairs Management</h2>
          <p>Daily Current Affairs और MCQ मैनेज करें।</p>
        </div>

        ${
          hasPermission(ADMIN_PERMISSIONS.CREATE_CURRENT_AFFAIRS)
            ? `
              <button
                class="admin-btn-primary"
                data-action="new-item"
              >
                + नई खबर जोड़ें
              </button>
            `
            : ""
        }

      </header>

      ${renderFilters()}

      <div id="ca-form-container"></div>

      <div class="admin-current-affairs-list">

        ${
          state.loading
            ? "<p>लोड हो रहा है...</p>"
            : state.items.length
              ? state.items.map(renderCard).join("")
              : `
                <div class="admin-empty-state">
                  <h3>कोई Current Affairs उपलब्ध नहीं है।</h3>
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

  bindEvents();
}

/* =========================================
   EVENT HANDLERS
========================================= */

function showForm(item = {}) {
  const container = root?.querySelector("#ca-form-container");

  if (!container) return;

  container.innerHTML = renderCurrentAffairForm(item);

  container.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function bindEvents() {
  if (!root) return;

  root.onclick = async event => {
    const button = event.target.closest("[data-action]");

    if (!button) return;

    const action = button.dataset.action;
    const id = button.dataset.id;

    switch (action) {
      case "new-item":
        if (requirePermission(ADMIN_PERMISSIONS.CREATE_CURRENT_AFFAIRS)) {
          showForm();
        }
        break;

      case "cancel-form":
        root.querySelector("#ca-form-container").innerHTML = "";
        break;

      case "edit": {
        const item = await loadAdminCurrentAffair(id);

        if (item) showForm(item);

        break;
      }

      case "delete":
        await removeCurrentAffair(id);
        break;

      case "publish":
        await publishCurrentAffair(id);
        break;

      case "apply-filters":
        state.filters.search =
          root.querySelector("#ca-search")?.value || "";

        state.filters.category =
          root.querySelector("#ca-category")?.value || "";

        state.filters.status =
          root.querySelector("#ca-status")?.value || "";

        state.filters.month =
          root.querySelector("#ca-month")?.value || "";

        state.page = 1;

        await loadAdminCurrentAffairs();

        renderAdminCurrentAffairs();

        break;

      case "reset-filters":
        state.filters = {
          search: "",
          category: "",
          status: "",
          month: ""
        };

        state.page = 1;

        await loadAdminCurrentAffairs();

        renderAdminCurrentAffairs();

        break;

      case "previous-page":
        if (state.page > 1) {
          state.page--;

          await loadAdminCurrentAffairs();

          renderAdminCurrentAffairs();
        }
        break;

      case "next-page":
        state.page++;

        await loadAdminCurrentAffairs();

        renderAdminCurrentAffairs();

        break;
    }
  };

  root.onsubmit = async event => {
    if (event.target.id !== "admin-current-affairs-form") return;

    event.preventDefault();

    await saveCurrentAffair(event.target);
  };
}

/* =========================================
   MOUNT
========================================= */

export async function mountAdminCurrentAffairs(container) {
  if (!container) {
    throw new Error("Current Affairs container नहीं मिला।");
  }

  root = container;

  if (!requirePermission(ADMIN_PERMISSIONS.VIEW_CURRENT_AFFAIRS)) {
    root.innerHTML = `
      <div class="admin-access-denied">
        <h2>Access Denied</h2>
        <p>आपको Current Affairs देखने की अनुमति नहीं है।</p>
      </div>
    `;

    return;
  }

  root.innerHTML = `
    <div class="admin-loading">
      Current Affairs लोड हो रहे हैं...
    </div>
  `;

  await loadAdminCurrentAffairs();

  renderAdminCurrentAffairs();

  return {
    refresh: async () => {
      await loadAdminCurrentAffairs();
      renderAdminCurrentAffairs();
    },

    getItems: () => [...state.items]
  };
}

export function getAdminCurrentAffairsState() {
  return {
    items: [...state.items],
    selectedItem: state.selectedItem,
    filters: { ...state.filters },
    page: state.page,
    loading: state.loading
  };
}
