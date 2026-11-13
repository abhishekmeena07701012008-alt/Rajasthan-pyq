import {
  getAdminState,
  requireAdmin,
  getAdminDashboardStatistics,
  getRecentAdminActivity,
  ADMIN_PERMISSIONS
} from "./admin.js";

/*
|--------------------------------------------------------------------------
| CONFIGURATION
|--------------------------------------------------------------------------
*/

export const ADMIN_DASHBOARD_CONFIG = {
  REFRESH_INTERVAL: 60000,
  ACTIVITY_LIMIT: 10
};

/*
|--------------------------------------------------------------------------
| TRANSLATIONS
|--------------------------------------------------------------------------
*/

const TEXT = {
  hi: {
    title: "एडमिन डैशबोर्ड",
    subtitle: "राजस्थान PYQ Master का प्रशासनिक कंट्रोल पैनल",
    refresh: "रिफ्रेश करें",
    loading: "डेटा लोड हो रहा है...",
    error: "डैशबोर्ड लोड नहीं हो पाया।",
    retry: "दोबारा कोशिश करें",
    totalUsers: "कुल विद्यार्थी",
    totalQuestions: "कुल प्रश्न",
    publishedQuestions: "प्रकाशित प्रश्न",
    pendingPYQ: "सत्यापन बाकी PYQ",
    totalAttempts: "कुल टेस्ट प्रयास",
    pendingReports: "लंबित रिपोर्ट",
    currentAffairs: "प्रकाशित Current Affairs",
    recentActivity: "हाल की गतिविधियाँ",
    noActivity: "अभी कोई गतिविधि उपलब्ध नहीं है।",
    generatedAt: "अंतिम अपडेट",
    quickActions: "त्वरित कार्य",
    manageQuestions: "प्रश्न प्रबंधन",
    verifyPYQ: "PYQ सत्यापन",
    manageCurrentAffairs: "Current Affairs",
    manageReports: "रिपोर्ट प्रबंधन",
    aiResearch: "AI Research",
    announcements: "Announcements",
    accessDenied: "आपके पास Admin Dashboard का अधिकार नहीं है।",
    unknown: "अज्ञात गतिविधि",
    noDate: "तारीख उपलब्ध नहीं",
    role: "आपकी भूमिका",
    superAdmin: "Super Admin",
    adminEditor: "Admin Editor",
    status: "सिस्टम स्थिति",
    connected: "डेटाबेस से डेटा प्राप्त हुआ",
    partial: "कुछ जानकारी उपलब्ध नहीं है"
  },

  en: {
    title: "Admin Dashboard",
    subtitle: "Rajasthan PYQ Master Administration Panel",
    refresh: "Refresh",
    loading: "Loading dashboard...",
    error: "Dashboard could not be loaded.",
    retry: "Try Again",
    totalUsers: "Total Students",
    totalQuestions: "Total Questions",
    publishedQuestions: "Published Questions",
    pendingPYQ: "PYQ Pending Verification",
    totalAttempts: "Total Test Attempts",
    pendingReports: "Pending Reports",
    currentAffairs: "Published Current Affairs",
    recentActivity: "Recent Activity",
    noActivity: "No recent activity available.",
    generatedAt: "Last Updated",
    quickActions: "Quick Actions",
    manageQuestions: "Manage Questions",
    verifyPYQ: "Verify PYQ",
    manageCurrentAffairs: "Current Affairs",
    manageReports: "Manage Reports",
    aiResearch: "AI Research",
    announcements: "Announcements",
    accessDenied: "You do not have permission to access the Admin Dashboard.",
    unknown: "Unknown activity",
    noDate: "Date unavailable",
    role: "Your Role",
    superAdmin: "Super Admin",
    adminEditor: "Admin Editor",
    status: "System Status",
    connected: "Data received from database",
    partial: "Some information is unavailable"
  }
};

/*
|--------------------------------------------------------------------------
| STATE
|--------------------------------------------------------------------------
*/

let dashboardState = {
  loading: false,
  loaded: false,
  error: null,
  statistics: null,
  activities: [],
  partialErrors: [],
  lastUpdated: null
};

let refreshTimer = null;

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

function getLanguage(language) {
  return language === "en" ? "en" : "hi";
}

function t(key, language = "hi") {
  const lang = getLanguage(language);
  return TEXT[lang][key] || key;
}

function escapeHTML(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]
  );
}

