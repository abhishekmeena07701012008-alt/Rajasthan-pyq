/**
 * RAJASTHAN PYQ MASTER
 * Admin PYQ Import Manager
 *
 * Features:
 * - Select a JSON question file
 * - Run PYQ import workflow
 * - Display validation and source audit
 * - Download JSON and CSV reports
 *
 * This module does not upload or publish questions.
 */

import {
  runPYQImportWorkflow
} from "./pyq-import-workflow.js";

import {
  exportPYQPreviewJSON,
  exportPYQPreviewCSV,
  downloadPYQReport
} from "./pyq-import-preview.js";

let latestReport = null;

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

function renderMessage(container, message) {
  container.innerHTML = `
    <p role="alert">${escapeHTML(message)}</p>
  `;
}

function renderReport(container, report) {
  const summary = report.summary;

  container.innerHTML = `
    <section class="admin-pyq-import">

      <h2>PYQ Import Review</h2>

      <div class="pyq-import-summary">
        <p>Total Questions: <strong>${summary.total}</strong></p>
        <p>Valid Preview: <strong>${summary.validPreview}</strong></p>
        <p>Invalid Preview: <strong>${summary.invalidPreview}</strong></p>
        <p>Official Domains: <strong>${summary.officialSources}</strong></p>
        <p>Invalid Sources: <strong>${summary.invalidSources}</strong></p>
        <p>Ready for Admin Review: <strong>${summary.readyForAdminReview}</strong></p>
        <p>Needs Correction: <strong>${summary.needsCorrection}</strong></p>
      </div>

      <div class="pyq-import-downloads">
        <button type="button" data-download="json">
          Download JSON Report
        </button>

        <button type="button" data-download="csv">
          Download CSV Report
        </button>
      </div>

      <h3>Question Review Details</h3>

      <div class="pyq-import-records">
        ${report.reviewedQuestions.map(item => `
          <article class="pyq-import-record">
            <h4>
              Row ${item.row} —
              ${escapeHTML(item.questionId || "No ID")}
            </h4>

            <p>
              Preview Status:
              ${escapeHTML(item.status)}
            </p>

            <p>
              Official Domain:
              ${item.sourceAudit?.officialDomain ? "Yes" : "No"}
            </p>

            ${
              item.allIssues.length
                ? `<ul>
                    ${item.allIssues.map(issue =>
                      `<li>${escapeHTML(issue)}</li>`
                    ).join("")}
                  </ul>`
                : "<p>No issues detected.</p>"
            }

            <p>
              Verification:
              Pending Admin Review
            </p>
          </article>
        `).join("")}
      </div>

      <p class="pyq-import-warning">
        ${escapeHTML(report.notice)}
      </p>

    </section>
  `;

  container.querySelector('[data-download="json"]')
    ?.addEventListener("click", () => {
      downloadPYQReport(
        exportPYQPreviewJSON(report),
        "pyq-import-audit.json"
      );
    });

  container.querySelector('[data-download="csv"]')
    ?.addEventListener("click", () => {
      downloadPYQReport(
        exportPYQPreviewCSV({
          records: report.reviewedQuestions.map(item => ({
            ...item,
            issues: item.allIssues
          }))
        }),
        "pyq-import-audit.csv",
        "text/csv;charset=utf-8"
      );
    });
}

/**
 * Mounts the PYQ import screen.
 *
 * @param {HTMLElement} container
 * @param {Array} existingQuestions
 */
export function mountAdminPYQImport(
  container,
  existingQuestions = []
) {
  if (!container) {
    throw new Error("Admin PYQ import container is missing");
  }

  if (!Array.isArray(existingQuestions)) {
    throw new TypeError("Existing questions must be an array");
  }

  container.innerHTML = `
    <section class="admin-pyq-import">

      <h2>PYQ Question Import</h2>

      <p>
        Select a JSON file containing bilingual PYQ questions.
      </p>

      <input
        type="file"
        id="pyq-import-file"
        accept=".json,application/json"
      >

      <button type="button" id="pyq-import-review">
        Review Questions
      </button>

      <div id="pyq-import-result" aria-live="polite"></div>

    </section>
  `;

  const fileInput = container.querySelector(
    "#pyq-import-file"
  );

  const reviewButton = container.querySelector(
    "#pyq-import-review"
  );

  const resultContainer = container.querySelector(
    "#pyq-import-result"
  );

  reviewButton.addEventListener("click", async () => {
    const file = fileInput.files?.[0];

    if (!file) {
      renderMessage(
        resultContainer,
        "पहले JSON प्रश्न फ़ाइल चुनें।"
      );
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      renderMessage(
        resultContainer,
        "फ़ाइल का आकार 5 MB से कम होना चाहिए।"
      );
      return;
    }

    try {
      const content = await file.text();
      const questions = JSON.parse(content);

      if (!Array.isArray(questions)) {
        throw new Error(
          "JSON file में questions की array होनी चाहिए।"
        );
      }

      latestReport = runPYQImportWorkflow(
        questions,
        existingQuestions
      );

      renderReport(resultContainer, latestReport);

    } catch (error) {
      latestReport = null;

      renderMessage(
        resultContainer,
        error?.message || "Import review असफल रहा।"
      );
    }
  });

  return {
    getLatestReport() {
      return latestReport;
    }
  };
}
