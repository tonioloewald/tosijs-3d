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
  // jolt-physics is loaded at runtime via the importmap (headExtra below) so
  // its ~MB-sized loader doesn't bloat the hydration bundle.
  bundleExternals: ['jolt-physics'],

  docPaths: ['src', 'README.md'],
  staticDirs: ['static'],
  port: 8030,

  // Hosted on GitHub Pages at the 3d.tosijs.net apex subdomain (CNAME).
  host: 'github-pages',

  // tosijs-ui's llms.txt template is project-agnostic to a fault — it stamps
  // tosijs-ui's URLs and "web component library" framing into the output. Off
  // until upstream supports per-project content; the doc comments embedded in
  // dist/*.js (preserved via removeComments:false) are the canonical agent
  // source anyway.
  llmsTxt: false,

  // Every page needs the importmap so live examples (and the hydration bundle)
  // can `import 'jolt-physics'`. The WASM compat loader is copied into static/
  // by prebuild and ends up served from the site root.
  headExtra: `<script type="importmap">{"imports":{"jolt-physics":"/jolt-physics.wasm-compat.js"}}</script>`,

  prebuild: async () => {
    await $`cp node_modules/jolt-physics/dist/jolt-physics.wasm-compat.js static/jolt-physics.wasm-compat.js`
  },
})
