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