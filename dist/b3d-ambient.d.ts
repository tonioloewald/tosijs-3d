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
     * The scene's answer. `0` means we could not be given enough to be *honest* — so we switch
     * off rather than emit a thin lie. Rebuilds because Babylon bakes capacity into the
     * ParticleSystem at construction; this only runs on real changes (quality, XR entry, a shed).
     */
    applyAllocation(capacity: number): void;
    sceneReady(owner: B3d, _scene: BABYLON.Scene): void;
    private _build;
    /** Give the GPU resources back. The noise texture is ours too — dispose it or a shed effect
     * keeps paying for the wander it no longer draws. */
    private _teardown;
    sceneDispose(): void;
    private _update;
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