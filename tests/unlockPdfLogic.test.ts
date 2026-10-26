import test from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { createPdfToolkit } from "pdfstudio";
import {
  MAX_UNLOCK_PDF_BYTES,
  UnlockPdfError,
  validateUnlockPdf,
  unlockPdfFile,
} from "../src/tools/unlockPdfLogic.ts";

function candidate(name: string, size: number, type = "application/pdf") {
  return { name, size, type } as File;
}

async function makePdfBytes(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage([300, 400]);
  return doc.save();
}

function toFile(bytes: Uint8Array, name: string): File {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return new File([buffer], name, { type: "application/pdf" });
}

test("validates PDF extension, empty files and size limit", () => {
  assert.equal(validateUnlockPdf(candidate("locked.pdf", 20)), null);
  assert.match(validateUnlockPdf(candidate("file.txt", 20, "text/plain")) ?? "", /PDF/i);
  assert.match(validateUnlockPdf(candidate("empty.pdf", 0)) ?? "", /empty/i);
  assert.match(validateUnlockPdf(candidate("large.pdf", MAX_UNLOCK_PDF_BYTES + 1)) ?? "", /100 MiB/i);
});

test("unlocks an encrypted PDF using the correct supplied password", async () => {
  const toolkit = await createPdfToolkit();
  const source = await makePdfBytes();
  const locked = await toolkit.lock(source, { userPassword: "known-secret" });
  const input = toFile(locked, "locked.pdf");
  const result = await unlockPdfFile(input, "known-secret");
  assert.equal(result.blob.type, "application/pdf");
  assert.equal(result.fileName, "locked_unlocked.pdf");
  assert.ok(result.outputBytes > 0);
  assert.ok(result.originalBytes > 0);
  assert.equal(await toolkit.isEncrypted(new Uint8Array(await result.blob.arrayBuffer())), false);
});

test("reports an incorrect password without leaking library details", async () => {
  const toolkit = await createPdfToolkit();
  const locked = await toolkit.lock(await makePdfBytes(), { userPassword: "known-secret" });
  const input = toFile(locked, "locked.pdf");
  try {
    await assert.rejects(() => unlockPdfFile(input, "wrong-secret"), (error: unknown) => {
      assert.ok(error instanceof UnlockPdfError);
      assert.match(error.message, /incorrect/i);
      assert.doesNotMatch(error.message, /qpdf|stderr|exit code/i);
      return true;
    });
  } finally {
    process.exitCode = 0;
  }
});

[executed on device: n8n-nuc11 (0edb2ec4-460f-4079-a4de-ad338db1e4b4)]