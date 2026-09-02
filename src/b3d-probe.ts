/*#
# b3d-probe

`<tosi-b3d-probe>` — a device-capability probe. Drop it anywhere (a landing page is
ideal) and on connect it times a short battery of real GPU/CPU work on a hidden
canvas, classifies the device into a quality tier + concrete budgets (via the pure
[perf-probe](?perf-probe.ts) core), and caches the result in `localStorage`. Every
`<tosi-b3d>` on the origin can then read those budgets to pick sensible defaults —
transparently dropping detail on a Quest-class device without user-agent voodoo.

It **skips the benchmark** and returns the cached budgets instantly when a recent
result exists for this device + probe version (see `perf-probe`'s re-run rules; TTL
is 30 days). A cached result — even a stale one — is dispatched immediately so
consumers never wait; a fresh measurement follows if a re-run is due.

The probe measures the FLAT pipeline (you can't open an immersive session without a
gesture); the XR tier is derived by biasing down one notch for stereo fill. This is
the *starting* tier — pair it with a runtime FPS-driven loop to handle thermal
throttling.

```js
import { elements } from 'tosijs'
import { b3dProbe } from 'tosijs-3d'

const output = elements.pre()

preview.append(
  b3dProbe({
    // tosijs binds on<Event> props via addEventListener — onProfile → 'profile'.
    onProfile(e) {
      const { tier, xrTier, budgets, xrBudgets, cached } = e.detail
      output.textContent = [
        `flat tier: ${tier}  (${cached ? 'cached' : 'measured'})`,
        JSON.stringify(budgets, null, 2),
        ``,
        `xr tier: ${xrTier}  (what a headset scene reads)`,
        JSON.stringify(xrBudgets, null, 2),
      ].join('\n')
    },
  }),
  output
)
```
*/
/*{ "parent": "Performance", "order": 100 }*/

import { Component } from 'tosijs'
import * as BABYLON from '@babylonjs/core'
import { PerlinNoise } from './perlin-noise'
import {
  buildSignature,
  readStored,
  writeStored,
  shouldRerun,
  isStale,
  resolveProfile,
  defaultProfile,
  PROBE_VERSION,
  DAY_MS,
  type PerfMeasurements,
  type PerfProfile,
  type ProbeEnv,
  type ClassHints,
  type StorageLike,
} from './perf-probe'
import { setPerfProfile, getPerfProfile } from './b3d-quality'

// ─── Benchmark workload sizes ─────────────────────────────────────────────────
// Fixed so results are comparable across runs; bump PROBE_VERSION in perf-probe if
// you change any of these (old cached measurements are only comparable within a
// version). Fill is deliberately heavy (bigger canvas + many overdraw passes): a
// light test can't separate a fast mobile GPU from a workstation, which was the
// whole "Quest scores as high as an M1 Max" problem.
const PROBE_W = 900 // hidden canvas size (px, square)
const WARMUP = 4 // discarded frames (shader compile + GPU clock ramp)
const FRAMES = 10 // timed frames per GPU test (÷ for per-frame cost)
const FILL_LAYERS = 12 // fullscreen overdraw passes (the fill discriminator)
const VERTEX_SUBDIV = 160 // ground subdivisions (~160²·2 tris)
const DRAW_BOXES = 250 // distinct meshes → draw-call overhead
const CPU_SAMPLES = 80_000 // Perlin noise samples

const raf = (): Promise<void> =>
  new Promise((resolve) => requestAnimationFrame(() => resolve()))

/** Render `scene` warmup+FRAMES times with a GL fence each side, return ms/frame.
 * `gl.finish()` stalls until the GPU is actually done, so the timing includes GPU
 * work (not just CPU submit) — essential for a fill-rate measurement. */
function timeScene(
  gl: WebGLRenderingContext,
  scene: BABYLON.Scene,
  frames = FRAMES
): number {
  for (let i = 0; i < WARMUP; i++) scene.render()
  gl.finish()
  const t0 = performance.now()
  for (let i = 0; i < frames; i++) scene.render()
  gl.finish()
  return (performance.now() - t0) / frames
}

function buildFillScene(engine: BABYLON.Engine): BABYLON.Scene {
  // Fullscreen colour layers composited with alpha → pure overdraw, no geometry.
  const scene = new BABYLON.Scene(engine)
  scene.createDefaultCamera(false)
  for (let i = 0; i < FILL_LAYERS; i++) {
    const layer = new BABYLON.Layer('fill' + i, null, scene, false)
    layer.color = new BABYLON.Color4(0.5, 0.6, 0.7, 0.5)
  }
  return scene
}

