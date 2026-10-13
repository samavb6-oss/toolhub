import test from "node:test";
import assert from "node:assert/strict";
import {
  BMI_CATEGORIES, BMI_LIMITS, calculateBmi, categorizeBmi, evaluateBmi, healthyWeightRangeKg, kgToPounds, roundBmi,
  type BmiInput,
} from "../src/tools/bmiLogic.ts";
import { getToolPathByName, toolDefinitions } from "../src/tools/toolRegistry.ts";

const metric = (heightCm: string, weight: string): BmiInput => ({ unit: "metric", heightCm, heightFt: "", heightIn: "", weight });
const imperial = (heightFt: string, heightIn: string, weight: string): BmiInput => ({ unit: "imperial", heightCm: "", heightFt, heightIn, weight });

test("calculateBmi uses weight / height² in metric units", () => {
  assert.equal(calculateBmi(70, 175), 70 / (1.75 * 1.75));
  assert.ok(Math.abs(calculateBmi(70, 175) - 22.857) < 0.001);
  assert.equal(calculateBmi(100, 100), 100);
});

test("calculateBmi returns NaN for unusable numbers instead of Infinity", () => {
  for (const [w, h] of [[0, 170], [70, 0], [-1, 170], [70, -170], [Number.NaN, 170], [70, Number.POSITIVE_INFINITY]]) {
    assert.ok(Number.isNaN(calculateBmi(w, h)), `${w}, ${h}`);
  }
});

test("WHO adult category boundaries", () => {
  const id = (bmi: number) => categorizeBmi(bmi).id;
  assert.equal(id(10), "underweight");
  assert.equal(id(18.4), "underweight");
  assert.equal(id(18.5), "normal");
  assert.equal(id(24.9), "normal");
  assert.equal(id(25), "overweight");
  assert.equal(id(29.9), "overweight");
  assert.equal(id(30), "obesity");
  assert.equal(id(55), "obesity");
});

test("category always agrees with the displayed one-decimal value", () => {
  assert.equal(roundBmi(24.95), 25);
  assert.equal(categorizeBmi(24.95).id, "overweight"); // shown as 25.0
  assert.equal(categorizeBmi(24.94).id, "normal");     // shown as 24.9
  assert.equal(categorizeBmi(18.46).id, "normal");      // shown as 18.5
  assert.equal(categorizeBmi(18.44).id, "underweight"); // shown as 18.4
});

test("categories are listed in order with ranges", () => {
  assert.deepEqual(BMI_CATEGORIES.map((c) => c.id), ["underweight", "normal", "overweight", "obesity"]);
});

test("metric input produces a rounded BMI and category", () => {
  const result = evaluateBmi(metric("175", "70"));
  assert.ok(result.ok);
  assert.equal(result.bmi, 22.9);
  assert.equal(result.category.id, "normal");
  assert.equal(result.heightCm, 175);
  assert.equal(result.weightKg, 70);
});

test("imperial input converts feet, inches and pounds exactly", () => {
  const result = evaluateBmi(imperial("5", "9", "160"));
  assert.ok(result.ok);
  assert.ok(Math.abs(result.heightCm - 175.26) < 1e-9);
  assert.ok(Math.abs(result.weightKg - 72.5747792) < 1e-6);
  assert.equal(result.bmi, 23.6);
  // Same person in metric agrees.
  const same = evaluateBmi(metric("175.26", "72.5747792"));
  assert.ok(same.ok);
  assert.equal(same.bmi, result.bmi);
});

test("imperial height accepts feet alone, and rejects malformed feet/inches", () => {
  assert.ok(evaluateBmi(imperial("6", "", "180")).ok);
  assert.ok(evaluateBmi(imperial("5", "", "150")).ok);
  for (const [ft, inch] of [["", "70"], ["5.5", "0"], ["5", "12"], ["5", "13"], ["-5", "0"], ["5", "abc"], ["x", "2"]]) {
    const result = evaluateBmi(imperial(ft, inch, "150"));
    assert.ok(!result.ok, `${ft}/${inch}`);
    assert.ok(result.errors.height, `${ft}/${inch}`);
  }
});

test("empty input is reported as empty, not as an error", () => {
  const result = evaluateBmi(metric("", ""));
  assert.ok(!result.ok);
  assert.equal(result.empty, true);
  assert.deepEqual(result.errors, {});
  const half = evaluateBmi(metric("170", ""));
  assert.ok(!half.ok);
  assert.equal(half.empty, false);
  assert.deepEqual(half.errors, {});
  const imperialBlank = evaluateBmi(imperial("", "", ""));
  assert.ok(!imperialBlank.ok && imperialBlank.empty);
});

