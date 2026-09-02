/*#
# light-modulation

**A light's whole life as one curve.** Pure, deterministic, Babylon-free — the
model behind [[b3d-lamp]]'s flicker, pulse, beacon and fade.

## One curve, two split points

A channel is a single `[0,1] → [0,1]` curve from [[curve|curve.ts]] spanning the
lamp's entire behaviour, divided by two markers:

```
   0 ─────────── attackEnd ──────────── sustainEnd ─────────── 1
   |   ATTACK        |       SUSTAIN         |      DECAY      |
   | plays once,     | loops while on,       | plays once,     |
   | on switch-on    | one pass per `period` | on switch-off   |
```

Tonio: _"if one curve covers attack - sustain - decay and you simply move the
point where attack becomes sustain and sustain becomes decay then the only real
discontinuities will occur mid-loop shut off or shut off while spinning up."_

That is exactly right, and it is why this shape is worth the constraint it
imposes. **The seams cannot be discontinuous, because there is only one curve** —
the value at `attackEnd` is reached from the left by the attack and held from the
right by the sustain, so they agree by construction rather than by two numbers
being kept in sync by hand.

It follows that **the curve's value at `attackEnd` IS the sustain level.** There
is no separate level to declare, and none to get wrong.

## What it gives up, and why that is fine

A separate loop multiplied by an envelope would let a flicker keep flickering
*through* the fade for free. Here it does not: the decay segment plays what the
decay segment draws.

Tonio, choosing this deliberately: _"you might not want flicker to compose. The
classic fluorescent light flickers to life. And if you want the lamp to flicker
as it dies, make it flicker as it dies. OK you won't get some kind of organic
composition, but that's something we can always come down to and this case is
both simple and extremely powerful."_

So: author the tail you want. Composition remains available later as an addition,
which is the safe direction to leave a door open in.

## The two discontinuities that remain

Both are named above and neither is fixable in this model, so they are contracts
rather than bugs:

- **Shut off mid-loop.** The sustain is somewhere inside its segment; the decay
  begins at `sustainEnd`. Keep the two ends of the sustain segment near each
  other in value and the jump is invisible — a loop that returns near where it
  started is a better loop anyway.
- **Shut off while spinning up.** The decay starts at `sustainEnd` regardless of
  how far the attack had climbed.

## The channels do NOT share a convention, deliberately

| channel | curve value means | why |
| --- | --- | --- |
| `brightness` | **multiplies** the base intensity — `0` off, `1` as declared | "off" has to be reachable; it is the value you flicker to |
| `range` | **multiplies** the base range | a range of zero is a light that lights nothing |
| `saturation` | **multiplies** saturation — `0` is white | saturation has a meaningful zero and reaching it is the point |
| `hue` | **shifts** the base hue, `0.5` = unchanged, scaled by `hueShiftDeg` | hue is circular with no meaningful zero, so an absolute mapping would discard the colour you chose |

**The hue shift is RELATIVE, and that catches people.** "Fade out and go red" is
a small shift from a warm white and a very large one from a cool one: `#cfe8ff`
sits near 207°, so a plausible-looking `hueShiftDeg: 45` takes a dying
fluorescent to *cyan* — it needs about 190 to reach amber. Caught on the live
page doing exactly that. The default 30 is for leaning, not for changing a
lamp's mind.

## Flicker is a curve, not a random number

A stepped curve strobes. A spiky attack segment is a fluorescent striking. A slow
`easeInOut` sustain is a beacon. All authored, repeatable, and editable in
[[curve-field|curve3d]] — where a `Math.random()` flicker would be none of those,
and would break the no-`Math.random` rule that makes this testable at all.

For flicker that should not read as periodic, give the sustain segment several
dissimilar peaks and a period that is not a round number.
*/
/*{ "parent": "Effects", "order": 120 }*/

import { evaluateCurve, type ControlPoint } from './curve'

/** A curve, or a flat value. A number is the constant curve at that value. */
export type ModulationCurve = ControlPoint[] | number

/**
 * The four channels. Each spans the WHOLE program — attack, sustain and decay
 * are regions of one curve, not three curves.
 */
