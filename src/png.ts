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

So the bytes are written directly — signature, IHDR, IDAT (zlib/deflate via
`CompressionStream`), IEND — with no canvas anywhere in the chain. A texel
with alpha 0 and nonzero RGB is just bytes here, and it survives exactly.
*/

const CRC_TABLE = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  CRC_TABLE[n] = c >>> 0
}

/** CRC-32 (the PNG polynomial), over the given bytes. */
export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i++)
    c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

/** Adler-32, over the given bytes — the zlib trailer. */
export function adler32(bytes: Uint8Array): number {
  let a = 1
  let b = 0
  for (let i = 0; i < bytes.length; i++) {
    a = (a + bytes[i]) % 65521
    b = (b + a) % 65521
  }
  return ((b << 16) | a) >>> 0
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length)
  const dv = new DataView(out.buffer)
  dv.setUint32(0, data.length)
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i)
  out.set(data, 8)
  dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)))
  return out
}

async function deflate(bytes: Uint8Array): Promise<Uint8Array> {
  const cs = new CompressionStream('deflate')
  const writer = cs.writable.getWriter()
  // The stream API wants a view over a plain ArrayBuffer; every buffer here is
  // freshly allocated by this module, so the narrowing cast is honest.
  void writer.write(bytes as Uint8Array<ArrayBuffer>)
  void writer.close()
  const reader = cs.readable.getReader()
  const parts: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    parts.push(value as Uint8Array)
    total += (value as Uint8Array).length
  }
  const out = new Uint8Array(total)
  let at = 0
  for (const p of parts) {
    out.set(p, at)
    at += p.length
  }
  return out
}

const SIGNATURE = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
])

/**
 * Encode RGBA8 pixels as a PNG — byte-for-byte lossless, alpha included.
 *
 * Filter type 0 throughout (raw rows), which is optimal for the packed fields
 * this exists for and fine elsewhere. Returns the complete PNG file bytes.
 */
export async function pngEncode(
  rgba: Uint8Array,
  width: number,
  height: number
): Promise<Uint8Array> {
  if (rgba.length !== width * height * 4) {
    throw new Error(
      `pngEncode: expected ${width * height * 4} bytes, got ${rgba.length}`
    )
  }

  const ihdr = new Uint8Array(13)
  const dv = new DataView(ihdr.buffer)
  dv.setUint32(0, width)
  dv.setUint32(4, height)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // colour type: RGBA
  ihdr[10] = 0 // compression: deflate
  ihdr[11] = 0 // filter method
  ihdr[12] = 0 // interlace: none

  // Scanlines: one filter byte (0) per row, then the row's raw RGBA.
  const stride = width * 4
  const raw = new Uint8Array((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw.set(rgba.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1)
  }

  const deflated = await deflate(raw)
  // The zlib wrapper: 0x78 0x9c (deflate, 32k window) + stream + Adler-32 of
  // the UNCOMPRESSED input.
  const zlib = new Uint8Array(deflated.length + 6)
  zlib[0] = 0x78
  zlib[1] = 0x9c
  zlib.set(deflated, 2)
  new DataView(zlib.buffer).setUint32(deflated.length + 2, adler32(raw))

  const idat = chunk('IDAT', zlib)
  const iend = chunk('IEND', new Uint8Array(0))
  const ihdrChunk = chunk('IHDR', ihdr)

  const out = new Uint8Array(
    SIGNATURE.length + ihdrChunk.length + idat.length + iend.length
  )
  let at = 0
  out.set(SIGNATURE, at)
  at += SIGNATURE.length
  out.set(ihdrChunk, at)
  at += ihdrChunk.length
  out.set(idat, at)
  at += idat.length
  out.set(iend, at)
  return out
}
