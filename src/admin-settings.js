/**
 * RAJASTHAN PYQ MASTER
 * File 30: Admin Settings
 *
 * Admin settings UI.
 * All settings reads/writes must be handled by trusted
 * backend callbacks. No direct Firestore writes here.
 */

const DEFAULT_SETTINGS = {
  appName: "Rajasthan PYQ Master",
  maintenanceMode: false,
  allowNewRegistrations: true,
  showLeaderboard: true,
  enableDailyQuiz: true,
  enableCurrentAffairs: true,
  enableNotifications: true,
  enableAIPractice: true,
  enableMockTests: true,
  defaultLanguage: "hi",
  questionsPerPractice: 20,
  defaultMockDuration: 120,
  negativeMarking: 0.25,
  announcement: {
    enabled: false,
    title: "",
    message: ""
  },
  updatedAt: null
};

const TEXT = {
  hi: {
    title: "ऐप सेटिंग्स",
    subtitle: "अपने ऐप की मुख्य सेटिंग्स नियंत्रित करें",
    save: "सेटिंग्स सेव करें",
    saving: "सेव हो रहा है...",
    reset: "डिफॉल्ट सेटिंग्स",
    general: "सामान्य सेटिंग्स",
    features: "ऐप फीचर्स",
    practice: "प्रैक्टिस और टेस्ट",
    announcement: "घोषणा",
    appName: "ऐप का नाम",
    maintenance: "मेंटेनेंस मोड",
    registration: "नए यूज़र रजिस्ट्रेशन",
    leaderboard: "लीडरबोर्ड",
    dailyQuiz: "डेली क्विज़",
    currentAffairs: "करंट अफेयर्स",
    notifications: "नोटिफिकेशन",
    aiPractice: "AI प्रैक्टिस",
    mockTests: "मॉक टेस्ट",
    language: "डिफॉल्ट भाषा",
    hindi: "हिंदी",
    english: "English",
    questions: "प्रति प्रैक्टिस प्रश्न",
    duration: "मॉक टेस्ट समय (मिनट)",
    negative: "नेगेटिव मार्किंग",
    announcementEnabled: "घोषणा दिखाएँ",
    announcementTitle: "घोषणा का शीर्षक",
    announcementMessage: "घोषणा का संदेश",
    loading: "सेटिंग्स लोड हो रही हैं...",
    loadError: "सेटिंग्स लोड नहीं हो सकीं।",
    saveSuccess: "सेटिंग्स सफलतापूर्वक सेव हो गईं।",
    saveError: "सेटिंग्स सेव नहीं हो सकीं।",
    permission: "आपको ये सेटिंग्स बदलने की अनुमति नहीं है।",
    confirmReset: "क्या आप सभी सेटिंग्स डिफॉल्ट पर करना चाहते हैं?",
    resetSuccess: "डिफॉल्ट सेटिंग्स तैयार हैं। सेव करना न भूलें।",
    required: "यह फ़ील्ड जरूरी है।",
    invalid: "कृपया सही मान दर्ज करें।",
    on: "चालू",
    off: "बंद",
    unsaved: "आपके बदलाव अभी सेव नहीं हुए हैं।"
  },

  en: {
    title: "App Settings",
    subtitle: "Control the main settings of your application",
    save: "Save Settings",
    saving: "Saving...",
    reset: "Default Settings",
    general: "General Settings",
    features: "App Features",
    practice: "Practice & Tests",
    announcement: "Announcement",
    appName: "App Name",
    maintenance: "Maintenance Mode",
    registration: "New User Registration",
    leaderboard: "Leaderboard",
    dailyQuiz: "Daily Quiz",
    currentAffairs: "Current Affairs",
    notifications: "Notifications",
    aiPractice: "AI Practice",
    mockTests: "Mock Tests",
    language: "Default Language",
    hindi: "Hindi",
    english: "English",
    questions: "Questions per Practice",
    duration: "Mock Test Duration (minutes)",
    negative: "Negative Marking",
    announcementEnabled: "Show Announcement",
    announcementTitle: "Announcement Title",
    announcementMessage: "Announcement Message",
    loading: "Loading settings...",
    loadError: "Could not load settings.",
    saveSuccess: "Settings saved successfully.",
    saveError: "Could not save settings.",
    permission: "You are not allowed to change these settings.",
    confirmReset: "Reset all settings to their defaults?",
    resetSuccess: "Default settings loaded. Remember to save.",
    required: "This field is required.",
    invalid: "Please enter a valid value.",
    on: "On",
    off: "Off",
    unsaved: "Your changes have not been saved."
  }
};

