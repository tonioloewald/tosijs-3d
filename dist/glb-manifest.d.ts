export interface LibraryItem {
    name: string;
    category?: string;
    tags?: string[];
    /** Bounding box in metres, `[x, y, z]`. */
    size?: [number, number, number];
}
export interface LibraryManifest {
    count?: number;
    categories?: Record<string, number>;
    items: LibraryItem[];
}
export interface GlbAttribution {
    credit?: string;
    license?: string;
    link?: string;
}
/**
 * Pull the JSON chunk out of a GLB. Returns `null` for anything that is not one
 * — a `.gltf`, a truncated download, an HTML error page served with a 200.
 *
 * Never throws: a caller asking "does this file describe itself?" should get
 * "no", not an exception to guard.
 */
export declare function parseGlbJson(bytes: ArrayBuffer | Uint8Array): any | null;
/**
 * How many bytes are needed to hold the whole JSON chunk, from a prefix that
 * covers at least the 20-byte header. `null` if it is not a GLB or the prefix
 * is too short to tell.
 *
 * Exists so a fetch can start small: read a few KB, learn the real length, and
 * widen only if it has to. A library's manifest can be tens of KB while the
 * file is a megabyte, and the whole point is not to download the megabyte.
 */
export declare function glbJsonByteLength(bytes: ArrayBuffer | Uint8Array): number | null;
/** Credit/licence/link a curated artifact carries, or `null`. */
export declare function glbAttribution(json: any): GlbAttribution | null;
/**
 * The library catalogue, or `null` for a GLB that is not one.
 *
 * Items are filtered to those that at least have a name, because a nameless
 * entry cannot be instantiated and its presence in a list is worse than its
 * absence — it looks like something you can ask for.
 */
export declare function libraryManifest(json: any): LibraryManifest | null;
/**
 * Build a manifest from LOADED NODES — the primary path.
 *
 * Takes `{name, metadata}` pairs (Babylon nodes, structurally typed so this
 * stays Babylon-free and testable) and harvests `metadata.gltf.extras`. No
 * fetching, no parsing: `ExtrasAsMetadata` has already done the work by the
 * time the scene exists.
 */
export declare function manifestFromNodes(nodes: Array<{
    name: string;
    metadata?: any;
}>): LibraryManifest | null;
/** Names in a category, in manifest order. */
export declare function itemsInCategory(manifest: LibraryManifest, category: string): string[];
/**
 * Items carrying ALL of `tags` — an and-query, because that is what narrowing
 * means and an or-query is just concatenating two searches.
 */
export declare function itemsWithTags(manifest: LibraryManifest, tags: string[]): string[];
/**
 * Items that fit inside `[x, y, z]` metres.
 *
 * The question placement code actually asks — "what can I put in this gap" —
 * answered from the manifest rather than by instantiating candidates and
 * measuring them. An item with no recorded size is EXCLUDED rather than
 * assumed to fit: a prop that turns out to be a tree is a worse outcome than
 * one that never got offered.
 */
export declare function itemsFitting(manifest: LibraryManifest, [x, y, z]: [number, number, number]): string[];
//# sourceMappingURL=glb-manifest.d.ts.map