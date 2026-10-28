/**
 * Indian individual income-tax estimate for Tax Year 2026-27.
 * Supports ordinary income only; special-rate income, capital gains, business
 * income adjustments, and individual-specific exemptions are outside scope.
 * Rates are based on official Income Tax Department guidance for TY 2026-27.
 */
export const INCOME_TAX_YEAR = "2026–27";
export const INCOME_TAX_LIMITS = { maxAmount: 1_000_000_000 } as const;

export type TaxRegime = "new" | "old";
export type TaxAgeGroup = "under60" | "60to79" | "80plus";
export type TaxResidency = "resident" | "nonresident";
export type IncomeTaxFormValues = {
  salary: string;
  otherIncome: string;
  oldRegimeDeductions: string;
  regime: TaxRegime;
  ageGroup: TaxAgeGroup;
  residency: TaxResidency;
};
export type IncomeTaxField = "salary" | "otherIncome" | "oldRegimeDeductions";
export type IncomeTaxValidation =
  | { ok: true; input: { salary: number; otherIncome: number; oldRegimeDeductions: number; regime: TaxRegime; ageGroup: TaxAgeGroup; residency: TaxResidency } }
  | { ok: false; errors: Partial<Record<IncomeTaxField, string>> };
export type IncomeTaxResult = {
  regime: TaxRegime;
  salary: number;
  otherIncome: number;
  standardDeduction: number;
  otherDeductions: number;
  grossIncome: number;
  taxableIncome: number;
  taxBeforeRebate: number;
  rebate: number;
  taxAfterRebate: number;
  surcharge: number;
  cess: number;
  totalTax: number;
  effectiveRatePercent: number;
  monthlyTaxEstimate: number;
};

type Slab = { upTo: number; rate: number };
const NEW_SLABS: Slab[] = [
  { upTo: 400_000, rate: 0 }, { upTo: 800_000, rate: 0.05 },
  { upTo: 1_200_000, rate: 0.10 }, { upTo: 1_600_000, rate: 0.15 },
  { upTo: 2_000_000, rate: 0.20 }, { upTo: 2_400_000, rate: 0.25 },
  { upTo: Infinity, rate: 0.30 },
];

function readAmount(value: string): number | null {
  if (!value.trim()) return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}

export function validateIncomeTaxForm(values: IncomeTaxFormValues): IncomeTaxValidation {
  const errors: Partial<Record<IncomeTaxField, string>> = {};
  const fields: Array<[IncomeTaxField, string, string]> = [
    ["salary", values.salary, "Enter your annual salary, or enter 0 if you do not receive salary."],
    ["otherIncome", values.otherIncome, "Enter other annual taxable income, or 0."],
    ["oldRegimeDeductions", values.oldRegimeDeductions, "Enter eligible old-regime deductions, or 0."],
  ];
  const parsed: Partial<Record<IncomeTaxField, number>> = {};
  for (const [field, raw, emptyMessage] of fields) {
    const amount = readAmount(raw);
    if (amount === null) errors[field] = emptyMessage;
    else if (amount < 0 || amount > INCOME_TAX_LIMITS.maxAmount) errors[field] = "Enter an amount from ₹0 to ₹1,000,000,000.";
    else parsed[field] = amount;
  }
  if (Object.keys(errors).length || parsed.salary === undefined || parsed.otherIncome === undefined || parsed.oldRegimeDeductions === undefined) {
    return { ok: false, errors };
  }
  return { ok: true, input: { ...parsed as { salary: number; otherIncome: number; oldRegimeDeductions: number }, regime: values.regime, ageGroup: values.ageGroup, residency: values.residency } };
}

function roundIncomeToTen(value: number): number { return Math.round(value / 10) * 10; }
function roundRupee(value: number): number { return Math.round(value); }

function slabTax(income: number, regime: TaxRegime, ageGroup: TaxAgeGroup, residency: TaxResidency): number {
  // Age-based higher exemption limits in the old regime apply to resident individuals only.
  const applicableAgeGroup = residency === "resident" ? ageGroup : "under60";
  const slabs: Slab[] = regime === "new" ? NEW_SLABS : applicableAgeGroup === "80plus"
    ? [{ upTo: 500_000, rate: 0 }, { upTo: 1_000_000, rate: 0.20 }, { upTo: Infinity, rate: 0.30 }]
    : applicableAgeGroup === "60to79"
      ? [{ upTo: 300_000, rate: 0 }, { upTo: 500_000, rate: 0.05 }, { upTo: 1_000_000, rate: 0.20 }, { upTo: Infinity, rate: 0.30 }]
      : [{ upTo: 250_000, rate: 0 }, { upTo: 500_000, rate: 0.05 }, { upTo: 1_000_000, rate: 0.20 }, { upTo: Infinity, rate: 0.30 }];
  let tax = 0;
  let lower = 0;
  for (const slab of slabs) {
    const taxableInBand = Math.max(0, Math.min(income, slab.upTo) - lower);
    tax += taxableInBand * slab.rate;
    if (income <= slab.upTo) break;
    lower = slab.upTo;
  }
  return tax;
}

