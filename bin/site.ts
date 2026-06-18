// Build entry — thin wrapper over tosijs-ui/site's reusable doc-site pipeline.
// Everything declarative lives in ../site.config.ts; this file just dispatches
// build-only vs dev-server.
//
//   bun bin/site.ts            # build the doc site, then start the dev server
//   bun bin/site.ts --build    # build the doc site (incl. library tsc) and exit (0/1)

import { buildSite, devServer } from 'tosijs-ui/site'
import config from '../site.config'

const buildOnly = process.argv.includes('--build')

const ok = await buildSite(config)
if (!ok) process.exit(1)
if (buildOnly) process.exit(0)

await devServer(config)
