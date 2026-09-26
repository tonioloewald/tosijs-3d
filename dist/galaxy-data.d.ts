import { PRNG, type RandomLike } from './mersenne-twister.js';
import { SPECTRAL_CLASSES, SPECTRAL_WEIGHTS } from './spectral-classes.js';
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
    /**
     * The star's ADDRESS in the voxel galaxy (`seed:population:voxel:n`) — stable,
     * unlike an array index. Present on every star a voxel galaxy produces.
     */
    id?: string;
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
export { SPECTRAL_CLASSES, SPECTRAL_WEIGHTS };
/**
 * Everything a star's CLASS implies, drawn from `prng` in a fixed order.
 *
 * Split out of `generateStarDetail` so a generator that chooses the class
 * itself (the voxel galaxy picks from a bright or a dim mix) shares the one
 * definition instead of a copy. The draw order is unchanged, so every existing
 * galaxy is byte-identical (galaxy-data.test pins it by digest).
 */
export declare function starDetailFor(prng: RandomLike, seed: number, spectralClass: string, spectralIndex: number): Omit<StarData, 'name' | 'position' | 'bestHI'>;
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
export declare const GALAXY_DEFAULTS: Required<GalaxyOptions>;
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
/**
 * A star's NAME, a pure function of its seed — the same derivation the old
 * generator used, shared so every galaxy names a given seed the same way.
 */
export declare function starNameFor(seed: number): string;
/** The spiral model's derived constants — one place, shared by every draw. */
export interface SpiralParams {
    spiralArms: number;
    minRadius: number;
    maxRadius: number;
    thickness: number;
    scatterTheta: number;
    scatterRadius: number;
    spiralB: number;
}
export declare function spiralParams(opts: Required<GalaxyOptions>): SpiralParams;
/**
 * `n` positions drawn from the spiral model — POSITIONS ONLY: no names, no
 * star details beyond the one bit that picks arm or disc. This is what the
 * voxel galaxy's density grid is sampled from (GALAXY-DESIGN.md →
 * "Reconciliation"): the MODEL survives, the sequential generator does not.
 *
 * It consumes exactly the draws the old star loop did, so a density sampled
 * here is byte-identical to one sampled from `generateGalaxy`'s stars.
 */
export declare function sampleSpiral(seed: number, n: number, options?: GalaxyOptions): Array<{
    x: number;
    y: number;
    z: number;
}>;
/**
 * @deprecated Use `voxelGalaxy({ seed, brightBudget }).view()`. Removed in 0.9.
 *
 * ONE GALAXY (GALAXY-DESIGN.md → "Reconciliation"). This used to be its own
 * generator: one sequential random stream producing the stars, then the
 * nebulae, then the distant shell, so nothing could be generated locally and
 * 63% of stars shared a seed with another. It is now an ADAPTER over the voxel
 * galaxy: `numberOfStars` is the BRIGHT budget, and the result is that
 * galaxy's `view()` (every bright star, its nebulae and shell) in the shape
 * this function always returned. The spiral model it was built on survives as
 * `sampleSpiral`, which is what the voxel galaxy's density is sampled from.
 *
 * A given seed therefore produces a DIFFERENT galaxy from 0.8.3's: same
 * shape and distributions, different stars.
 */
export declare function generateGalaxy(seed: number, numberOfStars: number, options?: GalaxyOptions): GalaxyData;
/**
 * The galaxy's NEBULAE on the spiral model, drawn from `prng`. Split out so the
 * voxel galaxy draws them from its own derived seed (GALAXY-DESIGN.md →
 * "Reconciliation") while the old stream keeps its order.
 */
export declare function generateNebulae(prng: PRNG, nebulaCount: number, sp: SpiralParams): {
    nebulae: NebulaData[];
    densityScale: number;
};
/**
 * The DISTANT SHELL — other galaxies and dim far-out stars, isotropic, outside
 * the disc. Drawn from `prng`, like `generateNebulae`.
 */
export declare function generateShell(prng: PRNG, galaxyBudget: number, starBudget: number, sp: SpiralParams, densityScale: number): {
    distantGalaxies: NebulaData[];
    distantStars: DistantStarData[];
};
//# sourceMappingURL=galaxy-data.d.ts.map