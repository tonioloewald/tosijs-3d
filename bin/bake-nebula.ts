/**
 * Bake the SMOOTH half of the shipped sky (`static/sky/nebula_*`) — the half
 * `bin/bake-stars.ts` cannot, because it is a RENDER of the galaxy's nebulae
 * and needs WebGL. Headless Chrome + SwiftShader, driven over CDP; everything
 * it spawns is killed on exit and by a watchdog.
 *
 *   bun bin/bake-stars.ts        # the point half, first
 *   bun bin/bake-nebula.ts       # then this — and it checks the two agree
 *
 * The galaxy is SHIPPED_SKY's (voxel dials included), photographed from the
 * shipped pose, the way the skybox-baker demo's "bake pair" does it. As a
 * cross-check it also encodes the POINT half in the browser and compares it
 * byte-for-byte with the `stars_*` already on disk: if they differ, the two
 * halves were baked from different galaxies, and it says so.
 *
 * Flags: --out <dir> (default static/sky), --dry (bake and check, write nothing)
 */
import path from 'path'
import { mkdtempSync, readFileSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const argOut = process.argv.indexOf('--out')
const out = path.resolve(
  import.meta.dir,
  '..',
  argOut >= 0 ? process.argv[argOut + 1] : 'static/sky'
)
const dry = process.argv.includes('--dry')

const page = `
import { b3d } from '${path.resolve(import.meta.dir, '../src/tosi-b3d.ts')}'
import { b3dGalaxy } from '${path.resolve(
  import.meta.dir,
  '../src/b3d-galaxy.ts'
)}'
import {
  bakeSkyPair, starsFromVoxelGalaxy, defaultBakePose, SHIPPED_SKY,
} from '${path.resolve(import.meta.dir, '../src/skybox-baker.ts')}'
const S = SHIPPED_SKY
const galaxy = b3dGalaxy({
  seed: S.seed,
  starCount: S.voxel.brightBudget,
  dimBudget: S.voxel.dimBudget,
  particleSize: S.particleSize,
  coreSize: 0.12,
  radius: S.radius,
})
let sceneEl = null
document.body.append(b3d({
  style: { display: 'block', width: '256px', height: '256px' },
  clearColor: '#01020a',
  sceneCreated(el) { sceneEl = el },
}, galaxy))
window.bake = async () => {
  while (sceneEl == null || galaxy.galaxy == null) await new Promise((r) => setTimeout(r, 200))
  const eye = defaultBakePose(S.radius, S.outFraction, S.offPlane)
  const sky = starsFromVoxelGalaxy(galaxy.galaxy, undefined, eye, {
    radius: S.radius, dimReach: S.voxel.dimReach, floor: S.voxel.floor,
  })
  const res = await bakeSkyPair(sceneEl.scene, galaxy, {
    ...eye, roll: S.roll, smoothSize: S.smoothSize, dataSize: S.dataSize,
    objects: sky.objects,
  })
  return JSON.stringify({ smooth: res.smooth, data: res.data, placed: res.placed, lost: res.lost })
}
window.ready = true
`

const dir = mkdtempSync(path.join(tmpdir(), 'bake-nebula-'))
const entry = path.join(dir, 'page.ts')
writeFileSync(entry, page)
const built = await Bun.build({ entrypoints: [entry], target: 'browser' })
if (!built.success) throw new Error(built.logs.join('\n'))
const js = await built.outputs[0].text()
const server = Bun.serve({
  port: 0,
  fetch: (req: Request) =>
    new URL(req.url).pathname === '/page.js'
      ? new Response(js, { headers: { 'content-type': 'text/javascript' } })
      : new Response(
          '<!doctype html><body style="margin:0"><script type="module" src="/page.js"></script>',
          { headers: { 'content-type': 'text/html' } }
        ),
})
const cdpPort = 9338
const chrome = Bun.spawn(
  [
    CHROME,
    '--headless=new',
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${dir}/prof`,
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
  console.error('watchdog: gave up after 300 s')
  stop()
  process.exit(2)
}, 300_000)

let code = 0
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
  const value = await new Promise<string>((resolve) => {
    ws.onmessage = (m) => {
      const d = JSON.parse(String(m.data))
      if (d.id === 1)
        resolve(d.result?.result?.value ?? JSON.stringify(d.result))
    }
    // The bundle (Babylon included) needs a moment before `bake` exists.
    setTimeout(
      () =>
        ws.send(
          JSON.stringify({
            id: 1,
            method: 'Runtime.evaluate',
            params: {
              expression: 'window.ready ? window.bake() : "not ready"',
              awaitPromise: true,
              returnByValue: true,
            },
          })
        ),
      8000
    )
  })
  ws.close()
  const res = JSON.parse(value) as {
    smooth: Array<{ name: string; url: string }>
    data: Array<{ name: string; url: string }>
    placed: number
    lost: number
  }
  const bytes = (url: string) =>
    Buffer.from(url.slice(url.indexOf(',') + 1), 'base64')
  console.log(`baked: ${res.placed} placed, ${res.lost} lost`)

  // THE CROSS-CHECK: the browser's point half against the one on disk.
  let agree = true
  for (const f of res.data) {
    let disk: Buffer | null = null
    try {
      disk = readFileSync(path.join(out, `stars_${f.name}.png`))
    } catch {
      /* missing */
    }
    if (disk == null || !disk.equals(bytes(f.url))) agree = false
  }
  console.log(
    agree
      ? 'stars_* on disk match this galaxy byte-for-byte'
      : '⚠️ stars_* on disk were NOT baked from this galaxy — run bun bin/bake-stars.ts'
  )
  if (!agree) code = 1
  if (!dry) {
    for (const f of res.smooth)
      writeFileSync(path.join(out, `nebula_${f.name}.png`), bytes(f.url))
    console.log(`wrote ${path.relative(process.cwd(), out)}/nebula_*.png`)
  }
} finally {
  clearTimeout(watchdog)
  stop()
}
process.exit(code)
