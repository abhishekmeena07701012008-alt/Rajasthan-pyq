/* =========================================================
   RAJASTHAN PYQ MASTER
   Main Application
   ========================================================= */

const APP_NAME = "Rajasthan PYQ Master";
const APP_VERSION = "1.0.0";

/* ---------- 1. APPLICATION STATE ---------- */

const state = {
    language: localStorage.getItem("rpm_language") || "hi",
    darkMode: localStorage.getItem("rpm_dark_mode") === "true",
    currentPage: "dashboard",
    sidebarOpen: false,
    user: null
};

/* ---------- 2. LANGUAGE CONTENT ---------- */

const translations = {
    hi: {
        dashboard: "डैशबोर्ड",
        exams: "परीक्षाएँ",
        subjects: "विषय",
        practice: "प्रश्न अभ्यास",
        mockTests: "मॉक टेस्ट",
        leaderboard: "लीडरबोर्ड",
        dailyQuiz: "डेली क्विज",
        currentAffairs: "करंट अफेयर्स",
        bookmarks: "बुकमार्क",
        wrongQuestions: "गलत प्रश्न",
        notes: "मेरे नोट्स",
        profile: "मेरी प्रोफाइल",
        settings: "सेटिंग्स",
        admin: "एडमिन पैनल",
        logout: "लॉगआउट",

        welcome: "राजस्थान PYQ मास्टर में आपका स्वागत है!",
        welcomeText: "अपनी तैयारी को बेहतर बनाएं और अपने लक्ष्य की ओर बढ़ें।",

        totalQuestions: "कुल प्रश्न",
        attempted: "हल किए गए प्रश्न",
        accuracy: "सटीकता",
        testsCompleted: "पूरे किए गए टेस्ट",

        selectExam: "अपनी परीक्षा चुनें",
        selectSubject: "अपना विषय चुनें",
        startPractice: "अभ्यास शुरू करें",
        viewAll: "सभी देखें",

        upcoming: "आने वाले टेस्ट",
        recentActivity: "हाल की गतिविधियाँ",
        quickAccess: "क्विक एक्सेस",

        search: "यहाँ खोजें...",
        noData: "अभी कोई डेटा उपलब्ध नहीं है।",
        comingSoon: "यह सुविधा अगले चरण में जोड़ी जाएगी।",

        language: "भाषा",
        hindi: "हिंदी",
        english: "English",
        darkMode: "डार्क मोड",
        lightMode: "लाइट मोड",

        examsCount: "परीक्षाएँ",
        subjectsCount: "विषय",
        questionsCount: "प्रश्न",

        startNow: "अभी शुरू करें",
        close: "बंद करें",
        back: "वापस"
    },

    en: {
        dashboard: "Dashboard",
        exams: "Examinations",
        subjects: "Subjects",
        practice: "Practice Questions",
        mockTests: "Mock Tests",
        leaderboard: "Leaderboard",
        dailyQuiz: "Daily Quiz",
        currentAffairs: "Current Affairs",
        bookmarks: "Bookmarks",
        wrongQuestions: "Wrong Questions",
        notes: "My Notes",
        profile: "My Profile",
        settings: "Settings",
        admin: "Admin Panel",
        logout: "Logout",

        welcome: "Welcome to Rajasthan PYQ Master!",
        welcomeText: "Improve your preparation and move towards your goal.",

        totalQuestions: "Total Questions",
        attempted: "Questions Attempted",
        accuracy: "Accuracy",
        testsCompleted: "Tests Completed",

        selectExam: "Select Your Examination",
        selectSubject: "Select Your Subject",
        startPractice: "Start Practice",
        viewAll: "View All",

        upcoming: "Upcoming Tests",
        recentActivity: "Recent Activity",
        quickAccess: "Quick Access",

        search: "Search here...",
        noData: "No data available yet.",
        comingSoon: "This feature will be added in the next development stage.",

        language: "Language",
        hindi: "हिंदी",
        english: "English",
        darkMode: "Dark Mode",
        lightMode: "Light Mode",

        examsCount: "Examinations",
        subjectsCount: "Subjects",
        questionsCount: "Questions",

        startNow: "Start Now",
        close: "Close",
        back: "Back"
    }
};

