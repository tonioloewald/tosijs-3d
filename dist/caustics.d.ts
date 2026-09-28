import * as BABYLON from '@babylonjs/core';
/**
 * A tiling caustic network, `size`×`size` bytes of brightness (0–255).
 *
 * Worley F2 − F1 on a torus: near an edge between two cells the two nearest
 * feature points are almost equidistant, so F2 − F1 → 0, and that is where
 * light concentrates. Inverted and sharpened, it gives the bright web of real
 * caustics. Tiles because the feature points wrap.
 */
export declare function causticPattern(size?: number, cells?: number, seed?: number): Uint8Array;
/** Everything the caustic plugin binds, shared by every material it rides. */
export declare class CausticsMap {
    readonly texture: BABYLON.RawTexture;
    /** World Y of the water surface. */
    waterY: number;
    /** World metres per pattern tile. */
    cellSize: number;
    /** How bright the web gets (added light, as a fraction of the lit colour). */
    strength: number;
    /** Depth (m) over which caustics fade to nothing. */
    fadeDepth: number;
    /** Sun travel direction (y < 0 shining down); the pattern slants with it. */
    sunX: number;
    sunY: number;
    sunZ: number;
    time: number;
    private _plugins;
    constructor(scene: BABYLON.Scene, size?: number);
    get attachedCount(): number;
    /** Put caustics on a material (idempotent). */
    attachTo(material: BABYLON.Material): void;
    dispose(): void;
}
//# sourceMappingURL=caustics.d.ts.map