test("non-numeric, signed, exponent and separator input is rejected per field", () => {
  for (const bad of ["abc", "-70", "+70", "1e2", "0x10", "70kg", "7 0", "1,5", "NaN", "Infinity", "-", ".", "1.2.3"]) {
    const result = evaluateBmi(metric("170", bad));
    assert.ok(!result.ok, bad);
    assert.ok(result.errors.weight, bad);
    assert.equal(result.errors.height, undefined, bad);
    const height = evaluateBmi(metric(bad, "70"));
    assert.ok(!height.ok && height.errors.height, bad);
  }
});

test("zero and negative-looking values are rejected", () => {
  for (const [h, w] of [["0", "70"], ["170", "0"], ["0", "0"], ["0.0", "70"]]) {
    const result = evaluateBmi(metric(h, w));
    assert.ok(!result.ok);
    assert.ok(Object.keys(result.errors).length > 0);
  }
});

test("unreasonable values are rejected with a range message", () => {
  const cases: Array<[BmiInput, "height" | "weight"]> = [
    [metric("49.9", "70"), "height"], [metric("272.1", "70"), "height"], [metric("1.7", "70"), "height"],
    [metric("170", "1.9"), "weight"], [metric("170", "650.1"), "weight"], [metric("170", "99999999999999999999"), "weight"],
    [imperial("1", "7", "150"), "height"], [imperial("9", "0", "150"), "height"],
    [imperial("5", "9", "4"), "weight"], [imperial("5", "9", "1500"), "weight"],
  ];
  for (const [input, field] of cases) {
    const result = evaluateBmi(input);
    assert.ok(!result.ok, JSON.stringify(input));
    assert.ok(result.errors[field], JSON.stringify(input));
  }
});

test("limits themselves are accepted", () => {
  assert.ok(evaluateBmi(metric(String(BMI_LIMITS.heightCm.min), String(BMI_LIMITS.weightKg.min))).ok);
  assert.ok(evaluateBmi(metric(String(BMI_LIMITS.heightCm.max), String(BMI_LIMITS.weightKg.max))).ok);
});

test("both invalid fields are reported together", () => {
  const result = evaluateBmi(metric("abc", "-5"));
  assert.ok(!result.ok);
  assert.ok(result.errors.height && result.errors.weight);
});

test("surrounding whitespace is tolerated and decimals work", () => {
  const result = evaluateBmi(metric("  170.5 ", " 65.25  "));
  assert.ok(result.ok);
  assert.equal(result.bmi, 22.4);
  assert.ok(evaluateBmi(metric(".5e", "70")).ok === false);
  assert.ok(evaluateBmi(metric("170.", "70")).ok);
});

test("extreme but allowed inputs never produce NaN or Infinity", () => {
  for (const input of [metric("50", "650"), metric("272", "2")]) {
    const result = evaluateBmi(input);
    assert.ok(result.ok);
    assert.ok(Number.isFinite(result.bmi));
  }
});

test("healthy weight range corresponds to BMI 18.5 – 24.9", () => {
  const range = healthyWeightRangeKg(170);
  assert.ok(Math.abs(range.min - 53.465) < 1e-9);
  assert.ok(Math.abs(range.max - 71.961) < 1e-9);
  assert.equal(categorizeBmi(calculateBmi(range.min, 170)).id, "normal");
  assert.equal(categorizeBmi(calculateBmi(range.max, 170)).id, "normal");
  assert.ok(Math.abs(kgToPounds(1) - 2.20462262) < 1e-7);
});

test("BMI Calculator is registered, routable by tile name, and has complete SEO metadata", () => {
  const tool = toolDefinitions.find((item) => item.slug === "bmi-calculator");
  assert.ok(tool);
  assert.equal(tool.name, "BMI Calculator");
  assert.equal(tool.category, "Health");
  assert.equal(getToolPathByName("BMI Calculator"), "/tools/bmi-calculator");
  assert.match(tool.title, /BMI/);
  assert.ok(tool.description.length > 50 && tool.description.length <= 200, String(tool.description.length));
  assert.match(tool.description, /screening/i);
  assert.equal(new Set(toolDefinitions.map((item) => item.slug)).size, toolDefinitions.length);
});
