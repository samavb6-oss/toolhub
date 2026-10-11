import test from "node:test";
import assert from "node:assert/strict";
import { convertCase } from "../src/tools/caseConversion.ts";
import type { CaseMode } from "../src/tools/caseConversion.ts";

const allModes: CaseMode[] = ["uppercase", "lowercase", "title", "sentence", "capitalize"];

test("every mode returns an empty string for empty input", () => {
  for (const mode of allModes) assert.equal(convertCase("", mode), "", mode);
});

test("whitespace-only input is returned unchanged in every mode", () => {
  for (const mode of allModes) assert.equal(convertCase("  \t\n ", mode), "  \t\n ", mode);
});

test("uppercase and lowercase convert every letter and leave other characters alone", () => {
  assert.equal(convertCase("Hello, World! 123", "uppercase"), "HELLO, WORLD! 123");
  assert.equal(convertCase("Hello, World! 123", "lowercase"), "hello, world! 123");
});

test("uppercase and lowercase handle accented letters", () => {
  assert.equal(convertCase("école élan über", "uppercase"), "ÉCOLE ÉLAN ÜBER");
  assert.equal(convertCase("ÉCOLE ÉLAN ÜBER", "lowercase"), "école élan über");
  assert.equal(convertCase("straße", "uppercase"), "STRASSE");
});

// Regression: the previous regexes contained doubled backslashes, so they matched a literal
// backslash and the letters p, L and N instead of whitespace and letters.
test("title case capitalizes the first letter of every word and lowercases the rest", () => {
  assert.equal(convertCase("the quick brown fox", "title"), "The Quick Brown Fox");
  assert.equal(convertCase("hELLO wORLD", "title"), "Hello World");
  assert.equal(convertCase("THE QUICK BROWN FOX", "title"), "The Quick Brown Fox");
});

test("title case does not capitalize the letters p, l or n by accident", () => {
  assert.equal(convertCase("apple plum nine lane", "title"), "Apple Plum Nine Lane");
  assert.equal(convertCase("jumps happy", "title"), "Jumps Happy");
});

test("title case capitalizes after hyphens and dashes", () => {
  assert.equal(convertCase("state-of-the-art", "title"), "State-Of-The-Art");
  assert.equal(convertCase("pre–war and post—war", "title"), "Pre–War And Post—War");
});

test("title case keeps apostrophes inside words", () => {
  assert.equal(convertCase("don't stop, it's fine", "title"), "Don't Stop, It's Fine");
  assert.equal(convertCase("don’t stop", "title"), "Don’t Stop");
  assert.equal(convertCase("i'm here", "title"), "I'm Here");
});

test("title case capitalizes after opening quotes and brackets", () => {
  assert.equal(convertCase('"hello" (world) [again]', "title"), '"Hello" (World) [Again]');
  assert.equal(convertCase("“hello” ‘world’", "title"), "“Hello” ‘World’");
});

test("title case does not capitalize letters that follow digits", () => {
  assert.equal(convertCase("3rd place and 1st prize", "title"), "3rd Place And 1st Prize");
});

test("title case preserves tabs, line breaks and repeated spaces", () => {
  assert.equal(convertCase("a\tb\n\nc  d", "title"), "A\tB\n\nC  D");
  assert.equal(convertCase("one\r\ntwo", "title"), "One\r\nTwo");
});

test("title case handles accented and non-Latin text", () => {
  assert.equal(convertCase("élan vital über alles", "title"), "Élan Vital Über Alles");
  assert.equal(convertCase("ÉCOLE normale supérieure", "title"), "École Normale Supérieure");
  assert.equal(convertCase("привет мир", "title"), "Привет Мир");
  assert.equal(convertCase("你好 world", "title"), "你好 World");
});

test("title case treats underscores as part of a word", () => {
  assert.equal(convertCase("snake_case word", "title"), "Snake_case Word");
});

test("title case is idempotent", () => {
  const once = convertCase("the QUICK brown-fox's tale", "title");
  assert.equal(convertCase(once, "title"), once);
});

test("capitalize words uppercases word starts and leaves the rest of each word untouched", () => {
  assert.equal(convertCase("hello world", "capitalize"), "Hello World");
  assert.equal(convertCase("hello wORLD iPhone", "capitalize"), "Hello WORLD IPhone");
  assert.equal(convertCase("ALREADY UPPER", "capitalize"), "ALREADY UPPER");
});

test("capitalize words handles hyphens, apostrophes, whitespace and accents", () => {
  assert.equal(convertCase("well-known don't stop", "capitalize"), "Well-Known Don't Stop");
  assert.equal(convertCase("a\tb\n\nc  d", "capitalize"), "A\tB\n\nC  D");
  assert.equal(convertCase("élan über", "capitalize"), "Élan Über");
  assert.equal(convertCase("3rd place", "capitalize"), "3rd Place");
});

test("sentence case capitalizes the first letter of each sentence and lowercases the rest", () => {
  assert.equal(
    convertCase("hello world. this is a test! really? yes.", "sentence"),
    "Hello world. This is a test! Really? Yes.",
  );
  assert.equal(convertCase("HELLO THERE. HOW ARE YOU?", "sentence"), "Hello there. How are you?");
});

test("sentence case does not treat decimal points as sentence ends", () => {
  assert.equal(
    convertCase("pi is 3.14 and e is 2.71. next fact", "sentence"),
    "Pi is 3.14 and e is 2.71. Next fact",
  );
});

test("sentence case capitalizes after line breaks and numbered list markers", () => {
  assert.equal(convertCase("first line\nsecond line\n\nthird", "sentence"), "First line\nSecond line\n\nThird");
  assert.equal(convertCase("first\r\nsecond", "sentence"), "First\r\nSecond");
  assert.equal(convertCase("1. apples\n2. pears", "sentence"), "1. Apples\n2. Pears");
});

test("sentence case handles quotes, brackets and repeated punctuation", () => {
  assert.equal(convertCase('"hello." she said', "sentence"), '"Hello." She said');
  assert.equal(convertCase("(first). second", "sentence"), "(First). Second");
  assert.equal(convertCase("wait... what?! really", "sentence"), "Wait... What?! Really");
});

test("sentence case handles accented and CJK text", () => {
  assert.equal(convertCase("école normale. élan vital", "sentence"), "École normale. Élan vital");
  assert.equal(convertCase("你好。hello world", "sentence"), "你好。Hello world");
});

test("sentence case preserves repeated spaces and tabs between sentences", () => {
  assert.equal(convertCase("one.  two.\tthree", "sentence"), "One.  Two.\tThree");
});

// Documented limitations: these pin current behavior so a future change is a conscious one.
test("documented limitation: Title Case has no small-word exceptions", () => {
  assert.equal(convertCase("the lord of the rings", "title"), "The Lord Of The Rings");
});

test("documented limitation: lowercasing removes interior capitals and a leading apostrophe blocks capitalization", () => {
  assert.equal(convertCase("o'brien", "title"), "O'brien");
  assert.equal(convertCase("'tis the season", "title"), "'tis The Season");
  assert.equal(convertCase("i went to paris. nasa agrees", "sentence"), "I went to paris. Nasa agrees");
  assert.equal(convertCase("yesterday i left", "sentence"), "Yesterday i left");
});

test("documented limitation: sentence case treats abbreviations and wrapped lines as sentence starts", () => {
  assert.equal(convertCase("see e.g. this one", "sentence"), "See e.g. This one");
  assert.equal(convertCase("a wrapped\nline", "sentence"), "A wrapped\nLine");
});
