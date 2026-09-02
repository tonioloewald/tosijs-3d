import * as BABYLON from '@babylonjs/core';
import { B3dChild } from './b3d-utils';
import type { B3d } from './tosi-b3d';
export declare class B3dClouds extends B3dChild {
    static preferredTagName: string;
    static initAttributes: {
        count: number;
        model: string;
        altitude: number;
        thickness: number;
        spread: number;
        size: number;
        color: string;
        opacity: number;
        fogDensity: number;
        approach: number;
        selfIllum: number;
        coverage: number;
        castShadows: boolean;
        shadowStrength: number;
        seed: number;
        windX: number;
        windZ: number;
    };
    count: number;
    model: string;
    altitude: number;
    thickness: number;
    spread: number;
    size: number;
    color: string;
    opacity: number;
    fogDensity: number;
    approach: number;
    selfIllum: number;
    coverage: number;
    castShadows: boolean;
    shadowStrength: number;
    seed: number;
    windX: number;
    windZ: number;
    /**
     * How deep in a cloud you are, 0…1. **Gameplay reads this** — break a lock, hide a ship,
     * make the enemy lose you. It's why the component exists.
     */
    get insideCloud(): number;
    private _blobs;
    /** Cloud clusters: the anchor that drifts/wraps + which pool blobs it owns. */
    private _clusters;
    /** Per-blob offset from its cluster anchor (index-aligned with `_blobs`). */
    private _offsets;
    /** Projected cloud-shadow texture (cloud-shadows.ts), when castShadows is on. */
    private _shadowMap;
    /** Something moved (recycle, coverage, sun, window) — repaint on the next throttled beat. */
    private _shadowDirty;
    private _shadowRepaintAge;
    private _lastSweptMeshCount;
    private _lastSunDir;
    private _sun;
    private _removeDebug;
    private _immersion;
    private _removeFogLayer;
    private _mat;
    private _baseColor;
    /** Whiteout colour, recomputed each frame — white at the cloud top, murk deeper down. */
    private _fogColor;
    /** The skybox, so the whiteout can blot the SKY too (scene fog alone can't — it opts out). */
    private _sky;
    private _lastCoverage;
    private _tick;
    private _onShift;
    /** New meshes join the scene (terrain tiles, loaded GLBs) → attach the shadow hook to any
     * that declare themselves receivers. */
    private _onAddition;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    /** The authored lobe (hidden template) + how to normalize it. */
    private _lobeSource;
    private _lobeScale;
    private _lobeBottom;
    private _buildClouds;
    sceneDispose(): void;
    /** Apply the `coverage` weather dial: how many blobs are active, how opaque, how dark, and
     * how much they still self-illuminate. Live — cheap enough to run when coverage moves. */
    private _applyCoverage;
    /** Repaint the projected shadow texture when something changed (a blob recycled, coverage or
     * the sun moved, the window drifted off the camera) — throttled, so the steady state costs
     * nothing but the per-pixel sample the receiving materials already do. */
    private _updateShadows;
    private _update;
}
export declare const b3dClouds: (...args: unknown[]) => B3dClouds;
//# sourceMappingURL=b3d-clouds.d.ts.map