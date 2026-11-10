import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pngDecode, pngEncode, type RgbaImage } from './png.js'
import {
  eyeAsset,
  eyePngUrl,
  eyeStyle,
  gltfEyeUvs,
  EYE_STYLES,
  lashAlpha,
  lashPicture,
  lashUvs,
  shortenLashes,
  ONE_EYE_LAYOUT,
  parseHex,
  recolourEyePng,
  recolourIris,
} from './eye-art.js'

/** The real art, where static-assets is checked out beside this repo. */
const ART = join(import.meta.dir, '../../static-assets/assets/tonio/eyes')

/**
 * An eye drawn in code on the art's layout (256 square, iris radius 48 at
 * the centre): pink sclera, the art's three browns in rings, a black pupil
 * and a white glint. The real art is on the CDN (checked below with the
 * network tier).
 */
function synthetic(): RgbaImage {
  const width = 256
  const data = new Uint8Array(width * width * 4)
  for (let y = 0; y < width; y++)
    for (let x = 0; x < width; x++) {
      const d = Math.hypot(x + 0.5 - 128, y + 0.5 - 128)
      const glint = Math.hypot(x + 0.5 - 112, y + 0.5 - 110) < 6
      const c = glint
        ? [255, 255, 255]
        : d < 14
        ? [0, 0, 0]
        : d < 26
        ? [0xc6, 0x9d, 0x6d]
        : d < 38
        ? [0x8c, 0x62, 0x39]
        : d < 48
        ? [0x60, 0x38, 0x13]
        : [255, 0xc0 + Math.round((d / 181) * 30), 0xc0]
      data.set([c[0]!, c[1]!, c[2]!, 255], (y * width + x) * 4)
    }
  return { width, height: width, data }
}
const px = (img: { width: number; data: Uint8Array }, x: number, y: number) =>
  Array.from(
    img.data.subarray((y * img.width + x) * 4, (y * img.width + x) * 4 + 3)
  )

describe('the PNG codec', () => {
  test('what it writes, it reads back exactly', () => {
    const img = synthetic()
    const again = pngDecode(pngEncode(img.data, img.width, img.height))
    expect([again.width, again.height]).toEqual([256, 256])
    expect(Buffer.compare(again.data, img.data)).toBe(0)
  })

  test('it refuses what is not a PNG', () => {
    expect(() => pngDecode(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]))).toThrow(
      'not a PNG'
    )
  })
})

describe('recolouring the iris', () => {
  const blue = [0x3f, 0x6f, 0xa0] as const
  const before = synthetic()
  const after = recolourIris(before, blue, ONE_EYE_LAYOUT)

  test('the middle brown becomes the colour exactly; the others keep their lightness', () => {
    expect(px(after, 128, 128 + 32)).toEqual([0x3f, 0x6f, 0xa0])
    const [r, , b] = px(after, 128, 128 + 20)
    expect(b).toBeGreaterThan(r!)
    expect(b).toBeGreaterThan(0xa0) // the light brown is lighter than the colour
    const [r2, , b2] = px(after, 128, 128 + 44)
    expect(b2).toBeGreaterThan(r2!)
    expect(b2).toBeLessThan(0xa0) // the dark one darker
  })

  test('the pupil, the glint and the sclera stay as they were', () => {
    for (const [x, y] of [
      [128, 128],
      [112, 110],
      [128, 10],
      [128, 128 + 60],
    ] as const)
      expect(px(after, x, y)).toEqual(px(before, x, y))
  })

  test('colours are read as #rrggbb; anything else leaves the art', () => {
    expect(parseHex('#5a3519')).toEqual([0x5a, 0x35, 0x19])
    expect(parseHex('blue')).toBeNull()
    const s = synthetic()
    const art = pngEncode(s.data, s.width, s.height)
    expect(recolourEyePng(art, 'not a colour')).toBe(art)
  })

  test('styles, their licence ids and their URLs', () => {
    expect(eyeStyle('anime')).toBe('anime')
    expect(eyeStyle('cartoon')).toBe('basic')
    expect(eyeStyle(undefined)).toBe('basic')
    expect(eyeAsset('anime')).toBe('tonio:eye/anime')
    expect(eyePngUrl('basic')).toMatch(/tonio\/eyes\/basic-eye\.png\?v=\d+$/)
  })
})

