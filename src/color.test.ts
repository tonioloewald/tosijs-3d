import { describe, test, expect } from 'bun:test'
import {
  parseColor,
  formatColor,
  rgbToHsv,
  hsvToRgb,
  wrapHue,
  luminance,
  contrastInk,
} from './color.js'

describe('parsing — tolerant, and honest when it fails', () => {
  test('the hex shapes people actually write', () => {
    expect(parseColor('#f00')).toEqual({ r: 1, g: 0, b: 0, a: 1 })
    expect(parseColor('#ff0000')).toEqual({ r: 1, g: 0, b: 0, a: 1 })
    expect(parseColor('#FF0000')).toEqual({ r: 1, g: 0, b: 0, a: 1 })
    expect(parseColor('  #ff0000  ')).toEqual({ r: 1, g: 0, b: 0, a: 1 })
  })

  test('alpha, in both hex lengths', () => {
    expect(parseColor('#00000080')!.a).toBeCloseTo(128 / 255, 6)
    expect(parseColor('#0008')!.a).toBeCloseTo(136 / 255, 6)
  })

  test('the theme palette round-trips — this is why alpha is in the type', () => {
    // w3d-theme's panelBg. A colour type without alpha cannot hold it.
    const c = parseColor('#14161cf0')!
    expect(formatColor(c)).toBe('#14161cf0')
  })

  test('rgb() and rgba(), comma or space separated', () => {
    expect(parseColor('rgb(255, 0, 0)')).toEqual({ r: 1, g: 0, b: 0, a: 1 })
    expect(parseColor('rgb(255 0 0)')).toEqual({ r: 1, g: 0, b: 0, a: 1 })
    expect(parseColor('rgba(255, 0, 0, 0.5)')!.a).toBe(0.5)
    expect(parseColor('rgb(100% 0% 0%)')).toEqual({ r: 1, g: 0, b: 0, a: 1 })
  })

  test('a few named colours, without a DOM', () => {
    expect(parseColor('black')).toEqual({ r: 0, g: 0, b: 0, a: 1 })
    expect(parseColor('transparent')!.a).toBe(0)
  })

  test('garbage returns NULL, not black', () => {
    // Black would be indistinguishable from a colour someone chose — the exact
    // way a themed surface ends up mysteriously dark.
    for (const bad of ['', 'nonsense', '#12345', '#gg0000', 'rgb(1,2)']) {
      expect(parseColor(bad)).toBe(null)
    }
  })

  test('a PROTOTYPE key returns null instead of throwing', () => {
    /*
    `NAMED['constructor']` returns `Object` from the prototype chain, so `??`
    did not fire and `text.startsWith` threw — `parseColor('constructor')` threw
    where `parseColor('#zz')` correctly returned null, breaking the fail-closed
    contract this module's own header states.

    Three shipped call sites, including EVERY KEYSTROKE of a colour
    `inputField`, and there is no console in a headset. Caught by the
    pre-release review, which also pointed out that the same diff hardened
    `svg-icons.ts` against this exact class and wrote a test for it there.
    */
    for (const key of [
      'constructor',
      '__proto__',
      'CONSTRUCTOR',
      'toString',
      'hasOwnProperty',
      'valueOf',
    ]) {
      expect(() => parseColor(key)).not.toThrow()
      expect(parseColor(key)).toBe(null)
    }
  })
})

describe('formatting — one canonical shape', () => {
  test('opaque colours lose the alpha pair', () => {
    expect(formatColor({ r: 1, g: 0, b: 0, a: 1 })).toBe('#ff0000')
  })

  test('translucent ones keep it', () => {
    expect(formatColor({ r: 0, g: 0, b: 0, a: 0.5 })).toBe('#00000080')
  })

  test('a document that is opened and saved untouched does not churn', () => {
    // Tolerant in, canonical out: the shorthand normalises ONCE and then holds.
    const once = formatColor(parseColor('#ABC')!)
    expect(once).toBe('#aabbcc')
    expect(formatColor(parseColor(once)!)).toBe(once)
  })
})

describe('HSV round trip', () => {
  test('primaries land on their textbook hues', () => {
    expect(rgbToHsv(parseColor('#ff0000')!).h).toBe(0)
    expect(rgbToHsv(parseColor('#00ff00')!).h).toBe(120)
    expect(rgbToHsv(parseColor('#0000ff')!).h).toBe(240)
  })

  test('grey has zero saturation and a defined hue', () => {
    const hsv = rgbToHsv(parseColor('#808080')!)
    expect(hsv.s).toBe(0)
    expect(Number.isFinite(hsv.h)).toBe(true) // not NaN — a picker reads this
  })

  test('rgb → hsv → rgb is lossless across the wheel', () => {
    for (const hex of ['#ff0000', '#00ff88', '#123456', '#ffffff', '#000000']) {
      const rgb = parseColor(hex)!
      expect(formatColor(hsvToRgb(rgbToHsv(rgb)))).toBe(hex)
    }
  })

  test('alpha survives both directions', () => {
    const rgb = parseColor('#11223344')!
    expect(rgbToHsv(rgb).a).toBeCloseTo(rgb.a, 9)
    expect(formatColor(hsvToRgb(rgbToHsv(rgb)))).toBe('#11223344')
  })

  test('hue wraps, because a hue is a circle', () => {
    expect(wrapHue(370)).toBe(10)
    expect(wrapHue(-10)).toBe(350)
    expect(formatColor(hsvToRgb({ h: 360, s: 1, v: 1, a: 1 }))).toBe('#ff0000')
  })
})

describe('ink on a swatch', () => {
  test('green is bright and blue is not — an average would say otherwise', () => {
    // Rec. 601: green carries most of the perceived light. A plain mean puts
    // unreadable text on pure green.
    expect(luminance(parseColor('#00ff00')!)).toBeGreaterThan(0.55)
    expect(luminance(parseColor('#0000ff')!)).toBeLessThan(0.55)
    expect(contrastInk(parseColor('#00ff00')!)).toBe('#000000')
    expect(contrastInk(parseColor('#0000ff')!)).toBe('#ffffff')
  })
})
