/**
 * Dividend Calculator: estimates dividend payments from user-entered assumptions.
 * Dividend per share is entered per payment; annual income multiplies it by the
 * selected number of payments. No live prices, declared-dividend data or tax rules
 * are fetched or inferred.
 */
export const DIVIDEND_LIMITS = {
  maxShares: 1_000_000,
  maxDividendPerShare: 1_000_000,
  maxSharePrice: 10_000_000,
  maxPaymentsPerYear: 12,
} as const;

export type DividendFormValues = {
  shares: string;
  dividendPerShare: string;
  paymentsPerYear: string;
  sharePrice: string;
};

export type DividendField = keyof DividendFormValues;

export type DividendInput = {
  shares: number;
  dividendPerShare: number;
  paymentsPerYear: number;
  sharePrice: number | null;
};

export type DividendValidation =
  | { ok: true; input: DividendInput }
  | { ok: false; errors: Partial<Record<DividendField, string>> };

export type DividendResult = {
  shares: number;
  dividendPerShare: number;
  paymentsPerYear: number;
  dividendPerPayment: number;
  estimatedAnnualDividend: number;
  sharePrice: number | null;
  estimatedInvestmentValue: number | null;
  estimatedAnnualYieldPercent: number | null;
};

function readAmount(value: string): number | null {
  if (!value.trim()) return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}

function roundMoney(value: number): number {
  if (!Number.isFinite(value) || value < 0) throw new RangeError("Money must be finite and non-negative.");
  // Round the shortest decimal representation to paise with integer arithmetic.
  // This avoids relying on Number.EPSILON at large rupee magnitudes.
  const match = /^(\d+)(?:\.(\d*))?(?:e([+-]?\d+))?$/.exec(String(value).toLowerCase());
  if (!match) throw new RangeError("Money cannot be represented as a decimal.");
  const fraction = match[2] ?? "";
  const exponent = Number(match[3] ?? "0");
  let numerator = BigInt(match[1] + fraction) * 100n;
  const scale = fraction.length - exponent;
  let denominator = 1n;
  if (scale > 0) denominator = 10n ** BigInt(scale);
  else if (scale < 0) numerator *= 10n ** BigInt(-scale);
  const paise = Number((2n * numerator + denominator) / (2n * denominator));
  if (!Number.isSafeInteger(paise)) throw new RangeError("Money exceeds safe calculation limits.");
  return paise / 100;
}

export function validateDividendForm(values: DividendFormValues): DividendValidation {
  const errors: Partial<Record<DividendField, string>> = {};
  const shares = readAmount(values.shares);
  const dividendPerShare = readAmount(values.dividendPerShare);
  const paymentsPerYear = readAmount(values.paymentsPerYear);
  const sharePrice = values.sharePrice.trim() === "" ? null : readAmount(values.sharePrice);

  if (shares === null) {
    errors.shares = "Enter the number of shares you own.";
  } else if (!Number.isInteger(shares) || shares < 1 || shares > DIVIDEND_LIMITS.maxShares) {
    errors.shares = `Shares must be a whole number from 1 to ${DIVIDEND_LIMITS.maxShares.toLocaleString("en-IN")}.`;
  }

  if (dividendPerShare === null) {
    errors.dividendPerShare = "Enter the dividend amount per share for one payment.";
  } else if (dividendPerShare < 0 || dividendPerShare > DIVIDEND_LIMITS.maxDividendPerShare) {
    errors.dividendPerShare = "Dividend per share must be between ₹0 and ₹1,000,000.";
  }

  if (paymentsPerYear === null) {
    errors.paymentsPerYear = "Enter the expected number of dividend payments per year.";
  } else if (!Number.isInteger(paymentsPerYear) || paymentsPerYear < 1 || paymentsPerYear > DIVIDEND_LIMITS.maxPaymentsPerYear) {
    errors.paymentsPerYear = "Payments per year must be a whole number from 1 to 12.";
  }

  if (values.sharePrice.trim() !== "") {
    if (sharePrice === null || sharePrice <= 0 || sharePrice > DIVIDEND_LIMITS.maxSharePrice) {
      errors.sharePrice = "Share price must be greater than ₹0 and no more than ₹10,000,000, or leave it blank.";
    }
  }

  if (Object.keys(errors).length || shares === null || dividendPerShare === null || paymentsPerYear === null) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    input: {
      shares,
      dividendPerShare,
      paymentsPerYear,
      sharePrice,
    },
  };
}

export function calculateDividend(input: DividendInput): DividendResult {
  const { shares, dividendPerShare, paymentsPerYear, sharePrice } = input;
  if (!Number.isInteger(shares) || shares < 1 || shares > DIVIDEND_LIMITS.maxShares) {
    throw new RangeError("Share count is out of range.");
  }
  if (!Number.isFinite(dividendPerShare) || dividendPerShare < 0 || dividendPerShare > DIVIDEND_LIMITS.maxDividendPerShare) {
    throw new RangeError("Dividend per share is out of range.");
  }
  if (!Number.isInteger(paymentsPerYear) || paymentsPerYear < 1 || paymentsPerYear > DIVIDEND_LIMITS.maxPaymentsPerYear) {
    throw new RangeError("Payments per year must be an integer from 1 to 12.");
  }
  if (sharePrice !== null && (!Number.isFinite(sharePrice) || sharePrice <= 0 || sharePrice > DIVIDEND_LIMITS.maxSharePrice)) {
    throw new RangeError("Share price is out of range.");
  }

  const dividendPerPayment = roundMoney(shares * dividendPerShare);
  const estimatedAnnualDividend = roundMoney(dividendPerPayment * paymentsPerYear);
  const estimatedInvestmentValue = sharePrice === null ? null : roundMoney(shares * sharePrice);
  const estimatedAnnualYieldPercent =
    sharePrice === null ? null : (estimatedAnnualDividend / estimatedInvestmentValue!) * 100;

  return {
    shares,
    dividendPerShare: roundMoney(dividendPerShare),
    paymentsPerYear,
    dividendPerPayment,
    estimatedAnnualDividend,
    sharePrice,
    estimatedInvestmentValue,
    estimatedAnnualYieldPercent,
  };
}

export function formatDividendInr(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
