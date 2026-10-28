/**
 * India individual income-tax estimate for salaried resident individuals.
 * Rules covered: FY 2025-26 / AY 2026-27 under the 1961 Act and Tax Year 2026-27
 * under the 2025 Act. This is an estimate for ordinary income, not a tax return.
 */
export type TaxYear = "fy2025-26" | "ty2026-27";
export type TaxRegime = "new" | "old";
export type AgeBand = "under60" | "60to79" | "80plus";

export type IncomeTaxInput = {
  taxYear: TaxYear;
  ageBand: AgeBand;
  grossSalary: number;
  otherIncome: number;
  section80C: number;
  section80DSelf: number;
  selfFamilySenior: boolean;
  section80DParents: number;
  parentsSenior: boolean;
  nps80CCD1B: number;
};

export type IncomeTaxBreakdown = {
  regime: TaxRegime;
  grossIncome: number;
  standardDeduction: number;
  section80CDeduction: number;
  section80DSelfDeduction: number;
  section80DParentsDeduction: number;
  npsDeduction: number;
  totalDeductions: number;
  taxableIncome: number;
  taxBeforeRebate: number;
  rebate: number;
  taxAfterRebate: number;
  surcharge: number;
  cess: number;
  totalTax: number;
  monthlyTax: number;
  effectiveRate: number;
};

export type IncomeTaxComparison = {
  taxYear: TaxYear;
  oldRegime: IncomeTaxBreakdown;
  newRegime: IncomeTaxBreakdown;
  lowerTaxRegime: TaxRegime | "same";
};

const LIMITS = {
  maxIncome: 1_000_000_000,
  section80C: 150_000,
  section80DRegular: 25_000,
  section80DSenior: 50_000,
  nps80CCD1B: 50_000,
} as const;

function validAmount(value: number): boolean {
  return Number.isFinite(value) && Number.isInteger(value) && value >= 0 && value <= LIMITS.maxIncome;
}

function slabTax(income: number, slabs: ReadonlyArray<{ upto: number; rate: number }>): number {
  let tax = 0;
  let lower = 0;
  for (const slab of slabs) {
    const taxableInSlab = Math.max(0, Math.min(income, slab.upto) - lower);
    tax += taxableInSlab * slab.rate;
    if (income <= slab.upto) return tax;
    lower = slab.upto;
  }
  return tax;
}

const NEW_SLABS = [
  { upto: 400_000, rate: 0 },
  { upto: 800_000, rate: 0.05 },
  { upto: 1_200_000, rate: 0.10 },
  { upto: 1_600_000, rate: 0.15 },
  { upto: 2_000_000, rate: 0.20 },
  { upto: 2_400_000, rate: 0.25 },
  { upto: Infinity, rate: 0.30 },
] as const;

function oldSlabs(ageBand: AgeBand) {
  const nilLimit = ageBand === "80plus" ? 500_000 : ageBand === "60to79" ? 300_000 : 250_000;
  if (ageBand === "80plus") {
    return [
      { upto: 500_000, rate: 0 },
      { upto: 1_000_000, rate: 0.20 },
      { upto: Infinity, rate: 0.30 },
    ] as const;
  }
  return [
    { upto: nilLimit, rate: 0 },
    { upto: 500_000, rate: 0.05 },
    { upto: 1_000_000, rate: 0.20 },
    { upto: Infinity, rate: 0.30 },
  ] as const;
}

function taxAfterRebate(income: number, regime: TaxRegime, ageBand: AgeBand): { beforeRebate: number; rebate: number; afterRebate: number } {
  const beforeRebate = slabTax(income, regime === "new" ? NEW_SLABS : oldSlabs(ageBand));
  if (regime === "new") {
    // Section 87A rebate plus marginal relief immediately above ₹12 lakh.
    if (income <= 1_200_000) {
      const rebate = Math.min(beforeRebate, 60_000);
      return { beforeRebate, rebate, afterRebate: beforeRebate - rebate };
    }
    const afterRebate = Math.min(beforeRebate, income - 1_200_000);
    return { beforeRebate, rebate: beforeRebate - afterRebate, afterRebate };
  }
  const rebate = income <= 500_000 ? Math.min(beforeRebate, 12_500) : 0;
  return { beforeRebate, rebate, afterRebate: beforeRebate - rebate };
}

function surchargeRate(income: number, regime: TaxRegime): number {
  if (income <= 5_000_000) return 0;
  if (income <= 10_000_000) return 0.10;
  if (income <= 20_000_000) return 0.15;
  if (regime === "new") return 0.25;
  if (income <= 50_000_000) return 0.25;
  return 0.37;
}

