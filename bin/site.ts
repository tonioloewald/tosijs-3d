// Build entry — thin wrapper over tosijs-ui/site's reusable doc-site pipeline.
// Declarative config lives in ../site.config.ts; this file just dispatches
// build-only vs dev-server, and runs the per-file library tsc on --build so the
// npm package's dist/ ships alongside the doc site.
//
//   bun bin/site.ts            # build the doc site, then start the dev server
//   bun bin/site.ts --build    # build the doc site + library and exit (0/1)

import { $ } from 'bun'
import { buildSite, devServer } from 'tosijs-ui/site'
import config from '../site.config'

const buildOnly = process.argv.includes('--build')

const ok = await buildSite(config)
if (!ok) process.exit(1)

if (buildOnly) {
  // Library build for the published npm package: per-file unminified .js +
  // .d.ts + sourcemaps (the root tsconfig is noEmit; tsconfig.build.json
  // overrides). buildSite handles the doc site; this handles the package.
  await $`bun --bun tsc -p tsconfig.build.json`
  process.exit(0)
}

await devServer(config)
