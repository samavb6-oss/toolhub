import test from "node:test";
import assert from "node:assert/strict";
import { calculateInterest, parseInterestNumber, validateInterestInputs, INTEREST_LIMITS } from "../src/tools/interestCalculatorLogic.ts";

test("simple interest matches the standard formula", () => {
  const result = calculateInterest(1000, 5, 3, "simple");
  assert.deepEqual(result, { principal: 1000, interest: 150, total: 1150, effectiveAnnualRate: 5 });
});

test("compound interest matches annual, half-yearly, quarterly and monthly compounding", () => {
  assert.ok(Math.abs(calculateInterest(1000, 10, 2, "compound", "annually")!.total - 1210) < 1e-9);
  assert.ok(Math.abs(calculateInterest(1000, 10, 2, "compound", "semi-annually")!.total - 1215.50625) < 1e-8);
  assert.ok(Math.abs(calculateInterest(1000, 10, 2, "compound", "quarterly")!.total - 1219.889112) < 0.001);
  assert.ok(Math.abs(calculateInterest(1000, 10, 2, "compound", "monthly")!.total - 1220.390045) < 0.001);
});

test("zero rate and zero duration preserve the principal", () => {
  assert.deepEqual(calculateInterest(1234.56, 0, 10, "compound", "monthly"), { principal: 1234.56, interest: 0, total: 1234.56, effectiveAnnualRate: 0 });
  assert.equal(calculateInterest(1234.56, 8, 0, "simple")!.total, 1234.56);
  assert.equal(calculateInterest(1234.56, 8, 0, "compound")!.interest, 0);
});

test("decimal principal and rate remain precise within floating point tolerance", () => {
  const result = calculateInterest(1000.25, 7.5, 4, "simple")!;
  assert.ok(Math.abs(result.interest - 300.075) < 1e-9);
  assert.ok(Math.abs(result.total - 1300.325) < 1e-9);
});

test("rejects invalid, non-finite, out-of-range and fractional inputs", () => {
  const invalid: Array<[number, number, number]> = [
    [0, 5, 2], [-1, 5, 2], [Number.NaN, 5, 2], [Infinity, 5, 2],
    [INTEREST_LIMITS.maxPrincipal * 2, 5, 2], [1000, -1, 2], [1000, 1000.1, 2],
    [1000, Number.NaN, 2], [1000, 5, -1], [1000, 5, 1.5], [1000, 5, 101],
    [1000, 1000, 100,],
  ];
  for (const values of invalid) assert.equal(calculateInterest(...values, "compound"), null, String(values));
  assert.equal(calculateInterest(1000, 5, 2, "unknown" as never), null);
});

test("strict field parser accepts plain decimals and rejects blank or decorated values", () => {
  assert.equal(parseInterestNumber(" 12.5 "), 12.5);
  assert.equal(parseInterestNumber(".5"), 0.5);
  assert.equal(parseInterestNumber("7."), 7);
  for (const value of ["", "  ", "abc", "1e3", "0x10", "Infinity", "NaN", "1,000", "₹500", "+5"]) {
    assert.ok(Number.isNaN(parseInterestNumber(value)), value);
  }
  assert.ok(validateInterestInputs(Number.NaN, 5, 2).principal);
  assert.ok(validateInterestInputs(1000, 5, 2.5).years);
});

test("extreme compounding that overflows is rejected rather than rendered", () => {
  assert.equal(calculateInterest(1e12, 1000, 100, "compound", "monthly"), null);
});
