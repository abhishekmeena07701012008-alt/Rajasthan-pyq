import test from "node:test";
import assert from "node:assert/strict";

import {
  auditPYQSource,
  auditPYQSources
} from "../src/pyq-source-audit.js";

function makeQuestion() {
  return {
    id: "PYQ-001",
    examName: "CET Graduate",
    year: 2024,
    questionNumber: 1,

    source:
      "https://rsmssb.rajasthan.gov.in/sample-paper.pdf",

    answerKeySource:
      "https://rsmssb.rajasthan.gov.in/answer-key.pdf"
  };
}

test("Recognizes an official RSSB domain", () => {
  const result = auditPYQSource(makeQuestion());

  assert.equal(result.sourceValid, true);
  assert.equal(result.officialDomain, true);
  assert.equal(result.verificationStatus, "pending");
});

test("Rejects a non-HTTPS source", () => {
  const question = makeQuestion();

  question.source =
    "http://rsmssb.rajasthan.gov.in/paper.pdf";

  const result = auditPYQSource(question);

  assert.equal(result.sourceValid, false);
  assert.equal(result.officialDomain, false);
});

test("Does not recognize an unofficial domain", () => {
  const question = makeQuestion();

  question.source =
    "https://example.com/paper.pdf";

  const result = auditPYQSource(question);

  assert.equal(result.sourceValid, true);
  assert.equal(result.officialDomain, false);
});

test("Rejects an invalid URL", () => {
  const question = makeQuestion();

  question.source = "not-a-valid-url";

  const result = auditPYQSource(question);

  assert.equal(result.sourceValid, false);
});

test("Detects missing answer key source", () => {
  const question = makeQuestion();

  delete question.answerKeySource;

  const result = auditPYQSource(question);

  assert.ok(
    result.issues.includes("Answer key source is missing")
  );
});

test("Requires manual review even for official sources", () => {
  const result = auditPYQSource(makeQuestion());

  assert.equal(result.requiresManualReview, true);
  assert.equal(result.verificationStatus, "pending");
});

test("Audits multiple questions", () => {
  const report = auditPYQSources([
    makeQuestion(),
    {
      id: "PYQ-002",
      source: "invalid-url"
    }
  ]);

  assert.equal(report.total, 2);
  assert.equal(report.results.length, 2);
  assert.equal(report.manualReviewCount, 2);
});

test("Rejects non-array input", () => {
  assert.throws(
    () => auditPYQSources("invalid"),
    TypeError
  );
});
