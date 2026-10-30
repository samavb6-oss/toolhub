import test from "node:test";
import assert from "node:assert/strict";
import { calculateIncomeTax } from "../src/tools/incomeTaxCalculatorLogic.ts";
import type { IncomeTaxInput } from "../src/tools/incomeTaxCalculatorLogic.ts";

const base = (overrides: Partial<IncomeTaxInput> = {}): IncomeTaxInput => ({
  taxYear: "ty2026-27",
  ageBand: "under60",
  grossSalary: 1_500_000,
  otherIncome: 0,
  section80C: 0,
  section80DSelf: 0,
  selfFamilySenior: false,
  section80DParents: 0,
  parentsSenior: false,
  nps80CCD1B: 0,
  ...overrides,
});

test("new regime standard deduction makes ₹12.75 lakh salary tax-free under section 87A", () => {
  const result = calculateIncomeTax(base({ grossSalary: 1_275_000 }));
  assert.equal(result.newRegime.taxableIncome, 1_200_000);
  assert.equal(result.newRegime.taxBeforeRebate, 60_000);
  assert.equal(result.newRegime.rebate, 60_000);
  assert.equal(result.newRegime.totalTax, 0);
});

test("new-regime marginal relief limits tax just above ₹12 lakh taxable income", () => {
  const result = calculateIncomeTax(base({ grossSalary: 1_200_100 + 75_000 }));
  assert.equal(result.newRegime.taxableIncome, 1_200_100);
  assert.equal(result.newRegime.taxAfterRebate, 100);
  assert.equal(result.newRegime.rebate, result.newRegime.taxBeforeRebate - 100);
  assert.equal(result.newRegime.cess, 4);
  assert.equal(result.newRegime.totalTax, 100);
});

test("new-regime progressive slabs and 4% cess produce expected tax", () => {
  const result = calculateIncomeTax(base({ grossSalary: 1_500_000 }));
  assert.equal(result.newRegime.taxableIncome, 1_425_000);
  assert.equal(result.newRegime.taxBeforeRebate, 93_750);
  assert.equal(result.newRegime.totalTax, 97_500);
});

test("old-regime section 87A rebate applies at ₹5 lakh taxable income, not above it", () => {
  const atLimit = calculateIncomeTax(base({ grossSalary: 550_000 }));
  const above = calculateIncomeTax(base({ grossSalary: 550_006 }));
  assert.equal(atLimit.oldRegime.taxableIncome, 500_000);
  assert.equal(atLimit.oldRegime.totalTax, 0);
  assert.equal(above.oldRegime.taxableIncome, 500_010);
  assert.ok(above.oldRegime.totalTax > 0);
});

test("old-regime basic exemption changes with age band", () => {
  const under60 = calculateIncomeTax(base({ grossSalary: 350_000 }));
  const senior = calculateIncomeTax(base({ grossSalary: 350_000, ageBand: "60to79" }));
  const verySenior = calculateIncomeTax(base({ grossSalary: 500_000, ageBand: "80plus" }));
  assert.equal(under60.oldRegime.taxBeforeRebate, 2_500);
  assert.equal(senior.oldRegime.taxBeforeRebate, 0);
  assert.equal(verySenior.oldRegime.taxBeforeRebate, 0);
});

test("self/family health deduction uses the senior-citizen cap when a covered spouse is senior", () => {
  const result = calculateIncomeTax(base({
    grossSalary: 400_000,
    section80DSelf: 50_000,
    selfFamilySenior: true,
  }));
  assert.equal(result.oldRegime.section80DSelfDeduction, 50_000);
  assert.equal(result.oldRegime.taxableIncome, 300_000);
  assert.equal(result.newRegime.section80DSelfDeduction, 0);
});

