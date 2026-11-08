import { type BodySurface, type BodyTriangles, type SurfaceMaterial } from './rigged-body.js';
/** A texture a material uses: its picture's bytes (or its URI), and which uvs. */
export interface GltfTextureRef {
    /** The image's bytes, when the file holds them (a buffer view or a `data:` URI). */
    bytes?: Uint8Array;
    mimeType?: string;
    /** An external image, not read. */
    uri?: string;
    /** Which uv set (`TEXCOORD_n`) it reads. */
    texCoord: number;
}
/** A glTF material as data: what a surface of a file read by `glbRigTriangles` carries. */
export interface GltfSurfaceMaterial extends SurfaceMaterial {
    readonly name: string;
    baseColorFactor: [number, number, number, number];
    metallicFactor: number;
    roughnessFactor: number;
    emissiveFactor: [number, number, number];
    alphaMode: 'OPAQUE' | 'MASK' | 'BLEND';
    alphaCutoff: number;
    doubleSided: boolean;
    baseColorTexture?: GltfTextureRef;
    metallicRoughnessTexture?: GltfTextureRef;
    normalTexture?: GltfTextureRef & {
        scale: number;
    };
    occlusionTexture?: GltfTextureRef & {
        strength: number;
    };
    emissiveTexture?: GltfTextureRef;
}
export interface GlbRigOptions {
    /** One node to take, with its children (a library holds many characters). */
    pick?: string;
}
/**
 * Where a node is, in the frame `glbRigTriangles` gives with the same
 * `pick`: an item's `_grip` (say `Pistol_grip` in a library with
 * `pick: 'Pistol.model'`). Null when the file has no such node.
 */
export declare function glbNodePosition(bytes: Uint8Array, name: string, options?: {
    pick?: string;
}): {
    x: number;
    y: number;
    z: number;
} | null;
/**
 * A GLB's triangles for rigging, with no engine: the file's frame, skinned
 * meshes at rest, one surface per material (its glTF material as data,
 * images as bytes), eyes split out. `pick` takes one node and its children.
 * Throws when the file is not a GLB, has no triangles, or `pick` names
 * nothing in it.
 */
export declare function glbRigTriangles(bytes: Uint8Array, options?: GlbRigOptions): BodyTriangles & {
    surfaces?: Array<BodySurface & {
        material?: GltfSurfaceMaterial;
    }>;
};
//# sourceMappingURL=glb-rig.d.ts.map