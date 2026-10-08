# ToolHub

Free online tools (EMI calculator, PDF merge, image compress/resize, word counter, password
generator, QR generator, AI prompt generator). Everything runs in the browser; there is no backend.

**Stack:** React 19 · Vite 7 · Tailwind CSS 4 · wouter (routing) · pnpm · deployed on Netlify.

## Commands

| Command          | What it does                                                                 |
| ---------------- | ---------------------------------------------------------------------------- |
| `pnpm install`   | Install dependencies (use `--frozen-lockfile` in CI, as Netlify does).       |
| `pnpm dev`       | Vite dev server on `0.0.0.0:5173`.                                           |
| `pnpm build`     | **Production build** (see "Why the build is custom" below). Output: `dist/`. |
| `pnpm serve`     | Preview the built `dist/` locally (`vite preview`).                          |
| `pnpm typecheck` | `tsc --noEmit`.                                                              |

Requires Node 22 (`.nvmrc`). `pnpm install --frozen-lockfile` was verified with pnpm 9, 10 and 12
(lockfile format 9.0); the full production build and browser tests were run with pnpm 12 / Node 22.

## Deploying to Netlify

`netlify.toml` already contains everything: build command, publish directory (`dist`), Node version,
the SPA fallback (`/*` → `/index.html`, status 200, so `/tools/:slug` works on direct load and
refresh), long-term caching for `/assets/*`, and basic security headers.

**Before launch, set the real site URL.** Canonical, Open Graph and JSON-LD URLs in `index.html` use
`%VITE_SITE_URL%`, which defaults to the placeholder `https://toolhub.example` from `.env`.
Set `VITE_SITE_URL` (no trailing slash, e.g. `https://www.example.com`) under
*Netlify → Site configuration → Environment variables* – real env vars override `.env`.
Every build prints a `NOTE:` while the placeholder is still in use.

Per-tool pages (`/tools/:slug`) set their own title, description, canonical and JSON-LD at runtime
from `window.location.origin` (`src/tools/ToolSeo.tsx`), so they never use the placeholder.

## Why the build is custom (`scripts/`)

A plain `vite build` is **extremely slow while transforming `react-dom`** in this project
(measured on a 1-CPU sandbox: ~7.5 min plain vs ~1 min with the shims; on the original Replit setup it
appeared to hang; see `_diagnostics/README.md`). `pnpm build` therefore runs
`scripts/build.mjs`, which:

1. **`scripts/prebundle-react.mjs`** – uses esbuild (already a Vite dependency) to convert the
   CommonJS-only `react`, `react/jsx-runtime`, `react/jsx-dev-runtime`, `react-dom` and
   `react-dom/client` into ES modules in `.shims/` (generated, git-ignored), then **verifies** them
   (expected exports, only expected imports, no self-reference, no leftover `require()`, production
   `NODE_ENV`). All shims share one copy of React.
2. Runs `vite build` with `TOOLHUB_USE_REACT_SHIMS=1`. `vite.config.ts` then aliases those five
   specifiers (exact-match regexes, so `react-day-picker`, `@radix-ui/react-*` etc. are untouched) to
   the shims, and enables a guard plugin that **fails the build** if any real `react` /
   `react-dom` / `scheduler` module still ends up in a chunk (that would mean two Reacts).
   A watchdog kills the build after 8 minutes instead of burning the whole Netlify timeout.
3. **`scripts/verify-dist.mjs`** – checks `dist/`: `index.html` is built and all local refs exist,
   JS and compiled CSS are present, no raw Tailwind directives remain, the router is in the bundle,
   `favicon.svg` / `robots.txt` were copied, JSON-LD is valid, no `%VITE_*%` placeholder is left.

Environment switches (diagnostics only): `TOOLHUB_DEBUG=1` (log every transformed module),
`TOOLHUB_BUILD_TIMEOUT_MS`, `TOOLHUB_ALLOW_PLAIN_BUILD=1` (permit a bare `vite build`),
`TOOLHUB_ALLOW_REACT_BYPASS=1` (skip the duplicate-React guard). `pnpm dev` is unaffected; the shims
are production-build only.

If a future Vite/Rollup/React upgrade fixes the stall, you can test it with
`TOOLHUB_ALLOW_PLAIN_BUILD=1 pnpm exec vite build`; if that completes quickly *and* the result passes
`node scripts/verify-dist.mjs`, the shim machinery can be deleted.

## Project layout

```
src/
  main.tsx, App.tsx          entry + routes (/, /tools/:slug, 404)
  components/                homepage, error boundary, shadcn/ui components
  tools/                     tool registry + each tool's UI/logic
  pages/                     ToolPage (slug → tool), not-found
public/                      favicon.svg, robots.txt  (copied verbatim to dist/)
scripts/                     production build pipeline (see above)
_diagnostics/                investigation notes + repro configs; NOT part of the build
netlify.toml                 Netlify build, redirects, headers
.env                         VITE_SITE_URL default (placeholder domain)
```

## Known limitations

- Single JS bundle (~850 kB, ~320 kB gzip). Route-level `React.lazy` would shrink the homepage load
  (the PDF and QR libraries are only needed on their own tool pages).
- No social-share image (`og:image`); the homepage declares `twitter:card=summary_large_image`.
- `robots.txt` has no `Sitemap:` line yet (needs the final domain).
