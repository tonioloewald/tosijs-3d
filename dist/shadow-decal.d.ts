import * as BABYLON from '@babylonjs/core';
/** A soft round dark blob: opaque-ish at the centre, fading to fully transparent at the rim.
 * Cached per scene — every decal shares it. */
export declare function softShadowTexture(scene: BABYLON.Scene, resolution?: number): BABYLON.DynamicTexture;
/** The shared, unlit, alpha-blended black material every decal draws with. Cached per scene. */
export declare function shadowDecalMaterial(scene: BABYLON.Scene): BABYLON.StandardMaterial;
export interface ShadowDecalOptions {
    /** World diameter of the blob at scaling 1. Default 1 — set via `mesh.scaling` per instance too. */
    size?: number;
    name?: string;
}
/** A single flat, ground-facing soft-shadow quad using the shared decal material. Not pickable,
 * casts/receives no real shadows. Size via `mesh.scaling.x/z`, darkness via `mesh.visibility`. */
export declare function createShadowDecal(scene: BABYLON.Scene, opts?: ShadowDecalOptions): BABYLON.Mesh;
export interface ProjectDownOptions {
    /** How high above `x,z` to start the downward ray. Should clear the caster. Default 200. */
    fromHeight?: number;
    /** How far down to look for a surface. Default 1000. */
    maxDistance?: number;
    /** Lift off the hit surface to avoid z-fighting. Default 0.05. */
    bias?: number;
    /** Which meshes count as ground. Default: any pickable mesh (skip the caster via this). */
    predicate?: (m: BABYLON.AbstractMesh) => boolean;
}
/** Lay `decal` flat on the first surface directly below `(x, z)`. Returns false (and leaves the
 * decal where it was) if nothing was hit. One raycast — fine for a single caster (character,
 * vehicle, dropped item); for a whole FIELD, place flat on a shared sampled plane instead. */
export declare function projectShadowDown(decal: BABYLON.Mesh, scene: BABYLON.Scene, x: number, z: number, opts?: ProjectDownOptions): boolean;
//# sourceMappingURL=shadow-decal.d.ts.map