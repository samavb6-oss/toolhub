/**
 * GST arithmetic helpers for ToolHub.
 * Monetary inputs/outputs are INR and are rounded to the nearest paise (half up).
 * This is a generic estimator; it does not determine the legally applicable rate.
 */
export type GstMode = "exclusive" | "inclusive";
export type SupplyType = "intra-state" | "inter-state";

export type GstCalculation = {
  // The rupee-valued fields below are convenience approximations (paise / 100). Above 2^46 rupees
  // (₹70,368,744,177,664) a JS number can no longer hold every paisa, so display and compare money
  // with the exact *Paise fields and formatPaiseINR instead.
  baseAmount: number;
  gstAmount: number;
  totalAmount: number;
  rate: number;
  supplyType: SupplyType;
  cgst: number;
  sgst: number;
  igst: number;
  basePaise: number;
  gstPaise: number;
  totalPaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
};

export type GstCalculationResult =
  | { ok: true; value: GstCalculation }
  | { ok: false; error: string };

const MAX_SAFE_PAISE = Number.MAX_SAFE_INTEGER;

/** Expand ordinary or scientific decimal notation without binary floating-point rounding. */
function expandDecimal(value: string): string | null {
  const unsigned = value.startsWith("+") ? value.slice(1) : value;
  if (!unsigned || unsigned.startsWith("-")) return null;
  const parts = unsigned.toLowerCase().split("e");
  if (parts.length > 2) return null;
  const mantissa = parts[0];
  const exponent = parts.length === 2 ? Number(parts[1]) : 0;
  if (!Number.isInteger(exponent) || Math.abs(exponent) > 400) return null;
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(mantissa)) return null;

  const dot = mantissa.indexOf(".");
  const decimalPosition = (dot < 0 ? mantissa.length : dot) + exponent;
  const digits = mantissa.replace(".", "");
  if (decimalPosition <= 0) return `0.${"0".repeat(-decimalPosition)}${digits}`;
  if (decimalPosition >= digits.length) return digits + "0".repeat(decimalPosition - digits.length);
  return `${digits.slice(0, decimalPosition)}.${digits.slice(decimalPosition)}`;
}

/** Convert a non-negative rupee amount to paise using decimal half-up rounding. */
function parseMoneyToPaise(value: number | string): number | null {
  if (typeof value === "string" && value.trim() === "") return null;
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount) || amount < 0) return null;

  // Keep the original decimal text when available: Number("10000.005") cannot represent
  // the exact half-paise boundary, and adding Number.EPSILON is too small at that scale.
  const raw = typeof value === "string" ? value.trim() : String(value);
  const expanded = expandDecimal(raw);
  if (expanded === null) return null;
  const match = /^(\d*)(?:\.(\d*))?$/.exec(expanded);
  if (!match) return null;

  const whole = match[1] || "0";
  const fraction = match[2] || "";
  const firstTwoDecimals = (fraction + "00").slice(0, 2);
  let paise = BigInt(whole) * 100n + BigInt(firstTwoDecimals);
  if ((fraction[2] || "0") >= "5") paise += 1n;

  if (paise > BigInt(MAX_SAFE_PAISE)) return null;
  return Number(paise);
}

function parseRateFraction(rate: number): { numerator: bigint; scale: bigint } | null {
  const expandedRate = expandDecimal(String(rate));
  if (expandedRate === null) return null;
  const match = /^(\d*)(?:\.(\d*))?$/.exec(expandedRate);
  if (!match) return null;

  const whole = match[1] || "0";
  const fraction = match[2] || "";
  return {
    numerator: BigInt(whole + fraction),
    scale: 10n ** BigInt(fraction.length),
  };
}

/** Round a non-negative rational number to the nearest integer, with exact halves up. */
function roundRatioHalfUp(numerator: bigint, denominator: bigint): bigint {
  return (2n * numerator + denominator) / (2n * denominator);
}

function roundTaxPaise(amountPaise: number, rate: number): number | null {
  if (rate === 0) return 0;
  const rateFraction = parseRateFraction(rate);
  if (rateFraction === null) return null;

  // Integer arithmetic avoids floating-point drift at half-paise boundaries.
  const denominator = 100n * rateFraction.scale;
  const numerator = BigInt(amountPaise) * rateFraction.numerator;
  const roundedPaise = roundRatioHalfUp(numerator, denominator);

  if (roundedPaise > BigInt(MAX_SAFE_PAISE)) return null;
  return Number(roundedPaise);
}