function t(key) {
    return translations[state.language][key] || key;
}

/* ---------- 3. EXAMINATION CATEGORIES ---------- */

const examCategories = [
    {
        id: "cet_graduate",
        hi: "CET स्नातक स्तर",
        en: "CET Graduate Level",
        icon: "🎓",
        descriptionHi: "स्नातक स्तर की समान पात्रता परीक्षा",
        descriptionEn: "Common Eligibility Test - Graduate Level"
    },
    {
        id: "cet_12",
        hi: "CET सीनियर सेकेंडरी",
        en: "CET Senior Secondary",
        icon: "📚",
        descriptionHi: "12वीं स्तर की समान पात्रता परीक्षा",
        descriptionEn: "Common Eligibility Test - Senior Secondary"
    },
    {
        id: "patwari",
        hi: "पटवारी",
        en: "Patwari",
        icon: "📋",
        descriptionHi: "राजस्थान पटवारी भर्ती परीक्षा",
        descriptionEn: "Rajasthan Patwari Recruitment Exam"
    },
    {
        id: "vdo",
        hi: "ग्राम विकास अधिकारी",
        en: "Village Development Officer",
        icon: "🏛️",
        descriptionHi: "VDO भर्ती परीक्षा",
        descriptionEn: "Village Development Officer Exam"
    },
    {
        id: "police",
        hi: "पुलिस कांस्टेबल",
        en: "Police Constable",
        icon: "👮",
        descriptionHi: "राजस्थान पुलिस कांस्टेबल परीक्षा",
        descriptionEn: "Rajasthan Police Constable Exam"
    },
    {
        id: "si",
        hi: "सब इंस्पेक्टर",
        en: "Sub Inspector",
        icon: "⭐",
        descriptionHi: "राजस्थान पुलिस SI परीक्षा",
        descriptionEn: "Rajasthan Police Sub Inspector Exam"
    },
    {
        id: "ldc",
        hi: "LDC / क्लर्क",
        en: "LDC / Clerk",
        icon: "💻",
        descriptionHi: "लिपिक ग्रेड भर्ती परीक्षा",
        descriptionEn: "Lower Division Clerk Exam"
    },
    {
        id: "reet",
        hi: "REET",
        en: "REET",
        icon: "✏️",
        descriptionHi: "शिक्षक पात्रता परीक्षा",
        descriptionEn: "Teacher Eligibility Examination"
    },
    {
        id: "rpsc",
        hi: "RPSC",
        en: "RPSC",
        icon: "🏆",
        descriptionHi: "राजस्थान लोक सेवा आयोग",
        descriptionEn: "Rajasthan Public Service Commission"
    },
    {
        id: "junior_accountant",
        hi: "जूनियर अकाउंटेंट",
        en: "Junior Accountant",
        icon: "📊",
        descriptionHi: "कनिष्ठ लेखाकार परीक्षा",
        descriptionEn: "Junior Accountant Examination"
    },
    {
        id: "fourth_grade",
        hi: "चतुर्थ श्रेणी कर्मचारी",
        en: "4th Grade",
        icon: "📁",
        descriptionHi: "चतुर्थ श्रेणी भर्ती परीक्षा",
        descriptionEn: "Fourth Grade Recruitment Exam"
    }
];

/* ---------- 4. SUBJECT CATEGORIES ---------- */

