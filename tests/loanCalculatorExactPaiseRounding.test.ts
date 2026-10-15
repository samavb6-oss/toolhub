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

test("negative extra payment remains invalid", () => {
  assert.throws(() => loan(1000, 8, 12, -1), RangeError);
});
