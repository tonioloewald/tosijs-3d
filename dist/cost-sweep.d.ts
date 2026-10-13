import type * as BABYLON from '@babylonjs/core';
export interface SweepRow {
    name: string;
    /** Median interval between frames, ms. */
    ms: number;
    p95: number;
    /** Baseline `ms` minus this row's. Positive: switching it off was faster. */
    saved: number;
    frames: number;
}
/** Median and 95th percentile of a list of frame intervals. */
export declare function summarise(intervals: number[]): {
    ms: number;
    p95: number;
};
/**
 * The group a mesh belongs to: its material's name, or its own, with instance
 * numbers dropped so `tile_12` and `tile_7` are one group, and cut at the
 * first hyphen so a family of materials is one group too.
 */
export declare function groupKey(meshName: string, materialName?: string): string;
/** Keep the `keep` heaviest groups; the rest become one group called `other`. */
export declare function topGroups<T>(groups: Map<string, {
    weight: number;
    items: T[];
}>, keep?: number): Array<{
    name: string;
    items: T[];
}>;
/** The baseline first, then the rest by what they saved, as panel lines. */
export declare function formatSweep(rows: SweepRow[]): string[];
/** One run of the sweep as it is kept between page loads. */
export interface SweepRun {
    /** Counts up for as long as the journal survives. */
    n: number;
    /** When it began, ms since the epoch. */
    began: number;
    /** Its rows so far, as {@link formatSweep} lines. */
    lines: string[];
    /** The experiment it was on when last heard from; `null` once finished. */
    starting: string | null;
    /** Whether that experiment was being switched on or measured. */
    phase?: 'applying' | 'measuring';
    /** Which sweep it was: the scene's, or the shader forms. */
    kind?: 'scene' | 'shaders';
}
/** `runs` with `run` added or replaced (by number), newest first, `keep` kept. */
export declare function recordRun(runs: SweepRun[], run: SweepRun, keep?: number): SweepRun[];
/**
 * The kept runs as panel lines, newest first. Every run gets a heading saying
 * whether it finished and, if not, where it stopped. Rows are listed for the
 * newest run and for the newest of each kind that has any, so a run that hangs
 * at once does not hide the last one that measured something.
 */
export declare function formatRuns(runs: SweepRun[], live?: number | null): string[];
export interface SweepOptions {
    /** Seconds sampled per experiment. */
    seconds?: number;
    /** Seconds to let each change settle before sampling. */
    settle?: number;
    /** The XR helper, when a session may be running. */
    xr?: BABYLON.WebXRDefaultExperience | null;
    /** Called as each experiment starts, and with `null` at the end. */
    progress?: (name: string | null, done: number, total: number) => void;
    /** Called before sampling starts and after it ends (lift a frame cap here). */
    unthrottle?: (on: boolean) => void;
    /** Meshes the sweep must leave alone (the panel it is run from, the hands). */
    skip?: (mesh: BABYLON.AbstractMesh) => boolean;
    /**
     * Called before each experiment with the rows so far and the one about to
     * start, and with `null` when the sweep finishes. Write it somewhere that
     * survives a crash: an experiment that hangs the device is then named.
     */
    journal?: (rows: SweepRow[], starting: string | null, phase?: 'applying' | 'measuring') => void;
    /**
     * More experiments, run after the closing baseline. `apply` makes the
     * change and returns the way back. In a session `<tosi-b3d>` adds two here:
     * `+ full resolution` and `+ no foveation`, what each lever is saving.
     */
    extra?: Array<{
        name: string;
        apply: () => () => void;
    }>;
    /**
     * `'extra'` runs the baseline and the `extra` experiments only. For ones
     * that recompile shaders, which is heavy enough on a headset to be asked
     * for separately.
     */
    only?: 'extra';
}
export declare function costSweep(scene: BABYLON.Scene, options?: SweepOptions): Promise<SweepRow[]>;
//# sourceMappingURL=cost-sweep.d.ts.map