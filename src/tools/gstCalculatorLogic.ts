/**
 * GST arithmetic helpers for ToolHub.
 * Monetary inputs/outputs are INR and are rounded to the nearest paise (half up).
 * This is a generic estimator; it does not determine the legally applicable rate.
 */
export type GstMode = "exclusive" | "inclusive";
export type SupplyType = "intra-state" | "inter-state";

export type GstCalculation = {
  baseAmount: number;
  gstAmount: number;
  totalAmount: number;
  rate: number;
  supplyType: SupplyType;
  cgst: number;
  sgst: number;
  igst: number;
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

function roundTaxPaise(amountPaise: number, rate: number): number | null {
  // Guard the multiplication before rounding to avoid silently losing paise precision.
  if (rate === 0) return 0;
  if (amountPaise > MAX_SAFE_PAISE / rate) return null;
  return Math.round((amountPaise * rate) / 100 + Number.EPSILON);
}

function fromPaise(paise: number): number {
  return paise / 100;
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

  if (typeof rate === "string" && rate.trim() === "") {
    return { ok: false, error: "Enter a GST rate between 0% and 100%." };
  }
  const numericRate = typeof rate === "number" ? rate : Number(rate);
  if (!Number.isFinite(numericRate) || numericRate < 0 || numericRate > 100) {
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
    const denominator = 1 + numericRate / 100;
    basePaise = Math.round(amountPaise / denominator);
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
    },
  };
}
