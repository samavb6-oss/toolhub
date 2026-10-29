import test from "node:test";
import assert from "node:assert/strict";
import {
  DIVIDEND_LIMITS,
  calculateDividend,
  formatDividendInr,
  validateDividendForm,
} from "../src/tools/dividendCalculatorLogic.ts";
import type { DividendFormValues } from "../src/tools/dividendCalculatorLogic.ts";

const validForm = (overrides: Partial<DividendFormValues> = {}): DividendFormValues => ({
  shares: "150",
  dividendPerShare: "12",
  paymentsPerYear: "1",
  sharePrice: "240",
  ...overrides,
});

test("calculates one payment and annual dividend income from shares held", () => {
  const validation = validateDividendForm(validForm());
  assert.equal(validation.ok, true);
  if (!validation.ok) return;
  const result = calculateDividend(validation.input);
  assert.equal(result.dividendPerPayment, 1800);
  assert.equal(result.estimatedAnnualDividend, 1800);
  assert.equal(result.estimatedInvestmentValue, 36000);
  assert.equal(result.estimatedAnnualYieldPercent, 5);
});

test("annualizes dividend income using the entered payment count", () => {
  const result = calculateDividend({ shares: 100, dividendPerShare: 4.5, paymentsPerYear: 4, sharePrice: 150 });
  assert.equal(result.dividendPerPayment, 450);
  assert.equal(result.estimatedAnnualDividend, 1800);
  assert.equal(result.estimatedAnnualYieldPercent, 12);
});

test("supports optional share price and omits investment value and yield", () => {
  const validation = validateDividendForm(validForm({ sharePrice: "" }));
  assert.equal(validation.ok, true);
  if (!validation.ok) return;
  const result = calculateDividend(validation.input);
  assert.equal(result.estimatedAnnualDividend, 1800);
  assert.equal(result.estimatedInvestmentValue, null);
  assert.equal(result.estimatedAnnualYieldPercent, null);
});

test("allows zero dividend and rounds monetary results to paise", () => {
  const result = calculateDividend({ shares: 3, dividendPerShare: 0.105, paymentsPerYear: 2, sharePrice: null });
  assert.equal(result.dividendPerPayment, 0.32);
  assert.equal(result.estimatedAnnualDividend, 0.64);
  assert.equal(calculateDividend({ shares: 5, dividendPerShare: 0, paymentsPerYear: 1, sharePrice: null }).estimatedAnnualDividend, 0);
});

test("rejects empty, fractional, non-positive and over-limit share counts", () => {
  for (const shares of ["", "abc", "1.5", "0", "-1", String(DIVIDEND_LIMITS.maxShares + 1)]) {
    const validation = validateDividendForm(validForm({ shares }));
    assert.equal(validation.ok, false, `expected shares ${shares} to be rejected`);
    if (!validation.ok) assert.ok(validation.errors.shares);
  }
});

test("rejects invalid dividend amounts, payment counts and optional prices", () => {
  for (const dividendPerShare of ["", "abc", "-0.01", String(DIVIDEND_LIMITS.maxDividendPerShare + 1)]) {
    const validation = validateDividendForm(validForm({ dividendPerShare }));
    assert.equal(validation.ok, false, `expected dividend ${dividendPerShare} to be rejected`);
    if (!validation.ok) assert.ok(validation.errors.dividendPerShare);
  }
  for (const paymentsPerYear of ["", "1.5", "0", "13"]) {
    const validation = validateDividendForm(validForm({ paymentsPerYear }));
    assert.equal(validation.ok, false, `expected payment count ${paymentsPerYear} to be rejected`);
    if (!validation.ok) assert.ok(validation.errors.paymentsPerYear);
  }
  for (const sharePrice of ["0", "-1", "abc", String(DIVIDEND_LIMITS.maxSharePrice + 1)]) {
    const validation = validateDividendForm(validForm({ sharePrice }));
    assert.equal(validation.ok, false, `expected price ${sharePrice} to be rejected`);
    if (!validation.ok) assert.ok(validation.errors.sharePrice);
  }
});

test("direct calculation rejects invalid share counts, payments and prices", () => {
  assert.throws(() => calculateDividend({ shares: 0, dividendPerShare: 10, paymentsPerYear: 1, sharePrice: null }), RangeError);
  assert.throws(() => calculateDividend({ shares: 1, dividendPerShare: -1, paymentsPerYear: 1, sharePrice: null }), RangeError);
  assert.throws(() => calculateDividend({ shares: 1, dividendPerShare: 10, paymentsPerYear: 13, sharePrice: null }), RangeError);
  assert.throws(() => calculateDividend({ shares: 1, dividendPerShare: 10, paymentsPerYear: 1, sharePrice: 0 }), RangeError);
});

test("formats Indian rupee values", () => {
  assert.match(formatDividendInr(123456.78), /₹\s?1,23,456\.78/u);
});
