import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { toolDefinitions } from "../src/tools/toolRegistry.ts";

const sitemap = readFileSync(new URL("../public/sitemap.xml", import.meta.url), "utf8");
const sitemapPaths = new Set(
  [...sitemap.matchAll(/<loc>(https:\/\/[^<]+)<\/loc>/gu)].map(([, value]) => new URL(value).pathname),
);

test("sitemap includes every registered tool route", () => {
  const missing = toolDefinitions
    .filter((tool) => !sitemapPaths.has(`/tools/${tool.slug}`))
    .map((tool) => `/tools/${tool.slug}`);
  assert.deepEqual(missing, [], `Missing sitemap routes: ${missing.join(", ")}`);
});
