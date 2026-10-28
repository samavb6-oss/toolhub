import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getToolPathByName, toolDefinitions } from "../src/tools/toolRegistry.ts";

const toolPage = readFileSync(new URL("../src/pages/ToolPage.tsx", import.meta.url), "utf8");
const homepage = readFileSync(new URL("../src/components/ToolsHomepage.tsx", import.meta.url), "utf8");
const sitemap = readFileSync(new URL("../public/sitemap.xml", import.meta.url), "utf8");
const calculator = readFileSync(new URL("../src/tools/IncomeTaxCalculatorTool.tsx", import.meta.url), "utf8");

test("Income Tax Calculator is registered as a Finance tool with a stable route", () => {
  const matches = toolDefinitions.filter((tool) => tool.slug === "income-tax-calculator");
  assert.equal(matches.length, 1);
  assert.equal(matches[0].name, "Income Tax Calculator");
  assert.equal(matches[0].category, "Finance");
  assert.match(matches[0].description, /old and new tax regimes/u);
  assert.equal(getToolPathByName("Income Tax Calculator"), "/tools/income-tax-calculator");
});

test("Income Tax Calculator is lazy-loaded and listed on the homepage and sitemap", () => {
  assert.match(toolPage, /import\("@\/tools\/IncomeTaxCalculatorTool"\)/u);
  assert.match(toolPage, /"income-tax-calculator": IncomeTaxCalculatorTool/u);
  assert.match(homepage, /name: "Income Tax Calculator", icon: FileText/u);
  assert.match(sitemap, /\/tools\/income-tax-calculator/u);
});

test("calculator uses Act-specific deduction and rebate labels", () => {
  assert.match(calculator, /Eligible savings deductions \(section 123 \/ Schedule XV\)/u);
  assert.match(calculator, /Health insurance — self\/family \(section 126\)/u);
  assert.match(calculator, /checkbox-tax-self-family-senior/u);
  assert.match(calculator, /covered by this policy is a resident senior citizen/u);
  assert.match(calculator, /Additional NPS contribution \(section 124\)/u);
  assert.match(calculator, /Rebate \/ marginal relief \(Income-tax Act, 2025\)/u);
  assert.match(calculator, /Section 87A rebate \/ marginal relief/u);
});
