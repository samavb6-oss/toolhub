import test from "node:test";
import assert from "node:assert/strict";
import { formatBytes } from "../src/tools/toolUtils.ts";

test("formatBytes scales values at unit boundaries without showing 1024 of the prior unit", () => {
  assert.equal(formatBytes(0), "0 B");
  assert.equal(formatBytes(1023), "1023 B");
  assert.equal(formatBytes(1024), "1.0 KB");
  assert.equal(formatBytes(1048575), "1.0 MB");
  assert.equal(formatBytes(1048576), "1.0 MB");
  assert.equal(formatBytes(1073741823), "1.0 GB");
  assert.equal(formatBytes(1073741824), "1.0 GB");
  assert.equal(formatBytes(1099511627776), "1.0 TB");
});

test("formatBytes handles invalid and negative values safely", () => {
  assert.equal(formatBytes(-1), "—");
  assert.equal(formatBytes(Number.NaN), "—");
  assert.equal(formatBytes(Number.POSITIVE_INFINITY), "—");
});
