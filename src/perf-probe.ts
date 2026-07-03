/*#
# perf-probe

Pure, Babylon-free core for the device-capability probe (see
[b3d-probe](?b3d-probe.ts) for the component that actually runs the benchmark).

The philosophy is **measure, don't guess**: rather than sniffing user-agents, the
probe times a small battery of real GPU/CPU work, maps the raw milliseconds to a
quality *tier* and concrete *budgets* (terrain detail, shadow map size, render
scaling…), and caches the result in `localStorage`. This module owns everything
that doesn't touch the GPU — the classifier, the budget table, the storage schema,
the device signature, and the "should I re-run?" decision — so it's all unit
testable without a canvas (feed it synthetic numbers, assert the tier).

Re-run only when the benchmark itself changed (`PROBE_VERSION`), the device changed
(`signature`), or the cache is stale (`DEFAULT_TTL_MS`, 30 days — devices don't get
faster; the TTL is just a backstop for browser/driver updates and a bad cold read).
*/
/*{ "parent": "Performance" }*/

/** Bump whenever the benchmark WORKLOAD changes (so old cached measurements, which
 * are only comparable within a workload version, are discarded). Tuning the
 * classifier thresholds or the budget table does NOT need a bump — those re-derive
 * from the stored raw measurements. */
export const PROBE_VERSION = 2

export const STORAGE_KEY = 'tosijs-3d:perf-profile'
export const DAY_MS = 24 * 60 * 60 * 1000
export const DEFAULT_TTL_MS = 30 * DAY_MS

export type PerfTier = 'low' | 'medium' | 'high'

/** Raw benchmark output — milliseconds per fixed workload, so LOWER is faster.
 * The workload sizes are baked into b3d-probe and versioned by PROBE_VERSION, so
 * these numbers are only comparable across runs of the same version. */
export interface PerfMeasurements {
  /** Cost of a fixed fullscreen overdraw pass (the #1 mobile/stereo bottleneck). */
  fillMs: number
  /** Cost of a fixed vertex-heavy draw (maps to terrain subdivisions / pool). */
  vertexMs: number
  /** Cost of a fixed batch of tiny draws (maps to draw-call / instance budget). */
  drawCallMs: number
  /** Cost of a fixed CPU noise batch (maps to terrain streaming / JS budget). */
  cpuMs: number
}

/** Concrete knobs a scene reads to configure itself for the measured device.
 * Components resolve any attribute left at its `auto` sentinel against these. */
export interface PerfBudgets {
  /** engine.setHardwareScalingLevel — >1 renders below native res (cheap fill win). */
  hardwareScaling: number
  hiResSubdivisions: number
  poolSize: number
  reach: number
  fillBudget: number
  shadowTextureSize: number
  numCascades: number
  /** Reflection probe resolution (per face). */
  reflectionSize: number
  /** Whether automatic reflection probes run at all (off on the weakest tier — a
   * real-time cube probe is one of the most expensive things you can add). */
  reflections: boolean
}

export interface StoredProfile {
  probeVersion: number
  signature: string
  measurements: PerfMeasurements
  /** The device-class hints at measure time, so the cache can be re-clamped on a
   * synchronous read without repeating the async immersive-VR check. */
  hints?: ClassHints
  /** epoch ms; caller passes the clock so this module stays pure/deterministic. */
  measuredAt: number
}

/** The resolved profile a consumer actually uses: flat + XR (stereo-biased) tiers
 * and their budgets, plus whether the cache is past its TTL (still usable, but the
 * component will re-measure in the background). */
export interface PerfProfile {
  tier: PerfTier
  budgets: PerfBudgets
  xrTier: PerfTier
  xrBudgets: PerfBudgets
  measurements: PerfMeasurements
  /** true when served from cache, false when freshly measured. */
  cached: boolean
  stale: boolean
}

export interface ProbeEnv {
  /** UNMASKED_RENDERER_WEBGL if the browser exposes it (strongest signal). */
  renderer?: string
  /** navigator.deviceMemory (GB). */
  deviceMemory?: number
  /** navigator.hardwareConcurrency (logical cores). */
  hardwareConcurrency?: number
  /** navigator.xr.isSessionSupported('immersive-vr') — drives the HMD clamp. */
  immersiveVr?: boolean
  screenW?: number
  screenH?: number
}

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

