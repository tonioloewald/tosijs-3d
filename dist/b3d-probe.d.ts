import { Component } from 'tosijs';
import { type PerfProfile } from './perf-probe';
/**
 * Synchronously seed the system quality proxy from a valid, same-version cache if
 * one exists. `<tosi-b3d>` calls this at setup so a scene builds with the right
 * device budgets on the very first frame — before the async probe would finish.
 * Uses the cached device-class hints so the clamp is applied without the async
 * immersive-VR check. Returns true if it hydrated.
 */
export declare function hydrateProfileFromCache(): boolean;
/**
 * Measure the device (or serve a fresh cache) and feed the system quality proxy —
 * WITHOUT mounting any DOM element. This is what `<tosi-b3d>` calls to auto-probe;
 * it can also be called directly. Resolves with the resolved profile. Safe to call
 * repeatedly (cache + version + TTL gate the actual benchmark).
 */
export declare function runProbe(opts?: {
    force?: boolean;
    ttlDays?: number;
    /**
     * The caller couldn't get a quiet moment and measured anyway. The profile is
     * still applied — a measured guess beats the safe default — but it is cached
     * with a SHORT life so the next visit re-measures instead of living with a
     * verdict taken under contention for a month. See `_probeWhenIdle`.
     */
    measuredWhileBusy?: boolean;
}): Promise<PerfProfile>;
/** `<tosi-b3d-probe>` — a thin element wrapper around `runProbe` for declarative
 * use. It fires a `profile` event when done; the measurement itself mounts nothing. */
export declare class B3dProbe extends Component {
    static initAttributes: {
        /** Ignore the cache and re-measure (for testing / calibration). */
        force: boolean;
        /** Cache lifetime in days before a re-measure. */
        ttlDays: number;
    };
    force: boolean;
    ttlDays: number;
    /** Resolves with the profile once measured/loaded (also fired as `profile`). */
    ready: Promise<PerfProfile> | null;
    connectedCallback(): void;
}
export declare const b3dProbe: import("tosijs").ElementCreator<B3dProbe>;
//# sourceMappingURL=b3d-probe.d.ts.map