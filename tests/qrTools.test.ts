import test from "node:test";
import assert from "node:assert/strict";
import { createQrDataUrl } from "../src/tools/qrTools.ts";

test("QR generator rejects empty content with a clear message", async () => {
  await assert.rejects(createQrDataUrl("  ", 256, "M"), /Enter a URL or text/);
});

test("QR generator validates payload byte length against correction level", async () => {
  const ascii = "a".repeat(1300);
  await assert.rejects(createQrDataUrl(ascii, 256, "H"), /too large.*level H/i);
  await assert.rejects(createQrDataUrl("é".repeat(700), 256, "H"), /too large.*level H/i);
});

test("QR generator allows a payload within the high-correction byte limit", async () => {
  const result = await createQrDataUrl("short test", 256, "H");
  assert.match(result, /^data:image\/png;base64,/);
});
