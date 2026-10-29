import test from "node:test";
import assert from "node:assert/strict";
import { convertUnitValue, unitOptions, type UnitKind } from "../src/tools/unitConverterLogic.ts";

test("each unit category has unique, usable units", () => {
  const kinds: UnitKind[] = ["length", "weight", "temperature", "area", "volume", "time"];
  for (const kind of kinds) {
    assert.ok(unitOptions[kind].length >= 3, `${kind} should expose several units`);
    assert.equal(new Set(unitOptions[kind].map((unit) => unit.value)).size, unitOptions[kind].length);
  }
});

test("length, weight, area, volume and time convert accurately", () => {
  assert.equal(convertUnitValue(1, "length", "km", "m"), 1000);
  assert.equal(convertUnitValue(1, "weight", "kg", "lb"), 1 / 0.45359237);
  assert.equal(convertUnitValue(1, "area", "ha", "m2"), 10000);
  assert.equal(convertUnitValue(1, "volume", "l", "ml"), 1000);
  assert.equal(convertUnitValue(2, "time", "h", "min"), 120);
});

test("temperature conversions use the correct formulas", () => {
  assert.equal(convertUnitValue(0, "temperature", "c", "f"), 32);
  assert.equal(convertUnitValue(32, "temperature", "f", "c"), 0);
  assert.equal(convertUnitValue(0, "temperature", "c", "k"), 273.15);
  assert.equal(convertUnitValue(273.15, "temperature", "k", "c"), 0);
});

test("invalid values and unknown units return NaN", () => {
  assert.ok(Number.isNaN(convertUnitValue(Number.NaN, "length", "m", "ft")));
  assert.ok(Number.isNaN(convertUnitValue(1, "length", "unknown", "m")));
  assert.ok(Number.isNaN(convertUnitValue(100, "temperature", "unknown", "c")));
  assert.ok(Number.isNaN(convertUnitValue(100, "temperature", "c", "unknown")));
});
