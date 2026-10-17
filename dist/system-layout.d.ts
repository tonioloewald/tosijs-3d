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
    /** Its moons' periods in Earth days (negative backwards), when known. */
    moonDays?: number[];
}
export interface MoonLayout {
    seed: number;
    radiusKm: number;
    /** Drawn radius, scene units. */
    visualRadius: number;
    /** From the planet's centre, scene units. */
    distance: number;
    /** Seconds to go round its planet; negative goes round backwards (Triton). */
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
    /** Seconds for a planet at 1 AU to go round. Default: the Earth's year. */
    year?: number;
    /**
     * The belt's big bodies' radii in km, when they are known (Ceres, Vesta,
     * …): it then always has a belt before the first giant, with these.
     */
    belt?: number[];
}
/** Seconds in an Earth day (a solar day: periods in days are multiplied by it). */
export declare const DAY_SECONDS = 86400;
/** Seconds in an Earth year (sidereal). */
export declare const YEAR_SECONDS: number;
/**
 * How far round a body has turned (radians, west to east) after `time`
 * seconds, for a day `day` Earth days long: negative turns backwards, 0 does
 * not turn.
 */
export declare function spinAngle(time: number, day: number): number;
/**
 * Seconds for a moon `radii` planet radii out to go round, by Kepler. The
 * planet's size cancels: only its density is left (a rock's 5.5 g/cm³, a
 * giant's 1.3), so the Moon at 60 Earth radii takes 27 days and Io at 5.9
 * Jupiter radii 1.8.
 */
export declare function moonPeriod(radii: number, giant: boolean): number;
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
    /**
     * A moon's month in Earth days (sidereal); negative goes round backwards
     * (Triton). Default: Kepler from where it is drawn.
     */
    period?: number;
    look: Record<string, unknown>;
    maps?: Record<string, unknown>;
    /**
     * A moon's orbit, degrees from its star's ecliptic. Default: its planet's
     * `tilt`, so it orbits the planet's equator, as regular moons do
     * (Jupiter's, Saturn's, Uranus'). Our Moon is the exception: 5.1.
     */
    inclination?: number;
}
export interface SystemPlanetSpec extends SystemBodySpec {
    /** AU from the star. */
    au: number;
    /**
     * How long its day is, in Earth days (sidereal); negative turns it
     * backwards (Venus, Uranus). Default: 1 for a rock, 0.42 for a giant.
     */
    day?: number;
    /**
     * Axial tilt in degrees: how far its axis leans from upright against its
     * orbit (Earth 23.4, Saturn 26.7). The axis stays fixed in space as it
     * goes round, so seasons and a ring's shadow on its planet come and go
     * with the year. Its moons orbit in the tilted equator. A backwards day
     * (negative `day`) already turns it the other way, so Venus and Uranus
     * take 2.6 and 82.2, not 177.4 and 97.8. Default 0.
     */
    tilt?: number;
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