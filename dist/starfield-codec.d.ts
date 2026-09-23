/** A thing in the sky: a star, or a distant galaxy. */
export interface SkyObject {
    /** Direction from the viewer. Need not be normalised. */
    x: number;
    y: number;
    z: number;
    /** 0…1. Gamma-encoded into 8 bits — see `BRIGHT_GAMMA`. */
    brightness: number;
    /** 0…1 red, green, blue. Nearest-matched to {@link STAR_PALETTE} unless
     * `palette` is set. */
    r: number;
    g: number;
    b: number;
    /**
     * Spectral value 0…1 (O at 0, M at 1) for BRIGHT stars — see
     * {@link spectralValue}. A star's colour FOLLOWS its class, so encoding the
     * class beats nearest-matching a quantised rgb (the latter is what made
     * every star land in the near-white entries). Only stars above
     * {@link BRIGHT_SPECTRAL_FLOOR} carry it — the faint mass renders warm
     * yellow, because that is the one colour a faint star visibly has.
     */
    spectral?: number;
    /**
     * Angular radius as a fraction of `sizeScale`, 0…1. A star is 0 (a point);
     * a distant galaxy is a small disc.
     */
    size?: number;
}
/** `px nx py ny pz nz` — the `CubeTexture` file suffixes, in GL face order. */
export declare const FACE_NAMES: readonly ["px", "nx", "py", "ny", "pz", "nz"];
/**
 * Brightness is stored as `value^GAMMA`, which spends the 8 bits where the eye
 * is rather than where the arithmetic is.
 *
 * Star flux is `10^(-0.4·m)`, so a magnitude range of 1…12 spans 25,000:1.
 * Linear 8-bit would put 254 of its 255 codes in the brightest 1% of that and
 * quantise everything else to nothing. At 0.5 the faintest code lands around
 * 1.5e-5 of full, which covers the range with room to spare.
 */
export declare const BRIGHT_GAMMA = 0.5;
/**
 * `B === 255` marks a PACKED texel: three crude stars instead of one precise
 * one. Precise brightness is therefore capped at 254, which costs the top
 * 0.4% of one channel and buys the dense core.
 */
export declare const PACKED_FLAG = 255;
/**
 * How many objects a packed texel holds. Three, chosen by MEASUREMENT rather
 * than by what fits — the occupancy histogram of a real galaxy is what picked
 * it, and 24 bits happening to divide by three is luck.
 *
 * | cap | kept at 512 | kept at 1024 |
 * | --- | --- | --- |
 * | 1 | 78.8% | 93.0% |
 * | 2 | 93.7% | 99.1% |
 * | **3** | **98.0%** | 99.8% |
 * | 4 | 99.3% | 99.9% |
 *
 * Three is where the curve flattens, and it takes a real galaxy from 21% lost
 * to essentially none.
 *
 * ⚠️ **But packing trades position for capacity, and at 512 that shows.** A
 * packed object keeps only a QUARTER-texel position, and when a texel spans
 * several screen pixels the quantisation becomes a visible lattice through the
 * dense band — measured by looking, not predicted. At 1024 a texel is half as
 * wide and the lattice disappears.
 *
 * So: **1024 is the size to ship** (24 MiB, nothing lost), and 512 is for
 * sparser skies or wider fields of view, where the core never gets close
 * enough to the eye for a quarter of a texel to matter.
 */
export declare const PACKED_CAPACITY = 3;
/**
 * Sixteen colours, one per encoded index. See the spectral-sequence note on
 * the array below — and ⚠️ the shader builds its palette from this array via
 * {@link paletteGlsl}, so there is exactly one copy of these numbers.
 */
export declare const STAR_PALETTE: Array<[number, number, number]>;
export declare const FAINT_A = 1;
export declare const GALAXY_A_BASE = 2;
export declare const SPECTRAL_A_BASE = 32;
/**
 * Stars at or above this brightness carry their spectral value; below it they
 * render warm yellow. Chosen against the real magnitude histogram: the faint
 * mass is K/M floor-clamped and the eye reads those as a warm sprinkle
 * regardless of which of them it is.
 */
export declare const BRIGHT_SPECTRAL_FLOOR = 0.3;
/**
 * Spectral type (`'G2'`, `'M5'`…) → 0…1 along the ramp. The colour FOLLOWS
 * the class. Unknown classes fall back to G.
 */
export declare function spectralValue(spectralType: string): number;
/** Which cube face a direction lands on, and where on it. */
export interface FaceUv {
    /** Index into {@link FACE_NAMES}. */
    face: number;
    /** 0…1 across the face. */
    u: number;
    v: number;
}
/**
 * Direction → face and uv, in the OpenGL cube-map convention.
 *
 * Written out rather than derived, because this is the piece that silently
 * ruins everything if it disagrees with `textureCube` by a sign. The major
 * axis picks the face; the other two become u and v with the signs the spec
 * gives, and both are mapped from −1…1 into 0…1 at the end.
 */
export declare function dirToFace(x: number, y: number, z: number): FaceUv;
/**
 * Face and uv → direction. The exact inverse of {@link dirToFace}, and tested
 * as one: a convention that is only implemented once cannot be checked.
 */
export declare function faceToDir(face: number, u: number, v: number): {
    x: number;
    y: number;
    z: number;
};
/** Nearest entry in {@link STAR_PALETTE}, by squared distance. */
export declare function paletteIndex(r: number, g: number, b: number): number;
export interface EncodedStarfield {
    /** Six `size × size × 4` RGBA faces, in {@link FACE_NAMES} order. */
    faces: Uint8Array[];
    size: number;
    /** How many objects were written. */
    placed: number;
    /** How many were dropped because a brighter one already held the texel. */
    collided: number;
}
export declare function encodeStarfield(objects: SkyObject[], size?: number): EncodedStarfield;
/** Piecewise-linear along the ramp — the same maths the shader runs. */
export declare function spectralRamp(t: number): [number, number, number];
/** The ramp as GLSL — generated, never transcribed. */
export declare function spectralGlsl(): string;
/** One decoded object, as the shader would reconstruct it. */
export interface DecodedObject {
    x: number;
    y: number;
    z: number;
    brightness: number;
    r: number;
    g: number;
    b: number;
    size: number;
}
/**
 * Decode one texel back into the objects it holds — none, one, or up to
 * {@link PACKED_CAPACITY}.
 *
 * Exists so the round trip can be TESTED without a GPU. The shader does the
 * same arithmetic; this is what pins it down, because a decode that only exists
 * in GLSL can only be checked by looking at a sky and deciding it seems fine.
 */
export declare function decodeTexel(faces: Uint8Array[], size: number, face: number, ix: number, iy: number): DecodedObject[];
/**
 * The palette as a GLSL array literal, so the shader and this module cannot
 * drift. Emitted rather than transcribed for the same reason the density field
 * is baked rather than re-implemented.
 */
export declare function paletteGlsl(name?: string): string;
//# sourceMappingURL=starfield-codec.d.ts.map