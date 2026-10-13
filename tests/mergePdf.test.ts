import test from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import {
  MAX_MERGE_BYTES,
  MAX_MERGE_FILES,
  MergePdfError,
  mergePdfFiles,
  validateMergeSelection,
} from "../src/tools/pdfTools.ts";

// Every page gets a distinct width, so the merged page order can be read back from the output.
async function makePdfBytes(widths: number[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (const width of widths) doc.addPage([width, 200]);
  return doc.save();
}

// File parts must be backed by a plain ArrayBuffer to satisfy strict TypeScript BlobPart typing.
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

async function makePdf(name: string, widths: number[]): Promise<File> {
  return new File([toArrayBuffer(await makePdfBytes(widths))], name, { type: "application/pdf" });
}

async function pageWidths(blob: Blob): Promise<number[]> {
  const doc = await PDFDocument.load(await blob.arrayBuffer());
  return doc.getPages().map((page) => Math.round(page.getWidth()));
}

async function rejection(promise: Promise<unknown>): Promise<Error> {
  try {
    await promise;
  } catch (caught) {
    assert.ok(caught instanceof Error);
    return caught;
  }
  assert.fail("Expected the promise to reject");
}

test("merge keeps every page from every file in the selected order", async () => {
  const a = await makePdf("a.pdf", [101, 102]);
  const b = await makePdf("b.pdf", [201]);
  const c = await makePdf("c.pdf", [301, 302, 303]);

  const forward = await mergePdfFiles([a, b, c]);
  assert.equal(forward.pageCount, 6);
  assert.equal(forward.blob.type, "application/pdf");
  assert.deepEqual(await pageWidths(forward.blob), [101, 102, 201, 301, 302, 303]);

  const reordered = await mergePdfFiles([c, a, b]);
  assert.deepEqual(await pageWidths(reordered.blob), [301, 302, 303, 101, 102, 201]);
});

test("merged output is a readable PDF with a PDF header", async () => {
  const { blob } = await mergePdfFiles([await makePdf("a.pdf", [100]), await makePdf("b.pdf", [110])]);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  assert.equal(new TextDecoder().decode(bytes.slice(0, 5)), "%PDF-");
  assert.equal((await PDFDocument.load(bytes)).getPageCount(), 2);
});

test("files that share a name are all merged, in order", async () => {
  const first = await makePdf("report.pdf", [111]);
  const second = await makePdf("report.pdf", [222]);
  const { blob, pageCount } = await mergePdfFiles([first, second, first]);
  assert.equal(pageCount, 3);
  assert.deepEqual(await pageWidths(blob), [111, 222, 111]);
});

test("merging fewer than two files is rejected", async () => {
  const error = await rejection(mergePdfFiles([await makePdf("only.pdf", [100])]));
  assert.ok(error instanceof MergePdfError);
  assert.match(error.message, /at least two/);
});

test("a non-PDF file is rejected and named", async () => {
  const notPdf = new File(["hello"], "notes.txt", { type: "text/plain" });
  const error = await rejection(mergePdfFiles([await makePdf("a.pdf", [100]), notPdf]));
  assert.ok(error instanceof MergePdfError);
  assert.match(error.message, /notes\.txt/);
});

test("an empty file is rejected and named", async () => {
  const empty = new File([], "empty.pdf", { type: "application/pdf" });
  const error = await rejection(mergePdfFiles([await makePdf("a.pdf", [100]), empty]));
  assert.ok(error instanceof MergePdfError);
  assert.match(error.message, /empty\.pdf is empty/);
});

test("a corrupt or truncated PDF gives a friendly message that names the file", async () => {
  const good = await makePdf("good.pdf", [100]);
  const garbage = new File(["this is not really a pdf"], "fake.pdf", { type: "application/pdf" });
  const bytes = await makePdfBytes([100, 120, 140]);
  const truncated = new File([toArrayBuffer(bytes.slice(0, Math.floor(bytes.length / 2)))], "cut-off.pdf", { type: "application/pdf" });

  for (const [bad, name] of [[garbage, "fake.pdf"], [truncated, "cut-off.pdf"]] as const) {
    const error = await rejection(mergePdfFiles([good, bad]));
    assert.ok(error instanceof MergePdfError);
    assert.ok(error.message.startsWith(`${name} could not be read as a PDF`), error.message);
    assert.doesNotMatch(error.message, /offset|line:|Failed to parse/);
  }
});

test("an encrypted PDF gives a specific message that names the file", async () => {
  const doc = await PDFDocument.create();
  doc.addPage();
  doc.context.trailerInfo.Encrypt = doc.context.obj({ Filter: "Standard" });
  const locked = new File([toArrayBuffer(await doc.save())], "locked.pdf", { type: "application/pdf" });

  const error = await rejection(mergePdfFiles([await makePdf("a.pdf", [100]), locked]));
  assert.ok(error instanceof MergePdfError);
  assert.match(error.message, /^locked\.pdf is encrypted or password-protected/);
});

test("a file that cannot be read from disk gives a friendly message", async () => {
  const unreadable = await makePdf("moved.pdf", [100]);
  unreadable.arrayBuffer = () => Promise.reject(new DOMException("File changed", "NotReadableError"));
  const error = await rejection(mergePdfFiles([await makePdf("a.pdf", [100]), unreadable]));
  assert.ok(error instanceof MergePdfError);
  assert.match(error.message, /^moved\.pdf could not be read/);
});

test("selection validation accepts normal PDFs", () => {
  const pdf = (name: string, size = 1000) => ({ name, size, type: "application/pdf" });
  assert.equal(validateMergeSelection([], [pdf("a.pdf"), pdf("b.pdf")]), null);
  assert.equal(validateMergeSelection([pdf("a.pdf")], [{ name: "SCAN.PDF", size: 10, type: "" }]), null);
});

test("selection validation rejects non-PDF and empty files, naming them", () => {
  assert.match(validateMergeSelection([], [{ name: "photo.png", size: 10, type: "image/png" }]) ?? "", /photo\.png is not a PDF/);
  assert.match(validateMergeSelection([], [{ name: "blank.pdf", size: 0, type: "application/pdf" }]) ?? "", /blank\.pdf is empty/);
});

test("selection validation enforces the file count across existing and new files", () => {
  const pdf = (n: number) => ({ name: `f${n}.pdf`, size: 10, type: "application/pdf" });
  const existing = Array.from({ length: MAX_MERGE_FILES - 1 }, (_, n) => pdf(n));
  assert.equal(validateMergeSelection(existing, [pdf(99)]), null);
  assert.match(validateMergeSelection(existing, [pdf(98), pdf(99)]) ?? "", new RegExp(`up to ${MAX_MERGE_FILES}`, "i"));
});

test("selection validation enforces per-file and combined size limits", () => {
  const big = (name: string, size: number) => ({ name, size, type: "application/pdf" });
  assert.match(validateMergeSelection([], [big("huge.pdf", MAX_MERGE_BYTES + 1)]) ?? "", /huge\.pdf is larger than 100 MB/);
  assert.equal(validateMergeSelection([], [big("exact.pdf", MAX_MERGE_BYTES)]), null);
  const half = MAX_MERGE_BYTES / 2;
  assert.match(validateMergeSelection([big("a.pdf", half)], [big("b.pdf", half + 1)]) ?? "", /combined size/);
});
