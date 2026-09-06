/*#
# color

**The colour model behind [[color-field|color3d]] — parsing, conversion and
canonical formatting.** Pure: no DOM, no Babylon, so a consumer can validate a
document's colours in a headless runner. Same split as
[[light-settings]]/[[light-editor]] and [[curve]]/[[curve-field]].

## Why HSV and not HSL

A picker is a saturation×value SQUARE under a hue strip, and that square is HSV.
HSL's lightness puts white and black at both ends of the axis with the pure hue
stranded in the middle, so the square becomes a diamond of unreachable corners —
you cannot drag to white without also losing saturation. HSV puts white at one
corner, black along an edge, and the pure hue at the opposite corner, which is
the shape of every picker anyone has used.

`lightEditor3d` deliberately does NOT use this: a light has hue and saturation
but its VALUE is intensity, so a third axis there would be two controls for one
quantity. That is a property of lights, not of colour.

## Alpha is part of the colour, not beside it

Half this library's palette is `rgba()` — `w3d-theme`'s `panelBg` is
`#14161cf0`. A colour type that drops alpha forces every consumer to carry a
second field and reunite them at the end, and they will disagree eventually.

## Tolerant in, canonical out

Parsing accepts what people and stylesheets actually write — `#abc`, `#aabbcc`,
`#aabbccdd`, `rgb()`, `rgba()`, and named CSS colours it can resolve without a
DOM. Formatting emits ONE shape: `#rrggbb`, or `#rrggbbaa` when alpha is not
fully opaque. That asymmetry is deliberate — a document that round-trips through
an editor should not churn its bytes because someone typed `#ABC`.
*/
/*{ "parent": "UI", "order": 268 }*/

/** Red, green, blue and alpha, each `0..1`. */
export interface Rgba {
  r: number
  g: number
  b: number
  /** `0..1`, where 1 is opaque. */
  a: number
}

/** Hue `0..360`, saturation and value `0..1`, alpha `0..1`. */
export interface Hsva {
  h: number
  s: number
  v: number
  a: number
}

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v)

/** Wrap a hue into `[0, 360)` — a hue is a circle, so 370 is 10. */
export function wrapHue(h: number): number {
  if (!Number.isFinite(h)) return 0
  const w = h % 360
  return w < 0 ? w + 360 : w
}

/**
 * The handful of CSS names worth resolving without a DOM.
 *
 * Not the full 148: this exists so a hand-written document saying `black` or
 * `red` parses, not to be a colour database. Anything else returns null and the
 * caller decides — which is better than silently resolving to black, the
 * failure `w3d-theme` already documents for unresolved values.
 */
const NAMED: Record<string, string> = {
  transparent: '#00000000',
  black: '#000000',
  white: '#ffffff',
  red: '#ff0000',
  green: '#008000',
  lime: '#00ff00',
  blue: '#0000ff',
  yellow: '#ffff00',
  cyan: '#00ffff',
  aqua: '#00ffff',
  magenta: '#ff00ff',
  fuchsia: '#ff00ff',
  grey: '#808080',
  gray: '#808080',
  orange: '#ffa500',
}

/**
 * Parse a colour string. Returns `null` rather than guessing.
 *
 * Null, not black: an unparseable colour that becomes black is indistinguishable
 * from a colour someone chose, and that is precisely how a themed surface ends
 * up mysteriously dark (see `w3d-theme`).
 */
