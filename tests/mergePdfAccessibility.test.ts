import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/tools/MergePdfTool.tsx", import.meta.url), "utf8");

test("PDF picker exposes a visible keyboard focus indicator on its custom label", () => {
  assert.match(source, /<label className=\{\x60\$\{secondaryButtonClass\} relative\x60\}>/);
  assert.match(
    source,
    /<input type="file" data-testid="input-merge-pdfs"[^>]*className="absolute inset-0 h-full w-full cursor-pointer opacity-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-\[#8db7ff\]"/,
  );
});
