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

test("Grammar Checker and Text Summarizer are registered, routed and available from the homepage", () => {
  assert.equal(getToolPathByName("Grammar Checker"), "/tools/grammar-checker");
  assert.equal(getToolPathByName("Text Summarizer"), "/tools/text-summarizer");
  assert.match(toolPage, /"grammar-checker":\s*GrammarCheckerTool/u);
  assert.match(toolPage, /"text-summarizer":\s*TextSummarizerTool/u);
  assert.match(homepage, /name:\s*"Grammar Checker"/u);
  assert.match(homepage, /name:\s*"Text Summarizer"/u);
  for (const slug of ["grammar-checker", "text-summarizer"]) {
    const tool = toolDefinitions.find((item) => item.slug === slug);
    assert.ok(tool, `${slug} must be registered`);
    assert.ok(tool.title && tool.description && tool.intro, `${slug} must have complete SEO metadata`);
    assert.ok(sitemapPaths.has(`/tools/${slug}`), `${slug} must be in the sitemap`);
  }
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

test("six unit converters are registered, routed and discoverable from the homepage", () => {
  const converters = [
    ["Length", "length-converter", "LengthConverterTool"],
    ["Weight", "weight-converter", "WeightConverterTool"],
    ["Temperature", "temperature-converter", "TemperatureConverterTool"],
    ["Area", "area-converter", "AreaConverterTool"],
    ["Volume", "volume-converter", "VolumeConverterTool"],
    ["Time", "time-converter", "TimeConverterTool"],
    ["Currency", "currency-converter", "CurrencyConverterTool"],
  ] as const;
  for (const [name, slug, component] of converters) {
    assert.equal(getToolPathByName(name), `/tools/${slug}`);
    assert.match(toolPage, new RegExp(`"${slug}":\\s*${component}`));
    assert.match(homepage, new RegExp(`name:\\s*"${name}"`));
    const tool = toolDefinitions.find((item) => item.slug === slug);
    assert.ok(tool, `${slug} must be registered`);
    assert.ok(tool.title && tool.description && tool.intro, `${slug} must have SEO metadata`);
    assert.ok(sitemapPaths.has(`/tools/${slug}`), `${slug} must be in the sitemap`);
  }
});
