import type { HumanPackManifest } from './human-pack.js';
import { type HeadLandmarks, type ShellWarp } from './hair-fit.js';
/** The geometry of one mesh of a piece: vertices in the file's frame, its triangles. */
export interface HairShape {
    positions: Float32Array;
    indices: Uint32Array;
}
/** A mesh of a piece as `readHairLibrary` reads it: its uvs (glTF's, v down) and its material's name too. */
export interface HairFilePart extends HairShape {
    uvs?: Float32Array;
    material?: string;
}
/** A piece of a hair library: a hairstyle, a beard, a pair of brows. */
export interface HairPiece {
    name: string;
    /** `hair` or `eyebrows` (from the node's glTF extras). */
    category: string;
    parts: HairFilePart[];
}
/**
 * The pieces in Quaternius' hair library (`quaternius/libraries/hairstyles.glb`,
 * version 2), by category, so a character can offer them as choices before
 * the 13.9 MB library is fetched (it loads when one is first worn). A test
 * checks this list against the library itself.
 */
export declare const QUATERNIUS_HAIR: Readonly<Record<'hair' | 'eyebrows', readonly string[]>>;
/**
Quaternius' two adult heads, which its hairstyles were modelled on (the men's
on one, the women's on the other), and where their eyes are (measured from
their eyeball meshes).
*/
export declare const QUATERNIUS_HEADS: Readonly<Record<string, HeadLandmarks>>;
/** Pieces that grow on the face, not the scalp. */
export declare const FACIAL_HAIR: RegExp;
/** Which warp a piece goes through: `face` for brows and beards, else `scalp`. */
export declare function hairFitFor(name: string, category: string): 'scalp' | 'face';
/** A head a library was modelled on. */
export interface ReferenceHead {
    name: string;
    skin: Float32Array;
    /** Its skin's outward normals. */
    normals: Float32Array;
    landmarks: HeadLandmarks;
    /**
     * The top of its upper lip, where its moustache's lower edge lies (the
     * middle of that edge), if the library has a moustache for this head.
     */
    lip?: {
        y: number;
        z: number;
    };
}
/** A brow piece's triangles without its lash strips. */
export declare function withoutLashes(part: HairShape): Uint32Array;
/**
How closely a piece hugs a head, lower is closer: the mean distance from that
head's skin of the nearer half of a sample of its vertices (long strands are
the far half), plus a penalty for vertices deep inside it. A style sits on the
head it was made for and floats off, or sinks into, the other.
*/
export declare function hairHug(parts: HairShape[], head: ReferenceHead): number;
/** The head a piece was modelled on: the one it hugs closest. */
export declare function closestHead(parts: HairShape[], heads: readonly ReferenceHead[]): ReferenceHead;
/**
 * Where a moustache's lower edge is (its middle, within a centimetre of
 * x = 0): the top of the upper lip of the head it was made for.
 */
export declare function moustacheLip(part: HairShape): {
    y: number;
    z: number;
} | null;
/**
 * A hair library GLB, read with no engine: each top-level node a piece (its
 * extras' `category`, else `eyebrows` by name, else `hair`), each of its
 * meshes' vertices in the file's frame. Brows lose their lash strips, as
 * human-hair's loader does.
 */
export declare function readHairLibrary(bytes: Uint8Array): HairPiece[];
/** A hair material's pictures, as bytes: what an export writes. */
export interface HairMaterialData {
    baseColor: {
        bytes: Uint8Array;
        mimeType: string;
    } | null;
    normal: {
        bytes: Uint8Array;
        mimeType: string;
    } | null;
    roughness: number;
    alphaMode: 'OPAQUE' | 'MASK' | 'BLEND';
    alphaCutoff: number;
}
/** A hair library's materials by name, their pictures as bytes, with no engine. */
export declare function readHairMaterials(bytes: Uint8Array): Record<string, HairMaterialData>;
/**
 * The heads a library was modelled on, taken out of its pieces (by node name,
 * `heads` saying where their eyes are), each with its lip line from the
 * library's moustache where it has one.
 */
export declare function referenceHeads(pieces: HairPiece[], options?: {
    heads?: Record<string, HeadLandmarks>;
    /** The piece whose lower edge marks the lip line. */
    moustache?: string;
}): ReferenceHead[];
/** A body's head, measured for hair: its skin, and warps onto it from library heads. */
export interface HeadScalp {
    /** The head's skin points (xyz, the pack's frame) and their normals. */
    skin: Float32Array;
    normals: Float32Array;
    /** Where this head's eyes are. */
    landmarks: HeadLandmarks;
    /**
     * Where the brows' middle belongs (y), from the eyes: about 2.5 cm above
     * the eyeballs' centres. Quaternius' stylised heads carry theirs barely
     * 1 cm above much bigger eyes, so a skin-to-skin warp lays them on the lid.
     */
    brow: number;
    /** The top of the upper lip (y), from the pack's `lips` region, if given. */
    lipTop: number | null;
    /** The skull's middle, which a hair `nudge` scales about. */
    centre: {
        x: number;
        y: number;
        z: number;
    };
    /**
     * A library head's `scalp` or `face` warped onto this one, skin to skin
     * (worked out once per head and region). A face is shaped independently of
     * the skull, so the two are separate.
     */
    warp(head: ReferenceHead, region: 'scalp' | 'face'): ShellWarp;
}
/**
 * Measure a morphed body's head (`positions` every pack vertex, `triangles`
 * the body's). The regions are found from the eyes on both heads, so any
 * size works.
 */
export declare function headScalp(manifest: HumanPackManifest, positions: ArrayLike<number>, triangles: ArrayLike<number>, options?: {
    /** The pack's `lips` region, so a moustache sits above the lip. */
    lips?: ArrayLike<number> | null;
}): HeadScalp;
export interface HairPlacement {
    /** Skin clearance in metres (default 2 mm), a guard where the warp is short. */
    margin?: number;
    /** `face` for brows and beards (the face's warp), else the scalp's. */
    on?: 'scalp' | 'face';
    /** The library head the piece was modelled on (`closestHead`, or `library.headFor(name)`). */
    head: ReferenceHead;
    /** Move the piece up or down so its middle is at this height (`head.brow`). */
    centreY?: number;
    /**
     * A hand adjustment after the fit, for whoever is making the character:
     * metres up (`y`) and forward (`z`), and a `scale` about the skull's middle.
     */
    nudge?: {
        y?: number;
        z?: number;
        scale?: number;
    };
}
/** A part's vertices placed on a body's head (the pack's frame). */
export declare function placeHair(head: HeadScalp, part: HairShape, options: HairPlacement): Float32Array;
//# sourceMappingURL=hair-place.d.ts.map