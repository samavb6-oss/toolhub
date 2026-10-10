# ToolHub

ToolHub is a browser-based collection of practical online tools, including an EMI calculator, PDF merge, image compression and resizing, word counter, password generator, QR generator, and AI prompt generator. These tools run locally in the browser; there is no application backend.

**Stack:** React 19, Vite 7, Tailwind CSS 4, wouter, TypeScript, pnpm.  
**Deployment target:** Cloudflare Pages.

## Local development

Requires Node.js 22 and pnpm.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

## Production build

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm serve
```

Use `pnpm build` rather than running `vite build` directly. The build script pre-bundles React and ReactDOM into ES modules, runs the Vite production build with a watchdog, and verifies the generated `dist/` output.

The project includes a React-shim guard to catch accidental duplicate React bundles. If the build fails, read the first `[toolhub]` error in the build output before changing the shim machinery.

## Deploying to Cloudflare Pages

Create a Pages project connected to this GitHub repository and configure:

- **Production branch:** `main` (or the reviewed branch you intend to publish)
- **Build command:** `pnpm build`
- **Build output directory:** `dist`
- **Root directory:** repository root
- **Node.js:** 22

Ensure the build environment has pnpm available. The repository includes `.nvmrc` specifying Node 22 and `pnpm-lock.yaml` for reproducible dependency installation.

Set `VITE_SITE_URL` in Cloudflare Pages environment variables to the actual stable production origin (for example, `https://your-project.pages.dev`, or your verified custom domain), with no trailing slash. The build now fails on Cloudflare Pages if this value is missing or is not an HTTPS origin; this prevents publishing canonical URLs for an assumed hostname. Do not use a per-deployment preview URL as the canonical origin. Local/CI builds without Cloudflare Pages use `https://samstoolhub.pages.dev` as a fallback for validation only. Canonical, Open Graph and homepage JSON-LD metadata are generated from the configured value. Tool pages set their own title, description, canonical URL and JSON-LD at runtime.

Cloudflare Pages serves this as a single-page application. The app routes are `/` and `/tools/:slug`; verify that direct visits and refreshes on tool URLs work after deployment.

## Search engine files

- `public/robots.txt` permits crawling and points to the XML sitemap.
- `public/sitemap.xml` lists the homepage and the eight implemented tool routes.
- `scripts/verify-dist.mjs` checks that the sitemap, robots file, favicon and built assets are present.

The build rewrites the generated `robots.txt` and `sitemap.xml` to use the same origin as `VITE_SITE_URL`. If the production hostname changes, set `VITE_SITE_URL` to that hostname.

## Project layout

```
src/                     React app, homepage, router and tool implementations
public/                  favicon, robots.txt and sitemap.xml
scripts/                 production build, React prebundle and output checks
_diagnostics/            build investigation notes and reproduction configs
index.html                homepage metadata and JSON-LD template
vite.config.ts            Vite configuration
package.json              scripts and dependencies
pnpm-lock.yaml            locked dependency graph
```

## Current scope and future improvements

The repository currently has eight implemented tool routes. The homepage includes broader tool categories, but only implemented routes should be listed in the sitemap. The JavaScript bundle is relatively large; route-level lazy loading is a potential future performance improvement. Social sharing imagery can also be added later.