function buildVertexScene(engine: BABYLON.Engine): BABYLON.Scene {
  const scene = new BABYLON.Scene(engine)
  const cam = new BABYLON.FreeCamera('c', new BABYLON.Vector3(0, 0, -40), scene)
  cam.setTarget(BABYLON.Vector3.Zero())
  const ground = BABYLON.MeshBuilder.CreateGround(
    'g',
    { width: 4, height: 4, subdivisions: VERTEX_SUBDIV },
    scene
  )
  // Small on screen (camera far) so fill is negligible and the cost is vertices.
  ground.rotation.x = -0.6
  const mat = new BABYLON.StandardMaterial('m', scene)
  mat.disableLighting = true
  mat.emissiveColor = new BABYLON.Color3(0.4, 0.5, 0.6)
  ground.material = mat
  return scene
}

function buildDrawScene(engine: BABYLON.Engine): BABYLON.Scene {
  const scene = new BABYLON.Scene(engine)
  const cam = new BABYLON.FreeCamera('c', new BABYLON.Vector3(0, 0, -60), scene)
  cam.setTarget(BABYLON.Vector3.Zero())
  const mat = new BABYLON.StandardMaterial('m', scene)
  mat.disableLighting = true
  mat.emissiveColor = new BABYLON.Color3(0.6, 0.6, 0.6)
  // Distinct meshes (no instancing) so each is its own draw call. Deterministic
  // layout (index-derived, no Math.random) so the workload is reproducible.
  for (let i = 0; i < DRAW_BOXES; i++) {
    const b = BABYLON.MeshBuilder.CreateBox('b' + i, { size: 0.05 }, scene)
    b.position.set(((i * 7) % 40) - 20, ((i * 13) % 40) - 20, (i % 10) * 0.5)
    b.material = mat
  }
  return scene
}

/** CPU noise batch — mirrors terrain heightAt's per-vertex cost. */
function timeCpu(): number {
  const noise = new PerlinNoise(1234)
  const t0 = performance.now()
  let acc = 0
  for (let i = 0; i < CPU_SAMPLES; i++) {
    acc += noise.noise3D(i * 0.01, (i % 512) * 0.017, (i % 131) * 0.031)
  }
  // Consume acc so the loop can't be optimised away.
  if (acc === Infinity) throw new Error('unreachable')
  return performance.now() - t0
}

function readRenderer(): string | undefined {
  try {
    const c = document.createElement('canvas')
    const gl = (c.getContext('webgl2') ||
      c.getContext('webgl')) as WebGLRenderingContext | null
    if (!gl) return undefined
    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    const renderer = ext
      ? (gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string)
      : undefined
    // Release this throwaway context immediately — browsers cap the number of live
    // WebGL contexts and will drop the OLDEST (a live scene's) to honour a new one.
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return renderer
  } catch {
    return undefined
  }
}

/** immersive-VR support — the key hint that clamps a standalone HMD's tier. */
async function detectImmersiveVr(): Promise<boolean> {
  try {
    const xr = (navigator as unknown as { xr?: XRSystem }).xr
    return xr != null && (await xr.isSessionSupported('immersive-vr'))
  } catch {
    return false
  }
}

async function currentEnv(): Promise<ProbeEnv> {
  const nav = navigator as unknown as {
    deviceMemory?: number
    hardwareConcurrency?: number
  }
  return {
    renderer: readRenderer(),
    deviceMemory: nav.deviceMemory,
    hardwareConcurrency: nav.hardwareConcurrency,
    immersiveVr: await detectImmersiveVr(),
    screenW: typeof screen !== 'undefined' ? screen.width : undefined,
    screenH: typeof screen !== 'undefined' ? screen.height : undefined,
  }
}

/** The device-class hints (subset of the env) that clamp the measured tier. */
function hintsOf(env: ProbeEnv): ClassHints {
  return {
    immersiveVr: env.immersiveVr,
    renderer: env.renderer,
    deviceMemory: env.deviceMemory,
  }
}

function safeStorage(): StorageLike | null {
  try {
    return window.localStorage
  } catch {
    return null // privacy modes throw on access
  }
}

/**
 * Synchronously seed the system quality proxy from a valid, same-version cache if
 * one exists. `<tosi-b3d>` calls this at setup so a scene builds with the right
 * device budgets on the very first frame — before the async probe would finish.
 * Uses the cached device-class hints so the clamp is applied without the async
 * immersive-VR check. Returns true if it hydrated.
 */
export function hydrateProfileFromCache(): boolean {
  if (typeof window === 'undefined') return false
  const stored = readStored(safeStorage())
  if (stored == null || stored.probeVersion !== PROBE_VERSION) return false
  setPerfProfile(
    resolveProfile(stored.measurements, {
      cached: true,
      stale: isStale(stored, Date.now()),
      hints: stored.hints,
    })
  )
  return true
}

