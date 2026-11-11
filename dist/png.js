/*
LOSSLESS PNG — the packed-fields encoder.

Why not `canvas.toDataURL('image/png')`? The canvas 2D backing store is
PREMULTIPLIED. For pictures that is correct; for data it is fatal. A texel
whose alpha byte is small — and a star's alpha IS small, it is a palette
index 0..9, not an opacity — has its RGB rounded away on the way into the
canvas, and the PNG encoder then faithfully saves the destroyed bytes.
Measured against a real 100k-star galaxy: the canvas path alone corrupted or
deleted 67% of one face's occupied texels before any compression question
arose. (See `skybox-baker` for the experiment and the shipped consequence.)

So the bytes are written directly — signature, IHDR, IDAT, IEND — with no
canvas anywhere in the chain. A texel with alpha 0 and nonzero RGB is just
bytes here, and it survives exactly.

⚠️ The deflate is `fflate`'s, NOT `CompressionStream`'s — and that choice is
empirical, not aesthetic. Chrome's own strict PNG decoder (`createImageBitmap`,
the path Babylon's image loader uses) REJECTS PNGs whose IDAT came from
Chrome's own `CompressionStream('deflate')`, while the same bytes deflated by
a real zlib (bun's, fflate's) decode everywhere. A valid deflate stream that
the platform itself will not read back is the one failure mode no spec check
would have predicted; the bisect that found it is recorded in the commit.
*/
import { unzlibSync, zlibSync } from 'fflate';
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++)
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    CRC_TABLE[n] = c >>> 0;
}
/** CRC-32 (the PNG polynomial), over the given bytes. */
export function crc32(bytes) {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++)
        c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}
/** Adler-32, over the given bytes — the zlib trailer. */
export function adler32(bytes) {
    let a = 1;
    let b = 0;
    for (let i = 0; i < bytes.length; i++) {
        a = (a + bytes[i]) % 65521;
        b = (b + a) % 65521;
    }
    return ((b << 16) | a) >>> 0;
}
function chunk(type, data) {
    const out = new Uint8Array(12 + data.length);
    const dv = new DataView(out.buffer);
    dv.setUint32(0, data.length);
    for (let i = 0; i < 4; i++)
        out[4 + i] = type.charCodeAt(i);
    out.set(data, 8);
    dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
    return out;
}
const SIGNATURE = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
/**
 * Encode RGBA8 pixels as a PNG — byte-for-byte lossless, alpha included.
 *
 * Filter type 0 throughout (raw rows), which is optimal for the packed fields
 * this exists for and fine elsewhere. Returns the complete PNG file bytes.
 */
export function pngEncode(rgba, width, height) {
    if (rgba.length !== width * height * 4) {
        throw new Error(`pngEncode: expected ${width * height * 4} bytes, got ${rgba.length}`);
    }
    const ihdr = new Uint8Array(13);
    const dv = new DataView(ihdr.buffer);
    dv.setUint32(0, width);
    dv.setUint32(4, height);
    ihdr[8] = 8; // bit depth
    ihdr[9] = 6; // colour type: RGBA
    ihdr[10] = 0; // compression: deflate
    ihdr[11] = 0; // filter method
    ihdr[12] = 0; // interlace: none
    // Scanlines: one filter byte (0) per row, then the row's raw RGBA.
    const stride = width * 4;
    const raw = new Uint8Array((stride + 1) * height);
    for (let y = 0; y < height; y++) {
        raw.set(rgba.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
    }
    // fflate's zlibSync emits the complete zlib stream (header + deflate +
    // Adler-32), so the wrapper is its problem and not ours.
    const zlib = zlibSync(raw);
    const idat = chunk('IDAT', zlib);
    const iend = chunk('IEND', new Uint8Array(0));
    const ihdrChunk = chunk('IHDR', ihdr);
    const out = new Uint8Array(SIGNATURE.length + ihdrChunk.length + idat.length + iend.length);
    let at = 0;
    out.set(SIGNATURE, at);
    at += SIGNATURE.length;
    out.set(ihdrChunk, at);
    at += ihdrChunk.length;
    out.set(idat, at);
    at += idat.length;
    out.set(iend, at);
    return out;
}
/**
 * Read a PNG: 8-bit grey, grey and alpha, RGB or RGBA, not interlaced (what
 * browsers and image tools write for pictures). Grey comes back as RGB, and
 * a picture with no alpha with alpha 255. Anything else throws, naming what
 * it found.
 */
export function pngDecode(png) {
    for (let i = 0; i < 8; i++)
        if (png[i] !== SIGNATURE[i])
            throw new Error('pngDecode: not a PNG');
    const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
    let width = 0;
    let height = 0;
    let colourType = 0;
    const idat = [];
    for (let at = 8; at < png.length;) {
        const length = view.getUint32(at);
        const type = String.fromCharCode(...png.subarray(at + 4, at + 8));
        const body = png.subarray(at + 8, at + 8 + length);
        if (type === 'IHDR') {
            width = view.getUint32(at + 8);
            height = view.getUint32(at + 12);
            const depth = body[8];
            colourType = body[9];
            if (depth !== 8 || ![0, 2, 4, 6].includes(colourType) || body[12])
                throw new Error(`pngDecode: only 8-bit grey or colour, not interlaced (depth ${depth}, colour type ${colourType}, interlace ${body[12]})`);
        }
        else if (type === 'IDAT')
            idat.push(body);
        else if (type === 'IEND')
            break;
        at += 12 + length;
    }
    const joined = new Uint8Array(idat.reduce((n, c) => n + c.length, 0));
    let o = 0;
    for (const c of idat) {
        joined.set(c, o);
        o += c.length;
    }
    const raw = unzlibSync(joined);
    const bpp = [1, 0, 3, 0, 2, 0, 4][colourType];
    const stride = width * bpp;
    const pixels = new Uint8Array(height * stride);
    for (let y = 0; y < height; y++) {
        const filter = raw[y * (stride + 1)];
        const src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
        const row = pixels.subarray(y * stride, (y + 1) * stride);
        const up = y > 0 ? pixels.subarray((y - 1) * stride, y * stride) : null;
        for (let x = 0; x < stride; x++) {
            const a = x >= bpp ? row[x - bpp] : 0;
            const b = up ? up[x] : 0;
            const c = up && x >= bpp ? up[x - bpp] : 0;
            let v = src[x];
            if (filter === 1)
                v += a;
            else if (filter === 2)
                v += b;
            else if (filter === 3)
                v += (a + b) >> 1;
            else if (filter === 4) {
                const p = a + b - c;
                const pa = Math.abs(p - a);
                const pb = Math.abs(p - b);
                const pc = Math.abs(p - c);
                v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
            }
            else if (filter !== 0)
                throw new Error(`pngDecode: unknown filter ${filter} on row ${y}`);
            row[x] = v & 0xff;
        }
    }
    if (bpp === 4)
        return { width, height, data: pixels };
    const data = new Uint8Array(width * height * 4);
    const grey = bpp < 3;
    for (let i = 0, j = 0; i < pixels.length; i += bpp, j += 4) {
        data[j] = pixels[i];
        data[j + 1] = pixels[grey ? i : i + 1];
        data[j + 2] = pixels[grey ? i : i + 2];
        data[j + 3] = bpp === 2 ? pixels[i + 1] : bpp === 4 ? pixels[i + 3] : 255;
    }
    return { width, height, data };
}
//# sourceMappingURL=png.js.map