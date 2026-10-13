import test from "node:test";
import assert from "node:assert/strict";
import {
  LOAN_LIMITS,
  calculateLoan,
  formatInr,
  formatTerm,
  validateLoanForm,
} from "../src/tools/loanCalculatorLogic.ts";
import type { LoanFormValues, LoanResult } from "../src/tools/loanCalculatorLogic.ts";

// Expected figures below were produced by an independent Decimal-based reference
// implementation (ROUND_HALF_UP, EMI from a high-precision (1 + r)^-n), not by this module.

const loan = (principal: number, annualRate: number, termMonths: number, extraPayment = 0) =>
  calculateLoan({ principal, annualRate, termMonths, extraPayment });

const paise = (rupees: number) => Math.round(rupees * 100);

function assertConsistent(result: LoanResult, principal: number) {
  const principalPaid = result.yearly.reduce((sum, year) => sum + paise(year.principalPaid), 0);
  const interestPaid = result.yearly.reduce((sum, year) => sum + paise(year.interestPaid), 0);
  assert.equal(principalPaid, paise(principal), "principal paid across all years equals the loan amount");
  assert.equal(principalPaid + interestPaid, paise(result.totalPayment), "principal + interest equals total repayment");
  assert.equal(paise(result.totalInterest), interestPaid);
  assert.equal(result.yearly.at(-1)!.closingBalance, 0, "the loan closes at exactly zero");
  assert.equal(result.yearly.reduce((sum, year) => sum + year.payments, 0), result.numberOfPayments);
  assert.ok(Math.abs(result.interestPercent + result.principalPercent - 100) < 1e-9);
}

const validForm: LoanFormValues = { principal: "500000", annualRate: "8.5", years: "20", months: "0", extraPayment: "" };
const withForm = (overrides: Partial<LoanFormValues>): LoanFormValues => ({ ...validForm, ...overrides });

// --- Normal loans ----------------------------------------------------------

test("normal loan: 5,00,000 at 8.5% for 20 years", () => {
  const result = loan(500000, 8.5, 240);
  assert.equal(result.monthlyPayment, 4339.12);
  assert.equal(result.numberOfPayments, 240);
  assert.equal(result.totalPayment, 1041386.34);
  assert.equal(result.totalInterest, 541386.34);
  assert.equal(result.finalPayment, 4336.66);
  assert.equal(result.totalPrincipal, 500000);
  assert.equal(result.yearly.length, 20);
  assertConsistent(result, 500000);
});

test("normal loan: 10,00,000 at 7% for 30 years", () => {
  const result = loan(1000000, 7, 360);
  assert.equal(result.monthlyPayment, 6653.02);
  assert.equal(result.totalPayment, 2395093.14);
  assert.equal(result.totalInterest, 1395093.14);
  assertConsistent(result, 1000000);
});

test("normal loan: 1,00,000 at 12% for 12 months", () => {
  const result = loan(100000, 12, 12);
  assert.equal(result.monthlyPayment, 8884.88);
  assert.equal(result.totalInterest, 6618.53);
  assert.equal(result.totalPayment, 106618.53);
  assert.equal(result.finalPayment, 8884.85);
  assert.equal(result.yearly.length, 1);
  assertConsistent(result, 100000);
});

test("interest share is the fraction of total repayment that is interest", () => {
  const result = loan(500000, 8.5, 240);
  assert.ok(Math.abs(result.interestPercent - (541386.34 / 1041386.34) * 100) < 1e-9);
});

test("a low rate over a long term keeps rounding drift to a few rupees", () => {
  const result = loan(300000, 0.01, 600);
  assert.equal(result.monthlyPayment, 501.25);
  assert.equal(result.totalInterest, 751.85);
  assert.equal(result.finalPayment, 503.1);
  assertConsistent(result, 300000);
});

// --- Zero interest ---------------------------------------------------------

test("zero-interest loan divides the principal evenly", () => {
  const result = loan(120000, 0, 12);
  assert.equal(result.monthlyPayment, 10000);
  assert.equal(result.totalInterest, 0);
  assert.equal(result.totalPayment, 120000);
  assert.equal(result.interestPercent, 0);
  assert.equal(result.principalPercent, 100);
  assertConsistent(result, 120000);
});