let currentSettings = structuredClone(DEFAULT_SETTINGS);
let originalSettings = structuredClone(DEFAULT_SETTINGS);
let currentLanguage = "hi";
let isSaving = false;
let containerElement = null;
let callbacks = {};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
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

function getText(key) {
  return TEXT[currentLanguage]?.[key] || TEXT.hi[key] || key;
}

function normalizeSettings(data = {}) {
  const announcement = data.announcement || {};

  return {
    ...clone(DEFAULT_SETTINGS),
    ...data,

    appName: String(data.appName ?? DEFAULT_SETTINGS.appName),

    maintenanceMode: Boolean(data.maintenanceMode),
    allowNewRegistrations: data.allowNewRegistrations !== false,
    showLeaderboard: data.showLeaderboard !== false,
    enableDailyQuiz: data.enableDailyQuiz !== false,
    enableCurrentAffairs: data.enableCurrentAffairs !== false,
    enableNotifications: data.enableNotifications !== false,
    enableAIPractice: data.enableAIPractice !== false,
    enableMockTests: data.enableMockTests !== false,

    defaultLanguage:
      data.defaultLanguage === "en" ? "en" : "hi",

    questionsPerPractice: Number(
      data.questionsPerPractice ?? DEFAULT_SETTINGS.questionsPerPractice
    ),

    defaultMockDuration: Number(
      data.defaultMockDuration ?? DEFAULT_SETTINGS.defaultMockDuration
    ),

    negativeMarking: Number(
      data.negativeMarking ?? DEFAULT_SETTINGS.negativeMarking
    ),

    announcement: {
      enabled: Boolean(announcement.enabled),
      title: String(announcement.title || ""),
      message: String(announcement.message || "")
    },

    updatedAt: data.updatedAt ?? null
  };
}

function hasUnsavedChanges() {
  return JSON.stringify(currentSettings) !==
    JSON.stringify(originalSettings);
}

function showMessage(message, type = "info") {
  if (typeof callbacks.onMessage === "function") {
    callbacks.onMessage(message, type);
    return;
  }

  const element = containerElement?.querySelector(
    "[data-settings-message]"
  );

  if (!element) return;

  element.textContent = message;
  element.dataset.type = type;
  element.hidden = false;
}

function updateSetting(key, value) {
  currentSettings[key] = value;
  updateDirtyState();
}

function updateAnnouncement(key, value) {
  currentSettings.announcement[key] = value;
  updateDirtyState();
}

function updateDirtyState() {
  const dirty = hasUnsavedChanges();

  const status = containerElement?.querySelector(
    "[data-settings-dirty]"
  );

  if (status) {
    status.hidden = !dirty;
    status.textContent = dirty ? getText("unsaved") : "";
  }

  const saveButton = containerElement?.querySelector(
    "[data-settings-save]"
  );

  if (saveButton) {
    saveButton.disabled = !dirty || isSaving;
  }
}

function renderSwitch(key, label, checked) {
  return `
    <label class="admin-setting-row">
      <span class="admin-setting-label">
        ${escapeHTML(label)}
      </span>

      <input
        type="checkbox"
        data-setting="${escapeHTML(key)}"
        ${checked ? "checked" : ""}
      />

      <span class="admin-setting-switch"></span>
    </label>
  `;
}

function renderGeneralSettings() {
  return `
    <section class="admin-settings-card">
      <h3>${getText("general")}</h3>

      <label class="admin-settings-field">
        <span>${getText("appName")}</span>
        <input
          type="text"
          data-setting="appName"
          maxlength="80"
          value="${escapeHTML(currentSettings.appName)}"
        />
      </label>

      ${renderSwitch(
        "maintenanceMode",
        getText("maintenance"),
        currentSettings.maintenanceMode
      )}

      ${renderSwitch(
        "allowNewRegistrations",
        getText("registration"),
        currentSettings.allowNewRegistrations
      )}

      <label class="admin-settings-field">
        <span>${getText("language")}</span>
        <select data-setting="defaultLanguage">
          <option value="hi"
            ${currentSettings.defaultLanguage === "hi" ? "selected" : ""}>
            ${getText("hindi")}
          </option>

          <option value="en"
            ${currentSettings.defaultLanguage === "en" ? "selected" : ""}>
            ${getText("english")}
          </option>
        </select>
      </label>
    </section>
  `;
}

