/** CRC-32 (the PNG polynomial), over the given bytes. */
export declare function crc32(bytes: Uint8Array): number;
/** Adler-32, over the given bytes — the zlib trailer. */
export declare function adler32(bytes: Uint8Array): number;
/**
 * Encode RGBA8 pixels as a PNG — byte-for-byte lossless, alpha included.
 *
 * Filter type 0 throughout (raw rows), which is optimal for the packed fields
 * this exists for and fine elsewhere. Returns the complete PNG file bytes.
 */
export declare function pngEncode(rgba: Uint8Array, width: number, height: number): Uint8Array;
//# sourceMappingURL=png.d.ts.map