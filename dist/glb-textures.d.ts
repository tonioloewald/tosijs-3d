/** The longest side an export's pictures may have. */
export type TextureLevel = 'as made' | '2048' | '1024' | '512';
/** What happens to an export's pictures (see the page). */
export interface PictureOptions {
    size?: TextureLevel;
    compress?: boolean;
    /** JPEG quality, 0 to 1 (default 0.85). */
    quality?: number;
}
/** Does `options` change anything at all? */
export declare const changesPictures: (o?: PictureOptions) => boolean;
/** An image embedded in a GLB, as `replaceGlbImages` hands it over. */
export interface GlbImage {
    index: number;
    bytes: Uint8Array;
    mimeType: string;
}
/**
 * The GLB with its embedded images replaced where `replace` returns new
 * ones (null keeps an image). Every buffer view is copied in order, 4-byte
 * aligned, so offsets stay valid. Images by URI are left alone.
 */
export declare function replaceGlbImages(bytes: Uint8Array, replace: (image: GlbImage) => Promise<{
    bytes: Uint8Array;
    mimeType: string;
} | null> | {
    bytes: Uint8Array;
    mimeType: string;
} | null): Promise<Uint8Array>;
/** The export with its pictures scaled and compressed as asked (a browser is needed). */
export declare function compactGlbTextures(bytes: Uint8Array, options: PictureOptions): Promise<Uint8Array>;
/**
 * A character document (`writeCharacter`'s) with the GLBs and pictures it
 * carries made smaller: garments, a body from a GLB file, and pictures
 * picked from disk, as `options` say. A copy; the document given is not changed.
 */
export declare function compactCharacterTextures<D extends {
    garments?: Record<string, string>;
    bodies?: Record<string, {
        file?: string;
        data?: string;
    }>;
    pictures?: Record<string, string>;
}>(doc: D, options: PictureOptions): Promise<D>;
//# sourceMappingURL=glb-textures.d.ts.map