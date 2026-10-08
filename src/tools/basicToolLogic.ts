export function calculateEmi(principal: number, annualRate: number, months: number): number {
  if (!Number.isFinite(principal) || principal <= 0 || !Number.isFinite(annualRate) || annualRate < 0 || !Number.isInteger(months) || months < 1) {
    return 0;
  }
  const monthlyRate = annualRate / 1200;
  if (monthlyRate === 0) return principal / months;
  const growth = (1 + monthlyRate) ** months;
  return principal * monthlyRate * growth / (growth - 1);
}

export type TextCounts = {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  sentences: number;
  paragraphs: number;
  readingMinutes: number;
};

export function countText(text: string): TextCounts {
  const words = text.match(/[\p{L}\p{N}][\p{L}\p{N}'’_-]*/gu)?.length ?? 0;
  const sentences = text.trim() ? (text.match(/[^.!?]+[.!?]+|[^.!?]+$/gu)?.filter((part) => part.trim()).length ?? 0) : 0;
  const paragraphs = text.split(/\n\s*\n/u).filter((part) => part.trim()).length;
  return {
    words,
    characters: Array.from(text).length,
    charactersNoSpaces: Array.from(text.replace(/\s/gu, "")).length,
    sentences,
    paragraphs,
    readingMinutes: words === 0 ? 0 : Math.max(1, Math.ceil(words / 200)),
  };
}

export const passwordGroups = [
  { label: "Lowercase letters", chars: "abcdefghijklmnopqrstuvwxyz", id: "password-lowercase" },
  { label: "Uppercase letters", chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ", id: "password-uppercase" },
  { label: "Numbers", chars: "0123456789", id: "password-numbers" },
  { label: "Symbols", chars: "!@#$%^&*()-_=+[]{};:,.?", id: "password-symbols" },
];

const ambiguousCharacters = new Set("0O1Il|`'\"");

function secureRandomInt(max: number): number {
  if (!Number.isInteger(max) || max < 1) throw new Error("A character set is required.");
  const range = 0x100000000;
  const limit = Math.floor(range / max) * max;
  const buffer = new Uint32Array(1);
  do {
    crypto.getRandomValues(buffer);
  } while (buffer[0] >= limit);
  return buffer[0] % max;
}

export function generateSecurePassword(length: number, selectedGroups: string[], excludeAmbiguous: boolean): string {
  if (!Number.isInteger(length) || length < 8 || length > 128) throw new Error("Password length must be between 8 and 128 characters.");
  const selected = passwordGroups.filter((group) => selectedGroups.includes(group.id));
  if (!selected.length) throw new Error("Choose at least one character type.");
  const allowed = (value: string) => excludeAmbiguous ? [...value].filter((character) => !ambiguousCharacters.has(character)).join("") : value;
  const groups = selected.map((group) => allowed(group.chars)).filter(Boolean);
  if (!groups.length) throw new Error("The selected character types have no available characters.");
  const allCharacters = groups.join("");
  const passwordCharacters = groups.map((group) => group[secureRandomInt(group.length)]);
  while (passwordCharacters.length < length) passwordCharacters.push(allCharacters[secureRandomInt(allCharacters.length)]);
  for (let index = passwordCharacters.length - 1; index > 0; index -= 1) {
    const swapIndex = secureRandomInt(index + 1);
    [passwordCharacters[index], passwordCharacters[swapIndex]] = [passwordCharacters[swapIndex], passwordCharacters[index]];
  }
  return passwordCharacters.join("");
}

export type PromptFields = {
  task: string;
  role: string;
  audience: string;
  context: string;
  tone: string;
  format: string;
  constraints: string;
};

export function buildAiPrompt(fields: PromptFields): string {
  const sections = [
    `Act as ${fields.role.trim() || "a knowledgeable, careful assistant"}.`,
    `Task: ${fields.task.trim()}`,
    fields.audience.trim() ? `Audience: ${fields.audience.trim()}` : "",
    fields.context.trim() ? `Context:\n${fields.context.trim()}` : "",
    `Tone: ${fields.tone.trim() || "clear and helpful"}`,
    `Output format: ${fields.format.trim() || "use the clearest structure for the task"}`,
    fields.constraints.trim() ? `Requirements and constraints:\n${fields.constraints.trim()}` : "",
    "Prioritize accuracy, be specific, and state any important assumptions. If a critical detail is missing, ask a concise clarifying question rather than inventing facts.",
  ];
  return sections.filter(Boolean).join("\n\n");
}