describe.skipIf(!existsSync(ART))('the eye art (static-assets)', () => {
  for (const style of EYE_STYLES)
    test(`${style}: a 256 square PNG whose iris recolours`, () => {
      const art = new Uint8Array(readFileSync(join(ART, `${style}-eye.png`)))
      const img = pngDecode(art)
      expect([img.width, img.height]).toEqual([256, 256])
      const blue = pngDecode(recolourEyePng(art, '#3f6fa0'))
      let browns = 0
      let blues = 0
      for (let y = 85; y < 172; y++)
        for (let x = 85; x < 172; x++) {
          const [r0, , b0] = px(img, x, y)
          const [r1, , b1] = px(blue, x, y)
          if (r0! > b0! + 30) {
            browns++
            if (b1! > r1!) blues++
          }
        }
      expect(browns).toBeGreaterThan(500)
      expect(blues / browns).toBeGreaterThan(0.95)
      expect(px(blue, 128, 10)).toEqual(px(img, 128, 10))
    })
})

describe('gltfEyeUvs', () => {
  // Two eyeballs of radius 1 cm, left at +X, right at -X, facing +Z.
  const ball = (cx: number) => {
    const out: number[] = []
    for (let a = 0; a <= 180; a += 15)
      for (let b = 0; b < 360; b += 30) {
        const t = (a * Math.PI) / 180
        const p = (b * Math.PI) / 180
        out.push(
          cx + 0.01 * Math.sin(t) * Math.cos(p),
          1.6 + 0.01 * Math.sin(t) * Math.sin(p),
          0.08 + 0.01 * Math.cos(t)
        )
      }
    return out
  }
  const positions = new Float32Array([...ball(0.03), ...ball(-0.03)])
  const uv = gltfEyeUvs(positions)
  const at = (x: number, y: number, z: number) => {
    let best = 0
    let d = Infinity
    for (let i = 0; i < positions.length / 3; i++) {
      const e = Math.hypot(
        positions[i * 3]! - x,
        positions[i * 3 + 1]! - y,
        positions[i * 3 + 2]! - z
      )
      if (e < d) {
        d = e
        best = i
      }
    }
    return [uv[best * 2]!, uv[best * 2 + 1]!]
  }
  const { iris } = ONE_EYE_LAYOUT

  test('straight ahead is the iris’s centre, on both eyes', () => {
    for (const cx of [0.03, -0.03]) {
      const [u, v] = at(cx, 1.6, 0.09)
      expect(u).toBeCloseTo(0.5, 5)
      expect(v).toBeCloseTo(0.5, 5)
    }
  })

  test('up on the eye is up in the picture (v down), 30° out is about the iris rim', () => {
    const t = (30 * Math.PI) / 180
    const [u, v] = at(0.03, 1.6 + 0.01 * Math.sin(t), 0.08 + 0.01 * Math.cos(t))
    expect(u).toBeCloseTo(0.5, 5)
    expect(v).toBeCloseTo(0.5 - (iris * 30) / 29, 3)
  })

  test('not mirrored: toward +X (the viewer’s right, seen from the front) is toward the picture’s right', () => {
    const t = (30 * Math.PI) / 180
    for (const cx of [0.03, -0.03]) {
      const [u] = at(cx + 0.01 * Math.sin(t), 1.6, 0.08 + 0.01 * Math.cos(t))
      expect(u).toBeGreaterThan(0.5 + iris * 0.9)
    }
  })

  test('the back of the eye gathers on a ring inside the picture', () => {
    for (let i = 0; i < uv.length; i++) {
      expect(uv[i]!).toBeGreaterThan(0)
      expect(uv[i]!).toBeLessThan(1)
    }
  })
})

describe('lashes', () => {
  // One eye at the origin; an upper lash card from the lid (r 1) out to
  // r 3, and a lower one.
  const eye = [{ x: 0, y: 0, z: 0 }]
  const card = () => Float32Array.from([0, 1, 0, 0, 3, 0, 0, -1, 0, 0, -3, 0])
  test('shortening draws each vertex toward the lid, roots kept', () => {
    const p = shortenLashes(card(), eye, 0.5)
    expect(Array.from(p)).toEqual([0, 1, 0, 0, 2, 0, 0, -1, 0, 0, -2, 0])
  })
  test('opacity: upper roots solid, tips fainter, lower lashes fainter still', () => {
    const a = lashAlpha(card(), eye)
    expect(a[0]).toBeCloseTo(1, 5)
    expect(a[1]).toBeCloseTo(0.4, 5)
    expect(a[2]).toBeCloseTo(0.45, 5)
    expect(a[3]).toBeCloseTo(0.18, 5)
  })
  test('the ramp picture and its uvs agree', () => {
    const img = pngDecode(lashPicture())
    const uv = lashUvs([0, 0.4, 1])
    for (const [i, a] of [0, 0.4, 1].entries()) {
      const x = Math.floor(uv[i * 2] * img.width)
      expect(Math.abs(img.data[x * 4 + 3] - a * 255)).toBeLessThan(5)
      expect(uv[i * 2 + 1]).toBe(0.5)
    }
    // Dark, as the builder draws them.
    expect(img.data[0]).toBeLessThan(50)
  })
})
