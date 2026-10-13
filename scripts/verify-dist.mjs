// Post-build sanity check for dist/. Exits non-zero with a clear message on any problem.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { escapeHtml, readToolMetadata } from './prerender-tool-metadata.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function verifyDist(dist = path.join(root, 'dist')) {
  const problems = [];
  const notes = [];
  const indexPath = path.join(dist, 'index.html');
  if (!existsSync(indexPath)) return { ok: false, problems: [`missing ${indexPath}`], notes };

  const html = readFileSync(indexPath, 'utf8');

  const notFoundPath = path.join(dist, '404.html');
  if (!existsSync(notFoundPath)) problems.push('missing public/404.html (Cloudflare Pages needs this to return a real 404 instead of SPA fallback)');

  const toolMetadata = readToolMetadata(root);
  for (const tool of toolMetadata) {
    const routePath = path.join(dist, 'tools', `${tool.slug}.html`);
    if (!existsSync(routePath)) {
      problems.push(`missing static metadata page for /tools/${tool.slug}`);
      continue;
    }
    const routeHtml = readFileSync(routePath, 'utf8');
    const expectedCanonical = (process.env.VITE_SITE_URL || 'https://samstoolhub.pages.dev').replace(/\/+$/, '') + '/tools/' + tool.slug;
    if (!routeHtml.includes(`<link rel="canonical" href="${expectedCanonical}"`)) {
      problems.push(`/tools/${tool.slug} has an incorrect or missing canonical URL`);
    }
    if (!routeHtml.includes(`<title>${escapeHtml(tool.title)}</title>`)) {
      problems.push(`/tools/${tool.slug} has an incorrect or missing static title`);
    }
    if (!routeHtml.includes(`name="description" content="${escapeHtml(tool.description)}"`)) {
      problems.push(`/tools/${tool.slug} has an incorrect or missing static description`);
    }
    const routeLd = [...routeHtml.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    if (routeLd.length !== 1) problems.push(`/tools/${tool.slug} must have one static JSON-LD block`);
    else {
      try { JSON.parse(routeLd[0]); }
      catch (e) { problems.push(`/tools/${tool.slug} has invalid JSON-LD: ${e.message}`); }
    }
  }
  notes.push(`static tool metadata pages -> ${toolMetadata.length} checked`);

  if (/src=["']\/?src\/main\.tsx["']/.test(html)) problems.push('index.html still points at /src/main.tsx (not built)');
  if (!/<div id="root"><\/div>/.test(html)) problems.push('index.html lost <div id="root">');

  // build-time substitutions (index.html uses %VITE_SITE_URL%) must all have been applied
  const leftover = html.match(/%VITE_[A-Z0-9_]+%/g);
  if (leftover) problems.push(`index.html still contains unreplaced placeholders: ${[...new Set(leftover)].join(', ')}`);

  // every JSON-LD block must still be valid JSON after substitution
  const ldBlocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  ldBlocks.forEach((block, i) => {
    try {
      JSON.parse(block);
    } catch (e) {
      problems.push(`JSON-LD block #${i + 1} in index.html is not valid JSON: ${e.message}`);
    }
  });
  notes.push(`index.html -> ${ldBlocks.length} JSON-LD block(s) valid`);

  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  if (!canonical) problems.push('index.html has no <link rel="canonical">');
  else if (/toolhub\.example/.test(canonical))
    notes.push(
      'NOTE: canonical / Open Graph / JSON-LD still use the PLACEHOLDER domain https://toolhub.example. ' +
        'Set VITE_SITE_URL to the production origin if it differs from the default Cloudflare Pages hostname.',
    );
  else notes.push(`canonical site URL: ${canonical}`);

  // every local asset referenced from index.html must exist
  const refs = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map((m) => m[1]);
  const local = refs.filter((r) => r.startsWith('/') && !r.startsWith('//'));
  for (const ref of local) {
    const file = path.join(dist, decodeURIComponent(ref.split(/[?#]/)[0]));
    if (!existsSync(file)) problems.push(`index.html references ${ref} but it is missing from dist`);
  }
  const scripts = local.filter((r) => /\.m?js(\?|$)/.test(r));
  if (scripts.length === 0) problems.push('index.html references no JavaScript entry');
  notes.push(`index.html -> ${local.length} local refs (${scripts.length} script)`);

  const assetsDir = path.join(dist, 'assets');
  const assets = existsSync(assetsDir) ? readdirSync(assetsDir) : [];
  const jsFiles = assets.filter((f) => f.endsWith('.js'));
  const cssFiles = assets.filter((f) => f.endsWith('.css'));
  if (jsFiles.length === 0) problems.push('dist/assets has no .js files');
  if (cssFiles.length === 0) problems.push('dist/assets has no .css files (styles missing)');

  // Tailwind must have been compiled: no raw directives left, real utilities present.
  for (const f of cssFiles) {
    const css = readFileSync(path.join(assetsDir, f), 'utf8');
    if (/@import\s+["']tailwindcss["']|@tailwind\s|@apply\s|@plugin\s|@theme\s/.test(css))
      problems.push(`${f} still contains raw Tailwind directives`);
    if (!/\.flex\s*\{|display:\s*flex/.test(css)) problems.push(`${f} has no generated utilities (.flex not found)`);
    notes.push(`${f}: ${(statSync(path.join(assetsDir, f)).size / 1024).toFixed(1)} KB`);
  }

  // ToolHub itself must be inside the JS (tool registry + router).
  const allJs = jsFiles.map((f) => readFileSync(path.join(assetsDir, f), 'utf8')).join('\n');
  if (!allJs.includes('/tools/:slug')) problems.push('router path "/tools/:slug" not found in JS output');
  for (const f of jsFiles) notes.push(`${f}: ${(statSync(path.join(assetsDir, f)).size / 1024).toFixed(1)} KB`);

  for (const f of ['favicon.svg', 'robots.txt', 'sitemap.xml']) {
    if (!existsSync(path.join(dist, f))) problems.push(`public/${f} was not copied to dist`);
  }
  const sitemapPath = path.join(dist, 'sitemap.xml');
  if (existsSync(sitemapPath)) {
    const sitemap = readFileSync(sitemapPath, 'utf8');
    if (!sitemap.includes('http://www.sitemaps.org/schemas/sitemap/0.9'))
      problems.push('sitemap.xml is missing the standard sitemap namespace');
    if (!/<loc>https:\/\/[^<]+<\/loc>/.test(sitemap))
      problems.push('sitemap.xml contains no absolute HTTPS URLs');
    if (sitemap.includes('%VITE_') || sitemap.includes('toolhub.example'))
      problems.push('sitemap.xml contains a placeholder URL');
    for (const tool of toolMetadata) {
      const toolUrl = `${(process.env.VITE_SITE_URL || 'https://samstoolhub.pages.dev').replace(/\\/+$/, '')}/tools/${tool.slug}`;
      if (!sitemap.includes(`<loc>${toolUrl}</loc>`)) problems.push(`sitemap.xml is missing /tools/${tool.slug}`);
    }
    notes.push(`sitemap.xml -> ${(sitemap.match(/<loc>/g) ?? []).length} URL(s), all tool routes checked`);
  }

  return { ok: problems.length === 0, problems, notes };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const { ok, problems, notes } = verifyDist(process.argv[2] ? path.resolve(process.argv[2]) : undefined);
  notes.forEach((n) => console.log(`[toolhub] ${n}`));
  if (!ok) {
    problems.forEach((p) => console.error(`[toolhub] DIST CHECK FAILED: ${p}`));
    process.exit(1);
  }
  console.log('[toolhub] dist check passed');
}