const subjects = [
    {
        id: "rajasthan_gk",
        hi: "राजस्थान सामान्य ज्ञान",
        en: "Rajasthan General Knowledge",
        icon: "🏰"
    },
    {
        id: "india_gk",
        hi: "भारत सामान्य ज्ञान",
        en: "Indian General Knowledge",
        icon: "🇮🇳"
    },
    {
        id: "history",
        hi: "इतिहास",
        en: "History",
        icon: "📜"
    },
    {
        id: "geography",
        hi: "भूगोल",
        en: "Geography",
        icon: "🌍"
    },
    {
        id: "constitution",
        hi: "भारतीय संविधान",
        en: "Indian Constitution",
        icon: "⚖️"
    },
    {
        id: "science",
        hi: "विज्ञान",
        en: "Science",
        icon: "🔬"
    },
    {
        id: "maths",
        hi: "गणित",
        en: "Mathematics",
        icon: "➗"
    },
    {
        id: "reasoning",
        hi: "तर्कशक्ति",
        en: "Reasoning",
        icon: "🧠"
    },
    {
        id: "computer",
        hi: "कंप्यूटर",
        en: "Computer",
        icon: "💻"
    },
    {
        id: "hindi",
        hi: "हिंदी",
        en: "Hindi",
        icon: "अ"
    },
    {
        id: "english",
        hi: "अंग्रेजी",
        en: "English",
        icon: "A"
    },
    {
        id: "economics",
        hi: "अर्थव्यवस्था",
        en: "Economics",
        icon: "📈"
    }
];

/* ---------- 5. MENU CONFIGURATION ---------- */

const menuGroups = [
    {
        titleHi: "मुख्य मेन्यू",
        titleEn: "MAIN MENU",
        items: [
            { id: "dashboard", icon: "🏠", key: "dashboard" },
            { id: "exams", icon: "🎓", key: "exams" },
            { id: "subjects", icon: "📚", key: "subjects" },
            { id: "practice", icon: "✍️", key: "practice" },
            { id: "mockTests", icon: "📝", key: "mockTests" },
            { id: "dailyQuiz", icon: "⚡", key: "dailyQuiz" },
            { id: "currentAffairs", icon: "📰", key: "currentAffairs" }
        ]
    },
    {
        titleHi: "मेरी तैयारी",
        titleEn: "MY PREPARATION",
        items: [
            { id: "leaderboard", icon: "🏆", key: "leaderboard" },
            { id: "bookmarks", icon: "🔖", key: "bookmarks" },
            { id: "wrongQuestions", icon: "❌", key: "wrongQuestions" },
            { id: "notes", icon: "🗒️", key: "notes" }
        ]
    },
    {
        titleHi: "अकाउंट",
        titleEn: "ACCOUNT",
        items: [
            { id: "profile", icon: "👤", key: "profile" },
            { id: "settings", icon: "⚙️", key: "settings" },
            { id: "admin", icon: "🛡️", key: "admin" }
        ]
    }
];

/* ---------- 6. HTML HELPERS ---------- */

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return entities[character];
    });
}

function getLocalized(item, prefix = "") {
    const key = state.language === "hi" ? "hi" : "en";
    return item[prefix + key] || item[key] || "";
}

/* ---------- 7. APPLICATION INITIALIZATION ---------- */

function initializeApp() {
    document.documentElement.lang = state.language;

    if (state.darkMode) {
        document.body.classList.add("dark-mode");
    }

    renderApp();
    attachGlobalEvents();
}

function renderApp() {
    const root = document.getElementById("app");

    if (!root) {
        console.error("Application root element not found.");
        return;
    }

    root.innerHTML = `
        <div class="app-layout">

            ${renderSidebar()}

            <main class="main-content">

                ${renderHeader()}

                <div class="page-container" id="page-content">
                    ${renderCurrentPage()}
                </div>

            </main>

            ${renderBottomNavigation()}

            <div class="modal-overlay" id="modal-overlay">
                <div class="modal" id="modal-content"></div>
            </div>

            <div id="notification-container"></div>

        </div>
    `;

    if (state.sidebarOpen) {
        document.querySelector(".sidebar")?.classList.add("open");
    }

    attachPageEvents();
}