function taxAfterRebate(income: number, tax: number, regime: TaxRegime, residency: TaxResidency): { tax: number; rebate: number } {
  if (residency !== "resident") return { tax, rebate: 0 };
  const threshold = regime === "new" ? 1_200_000 : 500_000;
  const maxRebate = regime === "new" ? 60_000 : 12_500;
  if (income <= threshold) {
    const rebate = Math.min(tax, maxRebate);
    return { tax: Math.max(0, tax - rebate), rebate };
  }
  // Marginal relief prevents a small increase above the rebate threshold from
  // creating a larger increase in tax than the additional income.
  const allowableTax = Math.max(0, income - threshold);
  const finalTax = Math.min(tax, allowableTax);
  return { tax: finalTax, rebate: Math.max(0, tax - finalTax) };
}

function surchargeRate(income: number, regime: TaxRegime): number {
  if (income <= 5_000_000) return 0;
  if (income <= 10_000_000) return 0.10;
  if (income <= 20_000_000) return 0.15;
  if (income <= 50_000_000) return 0.25;
  return regime === "new" ? 0.25 : 0.37;
}

function taxWithSurcharge(income: number, taxAfterRebateAmount: number, regime: TaxRegime, ageGroup: TaxAgeGroup, residency: TaxResidency): { tax: number; surcharge: number } {
  const rate = surchargeRate(income, regime);
  const raw = taxAfterRebateAmount * (1 + rate);
  const thresholds = [
    { income: 5_000_000, priorRate: 0 },
    { income: 10_000_000, priorRate: 0.10 },
    { income: 20_000_000, priorRate: 0.15 },
    { income: 50_000_000, priorRate: 0.25 },
  ];
  let final = raw;
  for (const threshold of thresholds) {
    if (income <= threshold.income) break;
    const taxAtThreshold = slabTax(threshold.income, regime, ageGroup, residency);
    const afterRebateAtThreshold = taxAfterRebate(threshold.income, taxAtThreshold, regime, residency).tax;
    const allowed = afterRebateAtThreshold * (1 + threshold.priorRate) + (income - threshold.income);
    final = Math.min(final, allowed);
  }
  return { tax: final, surcharge: Math.max(0, final - taxAfterRebateAmount) };
}

export function calculateIncomeTax(input: { salary: number; otherIncome: number; oldRegimeDeductions: number; regime: TaxRegime; ageGroup: TaxAgeGroup; residency: TaxResidency }): IncomeTaxResult {
  const { salary, otherIncome, oldRegimeDeductions, regime, ageGroup, residency } = input;
  for (const amount of [salary, otherIncome, oldRegimeDeductions]) {
    if (!Number.isFinite(amount) || amount < 0 || amount > INCOME_TAX_LIMITS.maxAmount) throw new RangeError("Income and deductions must be finite, non-negative amounts within the supported range.");
  }
  const standardDeduction = Math.min(salary, regime === "new" ? 75_000 : 50_000);
  const otherDeductions = regime === "old" ? oldRegimeDeductions : 0;
  const grossIncome = salary + otherIncome;
  const taxableIncome = roundIncomeToTen(Math.max(0, grossIncome - standardDeduction - otherDeductions));
  const taxBeforeRebate = slabTax(taxableIncome, regime, ageGroup, residency);
  const rebateResult = taxAfterRebate(taxableIncome, taxBeforeRebate, regime, residency);
  const surchargeResult = taxWithSurcharge(taxableIncome, rebateResult.tax, regime, ageGroup, residency);
  const cess = roundRupee(surchargeResult.tax * 0.04);
  const totalTax = roundRupee(surchargeResult.tax + cess);
  return {
    regime, salary, otherIncome, standardDeduction, otherDeductions, grossIncome,
    taxableIncome, taxBeforeRebate: roundRupee(taxBeforeRebate), rebate: roundRupee(rebateResult.rebate),
    taxAfterRebate: roundRupee(rebateResult.tax), surcharge: roundRupee(surchargeResult.surcharge),
    cess, totalTax, effectiveRatePercent: grossIncome > 0 ? (totalTax / grossIncome) * 100 : 0,
    monthlyTaxEstimate: roundRupee(totalTax / 12),
  };
}

export function formatTaxInr(value: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}