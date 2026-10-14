export interface RockyCraters {
    /** 0…1, as `sphereCraters`' density. */
    density: number;
    /** The largest crater's radius, a fraction of the planet's. */
    size: number;
    /** 0…1: how worn the old ones are. */
    wear: number;
    /** -1…1: more on the planet's local +Z side (a moon's leading side). */
    asymmetry: number;
}
export interface RockyClimate {
    equatorTemp: number;
    temperateTemp: number;
    poleTemp: number;
    mapMoisture: number;
    /** Glowing volcanic plates, 0…1 (Io). Absent: none. */
    volcanism?: number;
    /**
     * How much slopes are exaggerated before the cliff test. A globe's relief
     * is gentle, so an Earth wants about 6; on cratered ground that turns most
     * of the surface to bare rock, so an airless world wants about 1.5.
     */
    slopeExaggeration: number;
}
export interface RockyWorldLook {
    ocean: number;
    atmosphere: number;
    atmosphereColor: string;
    clouds: number;
    cloudColor: string;
    grossAmplitude: number;
    detailAmplitude: number;
    craters: RockyCraters;
    climate: RockyClimate;
    /** The sea's colour, shallow and deep, `#rrggbb`. Absent: an Earth's. */
    sea?: {
        shallow: string;
        deep: string;
    };
    /**
     * The ground's own colours, replacing the biome chart's: four along the
     * temperature axis (cold to hot), for every moisture row, with a second
     * four (`b`) the shader varies them toward in patches. Linear RGB 0…1.
     * Absent: the chart's (rock, dust, regolith, life).
     */
    palette?: {
        a: number[][];
        b: number[][];
    };
}
export declare const ROCKY_WORLDS: Record<string, RockyWorldLook>;
/** A preset by name; an unknown name is null (the planet's own settings). */
export declare function resolveRockyWorld(name: string): RockyWorldLook | null;
/** What `rockyWorldFor` needs to know (galaxy-data's `PlanetData` has it). */
export interface RockyPlanetFacts {
    /** % of the surface under water, 0…100. */
    hydrographics: number;
    /** galaxy-data's atmosphere type: `'Trace'` is none to speak of. */
    atmosphere: string;
    /** Starlight relative to the Earth's. */
    insolation: number;
}
/**
 * Which rocky world a generated planet looks like, and what of the preset to
 * change: airless rock (the Moon, or Mercury close to its star), a world of
 * seas in the warm band, a Venus under a hot toxic sky, and otherwise a Mars.
 * The sea takes the planet's own share of water.
 */
export declare function rockyWorldFor(facts: RockyPlanetFacts): {
    world: string;
    overrides: Partial<RockyWorldLook>;
};
//# sourceMappingURL=rocky-world.d.ts.map