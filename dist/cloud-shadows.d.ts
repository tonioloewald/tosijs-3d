import * as BABYLON from '@babylonjs/core';
/** Where a blob's shadow lands: slide from its altitude down the sun direction to the ground
 * plane. `sunDir` is the light's TRAVEL direction (y < 0 when shining down); a sun at/below
 * the horizon throws no useful shadow, so the blob's own footprint is returned unmoved. */
export declare function projectShadowXZ(x: number, y: number, z: number, sunDir: {
    x: number;
    y: number;
    z: number;
}, groundY?: number): {
    x: number;
    z: number;
};
/** World XZ → texture UV inside a square window centred on (cx, cz). Matches the shader's
 * mapping (`(pos - centre) / size + 0.5`); outside 0…1 the shader skips the lookup. */
export declare function shadowWindowUv(px: number, pz: number, cx: number, cz: number, worldSize: number): {
    u: number;
    v: number;
};
export interface CloudShadowBlob {
    x: number;
    z: number;
    /** Footprint radii in world metres (x/z of the squashed ellipsoid, or the model's extent). */
    rx: number;
    rz: number;
    /** 0…1 darkness of this blob's shadow. */
    strength: number;
    /** Optional pre-baked top-down silhouette (e.g. a modeled cloud rendered once from above).
     * Stamped instead of the soft ellipse; `strength` becomes its opacity. */
    sprite?: CanvasImageSource;
}
/** One top-down shadow texture for a whole cloud field, shared by every receiving material. */
export declare class CloudShadowMap {
    readonly texture: BABYLON.DynamicTexture;
    readonly resolution: number;
    /** World size (metres) of the square window the texture covers. */
    worldSize: number;
    centerX: number;
    centerZ: number;
    /** Sun TRAVEL direction (normalised, y<0 shining down) + the shadow ground-plane Y. The
     * shader projects each receiver fragment down this to sample the right cloud — see the plugin. */
    sunX: number;
    sunY: number;
    sunZ: number;
    groundY: number;
    /** Top of the cloud layer (world Y). Receivers above this get no shadow (nothing casts from
     * higher). Defaults huge so an unset map shadows everything; clouds set it to the real top. */
    layerTop: number;
    private _plugins;
    /** How many blobs the last {@link paint} stamped — a debug readout. */
    lastPaintCount: number;
    /** Debug: how many times the shader hook has bound (0 ⇒ bindForSubMesh never runs). */
    bindCount: number;
    /** How many materials carry the (enabled) hook — a debug readout. */
    get attachedCount(): number;
    constructor(scene: BABYLON.Scene, worldSize: number, resolution?: number);
    /** Inject (or re-enable) the shadow hook on a material. Idempotent. */
    attachTo(material: BABYLON.Material): void;
    /** Recentre the sampling window (world XZ). The caller repaints after moving it. */
    setCenter(x: number, z: number): void;
    /** Sun travel direction receivers project along, and the ground plane blobs were projected to
     * (keep it the same value {@link projectShadowXZ} used when painting — default 0). */
    setSun(dir: {
        x: number;
        y: number;
        z: number;
    }, groundY?: number): void;
    /** Repaint the whole field. Blob positions are WORLD XZ of where the shadow LANDS (project
     * along the sun with {@link projectShadowXZ} first). White = lit; blobs darken. */
    paint(blobs: CloudShadowBlob[]): void;
    dispose(): void;
}
//# sourceMappingURL=cloud-shadows.d.ts.map