/* ---------- 8. SIDEBAR ---------- */

function renderSidebar() {
    return `
        <aside class="sidebar">

            <div class="sidebar-brand">
                <div class="sidebar-logo">RP</div>

                <div>
                    <h2>RAJASTHAN PYQ</h2>
                    <small>MASTER</small>
                </div>
            </div>

            ${menuGroups.map(group => `
                <div class="sidebar-label">
                    ${state.language === "hi"
                        ? group.titleHi
                        : group.titleEn}
                </div>

                <div class="sidebar-menu">

                    ${group.items.map(item => `
                        <button
                            class="sidebar-link
                                ${state.currentPage === item.id ? "active" : ""}"
                            data-page="${item.id}"
                            type="button"
                        >
                            <span class="sidebar-icon">${item.icon}</span>
                            <span>${t(item.key)}</span>
                        </button>
                    `).join("")}

                </div>
            `).join("")}

            <div class="sidebar-label">
                VERSION ${APP_VERSION}
            </div>

        </aside>
    `;
}

/* ---------- 9. HEADER ---------- */

function renderHeader() {
    const currentMenu = menuGroups
        .flatMap(group => group.items)
        .find(item => item.id === state.currentPage);

    return `
        <header class="top-header">

            <div class="header-left">

                <button
                    class="icon-button"
                    id="sidebar-toggle"
                    type="button"
                    aria-label="Toggle sidebar"
                >
                    ☰
                </button>

                <div class="header-title">
                    ${currentMenu ? t(currentMenu.key) : APP_NAME}
                </div>

            </div>

            <div class="header-right">

                <button
                    class="icon-button"
                    id="language-toggle"
                    type="button"
                    title="${t("language")}"
                >
                    ${state.language === "hi" ? "EN" : "हि"}
                </button>

                <button
                    class="icon-button"
                    id="theme-toggle"
                    type="button"
                    title="${state.darkMode ? t("lightMode") : t("darkMode")}"
                >
                    ${state.darkMode ? "☀️" : "🌙"}
                </button>

                <button
                    class="icon-button"
                    data-page="profile"
                    type="button"
                    title="${t("profile")}"
                >
                    👤
                </button>

            </div>

        </header>
    `;
}

/* ---------- 10. BOTTOM NAVIGATION ---------- */

function renderBottomNavigation() {
    const items = [
        { id: "dashboard", icon: "🏠", label: "dashboard" },
        { id: "exams", icon: "🎓", label: "exams" },
        { id: "practice", icon: "✍️", label: "practice" },
        { id: "leaderboard", icon: "🏆", label: "leaderboard" },
        { id: "profile", icon: "👤", label: "profile" }
    ];

    return `
        <nav class="bottom-nav">

            ${items.map(item => `
                <button
                    type="button"
                    data-page="${item.id}"
                    class="${state.currentPage === item.id ? "active" : ""}"
                >
                    <span class="nav-icon">${item.icon}</span>
                    <span>${t(item.label)}</span>
                </button>
            `).join("")}

        </nav>
    `;
}

/* ---------- 11. PAGE ROUTER ---------- */

function renderCurrentPage() {
    switch (state.currentPage) {
        case "dashboard":
            return renderDashboard();

        case "exams":
            return renderExams();

        case "subjects":
            return renderSubjects();

        case "practice":
            return renderPractice();

        case "mockTests":
            return renderComingSoon("📝", t("mockTests"));

        case "leaderboard":
            return renderComingSoon("🏆", t("leaderboard"));

        case "dailyQuiz":
            return renderComingSoon("⚡", t("dailyQuiz"));

        case "currentAffairs":
            return renderComingSoon("📰", t("currentAffairs"));

        case "bookmarks":
            return renderComingSoon("🔖", t("bookmarks"));

        case "wrongQuestions":
            return renderComingSoon("❌", t("wrongQuestions"));

        case "notes":
            return renderComingSoon("🗒️", t("notes"));

        case "profile":
            return renderProfile();

        case "settings":
            return renderSettings();

        case "admin":
            return renderComingSoon("🛡️", t("admin"));

        default:
            return renderDashboard();
    }
}

