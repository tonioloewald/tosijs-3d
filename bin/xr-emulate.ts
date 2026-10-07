/*
AN EMULATED HEADSET, so "does it work in VR" has an answer without a headset.

Headless Chrome on the real GPU, with Meta's `iwer` (a pure-JS WebXR runtime)
injected before the page loads. The page's own Enter VR button starts a session
against a fake Quest 3: both eyes render side by side into the canvas, and the
two controllers can be posed and their triggers pulled from script.

  bun bin/xr-emulate.ts <path> [--script file.js] [--pre file.js]
                        [--out dir] [--name shot] [--flat] [--wait ms]

  <path>     page on the dev server, e.g. /b3d-ssao/  (or a full URL)
  --pre      JS evaluated BEFORE entering VR (set attributes, open things)
  --script   JS evaluated AFTER entering VR; its value is printed as JSON
  --flat     do not enter VR at all (a flat capture with the same plumbing)
  --out      where the PNGs go (default: $TMPDIR/xr-emulate)

Both scripts are one expression; write `(async () => { ... })()` to await.
They get `__deep(selector)` (pierces shadow roots — the doc site nests
`tosi-b3d`) and `__xrTest`, described at `HELPERS` below. Screenshots:
`<name>-flat.png` before entry, `<name>-vr.png` after the script.

It first earned its keep on 2026-10-07: it reproduced a Quest report ("one
image across both eyes" with SSAO on) and found three headset-only popup bugs
by pressing a popup's title bar with an emulated controller.

WHAT IT CANNOT TELL YOU: frame rate, multiview, or a real browser's quirks.
A device check is still the last word. It answers "is the frame stereo" and
"does a controller press reach this", which is most of what used to need one.

FOUR TRAPS, each of which cost time and none of which announces itself:

1. `installRuntime({ forceInstall: true })`. Chrome has a native
   `navigator.xr`, and without the flag iwer silently declines to install.
2. `stereoEnabled = true`. Off, the canvas shows ONE mono view, so a broken
   stereo frame and a healthy one look identical. Capture a known-good control.
3. OUR OWN rAF PUMP DEADLOCKS IT. `<tosi-b3d>` shims
   `window.requestAnimationFrame` during a session and flushes it from XR
   frames (see `_installXrRafPump`); iwer drives XR frames FROM
   `window.requestAnimationFrame`. Each waits for the other, the scene freezes
   a few frames after entry, and every later reading is of a dead loop. The
   pump is stubbed out here. `__xrTest.frames()` is the check: it must advance.
4. A CONTROLLER'S FIRST TRIGGER PRESS after entry may produce no pointer-down.
   `__xrTest.press()` once, aimed at nothing, before the press you care about.
*/

import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { mkdirSync } from 'node:fs'

const args = process.argv.slice(2)
const flag = (name: string): string | undefined => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : undefined
}
const has = (name: string): boolean => args.includes(`--${name}`)
const path = args.find((a) => !a.startsWith('--') && a !== flag('script'))

if (path == null || has('help')) {
  console.log(
    'usage: bun bin/xr-emulate.ts <path> [--script f.js] [--pre f.js] [--out dir] [--name shot] [--flat] [--wait ms]'
  )
  process.exit(path == null ? 1 : 0)
}

const url = /^https?:/.test(path) ? path : `https://localhost:8030${path}`
const outDir = flag('out') ?? join(tmpdir(), 'xr-emulate')
const name = flag('name') ?? 'shot'
const waitMs = Number(flag('wait') ?? 20000)
const read = async (f?: string): Promise<string | undefined> =>
  f == null ? undefined : await Bun.file(f).text()
const pre = await read(flag('pre'))
const script = await read(flag('script'))
mkdirSync(outDir, { recursive: true })

const iwer = await Bun.file(
  join(import.meta.dir, '../node_modules/iwer/build/iwer.min.js')
).text()