test("old-regime deductions respect individual caps and the aggregate income limit", () => {
  const result = calculateIncomeTax(base({
    grossSalary: 300_000,
    section80C: 9_000_000,
    section80DSelf: 9_000_000,
    section80DParents: 9_000_000,
    parentsSenior: true,
    nps80CCD1B: 9_000_000,
  }));
  assert.equal(result.oldRegime.section80CDeduction, 150_000);
  assert.equal(result.oldRegime.section80DSelfDeduction, 25_000);
  assert.equal(result.oldRegime.section80DParentsDeduction, 50_000);
  assert.equal(result.oldRegime.npsDeduction, 25_000);
  assert.equal(result.oldRegime.totalDeductions, 300_000);
  assert.equal(result.oldRegime.taxableIncome, 0);
  assert.equal(result.oldRegime.totalTax, 0);
});

test("aggregate old-regime deductions cannot exceed income remaining after standard deduction", () => {
  const result = calculateIncomeTax(base({
    grossSalary: 100_000,
    section80C: 150_000,
    section80DSelf: 25_000,
    section80DParents: 50_000,
    parentsSenior: true,
    nps80CCD1B: 50_000,
  }));
  assert.equal(result.oldRegime.standardDeduction, 50_000);
  assert.equal(result.oldRegime.section80CDeduction, 50_000);
  assert.equal(result.oldRegime.section80DSelfDeduction, 0);
  assert.equal(result.oldRegime.section80DParentsDeduction, 0);
  assert.equal(result.oldRegime.npsDeduction, 0);
  assert.equal(result.oldRegime.totalDeductions, 100_000);
  assert.ok(result.oldRegime.totalDeductions <= result.oldRegime.grossIncome);
  assert.equal(result.oldRegime.taxableIncome, 0);
});

test("new regime ignores old-regime deductions", () => {
  const result = calculateIncomeTax(base({
    grossSalary: 1_000_000,
    section80C: 150_000,
    section80DSelf: 25_000,
    nps80CCD1B: 50_000,
  }));
  assert.equal(result.newRegime.totalDeductions, 75_000);
  assert.equal(result.newRegime.taxableIncome, 925_000);
  assert.equal(result.oldRegime.totalDeductions, 275_000);
});

test("surcharge marginal relief limits the jump immediately above ₹50 lakh", () => {
  const atLimit = calculateIncomeTax(base({ grossSalary: 5_075_000 }));
  const justAbove = calculateIncomeTax(base({ grossSalary: 5_075_010 }));
  assert.equal(atLimit.newRegime.taxableIncome, 5_000_000);
  assert.equal(atLimit.newRegime.taxBeforeRebate, 1_080_000);
  assert.equal(atLimit.newRegime.rebate, 0);
  assert.equal(atLimit.newRegime.taxAfterRebate, 1_080_000);
  assert.equal(atLimit.newRegime.surcharge, 0);
  assert.equal(atLimit.newRegime.cess, 43_200);
  assert.equal(atLimit.newRegime.totalTax, 1_123_200);

  assert.equal(justAbove.newRegime.taxableIncome, 5_000_010);
  assert.equal(justAbove.newRegime.taxBeforeRebate, 1_080_003);
  assert.equal(justAbove.newRegime.rebate, 0);
  assert.equal(justAbove.newRegime.taxAfterRebate, 1_080_003);
  assert.equal(justAbove.newRegime.surcharge, 7);
  assert.equal(justAbove.newRegime.cess, 43_200.4);
  assert.equal(justAbove.newRegime.totalTax, 1_123_210);
  assert.equal(justAbove.newRegime.totalTax - atLimit.newRegime.totalTax, 10);
});

test("supports both requested tax-year labels and rejects invalid amounts", () => {
  assert.equal(calculateIncomeTax(base({ taxYear: "fy2025-26" })).taxYear, "fy2025-26");
  assert.throws(() => calculateIncomeTax(base({ grossSalary: -1 })), RangeError);
  assert.throws(() => calculateIncomeTax(base({ grossSalary: 100.5 })), RangeError);
  assert.throws(() => calculateIncomeTax(base({ otherIncome: Number.POSITIVE_INFINITY })), RangeError);
});

test("standard deduction cannot be applied against other income without salary", () => {
  const result = calculateIncomeTax(base({ grossSalary: 0, otherIncome: 100_000 }));
  assert.equal(result.newRegime.standardDeduction, 0);
  assert.equal(result.newRegime.taxableIncome, 100_000);
  assert.equal(result.oldRegime.standardDeduction, 0);
  assert.equal(result.oldRegime.taxableIncome, 100_000);
});