export interface ChannelCurves {
  /** Multiplies intensity. `0` off, `1` as declared. */
  brightness?: ModulationCurve
  /** Multiplies range/falloff distance. */
  range?: ModulationCurve
  /** Multiplies saturation. `1` as declared, `0` washes to white. */
  saturation?: ModulationCurve
  /** Bipolar hue shift: `0.5` unchanged, `0` is `-hueShiftDeg`, `1` is `+hueShiftDeg`. */
  hue?: ModulationCurve
  /** How far the `hue` curve can push, in degrees. Default 30. */
  hueShiftDeg?: number
}

/** A lamp's whole behaviour: the curves, where they split, and how fast. */
export interface LightProgram extends ChannelCurves {
  /**
   * Where the attack ends and the sustain begins, in curve x. Default `0` —
   * no attack segment.
   *
   * The curve's value here is the sustain level; there is nothing else to set.
   */
  attackEnd?: number
  /** Where the sustain ends and the decay begins, in curve x. Default `1` — no decay segment. */
  sustainEnd?: number
  /** Seconds to play the attack segment once, on switch-on. */
  attack?: number
  /** Seconds for ONE pass of the sustain segment. `0` holds at `attackEnd`. */
  period?: number
  /** Seconds to play the decay segment once, on switch-off. */
  decay?: number
  /**
   * Where in the sustain loop this lamp starts, in turns.
   *
   * What stops a row of identical lamps pulsing as one organism — give each a
   * different phase and the same config becomes a crowd rather than a chorus.
   */
  phase?: number
}

/** Which segment is playing. */
export type LightPhase = 'attack' | 'sustain' | 'decay' | 'off'

/** What the program says the light should be doing right now. */
export interface ModulationSample {
  /** Multiplier for intensity, `>= 0`. */
  brightness: number
  /** Multiplier for range, `>= 0`. */
  range: number
  /** Multiplier for saturation, `>= 0`. `0` is white. */
  saturation: number
  /** Hue shift in degrees, signed. */
  hueShiftDeg: number
}

/** The identity sample — what an unprogrammed light gets. */
export const NO_MODULATION: ModulationSample = {
  brightness: 1,
  range: 1,
  saturation: 1,
  hueShiftDeg: 0,
}

const DEFAULT_HUE_SHIFT = 30
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

/**
 * Is there a program at all?
 *
 * Requires both a curve AND a clock. A curve with no timing has nowhere to be
 * read from, and returning the identity for it is what stops an incomplete
 * config producing a black lamp — which is indistinguishable from a broken one.
 */
export function isAnimated(p: LightProgram | null | undefined): boolean {
  if (p == null) return false
  const hasClock =
    (p.attack ?? 0) > 0 || (p.period ?? 0) > 0 || (p.decay ?? 0) > 0
  const hasCurve =
    p.brightness != null ||
    p.range != null ||
    p.saturation != null ||
    p.hue != null
  return hasClock && hasCurve
}

/** Split points, ordered and clamped, so a bad pair cannot invert a segment. */
function splits(p: LightProgram): { a: number; b: number } {
  const a = clamp01(p.attackEnd ?? 0)
  // `b` cannot precede `a`: an inverted sustain segment would make the loop run
  // backwards through the attack, which is a silent wrong rather than an error.
  return { a, b: Math.max(a, clamp01(p.sustainEnd ?? 1)) }
}

/** Which segment is playing, given switch state and time since it changed. */
export function lightPhase(
  p: LightProgram | null | undefined,
  on: boolean,
  sinceChange: number
): LightPhase {
  if (on) {
    const attack = p?.attack ?? 0
    return attack > 0 && sinceChange < attack ? 'attack' : 'sustain'
  }
  const decay = p?.decay ?? 0
  return decay > 0 && sinceChange < decay ? 'decay' : 'off'
}

/**
 * Where on the curve to read, in `[0,1]` — or `null` when the lamp is off.
 *
 * This is the whole model in one function, and the reason the seams hold: the
 * attack arrives at exactly `attackEnd`, the sustain starts there, and the decay
 * starts at exactly `sustainEnd`.
 */
