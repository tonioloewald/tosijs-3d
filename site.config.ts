// Site configuration for the tosijs-3d documentation site.
// Consumed by bin/site.ts (build + dev). See tosijs-ui/site for the full
// option set.

import { defineSiteConfig } from 'tosijs-ui/site'
import { $ } from 'bun'

const PROJECT = 'tosijs-3d'

export default defineSiteConfig({
  name: PROJECT,
  description:
    'Declarative 3D/XR framework built on Babylon.js and the tosijs web component framework.',
  baseUrl: 'https://3d.tosijs.net',

  // Brand mark (teal cube). Without this, generate-site defaults to the generic
  // /favicon.svg shipped in static/.
  favicon: '/tosijs-3d.svg',

  projectLinks: {
    tosijs: 'https://tosijs.net',
    github: `https://github.com/tonioloewald/${PROJECT}`,
  },
  navbarLinks: [
    { href: 'https://tosijs.net', label: 'tosijs', icon: 'tosi' },
    {
      href: `https://github.com/tonioloewald/${PROJECT}`,
      label: 'github',
      icon: 'github',
    },
    {
      href: `https://www.npmjs.com/package/${PROJECT}`,
      label: 'npmjs',
      icon: 'npm',
    },
  ],

  theme: {
    accent: '#EE257B',
    background: '#fafafa',
    text: '#222222',
  },

  bundleEntry: './demo/site.ts',
  // jolt-physics is loaded at runtime via the importmap (headExtra below). Why
  // not bundle it? Two reasons. Statically, jolt-physics has a Node-only
  // branch (`await import('module')`) Bun's browser target refuses to parse;
  // dynamically, the wasm-compat loader uses `import.meta.url`, which is
  // illegal in a classic `<script>` (the only form tosijs-ui's site emits).
  // External + dynamic `import()` in b3d-physics.ts side-steps both: the
  // `import('jolt-physics')` expression survives the bundle and the browser
  // resolves it via the page's importmap, fetching the standalone ESM module.
  bundleExternals: ['jolt-physics'],

  docPaths: ['src', 'README.md'],
  staticDirs: ['static'],
  port: 8030,

  // Give a coding agent eyes + hands on the running dev page via haltija: the dev
  // server injects a localhost-gated loader (runtime import of the shared local
  // channel's dev.js — never bundled, self-disables off-localhost) and reuses (or
  // spins up) the channel on 8701. The channel is SHARED across local projects —
  // each dev web server has its own port (8030 here), but they all connect to the
  // one haltija channel; `hj tabs` lists every connected page. Needs mkcert (done).
  haltijaDev: true,

  // tosijs-ui >=1.6.19's build-time example checker only knows the default
  // `tosijs` / `tosijs-ui` import context — but nearly every demo here imports
  // from `tosijs-3d` (the library being documented), which we seed into the LIVE
  // example context in demo/site.ts. The build-time check can't see that custom
  // context and there's no config knob to pass extra contextKeys, so per the
  // tosijs-ui docs we disable it. (The in-browser test tab still runs examples.)
  checkExamples: false,

  // Let the live-example editor's "save local" write an in-browser `/*# */` edit back to its source
  // file. Dev-only + localhost-gated in tosijs-ui's dev server (never on the deployed site). Off by
  // default — which is why an edit-and-save earlier silently didn't reach `src/`: the write endpoint
  // is disabled and the client didn't surface the "not enabled" error. On, it persists to the .ts.
  editableSources: true,

  // Hosted on GitHub Pages at the 3d.tosijs.net apex subdomain (CNAME).
  host: 'github-pages',

  // Library build: tsc -p tsconfig.build.json (per-file unminified `.js` +
  // `.d.ts` with `removeComments: false`, so the published npm package ships
  // browseable source + types with the /*# */ blocks still embedded for AI
  // readers). buildSite runs this after the doc-site build; no separate tsc
  // step needed in bin/site.ts.
  emitLibrary: true,
  libraryTsconfig: 'tsconfig.build.json',

  // Importmap so the IIFE's runtime `import('jolt-physics')` resolves to the
  // ESM loader copied into static/ by prebuild. Dynamic `import()` in a
  // classic `<script>` consults the page's importmap, so this works without
  // having to load iife.js as a module.
  headExtra: `<script type="importmap">{"imports":{"jolt-physics":"/jolt-physics.wasm-compat.js"}}</script>`,

  prebuild: async () => {
    await $`cp node_modules/jolt-physics/dist/jolt-physics.wasm-compat.js static/jolt-physics.wasm-compat.js`
  },
})
