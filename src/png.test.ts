import { describe, expect, test } from 'bun:test'
import { inflateSync } from 'node:zlib'
import { adler32, crc32, pngEncode } from './png.js'

describe('crc32', () => {
  test('matches the standard check vector', () => {
    const bytes = new TextEncoder().encode('123456789')
    expect(crc32(bytes)).toBe(0xcbf43926)
  })

  test('empty input is 0', () => {
    expect(crc32(new Uint8Array(0))).toBe(0)
  })
})

describe('adler32', () => {
  test('matches the standard check vector', () => {
    const bytes = new TextEncoder().encode('Wikipedia')
    expect(adler32(bytes)).toBe(0x11e60398)
  })

  test('empty input is 1', () => {
    expect(adler32(new Uint8Array(0))).toBe(1)
  })
})

describe('pngEncode', () => {
  // node:zlib, not DecompressionStream — the platform decompressor is as
  // finicky about streams it did not make as the strict decoder this whole
  // exercise exists to survive. See the fflate note in png.ts.
  const inflate = (bytes: Uint8Array) =>
    new Uint8Array(
      inflateSync(bytes).buffer,
      inflateSync(bytes).byteOffset,
      inflateSync(bytes).byteLength
    )

  test('round-trips RGBA bytes exactly, alpha 0 included', async () => {
    // Deliberately hostile: fully transparent texels carrying data, plus
    // every low-alpha case that the premultiplied canvas path destroys.
    const width = 7
    const height = 3
    const rgba = new Uint8Array(width * height * 4)
    let v = 0
    for (let i = 0; i < rgba.length; i++) rgba[i] = v = (v * 31 + 17) & 0xff
    for (let i = 3; i < rgba.length; i += 4) rgba[i] = ((i / 4) % 16) * 17 - 255 // incl. 0
    rgba[3] = 0
    rgba[7] = 1

    const png = pngEncode(rgba, width, height)

    // Signature + IHDR fields.
    expect([...png.subarray(0, 8)]).toEqual([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ])
    const dv = new DataView(png.buffer, png.byteOffset, png.byteLength)
    expect(new TextDecoder().decode(png.subarray(12, 16))).toBe('IHDR')
    expect(dv.getUint32(16)).toBe(width)
    expect(dv.getUint32(20)).toBe(height)
    expect(png[24]).toBe(8) // bit depth
    expect(png[25]).toBe(6) // RGBA

    // Walk the chunks: verify CRCs and pull out the IDAT stream.
    let at = 8
    let idat: Uint8Array | null = null
    let sawIend = false
    while (at < png.length) {
      const len = dv.getUint32(at)
      const type = new TextDecoder().decode(png.subarray(at + 4, at + 8))
      const body = png.subarray(at + 8, at + 8 + len)
      expect(dv.getUint32(at + 8 + len)).toBe(
        crc32(png.subarray(at + 4, at + 8 + len))
      )
      if (type === 'IDAT') idat = body
      if (type === 'IEND') sawIend = true
      at += 12 + len
    }
    expect(idat).not.toBeNull()
    expect(sawIend).toBe(true)

    // Inflate the zlib stream (skip the 2-byte header and 4-byte Adler
    // trailer — the decompressor wants the raw deflate body) and compare
    // scanlines.
    const zlib = idat as Uint8Array
    expect(zlib[0]).toBe(0x78)
    const inflated = inflate(zlib)
    const stride = width * 4
    expect(inflated.length).toBe((stride + 1) * height)
    for (let y = 0; y < height; y++) {
      expect(inflated[y * (stride + 1)]).toBe(0) // filter byte
      expect([
        ...inflated.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)),
      ]).toEqual([...rgba.subarray(y * stride, (y + 1) * stride)])
    }

    // And the zlib trailer is the Adler-32 of the uncompressed stream.
    expect(dv.getUint32(zlib.byteOffset + zlib.length - 4)).toBe(
      adler32(inflated)
    )
  })

  test('rejects a size mismatch', async () => {
    expect(() => pngEncode(new Uint8Array(16), 3, 3)).toThrow()
  })
})