function formatNumber(value, language = "hi") {
  return new Intl.NumberFormat(
    getLanguage(language) === "hi" ? "hi-IN" : "en-IN"
  ).format(Number(value) || 0);
}

function formatDate(value, language = "hi") {
  if (!value) {
    return t("noDate", language);
  }

  let date;

  if (value instanceof Date) {
    date = value;
  } else if (value?.toDate) {
    date = value.toDate();
  } else if (typeof value === "string") {
    date = new Date(value);
  } else if (typeof value === "number") {
    date = new Date(value);
  } else {
    return t("noDate", language);
  }

  if (Number.isNaN(date.getTime())) {
    return t("noDate", language);
  }

  return new Intl.DateTimeFormat(
    getLanguage(language) === "hi" ? "hi-IN" : "en-IN",
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Kolkata"
    }
  ).format(date);
}

/*
|--------------------------------------------------------------------------
| GET DASHBOARD STATE
|--------------------------------------------------------------------------
*/

export function getAdminDashboardState() {
  return {
    ...dashboardState,
    statistics: dashboardState.statistics
      ? { ...dashboardState.statistics }
      : null,
    activities: [...dashboardState.activities],
    partialErrors: [...dashboardState.partialErrors]
  };
}

/*
|--------------------------------------------------------------------------
| CHECK ACCESS
|--------------------------------------------------------------------------
*/

export async function checkAdminDashboardAccess() {
  const identity = await requireAdmin({
    permission: ADMIN_PERMISSIONS.VIEW_DASHBOARD
  });

  return {
    allowed: true,
    uid: identity.uid,
    role: identity.role
  };
}

/*
|--------------------------------------------------------------------------
| LOAD STATISTICS AND ACTIVITY
|--------------------------------------------------------------------------
*/

export async function loadAdminDashboard(options = {}) {
  if (dashboardState.loading) {
    return getAdminDashboardState();
  }

  dashboardState.loading = true;
  dashboardState.error = null;
  dashboardState.partialErrors = [];

  try {
    await checkAdminDashboardAccess();

    const results = await Promise.allSettled([
      getAdminDashboardStatistics(),
      getRecentAdminActivity({
        pageSize:
          options.activityLimit ||
          ADMIN_DASHBOARD_CONFIG.ACTIVITY_LIMIT
      })
    ]);

    if (results[0].status === "fulfilled") {
      dashboardState.statistics = results[0].value;
    } else {
      dashboardState.statistics = null;
      dashboardState.partialErrors.push("statistics");
    }

    if (results[1].status === "fulfilled") {
      dashboardState.activities = results[1].value;
    } else {
      dashboardState.activities = [];
      dashboardState.partialErrors.push("activities");
    }

    if (
      results[0].status === "rejected" &&
      results[1].status === "rejected"
    ) {
      throw new Error(
        "Dashboard data प्राप्त नहीं हो पाया।"
      );
    }

    dashboardState.loaded = true;
    dashboardState.lastUpdated = new Date();

    return getAdminDashboardState();

  } catch (error) {
    console.error("Admin dashboard error:", error);

    dashboardState.error = error.message ||
      "Dashboard load failed.";

    throw error;

  } finally {
    dashboardState.loading = false;
  }
}

/*
|--------------------------------------------------------------------------
| STATISTIC CARD DEFINITIONS
|--------------------------------------------------------------------------
*/

export function getDashboardCards(language = "hi") {
  const stats = dashboardState.statistics || {};

  return [
    {
      id: "totalUsers",
      title: t("totalUsers", language),
      value: stats.totalUsers ?? null,
      icon: "👥",
      color: "blue"
    },
    {
      id: "totalQuestions",
      title: t("totalQuestions", language),
      value: stats.totalQuestions ?? null,
      icon: "❓",
      color: "purple"
    },
    {
      id: "publishedQuestions",
      title: t("publishedQuestions", language),
      value: stats.publishedQuestions ?? null,
      icon: "📚",
      color: "green"
    },
    {
      id: "pendingPYQ",
      title: t("pendingPYQ", language),
      value: stats.pendingPYQ ?? null,
      icon: "🔍",
      color: "orange"
    },
    {
      id: "totalAttempts",
      title: t("totalAttempts", language),
      value: stats.totalAttempts ?? null,
      icon: "📝",
      color: "cyan"
    },
    {
      id: "pendingReports",
      title: t("pendingReports", language),
      value: stats.pendingReports ?? null,
      icon: "🚩",
      color: "red"
    },
    {
      id: "publishedCurrentAffairs",
      title: t("currentAffairs", language),
      value: stats.publishedCurrentAffairs ?? null,
      icon: "📰",
      color: "teal"
    }
  ];
}

