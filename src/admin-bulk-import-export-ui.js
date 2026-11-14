import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase.js";

const validateImportCallable = httpsCallable(
  functions,
  "adminValidateQuestionImport"
);

const bulkImportCallable = httpsCallable(
  functions,
  "adminBulkImportQuestions"
);

const bulkExportCallable = httpsCallable(
  functions,
  "adminBulkExportQuestions"
);

const MAX_IMPORT_SIZE = 300;
const MAX_EXPORT_PAGE_SIZE = 100;

let selectedQuestions = [];
let validationPassed = false;

/**
 * HTML में सुरक्षित टेक्स्ट दिखाने के लिए।
 */
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

/**
 * Status message दिखाएँ।
 */
function showStatus(container, message, type = "info") {
  const status = container.querySelector("#bulkStatus");

  if (!status) return;

  status.textContent = message;
  status.dataset.type = type;
}

/**
 * Admin Bulk Import/Export Panel बनाएँ।
 */
export function renderBulkImportExportPanel(container) {
  if (!container) {
    throw new Error("Admin panel container नहीं मिला।");
  }

  container.innerHTML = `
    <section class="bulk-admin-panel">

      <h2>Question Bank Import / Export</h2>

      <div class="bulk-import-section">

        <h3>प्रश्न Import करें</h3>

        <p>
          JSON फाइल चुनें। एक बार में अधिकतम
          ${MAX_IMPORT_SIZE} प्रश्न Import किए जा सकते हैं।
        </p>

        <input
          type="file"
          id="bulkJsonFile"
          accept=".json,application/json"
        />

        <button id="validateBulkQuestions" type="button">
          प्रश्न जाँचें
        </button>

        <button
          id="importBulkQuestions"
          type="button"
          disabled
        >
          प्रश्न Import करें
        </button>

        <div id="bulkPreview"></div>

      </div>

      <hr />

      <div class="bulk-export-section">

        <h3>प्रश्न Export करें</h3>

        <label>
          Exam ID
          <input id="exportExamId" type="text" />
        </label>

        <label>
          Subject
          <input id="exportSubject" type="text" />
        </label>

        <label>
          Topic
          <input id="exportTopic" type="text" />
        </label>

        <label>
          Year
          <input
            id="exportYear"
            type="number"
            min="2000"
            max="${new Date().getFullYear()}"
          />
        </label>

        <label>
          Publication Status
          <select id="exportPublished">
            <option value="">सभी</option>
            <option value="true">Published</option>
            <option value="false">Draft</option>
          </select>
        </label>

        <label>
          PYQ Verification
          <select id="exportVerified">
            <option value="">सभी</option>
            <option value="true">Verified</option>
            <option value="false">Unverified</option>
          </select>
        </label>

        <button id="exportBulkQuestions" type="button">
          JSON Export करें
        </button>

      </div>

      <div
        id="bulkStatus"
        role="status"
        aria-live="polite"
        data-type="info"
      ></div>

    </section>
  `;

  bindBulkImportEvents(container);
}

/**
 * JSON फाइल पढ़ें।
 */
async function readJsonFile(file) {
  if (!file) {
    throw new Error("पहले JSON फाइल चुनें।");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("JSON फाइल का आकार 5 MB से अधिक है।");
  }

  const text = await file.text();

  let parsed;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("JSON फाइल का फॉर्मेट सही नहीं है।");
  }

  const questions = Array.isArray(parsed)
    ? parsed
    : parsed.questions;

  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error(
      "JSON में questions नाम की प्रश्नों की सूची होनी चाहिए।"
    );
  }

  if (questions.length > MAX_IMPORT_SIZE) {
    throw new Error(
      `एक बार में अधिकतम ${MAX_IMPORT_SIZE} प्रश्न Import कर सकते हैं।`
    );
  }

  return questions;
}

/**
 * Validation Result दिखाएँ।
 */
function renderValidationResult(container, result) {
  const preview = container.querySelector("#bulkPreview");

  if (!preview) return;

  const errors = (result.results || [])
    .filter((item) => !item.valid)
    .map((item) => {
      const messages = (item.errors || [])
        .map(escapeHTML)
        .join("<br>");

      return `
        <div class="bulk-error-item">
          <strong>प्रश्न ${item.index + 1}</strong>
          <p>${messages}</p>
        </div>
      `;
    })
    .join("");

  preview.innerHTML = `
    <div class="bulk-validation-summary">
      <p>कुल प्रश्न: ${result.total}</p>
      <p>सही प्रश्न: ${result.validCount}</p>
      <p>गलत प्रश्न: ${result.invalidCount}</p>

      <p>
        स्थिति:
        ${result.canImport ? "Import के लिए तैयार" : "पहले गलतियाँ ठीक करें"}
      </p>
    </div>

    ${errors}
  `;
}

/**
 * Import और Export के Events।
 */
