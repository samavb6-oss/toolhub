import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_JPG_PDF_FILES,
  MAX_JPG_PDF_BYTES,
  validateJpgSelection,
  sanitizeJpgPdfName,
  calculateContainedImageSize,
  JpgToPdfError,
} from "../src/tools/jpgToPdfLogic.ts";

function candidate(name: string, size = 100, type = "image/jpeg") {
  return { name, size, type } as File;
}

test("validates one or more JPG/JPEG files and allows an omitted MIME type", () => {
  assert.equal(validateJpgSelection([candidate("one.jpg"), candidate("two.JPEG", 20, "")]), null);
  assert.equal(validateJpgSelection([]), "No files selected.");
});

test("rejects non-JPEG extensions even when the MIME claims JPEG", () => {
  assert.match(validateJpgSelection([candidate("image.png")]) ?? "", /Only \.jpg and \.jpeg/);
});

test("rejects a provided non-JPEG MIME type", () => {
  assert.match(validateJpgSelection([candidate("image.jpg", 100, "image/png")]) ?? "", /Only JPEG/);
});

test("rejects empty, negative, and non-finite file sizes", () => {
  for (const size of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.match(validateJpgSelection([candidate("empty.jpg", size)]) ?? "", /0 bytes or invalid/);
  }
});

test("enforces the file-count and combined-size limits", () => {
  const many = Array.from({ length: MAX_JPG_PDF_FILES + 1 }, (_, i) => candidate(`image-${i}.jpg`));
  assert.match(validateJpgSelection(many) ?? "", /Too many files/);
  assert.match(validateJpgSelection([candidate("large.jpg", MAX_JPG_PDF_BYTES + 1)]) ?? "", /100 MiB/);
  assert.equal(validateJpgSelection([candidate("max.jpg", MAX_JPG_PDF_BYTES)]), null);
});

test("sanitizes output names and appends converted suffix", () => {
  assert.equal(sanitizeJpgPdfName("holiday.jpg"), "holiday_converted.pdf");
  assert.equal(sanitizeJpgPdfName(String.raw`C:\folder\holiday.jpeg`), "C__folder_holiday_converted.pdf");
  assert.equal(sanitizeJpgPdfName("..jpg"), "document_converted.pdf");
  assert.equal(sanitizeJpgPdfName(""), "document_converted.pdf");
  assert.equal(sanitizeJpgPdfName(".hidden.jpg"), "hidden_converted.pdf");
  assert.equal(sanitizeJpgPdfName("   spaces.jpg"), "spaces_converted.pdf");
  assert.equal(sanitizeJpgPdfName("bad:name.jpg"), "bad_name_converted.pdf");
  assert.match(sanitizeJpgPdfName("bad\u0000name.jpg"), /_converted\.pdf$/);
});

test("contains a landscape image within A4 margins without changing its aspect ratio", () => {
  const result = calculateContainedImageSize(1600, 900);
  assert.ok(result.width <= 595.28 - 72);
  assert.ok(result.height <= 841.89 - 72);
  assert.ok(Math.abs(result.width / result.height - 1600 / 900) < 1e-10);
  assert.ok(Math.abs(result.x - (595.28 - result.width) / 2) < 1e-10);
  assert.ok(Math.abs(result.y - (841.89 - result.height) / 2) < 1e-10);
});

test("contains portrait and square images without stretching", () => {
  for (const [width, height] of [[900, 1600], [1000, 1000]]) {
    const result = calculateContainedImageSize(width, height);
    assert.ok(result.width <= 523.28);
    assert.ok(result.height <= 769.89);
    assert.ok(Math.abs(result.width / result.height - width / height) < 1e-10);
  }
});

test("rejects invalid image dimensions and impossible margins", () => {
  assert.throws(() => calculateContainedImageSize(0, 20), JpgToPdfError);
  assert.throws(() => calculateContainedImageSize(20, Number.NaN), JpgToPdfError);
  assert.throws(() => calculateContainedImageSize(20, 20, 50, 50, 30), JpgToPdfError);
});