// ─── Calibration knobs ──────────────────────────────────────────────────────
// Reference costs are roughly a "baseline medium" device, so a device scoring ~1
// is medium, >1 faster, <1 slower. Fill is weighted heaviest (stereo VR is fill
// bound). THESE NEED FIELD CALIBRATION against real Quest / laptop numbers — they
// are honest starting guesses, and because raw measurements are cached they can be
// re-tuned without forcing anyone to re-measure.
const REF: PerfMeasurements = {
  fillMs: 4,
  vertexMs: 3,
  drawCallMs: 3,
  cpuMs: 4,
}
const WEIGHT = { fillMs: 0.4, vertexMs: 0.25, drawCallMs: 0.15, cpuMs: 0.2 }
const HIGH_SCORE = 1.5 // ≥ → high
const MEDIUM_SCORE = 0.6 // ≥ → medium, else low

// Budget table. Terrain subdivisions are the biggest per-tile lever: 24 is plenty
// even on an M1 Max (32 was a bit hard), 16 mid, 12 for the low/Quest-in-XR tier
// (a Quest is clamped to medium flat, low in XR). No power-of-2 requirement — LOD
// vertex alignment only needs tile SIZES to double, so any subdivision count fits.
const BUDGETS: Record<PerfTier, PerfBudgets> = {
  high: {
    hardwareScaling: 1,
    hiResSubdivisions: 24,
    poolSize: 120,
    reach: 6000,
    fillBudget: 24,
    shadowTextureSize: 2048,
    numCascades: 4,
    reflectionSize: 512,
    reflections: true,
  },
  medium: {
    hardwareScaling: 1,
    hiResSubdivisions: 16,
    poolSize: 80,
    reach: 5000,
    fillBudget: 18,
    shadowTextureSize: 1024,
    numCascades: 4,
    reflectionSize: 256,
    reflections: true,
  },
  low: {
    hardwareScaling: 1.5,
    hiResSubdivisions: 12,
    poolSize: 56,
    reach: 3500,
    fillBudget: 12,
    shadowTextureSize: 1024,
    numCascades: 2,
    reflectionSize: 128,
    reflections: false,
  },
}

/** Combined capability score (higher = faster; ~1 = medium baseline). */
export function score(m: PerfMeasurements): number {
  const term = (key: keyof PerfMeasurements) => {
    const cost = m[key]
    if (!(cost > 0)) return 0 // guard 0/NaN → contribute nothing rather than ∞
    return WEIGHT[key] * (REF[key] / cost)
  }
  return term('fillMs') + term('vertexMs') + term('drawCallMs') + term('cpuMs')
}

/** Map raw measurements to a flat-render quality tier. */
export function classify(m: PerfMeasurements): PerfTier {
  const s = score(m)
  if (s >= HIGH_SCORE) return 'high'
  if (s >= MEDIUM_SCORE) return 'medium'
  return 'low'
}

/** One tier down (floored at low) — the stereo-VR bias: rendering two eyes roughly
 * doubles fill, so an XR session runs a notch below the flat classification. */
export function lowerTier(tier: PerfTier): PerfTier {
  return tier === 'high' ? 'medium' : 'low'
}

const TIER_RANK: Record<PerfTier, number> = { low: 0, medium: 1, high: 2 }
const TIER_BY_RANK: PerfTier[] = ['low', 'medium', 'high']

/** The coarser (slower) of two tiers. */
export function minTier(a: PerfTier, b: PerfTier): PerfTier {
  return TIER_BY_RANK[Math.min(TIER_RANK[a], TIER_RANK[b])]
}

/** Device-class hints that CLAMP the measured tier. The micro-benchmark can't
 * stress a fast-but-fill/thermally-limited mobile GPU from a small flat test (a
 * Quest can score as high as an M1 Max on the raw numbers), so a standalone HMD is
 * capped no matter what it measures. Distinct from a tethered PC headset, which is
 * a powerful GPU and must NOT be clamped — hence the renderer/memory gate, not
 * merely "immersive-VR is supported". */
export interface ClassHints {
  /** navigator.xr.isSessionSupported('immersive-vr'). */
  immersiveVr?: boolean
  /** UNMASKED_RENDERER_WEBGL, if exposed. */
  renderer?: string
  /** navigator.deviceMemory (GB). */
  deviceMemory?: number
}

/** True for a standalone mobile headset (Quest, Pico…): immersive-VR capable AND
 * a mobile GPU (Adreno/Mali/PowerVR) or low reported memory. A desktop driving a
 * tethered headset reports immersive-VR too but has a desktop renderer → false. */
export function isStandaloneHmd(hints: ClassHints): boolean {
  if (!hints.immersiveVr) return false
  if (/adreno|mali|powervr|xclipse/i.test(hints.renderer ?? '')) return true
  return (hints.deviceMemory ?? 99) <= 4
}

