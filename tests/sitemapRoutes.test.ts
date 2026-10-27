import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getToolPathByName, toolDefinitions } from "../src/tools/toolRegistry.ts";

const toolPage = readFileSync(new URL("../src/pages/ToolPage.tsx", import.meta.url), "utf8");
const homepage = readFileSync(new URL("../src/components/ToolsHomepage.tsx", import.meta.url), "utf8");
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

test("Read Time and Lorem Ipsum are registered, routed and available from the homepage", () => {
  assert.equal(getToolPathByName("Read Time"), "/tools/read-time");
  assert.equal(getToolPathByName("Lorem Ipsum Generator"), "/tools/lorem-ipsum");
  assert.match(toolPage, /"read-time":\s*ReadTimeTool/u);
  assert.match(toolPage, /"lorem-ipsum":\s*LoremIpsumTool/u);
  assert.match(homepage, /name:\s*"Read Time"/u);
  assert.match(homepage, /name:\s*"Lorem Ipsum Generator"/u);
  for (const slug of ["read-time", "lorem-ipsum"]) {
    const tool = toolDefinitions.find((item) => item.slug === slug);
    assert.ok(tool, `${slug} must be registered`);
    assert.ok(tool.title && tool.description && tool.intro, `${slug} must have complete SEO metadata`);
  }
});

[executed on device: n8n-nuc11 (0edb2ec4-460f-4079-a4de-ad338db1e4b4)]