test("rounds total taxable income to the nearest ₹10 before applying slabs", () => {
  const roundsDown = calculateIncomeTax(base({ grossSalary: 100_004 }));
  const roundsUp = calculateIncomeTax(base({ grossSalary: 100_005 }));
  assert.equal(roundsDown.newRegime.taxableIncome, 25_000);
  assert.equal(roundsUp.newRegime.taxableIncome, 25_010);
});


// Exact surcharge-boundary regression cases, adapted to the calculator's
// itemized-deduction input model. These verify the returned surcharge and
// final payable amount, not merely that the tax stays monotonic.
const surchargeBoundaryCases = [
  { regime: "new" as const, threshold: 10_000_000, expectedSurcharge: 265_000, expectedTotalTax: 2_961_920 },
  { regime: "new" as const, threshold: 20_000_000, expectedSurcharge: 844_000, expectedTotalTax: 6_684_080 },
  { regime: "old" as const, threshold: 10_000_000, expectedSurcharge: 288_250, expectedTotalTax: 3_227_900 },
  { regime: "old" as const, threshold: 20_000_000, expectedSurcharge: 878_875, expectedTotalTax: 6_962_150 },
  { regime: "old" as const, threshold: 50_000_000, expectedSurcharge: 3_710_125, expectedTotalTax: 19_266_650 },
];

for (const boundary of surchargeBoundaryCases) {
  test(`${boundary.regime} regime applies exact surcharge marginal relief just above ₹${boundary.threshold.toLocaleString("en-IN")}`, () => {
    const standardDeduction = boundary.regime === "new" ? 75_000 : 50_000;
    const result = calculateIncomeTax(base({
      grossSalary: boundary.threshold + 10_000 + standardDeduction,
    }))[boundary.regime === "new" ? "newRegime" : "oldRegime"];
    assert.equal(result.taxableIncome, boundary.threshold + 10_000);
    assert.equal(Math.round(result.surcharge), boundary.expectedSurcharge);
    assert.equal(result.totalTax, boundary.expectedTotalTax);
  });
}


test("old-regime age bands use the correct exemption and tax rates above each nil limit", () => {
  const grossSalary = 560_000; // After the ₹50,000 standard deduction: ₹510,000 taxable income.
  const under60 = calculateIncomeTax(base({ grossSalary })).oldRegime;
  const senior = calculateIncomeTax(base({ grossSalary, ageBand: "60to79" })).oldRegime;
  const verySenior = calculateIncomeTax(base({ grossSalary, ageBand: "80plus" })).oldRegime;

  for (const result of [under60, senior, verySenior]) {
    assert.equal(result.taxableIncome, 510_000);
  }
  assert.equal(under60.taxBeforeRebate, 14_500);
  assert.equal(under60.totalTax, 15_080);
  assert.equal(senior.taxBeforeRebate, 12_000);
  assert.equal(senior.totalTax, 12_480);
  assert.equal(verySenior.taxBeforeRebate, 2_000);
  assert.equal(verySenior.totalTax, 2_080);
});


test("old-regime surcharge marginal relief at ₹50 lakh limits the tax increase to the ₹10 excess", () => {
  const atLimit = calculateIncomeTax(base({ taxYear: "fy2025-26", grossSalary: 5_050_000 })).oldRegime;
  const justAbove = calculateIncomeTax(base({ taxYear: "fy2025-26", grossSalary: 5_050_010 })).oldRegime;

  assert.equal(atLimit.taxableIncome, 5_000_000);
  assert.equal(atLimit.taxBeforeRebate, 1_312_500);
  assert.equal(atLimit.surcharge, 0);
  assert.equal(atLimit.totalTax, 1_365_000);

  assert.equal(justAbove.taxableIncome, 5_000_010);
  assert.equal(justAbove.taxBeforeRebate, 1_312_503);
  assert.equal(justAbove.surcharge, 7);
  assert.equal(justAbove.totalTax, 1_365_010);
  assert.equal(justAbove.totalTax - atLimit.totalTax, 10);
});
