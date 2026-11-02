/** Something that lights the night sky. */
export interface LightPollutionSource {
    /** Where it is, now (world metres; a getter, so it follows origin shifts). */
    centre: () => {
        x: number;
        z: number;
    };
    /** Metres: full strength within this of the centre. */
    radius: number;
    /** 0…1, now. */
    strength: () => number;
}
/** How much one source pollutes the sky at a distance from its centre. */
export declare function pollutionFrom(strength: number, radius: number, distance: number): number;
/** Pollutions combined like veils: never past 1. */
export declare function combinePollution(values: Iterable<number>): number;
/** Register a source with a scene. Returns its release. */
export declare function lightPollutionSource(scene: object, source: LightPollutionSource): () => void;
/** The sky's pollution at a point in a scene, from `base` (0…1) and every source. */
export declare function lightPollutionAt(scene: object, x: number, z: number, base?: number): number;
//# sourceMappingURL=light-pollution.d.ts.map