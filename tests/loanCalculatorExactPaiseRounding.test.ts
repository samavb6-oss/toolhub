import test from "node:test";
import assert from "node:assert/strict";
import { calculateLoan, validateLoanForm } from "../src/tools/loanCalculatorLogic.ts";

const loan = (principal: number, annualRate: number, termMonths: number, extraPayment = 0) =>
  calculateLoan({ principal, annualRate, termMonths, extraPayment });

test("exact half-paisa EMI tie rounds up instead of drifting below the tie", () => {
  const result = loan(19308, 13.5, 2);
  assert.equal(result.monthlyPayment, 9817.22);
  assert.equal(result.finalPayment, 9817.22);
  assert.equal(result.totalPayment, 19634.44);
  assert.equal(result.totalInterest, 326.44);
});

test("one-month interest at an exact half-paisa rounds half up", () => {
  const result = loan(570259, 18, 1);
  assert.equal(result.monthlyPayment, 578812.89);
  assert.equal(result.finalPayment, 578812.89);
  assert.equal(result.totalInterest, 8553.89);
});

test("long-term loan final payment matches exact decimal-rate arithmetic", () => {
  const result = loan(4095766.92, 12.2, 300);
  assert.equal(result.finalPayment, 43748.04);
});

test("extra-payment schedule uses exact monthly-interest rounding", () => {
  const result = loan(4407815, 20.4, 48, 13530);
  assert.equal(result.totalPayment, 6185929.14);
  assert.equal(result.numberOfPayments, 42);
  assert.equal(result.withoutExtra.numberOfPayments, 48);
  assert.equal(result.finalPayment, 93223.36);
  assert.equal(result.interestSaved, 297555);
  assert.equal(result.monthsSaved, 6);
  assert.equal(result.totalPrincipal, 4407815);
});

test("decimal money inputs round from their decimal value, not a binary floating-point approximation", () => {
  const principal = validateLoanForm({
    principal: "1.005", annualRate: "0", years: "0", months: "1", extraPayment: "",
  });
  assert.equal(principal.ok, true);
  if (principal.ok) assert.equal(calculateLoan(principal.input).totalPrincipal, 1.01);

  const extra = validateLoanForm({
    principal: "100", annualRate: "0", years: "0", months: "1", extraPayment: "0.285",
  });
  assert.equal(extra.ok, true);
  if (extra.ok) {
    const result = calculateLoan(extra.input);
    assert.equal(Math.round((result.monthlyPaymentWithExtra - result.monthlyPayment) * 100), 29);
  }
});

test("negative extra payment remains invalid, including amounts below half a paisa", () => {
  assert.throws(() => loan(1000, 8, 12, -1), RangeError);
  assert.throws(() => loan(1000, 8, 12, -0.001), RangeError);
});

test("rejects decimal text when Number parsing would move it across a paise-rounding boundary", () => {
  const principal = validateLoanForm({
    principal: "1.004999999999999999", annualRate: "0", years: "0", months: "1", extraPayment: "",
  });
  assert.equal(principal.ok, false);
  if (!principal.ok) assert.ok(principal.errors.principal);

  const rate = validateLoanForm({
    principal: "19308", annualRate: "13.499999999999999999", years: "0", months: "2", extraPayment: "",
  });
  assert.equal(rate.ok, false);
  if (!rate.ok) assert.ok(rate.errors.annualRate);

  const extra = validateLoanForm({
    principal: "100", annualRate: "0", years: "0", months: "1", extraPayment: "0.0049999999999999999",
  });
  assert.equal(extra.ok, false);
  if (!extra.ok) assert.ok(extra.errors.extraPayment);
});

test("decimal parser allows trailing zeroes that preserve the entered value", () => {
  const result = validateLoanForm({
    principal: "1.2300", annualRate: "0.000", years: "0", months: "1", extraPayment: "0.000",
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    const calculation = calculateLoan(result.input);
    assert.equal(calculation.totalPrincipal, 1.23);
  }
});