function renderFeatureSettings() {
  return `
    <section class="admin-settings-card">
      <h3>${getText("features")}</h3>

      ${renderSwitch(
        "showLeaderboard",
        getText("leaderboard"),
        currentSettings.showLeaderboard
      )}

      ${renderSwitch(
        "enableDailyQuiz",
        getText("dailyQuiz"),
        currentSettings.enableDailyQuiz
      )}

      ${renderSwitch(
        "enableCurrentAffairs",
        getText("currentAffairs"),
        currentSettings.enableCurrentAffairs
      )}

      ${renderSwitch(
        "enableNotifications",
        getText("notifications"),
        currentSettings.enableNotifications
      )}

      ${renderSwitch(
        "enableAIPractice",
        getText("aiPractice"),
        currentSettings.enableAIPractice
      )}

      ${renderSwitch(
        "enableMockTests",
        getText("mockTests"),
        currentSettings.enableMockTests
      )}
    </section>
  `;
}

function renderPracticeSettings() {
  return `
    <section class="admin-settings-card">
      <h3>${getText("practice")}</h3>

      <label class="admin-settings-field">
        <span>${getText("questions")}</span>
        <input
          type="number"
          min="1"
          max="200"
          step="1"
          data-setting="questionsPerPractice"
          value="${currentSettings.questionsPerPractice}"
        />
      </label>

      <label class="admin-settings-field">
        <span>${getText("duration")}</span>
        <input
          type="number"
          min="1"
          max="360"
          step="1"
          data-setting="defaultMockDuration"
          value="${currentSettings.defaultMockDuration}"
        />
      </label>

      <label class="admin-settings-field">
        <span>${getText("negative")}</span>
        <select data-setting="negativeMarking">
          <option value="0"
            ${currentSettings.negativeMarking === 0 ? "selected" : ""}>
            0
          </option>

          <option value="0.25"
            ${currentSettings.negativeMarking === 0.25 ? "selected" : ""}>
            0.25
          </option>

          <option value="0.33"
            ${currentSettings.negativeMarking === 0.33 ? "selected" : ""}>
            0.33
          </option>

          <option value="0.5"
            ${currentSettings.negativeMarking === 0.5 ? "selected" : ""}>
            0.5
          </option>
        </select>
      </label>
    </section>
  `;
}

function renderAnnouncementSettings() {
  return `
    <section class="admin-settings-card">
      <h3>${getText("announcement")}</h3>

      ${renderSwitch(
        "announcement.enabled",
        getText("announcementEnabled"),
        currentSettings.announcement.enabled
      )}

      <label class="admin-settings-field">
        <span>${getText("announcementTitle")}</span>
        <input
          type="text"
          data-setting="announcement.title"
          maxlength="120"
          value="${escapeHTML(currentSettings.announcement.title)}"
        />
      </label>

      <label class="admin-settings-field">
        <span>${getText("announcementMessage")}</span>
        <textarea
          data-setting="announcement.message"
          rows="4"
          maxlength="1000"
        >${escapeHTML(currentSettings.announcement.message)}</textarea>
      </label>
    </section>
  `;
}

function renderAdminSettings() {
  if (!containerElement) return;

  containerElement.innerHTML = `
    <div class="admin-settings-page">

      <header class="admin-settings-header">
        <div>
          <h2>${getText("title")}</h2>
          <p>${getText("subtitle")}</p>
        </div>

        <button
          type="button"
          data-settings-reset
          class="admin-btn admin-btn-secondary"
        >
          ${getText("reset")}
        </button>
      </header>

      <div
        class="admin-settings-message"
        data-settings-message
        role="status"
        hidden
      ></div>

      <p
        class="admin-settings-dirty"
        data-settings-dirty
        hidden
      ></p>

      ${renderGeneralSettings()}
      ${renderFeatureSettings()}
      ${renderPracticeSettings()}
      ${renderAnnouncementSettings()}

      <footer class="admin-settings-footer">
        <button
          type="button"
          data-settings-save
          class="admin-btn admin-btn-primary"
          disabled
        >
          ${getText("save")}
        </button>
      </footer>

    </div>
  `;

  bindSettingsEvents();
  updateDirtyState();
}

function setNestedSetting(path, value) {
  const parts = path.split(".");

  if (parts[0] === "announcement" && parts.length === 2) {
    updateAnnouncement(parts[1], value);
    return;
  }

  updateSetting(path, value);
}

function handleSettingChange(event) {
  const input = event.target.closest("[data-setting]");
  if (!input) return;

  const key = input.dataset.setting;

  let value;

  if (input.type === "checkbox") {
    value = input.checked;
  } else if (input.type === "number") {
    value = Number(input.value);
  } else {
    value = input.value;
  }

  setNestedSetting(key, value);
}

