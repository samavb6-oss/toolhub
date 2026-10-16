import test from "node:test";
import assert from "node:assert/strict";
import { isChunkLoadError } from "../src/utils/isChunkLoadError.ts";

test("recognizes common dynamic-import and chunk-load failures", () => {
  assert.equal(isChunkLoadError(new Error("Failed to fetch dynamically imported module: /assets/tool.js")), true);
  assert.equal(isChunkLoadError(new Error("Importing a module script failed.")), true);
  assert.equal(isChunkLoadError(new Error("Loading chunk 42 failed.")), true);
  assert.equal(isChunkLoadError(new Error("vite:preloadError")), true);
});

test("does not treat unrelated application errors as chunk-load failures", () => {
  assert.equal(isChunkLoadError(new Error("Cannot read properties of undefined")), false);
  assert.equal(isChunkLoadError(new Error("Network request failed")), false);
});
