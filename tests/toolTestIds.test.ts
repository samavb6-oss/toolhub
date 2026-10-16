import test from "node:test";
import assert from "node:assert/strict";
import { getToolTestId } from "../src/tools/toolTestIds.ts";

test("category-scoped tool IDs distinguish repeated More Tools cards", () => {
  const categories = [
    "Finance", "PDF Tools", "Image Tools", "Writing Tools",
    "General Utilities", "Developer Tools", "Health & Fitness",
    "AI & Creativity", "YouTube & Social",
  ];
  const ids = categories.map((category) => getToolTestId("tool", category, "More Tools"));
  assert.equal(new Set(ids).size, categories.length);
});

test("category-scoped favorite IDs distinguish repeated More Tools controls", () => {
  const categories = [
    "Finance", "PDF Tools", "Image Tools", "Writing Tools",
    "General Utilities", "Developer Tools", "Health & Fitness",
    "AI & Creativity", "YouTube & Social",
  ];
  const ids = categories.map((category) => getToolTestId("favorite", category, "More Tools"));
  assert.equal(new Set(ids).size, categories.length);
});

test("unique tool selectors retain their existing readable IDs", () => {
  assert.equal(getToolTestId("tool", "Finance", "SIP Calculator"), "tool-sip-calculator");
  assert.equal(getToolTestId("favorite", "PDF Tools", "Merge PDF"), "favorite-merge-pdf");
  assert.equal(getToolTestId("favorite", "PDF Tools", "More Tools"), "favorite-pdf-tools-more-tools");
});
