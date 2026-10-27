import { countText } from "./basicToolLogic.ts";

export const READING_SPEEDS = [150, 200, 250, 300] as const;
export type ReadingSpeed = (typeof READING_SPEEDS)[number];

export type ReadingEstimate = {
  words: number;
  minutes: number;
  wordsPerMinute: ReadingSpeed;
};

export function estimateReadingTime(text: string, wordsPerMinute: number = 200): ReadingEstimate {
  if (!Number.isInteger(wordsPerMinute) || !READING_SPEEDS.includes(wordsPerMinute as ReadingSpeed)) {
    throw new RangeError(`Reading speed must be one of: ${READING_SPEEDS.join(", ")}.`);
  }
  const words = countText(text).words;
  return {
    words,
    minutes: words === 0 ? 0 : Math.max(1, Math.ceil(words / wordsPerMinute)),
    wordsPerMinute: wordsPerMinute as ReadingSpeed,
  };
}

const LOREM_WORDS = (
  "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua " +
  "ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure " +
  "in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt " +
  "culpa qui officia deserunt mollit anim id est laborum curabitur pretium tincidunt lacus nulla gravida orci a odio " +
  "nullam varius turpis et commodo pharetra est eros bibendum elit nec luctus magna felis sollicitudin mauris quis " +
  "urna integer rutrum ante eu lacus vestibulum libero nisl porta vel scelerisque eget malesuada at neque vivamus " +
  "eget nibh etiam cursus leo vel metus nulla facilisi aenean nec eros vestibulum ante ipsum primis in faucibus orci " +
  "luctus et ultrices posuere cubilia curae suspendisse sollicitudin velit sed leo ut pharetra augue nec augue nam elit " +
  "magna hendrerit sit amet tincidunt ac viverra sed nulla donec porta diam eu massa quisque diam lorem interdum vitae"
).split(/\s+/u);

export const LOREM_LIMITS = {
  minParagraphs: 1,
  maxParagraphs: 10,
  minWordsPerParagraph: 20,
  maxWordsPerParagraph: 200,
} as const;

export function generateLoremIpsum(paragraphCount: number = 3, wordsPerParagraph: number = 60): string {
  if (!Number.isInteger(paragraphCount) || paragraphCount < LOREM_LIMITS.minParagraphs || paragraphCount > LOREM_LIMITS.maxParagraphs) {
    throw new RangeError(`Paragraph count must be between ${LOREM_LIMITS.minParagraphs} and ${LOREM_LIMITS.maxParagraphs}.`);
  }
  if (!Number.isInteger(wordsPerParagraph) || wordsPerParagraph < LOREM_LIMITS.minWordsPerParagraph || wordsPerParagraph > LOREM_LIMITS.maxWordsPerParagraph) {
    throw new RangeError(`Words per paragraph must be between ${LOREM_LIMITS.minWordsPerParagraph} and ${LOREM_LIMITS.maxWordsPerParagraph}.`);
  }

  const paragraphs = Array.from({ length: paragraphCount }, (_, paragraphIndex) => {
    const words = Array.from({ length: wordsPerParagraph }, (_, wordIndex) => {
      const index = (paragraphIndex * 17 + wordIndex) % LOREM_WORDS.length;
      return LOREM_WORDS[index];
    });
    if (paragraphIndex === 0 && wordsPerParagraph >= 5) {
      words.splice(0, 5, "Lorem", "ipsum", "dolor", "sit", "amet");
    }
    words[0] = words[0][0].toLocaleUpperCase("en-US") + words[0].slice(1);
    words[words.length - 1] = words[words.length - 1].replace(/[,.!?;:]$/u, "") + ".";
    return words.join(" ");
  });
  return paragraphs.join("\n\n");
}

[executed on device: n8n-nuc11 (0edb2ec4-460f-4079-a4de-ad338db1e4b4)]