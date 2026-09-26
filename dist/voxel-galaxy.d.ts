import { type GalaxyOptions, type GalaxyData, type NebulaData, type DistantStarData, type StarData } from './galaxy-data.js';
/**
 * `bright` — global, the stars you see across the galaxy. The DIM stars split in
 * two (star-populations): `interesting` — a planet with HI ≤ 2, generated
 * globally so a habitability search sees every one; `boring` — the rest,
 * generated only locally, as sky texture. Both are VERIFIED with the real HI
 * rules, so membership is exact.
 */
export type Population = 'bright' | 'interesting' | 'boring';
/** One entry of a population's spectral mix. */
export interface MixEntry {
    spectralClass: string;
    /** Inclusive range of spectral index (0 hottest … 9 coolest). */
    minIndex: number;
    maxIndex: number;
    weight: number;
}
export interface VoxelGalaxyOptions {
    seed: number;
    brightBudget?: number;
    dimBudget?: number;
    samples?: number;
    galaxyOptions?: GalaxyOptions;
    nx?: number;
    ny?: number;
    nz?: number;
    halfXY?: number;
    halfZ?: number;
    smoothPasses?: number;
    fringeShare?: number;
    fringeFalloff?: number;
    brightMix?: MixEntry[];
    dimMix?: MixEntry[];
    /**
     * How many nebulae. `-1` (default) keeps the old generator's rule — 15% of
     * the bright budget, at least 50 — so a galaxy's nebulae scale with it.
     */
    nebulaBudget?: number;
}
/** What `view` returns: the `GalaxyData` shape every consumer already reads. */
export interface GalaxyViewOptions {
    /** Gather the dim stars around this point (generator frame). None if omitted. */
    near?: {
        x: number;
        y: number;
        z: number;
    };
    /** How far around `near` to gather dim stars (whole voxels). */
    radius?: number;
    /** Compute every star's best habitability now (slow); else on demand. */
    generatePlanets?: boolean;
}
/** A generated star. `position` is in the generator frame (z-up). */
export interface VoxelStar extends Omit<StarData, 'name' | 'position' | 'bestHI' | 'hiComputed'> {
    /**
     * `seed:population:voxel:n` — the galaxy, the population, the voxel and the
     * star's SEQUENCE number in it (not its seed, which is derived). Permanent,
     * independent of what else is loaded and of the budget. See `starAddress`.
     */
    id: string;
    population: Population;
    voxel: number;
    n: number;
    position: {
        x: number;
        y: number;
        z: number;
    };
    /** Best planet HI — known for `interesting`/`boring` (it was verified). */
    bestHI?: number;
}
type Vec = {
    x: number;
    y: number;
    z: number;
};
/**
 * The default cut: bright is O–G5, dim is G6–M, each keeping `galaxy-data`'s
 * (deliberately top-heavy) weights. G splits by index, so its weight splits
 * 6:4 with it. The cut and the late-M weighting are the dials the design leaves
 * open — "interesting over realistic" (GALAXY-DESIGN.md).
 */
export declare const DEFAULT_BRIGHT_MIX: MixEntry[];
export declare const DEFAULT_DIM_MIX: MixEntry[];
/**
 * A star's ADDRESS — `seed:population:voxel:n`. Everything needed to generate
 * it and nothing derived: the galaxy seed, which population, which voxel, and
 * its sequence number there. Stable for a given grid; the budget does not
 * enter into it (Tonio: a star must be findable in a galaxy computed with a
 * smaller budget).
 */
export declare function starAddress(seed: number, population: Population, voxel: number, n: number): string;
/** The parts of a star address, or `null` if it is not one. */
export declare function parseStarAddress(id: string): {
    seed: number;
    population: Population;
    voxel: number;
    n: number;
} | null;
/**
 * A 32-bit hash of a list of integers (murmur-style mixing + fmix32). Seeds
 * come from here, so they are a function of an ADDRESS rather than a draw
 * from a shared range.
 */
export declare function hash32(...parts: number[]): number;
export interface VoxelGalaxy {
    readonly options: Required<Omit<VoxelGalaxyOptions, 'galaxyOptions'>> & {
        galaxyOptions: GalaxyOptions;
    };
    /** Normalised density per voxel — every entry > 0, summing to 1. */
    readonly density: Float64Array;
    /** Which voxels the sampled galaxy actually occupied (before the fringe). */
    readonly populated: Uint8Array;
    readonly voxelCount: number;
    /** The voxel containing `p`, or -1 outside the grid. */
    voxelOf(p: Vec): number;
    voxelCenter(v: number): Vec;
    /** Expected star count of a voxel's population (budget × density). */
    expectedCount(v: number, population: Population): number;
    /** The stars of one voxel's population. Pure: same answer every call. */
    starsInVoxel(v: number, population: Population): VoxelStar[];
    /** Every voxel's bright stars — the global pass. Memoised. */
    brightStars(): VoxelStar[];
    /**
     * Every INTERESTING star (a planet with HI ≤ 2) — global too, so a
     * habitability search sees them all. Memoised.
     */
    interestingStars(): VoxelStar[];
    /** The voxels whose box comes within `radius` of `p`. */
    voxelsNear(p: Vec, radius: number): number[];
    /**
     * The dim stars (interesting AND boring) of every voxel within `radius` of
     * `p` — WHOLE voxels, so a few may lie slightly beyond `radius`; filter by
     * distance if that matters.
     */
    dimStarsNear(p: Vec, radius: number): VoxelStar[];
    /** The galaxy's nebulae, from their own derived seed. Memoised. */
    nebulae(): NebulaData[];
    /** Other galaxies and dim far-out stars, from their own seed. Memoised. */
    shell(): {
        distantGalaxies: NebulaData[];
        distantStars: DistantStarData[];
    };
    /**
     * THE view every consumer reads — `GalaxyData`, as `generateGalaxy` returned
     * it: every bright and every interesting star, the boring stars near `near`, the nebulae (with the
     * distant galaxies appended, as before) and the shell. Stars carry `id` and a
     * name derived from their seed, and are sorted by name.
     */
    view(options?: GalaxyViewOptions): GalaxyData;
    /**
     * ONE star by its address (`seed:population:voxel:n`), generated on its
     * own — one star, not a voxel or a galaxy. It resolves even when `n` is
     * beyond what THIS galaxy's budget shows (star n never depends on the
     * count). `null` if malformed, or for another galaxy's seed.
     */
    star(id: string): StarData | null;
}
export declare function voxelGalaxy(options: VoxelGalaxyOptions): VoxelGalaxy;
export {};
//# sourceMappingURL=voxel-galaxy.d.ts.map