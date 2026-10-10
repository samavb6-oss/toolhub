# ToolHub

Free online tools for everyday tasks, including an EMI calculator, PDF merge, image compression and resizing, word counter, password generator, QR generator, and AI prompt generator. Tools run in the browser; there is no application backend.

**Stack:** React 19 · Vite 7 · Tailwind CSS 4 · wouter · pnpm · Cloudflare Pages.

## Commands

| Command | What it does |
| --- | --- |
| `pnpm install --frozen-lockfile` | Install the exact dependency versions from the lockfile. |
| `pnpm dev` | Start the Vite development server. |
| `pnpm build` | Run the production build and verify the generated `dist/` output. |
| `pnpm serve` | Preview the built `dist/` locally. |
| `pnpm typecheck` | Run TypeScript checks without emitting files. |

Requires Node 22 (see `.nvmrc`). Use pnpm 9 or later with lockfile v9 support.

## Deploying to Cloudflare Pages

Configure the Cloudflare Pages project with these build settings:

- **Production branch:** `main`
- **Build command:** `pnpm build`
- **Build output directory:** `dist`
- **Root directory:** repository root
- **Node.js:** 22

The build script uses `https://samstoolhub.pages.dev` as the stable production URL by default. If the production hostname changes, set `VITE_SITE_URL` in Cloudflare Pages environment variables to the real canonical origin (for example, `https://www.example.com`), without a trailing slash. Do not use `CF_PAGES_URL` as the canonical origin: it can refer to a deployment-specific URL.

The homepage's canonical, Open Graph and JSON-LD URLs are substituted at build time. Individual tool routes set their title, description, canonical URL and structured data in `src/tools/ToolSeo.tsx` at runtime.

## Production build design

A plain `vite build` can stall while transforming `react-dom` in this project. The `pnpm build` script therefore:

1. Uses `scripts/prebundle-react.mjs` to pre-bundle React and ReactDOM into verified ES modules in the ignored `.shims/` directory.
2. Runs Vite with the shims and a guard against accidentally bundling a second React instance. A watchdog stops a stalled build after eight minutes.
3. Runs `scripts/verify-dist.mjs` to check the generated HTML, local asset references, JavaScript and CSS bundles, Tailwind output, favicon, robots file, and JSON-LD.

Useful diagnostic environment variables: `TOOLHUB_DEBUG=1`, `TOOLHUB_BUILD_TIMEOUT_MS`, `TOOLHUB_ALLOW_PLAIN_BUILD=1`, and `TOOLHUB_ALLOW_REACT_BYPASS=1`. The last two are intended for diagnostics, not normal deployment.

## Project layout

```
src/
  main.tsx, App.tsx          entry and routes (/, /tools/:slug, 404)
  components/                homepage and UI components
  tools/                     tool registry, UI and logic
  pages/                     tool and not-found pages
public/                      favicon, robots.txt, sitemap.xml
scripts/                     production build and output verification
_diagnostics/                investigation notes and reproduction configs
```

## Known limitations

- The production app is a client-rendered single-page application; tool metadata is set at runtime. Search engines may need to render JavaScript to see each tool page's unique metadata.
- The app is currently shipped as a single JavaScript bundle. Route-level lazy loading could reduce the initial download size.
- No social-share image (`og:image`) is configured yet.
