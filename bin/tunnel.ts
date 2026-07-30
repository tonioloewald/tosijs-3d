/*
Expose THIS machine's dev server at an authenticated public URL.

  bun run tunnel          # open the tunnel (foreground; Ctrl-C closes it)
  bun run tunnel --status # is one already up?
  bun run tunnel --close  # close any tunnel this project opened
  bun run tunnel --link   # print a fresh single-use edit link

The work happens where the data is. The repo, the dev server, the build and the watcher
all stay here; the box terminates TLS and checks a credential and does no compute at
all. That is what lets one small VPS front many projects.

WHY IT IS SAFE to expose a dev server that can write repo files:

  - The box runs sshd with `GatewayPorts no`, so the forwarded port binds 127.0.0.1
    THERE and is not reachable from the internet. Caddy is the only thing that can
    reach it.
  - Writes are gated on a SESSION, not on the peer address. `ssh -R` delivers to
    localhost here, so every tunnelled request looks loopback — a naive
    "loopback OR session" check would let anyone past the proxy write files. tosijs-ui
    splits on whether the request was PROXIED (Caddy sets `X-Forwarded-*`):
    proxied → a valid session is required; direct → a loopback peer is enough (you are
    at this keyboard). Forging the header can only make the check stricter.

So: closed by default, open only through something that authenticates.

⚠️  PINNED TO tosijs-ui 1.9.0-beta.2 SEMANTICS.
    The beta ships the auth and the gating, but not the newer ergonomics its own repo
    has already moved to. Two concrete differences, both handled below:
      1. No `/__devlink` HTTP endpoint — beta.2 mints a link only on SIGUSR2, so
         `--link` signals the dev server instead of asking it over HTTP.
      2. No separate plain-HTTP tunnel listener (`preview.tunnel.localPort`, 8788).
         beta.2 serves one TLS listener, so we forward to the HTTPS dev port and Caddy
         needs `tls_insecure_skip_verify` (the dev cert is mkcert-signed, and the hop
         is inside SSH regardless).
    When a beta lands with both, simplify this file and drop the skip-verify.
    Tracked in UPSTREAM.md.
*/

import { $ } from 'bun'
import siteConfig from '../site.config'

const args = process.argv.slice(2)
const has = (n: string) => args.includes(`--${n}`)
const flag = (n: string) => {
  const hit = args.find((a) => a.startsWith(`--${n}=`))
  return hit ? hit.slice(n.length + 3) : undefined
}

const preview = (
  siteConfig as {
    preview?: {
      host?: string
      tunnel?: { remotePort?: number; url?: string }
    }
  }
).preview

const host = flag('host') ?? process.env.PREVIEW_HOST ?? preview?.host
// The dev server's own (TLS) port — what we forward to, per the beta.2 note above.
const localPort = Number(
  flag('port') ?? process.env.PORT ?? siteConfig.port ?? 8787
)
const remotePort = Number(
  flag('remote-port') ?? preview?.tunnel?.remotePort ?? 9787
)
const publicUrl = flag('url') ?? preview?.tunnel?.url

if (!host) {
  console.error(
    `\nNo tunnel host. Set \`preview.host\` in site.config.ts, or pass --host=user@box.\n`
  )
  process.exit(1)
}

/** pgrep pattern matching only OUR forward, so --close can't kill someone else's. */
const pattern = `ssh .*-R ${remotePort}:localhost:${localPort} ${host}`

async function running(): Promise<number[]> {
  const out = await $`pgrep -f ${pattern}`.nothrow().quiet().text()
  return out.trim().split('\n').filter(Boolean).map(Number)
}