/* ---------- 12. DASHBOARD ---------- */

function renderDashboard() {
    return `
        <section class="page-section">

            <div class="card"
                style="
                    background: linear-gradient(120deg, #10243a, #28577e);
                    color: white;
                    padding: 28px;
                "
            >
                <h1 style="font-size: 23px;">
                    ${t("welcome")}
                </h1>

                <p style="color: #d6e5f2; margin-top: 8px;">
                    ${t("welcomeText")}
                </p>

                <button
                    class="btn btn-secondary mt-2"
                    data-page="exams"
                    type="button"
                >
                    ${t("startNow")} →
                </button>
            </div>

        </section>

        <section class="page-section">

            <div class="card-grid">

                ${renderStatCard("📚", "0", t("totalQuestions"))}
                ${renderStatCard("✍️", "0", t("attempted"))}
                ${renderStatCard("🎯", "0%", t("accuracy"))}
                ${renderStatCard("🏆", "0", t("testsCompleted"))}

            </div>

        </section>

        <section class="page-section">

            <div class="section-heading">
                <h2>${t("selectExam")}</h2>

                <button
                    class="btn btn-outline btn-sm"
                    data-page="exams"
                    type="button"
                >
                    ${t("viewAll")}
                </button>
            </div>

            <div class="exam-grid">

                ${examCategories.slice(0, 6).map(renderExamCard).join("")}

            </div>

        </section>

        <section class="page-section">

            <div class="section-heading">
                <h2>${t("quickAccess")}</h2>
            </div>

            <div class="card-grid">

                ${renderQuickCard("⚡", t("dailyQuiz"), "dailyQuiz")}
                ${renderQuickCard("📝", t("mockTests"), "mockTests")}
                ${renderQuickCard("🏆", t("leaderboard"), "leaderboard")}
                ${renderQuickCard("🔖", t("bookmarks"), "bookmarks")}

            </div>

        </section>

        <section class="page-section">

            <div class="section-heading">
                <h2>${t("recentActivity")}</h2>
            </div>

            <div class="card">
                <div class="empty-state">
                    <div class="empty-state-icon">📊</div>
                    <h3>${t("noData")}</h3>
                    <p>${t("comingSoon")}</p>
                </div>
            </div>

        </section>
    `;
}

function renderStatCard(icon, value, label) {
    return `
        <div class="card stat-card">

            <div class="stat-icon">
                ${icon}
            </div>

            <div class="stat-info">
                <h3>${value}</h3>
                <p>${label}</p>
            </div>

        </div>
    `;
}

function renderQuickCard(icon, title, page) {
    return `
        <button
            class="card"
            data-page="${page}"
            type="button"
            style="text-align: left; cursor: pointer;"
        >
            <div style="font-size: 27px; margin-bottom: 10px;">
                ${icon}
            </div>

            <h3 class="card-title">${title}</h3>
        </button>
    `;
}

/* ---------- 13. EXAMINATION PAGE ---------- */

function renderExams() {
    return `
        <section class="page-section">

            <div class="section-heading">
                <div>
                    <h2>${t("selectExam")}</h2>
                    <p>${t("welcomeText")}</p>
                </div>
            </div>

            <div class="search-box mb-2">
                <input
                    type="search"
                    id="exam-search"
                    placeholder="${t("search")}"
                >
            </div>

            <div class="exam-grid" id="exam-grid">

                ${examCategories.map(renderExamCard).join("")}

            </div>

        </section>
    `;
}

