// Production build entry point: `pnpm build`.
//   1. pre-bundle React/ReactDOM to ESM (see prebundle-react.mjs)
//   2. run `vite build` with a watchdog so a stall fails fast instead of burning the
//      whole CI build timeout
//   3. sanity-check dist/ (see verify-dist.mjs)
// Env: TOOLHUB_BUILD_TIMEOUT_MS (default 480000), TOOLHUB_DEBUG=1 (logs every module Vite
// transforms, so a stall shows exactly where it happens).
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prebundleReact } from './prebundle-react.mjs';
import { verifyDist } from './verify-dist.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'package.json'));
const timeoutMs = Number(process.env.TOOLHUB_BUILD_TIMEOUT_MS ?? 8 * 60 * 1000);
const debug = process.env.TOOLHUB_DEBUG === '1';

// Use only a stable production origin for canonical metadata and crawler-facing URLs.
// CF_PAGES_URL is deployment-specific and must never become the canonical origin.
// Require an explicit origin on Cloudflare Pages so an unverified fallback cannot be published.
const configuredSiteUrl = process.env.VITE_SITE_URL?.trim();
if (process.env.CF_PAGES === '1' && !configuredSiteUrl) {
  console.error(
    '[toolhub] VITE_SITE_URL is required on Cloudflare Pages. Set it to the stable production origin (for example, https://your-project.pages.dev) before building.',
  );
  process.exit(1);
}
const siteUrl = (configuredSiteUrl || 'https://samstoolhub.pages.dev').replace(/\/+$/, '');
if (!/^https:\/\/[^/]+$/i.test(siteUrl)) {
  console.error('[toolhub] VITE_SITE_URL must be an HTTPS origin without a path or trailing slash.');
  process.exit(1);
}

console.log(`[toolhub] node ${process.version}`);
console.time('[toolhub] react shims');
await prebundleReact();
console.timeEnd('[toolhub] react shims');

const viteBin = path.join(path.dirname(require.resolve('vite/package.json')), 'bin', 'vite.js');
const args = [viteBin, 'build', ...(debug ? ['--debug', 'vite:transform'] : []), ...process.argv.slice(2)];
const child = spawn(process.execPath, args, {
  cwd: root,
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production',
    TOOLHUB_USE_REACT_SHIMS: '1',
    VITE_SITE_URL: siteUrl.replace(/\/$/, ''),
  },
});

let timedOut = false;
const timer = setTimeout(() => {
  timedOut = true;
  console.error(
    `[toolhub] vite build exceeded ${Math.round(timeoutMs / 1000)}s and was stopped. ` +
      'Re-run with TOOLHUB_DEBUG=1 to see the last module Vite was transforming.',
  );
  child.kill('SIGKILL');
}, timeoutMs);

for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => child.kill(sig));

child.on('exit', (code, signal) => {
  clearTimeout(timer);
  if (timedOut) process.exit(1);
  if (code !== 0) process.exit(code ?? (signal ? 1 : 0));

  // Keep crawler-facing URLs aligned with the same canonical origin used by index.html.
  // The checked-in files use the default Pages hostname; rewrite the built copies only.
  for (const file of ['robots.txt', 'sitemap.xml']) {
    const filePath = path.join(root, 'dist', file);
    const contents = readFileSync(filePath, 'utf8');
    writeFileSync(filePath, contents.replaceAll('https://samstoolhub.pages.dev', siteUrl));
  }

  const { ok, problems, notes } = verifyDist();
  notes.forEach((n) => console.log(`[toolhub] ${n}`));
  if (!ok) {
    problems.forEach((p) => console.error(`[toolhub] DIST CHECK FAILED: ${p}`));
    process.exit(1);
  }
  console.log('[toolhub] dist check passed');
});
