import type { ProxyBinding } from './proxy-fit.js';
export interface HumanTargetEntry {
    file: string;
    step: number;
    dense: boolean;
    count: number;
}
export interface HumanPackManifest {
    format: 'tosijs-human-pack';
    version: number;
    base: string;
    license: string;
    source: {
        repo: string;
        commit: string;
    };
    units: 'm';
    handedness: 'right';
    vertexCount: number;
    positions: string;
    body: {
        triangles: string;
        count: number;
    };
    helpers: string[];
    joints: Record<string, number[]>;
    bones: Record<string, {
        parent: string | null;
        head: string;
        tail: string;
    }>;
    /** Per-vertex masks by name (`lips`), uint8 0..255, every vertex in order. */
    regions?: Record<string, string>;
    /** Extra geometry over the pack's own vertices (eyes, eyelashes). */
    parts?: Record<string, HumanPartEntry>;
    /** Clothes, hair and brows bound to the base (see proxy-fit). */
    proxies?: Record<string, HumanProxyEntry>;
    targets: Record<string, HumanTargetEntry>;
}
export interface HumanPartEntry {
    count: number;
    vertices: string;
    triangles: string;
    uvs?: string;
}
/** A part, decoded: `vertices[i]` is the pack vertex part vertex `i` sits on. */
export interface HumanPart {
    vertices: Uint32Array;
    triangles: Uint32Array;
    uvs: Float32Array | null;
}
export interface HumanProxyEntry {
    category: string;
    /** What it is worn as, one at a time: outfit, top, bottom, shoes, hat, glasses, gloves, hair, brows, beard. */
    slot?: string;
    /** Bound (OBJ) vertices, and drawn vertices (split at UV seams). */
    rows: number;
    count: number;
    /** uint32 refs ×3, float32 weights ×3, float32 offsets ×3 (metres), per row. */
    binding: string;
    /** uint32 per drawn vertex: its row. */
    source: string;
    triangles: string;
    uvs: string;
    /** uint32 base vertices the proxy covers (their skin is hidden). */
    delete?: string;
    scale: Partial<Record<'x' | 'y' | 'z', [number, number, number]>>;
    material: {
        diffuse?: string;
        normal?: string;
        alpha: boolean;
        twoSided: boolean;
        /** Alternate textures (colourways) by name. */
        looks?: Record<string, {
            diffuse: string;
            normal?: string;
        }>;
    };
}
/** A proxy, decoded: its binding (for `fitProxy`), mesh and material files. */
export interface HumanProxy extends ProxyBinding {
    name: string;
    category: string;
    slot?: string;
    triangles: Uint32Array;
    uvs: Float32Array;
    delete: Uint32Array | null;
    /** Its textures' URLs, its alternate looks', and how to draw it. */
    material: {
        diffuse?: string;
        normal?: string;
        alpha: boolean;
        twoSided: boolean;
        looks?: Record<string, {
            diffuse: string;
            normal?: string;
        }>;
        /**
         * A garment from a file (garment-file) carries more: glTF's
         * roughness-in-green, metal-in-blue map, its factors, a base colour
         * (linear RGBA), blending rather than a cut-out, the cut-out's threshold
         * and a normal map's strength.
         */
        metallicRoughness?: string;
        roughness?: number;
        metallic?: number;
        baseColor?: [number, number, number, number];
        blend?: boolean;
        alphaCutoff?: number;
        normalScale?: number;
    };
}
/** A target, decoded: `indices` is null for a dense one. */
export interface HumanTarget {
    indices: Uint32Array | null;
    deltas: Int16Array;
    step: number;
}
export interface HumanPack {
    manifest: HumanPackManifest;
    positions: Float32Array;
    triangles: Uint32Array;
    /** Whether the pack has this target. */
    has(name: string): boolean;
    /** Fetch and decode a target, once; later calls share the promise. */
    target(name: string): Promise<HumanTarget>;
    /** A target already fetched, or undefined. */
    loaded(name: string): HumanTarget | undefined;
    /** A region mask (0..1 per vertex, all of them), fetched once; null if absent. */
    region(name: string): Promise<Float32Array | null>;
    /** A part (eyes, eyelashes), fetched once; null if absent. */
    part(name: string): Promise<HumanPart | null>;
    /** A proxy (clothes, hair, brows), fetched once; null if absent. */
    proxy(name: string): Promise<HumanProxy | null>;
}
/** Decode a target file's bytes. Pure. */
export declare function decodeHumanTarget(bytes: ArrayBuffer, entry: HumanTargetEntry): HumanTarget;
type Fetcher = (url: string) => Promise<ArrayBuffer>;
/**
 * Load a pack from its manifest's URL. Binaries resolve beside it. `fetcher`
 * replaces `fetch` (tests, a worker, a cache).
 */
export declare function loadHumanPack(url: string, fetcher?: Fetcher): Promise<HumanPack>;
export {};
//# sourceMappingURL=human-pack.d.ts.map