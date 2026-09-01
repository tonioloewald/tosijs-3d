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
  Stop THIS project's dev server, identified by PROJECT rather than by pattern.

  tosijs-ui's build lock records `pid`, `role`, `root` and `port` per project,
  with staleness decided by liveness rather than age — so a crashed server
  cannot wedge the project and a sibling checkout is never touched. That is the
  right answer to tosijs-ui#117, and `currentHolder` became reachable to
  consumers in 1.12.6 (tosijs-ui#118, which we filed after finding the reader
  existed but was not exported).

  The port fallback stays for a server started before the lock existed, or by a
  different tool. It is weaker — it identifies by port, so two checkouts sharing
  one would confuse it — which is exactly why it is the fallback and not the
  mechanism.
  */
  // A deliberate stop must stay stopped — drop the keeper's sentinel first, or
  // it brings the server straight back and `bun stop` looks broken.
  const { existsSync, unlinkSync } = await import('node:fs')
  if (existsSync('.dev-keeper')) unlinkSync('.dev-keeper')
  const { currentHolder } = await import('tosijs-ui/site')
  const holder = currentHolder('.')
  if (holder) {
    process.kill(holder.pid, 'SIGTERM')
    console.log(
      `Stopped ${holder.role} for ${holder.root} (pid ${holder.pid}${
        holder.port ? `, port ${holder.port}` : ''
      }).`
    )
    process.exit(0)
  }
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
    console.log(`No dev server running for this project (nothing on ${port}).`)
    process.exit(0)
  }
  for (const pid of pids) process.kill(Number(pid), 'SIGTERM')
  console.log(
    `Stopped a server on ${port} (pid ${pids.join(
      ', '
    )}) — no lock, so identified by port.`
  )
  process.exit(0)
}

const ok = await buildSite(config)
if (!ok) process.exit(1)
if (buildOnly) process.exit(0)

await devServer(config)
