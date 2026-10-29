import test from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import {
  MAX_COMPRESS_PDF_BYTES,
  CompressPdfError,
  validateCompressPdf,
  compressPdfFile,
} from "../src/tools/compressPdfLogic.ts";

function candidate(name: string, size: number, type = "application/pdf") {
  return { name, size, type } as File;
}

async function blankPdfFile(name = "sample.pdf"): Promise<File> {
  const document = await PDFDocument.create();
  document.addPage([300, 400]);
  const bytes = await document.save();
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return new File([buffer], name, { type: "application/pdf" });
}

test("validates PDF extension, MIME type, empty and oversized inputs", () => {
  assert.equal(validateCompressPdf(candidate("file.pdf", 20)), null);
  assert.equal(validateCompressPdf(candidate("file", 20, "application/pdf")), null);
  assert.match(validateCompressPdf(candidate("file.txt", 20, "text/plain")) ?? "", /valid PDF/i);
  assert.match(validateCompressPdf(candidate("empty.pdf", 0)) ?? "", /empty/i);
  assert.match(validateCompressPdf(candidate("large.pdf", MAX_COMPRESS_PDF_BYTES + 1)) ?? "", /100 MiB/i);
});

test("compresses a valid PDF locally and returns a safe PDF blob", async () => {
  const input = await blankPdfFile("sample.pdf");
  const result = await compressPdfFile(input);
  assert.equal(result.blob.type, "application/pdf");
  assert.equal(result.fileName, "sample_compressed.pdf");
  assert.equal(result.originalBytes, input.size);
  assert.ok(result.outputBytes > 0);
  assert.ok(result.outputBytes <= result.originalBytes);
  if (!result.reduced) assert.equal(result.outputBytes, result.originalBytes);
});

test("rejects corrupt PDFs with a safe user-facing error", async () => {
  const input = new File([new Uint8Array([1, 2, 3, 4])], "broken.pdf", { type: "application/pdf" });
  try {
    await assert.rejects(() => compressPdfFile(input), (error: unknown) => {
      assert.ok(error instanceof CompressPdfError);
      assert.match(error.message, /error|corrupt|invalid|unsupported|valid PDF/i);
      assert.doesNotMatch(error.message, /TypeError:|at \w+ \(/);
      return true;
    });
  } finally {
    // qpdf's Node/WASM wrapper may set process.exitCode for an expected bad-input failure.
    process.exitCode = 0;
  }
});
