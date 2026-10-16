/**
 * Salary Calculator: configurable gross-to-net breakdown, not a tax calculator.
 * Inputs are annual rupee amounts; deductions are user-entered totals only.
 * No country-specific tax, statutory contribution, or payroll rules are inferred.
 */
export const SALARY_LIMITS = {
  maxAnnualGross: 1_000_000_000,
} as const;

export type SalaryFrequency = "monthly" | "fortnightly" | "weekly";

export type SalaryFormValues = {
  annualGross: string;
  annualDeductions: string;
  frequency: SalaryFrequency;
};

export type SalaryField = "annualGross" | "annualDeductions" | "frequency";

export type SalaryInput = {
  annualGross: number;
  annualDeductions: number;
  frequency: SalaryFrequency;
};

export type SalaryValidation =
  | { ok: true; input: SalaryInput }
  | { ok: false; errors: Partial<Record<SalaryField, string>> };

export type SalaryResult = {
  annualGross: number;
  annualDeductions: number;
  annualNet: number;
  grossPerPeriod: number;
  deductionsPerPeriod: number;
  netPerPeriod: number;
  averageMonthlyGross: number;
  averageMonthlyDeductions: number;
  averageMonthlyNet: number;
  periodsPerYear: number;
  deductionPercent: number;
};

const PERIODS_PER_YEAR: Record<SalaryFrequency, number> = {
  monthly: 12,
  fortnightly: 26,
  weekly: 52,
};

const roundPaise = (rupees: number): number => Math.floor(rupees * 100 + 0.5);
const fromPaise = (paise: number): number => paise / 100;
const averagePaise = (annualPaise: number, periods: number): number =>
  Math.floor(annualPaise / periods + 0.5);

function readAmount(value: string): number | null {
  if (!value.trim()) return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}

export function validateSalaryForm(values: SalaryFormValues): SalaryValidation {
  const errors: Partial<Record<SalaryField, string>> = {};
  const annualGross = readAmount(values.annualGross);
  const annualDeductions = readAmount(values.annualDeductions);

  if (annualGross === null) {
    errors.annualGross = "Enter your annual gross salary.";
  } else if (annualGross <= 0) {
    errors.annualGross = "Gross salary must be greater than ₹0.";
  } else if (annualGross > SALARY_LIMITS.maxAnnualGross) {
    errors.annualGross = "Gross salary exceeds the supported limit of ₹1,000,000,000 per year.";
  }

  if (annualDeductions === null) {
    errors.annualDeductions = "Enter annual deductions, or enter 0 if you have none.";
  } else if (annualDeductions < 0) {
    errors.annualDeductions = "Deductions cannot be negative.";
  } else if (annualGross !== null && annualDeductions > annualGross) {
    errors.annualDeductions = "Deductions cannot exceed gross salary.";
  }

  if (!(values.frequency in PERIODS_PER_YEAR)) {
    errors.frequency = "Choose a supported pay frequency.";
  }

  if (Object.keys(errors).length || annualGross === null || annualDeductions === null) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    input: {
      annualGross,
      annualDeductions,
      frequency: values.frequency,
    },
  };
}

/** Calculates from already-validated values and throws on unsafe/direct invalid calls. */
export function calculateSalary(input: SalaryInput): SalaryResult {
  const { annualGross, annualDeductions, frequency } = input;
  if (!Number.isFinite(annualGross) || annualGross <= 0 || annualGross > SALARY_LIMITS.maxAnnualGross) {
    throw new RangeError("Gross salary is out of range.");
  }
  if (!Number.isFinite(annualDeductions) || annualDeductions < 0 || annualDeductions > annualGross) {
    throw new RangeError("Annual deductions must be between zero and gross salary.");
  }
  if (!(frequency in PERIODS_PER_YEAR)) throw new RangeError("Pay frequency is unsupported.");

  const grossPaise = roundPaise(annualGross);
  const deductionPaise = roundPaise(annualDeductions);
  if (!Number.isSafeInteger(grossPaise) || !Number.isSafeInteger(deductionPaise) || deductionPaise > grossPaise) {
    throw new RangeError("Salary values exceed safe calculation limits.");
  }
  const netPaise = grossPaise - deductionPaise;
  const periodsPerYear = PERIODS_PER_YEAR[frequency];
  const grossPerPeriod = averagePaise(grossPaise, periodsPerYear);
  const deductionsPerPeriod = averagePaise(deductionPaise, periodsPerYear);
  const netPerPeriod = grossPerPeriod - deductionsPerPeriod;
  const monthlyGross = averagePaise(grossPaise, 12);
  const monthlyDeductions = averagePaise(deductionPaise, 12);

  return {
    annualGross: fromPaise(grossPaise),
    annualDeductions: fromPaise(deductionPaise),
    annualNet: fromPaise(netPaise),
    grossPerPeriod: fromPaise(grossPerPeriod),
    deductionsPerPeriod: fromPaise(deductionsPerPeriod),
    netPerPeriod: fromPaise(netPerPeriod),
    averageMonthlyGross: fromPaise(monthlyGross),
    averageMonthlyDeductions: fromPaise(monthlyDeductions),
    averageMonthlyNet: fromPaise(monthlyGross - monthlyDeductions),
    periodsPerYear,
    deductionPercent: (deductionPaise / grossPaise) * 100,
  };
}

export function formatSalaryInr(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
