/** x, y, z. */
export type GlbVec3 = readonly [number, number, number];
/** x, y, z, w. */
export type GlbQuat = readonly [number, number, number, number];
export interface GlbJoint {
    name: string;
    /** Index of the parent in `joints`, or -1 for a top-level joint. */
    parent: number;
    translation: GlbVec3;
    rotation: GlbQuat;
}
export interface GlbMorph {
    /** xyz delta per vertex. */
    positions: Float32Array;
}
export interface GlbPrimitive {
    positions: Float32Array;
    normals: Float32Array;
    /** glTF's convention (v down from the top of the image), or omitted. */
    uvs?: Float32Array | null;
    /**
     * Vertex colours (linear, RGB or RGBA per vertex) written as `COLOR_0`,
     * which glTF multiplies into the base colour: how a skin's lips and stubble
     * travel with no texture (see skin-paint). Or omitted.
     */
    colors?: Float32Array | null;
    /** Four joint indices (into `joints`) per vertex. */
    joints: ArrayLike<number>;
    /** Four weights per vertex. */
    weights: ArrayLike<number>;
    /** Triangles, counter-clockwise from outside. */
    indices: ArrayLike<number>;
    /** Index into `materials`. */
    material: number;
    /** One per entry of the mesh's `targetNames`. */
    targets?: GlbMorph[];
}
export interface GlbMesh {
    name: string;
    primitives: GlbPrimitive[];
    /** The morph targets' names, one per target (every primitive has them all). */
    targetNames?: string[];
}
export interface GlbTexture {
    /** Index into `images`. */
    image: number;
}
export interface GlbMaterial {
    name: string;
    baseColorFactor: readonly [number, number, number, number];
    baseColorTexture?: GlbTexture;
    metallicFactor: number;
    roughnessFactor: number;
    metallicRoughnessTexture?: GlbTexture;
    normalTexture?: GlbTexture & {
        scale: number;
    };
    occlusionTexture?: GlbTexture & {
        strength: number;
    };
    /** Linear RGB light the surface gives off (glTF's default is none). */
    emissiveFactor?: readonly [number, number, number];
    emissiveTexture?: GlbTexture;
    alphaMode: 'OPAQUE' | 'MASK' | 'BLEND';
    alphaCutoff?: number;
    doubleSided: boolean;
    sheen?: {
        colorFactor: readonly [number, number, number];
        roughnessFactor: number;
    };
}
export interface GlbImage {
    name: string;
    mimeType: 'image/png' | 'image/jpeg';
    bytes: Uint8Array;
}
export interface SkinnedGlb {
    asset: {
        generator: string;
        copyright?: string;
        extras?: Record<string, unknown>;
    };
    /** The skeleton. */
    joints: GlbJoint[];
    /** The skin's name. */
    skinName: string;
    /** Index into `joints` of the skin's `skeleton` (its common root). */
    skeletonRoot: number;
    /** 16 column-major numbers per joint. */
    inverseBindMatrices: Float32Array;
    meshes: GlbMesh[];
    materials: GlbMaterial[];
    images: GlbImage[];
    /**
     * Root-level extensions, written as given and listed in `extensionsUsed`
     * (never required). Node indices in them are the joints' (`0..n-1`).
     */
    extensions?: Record<string, unknown>;
}
/** Unit normals, float32; a zero or non-finite one becomes +Y. */
export declare function unitNormals(normals: ArrayLike<number>): Float32Array;
/**
 * Four influences per vertex as glTF wants them: duplicate joints merged,
 * negative or non-finite weights dropped, the rest renormalised so the
 * float32 sum is 1 (the remainder goes to the largest), unused slots joint 0
 * weight 0. A vertex with no weight at all is given to `fallback` wholly.
 */
export declare function normaliseInfluences(joints: ArrayLike<number>, weights: ArrayLike<number>, fallback?: number): {
    joints: Uint8Array | Uint16Array;
    weights: Float32Array;
    maxJoint: number;
};
/** The GLB's bytes. Throws on input glTF could not represent. */
export declare function writeSkinnedGlb(g: SkinnedGlb): Uint8Array;
//# sourceMappingURL=skinned-glb.d.ts.map