import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAiPrompt,
  calculateEmi,
  calculateSip,
  countText,
  describeIndianAmount,
  generateSecurePassword,
  parseSipNumber,
  passwordGroups,
  roundSipAmounts,
  validateSipInputs,
  SIP_LIMITS,
} from "../src/tools/basicToolLogic.ts";

// Independent cross-check: month-by-month simulation (instalment at start of month, then growth).
function simulateSip(monthly: number, annualRate: number, years: number): number {
  const monthlyRate = annualRate / 1200;
  let balance = 0;
  for (let month = 0; month < years * 12; month += 1) balance = (balance + monthly) * (1 + monthlyRate);
  return balance;
}

test("SIP matches reference values from an independent 80-digit Decimal simulation", () => {
  // [monthly, annual %, years, future value, year-1 value]
  const cases: Array<[number, number, number, number, number]> = [
    [5000, 12, 10, 1161695.38176, 64046.640217],
    [10000, 8, 5, 739667.019535, 125329.255279],
    [25000, 15, 30, 175245515.149741, 325527.898389],
    [500, 6.5, 1, 6215.503034, 6215.503034],
    [100000, 10, 20, 76569690.962322, 1267028.11604],
    [3000, 7, 3, 120489.078893, 37394.626111],
    [1, 0.5, 1, 12.03255, 12.03255],
  ];
  for (const [monthly, rate, years, expected, yearOne] of cases) {
    const result = calculateSip(monthly, rate, years)!;
    assert.ok(Math.abs(result.futureValue - expected) < Math.max(0.01, expected * 1e-9), `${monthly}/${rate}/${years}: ${result.futureValue}`);
    assert.ok(Math.abs(result.yearly[0].value - yearOne) < 0.01);
    assert.equal(result.invested, monthly * years * 12);
    assert.ok(Math.abs(result.returns - (expected - monthly * years * 12)) < Math.max(0.01, expected * 1e-9));
  }
});

test("SIP stays accurate at the largest permitted inputs", () => {
  const result = calculateSip(SIP_LIMITS.maxMonthly, SIP_LIMITS.maxRate, SIP_LIMITS.maxYears)!;
  assert.ok(Math.abs(result.futureValue - 1114558663555090.27) / 1114558663555090.27 < 1e-9);
  assert.ok(Number.isFinite(result.futureValue));
});

test("SIP closed form agrees with a month-by-month simulation", () => {
  for (const [monthly, rate, years] of [[1, 30, 50], [7500, 0.0001, 20], [3333.33, 9.75, 17], [100, 0.5, 1]] as const) {
    const closed = calculateSip(monthly, rate, years)!.futureValue;
    const simulated = simulateSip(monthly, rate, years);
    assert.ok(Math.abs(closed - simulated) <= simulated * 1e-9, `${monthly}/${rate}/${years}: ${closed} vs ${simulated}`);
  }
});

test("SIP with a zero return is simply the amount invested", () => {
  const result = calculateSip(1000, 0, 10)!;
  assert.equal(result.futureValue, 120000);
  assert.equal(result.invested, 120000);
  assert.equal(result.returns, 0);
});

test("SIP year-by-year breakdown is consistent with the totals", () => {
  const result = calculateSip(5000, 12, 10)!;
  assert.equal(result.months, 120);
  assert.equal(result.yearly.length, 10);
  assert.ok(Math.abs(result.yearly[4].value - 412431.832775) < 0.01);
  result.yearly.forEach((row, index) => {
    assert.equal(row.year, index + 1);
    assert.equal(row.invested, 5000 * 12 * (index + 1));
    assert.ok(Math.abs(row.returns - (row.value - row.invested)) < 1e-6);
    if (index > 0) assert.ok(row.value > result.yearly[index - 1].value);
  });
  const last = result.yearly[result.yearly.length - 1];
  assert.equal(last.value, result.futureValue);
  assert.equal(last.invested, result.invested);
});

test("SIP rejects zero, negative, non-finite, out-of-range and fractional inputs", () => {
  const bad: Array<[number, number, number]> = [
    [0, 12, 10], [-500, 12, 10], [0.99, 12, 10], [Number.NaN, 12, 10], [Number.POSITIVE_INFINITY, 12, 10], [10_000_001, 12, 10],
    [5000, -1, 10], [5000, Number.NaN, 10], [5000, 30.01, 10], [5000, Number.POSITIVE_INFINITY, 10],
    [5000, 12, 0], [5000, 12, -3], [5000, 12, 2.5], [5000, 12, 51], [5000, 12, Number.NaN],
  ];
  for (const [monthly, rate, years] of bad) {
    assert.equal(calculateSip(monthly, rate, years), null, `${monthly}/${rate}/${years}`);
  }
  assert.ok(calculateSip(1, 0, 1) !== null);
  assert.ok(calculateSip(10_000_000, 30, 50) !== null);
});

