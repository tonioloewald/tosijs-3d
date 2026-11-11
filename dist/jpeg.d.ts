import { type RgbaImage } from './png.js';
/** Read a JPEG (baseline or progressive, Huffman-coded, 8-bit) as RGBA. */
export declare function jpegDecode(jpeg: Uint8Array): RgbaImage;
/** A PNG or a JPEG as RGBA, by its first bytes. */
export declare function decodeImage(bytes: Uint8Array): RgbaImage;
//# sourceMappingURL=jpeg.d.ts.map