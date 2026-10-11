export type CharacterCounts = {
  characters: number;
  charactersNoSpaces: number;
  words: number;
  letters: number;
  numbers: number;
  whitespace: number;
  lines: number;
};

// A word starts with a letter or digit and may continue with letters, digits and
// combining marks (\p{M}), so scripts such as Devanagari and decomposed accents
// ("nai" + U+0308 + "ve") are not split into several words. Apostrophes, hyphens
// and underscores only join word parts when another word character follows.
const wordPattern = /[\p{L}\p{N}][\p{L}\p{M}\p{N}]*(?:['’_-][\p{L}\p{M}\p{N}]+)*/gu;

// Printable ASCII plus tab and LF can never form a multi-code-point grapheme,
// so the (much slower) segmenter is skipped for them.
const simpleTextPattern = /^[\t\n\x20-\x7E]*$/u;

let graphemeSegmenter: Intl.Segmenter | null | undefined;

function getGraphemeSegmenter(): Intl.Segmenter | null {
  if (graphemeSegmenter === undefined) {
    graphemeSegmenter = typeof Intl !== "undefined" && typeof Intl.Segmenter === "function"
      ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
      : null;
  }
  return graphemeSegmenter;
}

/**
 * Counts user-perceived characters (extended grapheme clusters), so an emoji
 * family, a flag, a skin-tone emoji or a letter with a combining accent counts
 * as one character. Falls back to counting code points where Intl.Segmenter
 * is unavailable.
 */
export function countGraphemes(text: string): number {
  if (!text) return 0;
  if (simpleTextPattern.test(text)) return text.length;
  const segmenter = getGraphemeSegmenter();
  if (!segmenter) return Array.from(text).length;
  let count = 0;
  for (const _segment of segmenter.segment(text)) count += 1;
  return count;
}

export function countCharacters(rawText: string): CharacterCounts {
  // Browsers already normalise textarea values to LF; do the same here so CRLF
  // and lone CR are one line break everywhere.
  const text = rawText.replace(/\r\n?/gu, "\n");
  return {
    characters: countGraphemes(text),
    charactersNoSpaces: countGraphemes(text.replace(/\s/gu, "")),
    words: text.match(wordPattern)?.length ?? 0,
    letters: text.match(/\p{L}/gu)?.length ?? 0,
    numbers: text.match(/\p{N}/gu)?.length ?? 0,
    whitespace: text.match(/\s/gu)?.length ?? 0,
    lines: text.length ? text.split("\n").length : 0,
  };
}

export function describeCounts(counts: Pick<CharacterCounts, "characters" | "words">): string {
  const characters = `${counts.characters} ${counts.characters === 1 ? "character" : "characters"}`;
  const words = `${counts.words} ${counts.words === 1 ? "word" : "words"}`;
  return `${characters}, ${words}`;
}