/*
|--------------------------------------------------------------------------
| RECENT ACTIVITY HELPERS
|--------------------------------------------------------------------------
*/

function getActivityTitle(activity, language) {
  const title = activity.title;

  if (title) {
    if (typeof title === "object") {
      return title[language] ||
        title.hi ||
        title.en ||
        t("unknown", language);
    }

    return title;
  }

  const action = activity.action || activity.type;

  const translations = {
    question_created: {
      hi: "नया प्रश्न बनाया गया",
      en: "New question created"
    },
    question_updated: {
      hi: "प्रश्न अपडेट किया गया",
      en: "Question updated"
    },
    question_published: {
      hi: "प्रश्न प्रकाशित किया गया",
      en: "Question published"
    },
    pyq_verified: {
      hi: "PYQ सत्यापित किया गया",
      en: "PYQ verified"
    },
    current_affairs_published: {
      hi: "Current Affairs प्रकाशित हुआ",
      en: "Current Affairs published"
    },
    report_reviewed: {
      hi: "रिपोर्ट की समीक्षा हुई",
      en: "Report reviewed"
    },
    announcement_created: {
      hi: "नई घोषणा बनाई गई",
      en: "New announcement created"
    },
    admin_role_updated: {
      hi: "Admin Role अपडेट हुआ",
      en: "Admin role updated"
    }
  };

  return translations[action]?.[language] ||
    action ||
    t("unknown", language);
}

function getActivityDescription(activity, language) {
  const description = activity.description;

  if (typeof description === "object") {
    return description?.[language] ||
      description?.hi ||
      description?.en ||
      "";
  }

  return description || "";
}

export function normalizeAdminActivity(
  activity,
  language = "hi"
) {
  const lang = getLanguage(language);

  return {
    id: activity.id || "",
    title: getActivityTitle(activity, lang),
    description: getActivityDescription(activity, lang),
    actor: activity.actorName ||
      activity.adminEmail ||
      activity.userEmail ||
      "",
    date: formatDate(activity.createdAt, lang),
    action: activity.action || activity.type || "unknown"
  };
}

/*
|--------------------------------------------------------------------------
| QUICK ACTIONS
|--------------------------------------------------------------------------
*/

export function getAdminQuickActions(language = "hi") {
  const state = getAdminState();
  const permissions = state.permissions || [];

  const actions = [
    {
      id: "questions",
      title: t("manageQuestions", language),
      icon: "📚",
      permission: ADMIN_PERMISSIONS.VIEW_QUESTIONS,
      route: "admin-questions"
    },
    {
      id: "verify-pyq",
      title: t("verifyPYQ", language),
      icon: "🔍",
      permission: ADMIN_PERMISSIONS.VERIFY_PYQ,
      route: "admin-pyq-verification"
    },
    {
      id: "current-affairs",
      title: t("manageCurrentAffairs", language),
      icon: "📰",
      permission: ADMIN_PERMISSIONS.MANAGE_CURRENT_AFFAIRS,
      route: "admin-current-affairs"
    },
    {
      id: "reports",
      title: t("manageReports", language),
      icon: "🚩",
      permission: ADMIN_PERMISSIONS.REVIEW_REPORTS,
      route: "admin-reports"
    },
    {
      id: "ai-research",
      title: t("aiResearch", language),
      icon: "🤖",
      permission: ADMIN_PERMISSIONS.RUN_AI_RESEARCH,
      route: "admin-ai-research"
    },
    {
      id: "announcements",
      title: t("announcements", language),
      icon: "📢",
      permission: ADMIN_PERMISSIONS.MANAGE_ANNOUNCEMENTS,
      route: "admin-announcements"
    }
  ];

  return actions.filter(action =>
    permissions.includes(action.permission)
  );
}

/*
|--------------------------------------------------------------------------
| ROLE DISPLAY
|--------------------------------------------------------------------------
*/

export function getDashboardRole(language = "hi") {
  const state = getAdminState();

  if (state.role === "superAdmin") {
    return t("superAdmin", language);
  }

  if (state.role === "adminEditor") {
    return t("adminEditor", language);
  }

  return language === "en"
    ? "Regular User"
    : "सामान्य यूजर";
}

