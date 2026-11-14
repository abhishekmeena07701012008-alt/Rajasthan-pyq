import {
  createPYQImportPreview,
  exportPYQPreviewJSON,
  exportPYQPreviewCSV,
  downloadPYQReport
} from "./pyq-import-preview.js";

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

export function renderPYQImportPreview(
  container,
  questions,
  existingQuestions = []
) {
  if (!container) {
    throw new Error("Preview container not found");
  }

  const report = createPYQImportPreview(
    questions,
    existingQuestions
  );

  const { summary } = report;

  container.innerHTML = `
    <section class="pyq-import-preview">
      <h2>PYQ Import Preview</h2>

      <div class="pyq-preview-summary">
        <article>
          <strong>${summary.total}</strong>
          <span>Total Questions</span>
        </article>

        <article>
          <strong>${summary.valid}</strong>
          <span>Valid Questions</span>
        </article>

        <article>
          <strong>${summary.invalid}</strong>
          <span>Invalid Questions</span>
        </article>

        <article>
          <strong>${summary.duplicates}</strong>
          <span>Duplicate Questions</span>
        </article>
      </div>

      <div class="pyq-preview-actions">
        <button type="button" data-action="json">
          Download JSON Report
        </button>

        <button type="button" data-action="csv">
          Download CSV Report
        </button>
      </div>

      <div class="pyq-preview-records">
        ${report.records.map(record => `
          <article class="pyq-preview-record">
            <h3>
              Row ${record.row} —
              ${escapeHTML(record.questionId || "No ID")}
            </h3>

            <p>
              Status:
              <strong>${escapeHTML(record.status)}</strong>
            </p>

            ${
              record.issues.length
                ? `<ul>
                    ${record.issues.map(issue =>
                      `<li>${escapeHTML(issue)}</li>`
                    ).join("")}
                  </ul>`
                : "<p>No validation issues found.</p>"
            }
          </article>
        `).join("")}
      </div>

      <p class="pyq-preview-notice">
        Preview only. Questions are not uploaded,
        published, or verified by this screen.
      </p>
    </section>
  `;

  container.querySelector('[data-action="json"]')
    ?.addEventListener("click", () => {
      downloadPYQReport(
        exportPYQPreviewJSON(report),
        "pyq-import-report.json"
      );
    });

  container.querySelector('[data-action="csv"]')
    ?.addEventListener("click", () => {
      downloadPYQReport(
        exportPYQPreviewCSV(report),
        "pyq-import-report.csv",
        "text/csv;charset=utf-8"
      );
    });

  return report;
}
