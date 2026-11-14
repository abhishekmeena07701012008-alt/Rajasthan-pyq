import test from "node:test";
import assert from "node:assert/strict";

import {
  runPYQImportWorkflow
} from "../src/pyq-import-workflow.js";

function makeQuestion(id = "PYQ-001") {
  return {
    id,
    examName: "CET Graduate",
    year: 2024,
    questionNumber: 1,

    source:
      "https://rsmssb.rajasthan.gov.in/sample-paper.pdf",

    answerKeySource:
      "https://rsmssb.rajasthan.gov.in/answer-key.pdf",

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

test("Workflow returns a complete report", () => {
  const report = runPYQImportWorkflow([
    makeQuestion()
  ]);

  assert.equal(report.success, true);
  assert.equal(report.summary.total, 1);
  assert.equal(report.reviewedQuestions.length, 1);
});

test("Workflow detects an unofficial source", () => {
  const question = makeQuestion();

  question.source = "https://example.com/paper.pdf";

  const report = runPYQImportWorkflow([question]);

  assert.equal(report.summary.officialSources, 0);
  assert.equal(report.summary.readyForAdminReview, 0);
});

test("Workflow detects missing answer key source", () => {
  const question = makeQuestion();

  delete question.answerKeySource;

  const report = runPYQImportWorkflow([question]);

  assert.equal(report.summary.readyForAdminReview, 0);
  assert.ok(report.summary.needsCorrection >= 1);
});

test("Workflow compares existing question IDs", () => {
  const question = makeQuestion();

  const report = runPYQImportWorkflow(
    [question],
    [makeQuestion()]
  );

  assert.ok(report.summary.invalidPreview >= 1);
});

test("Workflow does not automatically verify PYQs", () => {
  const report = runPYQImportWorkflow([
    makeQuestion()
  ]);

  assert.ok(
    report.notice.includes("does not mean Verified PYQ")
  );
});

test("Workflow rejects invalid question input", () => {
  assert.throws(
    () => runPYQImportWorkflow("invalid"),
    TypeError
  );
});
