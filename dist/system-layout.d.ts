/** What the layout needs to know about a planet (galaxy-data's `PlanetData` has it). */
export interface PlanetInput {
    seed: number;
    /** Distance from the star, AU. */
    orbitalRadius: number;
    /** Radius, km. */
    radius: number;
    /** `'rocky'`, `'gas giant'` or `'brown dwarf'`. */
    classification: string;
    /** Starlight, relative to the Earth's. */
    insolation: number;
    /** 0…1 when the planet has rings. */
    rings: number;
    /** Its moons' radii in km, inmost first, when they are known (our own
     * system); otherwise they follow from the seed. */
    moons?: number[];
}
export interface MoonLayout {
    seed: number;
    radiusKm: number;
    /** Drawn radius, scene units. */
    visualRadius: number;
    /** From the planet's centre, scene units. */
    distance: number;
    /** Seconds to go round its planet. */
    period: number;
    /** Where it starts, radians. */
    phase: number;
}
export interface PlanetLayout {
    /** From the star, scene units. */
    distance: number;
    visualRadius: number;
    /** Seconds to go round the star. */
    period: number;
    phase: number;
    moons: MoonLayout[];
    /** How far its moons (or ring) reach, scene units: the room it needs. */
    reach: number;
}
export interface NotableAsteroid {
    name: string;
    seed: number;
    radiusKm: number;
    visualRadius: number;
    distance: number;
    period: number;
    phase: number;
}
export interface BeltLayout {
    /** From the star, scene units. */
    inner: number;
    outer: number;
    /** Distance in AU at its middle (for its period). */
    au: number;
    notable: NotableAsteroid[];
}
export interface SystemLayout {
    planets: PlanetLayout[];
    belt: BeltLayout | null;
}
export interface LayoutOptions {
    /** The star's drawn radius: the first planet starts clear of it. */
    starRadius: number;
    /** Scene units per doubling of distance. */
    spacing?: number;
    /** Scene units for an Earth-sized radius. */
    earthSize?: number;
    /** Seconds for a planet at 1 AU to go round. */
    year?: number;
    /**
     * The belt's big bodies' radii in km, when they are known (Ceres, Vesta,
     * …): it then always has a belt before the first giant, with these.
     */
    belt?: number[];
}
/** Drawn radius from a true one: Earth is `earthSize`, the rest by a square root. */
export declare function visualRadius(radiusKm: number, earthSize?: number): number;
/** Scene distance for a true one: the same step per doubling. */
export declare function logDistance(au: number, base: number, spacing: number): number;
/**
 * Lay out a system: planets in order out from the star, each with its moons,
 * and an asteroid belt in the widest gap between the rocky planets and the
 * first giant (none if the gap is narrow or there is no giant).
 */
export declare function layoutSystem(planets: PlanetInput[], opts: LayoutOptions): SystemLayout;
/**
 * A SYSTEM GIVEN AS DATA rather than generated: a star, its planets in
 * order, their moons, and the belt's big bodies. `look` is the attributes
 * a `<tosi-b3d-planet>` is made with (`{ gas: 'saturn' }`, `{ world: 'mars' }`),
 * or `{ shape: 'rock' }` for a body too small to be round (Phobos), drawn
 * as a procedural rock. `maps` are the attributes it takes instead when the
 * system is drawn from real maps.
 */
export interface SystemBodySpec {
    name: string;
    radiusKm: number;
    look: Record<string, unknown>;
    maps?: Record<string, unknown>;
}
export interface SystemPlanetSpec extends SystemBodySpec {
    /** AU from the star. */
    au: number;
    /** Ring strength, 0…1. */
    rings?: number;
    moons?: SystemBodySpec[];
}
export interface SystemSpec {
    star: {
        name: string;
        /** 0…255. */
        rgb: [number, number, number];
        /** Relative to the Sun's. */
        luminosity: number;
        spectralType: string;
    };
    planets: SystemPlanetSpec[];
    belt?: SystemBodySpec[];
}
//# sourceMappingURL=system-layout.d.ts.map