function bindSettingsEvents() {
  containerElement
    .querySelectorAll("[data-setting]")
    .forEach(input => {
      input.addEventListener("change", handleSettingChange);

      if (input.tagName === "INPUT" || input.tagName === "TEXTAREA") {
        input.addEventListener("input", handleSettingChange);
      }
    });

  containerElement
    .querySelector("[data-settings-save]")
    ?.addEventListener("click", saveAdminSettings);

  containerElement
    .querySelector("[data-settings-reset]")
    ?.addEventListener("click", resetAdminSettings);
}

function validateSettings(settings) {
  if (!settings.appName.trim()) {
    return { valid: false, message: getText("required") };
  }

  if (
    !Number.isInteger(settings.questionsPerPractice) ||
    settings.questionsPerPractice < 1 ||
    settings.questionsPerPractice > 200
  ) {
    return { valid: false, message: getText("invalid") };
  }

  if (
    !Number.isInteger(settings.defaultMockDuration) ||
    settings.defaultMockDuration < 1 ||
    settings.defaultMockDuration > 360
  ) {
    return { valid: false, message: getText("invalid") };
  }

  if (![0, 0.25, 0.33, 0.5].includes(settings.negativeMarking)) {
    return { valid: false, message: getText("invalid") };
  }

  if (
    settings.announcement.enabled &&
    !settings.announcement.title.trim()
  ) {
    return { valid: false, message: getText("required") };
  }

  return { valid: true };
}

async function saveAdminSettings() {
  if (isSaving || !hasUnsavedChanges()) return;

  if (typeof callbacks.saveSettings !== "function") {
    showMessage(getText("saveError"), "error");
    return;
  }

  const validation = validateSettings(currentSettings);

  if (!validation.valid) {
    showMessage(validation.message, "error");
    return;
  }

  isSaving = true;
  updateDirtyState();

  const saveButton = containerElement?.querySelector(
    "[data-settings-save]"
  );

  if (saveButton) {
    saveButton.textContent = getText("saving");
    saveButton.disabled = true;
  }

  try {
    const payload = clone(currentSettings);

    // The backend must verify the caller's admin role.
    // Never trust frontend role checks for authorization.
    const result = await callbacks.saveSettings(payload);

    if (result?.success === false) {
      throw new Error(result.message || "Settings save failed");
    }

    originalSettings = clone(currentSettings);

    showMessage(getText("saveSuccess"), "success");
  } catch (error) {
    console.error("Admin settings save error:", error);
    showMessage(getText("saveError"), "error");
  } finally {
    isSaving = false;
    renderAdminSettings();
  }
}

function resetAdminSettings() {
  const confirmed = window.confirm(getText("confirmReset"));

  if (!confirmed) return;

  currentSettings = clone(DEFAULT_SETTINGS);

  renderAdminSettings();
  showMessage(getText("resetSuccess"), "info");
}

async function loadAdminSettings() {
  if (typeof callbacks.loadSettings !== "function") {
    showMessage(getText("loadError"), "error");
    return false;
  }

  try {
    const result = await callbacks.loadSettings();

    const data = result?.settings ?? result ?? {};

    currentSettings = normalizeSettings(data);
    originalSettings = clone(currentSettings);

    renderAdminSettings();

    return true;
  } catch (error) {
    console.error("Admin settings load error:", error);
    showMessage(getText("loadError"), "error");
    return false;
  }
}

/**
 * Mount the settings page.
 *
 * Required options:
 * - container: DOM element
 * - loadSettings: trusted backend read function
 * - saveSettings: trusted backend save function
 *
 * Optional:
 * - language: "hi" | "en"
 * - onMessage(message, type)
 */
export async function mountAdminSettings(options = {}) {
  if (!options.container) {
    throw new Error("Admin settings container is required.");
  }

  if (
    typeof options.loadSettings !== "function" ||
    typeof options.saveSettings !== "function"
  ) {
    throw new Error(
      "Secure loadSettings and saveSettings callbacks are required."
    );
  }

  containerElement = options.container;
  callbacks = {
    loadSettings: options.loadSettings,
    saveSettings: options.saveSettings,
    onMessage: options.onMessage
  };

  currentLanguage = options.language === "en" ? "en" : "hi";

  containerElement.innerHTML = `
    <div class="admin-settings-loading">
      ${getText("loading")}
    </div>
  `;

  return await loadAdminSettings();
}

export function getCurrentAdminSettings() {
  return clone(currentSettings);
}

export function hasAdminSettingsChanged() {
  return hasUnsavedChanges();
}

export function setAdminSettingsLanguage(language = "hi") {
  currentLanguage = language === "en" ? "en" : "hi";
  renderAdminSettings();
}

export { DEFAULT_SETTINGS };
