import { type MeshPart } from './proxy-rigid.js';
import { type UnwrapOptions } from './uv-unwrap.js';
/** A mesh as triangles: positions (xyz), optional normals and UVs. */
export interface GarmentMesh {
    positions: Float32Array;
    triangles: Uint32Array;
    normals?: Float32Array | null;
    uvs?: Float32Array | null;
    /** The objects it was made of, as vertex runs, with their rigidity. */
    parts?: MeshPart[] | null;
    /** Each vertex's own rigidity (a `_rigid` attribute or paint), NaN where none. */
    rigid?: Float32Array | null;
}
/**
 * A garment with UVs worked out from its shape ([uv-unwrap](/uv-unwrap/)):
 * cut along the planes between left and right and between front and back,
 * each piece flattened, packed into the unit square. Normals are carried
 * across the seams, so the shading does not break there. A garment of
 * several parts keeps its own UVs (each part is the artist's).
 */
export declare function unwrapGarment(g: GarmentMesh, options?: UnwrapOptions): GarmentMesh;
/**
 * The rigid groups of a garment read from a file, for `bindGarment`
 * ([proxy-rigid](/proxy-rigid/)), or null when nothing is rigid.
 */
export declare function garmentRigidity(garment: GarmentMesh): Omit<import("./proxy-rigid.js").RigidParts, "rest"> | null;
/**
 * The body helper's name, carrying the metadata for files that lose the rest
 * (an OBJ through Blender, a glTF without custom properties):
 * `body-reference_hm08_p15_weight72_muscle100`. The base, the pack version,
 * then each slider that is not the default as a whole percentage.
 */
export declare function referenceName(meta: GarmentMeta): string;
/** The metadata a body helper's name carries, or null when it carries none. */
export declare function metaFromName(name: string): GarmentMeta | null;
/** What a garment was made on and for. */
export interface GarmentMeta {
    format: 'tosijs-garment';
    version: 1;
    /** MakeHuman's base body (`hm08`); absent for a mesh's body. */
    base?: string;
    /**
     * The mesh's body it was made on (the builder's source name), when it was
     * not MakeHuman's: it is worn on that body only.
     */
    source?: string;
    /** The human pack's version. */
    pack?: number;
    /** The body's slider values (`MacroBody`), to rebuild the shape it was made on. */
    body?: Record<string, number>;
    name?: string;
    slot?: string;
    /** The outline it was cut from (garment-cut), to edit it again. */
    cut?: {
        shapes: unknown;
        thickness: number;
    };
    /** How it was worn when saved: a fabric preset, a colour, the recolour. */
    look?: {
        fabric?: string;
        colour?: string;
        recolour?: number;
    };
}
/** An image as it sits in the file: its bytes and type (`image/png`). */
export interface GarmentImage {
    bytes: Uint8Array;
    mimeType: string;
}
/**
 * A garment's surface, as glTF's metallic-roughness material: what Blender's
 * Principled BSDF exports. Colours are linear; each map is optional.
 */
export interface GarmentMaterial {
    name?: string;
    /** Linear RGBA, multiplying the base colour map. */
    baseColor?: [number, number, number, number];
    /** The diffuse map; its alpha is the garment's alpha. */
    baseColorTexture?: GarmentImage | null;
    /** A tangent-space normal map (OpenGL convention, as glTF has it). */
    normalTexture?: GarmentImage | null;
    normalScale?: number;
    /** Roughness in green, metalness in blue (glTF's packing). */
    metallicRoughnessTexture?: GarmentImage | null;
    roughness?: number;
    metallic?: number;
    /** OPAQUE, MASK (cut out at `alphaCutoff`) or BLEND. */
    alphaMode?: 'OPAQUE' | 'MASK' | 'BLEND';
    alphaCutoff?: number;
    doubleSided?: boolean;
}
export interface GarmentFileContent {
    garment: GarmentMesh;
    /** Null when the file carried none (an OBJ, or Blender without custom properties). */
    meta: GarmentMeta | null;
    /**
     * The garment's material, from a GLB (null from an OBJ, or with none). Where
     * its parts have several, the first part's.
     */
    material?: GarmentMaterial | null;
    /** How many different materials the garment's parts use. */
    materialCount?: number;
}
/**
 * A GLB with the garment and the body it was made on, or the body alone
 * (no `garment`) to model a garment from nothing.
 */
export declare function writeGarmentGlb(options: {
    garment?: GarmentMesh | null;
    body?: GarmentMesh | null;
    meta: GarmentMeta;
    /** sRGB colours for the two materials, so the file reads in an editor. */
    colour?: [number, number, number];
    /** The garment's material, maps and all (it replaces `colour`). */
    material?: GarmentMaterial | null;
}): Uint8Array;
/** An OBJ with `o garment` and `o body-reference`; the metadata in a comment. */
export declare function writeGarmentObj(options: {
    garment?: GarmentMesh | null;
    body?: GarmentMesh | null;
    meta: GarmentMeta;
}): string;
/** Read a garment from a GLB or an OBJ (told apart by the GLB's magic number). */
export declare function readGarment(data: ArrayBuffer | Uint8Array | string): GarmentFileContent;
//# sourceMappingURL=garment-file.d.ts.map