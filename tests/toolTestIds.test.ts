import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getToolTestId } from "../src/tools/toolTestIds.ts";

type HomepageCategory = { name: string; tools: string[] };

/**
 * Read the real category and tool names from the homepage source, so these tests cannot drift
 * from what ToolsHomepage actually renders. (ToolsHomepage.tsx imports JSX and icons, so it can't
 * be imported under `node --experimental-strip-types`; homepageAccessibility.test.ts also reads it
 * as source text.)
 */
function readHomepageCategories(): HomepageCategory[] {
  const source = readFileSync(new URL("../src/components/ToolsHomepage.tsx", import.meta.url), "utf8");
  const start = source.indexOf("const categories: Category[] = [");
  const end = source.indexOf("const trendingTools", start);
  assert.ok(start !== -1 && end > start, "homepage categories array should exist in ToolsHomepage.tsx");
  const block = source.slice(start, end);

  const categories = [...block.matchAll(/name: "([^"]+)", eyebrow:[\s\S]*?tools: \[([\s\S]*?)\],\s*\},/g)].map(
    ([, name, tools]) => ({
      name,
      tools: [...tools.matchAll(/name: "([^"]+)"/g)].map((tool) => tool[1]),
    }),
  );

  // Fail loudly if the parser skips an entry, instead of silently testing fewer categories.
  // Each category has exactly one `tools: [` array, an anchor the parser regex doesn't rely on.
  assert.equal(categories.length, (block.match(/\btools: \[/g) ?? []).length, "every homepage category should be parsed");
  assert.ok(categories.length > 0, "homepage should define at least one category");
  return categories;
}

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const duplicates = (values: string[]) => values.filter((value, index) => values.indexOf(value) !== index);
const categories = readHomepageCategories();
const moreToolsCategories = categories.filter((category) => category.tools.includes("More Tools"));

test("tests use the real homepage categories", () => {
  assert.deepEqual(duplicates(categories.map((category) => category.name)), [], "category names should be unique");
  for (const category of categories) {
    assert.ok(category.tools.length > 0, `${category.name} should list tools`);
    assert.deepEqual(duplicates(category.tools), [], `${category.name} should not repeat a tool name`);
  }
  // The repeated "More Tools" tile is what makes category-scoped IDs necessary.
  assert.ok(moreToolsCategories.length >= 2, "more than one real category should contain a More Tools tile");
});

test("category-scoped tool IDs distinguish repeated More Tools cards", () => {
  const ids = moreToolsCategories.map((category) => getToolTestId("tool", category.name, "More Tools"));
  assert.equal(new Set(ids).size, moreToolsCategories.length);
  moreToolsCategories.forEach((category, index) => {
    assert.equal(ids[index], `tool-${slug(category.name)}-more-tools`);
  });
});

test("category-scoped favorite IDs distinguish repeated More Tools controls", () => {
  const ids = moreToolsCategories.map((category) => getToolTestId("favorite", category.name, "More Tools"));
  assert.equal(new Set(ids).size, moreToolsCategories.length);
  moreToolsCategories.forEach((category, index) => {
    assert.equal(ids[index], `favorite-${slug(category.name)}-more-tools`);
  });
});

test("every real homepage tool and favorite selector is unique and well-formed", () => {
  for (const kind of ["tool", "favorite"] as const) {
    const ids = categories.flatMap((category) => category.tools.map((tool) => getToolTestId(kind, category.name, tool)));
    assert.deepEqual(duplicates(ids), [], `${kind} test IDs should be unique across all homepage tiles`);
    for (const id of ids) assert.match(id, /^(tool|favorite)(-[a-z0-9]+)+$/, `${id} should be a clean selector`);
  }
});

test("unique tool selectors retain their existing readable IDs", () => {
  assert.equal(getToolTestId("tool", "Finance", "SIP Calculator"), "tool-sip-calculator");
  assert.equal(getToolTestId("favorite", "PDF Tools", "Merge PDF"), "favorite-merge-pdf");
  assert.equal(getToolTestId("favorite", "PDF Tools", "More Tools"), "favorite-pdf-tools-more-tools");

  // Every real tool except the repeated More Tools tile keeps the ID the homepage used before scoping.
  for (const category of categories) {
    for (const tool of category.tools.filter((name) => name !== "More Tools" && /^[A-Za-z0-9 ]+$/.test(name))) {
      for (const kind of ["tool", "favorite"] as const) {
        assert.equal(
          getToolTestId(kind, category.name, tool),
          `${kind}-${tool.toLowerCase().replaceAll(" ", "-")}`,
          `${kind} ID for ${tool} in ${category.name} should be unchanged`,
        );
      }
    }
  }
});
