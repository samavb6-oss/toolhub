/**
 * Loan Calculator: pure calculation and validation logic.
 *
 * This module is intentionally independent of `basicToolLogic.ts` (which holds
 * the shared EMI maths) so the Loan Calculator can evolve without touching it.
 *
 * Method
 * ------
 * - Standard reducing-balance loan: fixed monthly payment, interest charged each
 *   month on the outstanding balance at (annual rate / 12).
 *     EMI = P * r / (1 - (1 + r)^-n),  r = annualRate / 1200
 *   evaluated as P * r / -expm1(-n * log1p(r)) for numerical stability.
 *   An explicit zero-rate branch is used: EMI = P / n.
 * - Money is handled as whole paise (integers). The EMI and every month's interest
 *   are rounded to the nearest paisa (ties round up). Because each row is rounded,
 *   the figures always add up exactly: principal paid + interest paid = payment,
 *   and total principal paid = the loan amount.
 * - The final payment absorbs the accumulated rounding difference so the balance
 *   closes at exactly zero. It can therefore differ from the regular payment by
 *   a few rupees at most.
 * - An optional fixed extra monthly payment shortens the loan; the schedule ends
 *   when the balance reaches zero.
 */

export const LOAN_LIMITS = {
  /** Keeps every intermediate paise value below Number.MAX_SAFE_INTEGER. */
  maxPrincipal: 100_000_000_000,
  maxAnnualRate: 100,
  maxTermMonths: 600,
  maxYears: 50,
} as const;

export type LoanFormValues = {
  principal: string;
  annualRate: string;
  years: string;
  months: string;
  extraPayment: string;
};

export type LoanFormField = keyof LoanFormValues | "term";

export type LoanInput = {
  /** Loan amount in rupees (decimals allowed; rounded to the nearest paisa). */
  principal: number;
  /** Nominal annual interest rate in percent, e.g. 8.5. */
  annualRate: number;
  /** Total repayment term in whole months. */
  termMonths: number;
  /** Optional additional payment each month, in rupees (0 for none). */
  extraPayment: number;
};

export type LoanValidation =
  | { ok: true; input: LoanInput }
  | { ok: false; errors: Partial<Record<LoanFormField, string>> };

export type YearSummary = {
  year: number;
  payments: number;
  principalPaid: number;
  interestPaid: number;
  closingBalance: number;
};

export type LoanScenario = {
  numberOfPayments: number;
  totalPayment: number;
  totalInterest: number;
};

export type LoanResult = {
  /** Scheduled regular monthly payment (EMI), rounded to the nearest paisa. */
  monthlyPayment: number;
  /** Regular payment plus any extra payment. */
  monthlyPaymentWithExtra: number;
  /** Final payment, which absorbs rounding and any shortened last month. */
  finalPayment: number;
  numberOfPayments: number;
  totalPrincipal: number;
  totalInterest: number;
  totalPayment: number;
  /** Percentage (0-100) of total repayment that is interest. */
  interestPercent: number;
  /** Percentage (0-100) of total repayment that is principal. */
  principalPercent: number;
  /** The same loan with no extra payment, for comparison. */
  withoutExtra: LoanScenario;
  interestSaved: number;
  monthsSaved: number;
  yearly: YearSummary[];
};

type PaiseRow = { month: number; payment: number; principal: number; interest: number; balance: number };
type PaiseSchedule = { rows: PaiseRow[]; emi: number };

const roundHalfUp = (value: number): number => Math.floor(value + 0.5);
const toPaise = (rupees: number): number => roundHalfUp(rupees * 100);
const toRupees = (paise: number): number => paise / 100;

function paiseEmi(principalPaise: number, annualRate: number, months: number): number {
  const monthlyRate = annualRate / 1200;
  const exact = monthlyRate === 0
    ? principalPaise / months
    : principalPaise * (monthlyRate / -Math.expm1(-months * Math.log1p(monthlyRate)));
  // A payment of at least one paisa guarantees progress for very small loans.
  return Math.max(1, roundHalfUp(exact));
}

