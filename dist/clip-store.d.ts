/** A clip file kept by name. */
export interface StoredClip {
    name: string;
    kind: 'bvh' | 'glb';
    bytes: Uint8Array;
}
export interface ClipStore {
    put(clip: StoredClip): Promise<void>;
    delete(name: string): Promise<void>;
    /** Every clip file kept. */
    all(): Promise<StoredClip[]>;
}
/** This browser's clip files (IndexedDB `tosijs-clips`). */
export declare function clipStore(): ClipStore;
/** What kind of clip file a name is, by its extension (null: neither). */
export declare function clipKind(fileName: string): StoredClip['kind'] | null;
//# sourceMappingURL=clip-store.d.ts.map