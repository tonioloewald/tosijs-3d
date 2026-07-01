/** Bump whenever the benchmark WORKLOAD changes (so old cached measurements, which
 * are only comparable within a workload version, are discarded). Tuning the
 * classifier thresholds or the budget table does NOT need a bump — those re-derive
 * from the stored raw measurements. */
export declare const PROBE_VERSION = 2;
export declare const STORAGE_KEY = "tosijs-3d:perf-profile";
export declare const DAY_MS: number;
export declare const DEFAULT_TTL_MS: number;
export type PerfTier = 'low' | 'medium' | 'high';
/** Raw benchmark output — milliseconds per fixed workload, so LOWER is faster.
 * The workload sizes are baked into b3d-probe and versioned by PROBE_VERSION, so
 * these numbers are only comparable across runs of the same version. */
export interface PerfMeasurements {
    /** Cost of a fixed fullscreen overdraw pass (the #1 mobile/stereo bottleneck). */
    fillMs: number;
    /** Cost of a fixed vertex-heavy draw (maps to terrain subdivisions / pool). */
    vertexMs: number;
    /** Cost of a fixed batch of tiny draws (maps to draw-call / instance budget). */
    drawCallMs: number;
    /** Cost of a fixed CPU noise batch (maps to terrain streaming / JS budget). */
    cpuMs: number;
}
/** Concrete knobs a scene reads to configure itself for the measured device.
 * Components resolve any attribute left at its `auto` sentinel against these. */
export interface PerfBudgets {
    /** engine.setHardwareScalingLevel — >1 renders below native res (cheap fill win). */
    hardwareScaling: number;
    hiResSubdivisions: number;
    poolSize: number;
    reach: number;
    fillBudget: number;
    shadowTextureSize: number;
    numCascades: number;
    /** Reflection probe resolution (per face). */
    reflectionSize: number;
    /** Whether automatic reflection probes run at all (off on the weakest tier — a
     * real-time cube probe is one of the most expensive things you can add). */
    reflections: boolean;
}
export interface StoredProfile {
    probeVersion: number;
    signature: string;
    measurements: PerfMeasurements;
    /** The device-class hints at measure time, so the cache can be re-clamped on a
     * synchronous read without repeating the async immersive-VR check. */
    hints?: ClassHints;
    /** epoch ms; caller passes the clock so this module stays pure/deterministic. */
    measuredAt: number;
}
/** The resolved profile a consumer actually uses: flat + XR (stereo-biased) tiers
 * and their budgets, plus whether the cache is past its TTL (still usable, but the
 * component will re-measure in the background). */
export interface PerfProfile {
    tier: PerfTier;
    budgets: PerfBudgets;
    xrTier: PerfTier;
    xrBudgets: PerfBudgets;
    measurements: PerfMeasurements;
    /** true when served from cache, false when freshly measured. */
    cached: boolean;
    stale: boolean;
}
export interface ProbeEnv {
    /** UNMASKED_RENDERER_WEBGL if the browser exposes it (strongest signal). */
    renderer?: string;
    /** navigator.deviceMemory (GB). */
    deviceMemory?: number;
    /** navigator.hardwareConcurrency (logical cores). */
    hardwareConcurrency?: number;
    /** navigator.xr.isSessionSupported('immersive-vr') — drives the HMD clamp. */
    immersiveVr?: boolean;
    screenW?: number;
    screenH?: number;
}
export interface StorageLike {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}
/** Combined capability score (higher = faster; ~1 = medium baseline). */
export declare function score(m: PerfMeasurements): number;
/** Map raw measurements to a flat-render quality tier. */
export declare function classify(m: PerfMeasurements): PerfTier;
/** One tier down (floored at low) — the stereo-VR bias: rendering two eyes roughly
 * doubles fill, so an XR session runs a notch below the flat classification. */
export declare function lowerTier(tier: PerfTier): PerfTier;
/** The coarser (slower) of two tiers. */
export declare function minTier(a: PerfTier, b: PerfTier): PerfTier;
/** Device-class hints that CLAMP the measured tier. The micro-benchmark can't
 * stress a fast-but-fill/thermally-limited mobile GPU from a small flat test (a
 * Quest can score as high as an M1 Max on the raw numbers), so a standalone HMD is
 * capped no matter what it measures. Distinct from a tethered PC headset, which is
 * a powerful GPU and must NOT be clamped — hence the renderer/memory gate, not
 * merely "immersive-VR is supported". */
export interface ClassHints {
    /** navigator.xr.isSessionSupported('immersive-vr'). */
    immersiveVr?: boolean;
    /** UNMASKED_RENDERER_WEBGL, if exposed. */
    renderer?: string;
    /** navigator.deviceMemory (GB). */
    deviceMemory?: number;
}
/** True for a standalone mobile headset (Quest, Pico…): immersive-VR capable AND
 * a mobile GPU (Adreno/Mali/PowerVR) or low reported memory. A desktop driving a
 * tethered headset reports immersive-VR too but has a desktop renderer → false. */
export declare function isStandaloneHmd(hints: ClassHints): boolean;
/** The hardest (highest) tier a device class is allowed to reach. Standalone HMDs
 * are capped at medium: even their "flat" pre-XR view runs on the mobile GPU, and
 * they will enter stereo. Everything else is uncapped (high). */
export declare function tierCap(hints: ClassHints): PerfTier;
/** Budgets for a tier. In XR we also bump hardware scaling a little on top of the
 * tier drop, since fill is the binding constraint in stereo. */
export declare function budgetsForTier(tier: PerfTier, xr?: boolean): PerfBudgets;
/** A light device fingerprint: enough to notice a real hardware/driver change
 * (dock, eGPU, GPU-in-browser flip) without being fussy. Falls back gracefully
 * when the renderer string is masked. */
export declare function buildSignature(env: ProbeEnv): string;
/** Parse a stored profile, tolerating absent/corrupt/legacy data (→ null). */
export declare function readStored(storage: StorageLike | null): StoredProfile | null;
export declare function writeStored(storage: StorageLike | null, stored: StoredProfile): void;
/**
 * Should the benchmark re-run? Yes when there's nothing cached, the workload
 * version moved, the device signature changed, the cache is past its TTL, or the
 * caller forces it. Pure — the caller supplies `now`, the current signature, and
 * the TTL.
 */
export declare function shouldRerun(opts: {
    stored: StoredProfile | null;
    signature: string;
    now: number;
    ttlMs?: number;
    force?: boolean;
}): boolean;
/** Whether a (non-rerun) cached profile is merely past its TTL — used to decide a
 * background refresh while still serving the cached budgets immediately. */
export declare function isStale(stored: StoredProfile, now: number, ttlMs?: number): boolean;
/** Resolve raw measurements into the full flat + XR profile a consumer uses. The
 * measured tier is clamped by device class (`hints`) — so a standalone HMD that
 * scores implausibly high on the light flat benchmark is still capped to medium,
 * and its XR tier to low. */
export declare function resolveProfile(measurements: PerfMeasurements, opts?: {
    cached: boolean;
    stale?: boolean;
    hints?: ClassHints;
}): PerfProfile;
/** A safe default profile for when the probe can't run (no WebGL/localStorage,
 * static prerender): assume medium so nothing is starved and nothing over-reaches. */
export declare function defaultProfile(): PerfProfile;
//# sourceMappingURL=perf-probe.d.ts.map