function buildSchedule(principalPaise: number, annualRate: number, termMonths: number, extraPaise: number): PaiseSchedule {
  const monthlyRate = annualRate / 1200;
  const emi = paiseEmi(principalPaise, annualRate, termMonths);
  const rows: PaiseRow[] = [];
  let balance = principalPaise;

  for (let month = 1; balance > 0 && month <= termMonths; month += 1) {
    const interest = monthlyRate === 0 ? 0 : roundHalfUp(balance * monthlyRate);
    const owed = balance + interest;
    // Never pay less than the month's interest, so the balance cannot grow.
    const scheduled = Math.max(emi + extraPaise, interest);
    // The last scheduled month clears whatever remains (absorbs rounding drift).
    const payment = month === termMonths ? owed : Math.min(scheduled, owed);
    const principal = payment - interest;
    balance -= principal;
    rows.push({ month, payment, principal, interest, balance });
  }
  return { rows, emi };
}

function summarise(rows: PaiseRow[]): { totalPayment: number; totalInterest: number } {
  let totalPayment = 0;
  let totalInterest = 0;
  for (const row of rows) {
    totalPayment += row.payment;
    totalInterest += row.interest;
  }
  return { totalPayment, totalInterest };
}

/**
 * Calculates the full repayment picture for a validated input.
 * Throws a RangeError if the input is outside the supported limits.
 */
