import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { generateToolMetadataPages, readToolMetadata } from "../scripts/prerender-tool-metadata.mjs";

function fixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), "toolhub-seo-"));
  mkdirSync(path.join(root, "src", "tools"), { recursive: true });
  mkdirSync(path.join(root, "dist"), { recursive: true });
  writeFileSync(path.join(root, "src", "tools", "toolRegistry.ts"), `
    export const toolDefinitions = [
      {
        slug: "alpha-tool",
        name: "Alpha Tool",
        title: "Free Alpha Tool & Guide | ToolHub",
        description: "Use Alpha Tool to check & compare values.",
      },
      {
        slug: "beta-tool",
        name: "Beta Tool",
        title: "Beta Tool — Fast Results | ToolHub",
        description: "A practical beta tool.",
      },
    ];
  `);
  writeFileSync(path.join(root, "dist", "index.html"), `<!doctype html>
<html lang="en"><head>
<title>Homepage | ToolHub</title>
<meta name="description" content="Homepage description." />
<link rel="canonical" href="https://example.test/" />
<meta property="og:title" content="Homepage | ToolHub" />
<meta property="og:description" content="Homepage description." />
<meta property="og:url" content="https://example.test/" />
<meta name="twitter:title" content="Homepage | ToolHub" />
<meta name="twitter:description" content="Homepage description." />
<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite","name":"ToolHub","url":"https://example.test/"}</script>
</head><body><div id="root"></div></body></html>`);
  return root;
}

test("static SEO generation emits route-specific metadata and canonical URLs for every registered tool", () => {
  const root = fixture();
  try {
    const tools = readToolMetadata(root);
    assert.equal(tools.length, 2);
    assert.equal(generateToolMetadataPages({
      root,
      distDir: path.join(root, "dist"),
      siteUrl: "https://production.example",
    }), 2);

    for (const tool of tools) {
      const html = readFileSync(path.join(root, "dist", "tools", tool.slug + ".html"), "utf8");
      const url = "https://production.example/tools/" + tool.slug;
      assert.ok(html.includes("<title>" + tool.title.replaceAll("&", "&amp;") + "</title>"));
      assert.ok(html.includes('name="description" content="' + tool.description.replaceAll("&", "&amp;") + '"'));
      assert.ok(html.includes('<link rel="canonical" href="' + url + '" />'));
      assert.ok(html.includes('property="og:url" content="' + url + '"'));
      assert.ok(html.includes('property="og:title" content="' + tool.title.replaceAll("&", "&amp;") + '"'));
      assert.ok(html.includes('property="og:description" content="' + tool.description.replaceAll("&", "&amp;") + '"'));

      const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
      assert.equal(blocks.length, 1, "one structured-data block should be emitted");
      const schema = JSON.parse(blocks[0][1]);
      assert.equal(schema["@type"], "WebApplication");
      assert.equal(schema.name, tool.name);
      assert.equal(schema.description, tool.description);
      assert.equal(schema.url, url);
      assert.equal(schema.isAccessibleForFree, true);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("static SEO generation fails clearly when a required metadata placeholder is absent", () => {
  const root = fixture();
  try {
    const indexPath = path.join(root, "dist", "index.html");
    writeFileSync(indexPath, readFileSync(indexPath, "utf8").replace(/<link rel="canonical"[^>]*\/>/, ""));
    assert.throws(
      () => generateToolMetadataPages({ root, distDir: path.join(root, "dist"), siteUrl: "https://production.example" }),
      /missing canonical/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
