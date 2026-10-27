import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getToolPathByName, toolDefinitions } from "../src/tools/toolRegistry.ts";

const toolPage = readFileSync(new URL("../src/pages/ToolPage.tsx", import.meta.url), "utf8");
const homepage = readFileSync(new URL("../src/components/ToolsHomepage.tsx", import.meta.url), "utf8");
const sitemap = readFileSync(new URL("../public/sitemap.xml", import.meta.url), "utf8");

test("Dividend Calculator is registered as a Finance tool with a stable route", () => {
  const matches = toolDefinitions.filter((tool) => tool.slug === "dividend-calculator");
  assert.equal(matches.length, 1);
  assert.equal(matches[0].name, "Dividend Calculator");
  assert.equal(matches[0].category, "Finance");
  assert.match(matches[0].title, /Dividend Calculator/u);
  assert.match(matches[0].description, /dividend income/u);
  assert.equal(getToolPathByName("Dividend Calculator"), "/tools/dividend-calculator");
});

test("Dividend Calculator has a route component and a homepage Finance tile", () => {
  assert.match(toolPage, /import\("@\/tools\/DividendCalculatorTool"\)/u);
  assert.match(toolPage, /"dividend-calculator": DividendCalculatorTool/u);
  assert.match(homepage, /name: "Dividend Calculator", icon: BadgeDollarSign/u);
  assert.match(sitemap, /\/tools\/dividend-calculator/u);
  assert.doesNotMatch(sitemap, /\/tools\/salary-calculator/u);
});