test("SIP validation reports the specific field that is wrong", () => {
  assert.deepEqual(validateSipInputs(5000, 12, 10), {});
  const errors = validateSipInputs(0, 60, 0);
  assert.ok(errors.monthly && errors.rate && errors.years);
  assert.deepEqual(Object.keys(validateSipInputs(5000, 12, 2.5)), ["years"]);
  assert.match(validateSipInputs(Number.NaN, 12, 10).monthly ?? "", /as a number/);
});

test("SIP field parsing accepts plain decimals and rejects malformed text", () => {
  assert.equal(parseSipNumber("5000"), 5000);
  assert.equal(parseSipNumber("  12.5 "), 12.5);
  assert.equal(parseSipNumber(".5"), 0.5);
  assert.equal(parseSipNumber("7."), 7);
  assert.equal(parseSipNumber("-20"), -20);
  for (const text of ["", "   ", "abc", "1e3", "0x10", "Infinity", "NaN", "1,000", "12%", "₹500", "1 000", "--5", "1.2.3", "+5"]) {
    assert.ok(Number.isNaN(parseSipNumber(text)), `should reject ${JSON.stringify(text)}`);
  }
  // a blank field must never be treated as zero and silently produce a result
  assert.equal(calculateSip(parseSipNumber(""), 12, 10), null);
  assert.equal(calculateSip(5000, parseSipNumber("1e3"), 10), null);
});

test("SIP displayed amounts always add up after rounding", () => {
  assert.deepEqual(roundSipAmounts(12000.6, 13000.4), { invested: 12001, value: 13000, returns: 999 });
  const result = calculateSip(1000.5, 7.3, 3)!;
  const display = roundSipAmounts(result.invested, result.futureValue);
  assert.equal(display.invested + display.returns, display.value);
});

test("Indian amount wording rounds sensibly across lakh and crore boundaries", () => {
  assert.equal(describeIndianAmount(99_999), null);
  assert.equal(describeIndianAmount(100_000), "1.00 lakh");
  assert.equal(describeIndianAmount(1161695.38), "11.62 lakh");
  assert.equal(describeIndianAmount(9_999_600), "1.00 crore");
  assert.equal(describeIndianAmount(12_500_000), "1.25 crore");
  assert.equal(describeIndianAmount(175245515.15), "17.52 crore");
  assert.equal(describeIndianAmount(999_999_999_999), "100000.00 crore");
  assert.equal(describeIndianAmount(1_000_000_000_000), null);
  assert.equal(describeIndianAmount(Number.NaN), null);
});

test("EMI handles zero-interest loans", () => {
  assert.equal(calculateEmi(12000, 0, 12), 1000);
});

test("EMI returns a finite positive payment for a normal loan", () => {
  const payment = calculateEmi(500000, 8.5, 240);
  assert.ok(Number.isFinite(payment));
  assert.ok(payment > 0);
  assert.ok(Math.abs(payment - 4339.12) < 0.1);
});

test("EMI rejects invalid loan inputs safely", () => {
  assert.equal(calculateEmi(0, 8, 12), 0);
  assert.equal(calculateEmi(1000, -1, 12), 0);
  assert.equal(calculateEmi(1000, 8, 0), 0);
});

test("word counter handles empty text and multiple paragraphs", () => {
  assert.deepEqual(countText(""), {
    words: 0, characters: 0, charactersNoSpaces: 0, sentences: 0, paragraphs: 0, readingMinutes: 0,
  });
  const counts = countText("Hello, world! I'm Sam.\n\nSecond paragraph.");
  assert.equal(counts.words, 6);
  assert.equal(counts.sentences, 3);
  assert.equal(counts.paragraphs, 2);
  assert.equal(counts.readingMinutes, 1);
});

test("password generator respects length and selected character groups", () => {
  const lower = passwordGroups.find((group) => group.id === "password-lowercase")!;
  const upper = passwordGroups.find((group) => group.id === "password-uppercase")!;
  const password = generateSecurePassword(24, [lower.id, upper.id], false);
  assert.equal(password.length, 24);
  assert.match(password, /[a-z]/);
  assert.match(password, /[A-Z]/);
  assert.match(password, /^[a-zA-Z]+$/);
});

test("password generator rejects empty groups and invalid lengths", () => {
  assert.throws(() => generateSecurePassword(12, [], false), /Choose at least one character type/);
  assert.throws(() => generateSecurePassword(7, ["password-lowercase"], false), /between 8 and 128/);
});

test("AI prompt generator includes required task and optional context", () => {
  const prompt = buildAiPrompt({
    task: "Create a study plan", role: "teacher", audience: "beginners",
    context: "One hour per day", tone: "friendly", format: "table", constraints: "No weekends",
  });
  assert.match(prompt, /Task: Create a study plan/);
  assert.match(prompt, /Audience: beginners/);
  assert.match(prompt, /Context:\nOne hour per day/);
  assert.match(prompt, /Requirements and constraints:\nNo weekends/);
});
