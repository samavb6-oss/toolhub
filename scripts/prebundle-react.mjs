// Pre-bundles React, ReactDOM and the JSX runtimes into plain ES modules with esbuild.
//
// Why: React/ReactDOM ship CommonJS only. During `vite build`, CommonJS dependencies go
// through Rollup's commonjs plugin, which is the step that stalls on react-dom in this
// project. esbuild converts CommonJS to ESM natively (it is what `vite dev` already uses
// for dependency pre-bundling), so we do that conversion up front and let Vite alias
// `react`, `react-dom`, ... to the generated ESM files. Vite then only sees ES modules.
//
// All shims share ONE copy of React: the react-dom / client shims import `react` and
// `react-dom` as real ESM imports, which Vite resolves to the shims below.
import { createRequire } from 'node:module';
import { mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const shimDir = path.join(root, '.shims');

const rootRequire = createRequire(path.join(root, 'package.json'));

function loadEsbuild() {
  const attempts = [
    () => rootRequire('esbuild'),
    // pnpm keeps esbuild next to vite (vite depends on it); resolve it from there.
    () => createRequire(rootRequire.resolve('vite/package.json'))('esbuild'),
  ];
  for (const attempt of attempts) {
    try {
      return attempt();
    } catch {
      /* try next */
    }
  }
  throw new Error('prebundle-react: esbuild could not be resolved (it is a dependency of vite).');
}

const RESERVED = new Set(
  ('break case catch class const continue debugger default delete do else enum export extends false ' +
    'finally for function if import in instanceof new null return super switch this throw true try ' +
    'typeof var void while with yield let static implements interface package private protected public await')
    .split(' '),
);

function exportNames(specifier) {
  process.env.NODE_ENV = 'production';
  const mod = rootRequire(specifier);
  return Object.keys(mod).filter(
    (k) => k !== 'default' && k !== '__esModule' && /^[A-Za-z_$][\w$]*$/.test(k) && !RESERVED.has(k),
  );
}

function entrySource(specifier) {
  const names = exportNames(specifier);
  return [
    `import M from '${specifier}';`,
    ...names.map((n) => `export const ${n} = M.${n};`),
    'export default M;',
    '',
  ].join('\n');
}

// [output file, module to wrap, modules that must stay as (exact) ESM imports]
export const targets = [
  ['react.mjs', 'react', []],
  ['react-jsx-runtime.mjs', 'react/jsx-runtime', ['react']],
  ['react-jsx-dev-runtime.mjs', 'react/jsx-dev-runtime', ['react']],
  ['react-dom.mjs', 'react-dom', ['react']],
  ['react-dom-client.mjs', 'react-dom/client', ['react', 'react-dom']],
];

// esbuild's `external: ['react']` also matches 'react/jsx-runtime', and a CommonJS
// `require('react')` left external would become a browser-incompatible __require() call.
// This plugin keeps externals EXACT and turns them into real ESM `import` statements.
function exactExternals(names) {
  const escape = (n) => n.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  return {
    name: 'exact-externals',
    setup(build) {
      names.forEach((name, i) => {
        const marker = `__toolhub_external_${i}__`;
        // `require('react')` / `import 'react'` -> tiny wrapper module in a private namespace
        build.onResolve({ filter: new RegExp(`^${escape(name)}$`) }, () => ({
          path: name,
          namespace: 'toolhub-external',
        }));
        // the wrapper imports a marker that resolves to the real, external ESM import
        build.onResolve({ filter: new RegExp(`^${marker}$`) }, () => ({ path: name, external: true }));
      });
      build.onLoad({ filter: /.*/, namespace: 'toolhub-external' }, (args) => ({
        contents: `import M from '__toolhub_external_${names.indexOf(args.path)}__'; module.exports = M;`,
        loader: 'js',
      }));
    },
  };
}


// What each generated shim must look like.
//   specifier: the bare import this shim replaces (a shim importing its OWN specifier would
//              resolve back to itself through the Vite alias -> circular shim);
//   allowed:   the only bare imports it may contain (anything else could pull in a 2nd React);
//   required:  imports it MUST contain so that all shims share ONE React / ReactDOM. Note the JSX
//              runtimes need none: React's production jsx-runtime builds elements from
//              Symbol.for(...) and never requires 'react' (only the development build does);
//   exports:   a representative subset - if the CommonJS -> ESM conversion dropped exports,
//              one of these would be missing.
const EXPECTED = {
  'react.mjs': { specifier: 'react', allowed: [], required: [], exports: ['default', 'useState', 'useEffect', 'createElement', 'Fragment', 'forwardRef', 'createContext', 'useContext', 'useSyncExternalStore'] },
  'react-jsx-runtime.mjs': { specifier: 'react/jsx-runtime', allowed: ['react'], required: [], exports: ['default', 'jsx', 'jsxs', 'Fragment'] },
  'react-jsx-dev-runtime.mjs': { specifier: 'react/jsx-dev-runtime', allowed: ['react'], required: [], exports: ['default', 'jsxDEV', 'Fragment'] },
  'react-dom.mjs': { specifier: 'react-dom', allowed: ['react'], required: ['react'], exports: ['default', 'createPortal', 'flushSync'] },
  'react-dom-client.mjs': { specifier: 'react-dom/client', allowed: ['react', 'react-dom'], required: ['react', 'react-dom'], exports: ['default', 'createRoot', 'hydrateRoot'] },
};

/** Static sanity check of the generated shims. Throws with every problem found. */
export async function verifyShims(dir = shimDir) {
  const problems = [];
  for (const [file, { specifier, allowed, required, exports: requiredExports }] of Object.entries(EXPECTED)) {
    let code;
    try {
      code = await readFile(path.join(dir, file), 'utf8');
    } catch {
      problems.push(`${file}: missing`);
      continue;
    }
    if (code.length < 100) problems.push(`${file}: suspiciously small (${code.length} bytes)`);

    // imports: only the exact, expected ESM specifiers; never itself.
    const found = new Set(
      [...code.matchAll(/\bfrom\s*["']([^"']+)["']|(?:^|[;}])\s*import\s*["']([^"']+)["']/g)].map((m) => m[1] ?? m[2]),
    );
    for (const spec of found) if (!allowed.includes(spec)) problems.push(`${file}: unexpected import "${spec}"`);
    for (const spec of required) if (!found.has(spec)) problems.push(`${file}: required import "${spec}" is missing (would not share one React)`);
    if (found.has(specifier)) problems.push(`${file}: imports itself ("${specifier}") -> circular shim`);

    // no CommonJS leftovers that would throw in a browser; production React only
    if (/\b__require\b|\brequire\s*\(/.test(code)) problems.push(`${file}: contains an unresolved require()`);
    if (/\bprocess\.env\.NODE_ENV\b/.test(code)) problems.push(`${file}: unreplaced process.env.NODE_ENV`);

    // exports
    const exported = new Set();
    for (const m of code.matchAll(/\bexport\s*\{([^}]*)\}/g))
      for (const part of m[1].split(',')) {
        const name = part.trim().split(/\s+as\s+/).pop();
        if (name) exported.add(name);
      }
    for (const m of code.matchAll(/\bexport\s+(?:const|let|var|function|class)\s+([\w$]+)/g)) exported.add(m[1]);
    for (const name of requiredExports) if (!exported.has(name)) problems.push(`${file}: missing export "${name}"`);
  }
  if (problems.length) throw new Error('React shim verification failed:\n  - ' + problems.join('\n  - '));
  return true;
}

export async function prebundleReact() {
  const esbuild = loadEsbuild();
  await rm(shimDir, { recursive: true, force: true });
  await mkdir(shimDir, { recursive: true });

  for (const [file, specifier, external] of targets) {
    await esbuild.build({
      stdin: { contents: entrySource(specifier), resolveDir: root, loader: 'js' },
      outfile: path.join(shimDir, file),
      bundle: true,
      format: 'esm',
      platform: 'browser',
      target: 'es2020',
      plugins: [exactExternals(external)],
      define: { 'process.env.NODE_ENV': '"production"' },
      minify: true,
      legalComments: 'none',
      logLevel: 'warning',
    });
  }

  await writeFile(
    path.join(shimDir, 'README.txt'),
    'Generated by scripts/prebundle-react.mjs during `pnpm build`. Safe to delete; not committed.\n',
  );
  await verifyShims();
  return shimDir;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const dir = await prebundleReact();
  console.log(`[toolhub] React shims written to ${dir}`);
}
