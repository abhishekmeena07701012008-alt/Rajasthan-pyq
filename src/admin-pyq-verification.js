import {
  getAdminQuestions,
  getAdminQuestionById,
  verifyAdminPYQ,
  requireAdmin,
  ADMIN_PERMISSIONS
} from "./admin.js";

/* =========================================
   RAJASTHAN PYQ MASTER
   PYQ VERIFICATION MODULE
========================================= */

const PAGE_SIZE = 20;

const state = {
  questions: [],
  selectedQuestion: null,
  loading: false,
  page: 1,
  filters: {
    search: "",
    examId: "",
    subjectId: "",
    year: "",
    verificationStatus: "pending"
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
    new CustomEvent("admin-pyq-notification", {
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
    notify("आपको यह कार्य करने की अनुमति नहीं है।", "error");
    return false;
  }

  return true;
}

/* =========================================
   LOAD PENDING PYQ
========================================= */

export async function loadPYQVerificationQueue() {
  if (!requirePermission(ADMIN_PERMISSIONS.VIEW_QUESTIONS)) {
    return [];
  }

  state.loading = true;

  try {
    const result = await getAdminQuestions({
      ...state.filters,
      type: "PYQ",
      page: state.page,
      pageSize: PAGE_SIZE
    });

    const questions = Array.isArray(result)
      ? result
      : result?.questions || [];

    state.questions = questions.filter(question =>
      question.verificationStatus === "pending"
    );

    return state.questions;

  } catch (error) {
    console.error("PYQ queue error:", error);

    notify(
      error.message || "PYQ सूची लोड नहीं हो सकी।",
      "error"
    );

    state.questions = [];

    return [];

  } finally {
    state.loading = false;
  }
}

/* =========================================
   LOAD QUESTION DETAILS
========================================= */

export async function loadPYQForVerification(questionId) {
  if (!requirePermission(ADMIN_PERMISSIONS.VIEW_QUESTIONS)) {
    return null;
  }

  try {
    const question = await getAdminQuestionById(questionId);

    if (!question) {
      throw new Error("प्रश्न नहीं मिला।");
    }

    if (question.type !== "PYQ") {
      throw new Error("यह Previous Year Question नहीं है।");
    }

    state.selectedQuestion = question;

    return question;

  } catch (error) {
    console.error("PYQ details error:", error);

    notify(error.message || "प्रश्न की जानकारी नहीं मिली।", "error");

    return null;
  }
}

/* =========================================
   SOURCE VALIDATION
========================================= */

function validateSource(question) {
  const source = question.source || {};

  const issues = [];

  if (!source.url) {
    issues.push("मूल प्रश्नपत्र या आधिकारिक स्रोत का URL उपलब्ध नहीं है।");
  }

  if (!source.name) {
    issues.push("स्रोत का नाम उपलब्ध नहीं है।");
  }

  if (!question.year) {
    issues.push("परीक्षा का वर्ष उपलब्ध नहीं है।");
  }

  if (!question.examIds?.length) {
    issues.push("परीक्षा की जानकारी उपलब्ध नहीं है।");
  }

  if (!question.subjectId) {
    issues.push("विषय की जानकारी उपलब्ध नहीं है।");
  }

  if (!question.question?.hi || !question.question?.en) {
    issues.push("दोनों भाषाओं में प्रश्न उपलब्ध नहीं है।");
  }

  if (
    !Array.isArray(question.options?.hi) ||
    !Array.isArray(question.options?.en) ||
    question.options.hi.length !== 4 ||
    question.options.en.length !== 4
  ) {
    issues.push("हिंदी और English के चारों विकल्प उपलब्ध नहीं हैं।");
  }

  if (
    !Number.isInteger(question.correctAnswer) ||
    question.correctAnswer < 0 ||
    question.correctAnswer > 3
  ) {
    issues.push("सही उत्तर की जानकारी अमान्य है।");
  }

  return issues;
}

/* =========================================
   REVIEW PANEL
========================================= */

function renderSource(source = {}) {
  const url = source.url || "";

  return `
    <div class="pyq-source-panel">

      <h3>मूल स्रोत की जानकारी</h3>

      <p>
        <strong>स्रोत:</strong>
        ${escapeHTML(source.name || "उपलब्ध नहीं")}
      </p>

      <p>
        <strong>URL:</strong>
        ${
          /^https?:\/\//i.test(url)
            ? `
              <a
                href="${escapeHTML(url)}"
                target="_blank"
                rel="noopener noreferrer"
              >
                स्रोत खोलें
              </a>
            `
            : "उपलब्ध नहीं"
        }
      </p>

    </div>
  `;
}

function renderQuestionReview(question) {
  const q = question.question || {};
  const options = question.options || {};

  const hindiOptions = options.hi || [];
  const englishOptions = options.en || [];

  return `
    <section class="pyq-review-panel">

      <header>
        <h2>PYQ Verification</h2>
        <p>प्रश्न की मूल स्रोत से जाँच करें।</p>
      </header>

      <div class="pyq-review-meta">

        <span>Year: ${escapeHTML(question.year || "N/A")}</span>

        <span>Shift: ${escapeHTML(question.shift || "N/A")}</span>

        <span>Exam: ${escapeHTML(question.examName || question.examIds?.join(", ") || "N/A")}</span>

        <span>Subject: ${escapeHTML(question.subjectId || "N/A")}</span>

      </div>

      <div class="pyq-review-question">

        <h3>हिंदी प्रश्न</h3>

        <p>${escapeHTML(q.hi || "उपलब्ध नहीं")}</p>

        <h3>English Question</h3>

        <p>${escapeHTML(q.en || "Not available")}</p>

      </div>

      <div class="pyq-review-options">

        <h3>विकल्पों की जाँच</h3>

        ${[0, 1, 2, 3].map(index => `
          <div class="pyq-review-option">

            <span>Option ${index + 1}</span>

            <p>${escapeHTML(hindiOptions[index] || "")}</p>

            <p>${escapeHTML(englishOptions[index] || "")}</p>

            ${
              question.correctAnswer === index
                ? `<strong class="correct-answer-label">Stored Correct Answer</strong>`
                : ""
            }

          </div>
        `).join("")}

      </div>

      <div class="pyq-review-explanation">

        <h3>व्याख्या</h3>

        <p>${escapeHTML(question.explanation?.hi || "उपलब्ध नहीं")}</p>

        <p>${escapeHTML(question.explanation?.en || "Not available")}</p>

      </div>

      ${renderSource(question.source)}

      <div class="pyq-review-checklist">

        <h3>Verification Checklist</h3>

        <label>
          <input type="checkbox" name="check-paper">
          मूल प्रश्नपत्र से प्रश्न मिलाया है।
        </label>

        <label>
          <input type="checkbox" name="check-answer">
          आधिकारिक उत्तर-कुंजी से उत्तर मिलाया है।
        </label>

        <label>
          <input type="checkbox" name="check-year">
          परीक्षा वर्ष और शिफ्ट की पुष्टि की है।
        </label>

        <label>
          <input type="checkbox" name="check-translation">
          हिंदी और English प्रश्नों का अर्थ समान है।
        </label>

      </div>

      <div class="pyq-review-actions">

        <button
          class="admin-btn-primary"
          data-action="approve-pyq"
          data-id="${escapeHTML(question.id)}"
        >
          Verify & Approve
        </button>

        <button
          class="admin-danger-btn"
          data-action="reject-pyq"
          data-id="${escapeHTML(question.id)}"
        >
          Reject
        </button>

        <button data-action="close-review">
          वापस जाएँ
        </button>

      </div>

    </section>
  `;
}

/* =========================================
   APPROVE PYQ
========================================= */

export async function approvePYQ(questionId) {
  if (!requirePermission(ADMIN_PERMISSIONS.VERIFY_PYQ)) {
    return false;
  }

  const question = state.selectedQuestion;

  if (!question || question.id !== questionId) {
    notify("पहले प्रश्न की जानकारी खोलें।", "error");
    return false;
  }

  const checklist = [
    "check-paper",
    "check-answer",
    "check-year",
    "check-translation"
  ];

  const allChecked = checklist.every(name =>
    root?.querySelector(`[name="${name}"]`)?.checked
  );

  if (!allChecked) {
    notify("सभी Verification Checklist पूरी करें।", "error");
    return false;
  }

  const issues = validateSource(question);

  if (issues.length) {
    notify(
      "Verification से पहले ये कमियाँ ठीक करें: " +
      issues.join(" "),
      "error"
    );

    return false;
  }

  const confirmed = window.confirm(
    "क्या आपने मूल प्रश्नपत्र और आधिकारिक उत्तर-कुंजी से प्रश्न की पुष्टि कर ली है?"
  );

  if (!confirmed) return false;

  try {
    await verifyAdminPYQ(questionId, {
      verificationStatus: "verified"
    });

    notify("PYQ Verification अनुरोध सफल हुआ।", "success");

    state.selectedQuestion = null;

    await loadPYQVerificationQueue();

    renderPYQVerification();

    return true;

  } catch (error) {
    console.error("PYQ approval failed:", error);

    notify(error.message || "PYQ Verify नहीं हुआ।", "error");

    return false;
  }
}

/* =========================================
   REJECT PYQ
========================================= */

export async function rejectPYQ(questionId) {
  if (!requirePermission(ADMIN_PERMISSIONS.VERIFY_PYQ)) {
    return false;
  }

  const reason = window.prompt(
    "प्रश्न Reject करने का कारण लिखें:"
  );

  if (!reason || !reason.trim()) {
    notify("Reject करने के लिए कारण आवश्यक है।", "error");
    return false;
  }

  try {
    await verifyAdminPYQ(questionId, {
      verificationStatus: "rejected",
      rejectionReason: reason.trim()
    });

    notify("प्रश्न Reject करने का अनुरोध सफल हुआ।", "success");

    state.selectedQuestion = null;

    await loadPYQVerificationQueue();

    renderPYQVerification();

    return true;

  } catch (error) {
    console.error("PYQ rejection failed:", error);

    notify(error.message || "प्रश्न Reject नहीं हुआ।", "error");

    return false;
  }
}

/* =========================================
   QUEUE UI
========================================= */

function renderQueueCard(question) {
  return `
    <article class="pyq-queue-card">

      <div class="pyq-queue-header">

        <span class="admin-status verification-pending">
          Pending Verification
        </span>

        <span>${escapeHTML(question.year || "Year N/A")}</span>

      </div>

      <h3>
        ${escapeHTML(
          question.question?.hi ||
          question.question?.en ||
          "Untitled Question"
        )}
      </h3>

      <p>
        Exam: ${escapeHTML(
          question.examName ||
          question.examIds?.join(", ") ||
          "N/A"
        )}
      </p>

      <p>
        Shift: ${escapeHTML(question.shift || "N/A")}
      </p>

      <button
        data-action="review-pyq"
        data-id="${escapeHTML(question.id)}"
      >
        Review Question
      </button>

    </article>
  `;
}

export function renderPYQVerification() {
  if (!root) return;

  root.innerHTML = `
    <section class="admin-pyq-verification">

      <header class="admin-page-header">

        <div>
          <h2>PYQ Verification Center</h2>
          <p>सभी Pending Previous Year Questions की जाँच करें।</p>
        </div>

        <button data-action="refresh-queue">
          Refresh
        </button>

      </header>

      <div id="pyq-review-container"></div>

      <div class="pyq-queue-list">

        ${
          state.loading
            ? "<p>लोड हो रहा है...</p>"
            : state.questions.length
              ? state.questions.map(renderQueueCard).join("")
              : `
                <div class="admin-empty-state">
                  <h3>कोई Pending PYQ नहीं है।</h3>
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
   EVENTS
========================================= */

function bindEvents() {
  if (!root) return;

  root.onclick = async event => {
    const button = event.target.closest("[data-action]");

    if (!button) return;

    const action = button.dataset.action;
    const id = button.dataset.id;

    switch (action) {
      case "refresh-queue":
        await loadPYQVerificationQueue();
        renderPYQVerification();
        break;

      case "review-pyq": {
        const question = await loadPYQForVerification(id);

        if (question) {
          const container = root.querySelector(
            "#pyq-review-container"
          );

          container.innerHTML = renderQuestionReview(question);

          container.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        }

        break;
      }

      case "approve-pyq":
        await approvePYQ(id);
        break;

      case "reject-pyq":
        await rejectPYQ(id);
        break;

      case "close-review":
        state.selectedQuestion = null;

        root.querySelector(
          "#pyq-review-container"
        ).innerHTML = "";

        break;

      case "previous-page":
        if (state.page > 1) {
          state.page--;

          await loadPYQVerificationQueue();

          renderPYQVerification();
        }
        break;

      case "next-page":
        state.page++;

        await loadPYQVerificationQueue();

        renderPYQVerification();

        break;
    }
  };
}

/* =========================================
   MOUNT
========================================= */

export async function mountPYQVerification(container) {
  if (!container) {
    throw new Error("PYQ verification container नहीं मिला।");
  }

  root = container;

  if (!requirePermission(ADMIN_PERMISSIONS.VIEW_QUESTIONS)) {
    root.innerHTML = `
      <div class="admin-access-denied">
        <h2>Access Denied</h2>
        <p>आपको PYQ Verification देखने की अनुमति नहीं है।</p>
      </div>
    `;

    return;
  }

  root.innerHTML = `
    <div class="admin-loading">
      PYQ Verification Queue लोड हो रही है...
    </div>
  `;

  await loadPYQVerificationQueue();

  renderPYQVerification();

  return {
    refresh: async () => {
      await loadPYQVerificationQueue();
      renderPYQVerification();
    },

    getQuestions: () => [...state.questions]
  };
}
