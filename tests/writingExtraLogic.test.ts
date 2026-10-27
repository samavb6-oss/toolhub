import test from "node:test";
import assert from "node:assert/strict";
import { estimateReadingTime, generateLoremIpsum, LOREM_LIMITS } from "../src/tools/writingExtraLogic.ts";

function countWords(text: string): number {
  return text.match(/[\p{L}\p{N}][\p{L}\p{M}\p{N}]*(?:['’_-][\p{L}\p{M}\p{N}]+)*/gu)?.length ?? 0;
}

test("read-time estimate is empty for blank text", () => {
  assert.deepEqual(estimateReadingTime(""), { words: 0, minutes: 0, wordsPerMinute: 200 });
  assert.equal(estimateReadingTime("  \n\t ").minutes, 0);
});

test("read-time estimate rounds up to a whole minute", () => {
  assert.deepEqual(estimateReadingTime("one two three"), { words: 3, minutes: 1, wordsPerMinute: 200 });
  const exactlyOneMinute = Array.from({ length: 200 }, () => "word").join(" ");
  assert.equal(estimateReadingTime(exactlyOneMinute).minutes, 1);
  const justOverOneMinute = Array.from({ length: 201 }, () => "word").join(" ");
  assert.equal(estimateReadingTime(justOverOneMinute).minutes, 2);
});

test("read-time estimate supports selectable speeds and Unicode words", () => {
  assert.deepEqual(estimateReadingTime("Hello नमस्ते 世界", 150), { words: 3, minutes: 1, wordsPerMinute: 150 });
  assert.equal(estimateReadingTime(Array.from({ length: 301 }, () => "word").join(" "), 300).minutes, 2);
});

test("read-time estimate rejects unsupported speeds", () => {
  for (const speed of [0, -200, 201, 150.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => estimateReadingTime("hello", speed), RangeError);
  }
});

test("Lorem Ipsum output starts with the classic opening and has exact requested word counts", () => {
  const output = generateLoremIpsum(2, 40);
  const paragraphs = output.split("\n\n");
  assert.equal(paragraphs.length, 2);
  assert.match(paragraphs[0], /^Lorem ipsum dolor sit amet\b/u);
  assert.deepEqual(paragraphs.map(countWords), [40, 40]);
  assert.ok(paragraphs.every((paragraph) => /^[A-Z]/u.test(paragraph) && /\.$/u.test(paragraph)));
});

test("Lorem Ipsum output is deterministic and changes with settings", () => {
  assert.equal(generateLoremIpsum(3, 60), generateLoremIpsum(3, 60));
  assert.equal(generateLoremIpsum(1, 20).split("\n\n").length, 1);
  assert.equal(generateLoremIpsum(4, 80).split("\n\n").length, 4);
});

test("Lorem Ipsum generator enforces paragraph boundaries", () => {
  assert.equal(generateLoremIpsum(LOREM_LIMITS.minParagraphs, 20).split("\n\n").length, 1);
  assert.equal(generateLoremIpsum(LOREM_LIMITS.maxParagraphs, 20).split("\n\n").length, 10);
  for (const paragraphs of [0, -1, 1.5, 11, Number.NaN]) {
    assert.throws(() => generateLoremIpsum(paragraphs, 20), RangeError);
  }
});

test("Lorem Ipsum generator enforces words-per-paragraph boundaries", () => {
  assert.equal(countWords(generateLoremIpsum(1, LOREM_LIMITS.minWordsPerParagraph)), 20);
  assert.equal(countWords(generateLoremIpsum(1, LOREM_LIMITS.maxWordsPerParagraph)), 200);
  for (const words of [0, 19, 20.5, 201, Number.POSITIVE_INFINITY]) {
    assert.throws(() => generateLoremIpsum(1, words), RangeError);
  }
});