export function calculateLoan(input: LoanInput): LoanResult {
  const { principal, annualRate, termMonths, extraPayment } = input;
  const principalPaise = Number.isFinite(principal) ? toPaise(principal) : Number.NaN;
  const extraPaise = Number.isFinite(extraPayment) ? toPaise(extraPayment) : Number.NaN;
  if (!(principalPaise >= 1) || principal > LOAN_LIMITS.maxPrincipal) throw new RangeError("Loan amount is out of range.");
  if (!Number.isFinite(annualRate) || annualRate < 0 || annualRate > LOAN_LIMITS.maxAnnualRate) throw new RangeError("Interest rate is out of range.");
  if (!Number.isInteger(termMonths) || termMonths < 1 || termMonths > LOAN_LIMITS.maxTermMonths) throw new RangeError("Loan term is out of range.");
  if (!(extraPaise >= 0) || extraPayment > LOAN_LIMITS.maxPrincipal) throw new RangeError("Extra payment is out of range.");

  const actual = buildSchedule(principalPaise, annualRate, termMonths, extraPaise);
  const base = extraPaise === 0 ? actual : buildSchedule(principalPaise, annualRate, termMonths, 0);
  const actualTotals = summarise(actual.rows);
  const baseTotals = summarise(base.rows);

  const yearly: YearSummary[] = [];
  for (const row of actual.rows) {
    const year = Math.ceil(row.month / 12);
    let entry = yearly[yearly.length - 1];
    if (!entry || entry.year !== year) {
      entry = { year, payments: 0, principalPaid: 0, interestPaid: 0, closingBalance: 0 };
      yearly.push(entry);
    }
    entry.payments += 1;
    entry.principalPaid += row.principal;
    entry.interestPaid += row.interest;
    entry.closingBalance = row.balance;
  }

  const interestPercent = (actualTotals.totalInterest / actualTotals.totalPayment) * 100;
  return {
    monthlyPayment: toRupees(actual.emi),
    monthlyPaymentWithExtra: toRupees(actual.emi + extraPaise),
    finalPayment: toRupees(actual.rows[actual.rows.length - 1].payment),
    numberOfPayments: actual.rows.length,
    totalPrincipal: toRupees(principalPaise),
    totalInterest: toRupees(actualTotals.totalInterest),
    totalPayment: toRupees(actualTotals.totalPayment),
    interestPercent,
    principalPercent: 100 - interestPercent,
    withoutExtra: {
      numberOfPayments: base.rows.length,
      totalPayment: toRupees(baseTotals.totalPayment),
      totalInterest: toRupees(baseTotals.totalInterest),
    },
    interestSaved: toRupees(baseTotals.totalInterest - actualTotals.totalInterest),
    monthsSaved: base.rows.length - actual.rows.length,
    yearly: yearly.map((entry) => ({
      year: entry.year,
      payments: entry.payments,
      principalPaid: toRupees(entry.principalPaid),
      interestPaid: toRupees(entry.interestPaid),
      closingBalance: toRupees(entry.closingBalance),
    })),
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const DECIMAL_PATTERN = /^(?:\d+\.?\d*|\.\d+)$/;
const INTEGER_PATTERN = /^\d+$/;

type ParsedNumber = { value: number } | { error: string };

function parseDecimal(text: string, label: string, required: boolean): ParsedNumber {
  const trimmed = text.trim();
  if (trimmed === "") return required ? { error: `Enter ${label}.` } : { value: 0 };
  if (trimmed.startsWith("-")) return { error: `${capitalise(label)} cannot be negative.` };
  if (!DECIMAL_PATTERN.test(trimmed)) return { error: `${capitalise(label)} must be a plain number such as 500000 or 8.5.` };
  const value = Number(trimmed);
  return Number.isFinite(value) ? { value } : { error: `${capitalise(label)} is too large.` };
}

function parseWhole(text: string, label: string): ParsedNumber {
  const trimmed = text.trim();
  if (trimmed === "") return { value: 0 };
  if (trimmed.startsWith("-")) return { error: `${capitalise(label)} cannot be negative.` };
  if (!INTEGER_PATTERN.test(trimmed)) return { error: `${capitalise(label)} must be a whole number.` };
  const value = Number(trimmed);
  return Number.isSafeInteger(value) ? { value } : { error: `${capitalise(label)} is too large.` };
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Validates raw form text and returns either a clean input or per-field messages. */
export function validateLoanForm(values: LoanFormValues): LoanValidation {
  const errors: Partial<Record<LoanFormField, string>> = {};

  const principal = parseDecimal(values.principal, "a loan amount", true);
  if ("error" in principal) errors.principal = principal.error;
  else if (toPaise(principal.value) < 1) errors.principal = "Loan amount must be at least ₹0.01.";
  else if (principal.value > LOAN_LIMITS.maxPrincipal) errors.principal = "Loan amount cannot exceed ₹10,000 crore (₹100,00,00,00,000).";

  const rate = parseDecimal(values.annualRate, "an annual interest rate", true);
  if ("error" in rate) errors.annualRate = rate.error;
  else if (rate.value > LOAN_LIMITS.maxAnnualRate) errors.annualRate = "Interest rate cannot exceed 100% a year.";

  const years = parseWhole(values.years, "years");
  if ("error" in years) {
    errors.years = values.years.includes(".") ? "Years must be a whole number. Use the months field for part of a year." : years.error;
  } else if (years.value > LOAN_LIMITS.maxYears) errors.years = "Years cannot exceed 50.";

  const months = parseWhole(values.months, "months");
  if ("error" in months) {
    errors.months = values.months.includes(".") ? "Months must be a whole number." : months.error;
  }

  if (!errors.years && !errors.months && "value" in years && "value" in months) {
    const total = years.value * 12 + months.value;
    if (total < 1) errors.term = "Enter a loan term of at least 1 month.";
    else if (total > LOAN_LIMITS.maxTermMonths) errors.term = "Loan term cannot exceed 50 years (600 months).";
  }

  const extra = parseDecimal(values.extraPayment, "an extra payment", false);
  if ("error" in extra) errors.extraPayment = extra.error;
  else if (extra.value > LOAN_LIMITS.maxPrincipal) errors.extraPayment = "Extra payment is too large.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    input: {
      principal: (principal as { value: number }).value,
      annualRate: (rate as { value: number }).value,
      termMonths: (years as { value: number }).value * 12 + (months as { value: number }).value,
      extraPayment: (extra as { value: number }).value,
    },
  };
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formats rupees for display with Indian digit grouping and two decimals. */
export function formatInr(value: number): string {
  return inrFormatter.format(value);
}

/** Formats a number of months as "1 year 6 months", "20 years" or "7 months". */
export function formatTerm(totalMonths: number): string {
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? "year" : "years"}`);
  if (months > 0) parts.push(`${months} ${months === 1 ? "month" : "months"}`);
  return parts.join(" ") || "0 months";
}