function bindBulkImportEvents(container) {
  const fileInput = container.querySelector("#bulkJsonFile");

  const validateButton = container.querySelector(
    "#validateBulkQuestions"
  );

  const importButton = container.querySelector(
    "#importBulkQuestions"
  );

  const exportButton = container.querySelector(
    "#exportBulkQuestions"
  );

  fileInput.addEventListener("change", () => {
    selectedQuestions = [];
    validationPassed = false;

    importButton.disabled = true;

    container.querySelector("#bulkPreview").innerHTML = "";
    showStatus(container, "नई JSON फाइल चुनी गई है।");
  });

  /**
   * IMPORT VALIDATION
   */
  validateButton.addEventListener("click", async () => {
    try {
      validateButton.disabled = true;
      importButton.disabled = true;

      showStatus(container, "प्रश्नों की जाँच हो रही है...");

      const file = fileInput.files?.[0];

      selectedQuestions = await readJsonFile(file);

      const response = await validateImportCallable({
        questions: selectedQuestions
      });

      const result = response.data;

      renderValidationResult(container, result);

      validationPassed =
        result.success === true &&
        result.canImport === true;

      importButton.disabled = !validationPassed;

      showStatus(
        container,
        validationPassed
          ? "सभी प्रश्न सही हैं। अब Import कर सकते हैं।"
          : "कुछ प्रश्नों में गलतियाँ मिली हैं।",
        validationPassed ? "success" : "error"
      );

    } catch (error) {
      validationPassed = false;
      selectedQuestions = [];

      showStatus(
        container,
        error.message || "Validation असफल रही।",
        "error"
      );

    } finally {
      validateButton.disabled = false;
    }
  });

  /**
   * BULK IMPORT
   */
  importButton.addEventListener("click", async () => {
    if (!validationPassed || selectedQuestions.length === 0) {
      showStatus(
        container,
        "पहले प्रश्नों की Validation करें।",
        "error"
      );

      return;
    }

    const confirmed = window.confirm(
      `${selectedQuestions.length} प्रश्न Import करने हैं?\n\n` +
      "ये प्रश्न Draft रहेंगे और अपने-आप Verified या Published नहीं होंगे।"
    );

    if (!confirmed) return;

    try {
      importButton.disabled = true;

      showStatus(container, "प्रश्न Import हो रहे हैं...");

      const response = await bulkImportCallable({
        questions: selectedQuestions
      });

      const result = response.data;

      if (!result.success) {
        throw new Error(
          result.message || "Import पूरा नहीं हुआ।"
        );
      }

      showStatus(
        container,
        `Import पूरा हुआ। सफल: ${result.imported}, Duplicate: ${result.duplicates}`,
        "success"
      );

      selectedQuestions = [];
      validationPassed = false;

      fileInput.value = "";

      container.querySelector("#bulkPreview").innerHTML = "";

    } catch (error) {
      showStatus(
        container,
        error.message || "Import असफल रहा।",
        "error"
      );

    } finally {
      importButton.disabled = true;
    }
  });

  /**
   * BULK EXPORT
   */
  exportButton.addEventListener("click", async () => {
    try {
      exportButton.disabled = true;

      showStatus(container, "प्रश्न Export हो रहे हैं...");

      const filters = {
        examId: container.querySelector("#exportExamId").value.trim(),
        subject: container.querySelector("#exportSubject").value.trim(),
        topic: container.querySelector("#exportTopic").value.trim()
      };

      const yearValue = container.querySelector("#exportYear").value;

      if (yearValue) {
        filters.year = Number(yearValue);
      }

      const publishedValue = container.querySelector(
        "#exportPublished"
      ).value;

      if (publishedValue !== "") {
        filters.isPublished = publishedValue === "true";
      }

      const verifiedValue = container.querySelector(
        "#exportVerified"
      ).value;

      if (verifiedValue !== "") {
        filters.pyqVerified = verifiedValue === "true";
      }

      const allQuestions = [];
      let cursorId = "";

      while (true) {
        const response = await bulkExportCallable({
          filters,
          pageSize: MAX_EXPORT_PAGE_SIZE,
          cursorId
        });

        const result = response.data;

        if (!result.success) {
          throw new Error("Export असफल रहा।");
        }

        allQuestions.push(...result.questions);

        if (!result.hasMore || !result.nextCursorId) {
          break;
        }

        cursorId = result.nextCursorId;
      }

      const exportData = {
        exportedAt: new Date().toISOString(),
        totalQuestions: allQuestions.length,
        questions: allQuestions
      };

      const blob = new Blob(
        [JSON.stringify(exportData, null, 2)],
        { type: "application/json" }
      );

      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;
      link.download = `rajasthan-pyq-export-${Date.now()}.json`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);

      showStatus(
        container,
        `${allQuestions.length} प्रश्न सफलतापूर्वक Export हुए।`,
        "success"
      );

    } catch (error) {
      showStatus(
        container,
        error.message || "Export असफल रहा।",
        "error"
      );

    } finally {
      exportButton.disabled = false;
    }
  });
}