/*
HELPERS, injected into every page.

  __deep(sel)               querySelector through shadow roots
  __xrTest.b3d()            the page's <tosi-b3d>
  __xrTest.enter() / exit() start / end the session (resolves when settled)
  __xrTest.frames()         engine frame count: must ADVANCE in a live session
  __xrTest.controller(hand) the Babylon WebXRInputSource ('left' | 'right')
  __xrTest.ray(hand)        that controller's world-space pointer ray
  __xrTest.hold(hand, dx, dy, dz)
                            park the controller relative to the head (metres,
                            XR space: +x right, +y up, -z forward)
  __xrTest.aim(hand, point) turn the controller until its ray passes through a
                            WORLD point (a Babylon Vector3). Closed-loop, so it
                            needs no knowledge of the rig's offset or of the
                            right-handed/left-handed flip between XR and Babylon
  __xrTest.trigger(hand, v) set the trigger (1 down, 0 up)
  __xrTest.press(hand)      down, wait, up
  __xrTest.wait(ms)
*/
const HELPERS = `
window.__deep = (sel, root = document) => {
  const hit = root.querySelector(sel)
  if (hit) return hit
  for (const el of root.querySelectorAll('*')) {
    if (el.shadowRoot) { const h = window.__deep(sel, el.shadowRoot); if (h) return h }
  }
  return null
}
try {
  const d = new IWER.XRDevice(IWER.metaQuest3)
  d.installRuntime({ forceInstall: true })
  d.stereoEnabled = true
  window.__xr = d
} catch (e) { window.__xrErr = String(e) }
window.__xrTest = (() => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms))
  const b3d = () => window.__deep('tosi-b3d')
  const controller = (hand = 'right') =>
    b3d().xrHelper.input.controllers.find((c) => c.inputSource.handedness === hand)
  const ray = (hand = 'right') => {
    const cam = b3d().scene.activeCamera
    const r = cam.getForwardRay(1e4)
    controller(hand).getWorldPointerRayToRef(r)
    return r
  }
  const cross = (a, c) => [a[1]*c[2]-a[2]*c[1], a[2]*c[0]-a[0]*c[2], a[0]*c[1]-a[1]*c[0]]
  const dot = (a, c) => a[0]*c[0] + a[1]*c[1] + a[2]*c[2]
  const norm = (a) => { const l = Math.hypot(...a); return a.map((v) => v / l) }
  const arc = (a, c) => {
    a = norm(a); c = norm(c)
    const x = cross(a, c); const w = 1 + dot(a, c); const l = Math.hypot(...x, w)
    return [x[0]/l, x[1]/l, x[2]/l, w/l]
  }
  const qmul = (p, q) => [
    p[3]*q[0] + p[0]*q[3] + p[1]*q[2] - p[2]*q[1],
    p[3]*q[1] - p[0]*q[2] + p[1]*q[3] + p[2]*q[0],
    p[3]*q[2] + p[0]*q[1] - p[1]*q[0] + p[2]*q[3],
    p[3]*q[3] - p[0]*q[0] - p[1]*q[1] - p[2]*q[2],
  ]
  return {
    wait, b3d, controller, ray,
    frames: () => b3d().scene.getEngine().frameId,
    async enter() {
      const b = b3d()
      // Trap 3: our rAF pump and iwer's frame loop wait on each other.
      b._installXrRafPump = () => () => {}
      b.parts.enterVrButton.click()
      for (let i = 0; i < 100 && !b.xrActive; i++) await wait(100)
      await wait(1500)
      return b.xrActive
    },
    async exit() {
      const b = b3d()
      await b.xrHelper.baseExperience.exitXRAsync()
      await wait(1500)
      return !b.xrActive
    },
    async hold(hand = 'right', dx = 0.2, dy = -0.3, dz = -0.1) {
      const d = window.__xr
      d.controllers[hand].position.set(d.position.x + dx, d.position.y + dy, d.position.z + dz)
      await wait(400)
    },
    async aim(hand, point) {
      const c = window.__xr.controllers[hand]
      let q = [c.quaternion.x, c.quaternion.y, c.quaternion.z, c.quaternion.w]
      for (let i = 0; i < 4; i++) {
        const r = ray(hand)
        // Babylon is left-handed, XR right-handed: flip z going back.
        const now = [r.direction.x, r.direction.y, -r.direction.z]
        const want = [point.x - r.origin.x, point.y - r.origin.y, -(point.z - r.origin.z)]
        q = qmul(arc(now, want), q)
        c.quaternion.set(q[0], q[1], q[2], q[3])
        await wait(350)
      }
      return ray(hand)
    },
    trigger(hand = 'right', value = 1) {
      window.__xr.controllers[hand].updateButtonValue('trigger', value)
    },
    async press(hand = 'right', holdMs = 500) {
      this.trigger(hand, 1); await wait(holdMs)
      this.trigger(hand, 0); await wait(800)
    },
  }
})()
`