/** The hardest (highest) tier a device class is allowed to reach. Standalone HMDs
 * are capped at medium: even their "flat" pre-XR view runs on the mobile GPU, and
 * they will enter stereo. Everything else is uncapped (high). */
export function tierCap(hints: ClassHints): PerfTier {
  return isStandaloneHmd(hints) ? 'medium' : 'high'
}

/** Budgets for a tier. In XR we also bump hardware scaling a little on top of the
 * tier drop, since fill is the binding constraint in stereo. */
export function budgetsForTier(tier: PerfTier, xr = false): PerfBudgets {
  const b = BUDGETS[tier]
  if (!xr) return { ...b }
  return { ...b, hardwareScaling: Math.max(b.hardwareScaling, 1.2) }
}

/** A light device fingerprint: enough to notice a real hardware/driver change
 * (dock, eGPU, GPU-in-browser flip) without being fussy. Falls back gracefully
 * when the renderer string is masked. */
export function buildSignature(env: ProbeEnv): string {
  return [
    env.renderer ?? 'unknown-gpu',
    env.deviceMemory ?? '?',
    env.hardwareConcurrency ?? '?',
    env.immersiveVr ? 'vr' : 'novr',
    env.screenW ?? '?',
    env.screenH ?? '?',
  ].join('|')
}

/** Parse a stored profile, tolerating absent/corrupt/legacy data (→ null). */
export function readStored(storage: StorageLike | null): StoredProfile | null {
  if (storage == null) return null
  let raw: string | null
  try {
    raw = storage.getItem(STORAGE_KEY)
  } catch {
    return null // access can throw in some privacy modes
  }
  if (raw == null) return null
  try {
    const p = JSON.parse(raw) as StoredProfile
    if (
      p == null ||
      typeof p.probeVersion !== 'number' ||
      typeof p.signature !== 'string' ||
      p.measurements == null ||
      typeof p.measuredAt !== 'number'
    ) {
      return null
    }
    return p
  } catch {
    return null
  }
}

export function writeStored(
  storage: StorageLike | null,
  stored: StoredProfile
): void {
  if (storage == null) return
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(stored))
  } catch {
    /* quota / privacy mode — caching is best-effort */
  }
}

/**
 * Should the benchmark re-run? Yes when there's nothing cached, the workload
 * version moved, the device signature changed, the cache is past its TTL, or the
 * caller forces it. Pure — the caller supplies `now`, the current signature, and
 * the TTL.
 */
export function shouldRerun(opts: {
  stored: StoredProfile | null
  signature: string
  now: number
  ttlMs?: number
  force?: boolean
}): boolean {
  const { stored, signature, now, ttlMs = DEFAULT_TTL_MS, force = false } = opts
  if (force || stored == null) return true
  if (stored.probeVersion !== PROBE_VERSION) return true
  if (stored.signature !== signature) return true
  return now - stored.measuredAt > ttlMs
}

/** Whether a (non-rerun) cached profile is merely past its TTL — used to decide a
 * background refresh while still serving the cached budgets immediately. */
export function isStale(
  stored: StoredProfile,
  now: number,
  ttlMs = DEFAULT_TTL_MS
): boolean {
  return now - stored.measuredAt > ttlMs
}

/** Resolve raw measurements into the full flat + XR profile a consumer uses. The
 * measured tier is clamped by device class (`hints`) — so a standalone HMD that
 * scores implausibly high on the light flat benchmark is still capped to medium,
 * and its XR tier to low. */
export function resolveProfile(
  measurements: PerfMeasurements,
  opts: {
    cached: boolean
    stale?: boolean
    hints?: ClassHints
  } = { cached: false }
): PerfProfile {
  const tier = minTier(classify(measurements), tierCap(opts.hints ?? {}))
  const xrTier = lowerTier(tier)
  return {
    tier,
    budgets: budgetsForTier(tier, false),
    xrTier,
    xrBudgets: budgetsForTier(xrTier, true),
    measurements,
    cached: opts.cached,
    stale: opts.stale ?? false,
  }
}

/** A safe default profile for when the probe can't run (no WebGL/localStorage,
 * static prerender): assume medium so nothing is starved and nothing over-reaches. */
export function defaultProfile(): PerfProfile {
  return resolveProfile(
    {
      fillMs: REF.fillMs,
      vertexMs: REF.vertexMs,
      drawCallMs: REF.drawCallMs,
      cpuMs: REF.cpuMs,
    },
    { cached: false }
  )
}
