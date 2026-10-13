import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAiPrompt,
  calculateEmiResults,
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

test("EMI rejects invalid loan inputs without returning a misleading zero", () => {
  assert.ok(Number.isNaN(calculateEmi(0, 8, 12)));
  assert.ok(Number.isNaN(calculateEmi(1000, -1, 12)));
  assert.ok(Number.isNaN(calculateEmi(1000, 8, 0)));
});

test("EMI uses a stable formula for a very large principal when the monthly payment is representable", () => {
  const payment = calculateEmi(1e308, 100, 600);
  assert.ok(Number.isFinite(payment));
  assert.ok(payment > 0);
});

test("EMI returns a non-finite sentinel when the final monthly payment cannot be represented", () => {
  assert.ok(Number.isNaN(calculateEmi(Number.MAX_VALUE, 100, 1)));
  assert.ok(Number.isNaN(calculateEmi(1e308, Number.MAX_VALUE, 600)));
});

test("EMI results suppress all figures when total repayment overflows", () => {
  assert.equal(calculateEmiResults(1e308, 100, 600), null);
});

test("EMI treats scale-sized cancellation noise as zero interest for tiny valid rates", () => {
  const result = calculateEmiResults(22851536281.880947, 6.371613507418029e-16, 278);
  assert.ok(result);
  assert.equal(result.totalInterest, 0);
  assert.ok(Number.isFinite(result.totalRepayment));
});

test("EMI results preserve normal and zero-interest totals", () => {
  assert.deepEqual(calculateEmiResults(12000, 0, 12), {
    emi: 1000,
    totalInterest: 0,
    totalRepayment: 12000,
  });
  assert.deepEqual(calculateEmiResults(1, 0, 3), {
    emi: 1 / 3,
    totalInterest: 0,
    totalRepayment: 1,
  });
  const normal = calculateEmiResults(500000, 8.5, 240);
  assert.ok(normal);
  assert.ok(Number.isFinite(normal.emi));
  assert.ok(Number.isFinite(normal.totalInterest));
  assert.ok(Number.isFinite(normal.totalRepayment));
  assert.ok(Math.abs(normal.emi - 4339.12) < 0.1);
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


test("word counter keeps Unicode combining marks inside words", () => {
  const counts = countText("नमस्ते दुनिया café don't well-being");
  assert.equal(counts.words, 5);
});

test("word counter does not count trailing apostrophes or hyphens as part of a word", () => {
  assert.equal(countText("hello- world' don't re-enter").words, 4);
});

test("word counter counts paragraphs across CRLF, lone CR, and Unicode line separators", () => {
  assert.equal(countText("First paragraph.\r\n\r\nSecond paragraph.\r\n\r\nThird paragraph.").paragraphs, 3);
  assert.equal(countText("First paragraph.\r\rSecond paragraph.").paragraphs, 2);
  assert.equal(countText("First paragraph.\u2028\u2028Second paragraph.").paragraphs, 2);
});

test("word counter keeps emoji out of word counts and counts Unicode code points", () => {
  const counts = countText("Hi 😀 🌍");
  assert.equal(counts.words, 1);
  assert.equal(counts.characters, 6);
  assert.equal(counts.charactersNoSpaces, 4);
});

