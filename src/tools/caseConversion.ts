export type CaseMode = "uppercase" | "lowercase" | "title" | "sentence" | "capitalize";

// A letter starts a word when it is at the start of the text or follows something that is not
// part of a word. Letters, digits, combining marks, underscores and apostrophes all count as
// "inside a word", so "don't" and "3rd" are not split, while spaces, hyphens, dashes, slashes,
// quotes and brackets are boundaries. The preceding character is captured (instead of using a
// lookbehind) so the pattern also parses in browsers without regex lookbehind support.
const wordStart = /(^|[^\p{L}\p{N}\p{M}_'’])(\p{L})/gu;

// A letter starts a sentence when it is at the start of the text, after a line break, or after
// sentence-ending punctuation. Latin terminators (. ! ? …) need following whitespace so decimals
// such as "3.14" are left alone; CJK terminators (。！？) do not. Closing quotes/brackets may follow
// the terminator and opening quotes/brackets may precede the letter.
const sentenceStart = /((?:^|[.!?…]+[)"'”’\]]*\s+|[。！？][)"'”’\]]*\s*|[\r\n]\s*)[("'“‘[]*)(\p{L})/gu;

function capitalizeWordStarts(text: string): string {
  return text.replace(wordStart, (_match, boundary: string, letter: string) => boundary + letter.toLocaleUpperCase());
}

/**
 * Converts text to the requested capitalization style.
 *
 * - uppercase / lowercase: locale-aware case mapping of every letter.
 * - title: lowercases everything, then capitalizes the first letter of every word.
 * - capitalize: capitalizes the first letter of every word and leaves the rest untouched.
 * - sentence: lowercases everything, then capitalizes the first letter of the text, of each line,
 *   and of each sentence.
 *
 * Known limitations (all deliberate; the tool has no language or dictionary knowledge):
 * - Title Case capitalizes every word, including short words such as "a", "of" and "the".
 * - Hyphenated words are capitalized per part ("State-Of-The-Art").
 * - Lowercasing removes interior capitals, so "O'Brien" becomes "O'brien" in Title Case, and
 *   proper nouns, acronyms and the pronoun "I" are lowercased in Sentence case.
 * - A word starting with an apostrophe ("'tis") is not capitalized, because an apostrophe is
 *   treated as part of the word.
 * - Sentence case treats every period followed by whitespace as a sentence end, so abbreviations
 *   such as "e.g. this" become "e.g. This", and every line break starts a new sentence, so
 *   hard-wrapped paragraphs get a capital on each wrapped line.
 */
export function convertCase(text: string, mode: CaseMode): string {
  switch (mode) {
    case "uppercase": return text.toLocaleUpperCase();
    case "lowercase": return text.toLocaleLowerCase();
    case "title": return capitalizeWordStarts(text.toLocaleLowerCase());
    case "capitalize": return capitalizeWordStarts(text);
    case "sentence":
      return text.toLocaleLowerCase().replace(sentenceStart, (_match, boundary: string, letter: string) => boundary + letter.toLocaleUpperCase());
  }
}
