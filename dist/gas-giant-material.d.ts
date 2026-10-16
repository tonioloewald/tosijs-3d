import * as BABYLON from '@babylonjs/core';
import { type GasGiantLook } from './gas-giant.js';
export interface GasGiantMaterialOptions {
    /** How fast the clouds run. 1 is the default; 0 freezes them. */
    spin?: number;
    /**
     * Where the light is: a world position (`w` 1) or a direction TOWARD the
     * light (`w` 0). Unset, the scene's first point or directional light.
     */
    light?: () => {
        x: number;
        y: number;
        z: number;
        w: number;
    };
    /**
     * The planet's ring, for its SHADOW on the planet (#3320), read every
     * frame; null or absent for none. `inner` and `outer` are in planet radii,
     * `opacity` 0…1 and `seed` the ring's own (so the shadow is the ring you
     * see, gap for gap). `center`, `radius` and `normal` (the ring plane's,
     * the planet's own up) are in world space.
     */
    ring?: () => RingShadow | null;
}
/** A ring as its shadow needs it; see `GasGiantMaterialOptions.ring`. */
export interface RingShadow {
    inner: number;
    outer: number;
    opacity: number;
    seed: number;
    center: {
        x: number;
        y: number;
        z: number;
    };
    radius: number;
    normal: {
        x: number;
        y: number;
        z: number;
    };
}
/** A material that draws `look` on a sphere. Dispose it with the mesh. */
export declare function createGasGiantMaterial(scene: BABYLON.Scene, look: GasGiantLook, options?: GasGiantMaterialOptions): BABYLON.ShaderMaterial;
/** The scene's first point light (a star) or directional light (a sun). */
export declare function sceneLight(scene: BABYLON.Scene, out: BABYLON.Vector4): void;
//# sourceMappingURL=gas-giant-material.d.ts.map