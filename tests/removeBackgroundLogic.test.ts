import assert from "node:assert/strict";
import test from "node:test";
import {
  alphaMatteToRgba,
  backgroundOutputBaseName,
  MAX_BACKGROUND_FILE_BYTES,
  MAX_BACKGROUND_IMAGE_PIXELS,
  validateBackgroundImageDimensions,
  validateBackgroundImageFile,
} from "../src/tools/removeBackgroundLogic.ts";

test("accepts supported image formats with normal dimensions", () => {
  assert.equal(validateBackgroundImageFile({ name: "product.png", type: "image/png", size: 1024 }), null);
  assert.equal(validateBackgroundImageFile({ name: "photo.webp", type: "image/webp", size: 1024 }), null);
  assert.equal(validateBackgroundImageFile({ name: "photo.jpg", type: "", size: 1024 }), null);
  assert.equal(validateBackgroundImageDimensions(4000, 3000), null);
});

test("rejects empty, oversized, and unsupported files", () => {
  assert.match(validateBackgroundImageFile({ name: "empty.png", type: "image/png", size: 0 }) ?? "", /non-empty/);
  assert.match(validateBackgroundImageFile({ name: "huge.png", type: "image/png", size: MAX_BACKGROUND_FILE_BYTES + 1 }) ?? "", /25 MB/);
  assert.match(validateBackgroundImageFile({ name: "image.gif", type: "image/gif", size: 100 }) ?? "", /PNG, JPG/);
});

test("rejects invalid or excessive image dimensions", () => {
  assert.match(validateBackgroundImageDimensions(0, 100) ?? "", /invalid dimensions/);
  assert.match(validateBackgroundImageDimensions(Number.POSITIVE_INFINITY, 100) ?? "", /invalid dimensions/);
  assert.match(validateBackgroundImageDimensions(10_000, 5_000) ?? "", /40 megapixels/);
  assert.equal(validateBackgroundImageDimensions(8_000, 5_000), null);
  assert.equal(8_000 * 5_000, MAX_BACKGROUND_IMAGE_PIXELS);
});

test("creates safe output names without extensions or path characters", () => {
  assert.equal(backgroundOutputBaseName("My product photo.jpg"), "My product photo");
  assert.equal(backgroundOutputBaseName("../portrait.png"), "portrait");
  assert.equal(backgroundOutputBaseName("...jpg"), "image");
  assert.equal(backgroundOutputBaseName("bad:name?.webp"), "bad-name");
});


test("converts a model alpha matte into a white RGBA mask with clamped alpha", () => {
  const pixels = alphaMatteToRgba({ w: 3, h: 1, data: new Float32Array([-1, 0.5, 2]) });
  assert.deepEqual([...pixels], [255, 255, 255, 0, 255, 255, 255, 128, 255, 255, 255, 255]);
});

test("rejects malformed alpha matte dimensions and data lengths", () => {
  assert.throws(() => alphaMatteToRgba({ w: 0, h: 1, data: new Float32Array(0) }), /invalid alpha mask/);
  assert.throws(() => alphaMatteToRgba({ w: 2, h: 2, data: new Float32Array(3) }), /invalid alpha mask/);
});

test("maps non-finite alpha matte values to transparent pixels", () => {
  const pixels = alphaMatteToRgba({ w: 2, h: 1, data: [Number.NaN, Number.POSITIVE_INFINITY] });
  assert.deepEqual([pixels[3], pixels[7]], [0, 0]);
});