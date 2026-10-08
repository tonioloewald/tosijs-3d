export interface RockOptions {
    seed?: number;
    /** Subdivisions of the starting icosahedron: 1 = 42 vertices, 2 = 162, 3 = 642. */
    detail?: number;
    /** How many planes cut the sphere. */
    cuts?: number;
    /** Noise depth, as a fraction of the radius. */
    roughness?: number;
    /** Height relative to width. */
    squash?: number;
    /** Fraction of the height below `y = 0`. */
    sink?: number;
}
export interface RockGeometry {
    positions: Float32Array;
    normals: Float32Array;
    indices: Uint16Array;
    /** Model-space bounds. */
    min: [number, number, number];
    max: [number, number, number];
}
/** One seeded rock. Pure: no engine, no clock, no `Math.random`. */
export declare function rockGeometry(opts?: RockOptions): RockGeometry;
/** The shapes a scatter rule can ask for by name. */
export declare const ROCK_KINDS: Record<string, RockOptions>;
/**
 * Read a model name of the form `rock:<kind>:<n>` (what a scatter rule lists).
 * Returns the options for that rock, or `null` when the name is something else.
 */
export declare function rockFromName(name: string): RockOptions | null;
/** `rockNames('boulder', 6)` → `['rock:boulder:1', … 'rock:boulder:6']`. */
export declare function rockNames(kind: string, count: number): string[];
//# sourceMappingURL=procedural-rock.d.ts.map