function renderExamCard(exam) {
    const title = state.language === "hi" ? exam.hi : exam.en;

    const description = state.language === "hi"
        ? exam.descriptionHi
        : exam.descriptionEn;

    return `
        <div
            class="card exam-card"
            data-exam="${exam.id}"
            data-search="${escapeHTML(title.toLowerCase())}"
            role="button"
            tabindex="0"
        >

            <div class="exam-card-icon">
                ${exam.icon}
            </div>

            <h3>${escapeHTML(title)}</h3>

            <p>${escapeHTML(description)}</p>

            <div class="exam-card-footer">

                <span>${t("questionsCount")}: —</span>

                <span style="color: var(--primary); font-weight: 800;">
                    ${t("startNow")} →
                </span>

            </div>

        </div>
    `;
}

/* ---------- 14. SUBJECT PAGE ---------- */

function renderSubjects() {
    return `
        <section class="page-section">

            <div class="section-heading">
                <div>
                    <h2>${t("selectSubject")}</h2>
                    <p>${t("welcomeText")}</p>
                </div>
            </div>

            <div class="search-box mb-2">
                <input
                    type="search"
                    id="subject-search"
                    placeholder="${t("search")}"
                >
            </div>

            <div class="subject-grid" id="subject-grid">

                ${subjects.map(renderSubjectCard).join("")}

            </div>

        </section>
    `;
}

function renderSubjectCard(subject) {
    const title = state.language === "hi"
        ? subject.hi
        : subject.en;

    return `
        <div
            class="card subject-card"
            data-subject="${subject.id}"
            data-search="${escapeHTML(title.toLowerCase())}"
            role="button"
            tabindex="0"
        >

            <div style="font-size: 28px; margin-bottom: 10px;">
                ${subject.icon}
            </div>

            <h3>${escapeHTML(title)}</h3>

            <p>${t("questionsCount")}: —</p>

        </div>
    `;
}

/* ---------- 15. PRACTICE PAGE ---------- */

function renderPractice() {
    return `
        <section class="page-section">

            <div class="section-heading">
                <div>
                    <h2>${t("practice")}</h2>
                    <p>${t("selectExam")}</p>
                </div>
            </div>

            <div class="card">

                <div class="form-group">
                    <label>${t("exams")}</label>

                    <select class="form-control" id="practice-exam">

                        <option value="">
                            ${t("selectExam")}
                        </option>

                        ${examCategories.map(exam => `
                            <option value="${exam.id}">
                                ${escapeHTML(
                                    state.language === "hi"
                                        ? exam.hi
                                        : exam.en
                                )}
                            </option>
                        `).join("")}

                    </select>
                </div>

                <div class="form-group">
                    <label>${t("subjects")}</label>

                    <select class="form-control" id="practice-subject">

                        <option value="">
                            ${t("selectSubject")}
                        </option>

                        ${subjects.map(subject => `
                            <option value="${subject.id}">
                                ${escapeHTML(
                                    state.language === "hi"
                                        ? subject.hi
                                        : subject.en
                                )}
                            </option>
                        `).join("")}

                    </select>
                </div>

                <div class="form-group">
                    <label>
                        ${state.language === "hi"
                            ? "प्रश्नों की संख्या"
                            : "Number of Questions"}
                    </label>

                    <select class="form-control" id="practice-count">
                        <option value="10">10</option>
                        <option value="20">20</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                    </select>
                </div>

                <button
                    class="btn btn-primary btn-block"
                    id="start-practice"
                    type="button"
                >
                    ${t("startPractice")} →
                </button>

            </div>

        </section>
    `;
}

/* ---------- 16. PROFILE PAGE ---------- */

