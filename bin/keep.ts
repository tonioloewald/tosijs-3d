/*
A supervisor for the dev server.

`bun start` has been killed eight times in two days by a `pkill -f 'bun
bin/site.ts'` from a concurrent session in a sibling checkout — a command that
reads as "restart mine" and matches every dev server on the machine, because
every project on this pipeline runs an identical command line (tosijs-ui#117).
Each loss is invisible until someone reloads a page.

This does not fix that; it makes it not matter. It watches the port and brings
the server back, so a review session is not interrupted by someone else's
restart.

Deliberately OPT-IN (`bun run keep`, not `bun start`): a process that
resurrects a server would otherwise fight `bun stop`, and a supervisor you did
not ask for is worse than a server that stays down.

`bun stop` removes the sentinel first, so a deliberate stop stays stopped.
*/
import { $ } from 'bun'
import { existsSync, writeFileSync, unlinkSync } from 'fs'
import config from '../site.config'

const SENTINEL = '.dev-keeper'
const PORT = (config as { port?: number }).port ?? 8030
const EVERY_MS = 15_000

if (process.argv.includes('--stop')) {
  if (existsSync(SENTINEL)) unlinkSync(SENTINEL)
  console.log('Keeper will exit within 15s.')
  process.exit(0)
}

writeFileSync(SENTINEL, String(process.pid))
console.log(
  `Keeping the dev server up on ${PORT}. Stop with \`bun stop\` (or delete ${SENTINEL}).`
)

const listening = async (): Promise<boolean> =>
  (
    await $`lsof -nP -iTCP:${PORT} -sTCP:LISTEN -t`.quiet().nothrow().text()
  ).trim().length > 0

let restarts = 0
while (existsSync(SENTINEL)) {
  if (!(await listening())) {
    restarts++
    console.log(`[keeper] dev server is down — restart #${restarts}`)
    /*
    Detached, so the keeper is not the parent: a signal aimed at one must not
    take the other with it.

    `bin/site.ts` directly rather than `bun start`, which runs `bun format`
    first — a lint error should not stop the keeper from restoring a server, and
    the person who introduced it will see it from their own `bun start`.
    */
    Bun.spawn(['bun', 'bin/site.ts'], {
      stdio: ['ignore', 'ignore', 'ignore'],
      detached: true,
    }).unref()
    await Bun.sleep(45_000) // let the build finish before checking again
  }
  await Bun.sleep(EVERY_MS)
}
console.log(`[keeper] sentinel gone — exiting after ${restarts} restart(s).`)