function surchargeWithMarginalRelief(income: number, taxAfterRebateAmount: number, regime: TaxRegime, ageBand: AgeBand): number {
  const rate = surchargeRate(income, regime);
  let taxWithSurcharge = taxAfterRebateAmount * (1 + rate);
  const thresholds = [
    { amount: 5_000_000, priorRate: 0 },
    { amount: 10_000_000, priorRate: 0.10 },
    { amount: 20_000_000, priorRate: 0.15 },
    ...(regime === "old" ? [{ amount: 50_000_000, priorRate: 0.25 }] : []),
  ];
  for (const threshold of thresholds) {
    if (income <= threshold.amount) continue;
    const taxAtThreshold = taxAfterRebate(threshold.amount, regime, ageBand).afterRebate * (1 + threshold.priorRate);
    taxWithSurcharge = Math.min(taxWithSurcharge, taxAtThreshold + (income - threshold.amount));
  }
  return Math.max(0, taxWithSurcharge - taxAfterRebateAmount);
}

function roundIncomeToTen(amount: number): number {
  // Total income is rounded to the nearest ₹10 before slab tax is computed.
  return Math.floor((amount + 5) / 10) * 10;
}

function roundFinalTaxToTen(amount: number): number {
  // Final tax payable is rounded to the nearest ₹10.
  return Math.round(amount / 10) * 10;
}

function breakdown(input: IncomeTaxInput, regime: TaxRegime): IncomeTaxBreakdown {
  const standardDeduction = Math.min(regime === "new" ? 75_000 : 50_000, input.grossSalary);
  const grossIncome = input.grossSalary + input.otherIncome;
  // Chapter VIII deductions cannot exceed gross total income after the
  // salary standard deduction. Allocate the remaining eligible amount in
  // the same order as the calculator's deduction fields to keep the
  // displayed itemized amounts consistent with the total deduction.
  let remainingChapterVIIILimit = regime === "old" ? Math.max(0, grossIncome - standardDeduction) : 0;
  const section80CDeduction = Math.min(input.section80C, LIMITS.section80C, remainingChapterVIIILimit);
  remainingChapterVIIILimit -= section80CDeduction;
  const section80DSelfDeduction = Math.min(
    input.section80DSelf,
    (input.ageBand !== "under60" || input.selfFamilySenior) ? LIMITS.section80DSenior : LIMITS.section80DRegular,
    remainingChapterVIIILimit,
  );
  remainingChapterVIIILimit -= section80DSelfDeduction;
  const section80DParentsDeduction = Math.min(
    input.section80DParents,
    input.parentsSenior ? LIMITS.section80DSenior : LIMITS.section80DRegular,
    remainingChapterVIIILimit,
  );
  remainingChapterVIIILimit -= section80DParentsDeduction;
  const npsDeduction = Math.min(input.nps80CCD1B, LIMITS.nps80CCD1B, remainingChapterVIIILimit);
  const totalDeductions = standardDeduction + section80CDeduction + section80DSelfDeduction + section80DParentsDeduction + npsDeduction;
  const taxableIncome = roundIncomeToTen(Math.max(0, grossIncome - totalDeductions));
  const tax = taxAfterRebate(taxableIncome, regime, input.ageBand);
  const surcharge = surchargeWithMarginalRelief(taxableIncome, tax.afterRebate, regime, input.ageBand);
  const cess = (tax.afterRebate + surcharge) * 0.04;
  const totalTax = roundFinalTaxToTen(tax.afterRebate + surcharge + cess);
  return {
    regime,
    grossIncome,
    standardDeduction,
    section80CDeduction,
    section80DSelfDeduction,
    section80DParentsDeduction,
    npsDeduction,
    totalDeductions,
    taxableIncome,
    taxBeforeRebate: tax.beforeRebate,
    rebate: tax.rebate,
    taxAfterRebate: tax.afterRebate,
    surcharge,
    cess,
    totalTax,
    monthlyTax: Math.round(totalTax / 12),
    effectiveRate: grossIncome > 0 ? (totalTax / grossIncome) * 100 : 0,
  };
}

export function calculateIncomeTax(input: IncomeTaxInput): IncomeTaxComparison {
  if (input.taxYear !== "fy2025-26" && input.taxYear !== "ty2026-27") throw new RangeError("Choose a supported tax year.");
  if (!["under60", "60to79", "80plus"].includes(input.ageBand)) throw new RangeError("Choose a valid age group.");
  for (const [name, value] of Object.entries({
    grossSalary: input.grossSalary,
    otherIncome: input.otherIncome,
    section80C: input.section80C,
    section80DSelf: input.section80DSelf,
    section80DParents: input.section80DParents,
    nps80CCD1B: input.nps80CCD1B,
  })) {
    if (!validAmount(value)) throw new RangeError(`${name} must be a non-negative finite amount within the calculator limit.`);
  }
  const oldRegime = breakdown(input, "old");
  const newRegime = breakdown(input, "new");
  const lowerTaxRegime = oldRegime.totalTax === newRegime.totalTax
    ? "same"
    : oldRegime.totalTax < newRegime.totalTax ? "old" : "new";
  return { taxYear: input.taxYear, oldRegime, newRegime, lowerTaxRegime };
}
