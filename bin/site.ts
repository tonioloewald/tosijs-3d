// Build entry — thin wrapper over tosijs-ui/site's reusable doc-site pipeline.
// Everything declarative lives in ../site.config.ts; this file just dispatches
// build-only vs dev-server.
//
//   bun bin/site.ts            # build the doc site, then start the dev server
//   bun bin/site.ts --build    # build the doc site (incl. library tsc) and exit (0/1)

import { $ } from 'bun'
import { buildSite, devServer } from 'tosijs-ui/site'
import config from '../site.config'

const buildOnly = process.argv.includes('--build')

/*
`--stop` — stop THIS project's dev server, and nothing else.

The point of it (tosijs-ui#117, which we filed after losing a server five times
in a day): without a stop command the thing everyone reaches for is
`pkill -f 'bun bin/site.ts'`, which matches EVERY dev server on the machine,
because every project on this pipeline runs an identical command line. A
sibling checkout dies to a command that reads as "restart mine".

The record it needs already exists — tosijs-ui's build lock stores `pid`, `port`
and `root` per project, with staleness decided by LIVENESS rather than age, so a
crashed server cannot wedge the project. This reads that and signals exactly
that pid.

Our entry is `bin/site.ts` rather than upstream's `bin/dev.ts`, so the wiring is
ours; the mechanism is theirs.
*/
if (process.argv.includes('--stop')) {
  /*
  Ask the OS what is listening, rather than matching a command line.

  Upstream's `bun run stop` reads the build lock — which records pid, port and
  root per project — but `tosijs-ui/site` does not re-export the reader and the
  package's `exports` map blocks a deep import, so a consumer cannot use it
  (filed upstream). Re-deriving the lock PATH here would mean copying their
  FNV-1a hash of the resolved root, and if that ever changed we would report
  "nothing running" while a server ran: a silently wrong answer, which is worse
  than no command.

  The port is a fact we own and the OS can be asked about directly. It cannot
  drift, and when it finds nothing it is because nothing is listening.
  */
  const port = config.port ?? 8030
  const found = await $`lsof -nP -iTCP:${port} -sTCP:LISTEN -t`
    .quiet()
    .nothrow()
    .text()
  const pids = found
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
  if (pids.length === 0) {
    console.log(`No dev server listening on ${port}.`)
    process.exit(0)
  }
  for (const pid of pids) process.kill(Number(pid), 'SIGTERM')
  console.log(`Stopped dev server on ${port} (pid ${pids.join(', ')}).`)
  process.exit(0)
}

const ok = await buildSite(config)
if (!ok) process.exit(1)
if (buildOnly) process.exit(0)

await devServer(config)
