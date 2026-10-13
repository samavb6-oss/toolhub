import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

// Read from the same registry that drives the React router so route metadata cannot drift.
export function readToolMetadata(root) {
  const source = readFileSync(path.join(root, 'src', 'tools', 'toolRegistry.ts'), 'utf8');
  const pattern = /slug:\s*"([^"]+)"[\s\S]*?name:\s*"([^"]+)"[\s\S]*?title:\s*"([^"]+)"[\s\S]*?description:\s*"([^"]+)"/g;
  const tools = [...source.matchAll(pattern)].map((match) => ({
    slug: match[1], name: match[2], title: match[3], description: match[4],
  }));
  if (tools.length === 0) throw new Error('[toolhub] No tool metadata could be read from src/tools/toolRegistry.ts');
  const slugs = new Set();
  for (const tool of tools) {
    if (slugs.has(tool.slug)) throw new Error('[toolhub] Duplicate tool slug: ' + tool.slug);
    slugs.add(tool.slug);
  }
  return tools;
}

export function escapeHtml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function replaceRequired(html, pattern, replacement, label) {
  if (!pattern.test(html)) throw new Error('[toolhub] Cannot generate static SEO page: missing ' + label + ' in index.html');
  return html.replace(pattern, replacement);
}

export function generateToolMetadataPages({ root, distDir, siteUrl }) {
  const indexPath = path.join(distDir, 'index.html');
  if (!existsSync(indexPath)) throw new Error('[toolhub] Cannot generate static tool metadata: dist/index.html is missing');
  const baseHtml = readFileSync(indexPath, 'utf8');
  const tools = readToolMetadata(root);
  const outputDir = path.join(distDir, 'tools');
  mkdirSync(outputDir, { recursive: true });

  for (const tool of tools) {
    const url = siteUrl.replace(/\/+$/, '') + '/tools/' + tool.slug;
    let html = baseHtml;
    html = replaceRequired(html, /<title>[\s\S]*?<\/title>/, '<title>' + escapeHtml(tool.title) + '</title>', 'title');
    html = replaceRequired(html, /<meta name="description" content="[^"]*"\s*\/>/, '<meta name="description" content="' + escapeHtml(tool.description) + '" />', 'description');
    html = replaceRequired(html, /<link rel="canonical" href="[^"]*"\s*\/>/, '<link rel="canonical" href="' + url + '" />', 'canonical');
    html = replaceRequired(html, /<meta property="og:title" content="[^"]*"\s*\/>/, '<meta property="og:title" content="' + escapeHtml(tool.title) + '" />', 'Open Graph title');
    html = replaceRequired(html, /<meta property="og:description" content="[^"]*"\s*\/>/, '<meta property="og:description" content="' + escapeHtml(tool.description) + '" />', 'Open Graph description');
    html = replaceRequired(html, /<meta property="og:url" content="[^"]*"\s*\/>/, '<meta property="og:url" content="' + url + '" />', 'Open Graph URL');
    html = replaceRequired(html, /<meta name="twitter:title" content="[^"]*"\s*\/>/, '<meta name="twitter:title" content="' + escapeHtml(tool.title) + '" />', 'Twitter title');
    html = replaceRequired(html, /<meta name="twitter:description" content="[^"]*"\s*\/>/, '<meta name="twitter:description" content="' + escapeHtml(tool.description) + '" />', 'Twitter description');
    if (!html.includes('property="og:site_name"')) {
      html = html.replace('</head>', '    <meta property="og:site_name" content="ToolHub" />\n  </head>');
    }
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: tool.name,
      description: tool.description,
      url: url,
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      publisher: { '@type': 'Organization', name: 'ToolHub' },
    };
    const ld = JSON.stringify(schema).replaceAll('<', '\\u003c');
    html = replaceRequired(html, /<script type="application\/ld\+json">[\s\S]*?<\/script>/, '<script type="application/ld+json">\n      ' + ld + '\n    </script>', 'JSON-LD');
    writeFileSync(path.join(outputDir, tool.slug + '.html'), html);
  }
  return tools.length;
}
