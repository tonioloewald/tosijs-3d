import * as BABYLON from '@babylonjs/core';
import { B3dChild } from './b3d-utils.js';
import type { B3d } from './tosi-b3d.js';
import { NearIndex, type DecorationRole, type Placement, type ScatterRule } from './scatter.js';
export declare class B3dDecorator extends B3dChild {
    static preferredTagName: string;
    static shadowStyleSpec: {
        ':host': {
            display: string;
        };
    };
    static initAttributes: {
        budget: number;
        radius: number;
        seed: number;
        url: string;
        scale: number;
        follow: "on" | "off";
        shadows: "on" | "off";
        colliders: "on" | "off";
        colliderRange: number;
        colliderPool: number;
        shadowRange: number;
        shadowBudget: number;
        clump: number;
        clumpSize: number;
    };
    budget: number;
    radius: number;
    seed: number;
    url: string;
    scale: number;
    follow: 'on' | 'off';
    shadows: 'on' | 'off';
    colliders: 'on' | 'off';
    colliderRange: number;
    colliderPool: number;
    shadowRange: number;
    shadowBudget: number;
    clump: number;
    clumpSize: number;
    private _rules;
    /**
     * The rules. Replace before the first build (or call `rebuild()`). Unset,
     * they follow the library: `NATURE_RULES` for the default one, and Kenney's
     * `NATURE_KIT_RULES` when `url` names another (which is what `url` meant
     * before the default library changed).
     */
    get rules(): ScatterRule[];
    set rules(rules: ScatterRule[]);
    /**
     * Material name → role (`'leaf'`, `'evergreen'` or `'bark'`); see
     * `NATURE_ROLES` for the key forms. A library material with a role is drawn
     * with the terrain's biome shading in that role; any other keeps its own look.
     */
    roles: Record<string, DecorationRole>;
    /** What was placed last, in LOGICAL world coordinates. */
    placements: Placement[];
    /**
     * The NEAR-SET over `placements`: the one query everything near the viewer
     * uses (colliders, shadow casters; LOD, interaction and sound next).
     */
    near: NearIndex<Placement>;
    /** Milliseconds the last build took (scatter + instance buffers). */
    lastBuildMs: number;
    private _root;
    private _container;
    private _models;
    private _drawn;
    private _center;
    private _cache;
    private _cacheKey;
    private _key;
    private _observer;
    private _loadGen;
    private _pool;
    private _poolKind;
    private _nextColliderCheck;
    private _nextShadowCheck;
    private _syncShadows;
    private _debugOff;
    private _measuring;
    /** Builds completed — measureCost waits on it. */
    private _builds;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    sceneDispose(): void;
    /** Throw away the current scatter and build again on the next frame. */
    rebuild(): void;
    private _terrain;
    /** Everything the placements depend on, as one string. */
    private _currentKey;
    private _tick;
    private _warnedMissing;
    private _rockSources;
    private _rockMaterial;
    private _rockBiome;
    /** The source mesh for a procedural rock name, or null for any other name. */
    private _rockSource;
    private _roleMaterials;
    /**
     * The material a part is DRAWN with. A library material whose name has a
     * role becomes a plain StandardMaterial of the same colour carrying the
     * biome plugin in that role; anything else is used as it came.
     */
    private _roleMaterial;
    private _syncRockBiome;
    private _model;
    private _clearParts;
    private _build;
    private _scratch;
    /** One model's copies, into each part's VISIBLE mesh or its SHADOW twin. */
    private _writeInstances;
    private _shadowFrom;
    private _pickShadowCasters;
    private _placeColliders;
    /**
     * WHAT IT COSTS, measured in the browser it runs in. Steps through budgets,
     * lets each build and settle, then samples frames. Restores the budget.
     *
     *   await document.querySelector('tosi-b3d-decorator').measureCost()
     *
     * Frame time is capped by the display's refresh, so when it reads flat the
     * GPU line is the one that shows the cost — where the browser exposes GPU
     * timer queries (often only behind a flag); otherwise watch where the
     * frame time first leaves the refresh interval.
     */
    measureCost(budgets?: number[], seconds?: number): Promise<Array<{
        budget: number;
        placed: number;
        buildMs: number;
        frameMs: number;
        frameP95Ms: number;
        gpuMs: number | null;
        drawCalls: number;
        activeIndices: number;
    }>>;
    render(): void;
}
export declare const b3dDecorator: import("tosijs").ElementCreator<B3dDecorator>;
//# sourceMappingURL=b3d-decorator.d.ts.map