import test from "node:test";
import assert from "node:assert/strict";
import {
  SALARY_LIMITS,
  calculateSalary,
  formatSalaryInr,
  validateSalaryForm,
} from "../src/tools/salaryCalculatorLogic.ts";
import type { SalaryFormValues } from "../src/tools/salaryCalculatorLogic.ts";

const validForm = (overrides: Partial<SalaryFormValues> = {}): SalaryFormValues => ({
  annualGross: "1200000",
  annualDeductions: "120000",
  frequency: "monthly",
  ...overrides,
});

test("calculates annual gross, configured deductions and net without inventing taxes", () => {
  const validation = validateSalaryForm(validForm());
  assert.equal(validation.ok, true);
  if (!validation.ok) return;
  const result = calculateSalary(validation.input);
  assert.equal(result.annualGross, 1_200_000);
  assert.equal(result.annualDeductions, 120_000);
  assert.equal(result.annualNet, 1_080_000);
  assert.equal(result.grossPerPeriod, 100_000);
  assert.equal(result.deductionsPerPeriod, 10_000);
  assert.equal(result.netPerPeriod, 90_000);
  assert.equal(result.deductionPercent, 10);
});

test("supports monthly, fortnightly and weekly pay-period averages", () => {
  for (const [frequency, periods] of [["monthly", 12], ["fortnightly", 26], ["weekly", 52]] as const) {
    const validation = validateSalaryForm(validForm({ frequency }));
    assert.equal(validation.ok, true);
    if (!validation.ok) continue;
    assert.equal(calculateSalary(validation.input).periodsPerYear, periods);
  }
  const weekly = calculateSalary({ annualGross: 520_000, annualDeductions: 52_000, frequency: "weekly" });
  assert.equal(weekly.grossPerPeriod, 10_000);
  assert.equal(weekly.netPerPeriod, 9_000);
});

test("allows zero deductions and deductions equal to gross", () => {
  assert.equal(validateSalaryForm(validForm({ annualDeductions: "0" })).ok, true);
  const allDeducted = calculateSalary({ annualGross: 100, annualDeductions: 100, frequency: "monthly" });
  assert.equal(allDeducted.annualNet, 0);
  assert.equal(allDeducted.netPerPeriod, 0);
});

test("rejects empty, non-finite, non-positive and over-limit gross salary", () => {
  for (const annualGross of ["", "abc", "Infinity", "0", "-1", String(SALARY_LIMITS.maxAnnualGross + 1)]) {
    const validation = validateSalaryForm(validForm({ annualGross }));
    assert.equal(validation.ok, false, `expected ${annualGross} to be rejected`);
    if (!validation.ok) assert.ok(validation.errors.annualGross);
  }
});

test("rejects empty, negative and over-gross deductions", () => {
  for (const annualDeductions of ["", "-0.01", "1200000.01"]) {
    const validation = validateSalaryForm(validForm({ annualDeductions }));
    assert.equal(validation.ok, false, `expected ${annualDeductions} to be rejected`);
    if (!validation.ok) assert.ok(validation.errors.annualDeductions);
  }
});

test("direct calculation rejects invalid values and unsupported frequency", () => {
  assert.throws(() => calculateSalary({ annualGross: 0, annualDeductions: 0, frequency: "monthly" }), RangeError);
  assert.throws(() => calculateSalary({ annualGross: 100, annualDeductions: -1, frequency: "monthly" }), RangeError);
  assert.throws(() => calculateSalary({ annualGross: 100, annualDeductions: 101, frequency: "monthly" }), RangeError);
  assert.throws(() => calculateSalary({ annualGross: 100, annualDeductions: 0, frequency: "daily" as "monthly" }), RangeError);
});

test("rounds money to paise and formats Indian currency", () => {
  const result = calculateSalary({ annualGross: 1000.105, annualDeductions: 0.105, frequency: "monthly" });
  assert.equal(result.annualGross, 1000.11);
  assert.equal(result.annualDeductions, 0.11);
  assert.equal(result.annualNet, 1000);
  assert.match(formatSalaryInr(123456.78), /₹\s?1,23,456\.78/u);
});

test("rounds half-paise ties correctly at large rupee magnitudes", () => {
  const result = calculateSalary({
    annualGross: 1_000_000.005,
    annualDeductions: 0.005,
    frequency: "monthly",
  });
  assert.equal(result.annualGross, 1_000_000.01);
  assert.equal(result.annualDeductions, 0.01);
  assert.equal(result.annualNet, 1_000_000);
});


test("rejects sub-paisa gross salary instead of producing NaN percentages", () => {
  for (const annualGross of ["0.0001", "0.004", "0.0049", "1e-7"]) {
    const validation = validateSalaryForm(validForm({ annualGross, annualDeductions: "0" }));
    assert.equal(validation.ok, false, annualGross);
    if (!validation.ok) assert.ok(validation.errors.annualGross, annualGross);
  }
  assert.throws(() => calculateSalary({ annualGross: 0.004, annualDeductions: 0, frequency: "monthly" }), RangeError);
  assert.throws(() => calculateSalary({ annualGross: 0.004, annualDeductions: 0.004, frequency: "monthly" }), RangeError);
});

test("accepts the smallest whole-paisa gross with a finite deduction percentage", () => {
  for (const annualGross of ["0.005", "0.01"]) {
    const validation = validateSalaryForm(validForm({ annualGross, annualDeductions: "0" }));
    assert.equal(validation.ok, true, annualGross);
    if (validation.ok) {
      const result = calculateSalary(validation.input);
      assert.equal(result.annualGross, 0.01);
      assert.ok(Number.isFinite(result.deductionPercent));
    }
  }
});
