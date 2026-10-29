export interface WritingIssue {
  start: number;
  end: number;
  original: string;
  suggestion: string;
  reason: string;
}

const commonTypos: Record<string, string> = {
  teh: "the",
  recieve: "receive",
  seperate: "separate",
  definately: "definitely",
  occured: "occurred",
  accomodate: "accommodate",
  wich: "which",
  thier: "their",
  untill: "until",
  begining: "beginning",
  enviroment: "environment",
  goverment: "government",
  adress: "address",
  acheive: "achieve",
  freind: "friend",
  becuase: "because",
};

function preserveCase(original: string, replacement: string): string {
  if (original.toUpperCase() === original) return replacement.toUpperCase();
  if (original[0] === original[0]?.toUpperCase()) return replacement[0].toUpperCase() + replacement.slice(1);
  return replacement;
}

export function checkWriting(text: string): WritingIssue[] {
  if (!text.trim()) return [];
  const issues: WritingIssue[] = [];
  const add = (start: number, end: number, original: string, suggestion: string, reason: string) => {
    if (original !== suggestion) issues.push({ start, end, original, suggestion, reason });
  };

  for (const match of text.matchAll(/\b([A-Za-z][A-Za-z'-]*)\s+\1\b/gi)) {
    const original = match[0];
    const word = match[1];
    const start = match.index ?? 0;
    add(start, start + original.length, original, word, "Repeated word — check whether the repetition is intentional.");
  }

  for (const match of text.matchAll(/\b[A-Za-z]+\b/g)) {
    const original = match[0];
    const replacement = commonTypos[original.toLowerCase()];
    if (replacement) {
      const start = match.index ?? 0;
      add(start, start + original.length, original, preserveCase(original, replacement), "Common spelling typo.");
    }
  }

  for (const match of text.matchAll(/ {2,}/g)) {
    const start = match.index ?? 0;
    add(start, start + match[0].length, match[0], " ", "Multiple consecutive spaces.");
  }
  for (const match of text.matchAll(/[ \t]+([,.;!?])/g)) {
    const original = match[0];
    const start = match.index ?? 0;
    add(start, start + original.length, original, match[1], "Remove the space before punctuation.");
  }

  const grammarRules: Array<{ pattern: RegExp; suggestion: (match: RegExpMatchArray) => string; reason: string }> = [
    { pattern: /\b(I)\s+is\b/gi, suggestion: () => "I am", reason: "Subject–verb agreement: use ‘am’ with ‘I’." },
    { pattern: /\b(you|we|they)\s+is\b/gi, suggestion: (m) => `${m[1]} are`, reason: "Subject–verb agreement: this subject usually takes ‘are’." },
    { pattern: /\b(he|she|it)\s+are\b/gi, suggestion: (m) => `${m[1]} is`, reason: "Subject–verb agreement: this subject usually takes ‘is’." },
    { pattern: /\b(we|they)\s+was\b/gi, suggestion: (m) => `${m[1]} were`, reason: "Subject–verb agreement: this subject usually takes ‘were’." },
    { pattern: /\b(he|she|it)\s+have\b/gi, suggestion: (m) => `${m[1]} has`, reason: "Subject–verb agreement: this subject usually takes ‘has’." },
    { pattern: /\b(could|would|should)\s+of\b/gi, suggestion: (m) => `${m[1]} have`, reason: "Common mix-up: use ‘have’ rather than ‘of’ after this modal." },
  ];
  for (const rule of grammarRules) {
    for (const match of text.matchAll(rule.pattern)) {
      const original = match[0];
      const start = match.index ?? 0;
      add(start, start + original.length, original, rule.suggestion(match), rule.reason);
    }
  }

  // Sentence-start capitalization is intentionally conservative: it only checks
  // lowercase letters after terminal punctuation and whitespace.
  for (const match of text.matchAll(/([.!?]\s+)([a-z])/g)) {
    const letterIndex = (match.index ?? 0) + match[1].length;
    add(letterIndex, letterIndex + 1, match[2], match[2].toUpperCase(), "Consider capitalizing the first letter of this sentence.");
  }

  const priority = (issue: WritingIssue) => issue.reason.startsWith("Common spelling") ? 0 : issue.reason.startsWith("Repeated") ? 1 : issue.reason.startsWith("Subject") || issue.reason.startsWith("Common mix-up") ? 2 : 3;
  issues.sort((a, b) => a.start - b.start || priority(a) - priority(b) || (b.end - b.start) - (a.end - a.start));
  const nonOverlapping: WritingIssue[] = [];
  for (const issue of issues) {
    const previous = nonOverlapping[nonOverlapping.length - 1];
    if (previous && issue.start < previous.end) continue;
    nonOverlapping.push(issue);
  }
  return nonOverlapping;
}

function applyIssuesOnce(text: string, issues: WritingIssue[]): string {
  let output = text;
  for (const issue of [...issues].sort((a, b) => b.start - a.start)) {
    output = output.slice(0, issue.start) + issue.suggestion + output.slice(issue.end);
  }
  return output;
}

export function applyWritingSuggestions(text: string, issues: WritingIssue[]): string {
  let output = applyIssuesOnce(text, issues);
  // A spelling fix can expose another simple issue (for example, “Teh the”
  // becomes “The the”). Re-check a couple of times so previews are coherent.
  for (let pass = 0; pass < 2; pass += 1) {
    const followUp = checkWriting(output);
    if (!followUp.length) break;
    const next = applyIssuesOnce(output, followUp);
    if (next === output) break;
    output = next;
  }
  return output;
}

const stopWords = new Set((
  "a an and are as at be been being but by can could did do does for from had has have he her hers him his how i if in into is it its may me might more most my no not of on or our ours she should so than that the their theirs them then there these they this those to too up us was we were what when where which who will with would you your yours"
).split(/\s+/));

export interface SummaryResult {
  summary: string;
  sourceSentences: number;
  summarySentences: number;
  sourceWords: number;
  summaryWords: number;
}

export function summarizeText(text: string, requestedSentences = 3): SummaryResult {
  const bounded = text.slice(0, 40_000);
  const sentences = bounded
    .replace(/\r\n?/g, "\n")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const words = (value: string) => value.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g) ?? [];
  const sourceWords = words(bounded).length;
  if (sentences.length === 0) return { summary: "", sourceSentences: 0, summarySentences: 0, sourceWords, summaryWords: 0 };

  const frequencies = new Map<string, number>();
  for (const word of words(bounded)) {
    const normalized = word.toLowerCase();
    if (normalized.length < 3 || stopWords.has(normalized) || /^\d+$/.test(normalized)) continue;
    frequencies.set(normalized, (frequencies.get(normalized) ?? 0) + 1);
  }

  const scored = sentences.map((sentence, index) => {
    const terms = words(sentence).map((word) => word.toLowerCase()).filter((word) => word.length >= 3 && !stopWords.has(word) && !/^\d+$/.test(word));
    const frequencyScore = terms.reduce((total, term) => total + Math.log1p(frequencies.get(term) ?? 0), 0) / Math.max(1, Math.sqrt(terms.length));
    const positionBonus = index === 0 ? 0.25 : index === 1 ? 0.1 : 0;
    const lengthPenalty = terms.length < 4 ? 0.35 : 0;
    return { sentence, index, score: frequencyScore + positionBonus - lengthPenalty };
  });

  const count = Math.max(1, Math.min(10, Math.floor(Number.isFinite(requestedSentences) ? requestedSentences : 3)));
  const selected = [...scored].sort((a, b) => b.score - a.score || a.index - b.index).slice(0, Math.min(count, sentences.length)).sort((a, b) => a.index - b.index);
  const summary = selected.map((item) => item.sentence).join(" ");
  return { summary, sourceSentences: sentences.length, summarySentences: selected.length, sourceWords, summaryWords: words(summary).length };
}
