import test from "node:test";
import assert from "node:assert/strict";
import {
  fitRectangle,
  isValidImageDimensions,
  ratioForPreset,
  MAX_IMAGE_DIMENSION,
  MAX_IMAGE_PIXELS,
} from "../src/tools/imageResizeLogic.ts";

test("aspect presets resolve to their expected ratios", () => {
  const original = { width: 1200, height: 800 };
  assert.equal(ratioForPreset("original", original), 1.5);
  assert.equal(ratioForPreset("9:16", original), 9 / 16);
  assert.equal(ratioForPreset("16:9", original), 16 / 9);
  assert.equal(ratioForPreset("1:1", original), 1);
  assert.equal(ratioForPreset("4:5", original), 4 / 5);
  assert.equal(ratioForPreset("4:3", original), 4 / 3);
  assert.equal(ratioForPreset("3:2", original), 1.5);
  assert.equal(ratioForPreset("custom", original), null);
  assert.equal(ratioForPreset("original", null), null);
});

test("dimension validation accepts normal dimensions and the exact pixel limit", () => {
  assert.equal(isValidImageDimensions({ width: 1, height: 1 }), true);
  assert.equal(isValidImageDimensions({ width: 10_000, height: 8_000 }), true);
  assert.equal(isValidImageDimensions({ width: MAX_IMAGE_DIMENSION, height: 2_000 }), true);
  assert.equal(MAX_IMAGE_DIMENSION * 2_000, MAX_IMAGE_PIXELS);
});

test("dimension validation rejects fractional, zero, negative and non-finite values", () => {
  for (const dimensions of [
    { width: 1.5, height: 10 },
    { width: 0, height: 10 },
    { width: -1, height: 10 },
    { width: Number.NaN, height: 10 },
    { width: Number.POSITIVE_INFINITY, height: 1 },
    { width: 10, height: Number.NEGATIVE_INFINITY },
  ]) assert.equal(isValidImageDimensions(dimensions), false);
});

test("dimension validation enforces side and 80-megapixel limits", () => {
  assert.equal(isValidImageDimensions({ width: MAX_IMAGE_DIMENSION + 1, height: 1 }), false);
  assert.equal(isValidImageDimensions({ width: 40_000, height: 2_001 }), false);
  assert.equal(isValidImageDimensions({ width: 80_000_000, height: 1 }), false);
});

test("contain fits the full source inside the target without cropping", () => {
  assert.deepEqual(fitRectangle({ width: 1600, height: 900 }, { width: 400, height: 400 }, "contain"), {
    x: 0, y: 87.5, width: 400, height: 225,
  });
});

test("cover fills the target and centers the cropped excess", () => {
  assert.deepEqual(fitRectangle({ width: 1600, height: 900 }, { width: 400, height: 400 }, "cover"), {
    x: -155.55555555555554, y: 0, width: 711.1111111111111, height: 400,
  });
});
