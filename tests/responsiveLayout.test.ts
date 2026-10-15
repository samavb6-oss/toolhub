import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/tools/BasicTools.tsx", import.meta.url), "utf8");

test("shared statistic cards can shrink and wrap long values in narrow grids", () => {
  const wrapperClass = source.match(
    /function ResultStat[\s\S]*?return <div className="([^"]+)">/,
  )?.[1];
  const valueClass = source.match(
    /<p data-testid=\{testId\} className="([^"]+)">\{value\}<\/p>/,
  )?.[1];

  assert.ok(wrapperClass, "ResultStat card wrapper should remain identifiable");
  assert.match(wrapperClass, /\bmin-w-0\b/, "card should shrink inside its grid track");
  assert.ok(valueClass, "ResultStat value paragraph should remain identifiable");
  assert.match(valueClass, /\bmin-w-0\b/, "value should be allowed to shrink inside the card");
  assert.match(valueClass, /\bbreak-words\b/, "long values should wrap instead of widening the card");
  assert.match(valueClass, /\btext-xl\b/, "result values should use the compact mobile text size");
  assert.match(valueClass, /\bsm:text-2xl\b/, "result values should retain the larger size from the sm breakpoint");
});
