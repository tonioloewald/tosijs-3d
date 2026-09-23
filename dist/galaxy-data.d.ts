import { PRNG, type RandomLike } from './mersenne-twister.js';
export declare function capitalize(s: string): string;
export declare function romanNumeral(n: number): string;
export declare function randomName(prng: RandomLike, numberOfSyllables: number, allowSecondName?: boolean, allowSecondary?: boolean): string;
export interface StarTypeInfo {
    luminosity: number;
    color: string;
    rgb: [number, number, number];
    planets: [number, number];
    mass: number;
    lifespan: number;
    inSpiralArm: number;
}
export declare const starTypeData: Record<string, StarTypeInfo>;
type AtmosphereType = 'Breathable' | 'Filterable' | 'Inert' | 'Corrosive' | 'Toxic' | 'Trace' | 'Crushing';
interface PlanetTemplate {
    classification: string;
    radius: [number, number];
    density: [number, number];
    hydrographics: (prng: PRNG, insolation: number, radius: number, density: number) => number;
    atmosphere: (prng: PRNG, insolation: number, radius: number, density: number, hydrographics: number) => AtmosphereType;
}
declare const planetTypeData: PlanetTemplate[];
export { planetTypeData };
export interface StarData {
    name: string;
    seed: number;
    position: {
        x: number;
        y: number;
        z: number;
    };
    spectralType: string;
    spectralClass: string;
    spectralIndex: number;
    luminosity: number;
    mass: number;
    numberOfPlanets: number;
    planetSeed: number;
    rgb: [number, number, number];
    color: string;
    inSpiralArm: boolean;
    lifespan: number;
    scale: number;
    /**
     * Best habitability index of the system, 1 (earthlike) … 5 (inimical).
     * `5` until computed — bulk generation skips planets (see
     * `GalaxyOptions.generatePlanets`), so consumers that need a real value
     * call {@link generateStarSystem} and cache the result here.
     */
    bestHI: number;
    /** Set once `bestHI` has been computed on demand. */
    hiComputed?: boolean;
}
export interface PlanetData {
    name: string;
    seed: number;
    orbitalRadius: number;
    insolation: number;
    classification: string;
    radius: number;
    density: number;
    hydrographics: number;
    atmosphere: string;
    HI: number;
    description: string;
    g: string;
    albedo: number;
    tempC: string;
    temp: string;
    rings: number;
}
export interface StarSystemData {
    star: StarData;
    planets: PlanetData[];
}
export declare function generateStarSystem(star: StarData): StarSystemData;
export interface GalaxyOptions {
    spiralArms?: number;
    spiralAngleDegrees?: number;
    minRadius?: number;
    maxRadius?: number;
    thickness?: number;
    /**
     * How many external galaxies to scatter isotropically OUTSIDE the disc.
     *
     * A budget of its own rather than a fraction of `numberOfStars`, because the
     * emptiness it fills is a property of the SKY and not of how dense this
     * galaxy happens to be.
     */
    distantGalaxies?: number;
    /**
     * Dim far-out STARS scattered isotropically outside the disc — the
     * "something in the empty areas" budget, same idea as `distantGalaxies`
     * but for points. A budget of its own, because the emptiness it fills is
     * a property of the SKY and not of how dense this galaxy happens to be.
     */
    distantStars?: number;
    /**
     * Whether to generate full planet systems and `bestHI` per star — OFF by
     * default, because planets are a FILTERING concern, not a galaxy one.
     * Measured at 100k stars they are 71% of generation time (and each star
     * plus each planet constructs its own Mersenne Twister). Compute them on
     * demand with {@link generateStarSystem} instead — it is pure and seeded
     * from `StarData.planetSeed`, so the result is identical either way.
     */
    generatePlanets?: boolean;
}
/** A dim far-out star: a point, nothing more. */
export interface DistantStarData {
    position: {
        x: number;
        y: number;
        z: number;
    };
    /** World size — the baker reads brightness from it. */
    scale: number;
    rgb: [number, number, number];
}
export interface NebulaData {
    position: {
        x: number;
        y: number;
        z: number;
    };
    scale: number;
    rgb: [number, number, number];
    type: 'emission' | 'dark';
    opacity: number;
}
export interface GalaxyData {
    stars: StarData[];
    nebulae: NebulaData[];
    /**
     * The external galaxies, ALSO present in `nebulae` — they are appended there
     * on purpose, because the emission path already draws exactly this and a
     * whole rendering path is saved by placing them differently rather than by
     * inventing one. Kept separately here so a consumer that must tell them
     * apart (the skybox baker) does not have to guess by size or colour.
     */
    distantGalaxies: NebulaData[];
    /**
     * The dim far-out stars, like `distantGalaxies` but points. Not part of
     * `stars` — they have no name, no spectral type, no system; they exist to
     * keep the empty regions of a sky from reading as blank.
     */
    distantStars: DistantStarData[];
    seed: number;
    options: Required<GalaxyOptions>;
}
export declare function generateGalaxy(seed: number, numberOfStars: number, options?: GalaxyOptions): GalaxyData;
//# sourceMappingURL=galaxy-data.d.ts.map