function renderProfile() {
    return `
        <section class="page-section">

            <div class="section-heading">
                <h2>${t("profile")}</h2>
            </div>

            <div class="card">

                <div class="flex-center" style="margin-bottom: 20px;">
                    <div class="auth-logo" style="margin: 0;">
                        👤
                    </div>
                </div>

                <div class="text-center">
                    <h2>
                        ${state.user
                            ? escapeHTML(state.user.displayName || "User")
                            : "Guest User"}
                    </h2>

                    <p class="text-muted">
                        ${state.user
                            ? escapeHTML(state.user.email || "")
                            : "Firebase Login अभी जोड़ा जाना बाकी है।"}
                    </p>
                </div>

                <hr style="margin: 20px 0; border: 0; border-top: 1px solid var(--border);">

                <div class="empty-state">
                    <p>${t("comingSoon")}</p>
                </div>

            </div>

        </section>
    `;
}

/* ---------- 17. SETTINGS PAGE ---------- */

function renderSettings() {
    return `
        <section class="page-section">

            <div class="section-heading">
                <h2>${t("settings")}</h2>
            </div>

            <div class="card">

                <div class="form-group">
                    <label>${t("language")}</label>

                    <select class="form-control" id="settings-language">

                        <option value="hi"
                            ${state.language === "hi" ? "selected" : ""}>
                            हिंदी
                        </option>

                        <option value="en"
                            ${state.language === "en" ? "selected" : ""}>
                            English
                        </option>

                    </select>
                </div>

                <div class="form-group">

                    <label>${t("darkMode")}</label>

                    <button
                        class="btn btn-outline btn-block"
                        id="settings-theme"
                        type="button"
                    >
                        ${state.darkMode
                            ? t("lightMode")
                            : t("darkMode")}
                    </button>

                </div>

            </div>

        </section>
    `;
}

/* ---------- 18. COMING SOON PAGE ---------- */

function renderComingSoon(icon, title) {
    return `
        <section class="page-section">

            <div class="card">

                <div class="empty-state">

                    <div class="empty-state-icon">
                        ${icon}
                    </div>

                    <h2>${escapeHTML(title)}</h2>

                    <p>${t("comingSoon")}</p>

                </div>

            </div>

        </section>
    `;
}

/* ---------- 19. PAGE NAVIGATION ---------- */

