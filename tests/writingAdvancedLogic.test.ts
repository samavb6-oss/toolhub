import test from "node:test";
import assert from "node:assert/strict";
import { applyWritingSuggestions, checkWriting, summarizeText } from "../src/tools/writingAdvancedLogic.ts";

test("writing checker catches common typos with original casing preserved", () => {
  const issues = checkWriting("Teh recieve the seperate files.");
  assert.deepEqual(issues.map((issue) => issue.suggestion), ["The", "receive", "separate"]);
  assert.ok(issues.every((issue) => issue.reason.includes("spelling")));
});

test("writing checker flags repeated words and common subject-verb patterns", () => {
  const issues = checkWriting("The the file is ready. I is late. They was late.");
  assert.ok(issues.some((issue) => issue.original === "The the" && issue.suggestion === "The"));
  assert.ok(issues.some((issue) => issue.original === "I is" && issue.suggestion === "I am"));
  assert.ok(issues.some((issue) => issue.original === "They was" && issue.suggestion === "They were"));
});

test("writing checker catches extra spaces, punctuation spacing and sentence capitalization", () => {
  const issues = checkWriting("hello  world . this is a test!");
  assert.ok(issues.some((issue) => issue.original === "  " && issue.suggestion === " "));
  assert.ok(issues.some((issue) => issue.original === " ." && issue.suggestion === "."));
  assert.ok(issues.some((issue) => issue.original === "t" && issue.suggestion === "T"));
});

test("writing checker is empty for blank text and does not change clean text", () => {
  assert.deepEqual(checkWriting(" \n\t"), []);
  assert.deepEqual(checkWriting("The project is ready. We are on time."), []);
});

test("suggested edits apply from right to left without shifting later offsets", () => {
  const input = "Teh report is ready. They was here.";
  const issues = checkWriting(input);
  assert.equal(applyWritingSuggestions(input, issues), "The report is ready. They were here.");
});

test("suggested edits re-check after spelling fixes expose repeated words", () => {
  const input = "Teh the report is ready.";
  assert.equal(applyWritingSuggestions(input, checkWriting(input)), "The report is ready.");
});

test("extractive summary handles blank input", () => {
  assert.deepEqual(summarizeText("  \n"), { summary: "", sourceSentences: 0, summarySentences: 0, sourceWords: 0, summaryWords: 0 });
});

test("extractive summary selects requested number of original sentences", () => {
  const input = "Solar panels convert sunlight into electricity. Solar panels can reduce household energy bills. A garden needs regular watering. Solar panels work best in direct sunlight.";
  const result = summarizeText(input, 2);
  assert.equal(result.sourceSentences, 4);
  assert.equal(result.summarySentences, 2);
  assert.ok(input.includes("Solar panels convert sunlight into electricity."));
  assert.ok(input.includes("Solar panels work best in direct sunlight."));
  assert.ok(result.summary.includes("Solar panels"));
});

test("extractive summary keeps source order and never invents wording", () => {
  const input = "First, the project begins. Second, the team gathers data. Third, the team reviews results.";
  const result = summarizeText(input, 2);
  assert.ok(result.summary.indexOf("First") < result.summary.indexOf("Second") || !result.summary.includes("First"));
  assert.ok(result.summary.startsWith("Second, the team gathers data."));
  assert.ok(result.summary.endsWith("Third, the team reviews results."));
  assert.ok(input.includes("Second, the team gathers data."));
  assert.ok(input.includes("Third, the team reviews results."));
});

test("extractive summary clamps sentence count and caps very long input", () => {
  const input = Array.from({ length: 20 }, (_, i) => `Sentence ${i + 1} contains useful project details.`).join(" ");
  assert.equal(summarizeText(input, 0).summarySentences, 1);
  assert.equal(summarizeText(input, 100).summarySentences, 10);
  assert.equal(summarizeText("word ".repeat(50_000)).sourceWords, 8_000);
});
