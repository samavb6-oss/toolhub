/**
 * BMI calculation helpers. BMI is a population-level screening measure, not a diagnosis.
 * Categories are the WHO adult (18+) cut-offs; they do not apply to children or teenagers.
 */

export type BmiUnitSystem = "metric" | "imperial";

export type BmiCategoryId = "underweight" | "normal" | "overweight" | "obesity";

export interface BmiCategory {
  id: BmiCategoryId;
  label: string;
  /** Human-readable BMI range, e.g. "18.5 – 24.9". */
  range: string;
}

export const BMI_CATEGORIES: ReadonlyArray<BmiCategory> = [
  { id: "underweight", label: "Underweight", range: "below 18.5" },
  { id: "normal", label: "Healthy weight range", range: "18.5 – 24.9" },
  { id: "overweight", label: "Overweight", range: "25 – 29.9" },
  { id: "obesity", label: "Obesity range", range: "30 and above" },
];

/** Plausible human limits. Values outside them are treated as typing mistakes, not calculated. */
export const BMI_LIMITS = {
  heightCm: { min: 50, max: 272 },
  weightKg: { min: 2, max: 650 },
} as const;

export const CM_PER_INCH = 2.54;
export const KG_PER_POUND = 0.45359237;
const INCHES_PER_FOOT = 12;

export interface BmiInput {
  unit: BmiUnitSystem;
  /** Metric height in centimetres. */
  heightCm: string;
  /** Imperial height, whole feet and inches (inches may be fractional). */
  heightFt: string;
  heightIn: string;
  /** Kilograms (metric) or pounds (imperial). */
  weight: string;
}

export type BmiField = "height" | "weight";

export type BmiResult =
  | { ok: true; bmi: number; category: BmiCategory; heightCm: number; weightKg: number; healthyWeightKg: { min: number; max: number } }
  | { ok: false; empty: boolean; errors: Partial<Record<BmiField, string>> };

type Parsed = { value: number } | { blank: true } | { error: string };

const DECIMAL = /^(?:\d+\.?\d*|\.\d+)$/;

/** Parses a plain non-negative decimal. Rejects signs, exponents, separators, units and other text. */
function parseDecimal(text: string, what: string): Parsed {
  const trimmed = text.trim();
  if (trimmed === "") return { blank: true };
  if (!DECIMAL.test(trimmed)) return { error: `Enter ${what} as a plain number, for example 70 or 70.5.` };
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return { error: `Enter a realistic ${what}.` };
  return { value };
}

/** Rounds to one decimal place the way the result is displayed. */
export function roundBmi(value: number): number {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}

export function categorizeBmi(bmi: number): BmiCategory {
  // Classification uses the full-precision BMI; rounding is presentation-only.
  const id: BmiCategoryId = bmi < 18.5 ? "underweight" : bmi < 25 ? "normal" : bmi < 30 ? "overweight" : "obesity";
  return BMI_CATEGORIES.find((category) => category.id === id)!;
}

/** Pure BMI formula for already-validated metric values. Returns NaN for non-positive or non-finite inputs. */
export function calculateBmi(weightKg: number, heightCm: number): number {
  if (!Number.isFinite(weightKg) || !Number.isFinite(heightCm) || weightKg <= 0 || heightCm <= 0) return Number.NaN;
  const meters = heightCm / 100;
  return weightKg / (meters * meters);
}

/** Weights that give a BMI of 18.5 and 24.9 at this height. */
export function healthyWeightRangeKg(heightCm: number): { min: number; max: number } {
  const meters = heightCm / 100;
  return { min: 18.5 * meters * meters, max: 24.9 * meters * meters };
}

export function kgToPounds(kg: number): number {
  return kg / KG_PER_POUND;
}

function resolveHeightCm(input: BmiInput): { cm: number } | { blank: true } | { error: string } {
  if (input.unit === "metric") {
    const parsed = parseDecimal(input.heightCm, "your height in centimetres");
    if ("blank" in parsed || "error" in parsed) return parsed;
    return { cm: parsed.value };
  }
  const feet = parseDecimal(input.heightFt, "feet");
  const inches = parseDecimal(input.heightIn, "inches");
  if ("error" in feet) return feet;
  if ("error" in inches) return inches;
  if ("blank" in feet && "blank" in inches) return { blank: true };
  const ft = "value" in feet ? feet.value : 0;
  const inch = "value" in inches ? inches.value : 0;
  if (!Number.isInteger(ft)) return { error: "Enter whole feet, and put any remainder in inches." };
  if (inch >= INCHES_PER_FOOT) return { error: "Inches must be less than 12. Add whole feet to the feet box instead." };
  return { cm: (ft * INCHES_PER_FOOT + inch) * CM_PER_INCH };
}

/** Validates the form values and, when they are usable, returns the BMI with its category. */
export function evaluateBmi(input: BmiInput): BmiResult {
  const errors: Partial<Record<BmiField, string>> = {};
  let heightCm: number | undefined;
  let weightKg: number | undefined;
  let heightBlank = false;
  let weightBlank = false;

  const height = resolveHeightCm(input);
  if ("cm" in height) {
    if (height.cm < BMI_LIMITS.heightCm.min || height.cm > BMI_LIMITS.heightCm.max) {
      errors.height = input.unit === "metric"
        ? `Height should be between ${BMI_LIMITS.heightCm.min} and ${BMI_LIMITS.heightCm.max} cm.`
        : "Height should be between about 1 ft 8 in and 8 ft 11 in.";
    } else heightCm = height.cm;
  } else if ("error" in height) errors.height = height.error;
  else heightBlank = true;

  const weight = parseDecimal(input.weight, input.unit === "metric" ? "your weight in kilograms" : "your weight in pounds");
  if ("value" in weight) {
    const kg = input.unit === "metric" ? weight.value : weight.value * KG_PER_POUND;
    if (kg < BMI_LIMITS.weightKg.min || kg > BMI_LIMITS.weightKg.max) {
      errors.weight = input.unit === "metric"
        ? `Weight should be between ${BMI_LIMITS.weightKg.min} and ${BMI_LIMITS.weightKg.max} kg.`
        : `Weight should be between ${Math.ceil(kgToPounds(BMI_LIMITS.weightKg.min))} and ${Math.floor(kgToPounds(BMI_LIMITS.weightKg.max))} lb.`;
    } else weightKg = kg;
  } else if ("error" in weight) errors.weight = weight.error;
  else weightBlank = true;

  if (heightCm === undefined || weightKg === undefined) {
    return { ok: false, empty: heightBlank && weightBlank && Object.keys(errors).length === 0, errors };
  }
  const bmi = calculateBmi(weightKg, heightCm);
  if (!Number.isFinite(bmi)) return { ok: false, empty: false, errors: { height: "Those values could not be calculated. Check them and try again." } };
  return { ok: true, bmi: roundBmi(bmi), category: categorizeBmi(bmi), heightCm, weightKg, healthyWeightKg: healthyWeightRangeKg(heightCm) };
}
