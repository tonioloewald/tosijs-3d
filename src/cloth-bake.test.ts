import { describe, expect, test } from 'bun:test'
import { clothSheenColour, recolourCloth, textureMean } from './cloth-bake.js'
import type { RgbaImage } from './png.js'

/** A texture of folds: grey bands, darker and lighter, opaque. */
function folds(): RgbaImage {
  const width = 64
  const data = new Uint8Array(width * width * 4)
  for (let y = 0; y < width; y++)
    for (let x = 0; x < width; x++) {
      const v = 90 + Math.round(60 * Math.sin(x / 5))
      data.set([v, v, v, 255], (y * width + x) * 4)
    }
  return { width, height: width, data }
}
const px = (img: RgbaImage, x: number, y: number) =>
  Array.from(
    img.data.subarray((y * img.width + x) * 4, (y * img.width + x) * 4 + 4)
  )

describe('recolourCloth', () => {
  test('amount 0 keeps the texture as it is', () => {
    const img = folds()
    expect(Array.from(recolourCloth(img, '#7a2e2e', 0).data)).toEqual(
      Array.from(img.data)
    )
  })

  test('amount 1 is the colour wholly, its folds kept, its value kept on average', () => {
    const img = folds()
    const red = recolourCloth(img, '#7a2e2e', 1)
    // Every pixel is red now: red channel over green and blue.
    for (const [x, y] of [
      [3, 3],
      [20, 40],
      [50, 10],
    ]) {
      const [r, g, b, a] = px(red, x, y)
      expect(r).toBeGreaterThan(g)
      expect(r).toBeGreaterThan(b)
      expect(a).toBe(255)
    }
    // The folds survive: a dark band stays darker than a light one.
    const light = px(red, 8, 0)[0] // sin(8/5) near 1
    const dark = px(red, 24, 0)[0] // sin(24/5) near -1
    expect(light).toBeGreaterThan(dark + 30)
    // Divided by the mean, the colour keeps its value: the average comes out
    // at the colour's own luminance.
    const target = textureMean({
      width: 1,
      height: 1,
      data: Uint8Array.from([0x7a, 0x2e, 0x2e, 255]),
    })
    expect(textureMean(red)).toBeCloseTo(target, 2)
  })

  test('alpha is kept, and an unreadable colour changes nothing', () => {
    const img = folds()
    img.data[3] = 7
    expect(recolourCloth(img, '#3b5b8a', 1).data[3]).toBe(7)
    expect(Array.from(recolourCloth(img, 'not a colour', 1).data)).toEqual(
      Array.from(img.data)
    )
  })

  test("the sheen is the runtime's lighter version of the colour", () => {
    expect(clothSheenColour('#000000')).toEqual([0.6, 0.6, 0.6])
    expect(clothSheenColour('#ffffff')).toEqual([1, 1, 1])
    expect(clothSheenColour('nope')).toBeNull()
  })
})
