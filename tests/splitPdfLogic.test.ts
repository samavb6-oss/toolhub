import test from "node:test";
import assert from "node:assert/strict";
import { MAX_SPLIT_OUTPUTS, parsePageRanges, SplitPdfError } from "../src/tools/splitPdfLogic.ts";

test("single page", () => {
  assert.deepEqual(parsePageRanges("5", 10), [[5]]);
});

test("single range", () => {
  assert.deepEqual(parsePageRanges("1-3", 10), [[1, 2, 3]]);
});

test("caps output groups to keep large split jobs manageable", () => {
  const ranges = Array.from({ length: MAX_SPLIT_OUTPUTS + 1 }, (_, index) => String(index + 1)).join(", ");
  assert.throws(
    () => parsePageRanges(ranges, MAX_SPLIT_OUTPUTS + 1),
    new RegExp(`no more than ${MAX_SPLIT_OUTPUTS} output files`),
  );
});

test("multiple ranges and singles", () => {
  assert.deepEqual(parsePageRanges("1-3, 5, 7-9", 10), [[1, 2, 3], [5], [7, 8, 9]]);
});

test("whitespace around commas and hyphens", () => {
  assert.deepEqual(parsePageRanges(" 1 - 3 , 5 ", 10), [[1, 2, 3], [5]]);
});

test("preserves user-supplied range order", () => {
  assert.deepEqual(parsePageRanges("5, 1-3", 10), [[5], [1, 2, 3]]);
});

test("pages ascending within each range", () => {
  assert.deepEqual(parsePageRanges("3-5", 10), [[3, 4, 5]]);
});

test("rejects empty input", () => {
  assert.throws(() => parsePageRanges("", 10), SplitPdfError);
  assert.throws(() => parsePageRanges("   ", 10), SplitPdfError);
});

test("rejects empty items between commas", () => {
  assert.throws(() => parsePageRanges("1,,2", 10), SplitPdfError);
  assert.throws(() => parsePageRanges(",1", 10), SplitPdfError);
  assert.throws(() => parsePageRanges("1,", 10), SplitPdfError);
});

test("rejects malformed tokens", () => {
  assert.throws(() => parsePageRanges("1-2-3", 10), SplitPdfError);
  assert.throws(() => parsePageRanges("abc", 10), SplitPdfError);
  assert.throws(() => parsePageRanges("-", 10), SplitPdfError);
  assert.throws(() => parsePageRanges("1-", 10), SplitPdfError);
  assert.throws(() => parsePageRanges("-1", 10), SplitPdfError);
});

test("rejects decimals", () => {
  assert.throws(() => parsePageRanges("1.5", 10), SplitPdfError);
  assert.throws(() => parsePageRanges("1-2.5", 10), SplitPdfError);
});

test("rejects non-positive values", () => {
  assert.throws(() => parsePageRanges("0", 10), SplitPdfError);
  assert.throws(() => parsePageRanges("-1", 10), SplitPdfError);
  assert.throws(() => parsePageRanges("0-3", 10), SplitPdfError);
});

test("rejects reversed ranges", () => {
  assert.throws(() => parsePageRanges("5-3", 10), SplitPdfError);
});

test("rejects values above totalPages", () => {
  assert.throws(() => parsePageRanges("11", 10), SplitPdfError);
  assert.throws(() => parsePageRanges("1-11", 10), SplitPdfError);
});

test("rejects overlapping pages across ranges", () => {
  assert.throws(() => parsePageRanges("1-3, 3-5", 10), SplitPdfError);
  assert.throws(() => parsePageRanges("1-5, 3", 10), SplitPdfError);
  assert.throws(() => parsePageRanges("5, 5", 10), SplitPdfError);
});

test("rejects non-positive totalPages", () => {
  assert.throws(() => parsePageRanges("1", 0), SplitPdfError);
  assert.throws(() => parsePageRanges("1", -5), SplitPdfError);
});

test("rejects non-integer totalPages", () => {
  assert.throws(() => parsePageRanges("1", 1.5), SplitPdfError);
});

import { PDFDocument } from "pdf-lib";
import { MAX_SPLIT_BYTES, splitPdfFile } from "../src/tools/splitPdfLogic.ts";

