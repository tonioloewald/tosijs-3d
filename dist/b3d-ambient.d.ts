import * as BABYLON from '@babylonjs/core';
import { B3dChild } from './b3d-utils';
import type { AmbientEffect, AmbientRequest } from './ambient-budget';
import type { PerfTier } from './perf-probe';
import type { B3d } from './tosi-b3d';
export declare class B3dAmbient extends B3dChild implements AmbientEffect {
    static initAttributes: {
        preset: string;
        where: "always" | "underwater" | "above";
        count: number;
        minCount: number;
        minTier: PerfTier;
        priority: number;
        radius: number;
        rate: number;
        color: string;
        size: number;
        windX: number;
        windZ: number;
        disabled: boolean;
    };
    preset: string;
    where: 'always' | 'underwater' | 'above';
    count: number;
    minCount: number;
    minTier: PerfTier;
    priority: number;
    radius: number;
    rate: number;
    color: string;
    size: number;
    windX: number;
    windZ: number;
    disabled: boolean;
    /** 0…1 — how strongly this is emitting right now (ramps, never switches). */
    get intensity(): number;
    /** Capacity the scene actually granted. **0 = switched off** (couldn't be honest). */
    get granted(): number;
    private _ps;
    private _emitter;
    private _intensity;
    private _baseRate;
    private _granted;
    private _id;
    private _offBudget;
    private _tick;
    private get _p();
    private get _sizeScale();
    /** What we're ASKING the scene for. The scene divides one pool between all comers. */
    budgetRequest(): AmbientRequest;
    /**
     * The scene's answer: the POPULATION we're allowed to sustain. `0` = switch off.
     *
     * **This must not rebuild the ParticleSystem, and it used to.** Capacity is baked in at
     * construction, so re-allocating meant tear-down + rebuild — and every re-allocation
     * (quality change, XR entry, a watchdog shed) made the whole effect vanish and visibly
     * REGENERATE in front of you. Worse, a shed to 0 deleted the particles mid-air.
     *
     * So the buffer is sized ONCE, for the effect's full desired population, and the allocation
     * drives the emission instead (see `_fillRate`). A buffer is cheap; what actually costs is
     * live particles filling pixels, and that's exactly what the population governs. Shedding to
     * 0 now stops emission and lets the existing particles LIVE OUT their lives — the effect
     * drains away instead of being snatched.
     */
    applyAllocation(capacity: number): void;
    /** Buffer size: the effect's FULL desired population, regardless of what it's granted. */
    private _budgetCapacity;
    sceneReady(owner: B3d, _scene: BABYLON.Scene): void;
    private _build;
    /** Give the GPU resources back. The noise texture is ours too — dispose it or a shed effect
     * keeps paying for the wander it no longer draws. */
    private _teardown;
    sceneDispose(): void;
    private _update;
    /**
     * Emit toward a POPULATION, not at a fixed rate.
     *
     * A rate only reaches its steady-state population after roughly one particle lifetime — and
     * a mote lives up to 22 seconds, so a naive `rate × intensity` means you walk into an empty
     * room and watch the dust slowly arrive. You'd start with nothing every single time: on load,
     * and on every ramp-in.
     *
     * So aim at the population the look actually wants (`rate × mean life × intensity`) and, when
     * short, emit fast enough to close the gap in a couple of seconds rather than in a lifetime.
     * The boost is self-cancelling — the deficit goes to zero as the population arrives and the
     * rate settles back to natural — so this is a fill, not a permanent multiplier. Capped,
     * because an unbounded catch-up would slam the whole population out in one frame and they'd
     * then all die together in one visible pulse.
     */
    private _fillRate;
    /**
     * How much we're emitting, given where the camera is. **Ramps, never switches** — bubbles
     * arrive as the water does. A hard cut at the surface is the particle version of the fog
     * thunk, and we fixed that once already.
     */
    private _whereWeight;
    private _waterY;
}
export declare const b3dAmbient: (...args: unknown[]) => B3dAmbient;
//# sourceMappingURL=b3d-ambient.d.ts.map