function fromPaise(paise: number): number {
  return paise / 100;
}

/** Format safe integer paise directly so large amounts never pass through imprecise rupees. */
export function formatPaiseINR(paise: number): string {
  if (!Number.isSafeInteger(paise) || paise < 0) throw new RangeError("Paise must be a non-negative safe integer.");
  const exactPaise = BigInt(paise);
  const rupees = exactPaise / 100n;
  const cents = String(exactPaise % 100n).padStart(2, "0");
  const whole = new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(rupees);
  return whole + "." + cents;
}

/**
 * Parse a GST rate. Strings must be plain decimal text (optionally scientific), matching the amount
 * parser: Number() alone would also accept "0x12" as 18 and "-0" as negative zero. Returns null when
 * the text is not a plain decimal; range checks stay with the caller.
 */
function parseRate(rate: number | string): number | null {
  if (typeof rate === "number") return rate === 0 ? 0 : rate; // normalise -0 so it never reaches the UI
  const text = rate.trim();
  if (text === "" || expandDecimal(text) === null) return null;
  return Number(text);
}

export function calculateGst(
  amount: number | string,
  rate: number | string,
  mode: GstMode = "exclusive",
  supplyType: SupplyType = "intra-state",
): GstCalculationResult {
  const amountPaise = parseMoneyToPaise(amount);
  if (amountPaise === null) {
    return { ok: false, error: "Enter a valid, non-negative amount with a representable value." };
  }

  const numericRate = parseRate(rate);
  if (numericRate === null || !Number.isFinite(numericRate) || numericRate < 0 || numericRate > 100) {
    return { ok: false, error: "Enter a GST rate between 0% and 100%." };
  }
  if (mode !== "exclusive" && mode !== "inclusive") {
    return { ok: false, error: "Choose whether the amount is before or after GST." };
  }
  if (supplyType !== "intra-state" && supplyType !== "inter-state") {
    return { ok: false, error: "Choose a valid supply type." };
  }

  let basePaise: number;
  let taxPaise: number;
  if (mode === "exclusive") {
    basePaise = amountPaise;
    const calculatedTax = roundTaxPaise(basePaise, numericRate);
    if (calculatedTax === null) {
      return { ok: false, error: "This amount is too large to calculate safely." };
    }
    taxPaise = calculatedTax;
  } else {
    const rateFraction = parseRateFraction(numericRate);
    if (rateFraction === null) {
      return { ok: false, error: "Enter a GST rate between 0% and 100%." };
    }
    // base = inclusive total / (1 + rate / 100), calculated as an exact ratio:
    // totalPaise * rateScale / (100 * rateScale + rateNumerator).
    const denominator = 100n * rateFraction.scale + rateFraction.numerator;
    const numerator = BigInt(amountPaise) * 100n * rateFraction.scale;
    const roundedBasePaise = roundRatioHalfUp(numerator, denominator);
    if (roundedBasePaise > BigInt(MAX_SAFE_PAISE)) {
      return { ok: false, error: "This amount is too large to calculate safely." };
    }
    basePaise = Number(roundedBasePaise);
    taxPaise = amountPaise - basePaise;
  }

  if (!Number.isSafeInteger(basePaise) || !Number.isSafeInteger(taxPaise) || taxPaise < 0) {
    return { ok: false, error: "This amount is too large to calculate safely." };
  }
  const totalPaise = mode === "inclusive" ? amountPaise : basePaise + taxPaise;
  if (!Number.isSafeInteger(totalPaise)) {
    return { ok: false, error: "This amount is too large to calculate safely." };
  }

  const cgstPaise = supplyType === "intra-state" ? Math.floor(taxPaise / 2) : 0;
  const sgstPaise = supplyType === "intra-state" ? taxPaise - cgstPaise : 0;
  const igstPaise = supplyType === "inter-state" ? taxPaise : 0;

  return {
    ok: true,
    value: {
      baseAmount: fromPaise(basePaise),
      gstAmount: fromPaise(taxPaise),
      totalAmount: fromPaise(totalPaise),
      rate: numericRate,
      supplyType,
      cgst: fromPaise(cgstPaise),
      sgst: fromPaise(sgstPaise),
      igst: fromPaise(igstPaise),
      basePaise,
      gstPaise: taxPaise,
      totalPaise,
      cgstPaise,
      sgstPaise,
      igstPaise,
    },
  };
}
