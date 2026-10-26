import test from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import {
  MAX_CONVERSION_BYTES,
  DocumentConversionError,
  validateConversionFile,
  convertDocument,
} from "../src/tools/documentConversionLogic.ts";

function candidate(name: string, size: number, type = "") {
  return { name, size, type } as File;
}

async function pdfFile(): Promise<File> {
  const doc = await PDFDocument.create();
  doc.addPage([300, 400]);
  const bytes = await doc.save();
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return new File([buffer], "sample.pdf", { type: "application/pdf" });
}

test("validates PDF and DOCX source formats and file limits", () => {
  assert.equal(validateConversionFile(candidate("a.pdf", 10), "pdf-to-word"), null);
  assert.equal(validateConversionFile(candidate("a.docx", 10), "word-to-pdf"), null);
  assert.match(validateConversionFile(candidate("a.txt", 10), "pdf-to-word") ?? "", /PDF/i);
  assert.match(validateConversionFile(candidate("a.pdf", 10), "word-to-pdf") ?? "", /DOCX/i);
  assert.match(validateConversionFile(candidate("empty.pdf", 0), "pdf-to-word") ?? "", /empty/i);
  assert.match(validateConversionFile(candidate("large.pdf", MAX_CONVERSION_BYTES + 1), "pdf-to-word") ?? "", /50 MiB/i);
});

test("converts a PDF to DOCX and back to PDF locally", async () => {
  const input = await pdfFile();
  const docx = await convertDocument(input, "pdf-to-word");
  assert.equal(docx.blob.type, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  assert.match(docx.fileName, /_converted\.docx$/);
  assert.ok(docx.outputBytes > 0);
  assert.match(docx.warning, /Scanned PDFs|OCR/i);

  const docxFile = new File([await docx.blob.arrayBuffer()], docx.fileName, {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  const pdf = await convertDocument(docxFile, "word-to-pdf");
  assert.equal(pdf.blob.type, "application/pdf");
  assert.match(pdf.fileName, /_converted\.pdf$/);
  assert.ok(pdf.outputBytes > 0);
  assert.match(pdf.warning, /Formatting may change/i);
});

test("returns a safe error for a corrupt PDF", async () => {
  const bad = new File([new Uint8Array([1, 2, 3])], "bad.pdf", { type: "application/pdf" });
  await assert.rejects(() => convertDocument(bad, "pdf-to-word"), (error: unknown) => {
    assert.ok(error instanceof DocumentConversionError);
    assert.match(error.message, /Unable to parse|valid/i);
    return true;
  });
});
