/** glTF JSON, as parsed: readers look at the fields they need. */
export type GltfJson = Record<string, any>;
/** A GLB split into its JSON and (optional) binary chunk. */
export interface Glb {
    json: any;
    bin: Uint8Array | null;
}
/** 'glTF', little-endian: the first four bytes of every GLB. */
export declare const GLB_MAGIC = 1179937895;
/** Split a GLB into its JSON and binary chunk. Throws when it is not one. */
export declare function readGlb(bytes: Uint8Array): Glb;
/**
 * A GLB from JSON and a binary chunk, padded as the spec says. A null or
 * empty binary chunk is left out.
 */
export declare function writeGlb(json: unknown, bin: Uint8Array | null): Uint8Array;
/** A buffer view as `BinBuilder` writes it. */
export interface BinView {
    buffer: 0;
    byteOffset: number;
    byteLength: number;
    target?: number;
}
/** Builds a binary chunk: each `add` is a new buffer view, 4-byte aligned. */
export declare class BinBuilder {
    private parts;
    private length;
    readonly views: BinView[];
    /** Append bytes as a buffer view; returns its index. */
    add(bytes: Uint8Array, target?: number): number;
    /** The chunk so far. */
    bytes(): Uint8Array;
}
/**
 * An accessor's bytes, tightly packed: a strided view de-interleaved, and a
 * sparse accessor's substitutions applied (over zeros when it has no
 * `bufferView`). May share memory with the binary chunk; copy before writing.
 */
export declare function accessorBytes(glb: Glb, index: number): Uint8Array;
/** An accessor's components as numbers, element by element (not normalised). */
export declare function accessorValues(glb: Glb, index: number): Float64Array;
/** A float VEC3 accessor as xyz per element, sparse or not. */
export declare function readVec3(glb: Glb, index: number): Float32Array;
//# sourceMappingURL=glb-chunks.d.ts.map