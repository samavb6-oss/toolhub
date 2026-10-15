import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/tools/BasicTools.tsx", import.meta.url), "utf8");

test("shared calculator result values can wrap when narrow result cards contain long numbers", () => {
  const className = source.match(
    /<p data-testid=\{testId\} className="([^"]+)">\{value\}<\/p>/,
  )?.[1];

  assert.ok(className, "ResultStat value paragraph should remain identifiable");
  assert.match(className, /\bmin-w-0\b/, "result value should be allowed to shrink inside its grid cell");
  assert.match(className, /\bbreak-words\b/, "long unbroken numeric values should wrap instead of widening the card");
  assert.match(className, /\btext-xl\b/, "result values should use the compact mobile text size");
  assert.match(className, /\bsm:text-2xl\b/, "result values should retain the larger size from the sm breakpoint");
});
