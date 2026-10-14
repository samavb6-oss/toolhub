import test from "node:test";
import assert from "node:assert/strict";
import { calculateGst } from "../src/tools/gstCalculatorLogic.ts";

function value(amount: number | string, rate: number | string, mode: "exclusive" | "inclusive" = "exclusive", type: "intra-state" | "inter-state" = "intra-state") {
  const result = calculateGst(amount, rate, mode, type);
  assert.equal(result.ok, true, result.ok ? undefined : result.error);
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

test("adds 5%, 12%, 18% and 28% GST to a base amount", () => {
  assert.deepEqual([5, 12, 18, 28].map((rate) => value(1000, rate).gstAmount), [50, 120, 180, 280]);
});

test("exclusive intra-state GST splits into CGST and SGST", () => {
  const result = value(1000, 18);
  assert.equal(result.baseAmount, 1000);
  assert.equal(result.cgst, 90);
  assert.equal(result.sgst, 90);
  assert.equal(result.igst, 0);
  assert.equal(result.totalAmount, 1180);
});

test("exclusive inter-state GST is shown as IGST only", () => {
  const result = value(1000, 18, "exclusive", "inter-state");
  assert.equal(result.igst, 180);
  assert.equal(result.cgst, 0);
  assert.equal(result.sgst, 0);
});

test("extracts GST from inclusive totals", () => {
  const result = value(1180, 18, "inclusive");
  assert.equal(result.baseAmount, 1000);
  assert.equal(result.gstAmount, 180);
  assert.equal(result.totalAmount, 1180);
});

test("rounds half-up to paise for exclusive calculations", () => {
  const result = value("0.05", 10);
  assert.equal(result.gstAmount, 0.01);
  assert.equal(result.totalAmount, 0.06);
});

test("handles zero amounts and zero rates", () => {
  assert.equal(value(0, 18).totalAmount, 0);
  assert.equal(value(123.45, 0).gstAmount, 0);
  assert.equal(value(123.45, 0, "inclusive").baseAmount, 123.45);
});

test("splits odd paise deterministically without losing total tax", () => {
  const result = value("0.01", 100);
  assert.equal(result.gstAmount, 0.01);
  assert.equal(result.cgst + result.sgst, result.gstAmount);
});

test("accepts the 100% rate boundary", () => {
  assert.equal(value(50, 100).totalAmount, 100);
  assert.equal(value(100, 100, "inclusive").baseAmount, 50);
});

test("rejects empty, negative, non-finite, and unrepresentably large amounts", () => {
  for (const amount of ["", -1, "-0.01", "nope", Infinity, NaN, Number.MAX_VALUE]) {
    assert.equal(calculateGst(amount, 18).ok, false, `amount ${String(amount)} should be rejected`);
  }
});

test("rejects invalid rates and invalid modes or supply types", () => {
  for (const rate of ["", -0.01, 100.01, Infinity, NaN, "x"]) assert.equal(calculateGst(100, rate).ok, false);
  assert.equal(calculateGst(100, 18, "other" as never).ok, false);
  assert.equal(calculateGst(100, 18, "exclusive", "other" as never).ok, false);
});

test("accepts decimal rupee inputs and rounds input precision to paise", () => {
  assert.equal(value("123.456", 0).baseAmount, 123.46);
});

test("supports a zero-rate inter-state supply without GST", () => {
  const result = value("999.99", 0, "exclusive", "inter-state");
  assert.equal(result.gstAmount, 0);
  assert.equal(result.igst, 0);
  assert.equal(result.totalAmount, 999.99);
});

test("extracts inclusive GST as IGST for inter-state supplies", () => {
  const result = value(1180, 18, "inclusive", "inter-state");
  assert.equal(result.baseAmount, 1000);
  assert.equal(result.igst, 180);
  assert.equal(result.cgst, 0);
  assert.equal(result.sgst, 0);
});

test("extracts inclusive GST into CGST and SGST for intra-state supplies", () => {
  const result = value(112, 12, "inclusive", "intra-state");
  assert.equal(result.baseAmount, 100);
  assert.equal(result.cgst, 6);
  assert.equal(result.sgst, 6);
});

test("preserves the entered inclusive total when the tax is fractional", () => {
  const result = value("10.01", 18, "inclusive");
  assert.equal(result.totalAmount, 10.01);
  assert.equal(Math.round((result.baseAmount + result.gstAmount) * 100), 1001);
});

test("supports fractional percentage rates", () => {
  const result = value(1000, "2.5");
  assert.equal(result.gstAmount, 25);
  assert.equal(result.totalAmount, 1025);
});


test("rounds large fractional-rate calculations exactly to paise", () => {
  // The exact tax is 7,029,844,571,352.499 paise: half-up must round down.
  // Both base and total remain inside the calculator's representable output range.
  const result = value("70298445713524.99", "0.1");
  assert.equal(result.baseAmount, 70298445713524.99);
  assert.equal(result.gstAmount, 70298445713.52);
  assert.equal(result.totalAmount, 70368744159238.51);
});

test("rounds input amounts down to the nearest paise when appropriate", () => {
  assert.equal(value("12.344", 0).baseAmount, 12.34);
});

test("rounds input amounts up at a half-paise boundary", () => {
  assert.equal(value("12.345", 0).baseAmount, 12.35);
});

test("rounds larger half-paise boundaries correctly for strings and numbers", () => {
  assert.equal(value("10000.005", 0).baseAmount, 10000.01);
  assert.equal(value(10000.005, 0).baseAmount, 10000.01);
});

test("accepts scientific-notation amounts without losing decimal rounding", () => {
  assert.equal(value("1e3", 0).baseAmount, 1000);
  assert.equal(value(1e-7, 0).baseAmount, 0);
});

test("rejects whitespace-only amount input", () => {
  assert.equal(calculateGst("   ", 18).ok, false);
});

test("rejects whitespace-only rate input", () => {
  assert.equal(calculateGst(100, "   ").ok, false);
});

test("rejects calculations whose intermediate tax multiplication is unsafe", () => {
  assert.equal(calculateGst("90000000000000", 100).ok, false);
});

test("keeps all tax components at zero for a zero inclusive total", () => {
  const result = value(0, 18, "inclusive", "inter-state");
  assert.equal(result.baseAmount, 0);
  assert.equal(result.gstAmount, 0);
  assert.equal(result.igst, 0);
});

test("rounds a non-even intra-state split while preserving the tax sum", () => {
  const result = value("0.03", 100);
  assert.equal(result.gstAmount, 0.03);
  assert.equal(result.cgst, 0.01);
  assert.equal(result.sgst, 0.02);
  assert.equal(result.cgst + result.sgst, result.gstAmount);
});