test("zero-interest loan that does not divide evenly settles the odd paisa in the final payment", () => {
  const result = loan(100000, 0, 3);
  assert.equal(result.monthlyPayment, 33333.33);
  assert.equal(result.finalPayment, 33333.34);
  assert.equal(result.totalInterest, 0);
  assert.equal(result.totalPayment, 100000);
  assertConsistent(result, 100000);
});

// --- Short tenure ----------------------------------------------------------

test("a one-month loan is a single payment of principal plus one month's interest", () => {
  const result = loan(50000, 10, 1);
  assert.equal(result.numberOfPayments, 1);
  assert.equal(result.monthlyPayment, 50416.67);
  assert.equal(result.totalInterest, 416.67);
  assert.equal(result.totalPayment, 50416.67);
  assertConsistent(result, 50000);
});

test("a two-month loan reconciles to the paisa", () => {
  const result = loan(50000, 10, 2);
  assert.equal(result.monthlyPayment, 25312.93);
  assert.equal(result.finalPayment, 25312.94);
  assert.equal(result.totalInterest, 625.87);
  assertConsistent(result, 50000);
});

test("the smallest possible loan (one paisa) is paid in a single payment", () => {
  const result = loan(0.01, 12, 6);
  assert.equal(result.numberOfPayments, 1);
  assert.equal(result.totalPayment, 0.01);
  assert.equal(result.totalInterest, 0);
  assertConsistent(result, 0.01);
});

// --- Decimals and rounding -------------------------------------------------

test("decimal principal and rate: 2,50,000.55 at 9.25% for 5 years 6 months", () => {
  const result = loan(250000.55, 9.25, 66);
  assert.equal(result.monthlyPayment, 4847.05);
  assert.equal(result.totalInterest, 69904.95);
  assert.equal(result.totalPayment, 319905.5);
  assert.equal(result.finalPayment, 4847.25);
  assertConsistent(result, 250000.55);
});

test("principal with more than two decimals is rounded to the nearest paisa", () => {
  assert.equal(loan(1000.004, 0, 1).totalPrincipal, 1000);
  assert.equal(loan(1000.006, 0, 1).totalPrincipal, 1000.01);
});

// --- Extra payments --------------------------------------------------------

test("extra monthly payment shortens the loan and reports the saving", () => {
  const result = loan(500000, 8.5, 240, 5000);
  assert.equal(result.monthlyPayment, 4339.12);
  assert.equal(result.monthlyPaymentWithExtra, 9339.12);
  assert.equal(result.numberOfPayments, 68);
  assert.equal(result.monthsSaved, 172);
  assert.equal(result.totalInterest, 130866.74);
  assert.equal(result.totalPayment, 630866.74);
  assert.equal(result.interestSaved, 410519.6);
  assert.equal(result.finalPayment, 5145.7);
  assert.equal(result.withoutExtra.numberOfPayments, 240);
  assert.equal(result.withoutExtra.totalInterest, 541386.34);
  assertConsistent(result, 500000);
});

test("without an extra payment there is no saving", () => {
  const result = loan(500000, 8.5, 240);
  assert.equal(result.interestSaved, 0);
  assert.equal(result.monthsSaved, 0);
  assert.deepEqual(result.withoutExtra, {
    numberOfPayments: 240, totalPayment: 1041386.34, totalInterest: 541386.34,
  });
});

test("an extra payment larger than the loan clears it in one payment", () => {
  const result = loan(10000, 12, 12, 1000000);
  assert.equal(result.numberOfPayments, 1);
  assert.equal(result.totalInterest, 100);
  assertConsistent(result, 10000);
});

test("sub-paisa extra payments use effective rounded paise", () => {
  for (const [raw, expectedExtraPaise] of [
    ["0.001", 0], ["0.004", 0], ["0.005", 1], ["0.01", 1],
  ] as const) {
    const validated = validateLoanForm(withForm({ extraPayment: raw }));
    assert.equal(validated.ok, true, raw);
    if (!validated.ok) continue;
    const actual = calculateLoan(validated.input);
    const baseline = loan(500000, 8.5, 240);
    assert.equal(
      paise(actual.monthlyPaymentWithExtra) - paise(actual.monthlyPayment),
      expectedExtraPaise,
      `effective extra paise for ${raw}`,
    );
    if (expectedExtraPaise === 0) {
      assert.equal(actual.interestSaved, 0, raw);
      assert.equal(actual.monthsSaved, 0, raw);
      assert.deepEqual(actual.yearly, baseline.yearly, raw);
    } else {
      assert.ok(actual.totalInterest <= baseline.totalInterest, raw);
    }
    assertConsistent(actual, 500000);
  }
});

