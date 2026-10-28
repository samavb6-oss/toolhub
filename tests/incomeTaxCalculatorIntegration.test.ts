import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getToolPathByName, toolDefinitions } from "../src/tools/toolRegistry.ts";

const toolPage = readFileSync(new URL("../src/pages/ToolPage.tsx", import.meta.url), "utf8");
const homepage = readFileSync(new URL("../src/components/ToolsHomepage.tsx", import.meta.url), "utf8");
const sitemap = readFileSync(new URL("../public/sitemap.xml", import.meta.url), "utf8");

test("Income Tax Calculator is registered with Tax Year 2026-27 metadata", () => {
  const matches = toolDefinitions.filter((tool) => tool.slug === "income-tax-calculator");
  assert.equal(matches.length, 1);
  assert.equal(matches[0].name, "Income Tax Calculator");
  assert.equal(matches[0].category, "Finance");
  assert.match(matches[0].title, /2026/u);
  assert.match(matches[0].description, /new and old tax regimes/u);
  assert.equal(getToolPathByName("Income Tax Calculator"), "/tools/income-tax-calculator");
});

test("Income Tax Calculator is routed, shown as a homepage tool, and included in sitemap", () => {
  assert.match(toolPage, /import\("@\/tools\/IncomeTaxCalculatorTool"\)/u);
  assert.match(toolPage, /"income-tax-calculator": IncomeTaxCalculatorTool/u);
  assert.match(homepage, /name: "Income Tax Calculator", icon: FileText/u);
  assert.match(sitemap, /\/tools\/income-tax-calculator/u);
});