export const INTEREST_LIMITS = {
  minPrincipal: 0.01,
  maxPrincipal: 1_000_000_000_000,
  minRate: 0,
  maxRate: 1000,
  minYears: 0,
  maxYears: 100,
} as const;

export type InterestMode = "simple" | "compound";
export type CompoundingFrequency = "annually" | "semi-annually" | "quarterly" | "monthly";
export type InterestInputErrors = { principal?: string; rate?: string; years?: string };
export type InterestResult = {
  principal: number;
  interest: number;
  total: number;
  effectiveAnnualRate: number;
};

// Accept ordinary decimal notation only; blank fields, exponent notation and Infinity
// must not silently become valid numbers.
export function parseInterestNumber(text: string): number {
  const trimmed = text.trim();
  return /^-?(\\d+\\.?\\d*|\\.\\d+)$/.test(trimmed) ? Number(trimmed) : Number.NaN;
}

export function validateInterestInputs(principal: number, annualRate: number, years: number): InterestInputErrors {
  const errors: InterestInputErrors = {};
  if (Number.isNaN(principal)) errors.principal = "Enter the principal as a number.";
  else if (!Number.isFinite(principal) || principal < INTEREST_LIMITS.minPrincipal || principal > INTEREST_LIMITS.maxPrincipal) {
    errors.principal = "Enter a principal from ₹0.01 to ₹1,00,00,00,00,000.";
  }
  if (Number.isNaN(annualRate)) errors.rate = "Enter the annual interest rate as a number.";
  else if (!Number.isFinite(annualRate) || annualRate < INTEREST_LIMITS.minRate || annualRate > INTEREST_LIMITS.maxRate) {
    errors.rate = "Enter an annual rate from 0% to 1,000%.";
  }
  if (Number.isNaN(years)) errors.years = "Enter the duration as a number of whole years.";
  else if (!Number.isInteger(years) || years < INTEREST_LIMITS.minYears || years > INTEREST_LIMITS.maxYears) {
    errors.years = "Enter a whole number of years from 0 to 100.";
  }
  return errors;
}

export function calculateInterest(
  principal: number,
  annualRate: number,
  years: number,
  mode: InterestMode,
  frequency: CompoundingFrequency = "annually",
): InterestResult | null {
  if (Object.keys(validateInterestInputs(principal, annualRate, years)).length) return null;
  if (mode !== "simple" && mode !== "compound") return null;
  const periodsPerYear: Record<CompoundingFrequency, number> = {
    annually: 1, "semi-annually": 2, quarterly: 4, monthly: 12,
  };
  const periods = periodsPerYear[frequency];
  if (!periods) return null;

  const total = mode === "simple"
    ? principal * (1 + (annualRate / 100) * years)
    : principal * Math.pow(1 + annualRate / (100 * periods), periods * years);
  const interest = total - principal;
  const effectiveAnnualRate = mode === "simple"
    ? annualRate
    : (Math.pow(1 + annualRate / (100 * periods), periods) - 1) * 100;

  if (![total, interest, effectiveAnnualRate].every(Number.isFinite) || total < principal || interest < 0) return null;
  return { principal, interest, total, effectiveAnnualRate };
}
