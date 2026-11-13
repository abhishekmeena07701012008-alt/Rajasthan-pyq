/**
 * RAJASTHAN PYQ MASTER
 * FILE 32: ADMIN MANAGEMENT
 *
 * Features:
 * - User Management
 * - User Search and Filters
 * - User Profile
 * - Account Status Management
 * - Admin Role Management
 * - User Statistics
 * - Test History
 * - Pagination
 * - Hindi / English Interface
 *
 * SECURITY:
 * All sensitive operations must be performed through
 * trusted Cloud Functions or secure backend callbacks.
 *
 * Never trust frontend role checks.
 */

const PAGE_SIZE = 25;

export const USER_STATUS = {
  ACTIVE: "active",
  SUSPENDED: "suspended",
  DISABLED: "disabled"
};

export const USER_ROLES = {
  USER: "user",
  ADMIN: "admin",
  EDITOR: "editor",
  SUPER_ADMIN: "super_admin"
};

const TRANSLATIONS = {
  hi: {
    title: "यूज़र मैनेजमेंट",
    subtitle: "ऐप के सभी यूज़र्स को मैनेज करें",

    users: "कुल यूज़र्स",
    active: "एक्टिव यूज़र्स",
    suspended: "सस्पेंडेड",
    admins: "एडमिन",

    search: "नाम, ईमेल या UID से खोजें...",
    all: "सभी",
    filterStatus: "अकाउंट स्टेटस",
    filterRole: "यूज़र रोल",

    name: "नाम",
    email: "ईमेल",
    role: "रोल",
    status: "स्टेटस",
    joined: "जुड़ने की तारीख",
    actions: "एक्शन",

    view: "प्रोफाइल देखें",
    profile: "यूज़र प्रोफाइल",
    statistics: "यूज़र आँकड़े",
    history: "टेस्ट हिस्ट्री",

    suspend: "अकाउंट सस्पेंड करें",
    activate: "अकाउंट एक्टिव करें",
    disable: "अकाउंट बंद करें",

    changeRole: "रोल बदलें",
    saveRole: "रोल सेव करें",

    user: "सामान्य यूज़र",
    admin: "एडमिन",
    editor: "एडमिन एडिटर",
    superAdmin: "सुपर एडमिन",

    tests: "कुल टेस्ट",
    average: "औसत स्कोर",
    accuracy: "एक्यूरेसी",
    rank: "लीडरबोर्ड रैंक",

    close: "बंद करें",
    refresh: "रिफ्रेश",
    next: "अगला",
    previous: "पिछला",

    loading: "लोड हो रहा है...",
    noUsers: "कोई यूज़र नहीं मिला।",

    loadError: "यूज़र डेटा लोड नहीं हुआ।",
    updateError: "यूज़र अपडेट नहीं हुआ।",
    updateSuccess: "यूज़र अपडेट सफल हुआ।",

    confirmSuspend: "क्या आप इस यूज़र का अकाउंट सस्पेंड करना चाहते हैं?",
    confirmActivate: "क्या आप इस यूज़र का अकाउंट एक्टिव करना चाहते हैं?",
    confirmDisable: "क्या आप इस यूज़र का अकाउंट बंद करना चाहते हैं?",

    permissionError: "इस ऑपरेशन की अनुमति नहीं है।",
    unknown: "उपलब्ध नहीं",

    uid: "यूज़र UID",
    district: "जिला",
    phone: "मोबाइल",
    lastLogin: "अंतिम लॉगिन",
    created: "अकाउंट बनाया गया",

    noHistory: "टेस्ट हिस्ट्री उपलब्ध नहीं है।",
    noStatistics: "आँकड़े उपलब्ध नहीं हैं।",

    roleWarning: "सुपर एडमिन का रोल इस पैनल से नहीं बदला जा सकता।"
  },

  en: {
    title: "User Management",
    subtitle: "Manage all application users",

    users: "Total Users",
    active: "Active Users",
    suspended: "Suspended",
    admins: "Administrators",

    search: "Search by name, email or UID...",
    all: "All",
    filterStatus: "Account Status",
    filterRole: "User Role",

    name: "Name",
    email: "Email",
    role: "Role",
    status: "Status",
    joined: "Joined",
    actions: "Actions",

    view: "View Profile",
    profile: "User Profile",
    statistics: "User Statistics",
    history: "Test History",

    suspend: "Suspend Account",
    activate: "Activate Account",
    disable: "Disable Account",

    changeRole: "Change Role",
    saveRole: "Save Role",

    user: "User",
    admin: "Admin",
    editor: "Admin Editor",
    superAdmin: "Super Admin",

    tests: "Total Tests",
    average: "Average Score",
    accuracy: "Accuracy",
    rank: "Leaderboard Rank",

    close: "Close",
    refresh: "Refresh",
    next: "Next",
    previous: "Previous",

    loading: "Loading...",
    noUsers: "No users found.",

    loadError: "Could not load user data.",
    updateError: "Could not update user.",
    updateSuccess: "User updated successfully.",

    confirmSuspend: "Suspend this user's account?",
    confirmActivate: "Activate this user's account?",
    confirmDisable: "Disable this user's account?",

    permissionError: "You are not authorized for this operation.",
    unknown: "Unavailable",

    uid: "User UID",
    district: "District",
    phone: "Phone",
    lastLogin: "Last Login",
    created: "Account Created",

    noHistory: "No test history available.",
    noStatistics: "No statistics available.",

    roleWarning: "Super Admin roles cannot be changed from this panel."
  }
};