// --- Large values ----------------------------------------------------------

test("largest supported loan stays exact and finite", () => {
  const result = loan(LOAN_LIMITS.maxPrincipal, 100, 600);
  assert.equal(result.monthlyPayment, 8333333333.33);
  assert.equal(result.numberOfPayments, 600);
  assert.equal(result.totalInterest, 4999999999998);
  assert.equal(result.totalPayment, 5099999999998);
  assert.ok(Number.isFinite(result.totalPayment));
  assertConsistent(result, LOAN_LIMITS.maxPrincipal);
});

test("a very large loan at a realistic rate reconciles to the paisa", () => {
  const result = loan(99999999999.99, 8.5, 360);
  assert.equal(result.monthlyPayment, 768913483.58);
  assert.equal(result.totalPayment, 276808854095.7);
  assert.equal(result.totalInterest, 176808854095.71);
  assertConsistent(result, 99999999999.99);
});

test("the pure calculator rejects out-of-range input instead of returning misleading numbers", () => {
  assert.throws(() => loan(0, 8, 12), RangeError);
  assert.throws(() => loan(-1, 8, 12), RangeError);
  assert.throws(() => loan(Number.NaN, 8, 12), RangeError);
  assert.throws(() => loan(Number.POSITIVE_INFINITY, 8, 12), RangeError);
  assert.throws(() => loan(LOAN_LIMITS.maxPrincipal + 1, 8, 12), RangeError);
  assert.throws(() => loan(1000, -0.5, 12), RangeError);
  assert.throws(() => loan(1000, 100.01, 12), RangeError);
  assert.throws(() => loan(1000, Number.NaN, 12), RangeError);
  assert.throws(() => loan(1000, 8, 0), RangeError);
  assert.throws(() => loan(1000, 8, 12.5), RangeError);
  assert.throws(() => loan(1000, 8, LOAN_LIMITS.maxTermMonths + 1), RangeError);
  assert.throws(() => loan(1000, 8, 12, -1), RangeError);
  assert.throws(() => loan(0.004, 8, 12), RangeError);
});

// --- Validation ------------------------------------------------------------

test("valid form values become a clean numeric input", () => {
  assert.deepEqual(validateLoanForm(validForm), {
    ok: true, input: { principal: 500000, annualRate: 8.5, termMonths: 240, extraPayment: 0 },
  });
});

test("tenure combines years and months; blank years or months count as zero", () => {
  const term = (years: string, months: string) => {
    const result = validateLoanForm(withForm({ years, months }));
    return result.ok ? result.input.termMonths : result.errors;
  };
  assert.equal(term("2", "6"), 30);
  assert.equal(term("", "18"), 18);
  assert.equal(term("1", ""), 12);
  assert.equal(term("0", "1"), 1);
  assert.equal(term("50", "0"), 600);
});

test("decimal inputs are accepted for amount, rate and extra payment", () => {
  const result = validateLoanForm(withForm({ principal: "250000.55", annualRate: ".5", extraPayment: "100.25" }));
  assert.deepEqual(result, {
    ok: true, input: { principal: 250000.55, annualRate: 0.5, termMonths: 240, extraPayment: 100.25 },
  });
});

test("zero interest is valid", () => {
  const result = validateLoanForm(withForm({ annualRate: "0" }));
  assert.equal(result.ok, true);
});

test("blank loan amount and rate are required", () => {
  const result = validateLoanForm(withForm({ principal: "  ", annualRate: "" }));
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.errors.principal!, /Enter a loan amount/);
    assert.match(result.errors.annualRate!, /Enter an annual interest rate/);
  }
});

test("non-numeric, scientific, signed and special values are rejected", () => {
  for (const bad of ["abc", "1e5", "0x10", "1,00,000", "Infinity", "NaN", "5 000", "1.2.3", "+5", "."]) {
    const result = validateLoanForm(withForm({ principal: bad }));
    assert.equal(result.ok, false, `"${bad}" should be rejected`);
    if (!result.ok) assert.ok(result.errors.principal, `"${bad}" should explain why`);
  }
});

