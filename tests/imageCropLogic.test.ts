import test from "node:test";
import assert from "node:assert/strict";
import { clampCropRectangle, cropRectangleFromDrag, isValidCropRectangle } from "../src/tools/imageCropLogic.ts";

const image = { width: 1200, height: 800 };

test("drag selection normalizes direction and produces a crop rectangle", () => {
  assert.deepEqual(cropRectangleFromDrag({ x: 900, y: 700 }, { x: 100, y: 200 }, image), {
    x: 100, y: 200, width: 800, height: 500,
  });
});

test("crop selection clamps out-of-bounds and fractional values", () => {
  assert.deepEqual(clampCropRectangle({ x: -5, y: 10.4, width: 5000, height: 100.2 }, image), {
    x: 0, y: 10, width: 1200, height: 100,
  });
});

test("crop selection handles non-finite values safely", () => {
  assert.deepEqual(clampCropRectangle({ x: Number.NaN, y: Number.POSITIVE_INFINITY, width: Number.NaN, height: -2 }, image), {
    x: 0, y: 0, width: 1200, height: 1,
  });
});

test("crop validation accepts an in-bounds rectangle and rejects invalid edges", () => {
  assert.equal(isValidCropRectangle({ x: 0, y: 0, width: 1200, height: 800 }, image), true);
  assert.equal(isValidCropRectangle({ x: 100, y: 100, width: 500, height: 400 }, image), true);
  assert.equal(isValidCropRectangle({ x: 1100, y: 0, width: 101, height: 100 }, image), false);
  assert.equal(isValidCropRectangle({ x: 0, y: 799, width: 1, height: 2 }, image), false);
  assert.equal(isValidCropRectangle({ x: 0.5, y: 0, width: 1, height: 1 }, image), false);
  assert.equal(isValidCropRectangle({ x: 0, y: 0, width: 0, height: 1 }, image), false);
});

test("crop validation rejects an image outside processing limits", () => {
  assert.equal(isValidCropRectangle({ x: 0, y: 0, width: 1, height: 1 }, { width: 100_000, height: 1 }), false);
});