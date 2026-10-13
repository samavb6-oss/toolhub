export function calculateEmi(principal: number, annualRate: number, months: number): number {
  if (!Number.isFinite(principal) || principal <= 0 || !Number.isFinite(annualRate) || annualRate < 0 || !Number.isInteger(months) || months < 1) {
    return 0;
  }
  const monthlyRate = annualRate / 1200;
  if (monthlyRate === 0) return principal / months;
  const growth = (1 + monthlyRate) ** months;
  return principal * monthlyRate * growth / (growth - 1);
}

export const SIP_LIMITS = {
  minMonthly: 1,
  maxMonthly: 10_000_000,
  minRate: 0,
  maxRate: 30,
  minYears: 1,
  maxYears: 50,
} as const;

export type SipInputErrors = { monthly?: string; rate?: string; years?: string };

export type SipYearRow = { year: number; invested: number; returns: number; value: number };

export type SipResult = {
  months: number;
  invested: number;
  futureValue: number;
  returns: number;
  yearly: SipYearRow[];
};

// Strict numeric parsing for form fields. Number() would silently accept "1e3", "0x10",
// "Infinity" and "" (as 0); this accepts only plain decimals with an optional leading minus
// and returns NaN for everything else, including blank input.
export function parseSipNumber(text: string): number {
  const trimmed = text.trim();
  return /^-?(\d+\.?\d*|\.\d+)$/.test(trimmed) ? Number(trimmed) : Number.NaN;
}

export function validateSipInputs(monthlyInvestment: number, annualRate: number, years: number): SipInputErrors {
  const errors: SipInputErrors = {};
  if (Number.isNaN(monthlyInvestment)) errors.monthly = "Enter the monthly investment as a number.";
  else if (!Number.isFinite(monthlyInvestment) || monthlyInvestment < SIP_LIMITS.minMonthly || monthlyInvestment > SIP_LIMITS.maxMonthly) {
    errors.monthly = "Enter a monthly investment from ₹1 to ₹1,00,00,000.";
  }
  if (Number.isNaN(annualRate)) errors.rate = "Enter the expected annual return as a number.";
  else if (!Number.isFinite(annualRate) || annualRate < SIP_LIMITS.minRate || annualRate > SIP_LIMITS.maxRate) {
    errors.rate = "Enter an expected annual return from 0% to 30%.";
  }
  if (Number.isNaN(years)) errors.years = "Enter the duration as a whole number of years.";
  else if (!Number.isInteger(years) || years < SIP_LIMITS.minYears || years > SIP_LIMITS.maxYears) {
    errors.years = "Enter a whole number of years from 1 to 50.";
  }
  return errors;
}

// Future value of `months` instalments, each invested at the START of its month, with the
// annual rate split into equal monthly rates (annual / 12) and compounded monthly:
//   FV = P * ((1 + i)^n - 1) / i * (1 + i)
// expm1/log1p keep the result accurate for very small rates; i = 0 is handled separately.
function sipFutureValue(monthlyInvestment: number, monthlyRate: number, months: number): number {
  if (monthlyRate === 0) return monthlyInvestment * months;
  const growthMinusOne = Math.expm1(months * Math.log1p(monthlyRate));
  return monthlyInvestment * (growthMinusOne / monthlyRate) * (1 + monthlyRate);
}

// Returns null when any input is invalid, so callers cannot display a figure for bad input.
export function calculateSip(monthlyInvestment: number, annualRate: number, years: number): SipResult | null {
  if (Object.keys(validateSipInputs(monthlyInvestment, annualRate, years)).length > 0) return null;
  const monthlyRate = annualRate / 1200;
  const yearly: SipYearRow[] = [];
  for (let year = 1; year <= years; year += 1) {
    const months = year * 12;
    const invested = monthlyInvestment * months;
    const value = sipFutureValue(monthlyInvestment, monthlyRate, months);
    yearly.push({ year, invested, value, returns: value - invested });
  }
  const last = yearly[yearly.length - 1];
  return { months: years * 12, invested: last.invested, futureValue: last.value, returns: last.returns, yearly };
}

// Round to whole rupees for display, deriving returns from the rounded figures so the
// three numbers shown always add up exactly.
export function roundSipAmounts(invested: number, value: number): { invested: number; value: number; returns: number } {
  const roundedInvested = Math.round(invested);
  const roundedValue = Math.round(value);
  return { invested: roundedInvested, value: roundedValue, returns: roundedValue - roundedInvested };
}

// Short Indian-style reading of a large amount ("11.62 lakh", "1.25 crore"). Returns null below
// one lakh and from one lakh crore upward, where the full figure is clearer than a unit.
export function describeIndianAmount(value: number): string | null {
  if (!Number.isFinite(value) || value < 100_000 || value >= 1_000_000_000_000) return null;
  const lakh = Math.round((value / 100_000) * 100) / 100;
  if (lakh < 100) return `${lakh.toFixed(2)} lakh`;
  return `${(Math.round((value / 10_000_000) * 100) / 100).toFixed(2)} crore`;
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