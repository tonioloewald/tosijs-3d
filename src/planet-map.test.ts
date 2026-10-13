import { describe, expect, test } from 'bun:test'
import { deflateSync } from 'node:zlib'
import { decodeGray16Png, mapSurface } from './planet-map.js'
import { latLonToDirection } from './sphere-map.js'

/** A 16-bit greyscale PNG from rows of values, each row with its own filter. */
function png16(rows: number[][], filters: number[]): Uint8Array {
  const width = rows[0].length
  const stride = width * 2
  const raw = new Uint8Array((stride + 1) * rows.length)
  let prev = new Uint8Array(stride)
  rows.forEach((values, y) => {
    const line = new Uint8Array(stride)
    values.forEach((v, x) => {
      line[x * 2] = v >> 8
      line[x * 2 + 1] = v & 255
    })
    const f = filters[y]
    raw[y * (stride + 1)] = f
    for (let i = 0; i < stride; i++) {
      const a = i >= 2 ? line[i - 2] : 0
      const b = prev[i]
      const c = i >= 2 ? prev[i - 2] : 0
      let p = 0
      if (f === 1) p = a
      else if (f === 2) p = b
      else if (f === 3) p = (a + b) >> 1
      else if (f === 4) {
        const q = a + b - c
        const pa = Math.abs(q - a)
        const pb = Math.abs(q - b)
        const pc = Math.abs(q - c)
        p = pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      }
      raw[y * (stride + 1) + 1 + i] = (line[i] - p) & 255
    }
    prev = line
  })
  const chunk = (type: string, body: Uint8Array): Uint8Array => {
    const out = new Uint8Array(12 + body.length)
    new DataView(out.buffer).setUint32(0, body.length)
    for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i)
    out.set(body, 8) // CRC left zero: the decoder does not check it
    return out
  }
  const ihdr = new Uint8Array(13)
  const v = new DataView(ihdr.buffer)
  v.setUint32(0, width)
  v.setUint32(4, rows.length)
  ihdr[8] = 16 // bit depth
  ihdr[9] = 0 // greyscale
  const parts = [
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', new Uint8Array(deflateSync(raw))),
    chunk('IEND', new Uint8Array(0)),
  ]
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.length
  }
  return out
}

describe('decodeGray16Png', () => {
  const rows = [
    [0, 255, 256, 65535],
    [32768, 32769, 40000, 12345],
    [1, 2, 3, 4],
    [60000, 500, 499, 33000],
    [7, 7, 7, 7],
  ]

  test('every row filter comes back to the values that went in', () => {
    const map = decodeGray16Png(png16(rows, [0, 1, 2, 3, 4]))
    expect(map.width).toBe(4)
    expect(map.height).toBe(5)
    expect(Array.from(map.data)).toEqual(rows.flat())
  })

  test('the high byte is the high byte (65436 is not 156 × 256 + 255 the other way)', () => {
    const map = decodeGray16Png(png16([[0x1234, 0xff9c]], [0]))
    expect(Array.from(map.data)).toEqual([0x1234, 0xff9c])
  })

  test('anything but 16-bit greyscale is refused by name', () => {
    const bytes = png16([[1, 2]], [0])
    bytes[8 + 8 + 8] = 8 // the IHDR bit depth
    expect(() => decodeGray16Png(bytes)).toThrow(/16-bit greyscale/)
    expect(() => decodeGray16Png(new Uint8Array(20))).toThrow(/not a PNG/)
  })
})

describe('mapSurface', () => {
  // 4 × 2: the top row is the northern half, the bottom the southern.
  // Columns run west to east from −180°.
  const map = {
    width: 4,
    height: 2,
    data: new Uint16Array([
      32768 + 100,
      32768 + 200,
      32768 + 300,
      32768 + 400,
      32768 - 100,
      32768 - 200,
      32768 - 300,
      32768 - 400,
    ]),
  }
  const surface = mapSurface(map, { radius: 1000 })
  const h = (lat: number, lon: number) =>
    surface.heightAt(latLonToDirection(lat, lon))

  test('a pixel centre reads that pixel, in metres', () => {
    // Column centres are at −135°, −45°, 45°, 135°; row centres at ±45°.
    expect(h(45, -135)).toBeCloseTo(100, 6)
    expect(h(45, 45)).toBeCloseTo(300, 6)
    expect(h(-45, 135)).toBeCloseTo(-400, 6)
  })

  test('between pixels it blends', () => {
    expect(h(45, 0)).toBeCloseTo(250, 6)
    expect(h(0, 45)).toBeCloseTo(0, 6)
  })

  test('the date line joins east to west', () => {
    // 180° is half way between the last column (400) and the first (100).
    expect(h(45, 180)).toBeCloseTo(250, 6)
    expect(h(45, -180)).toBeCloseTo(250, 6)
  })

  test('past the last row it holds the pole', () => {
    expect(h(89.9, 45)).toBeCloseTo(300, 0)
  })

  test('a floor fills the sea level', () => {
    const sea = mapSurface(map, { radius: 1000, floor: 0 })
    expect(sea.heightAt(latLonToDirection(-45, 45))).toBe(0)
    expect(sea.heightAt(latLonToDirection(45, 45))).toBeCloseTo(300, 6)
  })

  test('the direction can be any length', () => {
    const d = latLonToDirection(45, 45)
    expect(
      surface.heightAt({ x: d.x * 50, y: d.y * 50, z: d.z * 50 })
    ).toBeCloseTo(300, 6)
  })
})