let root = null;
let language = "hi";

let users = [];
let selectedUser = null;

let currentPage = 0;
let pageCursors = [];
let nextCursor = null;

let searchQuery = "";
let statusFilter = "all";
let roleFilter = "all";

let isLoading = false;
let isUpdating = false;

let statistics = null;

let callbacks = {};

function t(key) {
  return TRANSLATIONS[language]?.[key] ||
    TRANSLATIONS.hi[key] ||
    key;
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

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
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

function roleLabel(role) {
  const labels = {
    user: t("user"),
    admin: t("admin"),
    editor: t("editor"),
    super_admin: t("superAdmin")
  };

  return labels[role] || t("unknown");
}

function statusLabel(status) {
  const labels = {
    active: t("active"),
    suspended: t("suspended"),
    disabled: t("disable")
  };

  return labels[status] || t("unknown");
}

function showMessage(message, type = "info") {
  if (typeof callbacks.onMessage === "function") {
    callbacks.onMessage(message, type);
    return;
  }

  const element = root?.querySelector("[data-user-message]");

  if (!element) return;

  element.textContent = message;
  element.dataset.type = type;
  element.hidden = false;
}

function getUserDisplayName(user) {
  return user.displayName ||
    user.name ||
    user.email ||
    t("unknown");
}

/* ----------------------------------
   DASHBOARD STATISTICS
---------------------------------- */

function renderStatistics() {
  const data = statistics || {};

  return `
    <section class="admin-user-statistics">

      <article class="admin-user-stat-card">
        <span>${t("users")}</span>
        <strong>${safeNumber(data.totalUsers)}</strong>
      </article>

      <article class="admin-user-stat-card">
        <span>${t("active")}</span>
        <strong>${safeNumber(data.activeUsers)}</strong>
      </article>

      <article class="admin-user-stat-card">
        <span>${t("suspended")}</span>
        <strong>${safeNumber(data.suspendedUsers)}</strong>
      </article>

      <article class="admin-user-stat-card">
        <span>${t("admins")}</span>
        <strong>${safeNumber(data.adminUsers)}</strong>
      </article>

    </section>
  `;
}

/* ----------------------------------
   FILTERS
---------------------------------- */

function renderFilters() {
  return `
    <section class="admin-user-filters">

      <input
        type="search"
        data-user-search
        placeholder="${t("search")}"
        value="${escapeHTML(searchQuery)}"
      />

      <select data-user-status-filter>
        <option value="all">${t("all")}</option>

        <option value="active"
          ${statusFilter === "active" ? "selected" : ""}>
          ${t("active")}
        </option>

        <option value="suspended"
          ${statusFilter === "suspended" ? "selected" : ""}>
          ${t("suspended")}
        </option>

        <option value="disabled"
          ${statusFilter === "disabled" ? "selected" : ""}>
          ${t("disable")}
        </option>
      </select>

      <select data-user-role-filter>
        <option value="all">${t("all")}</option>

        <option value="user"
          ${roleFilter === "user" ? "selected" : ""}>
          ${t("user")}
        </option>

        <option value="editor"
          ${roleFilter === "editor" ? "selected" : ""}>
          ${t("editor")}
        </option>

        <option value="admin"
          ${roleFilter === "admin" ? "selected" : ""}>
          ${t("admin")}
        </option>

        <option value="super_admin"
          ${roleFilter === "super_admin" ? "selected" : ""}>
          ${t("superAdmin")}
        </option>
      </select>

    </section>
  `;
}

/* ----------------------------------
   USER TABLE
---------------------------------- */

function renderUserRow(user) {
  return `
    <tr>

      <td>
        <div class="admin-user-name">
          <strong>
            ${escapeHTML(getUserDisplayName(user))}
          </strong>
        </div>
      </td>

      <td>${escapeHTML(user.email || "-")}</td>

      <td>
        ${escapeHTML(roleLabel(user.role || "user"))}
      </td>

      <td>
        <span class="admin-user-status status-${escapeHTML(user.status || "active")}">
          ${escapeHTML(statusLabel(user.status || "active"))}
        </span>
      </td>

      <td>${escapeHTML(formatDate(user.createdAt))}</td>

      <td>
        <button
          type="button"
          class="admin-btn admin-btn-small"
          data-user-view="${escapeHTML(user.id)}"
        >
          ${t("view")}
        </button>
      </td>

    </tr>
  `;
}

function renderUserTable() {
  if (isLoading) {
    return `<p>${t("loading")}</p>`;
  }

  if (!users.length) {
    return `<p>${t("noUsers")}</p>`;
  }

  return `
    <div class="admin-user-table-wrapper">

      <table class="admin-user-table">

        <thead>
          <tr>
            <th>${t("name")}</th>
            <th>${t("email")}</th>
            <th>${t("role")}</th>
            <th>${t("status")}</th>
            <th>${t("joined")}</th>
            <th>${t("actions")}</th>
          </tr>
        </thead>

        <tbody>
          ${users.map(renderUserRow).join("")}
        </tbody>

      </table>

    </div>
  `;
}

/* ----------------------------------
   PAGINATION
---------------------------------- */

function renderPagination() {
  return `
    <footer class="admin-user-pagination">

      <button
        type="button"
        data-user-previous
        ${currentPage <= 0 ? "disabled" : ""}
      >
        ${t("previous")}
      </button>

      <span>${currentPage + 1}</span>

      <button
        type="button"
        data-user-next
        ${!nextCursor ? "disabled" : ""}
      >
        ${t("next")}
      </button>

    </footer>
  `;
}

/* ----------------------------------
   USER PROFILE MODAL
---------------------------------- */

function renderUserProfile() {
  if (!selectedUser) return "";

  const user = selectedUser;
  const stats = user.statistics || {};

  const isSuperAdmin = user.role === USER_ROLES.SUPER_ADMIN;

  return `
    <div class="admin-user-modal-backdrop" data-user-backdrop>

      <section
        class="admin-user-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-user-profile-title"
      >

        <header>
          <h3 id="admin-user-profile-title">
            ${t("profile")}
          </h3>

          <button type="button" data-user-close>
            ×
          </button>
        </header>

        <div class="admin-user-profile-body">

          <h2>
            ${escapeHTML(getUserDisplayName(user))}
          </h2>

          <p>
            <strong>${t("email")}:</strong>
            ${escapeHTML(user.email || "-")}
          </p>

          <p>
            <strong>${t("uid")}:</strong>
            ${escapeHTML(user.id || "-")}
          </p>

          <p>
            <strong>${t("phone")}:</strong>
            ${escapeHTML(user.phoneNumber || "-")}
          </p>

          <p>
            <strong>${t("district")}:</strong>
            ${escapeHTML(user.district || "-")}
          </p>

          <p>
            <strong>${t("role")}:</strong>
            ${escapeHTML(roleLabel(user.role || "user"))}
          </p>

          <p>
            <strong>${t("status")}:</strong>
            ${escapeHTML(statusLabel(user.status || "active"))}
          </p>

          <p>
            <strong>${t("created")}:</strong>
            ${escapeHTML(formatDate(user.createdAt))}
          </p>

          <p>
            <strong>${t("lastLogin")}:</strong>
            ${escapeHTML(formatDate(user.lastLoginAt))}
          </p>

          <hr />

          <h3>${t("statistics")}</h3>

          <div class="admin-user-profile-stats">

            <article>
              <span>${t("tests")}</span>
              <strong>${safeNumber(stats.totalTests)}</strong>
            </article>

            <article>
              <span>${t("average")}</span>
              <strong>${safeNumber(stats.averageScore)}%</strong>
            </article>

            <article>
              <span>${t("accuracy")}</span>
              <strong>${safeNumber(stats.accuracy)}%</strong>
            </article>

            <article>
              <span>${t("rank")}</span>
              <strong>${stats.rank ?? "-"}</strong>
            </article>

          </div>

          <hr />

          ${!isSuperAdmin ? `
            <section class="admin-user-role-section">

              <h3>${t("changeRole")}</h3>

              <select data-user-new-role>

                <option value="user"
                  ${user.role === "user" ? "selected" : ""}>
                  ${t("user")}
                </option>

                <option value="editor"
                  ${user.role === "editor" ? "selected" : ""}>
                  ${t("editor")}
                </option>

                <option value="admin"
                  ${user.role === "admin" ? "selected" : ""}>
                  ${t("admin")}
                </option>

              </select>

              <button
                type="button"
                data-user-save-role
                ${isUpdating ? "disabled" : ""}
              >
                ${t("saveRole")}
              </button>

            </section>

            <hr />

            <section class="admin-user-actions">

              ${user.status === "suspended" ||
                user.status === "disabled" ? `
                <button
                  type="button"
                  data-user-action="activate"
                  ${isUpdating ? "disabled" : ""}
                >
                  ${t("activate")}
                </button>
              ` : `
                <button
                  type="button"
                  data-user-action="suspend"
                  ${isUpdating ? "disabled" : ""}
                >
                  ${t("suspend")}
                </button>
              `}

              <button
                type="button"
                data-user-action="disable"
                ${isUpdating ? "disabled" : ""}
              >
                ${t("disable")}
              </button>

            </section>
          ` : `
            <p>${t("roleWarning")}</p>
          `}

          <hr />

          <section class="admin-user-history">

            <h3>${t("history")}</h3>

            <button
              type="button"
              data-user-load-history
            >
              ${t("history")}
            </button>

            <div data-user-history-content></div>

          </section>

        </div>

      </section>

    </div>
  `;
}

/* ----------------------------------
   MAIN RENDER
---------------------------------- */

function renderAdminManagement() {
  if (!root) return;

  root.innerHTML = `
    <div class="admin-management-page">

      <header class="admin-management-header">

        <div>
          <h2>${t("title")}</h2>
          <p>${t("subtitle")}</p>
        </div>

        <button
          type="button"
          data-user-refresh
          class="admin-btn admin-btn-secondary"
        >
          ${t("refresh")}
        </button>

      </header>

      <div
        data-user-message
        class="admin-user-message"
        role="status"
        hidden
      ></div>

      ${renderStatistics()}

      ${renderFilters()}

      ${renderUserTable()}

      ${renderPagination()}

      ${renderUserProfile()}

    </div>
  `;

  bindEvents();
}

/* ----------------------------------
   LOAD USERS
---------------------------------- */

async function loadUsers() {
  if (isLoading) return;

  isLoading = true;
  renderAdminManagement();

  try {
    const result = await callbacks.loadUsers({
      pageSize: PAGE_SIZE,
      cursor: pageCursors[currentPage] || null,
      search: searchQuery,
      status: statusFilter,
      role: roleFilter
    });

    users = (result?.users || []).map(user => ({
      ...user,
      id: String(user.id)
    }));

    nextCursor = result?.nextCursor || null;

    if (result?.statistics) {
      statistics = result.statistics;
    }

  } catch (error) {
    console.error("Admin user load error:", error);

    users = [];
    nextCursor = null;

    showMessage(t("loadError"), "error");

  } finally {
    isLoading = false;
    renderAdminManagement();
  }
}

/* ----------------------------------
   LOAD USER PROFILE
---------------------------------- */

async function openUserProfile(userId) {
  if (typeof callbacks.loadUserProfile !== "function") {
    showMessage(t("loadError"), "error");
    return;
  }

  try {
    const result = await callbacks.loadUserProfile(userId);

    if (!result) {
      throw new Error("User not found");
    }

    selectedUser = {
      ...result,
      id: String(result.id || userId)
    };

    renderAdminManagement();

  } catch (error) {
    console.error("User profile error:", error);
    showMessage(t("loadError"), "error");
  }
}

/* ----------------------------------
   CHANGE USER ROLE
---------------------------------- */

async function changeUserRole() {
  if (!selectedUser || isUpdating) return;

  const roleSelect = root.querySelector("[data-user-new-role]");
  const newRole = roleSelect?.value;

  if (!Object.values(USER_ROLES).includes(newRole)) {
    showMessage(t("permissionError"), "error");
    return;
  }

  if (
    selectedUser.role === USER_ROLES.SUPER_ADMIN ||
    newRole === USER_ROLES.SUPER_ADMIN
  ) {
    showMessage(t("roleWarning"), "error");
    return;
  }

  if (typeof callbacks.changeUserRole !== "function") {
    showMessage(t("updateError"), "error");
    return;
  }

  isUpdating = true;
  renderAdminManagement();

  try {
    const result = await callbacks.changeUserRole({
      userId: selectedUser.id,
      role: newRole
    });

    if (result?.success === false) {
      throw new Error(result.message || "Role update failed");
    }

    showMessage(t("updateSuccess"), "success");

    await openUserProfile(selectedUser.id);
    await loadUsers();

  } catch (error) {
    console.error("Role update error:", error);
    showMessage(t("updateError"), "error");

  } finally {
    isUpdating = false;
    renderAdminManagement();
  }
}

/* ----------------------------------
   ACCOUNT STATUS
---------------------------------- */

async function changeUserStatus(action) {
  if (!selectedUser || isUpdating) return;

  if (selectedUser.role === USER_ROLES.SUPER_ADMIN) {
    showMessage(t("permissionError"), "error");
    return;
  }

  const statusMap = {
    suspend: {
      status: USER_STATUS.SUSPENDED,
      confirmation: t("confirmSuspend")
    },

    activate: {
      status: USER_STATUS.ACTIVE,
      confirmation: t("confirmActivate")
    },

    disable: {
      status: USER_STATUS.DISABLED,
      confirmation: t("confirmDisable")
    }
  };

  const operation = statusMap[action];

  if (!operation) return;

  if (!window.confirm(operation.confirmation)) {
    return;
  }

  if (typeof callbacks.changeUserStatus !== "function") {
    showMessage(t("updateError"), "error");
    return;
  }

  isUpdating = true;
  renderAdminManagement();

  try {
    const result = await callbacks.changeUserStatus({
      userId: selectedUser.id,
      status: operation.status
    });

    if (result?.success === false) {
      throw new Error(result.message || "Status update failed");
    }

    showMessage(t("updateSuccess"), "success");

    await openUserProfile(selectedUser.id);
    await loadUsers();

  } catch (error) {
    console.error("User status error:", error);
    showMessage(t("updateError"), "error");

  } finally {
    isUpdating = false;
    renderAdminManagement();
  }
}

/* ----------------------------------
   USER TEST HISTORY
---------------------------------- */

async function loadUserHistory() {
  if (!selectedUser) return;

  const target = root.querySelector(
    "[data-user-history-content]"
  );

  if (!target) return;

  if (typeof callbacks.loadUserHistory !== "function") {
    target.textContent = t("noHistory");
    return;
  }

  target.textContent = t("loading");

  try {
    const result = await callbacks.loadUserHistory({
      userId: selectedUser.id,
      pageSize: 10
    });

    const attempts = result?.attempts || [];

    if (!attempts.length) {
      target.textContent = t("noHistory");
      return;
    }

    target.innerHTML = `
      <div class="admin-user-history-list">

        ${attempts.map(attempt => `
          <article class="admin-user-history-item">

            <strong>
              ${escapeHTML(attempt.examName || "Test")}
            </strong>

            <span>
              ${escapeHTML(formatDate(attempt.submittedAt))}
            </span>

            <span>
              ${safeNumber(attempt.score)} /
              ${safeNumber(attempt.totalMarks)}
            </span>

          </article>
        `).join("")}

      </div>
    `;

  } catch (error) {
    console.error("User history error:", error);
    target.textContent = t("noHistory");
  }
}

/* ----------------------------------
   EVENT HANDLERS
---------------------------------- */

function bindEvents() {
  root.querySelector("[data-user-refresh]")
    ?.addEventListener("click", () => {
      currentPage = 0;
      pageCursors = [];
      loadUsers();
    });

  root.querySelector("[data-user-status-filter]")
    ?.addEventListener("change", event => {
      statusFilter = event.target.value;
      currentPage = 0;
      pageCursors = [];
      loadUsers();
    });

  root.querySelector("[data-user-role-filter]")
    ?.addEventListener("change", event => {
      roleFilter = event.target.value;
      currentPage = 0;
      pageCursors = [];
      loadUsers();
    });

  let searchTimer;

  root.querySelector("[data-user-search]")
    ?.addEventListener("input", event => {
      clearTimeout(searchTimer);

      searchTimer = setTimeout(() => {
        searchQuery = event.target.value.trim();
        currentPage = 0;
        pageCursors = [];
        loadUsers();
      }, 400);
    });

  root.querySelectorAll("[data-user-view]")
    .forEach(button => {
      button.addEventListener("click", () => {
        openUserProfile(button.dataset.userView);
      });
    });

  root.querySelector("[data-user-close]")
    ?.addEventListener("click", closeProfile);

  root.querySelector("[data-user-backdrop]")
    ?.addEventListener("click", event => {
      if (event.target === event.currentTarget) {
        closeProfile();
      }
    });

  root.querySelector("[data-user-save-role]")
    ?.addEventListener("click", changeUserRole);

  root.querySelectorAll("[data-user-action]")
    .forEach(button => {
      button.addEventListener("click", () => {
        changeUserStatus(button.dataset.userAction);
      });
    });

  root.querySelector("[data-user-load-history]")
    ?.addEventListener("click", loadUserHistory);

  root.querySelector("[data-user-next]")
    ?.addEventListener("click", nextPage);

  root.querySelector("[data-user-previous]")
    ?.addEventListener("click", previousPage);
}

function closeProfile() {
  selectedUser = null;
  renderAdminManagement();
}

/* ----------------------------------
   PAGINATION ACTIONS
---------------------------------- */

async function nextPage() {
  if (!nextCursor) return;

  pageCursors[currentPage + 1] = nextCursor;
  currentPage++;

  await loadUsers();
}

async function previousPage() {
  if (currentPage <= 0) return;

  currentPage--;
  await loadUsers();
}

/* ----------------------------------
   PUBLIC MOUNT FUNCTION
---------------------------------- */

/**
 * Required callbacks:
 *
 * loadUsers(params)
 * loadUserProfile(userId)
 * changeUserRole(params)
 * changeUserStatus(params)
 *
 * Optional:
 *
 * loadUserHistory(params)
 * loadStatistics()
 * onMessage(message, type)
 */

export async function mountAdminManagement(options = {}) {
  if (!options.container) {
    throw new Error("Admin management container is required.");
  }

  const requiredCallbacks = [
    "loadUsers",
    "loadUserProfile",
    "changeUserRole",
    "changeUserStatus"
  ];

  for (const name of requiredCallbacks) {
    if (typeof options[name] !== "function") {
      throw new Error(`Missing required callback: ${name}`);
    }
  }

  root = options.container;

  language = options.language === "en" ? "en" : "hi";

  callbacks = {
    loadUsers: options.loadUsers,
    loadUserProfile: options.loadUserProfile,
    changeUserRole: options.changeUserRole,
    changeUserStatus: options.changeUserStatus,
    loadUserHistory: options.loadUserHistory,
    loadStatistics: options.loadStatistics,
    onMessage: options.onMessage
  };

  users = [];
  selectedUser = null;
  currentPage = 0;
  pageCursors = [];
  nextCursor = null;

  root.innerHTML = `<p>${t("loading")}</p>`;

  if (typeof callbacks.loadStatistics === "function") {
    try {
      statistics = await callbacks.loadStatistics();
    } catch (error) {
      console.error("User statistics error:", error);
      statistics = null;
    }
  }

  await loadUsers();
}

/* ----------------------------------
   PUBLIC HELPERS
---------------------------------- */

export function setAdminManagementLanguage(value = "hi") {
  language = value === "en" ? "en" : "hi";
  renderAdminManagement();
}

export function getAdminManagementFilters() {
  return {
    search: searchQuery,
    status: statusFilter,
    role: roleFilter,
    page: currentPage
  };
}

export function getSelectedAdminUser() {
  return selectedUser ? { ...selectedUser } : null;
}

export function refreshAdminUsers() {
  currentPage = 0;
  pageCursors = [];
  return loadUsers();
}