export function parseColor(input: string): Rgba | null {
  if (typeof input !== 'string') return null
  const s = input.trim().toLowerCase()
  if (s === '') return null
  /*
  `Object.hasOwn`, NOT `NAMED[s]`.

  `NAMED['constructor']` returns `Object` from the prototype chain, `??` does
  not fire, and `text.startsWith` throws — so `parseColor('constructor')` threw
  where `parseColor('#zz')` correctly returns null, breaking a contract this
  file's own header states ("Returns null rather than guessing"). Three shipped
  call sites, including EVERY KEYSTROKE of a colour `inputField`, and there is
  no console in a headset.

  Caught by the pre-release review, which also noted that the same diff
  hardened `svg-icons.ts` against this exact bug class and added a test for it.
  Knowing about a bug class is not the same as looking for it.
  */
  const named = Object.hasOwn(NAMED, s) ? NAMED[s] : undefined
  const text = named ?? s

  if (text.startsWith('#')) {
    const hex = text.slice(1)
    const ok = /^[0-9a-f]+$/.test(hex)
    if (!ok) return null
    const dup = (c: string) => parseInt(c + c, 16) / 255
    if (hex.length === 3 || hex.length === 4) {
      return {
        r: dup(hex[0]),
        g: dup(hex[1]),
        b: dup(hex[2]),
        a: hex.length === 4 ? dup(hex[3]) : 1,
      }
    }
    if (hex.length === 6 || hex.length === 8) {
      const byte = (i: number) => parseInt(hex.slice(i, i + 2), 16) / 255
      return {
        r: byte(0),
        g: byte(2),
        b: byte(4),
        a: hex.length === 8 ? byte(6) : 1,
      }
    }
    return null
  }

  const fn = /^rgba?\(([^)]*)\)$/.exec(text)
  if (fn) {
    // Commas or spaces, and a slash before alpha — the modern and legacy forms
    // both appear in real stylesheets.
    const parts = fn[1].split(/[,/\s]+/).filter((p) => p !== '')
    if (parts.length < 3) return null
    const chan = (p: string) =>
      p.endsWith('%')
        ? clamp01(parseFloat(p) / 100)
        : clamp01(parseFloat(p) / 255)
    const alpha = (p: string) =>
      p.endsWith('%') ? clamp01(parseFloat(p) / 100) : clamp01(parseFloat(p))
    const [r, g, b] = [chan(parts[0]), chan(parts[1]), chan(parts[2])]
    if ([r, g, b].some((v) => !Number.isFinite(v))) return null
    return { r, g, b, a: parts[3] != null ? alpha(parts[3]) : 1 }
  }
  return null
}

/**
 * Canonical hex. `#rrggbb`, or `#rrggbbaa` when alpha is not fully opaque.
 *
 * One shape out, whatever went in — so an editor that opens and saves a
 * document without touching a colour does not rewrite it.
 */
export function formatColor(c: Rgba): string {
  const hex = (v: number) =>
    Math.round(clamp01(v) * 255)
      .toString(16)
      .padStart(2, '0')
  const base = `#${hex(c.r)}${hex(c.g)}${hex(c.b)}`
  const a = clamp01(c.a ?? 1)
  return a >= 1 ? base : `${base}${hex(a)}`
}

/** RGB → HSV, preserving alpha. Hue is 0 for greys rather than undefined. */
export function rgbToHsv(c: Rgba): Hsva {
  const r = clamp01(c.r)
  const g = clamp01(c.g)
  const b = clamp01(c.b)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
  }
  return {
    h: wrapHue(h),
    s: max === 0 ? 0 : d / max,
    v: max,
    a: clamp01(c.a ?? 1),
  }
}

/** HSV → RGB, preserving alpha. */
export function hsvToRgb(c: Hsva): Rgba {
  const h = wrapHue(c.h) / 60
  const s = clamp01(c.s)
  const v = clamp01(c.v)
  const i = Math.floor(h) % 6
  const f = h - Math.floor(h)
  const p = v * (1 - s)
  const q = v * (1 - f * s)
  const t = v * (1 - (1 - f) * s)
  const table: Array<[number, number, number]> = [
    [v, t, p],
    [q, v, p],
    [p, v, t],
    [p, q, v],
    [t, p, v],
    [v, p, q],
  ]
  const [r, g, b] = table[i]
  return { r, g, b, a: clamp01(c.a ?? 1) }
}

/**
 * Perceived brightness, `0..1` — for deciding what to draw ON a swatch.
 *
 * Rec. 601 coefficients rather than a plain average: green carries most of the
 * perceived light, so an average puts readable text on pure blue and unreadable
 * text on pure green. Alpha is ignored — the caller knows what is behind.
 */
export function luminance(c: Rgba): number {
  return clamp01(0.299 * c.r + 0.587 * c.g + 0.114 * c.b)
}

/** Black or white, whichever will be legible on this colour. */
export function contrastInk(c: Rgba): string {
  return luminance(c) > 0.55 ? '#000000' : '#ffffff'
}