/** Run the four timed tests on a throwaway offscreen engine, yielding a frame
 * between each so the page keeps breathing. The canvas is created but NEVER
 * attached to the DOM — so this touches no document tree (a mutation there can
 * trip live-reload/doc observers into re-evaluating the page). */
async function runBattery(): Promise<PerfMeasurements> {
  const canvas = document.createElement('canvas')
  canvas.width = PROBE_W
  canvas.height = PROBE_W
  const engine = new BABYLON.Engine(canvas, false, {
    preserveDrawingBuffer: false,
    stencil: false,
    powerPreference: 'high-performance',
  })
  const gl = (engine as unknown as { _gl: WebGLRenderingContext })._gl
  if (gl == null) {
    engine.dispose()
    throw new Error('no WebGL context for the probe')
  }

  const scenes: BABYLON.Scene[] = []
  try {
    const fill = buildFillScene(engine)
    scenes.push(fill)
    const fillMs = timeScene(gl, fill)
    await raf()

    const vtx = buildVertexScene(engine)
    scenes.push(vtx)
    const vertexMs = timeScene(gl, vtx)
    await raf()

    const draw = buildDrawScene(engine)
    scenes.push(draw)
    const drawCallMs = timeScene(gl, draw)
    await raf()

    const cpuMs = timeCpu()

    return { fillMs, vertexMs, drawCallMs, cpuMs }
  } finally {
    for (const s of scenes) s.dispose()
    engine.dispose()
  }
}

/**
 * Measure the device (or serve a fresh cache) and feed the system quality proxy —
 * WITHOUT mounting any DOM element. This is what `<tosi-b3d>` calls to auto-probe;
 * it can also be called directly. Resolves with the resolved profile. Safe to call
 * repeatedly (cache + version + TTL gate the actual benchmark).
 */
export async function runProbe(
  opts: {
    force?: boolean
    ttlDays?: number
    /**
     * The caller couldn't get a quiet moment and measured anyway. The profile is
     * still applied — a measured guess beats the safe default — but it is cached
     * with a SHORT life so the next visit re-measures instead of living with a
     * verdict taken under contention for a month. See `_probeWhenIdle`.
     */
    measuredWhileBusy?: boolean
  } = {}
): Promise<PerfProfile> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return getPerfProfile()
  }
  const storage = safeStorage()
  const env = await currentEnv()
  const hints = hintsOf(env)
  const signature = buildSignature(env)
  const now = Date.now()
  const ttlMs = (opts.ttlDays || 30) * DAY_MS
  const stored = readStored(storage)

  // Serve a cached result immediately (even if stale) so consumers never wait.
  if (stored != null && stored.probeVersion === PROBE_VERSION) {
    setPerfProfile(
      resolveProfile(stored.measurements, {
        cached: true,
        stale: isStale(stored, now, ttlMs),
        hints,
      })
    )
  }

  if (!shouldRerun({ stored, signature, now, ttlMs, force: opts.force })) {
    return getPerfProfile()
  }

  const measurements = await runBattery()
  writeStored(storage, {
    probeVersion: PROBE_VERSION,
    signature,
    measurements,
    hints,
    // Backdate a contended measurement to just inside its TTL, so it survives
    // this session (no re-probing on every scene) and expires by the next one.
    measuredAt: opts.measuredWhileBusy
      ? Date.now() - (ttlMs - 5 * 60 * 1000)
      : Date.now(),
  })
  const profile = resolveProfile(measurements, { cached: false, hints })
  setPerfProfile(profile)
  return profile
}

/** `<tosi-b3d-probe>` — a thin element wrapper around `runProbe` for declarative
 * use. It fires a `profile` event when done; the measurement itself mounts nothing. */
export class B3dProbe extends Component {
  static preferredTagName = 'tosi-b3d-probe'

  static initAttributes = {
    /** Ignore the cache and re-measure (for testing / calibration). */
    force: false,
    /** Cache lifetime in days before a re-measure. */
    ttlDays: 30,
  }
  declare force: boolean
  declare ttlDays: number

  /** Resolves with the profile once measured/loaded (also fired as `profile`). */
  ready: Promise<PerfProfile> | null = null

  connectedCallback() {
    super.connectedCallback()
    // Browser-only: no-op under SSR / the doc-site's static prerender.
    if (typeof window === 'undefined' || typeof document === 'undefined') return
    this.ready = runProbe({ force: this.force, ttlDays: this.ttlDays })
      .catch((err) => {
        console.warn('perf-probe failed; using default profile', err)
        const p = defaultProfile()
        setPerfProfile(p)
        return p
      })
      .then((profile) => {
        this.dispatchEvent(
          new CustomEvent('profile', { detail: profile, bubbles: true })
        )
        return profile
      })
  }
}

export const b3dProbe = B3dProbe.elementCreator()