const port = 9300 + Math.floor(Math.random() * 400)
const chrome = Bun.spawn(
  [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${join(outDir, 'profile')}`,
    // The real GPU: SwiftShader renders, but nothing about it is what ships.
    '--use-angle=metal',
    '--enable-gpu',
    '--ignore-gpu-blocklist',
    '--window-size=1400,800',
    // The dev server's cert is local.
    '--ignore-certificate-errors',
    'about:blank',
  ],
  { stdout: 'ignore', stderr: 'ignore' }
)
// A compacted or killed session must not leave a GPU process running.
const watchdog = setTimeout(() => chrome.kill(), 180000)

try {
  for (let i = 0; i < 40; i++) {
    try {
      await fetch(`http://127.0.0.1:${port}/json/version`)
      break
    } catch {
      await Bun.sleep(500)
    }
  }
  const target = (await (
    await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, {
      method: 'PUT',
    })
  ).json()) as { webSocketDebuggerUrl: string }
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((r) => (ws.onopen = r))

  let id = 0
  const pending = new Map<number, (m: any) => void>()
  const exceptions: string[] = []
  const warnings = new Set<string>()
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data as string)
    if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails
      exceptions.push(
        (d?.exception?.description ?? d?.text ?? '').slice(0, 300)
      )
    }
    if (
      m.method === 'Runtime.consoleAPICalled' &&
      ['warning', 'error'].includes(m.params.type)
    ) {
      warnings.add(
        m.params.args
          .map((a: any) => a.value ?? a.description ?? '')
          .join(' ')
          .slice(0, 300)
      )
    }
    pending.get(m.id)?.(m)
    pending.delete(m.id)
  }
  const send = (method: string, params = {}) =>
    new Promise<any>((r) => {
      pending.set(++id, r)
      ws.send(JSON.stringify({ id, method, params }))
    })
  const evaluate = async (expression: string) => {
    const r = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })
    return (
      r.result?.result?.value ??
      r.result?.exceptionDetails?.exception?.description ??
      null
    )
  }
  const shot = async (suffix: string) => {
    const s = await send('Page.captureScreenshot', { format: 'png' })
    const file = join(outDir, `${name}-${suffix}.png`)
    await Bun.write(file, Buffer.from(s.result.data, 'base64'))
    console.log(`  ${file}`)
  }

  await send('Runtime.enable')
  await send('Page.enable')
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `${iwer};${HELPERS}`,
  })
  await send('Page.navigate', { url })
  // A live example takes a while to mount; there is no event for it.
  await Bun.sleep(waitMs)

  const ready = await evaluate(
    `JSON.stringify({ runtime: !!window.__xr, error: window.__xrErr || null, b3d: !!__deep('tosi-b3d') })`
  )
  console.log('page:', ready)
  if (pre != null) console.log('pre:', JSON.stringify(await evaluate(pre)))
  await Bun.sleep(1500)
  await shot('flat')

  if (!has('flat')) {
    const f0 = await evaluate('__xrTest.frames()')
    console.log('entered:', await evaluate('__xrTest.enter()'))
    const f1 = await evaluate('__xrTest.frames()')
    await Bun.sleep(500)
    const f2 = await evaluate('__xrTest.frames()')
    // Trap 3's tell. A session that is not ticking makes every reading a lie.
    console.log(
      `frames: ${f0} → ${f1} → ${f2}${f2 === f1 ? '  ⚠️ NOT ADVANCING' : ''}`
    )
    if (script != null)
      console.log('script:', JSON.stringify(await evaluate(script)))
    await Bun.sleep(1500)
    await shot('vr')
  }

  console.log('exceptions:', exceptions.length, exceptions.slice(0, 4))
  if (warnings.size) console.log('warnings:', [...warnings].slice(0, 8))
} finally {
  clearTimeout(watchdog)
  chrome.kill()
}