/*
|--------------------------------------------------------------------------
| RENDER STATISTIC CARDS
|--------------------------------------------------------------------------
*/

export function renderDashboardCards(language = "hi") {
  const cards = getDashboardCards(language);

  return `
    <div class="admin-stats-grid">
      ${cards.map(card => `
        <article class="admin-stat-card ${escapeHTML(card.color)}">
          <div class="admin-stat-icon">
            ${card.icon}
          </div>

          <div class="admin-stat-content">
            <p>${escapeHTML(card.title)}</p>

            <h3>
              ${
                card.value === null
                  ? "—"
                  : escapeHTML(formatNumber(card.value, language))
              }
            </h3>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

/*
|--------------------------------------------------------------------------
| RENDER RECENT ACTIVITIES
|--------------------------------------------------------------------------
*/

export function renderRecentActivities(language = "hi") {
  const activities = dashboardState.activities.map(
    activity => normalizeAdminActivity(activity, language)
  );

  if (!activities.length) {
    return `
      <div class="admin-empty-state">
        <div class="admin-empty-icon">📭</div>
        <p>${escapeHTML(t("noActivity", language))}</p>
      </div>
    `;
  }

  return `
    <div class="admin-activity-list">
      ${activities.map(activity => `
        <article class="admin-activity-item">
          <div class="admin-activity-icon">📌</div>

          <div class="admin-activity-content">
            <h4>${escapeHTML(activity.title)}</h4>

            ${
              activity.description
                ? `<p>${escapeHTML(activity.description)}</p>`
                : ""
            }

            ${
              activity.actor
                ? `<small>${escapeHTML(activity.actor)}</small>`
                : ""
            }
          </div>

          <time>${escapeHTML(activity.date)}</time>
        </article>
      `).join("")}
    </div>
  `;
}

/*
|--------------------------------------------------------------------------
| RENDER QUICK ACTIONS
|--------------------------------------------------------------------------
*/

export function renderQuickActions(language = "hi") {
  const actions = getAdminQuickActions(language);

  if (!actions.length) {
    return "";
  }

  return `
    <div class="admin-quick-actions">
      ${actions.map(action => `
        <button
          type="button"
          class="admin-action-card"
          data-admin-route="${escapeHTML(action.route)}"
        >
          <span>${action.icon}</span>
          <strong>${escapeHTML(action.title)}</strong>
          <small>→</small>
        </button>
      `).join("")}
    </div>
  `;
}

/*
|--------------------------------------------------------------------------
| RENDER COMPLETE DASHBOARD
|--------------------------------------------------------------------------
*/

export function renderAdminDashboard(language = "hi") {
  const lang = getLanguage(language);
  const state = getAdminState();

  if (!state.isAdmin) {
    return `
      <section class="admin-access-denied">
        <h2>🔒</h2>
        <p>${escapeHTML(t("accessDenied", lang))}</p>
      </section>
    `;
  }

  if (dashboardState.loading) {
    return `
      <section class="admin-dashboard-loading">
        <div class="admin-loader"></div>
        <p>${escapeHTML(t("loading", lang))}</p>
      </section>
    `;
  }

  if (dashboardState.error && !dashboardState.loaded) {
    return `
      <section class="admin-dashboard-error">
        <p>${escapeHTML(dashboardState.error)}</p>

        <button
          type="button"
          data-admin-refresh
        >
          ${escapeHTML(t("retry", lang))}
        </button>
      </section>
    `;
  }

  const statusMessage = dashboardState.partialErrors.length
    ? t("partial", lang)
    : t("connected", lang);

  return `
    <main class="admin-dashboard">

      <header class="admin-dashboard-header">
        <div>
          <h1>${escapeHTML(t("title", lang))}</h1>
          <p>${escapeHTML(t("subtitle", lang))}</p>
        </div>

        <button
          type="button"
          class="admin-refresh-button"
          data-admin-refresh
        >
          ↻ ${escapeHTML(t("refresh", lang))}
        </button>
      </header>

      <section class="admin-welcome-card">
        <div>
          <span>${escapeHTML(t("role", lang))}</span>
          <h2>${escapeHTML(getDashboardRole(lang))}</h2>
        </div>

        <div>
          <span>${escapeHTML(t("status", lang))}</span>
          <p>${escapeHTML(statusMessage)}</p>
        </div>
      </section>

      <section class="admin-dashboard-section">
        <h2>${escapeHTML(t("title", lang))}</h2>
        ${renderDashboardCards(lang)}
      </section>

      <section class="admin-dashboard-section">
        <h2>${escapeHTML(t("quickActions", lang))}</h2>
        ${renderQuickActions(lang)}
      </section>

      <section class="admin-dashboard-section">
        <h2>${escapeHTML(t("recentActivity", lang))}</h2>
        ${renderRecentActivities(lang)}
      </section>

      <footer class="admin-dashboard-footer">
        ${escapeHTML(t("generatedAt", lang))}:
        ${escapeHTML(
          formatDate(dashboardState.lastUpdated, lang)
        )}
      </footer>

    </main>
  `;
}

/*
|--------------------------------------------------------------------------
| MOUNT DASHBOARD
|--------------------------------------------------------------------------
*/

export async function mountAdminDashboard(
  container,
  options = {}
) {
  if (!container) {
    throw new Error("Dashboard container नहीं मिला।");
  }

  const language = getLanguage(options.language);

  container.innerHTML = `
    <section class="admin-dashboard-loading">
      <div class="admin-loader"></div>
      <p>${escapeHTML(t("loading", language))}</p>
    </section>
  `;

  try {
    await loadAdminDashboard(options);

    container.innerHTML = renderAdminDashboard(language);

    bindAdminDashboardEvents(container, {
      ...options,
      language
    });

    return getAdminDashboardState();

  } catch (error) {
    container.innerHTML = renderAdminDashboardError(
      error,
      language
    );

    bindAdminDashboardEvents(container, {
      ...options,
      language
    });

    throw error;
  }
}

/*
|--------------------------------------------------------------------------
| ERROR RENDERING
|--------------------------------------------------------------------------
*/

function renderAdminDashboardError(error, language) {
  return `
    <section class="admin-dashboard-error">
      <h2>⚠️</h2>

      <p>
        ${escapeHTML(
          error?.message || t("error", language)
        )}
      </p>

      <button
        type="button"
        data-admin-refresh
      >
        ${escapeHTML(t("retry", language))}
      </button>
    </section>
  `;
}

/*
|--------------------------------------------------------------------------
| EVENT BINDING
|--------------------------------------------------------------------------
*/

export function bindAdminDashboardEvents(
  container,
  options = {}
) {
  const language = getLanguage(options.language);

  container.querySelectorAll("[data-admin-refresh]")
    .forEach(button => {
      button.addEventListener("click", async () => {
        button.disabled = true;

        try {
          await mountAdminDashboard(
            container,
            options
          );
        } catch (error) {
          console.error(error);
        } finally {
          button.disabled = false;
        }
      });
    });

  container.querySelectorAll("[data-admin-route]")
    .forEach(button => {
      button.addEventListener("click", () => {
        const route = button.dataset.adminRoute;

        if (typeof options.onNavigate === "function") {
          options.onNavigate(route);
          return;
        }

        container.dispatchEvent(
          new CustomEvent("admin:navigate", {
            bubbles: true,
            detail: { route }
          })
        );
      });
    });
}

/*
|--------------------------------------------------------------------------
| AUTO REFRESH
|--------------------------------------------------------------------------
*/

export function startAdminDashboardAutoRefresh(
  container,
  options = {}
) {
  stopAdminDashboardAutoRefresh();

  const interval =
    Number(options.interval) ||
    ADMIN_DASHBOARD_CONFIG.REFRESH_INTERVAL;

  refreshTimer = setInterval(async () => {
    if (!container || !container.isConnected) {
      stopAdminDashboardAutoRefresh();
      return;
    }

    try {
      await mountAdminDashboard(container, options);
    } catch (error) {
      console.error("Dashboard auto-refresh failed:", error);
    }
  }, interval);

  return refreshTimer;
}

export function stopAdminDashboardAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

/*
|--------------------------------------------------------------------------
| RESET DASHBOARD
|--------------------------------------------------------------------------
*/

export function resetAdminDashboard() {
  stopAdminDashboardAutoRefresh();

  dashboardState = {
    loading: false,
    loaded: false,
    error: null,
    statistics: null,
    activities: [],
    partialErrors: [],
    lastUpdated: null
  };
}
