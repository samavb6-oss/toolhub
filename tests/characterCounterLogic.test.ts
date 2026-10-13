import test from "node:test";
import assert from "node:assert/strict";
import {
  countCharacters,
  countGraphemes,
  describeCounts,
} from "../src/tools/characterCounterLogic.ts";

test("character counter returns zeros for empty input", () => {
  assert.deepEqual(countCharacters(""), {
    characters: 0, charactersNoSpaces: 0, words: 0, letters: 0, numbers: 0, whitespace: 0, lines: 0,
  });
});

test("character counter counts plain text, letters, numbers and spaces", () => {
  assert.deepEqual(countCharacters("Hello world"), {
    characters: 11, charactersNoSpaces: 10, words: 2, letters: 10, numbers: 0, whitespace: 1, lines: 1,
  });
  const mixed = countCharacters("Call 911 now");
  assert.equal(mixed.letters, 7);
  assert.equal(mixed.numbers, 3);
  assert.equal(mixed.words, 3);
});

test("emoji sequences count as one user-perceived character", () => {
  assert.equal(countCharacters("👨‍👩‍👧‍👦").characters, 1); // ZWJ family (7 code points)
  assert.equal(countCharacters("👍🏽").characters, 1); // skin-tone modifier
  assert.equal(countCharacters("🇮🇳").characters, 1); // regional-indicator flag
  assert.equal(countCharacters("❤️").characters, 1); // variation selector
});

test("simple emoji and spaces keep their expected counts", () => {
  const counts = countCharacters("Hi 😀 🌍");
  assert.equal(counts.characters, 6);
  assert.equal(counts.charactersNoSpaces, 4);
  assert.equal(counts.words, 1);
  assert.equal(counts.whitespace, 2);
});

test("a letter with a combining accent is one character and stays in its word", () => {
  const decomposed = countCharacters("é");
  assert.equal(decomposed.characters, 1);
  assert.equal(decomposed.words, 1);
  const naive = countCharacters("naïve");
  assert.equal(naive.words, 1);
  assert.equal(naive.characters, 5);
});

test("scripts with combining marks are not split into several words", () => {
  assert.equal(countCharacters("नमस्ते").words, 1);
  assert.equal(countCharacters("नमस्ते दुनिया").words, 2);
});

test("apostrophes, hyphens and underscores join words only between word characters", () => {
  assert.equal(countCharacters("well-being don't re-enter").words, 3);
  assert.equal(countCharacters("rock'n'roll snake_case").words, 2);
  assert.equal(countCharacters("hello- world'").words, 2);
  assert.equal(countCharacters("- ' _").words, 0);
});

test("whitespace handling: tabs, non-breaking spaces and no-space counts", () => {
  const counts = countCharacters("a b\tc");
  assert.equal(counts.characters, 5);
  assert.equal(counts.charactersNoSpaces, 3);
  assert.equal(counts.whitespace, 2);
  assert.equal(counts.words, 3);
  const onlySpaces = countCharacters("   \t ");
  assert.equal(onlySpaces.characters, 5);
  assert.equal(onlySpaces.charactersNoSpaces, 0);
  assert.equal(onlySpaces.words, 0);
  assert.equal(onlySpaces.lines, 1);
});

test("line breaks: LF, CRLF and lone CR each count as one break", () => {
  for (const text of ["a\nb\nc", "a\r\nb\r\nc", "a\rb\rc"]) {
    const counts = countCharacters(text);
    assert.equal(counts.lines, 3, JSON.stringify(text));
    assert.equal(counts.characters, 5, JSON.stringify(text));
    assert.equal(counts.charactersNoSpaces, 3, JSON.stringify(text));
    assert.equal(counts.whitespace, 2, JSON.stringify(text));
  }
});

test("a trailing newline starts a new empty line, as the textarea shows it", () => {
  assert.equal(countCharacters("a\n").lines, 2);
  const onlyNewline = countCharacters("\n");
  assert.equal(onlyNewline.lines, 2);
  assert.equal(onlyNewline.characters, 1);
  assert.equal(onlyNewline.charactersNoSpaces, 0);
  assert.equal(onlyNewline.whitespace, 1);
  assert.equal(onlyNewline.words, 0);
});

test("grapheme counting agrees between the ASCII fast path and the segmenter path", () => {
  assert.equal(countGraphemes(""), 0);
  assert.equal(countGraphemes("abc\n\tdef"), 8);
  assert.equal(countGraphemes("abc 😀"), 5);
  const large = "The quick brown fox.\n".repeat(5000);
  assert.equal(countGraphemes(large), large.length);
  assert.equal(countGraphemes(`${large}é`), large.length + 1);
});

test("grapheme counting falls back to code points when Intl.Segmenter is unavailable", async () => {
  const original = Intl.Segmenter;
  Object.defineProperty(Intl, "Segmenter", { value: undefined, configurable: true, writable: true });
  try {
    const fallback = await import("../src/tools/characterCounterLogic.ts?no-segmenter");
    assert.equal(fallback.countGraphemes("👨‍👩‍👧‍👦"), 7);
    assert.equal(fallback.countGraphemes("abc"), 3);
    assert.equal(fallback.countCharacters("Hi 😀").characters, 4);
  } finally {
    Object.defineProperty(Intl, "Segmenter", { value: original, configurable: true, writable: true });
  }
});

test("count summary used for the screen-reader status uses correct singular and plural forms", () => {
  assert.equal(describeCounts({ characters: 0, words: 0 }), "0 characters, 0 words");
  assert.equal(describeCounts({ characters: 1, words: 1 }), "1 character, 1 word");
  assert.equal(describeCounts({ characters: 12, words: 2 }), "12 characters, 2 words");
});
