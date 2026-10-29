import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { cleanText, type TextCleanerOptions } from "../src/tools/textCleanerLogic.ts";

const off: TextCleanerOptions = { trimLines: false, collapseHorizontalWhitespace: false, removeBlankLines: false, removeDuplicateLines: false, normalizeLineEndings: false };

describe("cleanText", () => {
  it("empty input remains empty", () => {
    assert.equal(cleanText("", off), "");
  });

  it("normalizeLineEndings converts CRLF and lone CR to LF", () => {
    assert.equal(cleanText("a\r\nb\rc", { ...off, normalizeLineEndings: true }), "a\nb\nc");
  });

  it("does not normalize line endings when false", () => {
    assert.equal(cleanText("a\r\nb\rc", off), "a\r\nb\rc");
  });

  it("trimming lines does not normalize CRLF when line-ending normalization is off", () => {
    assert.equal(cleanText("  a  \r\n  b  \r\n", { ...off, trimLines: true }), "a\r\nb\r\n");
  });

  it("trimLines trims each line edges", () => {
    assert.equal(cleanText("  a  \n  b  ", { ...off, trimLines: true }), "a\nb");
  });

  it("collapseHorizontalWhitespace replaces runs of spaces/tabs with one space", () => {
    assert.equal(cleanText("a \t b\n\tc  d", { ...off, collapseHorizontalWhitespace: true }), "a b\n c d");
  });

  it("collapseHorizontalWhitespace never touches line breaks", () => {
    assert.equal(cleanText("a\n\nb", { ...off, collapseHorizontalWhitespace: true }), "a\n\nb");
  });

  it("removeBlankLines removes empty and whitespace-only lines", () => {
    assert.equal(cleanText("a\n\n   \nb", { ...off, removeBlankLines: true }), "a\nb");
  });

  it("removeDuplicateLines keeps first occurrence and preserves order", () => {
    assert.equal(cleanText("a\nb\na\nc\nb", { ...off, removeDuplicateLines: true }), "a\nb\nc");
  });

  it("duplicate comparison uses state after preceding operations", () => {
    assert.equal(cleanText("  a  \na", { ...off, trimLines: true, removeDuplicateLines: true }), "a");
  });

  it("tabs are collapsed but not treated as line breaks", () => {
    assert.equal(cleanText("\t\n\t", { ...off, collapseHorizontalWhitespace: true }), " \n ");
  });

  it("preserves Unicode and case", () => {
    assert.equal(cleanText("ÄÖÜ\näöü\n日本語", off), "ÄÖÜ\näöü\n日本語");
  });

  it("all options independent and deterministic", () => {
    const input = "  A \tA  \r\n  B  \r\n\r\n  A \tA  ";
    const opts: TextCleanerOptions = { trimLines: true, collapseHorizontalWhitespace: true, removeBlankLines: true, removeDuplicateLines: true, normalizeLineEndings: true };
    assert.equal(cleanText(input, opts), "A A\nB");
  });

  it("removeBlankLines with tabs-only lines", () => {
    assert.equal(cleanText("a\n\t\t\nb", { ...off, removeBlankLines: true }), "a\nb");
  });

  it("combined trimLines and collapseHorizontalWhitespace", () => {
    assert.equal(cleanText("  a \t b  ", { ...off, trimLines: true, collapseHorizontalWhitespace: true }), "a b");
  });
});
