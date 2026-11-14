import test from "node:test";
import assert from "node:assert/strict";

import {
  createPYQImportPreview,
  exportPYQPreviewJSON,
  exportPYQPreviewCSV
} from "../src/pyq-import-preview.js";

function makeQuestion(id = "Q-001") {
  return {
    id,

    examName: "CET Graduate",
    year: 2024,
    questionNumber: 1,

    source: "https://example.com/official-paper",

    question: {
      hi: "राजस्थान की राजधानी क्या है?",
      en: "What is the capital of Rajasthan?"
    },

    options: {
      hi: {
        A: "जयपुर",
        B: "जोधपुर",
        C: "अजमेर",
        D: "उदयपुर"
      },
      en: {
        A: "Jaipur",
        B: "Jodhpur",
        C: "Ajmer",
        D: "Udaipur"
      }
    },

    correctAnswer: "A",
    subject: "Rajasthan GK",
    topic: "Geography",
    subtopic: "Cities",
    difficulty: "easy",
    questionType: "verified_pyq",
    verificationStatus: "pending"
  };
}

test("Import preview should reject non-array input", () => {
  assert.throws(
    () => createPYQImportPreview("invalid"),
    TypeError
  );
});

test("Import preview should return a report", () => {
  const report = createPYQImportPreview([
    makeQuestion()
  ]);

  assert.equal(report.success, true);
  assert.equal(report.summary.total, 1);
  assert.ok(Array.isArray(report.records));
});

test("Import preview should detect duplicate IDs", () => {
  const report = createPYQImportPreview(
    [
      makeQuestion("Q-100"),
      makeQuestion("Q-100")
    ]
  );

  assert.equal(report.summary.total, 2);
  assert.ok(report.summary.duplicates >= 1);
});

test("Import preview should detect existing question IDs", () => {
  const report = createPYQImportPreview(
    [makeQuestion("Q-200")],
    [makeQuestion("Q-200")]
  );

  assert.ok(report.summary.duplicates >= 1);
});

test("Import preview should detect missing Hindi content", () => {
  const question = makeQuestion();

  question.question.hi = "";

  const report = createPYQImportPreview([question]);

  assert.ok(
    report.invalidQuestions.length >= 1
  );
});

test("Import preview should detect missing source metadata", () => {
  const question = makeQuestion();

  delete question.source;

  const report = createPYQImportPreview([question]);

  assert.ok(
    report.invalidQuestions.length >= 1
  );
});

test("JSON export should return valid JSON", () => {
  const report = createPYQImportPreview([
    makeQuestion()
  ]);

  const json = exportPYQPreviewJSON(report);

  assert.doesNotThrow(() => JSON.parse(json));
});

test("CSV export should include report headers", () => {
  const report = createPYQImportPreview([
    makeQuestion()
  ]);

  const csv = exportPYQPreviewCSV(report);

  assert.ok(csv.includes("Question ID"));
  assert.ok(csv.includes("Status"));
  assert.ok(csv.includes("Issues"));
});