function navigateTo(page) {
    state.currentPage = page;
    state.sidebarOpen = false;

    renderApp();

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

/* ---------- 20. LANGUAGE TOGGLE ---------- */

function toggleLanguage() {
    state.language = state.language === "hi" ? "en" : "hi";

    localStorage.setItem("rpm_language", state.language);

    document.documentElement.lang = state.language;

    renderApp();
}

/* ---------- 21. DARK MODE ---------- */

function toggleDarkMode() {
    state.darkMode = !state.darkMode;

    localStorage.setItem(
        "rpm_dark_mode",
        String(state.darkMode)
    );

    document.body.classList.toggle(
        "dark-mode",
        state.darkMode
    );

    renderApp();
}

/* ---------- 22. SEARCH FILTER ---------- */

function filterItems(inputId, itemSelector) {
    const input = document.getElementById(inputId);

    if (!input) return;

    input.addEventListener("input", () => {
        const query = input.value.trim().toLowerCase();

        document.querySelectorAll(itemSelector).forEach(item => {
            const searchableText = item.dataset.search || "";

            item.style.display = searchableText.includes(query)
                ? ""
                : "none";
        });
    });
}

/* ---------- 23. NOTIFICATIONS ---------- */

function showNotification(message, type = "success") {
    const container = document.getElementById(
        "notification-container"
    );

    if (!container) return;

    const notification = document.createElement("div");

    notification.className = `notification ${type}`;
    notification.textContent = message;

    container.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

/* ---------- 24. MODAL ---------- */

function openModal(title, content) {
    const overlay = document.getElementById("modal-overlay");
    const modal = document.getElementById("modal-content");

    if (!overlay || !modal) return;

    modal.innerHTML = `
        <div class="modal-header">

            <h2>${escapeHTML(title)}</h2>

            <button
                class="icon-button"
                id="close-modal"
                type="button"
            >
                ✕
            </button>

        </div>

        <div class="modal-body">
            ${content}
        </div>
    `;

    overlay.classList.add("show");

    document.getElementById("close-modal")
        ?.addEventListener("click", closeModal);
}

function closeModal() {
    document.getElementById("modal-overlay")
        ?.classList.remove("show");
}

/* ---------- 25. EVENT HANDLERS ---------- */

function attachGlobalEvents() {
    document.addEventListener("click", event => {

        const pageButton = event.target.closest("[data-page]");

        if (pageButton) {
            navigateTo(pageButton.dataset.page);
        }

    });

    document.addEventListener("keydown", event => {

        if (event.key === "Escape") {
            closeModal();

            state.sidebarOpen = false;

            document.querySelector(".sidebar")
                ?.classList.remove("open");
        }

    });
}

function attachPageEvents() {

    document.getElementById("sidebar-toggle")
        ?.addEventListener("click", () => {

            state.sidebarOpen = !state.sidebarOpen;

            document.querySelector(".sidebar")
                ?.classList.toggle("open", state.sidebarOpen);

        });

    document.getElementById("language-toggle")
        ?.addEventListener("click", toggleLanguage);

    document.getElementById("theme-toggle")
        ?.addEventListener("click", toggleDarkMode);

    document.getElementById("settings-theme")
        ?.addEventListener("click", toggleDarkMode);

    document.getElementById("settings-language")
        ?.addEventListener("change", event => {

            state.language = event.target.value;

            localStorage.setItem(
                "rpm_language",
                state.language
            );

            document.documentElement.lang = state.language;

            renderApp();

        });

    filterItems("exam-search", ".exam-card");
    filterItems("subject-search", ".subject-card");

    document.querySelectorAll(".exam-card").forEach(card => {

        card.addEventListener("click", () => {

            const examId = card.dataset.exam;

            openModal(
                state.language === "hi"
                    ? "परीक्षा चुनी गई"
                    : "Examination Selected",

                `
                    <p>
                        ${state.language === "hi"
                            ? "चुनी गई परीक्षा:"
                            : "Selected Examination:"}
                        <strong>${escapeHTML(examId)}</strong>
                    </p>

                    <p class="text-muted mt-2">
                        ${t("comingSoon")}
                    </p>
                `
            );

        });

        card.addEventListener("keydown", event => {

            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                card.click();
            }

        });

    });

    document.querySelectorAll(".subject-card").forEach(card => {

        card.addEventListener("click", () => {

            const subjectId = card.dataset.subject;

            openModal(
                state.language === "hi"
                    ? "विषय चुना गया"
                    : "Subject Selected",

                `
                    <p>
                        ${state.language === "hi"
                            ? "चुना गया विषय:"
                            : "Selected Subject:"}
                        <strong>${escapeHTML(subjectId)}</strong>
                    </p>

                    <p class="text-muted mt-2">
                        ${t("comingSoon")}
                    </p>
                `
            );

        });

    });

    document.getElementById("start-practice")
        ?.addEventListener("click", () => {

            const exam = document.getElementById("practice-exam")?.value;
            const subject = document.getElementById("practice-subject")?.value;
            const count = document.getElementById("practice-count")?.value;

            if (!exam || !subject) {

                showNotification(
                    state.language === "hi"
                        ? "कृपया परीक्षा और विषय चुनें।"
                        : "Please select an examination and subject.",
                    "error"
                );

                return;
            }

            showNotification(
                state.language === "hi"
                    ? "प्रैक्टिस सिस्टम अगले चरण में जोड़ा जाएगा।"
                    : "Practice system will be connected in the next stage.",
                "success"
            );

            console.log("Practice Selection:", {
                exam,
                subject,
                count
            });

        });

}

/* ---------- 26. APPLICATION START ---------- */

document.addEventListener("DOMContentLoaded", initializeApp);
