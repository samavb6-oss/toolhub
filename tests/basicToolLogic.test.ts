import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAiPrompt,
  calculateEmi,
  countText,
  generateSecurePassword,
  passwordGroups,
} from "../src/tools/basicToolLogic.ts";

test("EMI handles zero-interest loans", () => {
  assert.equal(calculateEmi(12000, 0, 12), 1000);
});

test("EMI returns a finite positive payment for a normal loan", () => {
  const payment = calculateEmi(500000, 8.5, 240);
  assert.ok(Number.isFinite(payment));
  assert.ok(payment > 0);
  assert.ok(Math.abs(payment - 4339.12) < 0.1);
});

test("EMI rejects invalid loan inputs safely", () => {
  assert.equal(calculateEmi(0, 8, 12), 0);
  assert.equal(calculateEmi(1000, -1, 12), 0);
  assert.equal(calculateEmi(1000, 8, 0), 0);
});

test("word counter handles empty text and multiple paragraphs", () => {
  assert.deepEqual(countText(""), {
    words: 0, characters: 0, charactersNoSpaces: 0, sentences: 0, paragraphs: 0, readingMinutes: 0,
  });
  const counts = countText("Hello, world! I'm Sam.\n\nSecond paragraph.");
  assert.equal(counts.words, 6);
  assert.equal(counts.sentences, 3);
  assert.equal(counts.paragraphs, 2);
  assert.equal(counts.readingMinutes, 1);
});

test("password generator respects length and selected character groups", () => {
  const lower = passwordGroups.find((group) => group.id === "password-lowercase")!;
  const upper = passwordGroups.find((group) => group.id === "password-uppercase")!;
  const password = generateSecurePassword(24, [lower.id, upper.id], false);
  assert.equal(password.length, 24);
  assert.match(password, /[a-z]/);
  assert.match(password, /[A-Z]/);
  assert.match(password, /^[a-zA-Z]+$/);
});

test("password generator rejects empty groups and invalid lengths", () => {
  assert.throws(() => generateSecurePassword(12, [], false), /Choose at least one character type/);
  assert.throws(() => generateSecurePassword(7, ["password-lowercase"], false), /between 8 and 128/);
});

test("AI prompt generator includes required task and optional context", () => {
  const prompt = buildAiPrompt({
    task: "Create a study plan", role: "teacher", audience: "beginners",
    context: "One hour per day", tone: "friendly", format: "table", constraints: "No weekends",
  });
  assert.match(prompt, /Task: Create a study plan/);
  assert.match(prompt, /Audience: beginners/);
  assert.match(prompt, /Context:\nOne hour per day/);
  assert.match(prompt, /Requirements and constraints:\nNo weekends/);
});
