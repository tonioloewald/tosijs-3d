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

  // Brand mark (teal cube) — the canonical /favicon.svg in static/.
  favicon: '/favicon.svg',
  // Doc-browser header mark (tosijs-ui >=1.7.4 `logo` option): the tosiXr icon,
  // which reads better against the header background than the cube. `logo` also
  // accepts an image URL — the cube stays as the favicon (browser tab) above.
  logo: 'tosiXr',

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
  // Two head injections: the jolt importmap, and a project-wide override that drops the
  // live-example preview inset. tosijs-ui's `tosi-example` is a LIGHT-DOM component whose
  // `.preview` container carries `padding: var(--spacing)` (~10px breathing room) — sensible
  // for a widget demo, but here nearly every example is a full-bleed `<tosi-b3d>` scene where
  // the inset just fences the canvas off from its own rounded border. The extra `tosi-doc-system`
  // ancestor lifts specificity above the component's own `tosi-example .preview` rule, so this
  // wins regardless of stylesheet injection order (no `!important` needed).
  headExtra: `<script type="importmap">{"imports":{"jolt-physics":"/jolt-physics.wasm-compat.js"}}</script><style>tosi-doc-system tosi-example .preview{padding:0}</style>`,

  // Remote access — `bun run tunnel` (tosijs-ui's `tosijs-tunnel` bin) publishes THIS
  // dev server, not a static copy, at an authenticated URL: the live site, live
  // examples and "save local" editing all work from a phone, a hotel, or a headset.
  //
  // STILL only one hostname — this project's public site is GitHub Pages at
  // 3d.tosijs.net, so there is no static preview to serve, only the live workspace
  // (hence no `preview.url`). But it now carries the `.edit.` label, because 1.9.0-rc.1
  // made that label MEAN something rather than being decoration:
  //
  //     <project>.dev.tosijs.net       read-only static preview, shareable
  //     <project>.edit.dev.tosijs.net  live workspace, session always required
  //
  // A bare `3d.dev.tosijs.net` would now advertise "shareable read-only snapshot" for
  // something that is neither — it is a writable mirror of an uncommitted tree. The
  // prefix is signage for humans, not routing.
  //
  // `requireToken` is left at its rc.1 default of TRUE: no session, nothing at all.
  // Deliberate — the hostname is not a secret (Let's Encrypt publishes every cert to
  // public CT logs), so obscurity isn't doing any work here.
  //
  // `remotePort` MUST be unique per project on the box: sshd's `GatewayPorts no` binds
  // it to the box's loopback, and a second project reusing a port means whichever ssh
  // connected first wins while the other silently forwards nothing. tosijs-ui holds
  // 9787. (`localPort` is left unset: since rc.2 it defaults to `PORT + 1` — 8031 for
  // us — rather than a fixed 8788, so two dev servers can coexist instead of the second
  // dying on EADDRINUSE. It's the dev server's separate loopback-only tunnel listener,
  // and arriving on THAT socket is what marks a request as remote, so writes always
  // demand a session — unforgeable in a way an X-Forwarded-* header is not.)
  // `localPort` is deliberately NOT set: since 1.9.0 both halves resolve it through one
  // shared `resolveTunnelLocalPort` (tosijs-ui#39), so the dev server's listener and the
  // tunnel's probe cannot disagree. It had to be pinned on rc.2, where the server used
  // `PORT + 1` and the bin a hard-coded 8788 — values that coincide only when PORT is
  // 8787, i.e. on tosijs-ui itself, which is exactly why it shipped.
  // The deploy/tunnel HOST comes from the environment, not the repo: this is a
  // public repository, and a committed `user@ip` means any fork running
  // `bun run tunnel` opens outbound SSH to a stranger's box (0.6.0 review
  // finding). The tunnel/deploy bins already resolve
  // `--host ?? PREVIEW_HOST ?? preview.host`, so we commit everything EXCEPT
  // the host and set `PREVIEW_HOST=user@box` in the shell. (The v0.6.0 gate
  // caught the first version of this fix inventing its own variable — use the
  // one upstream already reads.)
  preview: {
    tunnel: { remotePort: 9788, url: 'https://3d.edit.dev.tosijs.net' },
  },

  prebuild: async () => {
    await $`cp node_modules/jolt-physics/dist/jolt-physics.wasm-compat.js static/jolt-physics.wasm-compat.js`
  },
})