async function makeSplitPdf(name: string, widths: number[]): Promise<File> {
  const doc = await PDFDocument.create();
  for (const width of widths) doc.addPage([width, 200]);
  const bytes = await doc.save();
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return new File([buffer], name, { type: "application/pdf" });
}

test("splits requested ranges into readable PDFs in requested order", async () => {
  const source = await makeSplitPdf("report.pdf", [101, 102, 103, 104, 105]);
  const result = await splitPdfFile(source, "4-5, 1, 2-3");
  assert.equal(result.totalPages, 5);
  assert.deepEqual(result.files.map((item) => item.fileName), ["report_pages_4-5.pdf", "report_page_1.pdf", "report_pages_2-3.pdf"]);
  assert.deepEqual(result.files.map((item) => item.pages), [[4, 5], [1], [2, 3]]);
  assert.deepEqual(result.files.map((item) => item.pageCount), [2, 1, 2]);
  for (const item of result.files) {
    assert.equal(item.blob.type, "application/pdf");
    const bytes = new Uint8Array(await item.blob.arrayBuffer());
    assert.equal(new TextDecoder().decode(bytes.slice(0, 5)), "%PDF-");
    assert.equal((await PDFDocument.load(bytes)).getPageCount(), item.pageCount);
  }
  assert.equal((await PDFDocument.load(await source.arrayBuffer())).getPageCount(), 5, "source PDF is unchanged");
});

test("sanitizes output filenames", async () => {
  const source = await makeSplitPdf("../my\\report.pdf", [100, 110]);
  const result = await splitPdfFile(source, "1-2");
  assert.equal(result.files[0].fileName, ".._my_report_pages_1-2.pdf");
});

test("split rejects excessive output count before reading the PDF", async () => {
  const ranges = Array.from({ length: MAX_SPLIT_OUTPUTS + 1 }, (_, index) => String(index + 1)).join(", ");
  const invalidPdf = new File(["not a pdf"], "broken.pdf", { type: "application/pdf" });
  await assert.rejects(
    splitPdfFile(invalidPdf, ranges),
    new RegExp(`no more than ${MAX_SPLIT_OUTPUTS} output files`),
  );
});

test("split rejects non-PDF, empty, oversized, and corrupt inputs safely", async () => {
  await assert.rejects(splitPdfFile(new File(["hi"], "notes.txt", { type: "text/plain" }), "1"), /doesn't appear to be a PDF/);
  await assert.rejects(splitPdfFile(new File([], "empty.pdf", { type: "application/pdf" }), "1"), /empty/);
  await assert.rejects(splitPdfFile(new File([new Uint8Array(MAX_SPLIT_BYTES + 1)], "huge.pdf", { type: "application/pdf" }), "1"), /larger than 100 MB/);
  await assert.rejects(splitPdfFile(new File(["not a pdf"], "broken.pdf", { type: "application/pdf" }), "1"), /couldn't be opened as a PDF/);
});

test("encrypted PDFs return a safe user-facing error", async () => {
  const doc = await PDFDocument.create();
  doc.addPage();
  doc.context.trailerInfo.Encrypt = doc.context.obj({ Filter: "Standard" });
  const bytes = await doc.save();
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  const locked = new File([buffer], "locked.pdf", { type: "application/pdf" });
  await assert.rejects(splitPdfFile(locked, "1"), /encrypted or password-protected/);
});

test("rejects ranges beyond the source PDF page count", async () => {
  const source = await makeSplitPdf("short.pdf", [100, 110]);
  await assert.rejects(splitPdfFile(source, "1-3"), /beyond this PDF's 2 pages/);
});

test("single-page range produces a singular page filename", async () => {
  const source = await makeSplitPdf("one.pdf", [100]);
  const result = await splitPdfFile(source, "1");
  assert.equal(result.files[0].fileName, "one_page_1.pdf");
  assert.equal(result.files[0].pageCount, 1);
});

test("sanitizes control characters in output filenames", async () => {
  const source = await makeSplitPdf("report\u0000\u001f\u007f.pdf", [100]);
  const result = await splitPdfFile(source, "1");
  assert.equal(result.files[0].fileName, "report____page_1.pdf");
});