export function programPosition(
  p: LightProgram | null | undefined,
  on: boolean,
  sinceChange: number
): number | null {
  if (p == null) return on ? 1 : null
  const { a, b } = splits(p)
  const phase = lightPhase(p, on, sinceChange)
  if (phase === 'off') return null
  if (phase === 'attack') {
    return Math.min(1, sinceChange / (p.attack ?? 1)) * a || 0
  }
  if (phase === 'decay') {
    const t = Math.min(1, sinceChange / (p.decay ?? 1))
    return b + t * (1 - b)
  }
  // Sustain. With no period, or no segment to loop over, hold where the attack
  // left off — which IS the sustain level, by construction.
  const period = p.period ?? 0
  if (!(period > 0) || b <= a) return a
  const since = sinceChange - (p.attack ?? 0)
  const turns = since / period + (p.phase ?? 0)
  // `%` keeps the sign of the dividend, so a negative phase offset (a legitimate
  // "start earlier") would read off the wrong end of the segment.
  const u = ((turns % 1) + 1) % 1
  return a + u * (b - a)
}

function sampleCurve(
  curve: ModulationCurve | undefined,
  at: number,
  fallback: number
): number {
  if (curve == null) return fallback
  if (typeof curve === 'number') return curve
  if (curve.length === 0) return fallback
  return evaluateCurve(curve, at)
}

/**
 * Sample the program. This is what a lamp calls each frame.
 *
 * ```javascript
 * // A fluorescent: strikes in stutters, then a steady faint hum, then out.
 * const program = {
 *   brightness: [
 *     { x: 0, y: 0 }, { x: 0.08, y: 0.9 }, { x: 0.12, y: 0.05 },
 *     { x: 0.2, y: 1 }, { x: 0.26, y: 0.1 }, { x: 0.35, y: 1 },
 *     { x: 0.6, y: 0.95 }, { x: 0.75, y: 1 },
 *     { x: 0.9, y: 0.3 }, { x: 1, y: 0 },
 *   ],
 *   attackEnd: 0.35, sustainEnd: 0.75,
 *   attack: 1.2, period: 2, decay: 1.5,
 * }
 * sampleLight(program, on, sinceChange)
 * ```
 *
 * An off lamp is hard zero — off is off, not "very dim".
 */
export function sampleLight(
  p: LightProgram | null | undefined,
  on: boolean,
  sinceChange: number
): ModulationSample {
  if (!isAnimated(p)) {
    return on ? NO_MODULATION : { ...NO_MODULATION, brightness: 1 }
  }
  const at = programPosition(p, on, sinceChange)
  if (at == null) {
    return { brightness: 0, range: 1, saturation: 1, hueShiftDeg: 0 }
  }
  const amp = p!.hueShiftDeg ?? DEFAULT_HUE_SHIFT
  return {
    // Clamped at zero only: curves are `[0,1]` by construction, so the declared
    // intensity is a MAXIMUM and a lamp never surprises you by exceeding its
    // own setting.
    brightness: Math.max(0, sampleCurve(p!.brightness, at, 1)),
    range: Math.max(0, sampleCurve(p!.range, at, 1)),
    saturation: Math.max(0, sampleCurve(p!.saturation, at, 1)),
    hueShiftDeg: (sampleCurve(p!.hue, at, 0.5) - 0.5) * 2 * amp,
  }
}

/**
 * Rotate a hue by `deg` and scale saturation by `satScale`, on components in
 * `[0,1]`.
 *
 * Kept here rather than reaching for Babylon's `Color3.toHSV` so the whole model
 * stays engine-free and testable. VALUE is always preserved — dimming is the
 * `brightness` channel's job, and a colour operation that quietly dimmed the
 * lamp would make the two fight. With the default `satScale` of 1, saturation is
 * preserved too, so shifting a warm white leaves a white that leans.
 */
export function shiftHue(
  rgb: { r: number; g: number; b: number },
  deg: number,
  satScale = 1
): { r: number; g: number; b: number } {
  if (!deg && satScale === 1) return { ...rgb }
  const { r, g, b } = rgb
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  // Grey has no hue to rotate, and scaling a saturation of zero is still zero.
  // Returning it unchanged is right, and it avoids a 0/0 below.
  if (d === 0) return { r, g, b }

  let h: number
  if (max === r) h = ((g - b) / d) % 6
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  h = (((h * 60 + deg) % 360) + 360) % 360

  const s = clamp01((max === 0 ? 0 : d / max) * satScale)
  const v = max
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  const seg = Math.floor(h / 60) % 6
  const table: Array<[number, number, number]> = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ]
  const [rr, gg, bb] = table[seg]
  return { r: rr + m, g: gg + m, b: bb + m }
}
