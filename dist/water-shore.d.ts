/** Depths are clamped to this range (metres; negative = ground above water). */
export declare const SHORE_DEPTH_MIN = -4;
export declare const SHORE_DEPTH_MAX = 60;
/**
 * The positions of a shore grid's lines along one axis, from `-size / 2` to
 * `size / 2`. The middle `core` steps each side are `fine` apart; the rest
 * grow geometrically to reach the edge exactly. `steps` is per side, so there
 * are `2 * steps + 1` lines. When the whole span fits at `fine`, it is uniform.
 */
export declare function shoreGridLines(size: number, steps?: number, fine?: number, core?: number): number[];
export interface ShoreGrid {
    /** xyz per vertex, y = 0. */
    positions: Float32Array;
    /** One (0, 1, 0) per vertex. */
    normals: Float32Array;
    /** The same mapping a plain ground of this size has: 0…1 across it. */
    uvs: Float32Array;
    /** Triangles, wound for Babylon's ground (front face up). */
    indices: Uint32Array;
    /** Lines per axis. */
    count: number;
    /** The line positions, for sampling the terrain at each vertex. */
    lines: number[];
}
/** The mesh data for a shore grid over a square `size` across. */
export declare function shoreGrid(size: number, steps?: number, fine?: number, core?: number): ShoreGrid;
/**
 * Temperature at and above which the sea never freezes: -2 °C, where 0 is
 * 0 °C and a unit is 50 °C (biome-chart's scale). Every temperature in this
 * module is on that scale.
 */
export declare const FREEZING = -0.04;
/**
 * How much of the water is ice, 0 (open) … 1 (a solid sheet), from the
 * temperature at the surface and the depth of the water (metres; anything at
 * or above the waterline counts as the shore itself).
 *
 * Shallows freeze first: at a given cold the cover is highest at the beach and
 * falls away with depth, so the sheet, the broken plates and the open water
 * lie in that order going out from land. Colder pushes all three outward.
 */
export declare function iceCover(temperature: number, depth: number): number;
/**
 * How far past a full sheet the ice is, 0…1: at 0 the sheet still shows the
 * hairline cracks where its plates met; at 1 it is one unbroken surface. Only
 * real cold gets there, and the shallows get there first.
 */
export declare function iceSolid(temperature: number, depth: number): number;
/** How solid (`iceSolid`) the ice must be before it carries someone. */
export declare const ICE_BEARS = 0.5;
/**
 * Whether the ice here carries weight. Only ice that has knitted solid does:
 * a sheet that still shows its cracks, and broken plates, are water with ice
 * floating in it, so you fall through and swim.
 */
export declare function iceBears(temperature: number, depth: number): boolean;
/** Which side of bearing ice a body is on; `none` where the ice does not bear. */
export type IceSide = 'none' | 'over' | 'under';
/**
 * Which side of the ice a body is on this frame, from the side it was on.
 * `rootDepth` is how far its root is below the water's surface (metres).
 *
 * The side is decided ONCE, where the body meets bearing ice, and then kept:
 * at or near the surface it climbs on top, properly under it stays under and
 * the ice is a ceiling. Deciding it from the position every frame cannot work,
 * because a swimmer held against the underside is as close to the surface as
 * one about to climb out. From under, the only way up is to stand in water
 * shallow enough to step out of (`stepUp`).
 */
export declare function iceSide(prev: IceSide, bears: boolean, rootDepth: number, swimming: boolean, stepUp?: number, reach?: number): IceSide;
/** Distances from the shore are clamped to this many metres either way. */
export declare const SHORE_DISTANCE_MAX = 40;
/**
 * Fill a grid's shore data: for each vertex, `[depth, ice, solid, distance]`
 * (the water shader reads these from the vertex colour). `height(x, z)` is the
 * terrain in the same coordinates as `centreX/centreZ + line`; `waterY` is the
 * surface.
 *
 * `distance` is how far the vertex is from the waterline, in metres along the
 * surface: positive out to sea, negative inland. Surf is drawn from this and
 * not from depth, because a depth says nothing about width: half a metre deep
 * is a ten-metre band on a flat and a hand's width under a cliff, and the mesh
 * cannot draw a hand's width.
 *
 * It is a real distance, not depth over slope. Every vertex beside the
 * waterline is given how far away the line is (where the depth crosses zero
 * along the grid, or depth over slope if that is nearer), and those distances
 * are then carried outward across the grid. So it grows a metre per metre
 * everywhere, and lines drawn at even distances are evenly spaced whatever the
 * bed does under them. Depth over slope alone does not: on a flat shallow it
 * swings wildly from vertex to vertex.
 */
export declare function shoreData(grid: {
    lines: number[];
    count: number;
}, centreX: number, centreZ: number, waterY: number, height: (x: number, z: number) => number, temperature: number, out?: Float32Array, 
/** The mesh is turned over about X (the water's underside): its local +z
 * lies along world -z. */
flipZ?: boolean): Float32Array;
//# sourceMappingURL=water-shore.d.ts.map