test("negative values are rejected with a clear message", () => {
  const result = validateLoanForm({ principal: "-1", annualRate: "-2", years: "-3", months: "-4", extraPayment: "-5" });
  assert.equal(result.ok, false);
  if (!result.ok) {
    for (const field of ["principal", "annualRate", "years", "months", "extraPayment"] as const) {
      assert.match(result.errors[field]!, /cannot be negative/, field);
    }
  }
});

test("zero or sub-paisa loan amounts are rejected", () => {
  for (const bad of ["0", "0.00", "0.004"]) {
    const result = validateLoanForm(withForm({ principal: bad }));
    assert.equal(result.ok, false, bad);
  }
  assert.equal(validateLoanForm(withForm({ principal: "0.01" })).ok, true);
});

test("amount and rate upper limits are enforced", () => {
  const atLimit = validateLoanForm(withForm({ principal: String(LOAN_LIMITS.maxPrincipal), annualRate: "100" }));
  assert.equal(atLimit.ok, true);
  const overPrincipal = validateLoanForm(withForm({ principal: String(LOAN_LIMITS.maxPrincipal + 1) }));
  assert.equal(overPrincipal.ok, false);
  if (!overPrincipal.ok) assert.match(overPrincipal.errors.principal!, /cannot exceed/);
  const overRate = validateLoanForm(withForm({ annualRate: "100.01" }));
  assert.equal(overRate.ok, false);
  if (!overRate.ok) assert.match(overRate.errors.annualRate!, /cannot exceed 100%/);
});

test("absurdly large numeric text is rejected rather than overflowing", () => {
  const huge = "9".repeat(400);
  for (const field of ["principal", "annualRate", "extraPayment"] as const) {
    assert.equal(validateLoanForm(withForm({ [field]: huge })).ok, false, field);
  }
  assert.equal(validateLoanForm(withForm({ years: huge })).ok, false);
});

test("tenure must be whole numbers and between 1 month and 50 years", () => {
  const decimalYears = validateLoanForm(withForm({ years: "2.5" }));
  assert.equal(decimalYears.ok, false);
  if (!decimalYears.ok) assert.match(decimalYears.errors.years!, /whole number.*months field/);

  const decimalMonths = validateLoanForm(withForm({ months: "6.5" }));
  assert.equal(decimalMonths.ok, false);
  if (!decimalMonths.ok) assert.match(decimalMonths.errors.months!, /whole number/);

  const zeroTerm = validateLoanForm(withForm({ years: "0", months: "0" }));
  assert.equal(zeroTerm.ok, false);
  if (!zeroTerm.ok) assert.match(zeroTerm.errors.term!, /at least 1 month/);

  const tooLong = validateLoanForm(withForm({ years: "50", months: "1" }));
  assert.equal(tooLong.ok, false);
  if (!tooLong.ok) assert.match(tooLong.errors.term!, /cannot exceed 50 years/);

  const tooManyYears = validateLoanForm(withForm({ years: "51" }));
  assert.equal(tooManyYears.ok, false);
  if (!tooManyYears.ok) assert.match(tooManyYears.errors.years!, /cannot exceed 50/);
});

test("every invalid field is reported at once", () => {
  const result = validateLoanForm({ principal: "x", annualRate: "y", years: "0", months: "0", extraPayment: "z" });
  assert.equal(result.ok, false);
  if (!result.ok) assert.deepEqual(Object.keys(result.errors).sort(), ["annualRate", "extraPayment", "principal", "term"]);
});

test("validated input always produces a calculable loan", () => {
  const result = validateLoanForm(withForm({ principal: "99999.99", annualRate: "13.75", years: "3", months: "7", extraPayment: "250" }));
  assert.equal(result.ok, true);
  if (result.ok) assertConsistent(calculateLoan(result.input), 99999.99);
});

// --- Formatting ------------------------------------------------------------

test("rupee formatting uses Indian digit grouping and two decimals", () => {
  assert.equal(formatInr(1041386.34).replace(/\s/g, ""), "₹10,41,386.34");
  assert.equal(formatInr(0).replace(/\s/g, ""), "₹0.00");
});

test("term formatting reads naturally", () => {
  assert.equal(formatTerm(240), "20 years");
  assert.equal(formatTerm(18), "1 year 6 months");
  assert.equal(formatTerm(7), "7 months");
  assert.equal(formatTerm(1), "1 month");
  assert.equal(formatTerm(13), "1 year 1 month");
});
