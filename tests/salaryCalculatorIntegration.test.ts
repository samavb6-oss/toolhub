import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getToolPathByName, toolDefinitions } from "../src/tools/toolRegistry.ts";

const toolPage = readFileSync(new URL("../src/pages/ToolPage.tsx", import.meta.url), "utf8");
const homepage = readFileSync(new URL("../src/components/ToolsHomepage.tsx", import.meta.url), "utf8");

test("Salary Calculator is registered as a Finance tool with a stable route", () => {
  const matches = toolDefinitions.filter((tool) => tool.slug === "salary-calculator");
  assert.equal(matches.length, 1);
  assert.equal(matches[0].name, "Salary Calculator");
  assert.equal(matches[0].category, "Finance");
  assert.match(matches[0].title, /Salary Calculator/u);
  assert.match(matches[0].description, /without assuming tax/u);
  assert.equal(getToolPathByName("Salary Calculator"), "/tools/salary-calculator");
});

test("Salary Calculator has a route component and uses the existing Finance homepage tile", () => {
  assert.match(toolPage, /import \{ SalaryCalculatorTool \} from "@\/tools\/SalaryCalculatorTool";/u);
  assert.match(toolPage, /"salary-calculator": SalaryCalculatorTool/u);
  assert.match(homepage, /name: "Salary Calculator", icon: BriefcaseBusiness/u);
});
