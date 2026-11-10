import { describe, expect, test } from 'bun:test'
import {
  bakeClothLook,
  clothSheenColour,
  hairMean,
  recolourCloth,
  recolourHair,
  textureMean,
} from './cloth-bake.js'
import { pngDecode, type RgbaImage } from './png.js'
import { jpegDecode } from './jpeg.js'
import { clothRecipe } from './material-recipe.js'

// A 37 × 29 grey JPEG (jpeg.test.ts's grey fixture).
const GREY_JPEG = Uint8Array.from(
  atob(
    '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAIBAQEBAQIBAQECAgICAgQDAgICAgUEBAMEBgUG' +
      'BgYFBgYGBwkIBgcJBwYGCAsICQoKCgoKBggLDAsKDAkKCgr/wAALCAAdACUBAREA/8QAHwAA' +
      'AQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQR' +
      'BRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RF' +
      'RkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ip' +
      'qrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oACAEB' +
      'AAA/APyb+HP7P+r+F9Xt9d13SfItIN3my7lbbuUqOFJJ5IHAr1CX4P8A/CcfZf8AhFrX7V9l' +
      '3ef8uzbuxt+/jOdp6eleofDr4f6R4X0i30LXT5F1Bu82LymbbuYsOVBB4IPB711fw5/Z/wBX' +
      '8L6tb69ruk+RaQbvNl3K2NylRwpJPJA4Felap8Hj45tbf/hFrQXX2Xd5/wAuzbuxt+/jOdp6' +
      'eleQ+GfBI8c7fC39i/ZftX/LfzN+3b8/3cDOduOvevRPC/wdX4Xbf9F+3fbvbytmz/vrOd/t' +
      '0r0Twz+ziPHO3xT5v2X7V/yw8jft2/J97Iznbnp3r0Twz4J/4Tkr4W/sX7L9q/5b+Zv27fn+' +
      '7gZ+7jr3rvdH+Di/C625tft32728rZs/76znf7dK8ug/Z90fwtpEmu6FpXkXUG3ypdzNt3MF' +
      'PDEg8Ejkd67f4V/B0eORMPFNqbr7Ls8j5fL27t277mM52jr6V28Hw81bwvqz6FoR8i0g2+VF' +
      '5Stt3KGPLAk8k969dg/Z90fwvpEmu6FpfkXcG3ypdzNt3MFPDEjoSOneux+HfwdHjm1n/wCE' +
      'ptvtX2XZ5Hy7Nu7du+5jP3R19K+efg14D0f/AIS6yGP+en8P/TNq9c8ZeBNIH9ncf89f4f8A' +
      'cr134NeA9I/4ROyH+/8Aw/8ATRq0/g14C0f/AIS6yGP7/wDD/wBM2r1X4g+A9H+zafx/z1/h' +
      '/wByv//Z'
  ),
  (c) => c.charCodeAt(0)
)

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

describe('recolourHair', () => {
  const lin = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  // A strand at the mean, a bright one, and a clear pixel (not hair).
  const strands: RgbaImage = {
    width: 3,
    height: 1,
    data: Uint8ClampedArray.from([
      128, 128, 128, 255, 250, 250, 250, 255, 255, 255, 255, 0,
    ]) as any,
  }
  test('the mean is taken where there is hair', () => {
    expect(
      hairMean({
        width: 1,
        height: 1,
        data: Uint8ClampedArray.from([128, 128, 128, 255]) as any,
      })
    ).toBeCloseTo(lin(128 / 255), 5)
  })
  test('a strand at the mean is the base colour; a bright one leans to the highlight', () => {
    const out = recolourHair(
      strands,
      '#804020',
      '#ffe0a0',
      0.25,
      lin(128 / 255)
    )
    // At the mean: the base (the highlight's ramp starts just below the
    // mean, as in the shader, so a few levels toward it).
    const base = [0x80, 0x40, 0x20]
    for (let c = 0; c < 3; c++)
      expect(Math.abs(out.data[c] - base[c])).toBeLessThanOrEqual(5)
    // Brighter, and warmer toward the highlight than the base scaled alone.
    expect(out.data[4]).toBeGreaterThan(0x80)
    expect(out.data[6] / out.data[4]).toBeGreaterThan(0x20 / 0x80)
    // Alpha kept.
    expect(out.data[11]).toBe(0)
  })
})

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

  test('bakeClothLook: a JPEG picture and a cloth look give the recoloured PNG', () => {
    const picture = { bytes: GREY_JPEG, mimeType: 'image/jpeg' }
    const look = clothRecipe({
      fabric: 'cotton',
      colour: '#a02020',
      recolour: 1,
    })
    const baked = bakeClothLook(picture, look)!
    expect(baked.mimeType).toBe('image/png')
    const out = pngDecode(baked.bytes)
    const want = recolourCloth(jpegDecode(GREY_JPEG), '#a02020', 1)
    expect(Buffer.from(out.data).equals(Buffer.from(want.data))).toBe(true)
    // Red, where the picture was grey.
    let r = 0
    let b = 0
    for (let i = 0; i < out.data.length; i += 4) {
      r += out.data[i]
      b += out.data[i + 2]
    }
    expect(r).toBeGreaterThan(2 * b)
    // Nothing to bake: no recolour, not cloth, an unreadable picture.
    expect(
      bakeClothLook(picture, clothRecipe({ colour: '#a02020', recolour: 0 }))
    ).toBeNull()
    expect(
      bakeClothLook(picture, { type: 'pbr', inputs: {} } as any)
    ).toBeNull()
    expect(
      bakeClothLook({ bytes: new Uint8Array(4), mimeType: 'image/png' }, look)
    ).toBeNull()
  })
})
