import * as BABYLON from '@babylonjs/core';
import type { HumanProxy } from './human-pack.js';
import type { BuiltRig } from './rig-build.js';
import { type VertexWeights } from './proxy-fit.js';
/**
 * A material for a proxy from its own textures, or one of its alternate
 * `look`s (colourways; `proxy.material.looks`).
 */
export declare function proxyMaterial(scene: BABYLON.Scene, proxy: HumanProxy, look?: string): BABYLON.PBRMaterial;
/**
 * A proxy on a built body. `positions` are the morphed pack positions the
 * body was built from (every vertex); `weights` has skin weights for every
 * base vertex (`nearestWeights`).
 */
export declare function humanProxy(scene: BABYLON.Scene, built: BuiltRig, proxy: HumanProxy, positions: ArrayLike<number>, weights: VertexWeights, material?: BABYLON.Material, options?: {
    /** Push it out from a point (a hat over hair, from the skull's middle). */
    inflate?: {
        centre: {
            x: number;
            y: number;
            z: number;
        };
        by: number;
    };
    /** Push it out along its own surface by metres (armour over a bodysuit). */
    lift?: number;
}): BABYLON.Mesh;
/**
 * Hide the body's skin under what it wears. Triangles wholly under a garment
 * are dropped, and the skin it covers (listed, or found by `coveredBy` from
 * `drawn`) is TUCKED: drawn in along its normal by
 * `tuck` metres, so where a garment's edge and its listed vertices disagree
 * the skin dips under the edge instead of leaving a hole. `triangles` and
 * `vertices` are the body's compact skin (`humanSkin`).
 */
export declare function coverBody(built: BuiltRig, triangles: ArrayLike<number>, vertices: ArrayLike<number>, wearing: (HumanProxy | null)[], options?: {
    tuck?: number;
    /**
     * The worn garments' drawn positions (by proxy name, the pack's frame),
     * so skin they cover but do not list is found by geometry and tucked too.
     */
    drawn?: Map<string, Float32Array>;
    /** Metres over which a tuck fades in from the covered skin's edge. */
    fade?: number;
}): void;
//# sourceMappingURL=human-proxy.d.ts.map