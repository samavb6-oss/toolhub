import test from "node:test";
import assert from "node:assert/strict";
import { calculateIncomeTax, validateIncomeTaxForm } from "../src/tools/incomeTaxCalculatorLogic.ts";

const base = { salary: 1_200_000, otherIncome: 0, oldRegimeDeductions: 150_000, ageGroup: "under60" as const, residency: "resident" as const };

test("new regime applies ₹75,000 standard deduction and Section 156 rebate for Tax Year 2026-27", () => {
  const result = calculateIncomeTax({ ...base, regime: "new" });
  assert.equal(result.standardDeduction, 75_000);
  assert.equal(result.taxableIncome, 1_125_000);
  assert.equal(result.taxBeforeRebate, 52_500);
  assert.equal(result.rebate, 52_500);
  assert.equal(result.totalTax, 0);
});

test("new regime marginal relief caps tax just above ₹12 lakh taxable income", () => {
  const result = calculateIncomeTax({ ...base, salary: 1_285_000, regime: "new" });
  assert.equal(result.taxableIncome, 1_210_000);
  assert.equal(result.taxAfterRebate, 10_000);
  assert.equal(result.cess, 400);
  assert.equal(result.totalTax, 10_400);
});

test("old regime uses the correct standard deduction and eligible deductions", () => {
  const result = calculateIncomeTax({ ...base, regime: "old" });
  assert.equal(result.standardDeduction, 50_000);
  assert.equal(result.otherDeductions, 150_000);
  assert.equal(result.taxableIncome, 1_000_000);
  assert.equal(result.taxBeforeRebate, 112_500);
  assert.equal(result.totalTax, 117_000);
});

test("old regime applies age-specific basic exemption for super-senior residents", () => {
  const result = calculateIncomeTax({ ...base, salary: 550_000, oldRegimeDeductions: 0, ageGroup: "80plus", regime: "old" });
  assert.equal(result.taxableIncome, 500_000);
  assert.equal(result.totalTax, 0);
});

test("Section 156 rebate is not applied to non-residents for Tax Year 2026–27", () => {
  const resident = calculateIncomeTax({ ...base, salary: 1_275_000, oldRegimeDeductions: 0, regime: "new", residency: "resident" });
  const nonresident = calculateIncomeTax({ ...base, salary: 1_275_000, oldRegimeDeductions: 0, regime: "new", residency: "nonresident" });
  assert.equal(resident.totalTax, 0);
  assert.equal(nonresident.totalTax, 62_400);
});

test("old-regime age-based exemption limits do not apply to non-residents", () => {
  const resident = calculateIncomeTax({ ...base, salary: 350_000, oldRegimeDeductions: 0, ageGroup: "80plus", regime: "old", residency: "resident" });
  const nonresident = calculateIncomeTax({ ...base, salary: 350_000, oldRegimeDeductions: 0, ageGroup: "80plus", regime: "old", residency: "nonresident" });
  assert.equal(resident.taxableIncome, 300_000);
  assert.equal(resident.totalTax, 0);
  assert.equal(nonresident.taxableIncome, 300_000);
  assert.equal(nonresident.taxBeforeRebate, 2_500);
  assert.equal(nonresident.totalTax, 2_600);
});

test("surcharge marginal relief prevents a tax jump just above ₹50 lakh", () => {
  const result = calculateIncomeTax({ ...base, salary: 5_085_000, oldRegimeDeductions: 0, regime: "new" });
  assert.equal(result.taxableIncome, 5_010_000);
  assert.equal(result.surcharge, 7_000);
  assert.equal(result.totalTax, 1_133_600);
});

test("invalid and negative inputs are rejected instead of silently treated as zero", () => {
  const invalid = validateIncomeTaxForm({ salary: "-1", otherIncome: "abc", oldRegimeDeductions: "", regime: "new", ageGroup: "under60", residency: "resident" });
  assert.equal(invalid.ok, false);
  if (!invalid.ok) {
    assert.ok(invalid.errors.salary);
    assert.ok(invalid.errors.otherIncome);
    assert.ok(invalid.errors.oldRegimeDeductions);
  }
  assert.throws(() => calculateIncomeTax({ ...base, salary: -1, regime: "new" }), RangeError);
});

// Regression checks for surcharge marginal relief just above the ₹1 crore, ₹2 crore and ₹5 crore thresholds.
// Values are independently calculated from the published slabs and surcharge rates for ordinary income.
const surchargeBoundaryCases = [
  { regime: "new" as const, threshold: 10_000_000, deduction: 75_000, expectedSurcharge: 265_000, expectedTotalTax: 2_961_920 },
  { regime: "new" as const, threshold: 20_000_000, deduction: 75_000, expectedSurcharge: 844_000, expectedTotalTax: 6_684_080 },
  { regime: "old" as const, threshold: 10_000_000, deduction: 50_000, expectedSurcharge: 288_250, expectedTotalTax: 3_227_900 },
  { regime: "old" as const, threshold: 20_000_000, deduction: 50_000, expectedSurcharge: 878_875, expectedTotalTax: 6_962_150 },
  { regime: "old" as const, threshold: 50_000_000, deduction: 50_000, expectedSurcharge: 3_710_125, expectedTotalTax: 19_266_650 },
];

for (const boundary of surchargeBoundaryCases) {
  test(`${boundary.regime} regime applies surcharge marginal relief just above ₹${boundary.threshold.toLocaleString("en-IN")}`, () => {
    const result = calculateIncomeTax({
      ...base,
      salary: boundary.threshold + 10_000 + boundary.deduction,
      oldRegimeDeductions: 0,
      regime: boundary.regime,
    });
    assert.equal(result.taxableIncome, boundary.threshold + 10_000);
    assert.equal(result.surcharge, boundary.expectedSurcharge);
    assert.equal(result.totalTax, boundary.expectedTotalTax);
  });
}
