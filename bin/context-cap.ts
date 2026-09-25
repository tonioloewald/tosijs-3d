/**
 * The WebGL context-cap regression check (tosijs-3d#79) — in a REAL browser,
 * because happy-dom has no WebGL and this bug only exists where contexts do.
 *
 *   bun bin/context-cap.ts
 *
 * Mounts and removes 50 scenes (retaining the removed elements, as an SPA or
 * doc cache would) while one scene stays live, then removes and RE-ADDS that
 * scene. Chrome caps live contexts per page and force-loses the oldest, so
 * before the fix the live scene lost its context and rendered nothing:
 *
 *   before  {"survivorPx":"lost","readdPx":"lost"}
 *   after   {"survivorPx":"255,0,0,255","readdPx":"255,0,0,255"}
 *
 * Headless Chrome + SwiftShader, driven over CDP; everything it spawns is
 * killed on exit and by a watchdog. Exits 1 if either pixel is not red.
 */
import path from 'path'
import { mkdtempSync } from 'fs'
import { tmpdir } from 'os'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const dir = mkdtempSync(path.join(tmpdir(), 'context-cap-'))
const built = await Bun.build({
  entrypoints: [path.join(import.meta.dir, 'context-cap/page.ts')],
  target: 'browser',
})
if (!built.success) throw new Error(built.logs.join('\n'))
const js = await built.outputs[0].text()
const server = Bun.serve({
  port: 0,
  fetch: (req: Request) =>
    new URL(req.url).pathname === '/page.js'
      ? new Response(js, { headers: { 'content-type': 'text/javascript' } })
      : new Response(
          '<!doctype html><body><script type="module" src="/page.js"></script>',
          { headers: { 'content-type': 'text/html' } }
        ),
})
const cdpPort = 9333
const chrome = Bun.spawn(
  [
    CHROME,
    '--headless=new',
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${dir}`,
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    'about:blank',
  ],
  { stdout: 'ignore', stderr: 'ignore' }
)
const stop = () => {
  chrome.kill()
  server.stop(true)
}
const watchdog = setTimeout(() => {
  console.error('watchdog: gave up after 240 s')
  stop()
  process.exit(2)
}, 240_000)

let ok: boolean
try {
  await Bun.sleep(3000)
  const target = await (
    await fetch(
      `http://localhost:${cdpPort}/json/new?http://localhost:${server.port}/`,
      { method: 'PUT' }
    )
  ).json()
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((r) => (ws.onopen = r))
  const result = await new Promise<any>((resolve) => {
    ws.onmessage = (m) => {
      const d = JSON.parse(String(m.data))
      if (d.id === 1) resolve(d.result?.result?.value)
    }
    // The page needs a moment to load a 16 MB bundle before `run` exists.
    setTimeout(
      () =>
        ws.send(
          JSON.stringify({
            id: 1,
            method: 'Runtime.evaluate',
            params: {
              expression: 'window.ready ? window.run() : "not ready"',
              awaitPromise: true,
              returnByValue: true,
            },
          })
        ),
      6000
    )
  })
  ws.close()
  console.log(result)
  const r = JSON.parse(result)
  ok = r.survivorPx === '255,0,0,255' && r.readdPx === '255,0,0,255'
} finally {
  clearTimeout(watchdog)
  stop()
}
console.log(ok ? 'PASS' : 'FAIL')
process.exit(ok ? 0 : 1)
