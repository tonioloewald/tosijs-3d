import * as BABYLON from '@babylonjs/core';
export interface Fabric {
    /** How rough the surface is, 0 (mirror) to 1. */
    roughness: number;
    /** 1 for a metal: it reflects its surroundings in its own colour. Default 0. */
    metallic?: number;
    /** A colour the finish IS (gold, copper): choosing it recolours wholly. */
    tint?: string;
    /** The grazing glow of fibres, 0 to 1, and how spread it is. */
    sheen: number;
    sheenRoughness: number;
}
/** Fabric presets, by how they take light. */
export declare const FABRICS: Readonly<Record<string, Fabric>>;
export interface ClothLook {
    fabric?: string;
    /** The recolour, sRGB (anything `parseColor` reads). */
    colour?: string;
    /** 0 keeps the texture's colours, 1 is the colour wholly. */
    amount?: number;
}
export interface ClothShading {
    set(look: ClothLook): void;
}
/** Fabric and recolour on a garment's PBR material. */
export declare function clothShading(material: BABYLON.PBRMaterial, look?: ClothLook): ClothShading;
//# sourceMappingURL=cloth-shading.d.ts.map