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
//# sourceMappingURL=fabrics.d.ts.map