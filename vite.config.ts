import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';

const root = path.resolve(import.meta.dirname);
const shimDir = path.join(root, '.shims');

// React and ReactDOM are CommonJS-only. `pnpm build` (scripts/build.mjs) pre-bundles them
// to ES modules with esbuild and sets TOOLHUB_USE_REACT_SHIMS=1; the aliases below then
// point every `react*` import at those ES modules, so Rollup never runs its CommonJS
// transform on react-dom. Matching is EXACT (anchored regexes), so `react-day-picker`,
// `react-is`, `@radix-ui/react-*` and friends are never touched.
const REACT_SHIMS: Record<string, string> = {
  react: 'react.mjs',
  'react/jsx-runtime': 'react-jsx-runtime.mjs',
  'react/jsx-dev-runtime': 'react-jsx-dev-runtime.mjs',
  'react-dom': 'react-dom.mjs',
  'react-dom/client': 'react-dom-client.mjs',
};

const exact = (specifier: string) => new RegExp(`^${specifier.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}$`);

// Safety net for the shim approach (build only):
//  - warn about react/react-dom sub-paths that are NOT shimmed (they would go through the
//    slow CommonJS path and could create a second copy of React);
//  - fail the build if any real react / react-dom / scheduler module still ended up in a
//    chunk, because that would mean two React instances in the browser.
function reactSingletonGuard(): Plugin {
  const realReactModule =
    /[\\/]node_modules[\\/](?:\.pnpm[\\/][^\\/]+[\\/]node_modules[\\/])?(react|react-dom|scheduler)[\\/]/;
  return {
    name: 'toolhub:react-singleton-guard',
    apply: 'build',
    enforce: 'pre',
    resolveId(source) {
      if (/^react(-dom)?\/./.test(source) && !(source in REACT_SHIMS)) {
        this.warn(`"${source}" is not covered by the React shims (scripts/prebundle-react.mjs).`);
      }
      return null;
    },
    generateBundle(_options, bundle) {
      if (process.env.TOOLHUB_ALLOW_REACT_BYPASS === '1') return;
      const leaked = new Set<string>();
      for (const item of Object.values(bundle)) {
        if (item.type !== 'chunk') continue;
        for (const id of Object.keys(item.modules)) {
          if (realReactModule.test(id)) leaked.add(id);
        }
      }
      if (leaked.size > 0) {
        this.error(
          'Real react/react-dom/scheduler modules were bundled next to the React shims ' +
            '(duplicate React risk):\n  ' + [...leaked].slice(0, 10).join('\n  ') +
            '\nSet TOOLHUB_ALLOW_REACT_BYPASS=1 to skip this check.',
        );
      }
    },
  };
}

export default defineConfig(({ command }) => {
  const building = command === 'build';
  const shimsRequested = process.env.TOOLHUB_USE_REACT_SHIMS === '1';

  // A bare `vite build` would skip the shim step and take the slow CommonJS path.
  if (building && !shimsRequested && process.env.TOOLHUB_ALLOW_PLAIN_BUILD !== '1') {
    throw new Error(
      'Use `pnpm build` (it prepares the React shims first). ' +
        'Set TOOLHUB_ALLOW_PLAIN_BUILD=1 to run a plain `vite build` for diagnostics.',
    );
  }

  const useShims = building && shimsRequested;

  return {
    base: '/',
    plugins: [
      react(),
      tailwindcss(),
      ...(useShims ? [reactSingletonGuard()] : []),
    ],
    resolve: {
      alias: [
        ...(useShims
          ? Object.entries(REACT_SHIMS).map(([specifier, file]) => ({
              find: exact(specifier),
              replacement: path.join(shimDir, file),
            }))
          : []),
        { find: /^@\//, replacement: path.join(root, 'src') + '/' },
      ],
      dedupe: ['react', 'react-dom'],
    },
    root,
    build: {
      outDir: path.resolve(root, 'dist'),
      emptyOutDir: true,
    },
    server: {
      host: '0.0.0.0',
    },
    preview: {
      host: '0.0.0.0',
    },
  };
});