if (has('link')) {
  /*
  beta.2 has no /__devlink, so ask the dev server for a link by signalling it: it
  prints one on SIGUSR2. Finding the process by argv is a guess, and upstream called
  that out as a mistake — so be narrow and LOUD rather than clever: match this repo's
  exact dev entry point, and refuse to signal anything if that matches more than one
  process rather than spraying SIGUSR2 around.
  */
  const out = await $`pgrep -f "bun( --watch)? bin/site.ts"`
    .nothrow()
    .quiet()
    .text()
  const pids = out.trim().split('\n').filter(Boolean).map(Number)
  if (pids.length === 0) {
    console.error(
      `\nNo dev server found (looked for \`bun bin/site.ts\`). Start \`bun start\` first.\n` +
        `  The link is minted by the running server — a token invented here would not be\n` +
        `  recognised by it.\n`
    )
    process.exit(1)
  }
  if (pids.length > 1) {
    console.error(
      `\nMore than one dev server matched (pid ${pids.join(
        ', '
      )}). Not signalling —\n` +
        `  stop the extras, or run \`kill -USR2 <pid>\` on the one you want.\n`
    )
    process.exit(1)
  }
  process.kill(pids[0], 'SIGUSR2')
  console.log(
    `\n🔗 Asked the dev server (pid ${pids[0]}) for a link — it prints it in ITS console,\n` +
      `   i.e. the terminal running \`bun start\`. Valid 15 minutes, single use.\n`
  )
  process.exit(0)
}

if (has('status')) {
  const pids = await running()
  console.log(
    pids.length
      ? `tunnel UP (pid ${pids.join(', ')}) — ${
          publicUrl ?? `remote :${remotePort}`
        }`
      : 'tunnel down'
  )
  process.exit(0)
}

if (has('close')) {
  const pids = await running()
  for (const pid of pids) {
    try {
      process.kill(pid, 'SIGTERM')
    } catch {
      /* already gone */
    }
  }
  console.log(
    pids.length ? `closed (pid ${pids.join(', ')})` : 'nothing to close'
  )
  process.exit(0)
}

// Refuse to open a second one: two forwards racing for the same remote port means
// whichever sshd accepted first wins and the other silently does nothing, which
// presents as "my edits go to the wrong machine".
const existing = await running()
if (existing.length) {
  console.log(
    `Tunnel already up (pid ${existing.join(
      ', '
    )}). Use --close first, or --status.\n` + `${publicUrl ?? ''}`
  )
  process.exit(0)
}

// Is the dev server actually up? A tunnel to nothing yields a confusing 502 at the far
// end rather than an obvious local error.
const alive =
  await $`curl -sk --max-time 4 -o /dev/null https://localhost:${localPort}/`
    .nothrow()
    .quiet()
if (alive.exitCode !== 0) {
  console.warn(
    `⚠️  Nothing answering on https://localhost:${localPort} — start \`bun start\` first,\n` +
      `   or the public URL will 502.\n`
  )
}

console.log(`\n🔌 ${host}  :${remotePort} → localhost:${localPort}`)
if (publicUrl) console.log(`   ${publicUrl}`)
console.log(`   Ctrl-C to close.\n`)

// -N: forwarding only, no remote command.
// ExitOnForwardFailure: if the remote port is taken, fail loudly instead of sitting
// there forwarding nothing while the URL 502s.
// ServerAlive*: NAT and hotel wifi drop idle connections silently.
const proc = Bun.spawn(
  [
    'ssh',
    '-N',
    '-o',
    'ExitOnForwardFailure=yes',
    '-o',
    'ServerAliveInterval=30',
    '-o',
    'ServerAliveCountMax=3',
    '-R',
    `${remotePort}:localhost:${localPort}`,
    host,
  ],
  { stdout: 'inherit', stderr: 'inherit' }
)

const bye = () => {
  proc.kill()
  process.exit(0)
}
process.on('SIGINT', bye)
process.on('SIGTERM', bye)

const code = await proc.exited
if (code !== 0) {
  console.error(
    `\nssh exited ${code}. If it says "remote port forwarding failed", something else\n` +
      `  already holds :${remotePort} on ${host} — each project needs its OWN remote port.\n`
  )
}
process.exit(code ?? 0)
