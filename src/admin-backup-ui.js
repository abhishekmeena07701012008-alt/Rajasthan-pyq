import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase.js";

const createBackupCallable = httpsCallable(
  functions,
  "adminCreateBackup"
);

const listBackupsCallable = httpsCallable(
  functions,
  "adminListBackups"
);

const restoreBackupCallable = httpsCallable(
  functions,
  "adminRestoreBackup"
);

let backupPanelContainer = null;

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };

    return entities[char];
  });
}

function formatBytes(bytes) {
  const value = Number(bytes) || 0;

  if (value < 1024) {
    return `${value} Bytes`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(2)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(value) {
  if (!value) return "उपलब्ध नहीं";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "अमान्य तारीख";
  }

  return new Intl.DateTimeFormat("hi-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function showStatus(message, type = "info") {
  const status = backupPanelContainer?.querySelector("#backupStatus");

  if (!status) return;

  status.textContent = message;
  status.dataset.type = type;
}

function setBusy(isBusy) {
  const buttons = backupPanelContainer?.querySelectorAll(
    "button[data-backup-action]"
  );

  buttons?.forEach((button) => {
    button.disabled = isBusy;
  });
}

/**
 * Backup Panel Render
 */
export function renderAdminBackupPanel(container) {
  if (!container) {
    throw new Error("Backup panel container नहीं मिला।");
  }

  backupPanelContainer = container;

  container.innerHTML = `
    <section class="admin-backup-panel">

      <h2>Backup & Restore</h2>

      <p>
        ऐप के महत्वपूर्ण डेटा का सुरक्षित Backup बनाएँ।
        Restore करने से मौजूदा डेटा बदल सकता है।
      </p>

      <div class="backup-create-section">
        <h3>नया Backup बनाएँ</h3>

        <button
          id="createBackupButton"
          data-backup-action
          type="button"
        >
          नया Backup बनाएँ
        </button>
      </div>

      <hr />

      <div class="backup-list-section">

        <div class="backup-list-heading">
          <h3>पहले से मौजूद Backups</h3>

          <button
            id="refreshBackupsButton"
            data-backup-action
            type="button"
          >
            Refresh
          </button>
        </div>

        <div id="backupList">
          <p>Backup सूची लोड हो रही है...</p>
        </div>

      </div>

      <div
        id="backupStatus"
        role="status"
        aria-live="polite"
        data-type="info"
      ></div>

    </section>
  `;

  bindBackupEvents();

  loadBackupList();
}

/**
 * Backup list load
 */
export async function loadBackupList() {
  if (!backupPanelContainer) {
    throw new Error("पहले Backup Panel Render करें।");
  }

  const list = backupPanelContainer.querySelector("#backupList");

  list.innerHTML = "<p>Backups लोड हो रहे हैं...</p>";

  try {
    const response = await listBackupsCallable();

    const result = response.data;

    if (!result?.success) {
      throw new Error("Backup सूची प्राप्त नहीं हुई।");
    }

    renderBackupList(result.backups || []);

  } catch (error) {
    list.textContent =
      error.message || "Backup सूची लोड नहीं हो सकी।";
  }
}

/**
 * Backup list UI
 */
function renderBackupList(backups) {
  const list = backupPanelContainer.querySelector("#backupList");

  if (!backups.length) {
    list.innerHTML = "<p>अभी कोई Backup उपलब्ध नहीं है।</p>";
    return;
  }

  list.innerHTML = backups.map((backup) => {
    const backupId = escapeHTML(backup.backupId);

    const collectionCounts = Object.entries(
      backup.collectionCounts || {}
    ).map(([name, count]) => {
      return `
        <li>
          ${escapeHTML(name)}:
          ${Number(count) || 0}
        </li>
      `;
    }).join("");

    return `
      <article class="backup-card">

        <h4>${backupId}</h4>

        <p>
          तारीख:
          ${escapeHTML(formatDate(backup.createdAt))}
        </p>

        <p>
          आकार:
          ${escapeHTML(formatBytes(backup.sizeBytes))}
        </p>

        <p>
          Status:
          ${escapeHTML(backup.status || "unknown")}
        </p>

        <details>
          <summary>Backup Details</summary>
          <ul>${collectionCounts}</ul>
        </details>

        <button
          type="button"
          data-backup-action
          data-restore-id="${backupId}"
          class="restore-backup-button"
          ${backup.status !== "completed" ? "disabled" : ""}
        >
          इस Backup को Restore करें
        </button>

      </article>
    `;
  }).join("");
}

/**
 * Create Backup
 */
async function createBackup() {
  const confirmed = window.confirm(
    "क्या आप नया Backup बनाना चाहते हैं?"
  );

  if (!confirmed) return;

  try {
    setBusy(true);

    showStatus(
      "Backup बनाया जा रहा है। इसमें कुछ समय लग सकता है..."
    );

    const response = await createBackupCallable();

    const result = response.data;

    if (!result?.success) {
      throw new Error("Backup नहीं बन पाया।");
    }

    showStatus(
      `Backup सफल! ID: ${result.backupId}`,
      "success"
    );

    await loadBackupList();

  } catch (error) {
    showStatus(
      error.message || "Backup बनाने में समस्या आई।",
      "error"
    );

  } finally {
    setBusy(false);
  }
}

/**
 * Restore Backup
 */
async function restoreBackup(backupId) {
  const firstConfirmation = window.confirm(
    "चेतावनी!\n\n" +
    "Restore करने से प्रश्न, Current Affairs, Daily Quiz, " +
    "Mock Tests और App Settings का मौजूदा डेटा बदल सकता है।\n\n" +
    "क्या आपने हाल का Backup बना लिया है?"
  );

  if (!firstConfirmation) return;

  const typedConfirmation = window.prompt(
    'Restore की पुष्टि के लिए ठीक यही लिखें:\nRESTORE BACKUP'
  );

  if (typedConfirmation !== "RESTORE BACKUP") {
    showStatus("Restore रद्द कर दिया गया।");
    return;
  }

  try {
    setBusy(true);

    showStatus(
      "Restore चल रहा है। इस दौरान पेज बंद न करें..."
    );

    const response = await restoreBackupCallable({
      backupId,
      confirmationText: "RESTORE BACKUP"
    });

    const result = response.data;

    if (!result?.success) {
      throw new Error("Restore पूरा नहीं हुआ।");
    }

    showStatus(
      `Restore सफल हुआ। Restore ID: ${result.restoreId}`,
      "success"
    );

    await loadBackupList();

  } catch (error) {
    showStatus(
      error.message || "Restore में समस्या आई।",
      "error"
    );

  } finally {
    setBusy(false);
  }
}

/**
 * Event listeners
 */
function bindBackupEvents() {
  const createButton = backupPanelContainer.querySelector(
    "#createBackupButton"
  );

  const refreshButton = backupPanelContainer.querySelector(
    "#refreshBackupsButton"
  );

  createButton.addEventListener("click", createBackup);

  refreshButton.addEventListener("click", async () => {
    try {
      setBusy(true);
      await loadBackupList();
      showStatus("Backup सूची अपडेट हो गई।", "success");
    } finally {
      setBusy(false);
    }
  });

  const list = backupPanelContainer.querySelector("#backupList");

  list.addEventListener("click", (event) => {
    const button = event.target.closest(
      "[data-restore-id]"
    );

    if (!button) return;

    const backupId = button.dataset.restoreId;

    if (backupId) {
      restoreBackup(backupId);
    }
  });
}
