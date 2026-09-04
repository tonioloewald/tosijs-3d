/*#
# Light programs

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

## Inverted splits collapse — a specified contract, not an accident

If `sustainEnd` precedes `attackEnd` (only reachable by hand-editing a file —
the editor clamps a drag so it cannot happen), the sustain segment **collapses to
zero width at `attackEnd`**: the lamp plays its attack, then holds at
`attackEnd` for as long as it is on, then plays the decay from `sustainEnd`.

Stated here because ensemble's validator calls this a WARNING rather than an
error, and that is only correct while the behaviour is deterministic and
specified. Their condition, and it is a fair one: _"if it were unspecified —
different results across versions or platforms — it should be an error, because
then the document really does not mean one thing."_ So this paragraph is part of
the contract, and changing what the collapse does is a breaking change.

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
| `saturation` | **multiplies** saturation — `0` is white, `saturationScale` sets what `1` means | saturation has a meaningful zero and reaching it is the point |
| `hue` | **shifts** the base hue, `0.5` = unchanged, scaled by `hueShiftDeg` | hue is circular with no meaningful zero, so an absolute mapping would discard the colour you chose |

**A pale lamp cannot be reddened by hue alone.** Rotating a hue preserves
saturation, so `#cfe8ff` — saturation 0.19 — becomes a pale orange however far
you turn it. To make a washed-out tube die as a red ember you have to raise
saturation too, which needs `saturationScale` above 1, because the curve itself
is `[0,1]` and can only desaturate. Found by measuring a demo that looked wrong:
the light reported `[1, 0.92, 0.87]`, which is warm white.

**The hue shift is RELATIVE, and that catches people.** "Fade out and go red" is
a small shift from a warm white and a very large one from a cool one: `#cfe8ff`
sits near 207°, so a plausible-looking `hueShiftDeg: 45` takes a dying
fluorescent to *cyan* — it needs about 190 to reach amber. Caught on the live
page doing exactly that. The default 30 is for leaning, not for changing a
lamp's mind.

## Duration: one number, divided by the markers

The split points already say how the time divides, so stating it three times is
three chances to disagree. `duration` is the whole curve's time and each segment
takes the share it occupies — `attackEnd: 0.2, duration: 1` is a 0.2s attack.
Dragging a marker therefore **retimes the lamp without touching a number**, which
is what makes the marker feel like it edits the behaviour rather than the shape.

`attack` / `period` / `decay` still override individually, because "a slow fade
off a fast strike" is a real lamp and a proportion cannot express it.

`DEFAULT_PROGRAM` is up fast, hold, down fast, in one second — a lamp with no
program switches instantly, which is right for a torch and wrong for nearly
everything else.

## Presets

`lightPresets` / `lightPreset(name)`: **steady**, **fluorescent**, **flickery**,
**brownout**, **candle**, **fireplace**.

They are BRIGHTNESS-first on purpose. Colour belongs to the lamp — a candle is
warm because its `diffuse` is warm — so a preset that forced hue would fight the
thing it decorates and stop composing with any base colour. The two that do
touch colour only lean it: a brownout pulls warm because a filament does when
the voltage sags, and a fire runs yellower in its flares and redder in its lulls.

Their irregularity comes from dissimilar peaks over a period that is not a round
number — never from randomness, which would cost repeatability, editability and
testability at once.

## Flicker is a curve, not a random number

A stepped curve strobes. A spiky attack segment is a fluorescent striking. A slow
`easeInOut` sustain is a beacon. All authored, repeatable, and editable in
[[curve-field|curve3d]] — where a `Math.random()` flicker would be none of those,
and would break the no-`Math.random` rule that makes this testable at all.

For flicker that should not read as periodic, give the sustain segment several
dissimilar peaks and a period that is not a round number.
*/
/*{ "parent": "Effects", "order": 120 }*/

import {
  canonicalCurve,
  curveSchema,
  evaluateCurve,
  validateCurve,
  type ControlPoint,
  type CurveIssue,
} from './curve.js'

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
  /**
   * Saturation, as a fraction of `saturationScale`. `1` as declared (at the
   * default scale), `0` washes to white.
   */
  saturation?: ModulationCurve
  /**
   * What the `saturation` curve's `1.0` means, as a multiplier. Default `1`.
   *
   * Exists because a curve is `[0,1]`, so on its own the channel can only ever
   * DESATURATE — and that makes "a pale tube dies as a red ember" impossible to
   * express. `#cfe8ff` carries a saturation of 0.19, and rotating its hue
   * preserves that, so it becomes a pale orange however far you turn it.
   * Caught on the live demo doing exactly that: the light that looked red was
   * emitting warm white.
   *
   * Set it above 1 to let the curve saturate as well as wash out. The default
   * keeps the curve the multiplier directly, so nothing changes for anyone.
   */
  saturationScale?: number
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
  /**
   * Seconds for the WHOLE curve, from which the three segment times derive.
   *
   * The split points already say how the time divides, so stating it three
   * times is three chances to disagree: with `duration`, a segment lasts in
   * proportion to how much of the curve it occupies. `attackEnd: 0.2` and
   * `duration: 1` gives a 0.2s attack, and dragging the marker retimes the lamp
   * without touching a number — which is what makes the marker feel like it is
   * editing the behaviour rather than just the shape.
   *
   * `attack` / `period` / `decay` override it individually where a segment
   * genuinely needs its own clock (a slow fade off a fast strike).
   */
  duration?: number
  /** Seconds to play the attack segment once, on switch-on. Overrides `duration`. */
  attack?: number
  /** Seconds for ONE pass of the sustain segment. `0` holds at `attackEnd`. */
  period?: number
  /** Seconds to play the decay segment once, on switch-off. Overrides `duration`. */
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
  const t = segmentTimes(p)
  const hasClock = t.attack > 0 || t.period > 0 || t.decay > 0
  const hasCurve =
    p.brightness != null ||
    p.range != null ||
    p.saturation != null ||
    p.hue != null
  return hasClock && hasCurve
}

/**
 * The three segment times, with `duration` divided by the split points.
 *
 * Proportional rather than equal shares: a segment occupying a fifth of the
 * curve takes a fifth of the time, so the drawing and the timing cannot
 * disagree — and dragging a marker retimes the lamp without touching a number,
 * which is what makes the marker feel like it edits the BEHAVIOUR and not just
 * the shape.
 *
 * An explicit `attack`/`period`/`decay` wins, because "a slow fade off a fast
 * strike" is a real lamp and a proportion cannot express it.
 */
export function segmentTimes(p: LightProgram | null | undefined): {
  attack: number
  period: number
  decay: number
} {
  if (p == null) return { attack: 0, period: 0, decay: 0 }
  const { a, b } = splits(p)
  const d = p.duration ?? 0
  return {
    attack: p.attack ?? d * a,
    period: p.period ?? d * (b - a),
    decay: p.decay ?? d * (1 - b),
  }
}

/**
 * Split points, ordered and clamped, so a bad pair cannot invert a segment.
 *
 * The collapse is SPECIFIED (see the doc above): an inverted pair yields a
 * zero-width sustain at `attackEnd`, deterministically. That is what lets
 * ensemble's validator report it as a warning rather than refusing the
 * document.
 */
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
  const t = segmentTimes(p)
  if (on) {
    return t.attack > 0 && sinceChange < t.attack ? 'attack' : 'sustain'
  }
  return t.decay > 0 && sinceChange < t.decay ? 'decay' : 'off'
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
  const times = segmentTimes(p)
  const phase = lightPhase(p, on, sinceChange)
  if (phase === 'off') return null
  if (phase === 'attack') {
    return Math.min(1, sinceChange / (times.attack || 1)) * a || 0
  }
  if (phase === 'decay') {
    const t = Math.min(1, sinceChange / (times.decay || 1))
    return b + t * (1 - b)
  }
  // Sustain. With no period, or no segment to loop over, hold where the attack
  // left off — which IS the sustain level, by construction.
  const period = times.period
  if (!(period > 0) || b <= a) return a
  const since = sinceChange - times.attack
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
    saturation:
      Math.max(0, sampleCurve(p!.saturation, at, 1)) *
      (p!.saturationScale ?? 1),
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

/**
 * JSON Schema for a whole `LightProgram`, as ONE field.
 *
 * Marked with `x-widget: 'light-program'` so a generated panel hands the entire
 * object to one editor rather than rendering six siblings.
 *
 * The token names the LIGHT, not the mechanism. `curve-program` was the obvious
 * name and the wrong one: it sounds like "any program of curves" while meaning
 * one specific object with brightness/hue/saturation/range channels — and the
 * province editor coming next is also several curves over one coordinate, so
 * the generic name would have been taken by the specific case. A widget token
 * is a WIRE CONTRACT with the consumer's schema, so this was free to fix before
 * ensemble shipped a branch on it and a breaking change afterwards. Ensemble confirmed
 * their `schemaWidgets` dispatches on the widget token BEFORE any type-based
 * branch, so an `object`-typed property takes the same path an `array`-typed one
 * already does.
 *
 * One field, not six, for a reason worth restating: `attackEnd`/`sustainEnd` are
 * shared by every channel, so six sibling fields would let brightness and hue be
 * edited into disagreement about where the attack ends — a program the runtime
 * cannot run. Ensemble's rule is that the JSON is the truth, and a truth that
 * cannot be executed is worse than a coarser panel. It also makes one gesture
 * one commit, rather than six callbacks nobody can tell belonged together.
 */
export function lightProgramSchema(
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  const channel = (title: string, kind: 'profile' | 'falloff' = 'profile') => ({
    ...curveSchema(kind),
    title,
  })
  return {
    type: 'object',
    title: 'Light program',
    properties: {
      brightness: channel('Brightness'),
      hue: channel('Hue'),
      saturation: channel('Saturation'),
      range: channel('Range'),
      hueShiftDeg: { type: 'number', title: 'Hue shift', 'x-unit': 'deg' },
      attackEnd: { type: 'number', minimum: 0, maximum: 1 },
      sustainEnd: { type: 'number', minimum: 0, maximum: 1 },
      attack: { type: 'number', minimum: 0, 'x-unit': 's' },
      period: { type: 'number', minimum: 0, 'x-unit': 's' },
      decay: { type: 'number', minimum: 0, 'x-unit': 's' },
      phase: { type: 'number', minimum: 0, maximum: 1 },
    },
    'x-widget': 'light-program',
    ...extra,
  }
}

/**
 * The non-curve fields of a program, in the order a diff reads best.
 *
 * ONE list, used by the canonical form — because it was two lists and they
 * disagreed. `duration` was added to `LightProgram` after `canonicalProgram`
 * was written and never added here, so committing an edit silently dropped it,
 * `isAnimated` went false, and a flickering lamp came back on STEADY. Tonio hit
 * it twice before it was reproducible, which is what a silent drop buys you.
 */
const PROGRAM_SCALARS = [
  'hueShiftDeg',
  'saturationScale',
  'attackEnd',
  'sustainEnd',
  'duration',
  'attack',
  'period',
  'decay',
  'phase',
] as const

/** Canonical bytes for a program: every curve rounded, keys in a fixed order. */
export function canonicalProgram(p: LightProgram): LightProgram {
  const out: LightProgram = {}
  for (const k of ['brightness', 'hue', 'saturation', 'range'] as const) {
    const c = p[k]
    if (c == null) continue
    out[k] = typeof c === 'number' ? c : canonicalCurve(c)
  }
  // Numbers after curves, and in the order they appear in the timeline, so a
  // diff reads the way the lamp behaves.
  for (const k of PROGRAM_SCALARS) {
    if (p[k] != null) out[k] = Math.round(p[k]! * 1e4) / 1e4 + 0
  }
  return out
}

/** Report what is wrong with a program without throwing or fixing it. */
export function validateProgram(value: unknown): CurveIssue[] {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    return [
      {
        severity: 'error',
        code: 'light-program/not-an-object',
        message: 'A light program is an object of curves and timings.',
        path: '',
      },
    ]
  }
  const p = value as Record<string, unknown>
  const issues: CurveIssue[] = []
  for (const k of ['brightness', 'hue', 'saturation', 'range']) {
    const c = p[k]
    if (c == null || typeof c === 'number') continue
    for (const i of validateCurve(c)) {
      issues.push({ ...i, path: `/${k}${i.path}` })
    }
  }
  const a = typeof p.attackEnd === 'number' ? p.attackEnd : 0
  const b = typeof p.sustainEnd === 'number' ? p.sustainEnd : 1
  if (b < a) {
    // A warning, not an error: `splits()` collapses it rather than running the
    // sustain backwards through the attack, so the program still runs.
    issues.push({
      severity: 'warning',
      code: 'light-program/inverted-splits',
      message: `sustainEnd (${b}) precedes attackEnd (${a}); the sustain will collapse.`,
      path: '/sustainEnd',
    })
  }
  for (const k of ['attack', 'period', 'decay']) {
    const v = p[k]
    if (v != null && (typeof v !== 'number' || !(v >= 0))) {
      issues.push({
        severity: 'error',
        code: 'light-program/bad-duration',
        message: `${k} must be a number of seconds, zero or more.`,
        path: `/${k}`,
      })
    }
  }
  return issues
}

// --- Presets ----------------------------------------------------------------

/**
 * What a lamp does if you say nothing: up fast, hold, down fast, in a second.
 *
 * A lamp with NO program switches instantly, which is right for a torch and
 * wrong for almost everything else — real lights take a moment, and the moment
 * is most of what makes them read as objects rather than as settings. One
 * second is short enough to feel responsive and long enough to see.
 *
 * The steep-then-flat-then-steep shape is deliberate: the attack and decay
 * occupy a tenth of the curve each, so at `duration: 1` they take 0.1s and the
 * sustain owns the rest.
 */
export const DEFAULT_PROGRAM: LightProgram = {
  brightness: [
    { x: 0, y: 0 },
    { x: 0.1, y: 1 },
    { x: 0.9, y: 1 },
    { x: 1, y: 0 },
  ],
  attackEnd: 0.1,
  sustainEnd: 0.9,
  duration: 1,
}

/** A named program, in the shape `curve.ts`'s presets already use. */
export interface LightPreset {
  name: string
  /** One line on what it is FOR, for a picker that has room. */
  hint: string
  build: () => LightProgram
}

/*
The presets are BRIGHTNESS-first on purpose.

Colour belongs to the lamp — a candle is warm because its `diffuse` is warm —
so a preset that forced hue would fight the thing it is decorating and stop
composing with any base colour. The two that do touch colour (candle, fireplace)
only lean it, and only while burning.

Irregularity comes from dissimilar peaks over a period that is not a round
number, never from randomness: these have to be repeatable, editable in the
curve widget, and testable, and `Math.random` would cost all three.
*/
export const lightPresets: LightPreset[] = [
  {
    name: 'steady',
    hint: 'up fast, hold, down fast — the default',
    build: () => ({ ...DEFAULT_PROGRAM }),
  },
  {
    name: 'fluorescent',
    hint: 'strikes in stutters, hums, dies red',
    build: () => ({
      brightness: [
        { x: 0, y: 0 },
        { x: 0.06, y: 0.85 },
        { x: 0.1, y: 0.05 },
        { x: 0.17, y: 1 },
        { x: 0.23, y: 0.08 },
        { x: 0.3, y: 0.95 },
        { x: 0.35, y: 1 },
        { x: 0.45, y: 0.93 },
        { x: 0.52, y: 1 },
        { x: 0.63, y: 0.9 },
        { x: 0.75, y: 1 },
        { x: 0.8, y: 0.34 },
        { x: 0.95, y: 0.26 },
        { x: 1, y: 0 },
      ],
      hue: [
        { x: 0, y: 0.5 },
        { x: 0.75, y: 0.5 },
        { x: 0.85, y: 0.04 },
        { x: 1, y: 0 },
      ],
      saturation: [
        { x: 0, y: 0.2 },
        { x: 0.75, y: 0.2 },
        { x: 0.9, y: 1 },
        { x: 1, y: 1 },
      ],
      saturationScale: 5,
      hueShiftDeg: 190,
      attackEnd: 0.35,
      sustainEnd: 0.75,
      attack: 1.3,
      period: 3,
      decay: 3.2,
    }),
  },
  {
    name: 'flickery',
    hint: 'a bad connection — never quite steady',
    build: () => ({
      brightness: [
        { x: 0, y: 0 },
        { x: 0.08, y: 1 },
        { x: 0.14, y: 0.62 },
        { x: 0.19, y: 1 },
        { x: 0.31, y: 0.95 },
        { x: 0.36, y: 0.35 },
        { x: 0.4, y: 1 },
        { x: 0.55, y: 0.88 },
        { x: 0.61, y: 1 },
        { x: 0.68, y: 0.45 },
        { x: 0.72, y: 0.98 },
        { x: 0.85, y: 1 },
        { x: 1, y: 0 },
      ],
      attackEnd: 0.08,
      sustainEnd: 0.85,
      // 0.7s, not 1 — a period that is not a round number is what stops the
      // eye finding the loop.
      duration: 0.7,
    }),
  },
  {
    name: 'brownout',
    hint: 'sags and recovers, like a grid under load',
    build: () => ({
      brightness: [
        { x: 0, y: 0 },
        { x: 0.06, y: 1 },
        { x: 0.25, y: 0.98 },
        { x: 0.38, y: 0.42 },
        { x: 0.46, y: 0.38 },
        { x: 0.58, y: 0.95 },
        { x: 0.72, y: 1 },
        { x: 0.8, y: 0.55 },
        { x: 0.9, y: 1 },
        { x: 1, y: 0 },
      ],
      // The sag pulls warm, the way an incandescent filament does when the
      // voltage drops — the physical reason a brownout looks orange.
      hue: [
        { x: 0, y: 0.5 },
        { x: 0.38, y: 0.18 },
        { x: 0.58, y: 0.5 },
        { x: 1, y: 0.5 },
      ],
      hueShiftDeg: 25,
      attackEnd: 0.06,
      sustainEnd: 0.9,
      duration: 6,
    }),
  },
  {
    name: 'candle',
    hint: 'small, quick, restless',
    build: () => ({
      brightness: [
        { x: 0, y: 0 },
        { x: 0.12, y: 0.92 },
        { x: 0.2, y: 1 },
        { x: 0.28, y: 0.86 },
        { x: 0.35, y: 0.97 },
        { x: 0.44, y: 0.8 },
        { x: 0.52, y: 1 },
        { x: 0.61, y: 0.88 },
        { x: 0.7, y: 0.96 },
        { x: 0.82, y: 0.84 },
        { x: 0.9, y: 0.95 },
        { x: 1, y: 0 },
      ],
      hue: [
        { x: 0, y: 0.5 },
        { x: 0.44, y: 0.62 },
        { x: 0.7, y: 0.44 },
        { x: 0.9, y: 0.58 },
        { x: 1, y: 0.5 },
      ],
      hueShiftDeg: 12,
      attackEnd: 0.12,
      sustainEnd: 0.9,
      duration: 2.3,
    }),
  },
  {
    name: 'fireplace',
    hint: 'slower and deeper than a candle, with flares',
    build: () => ({
      brightness: [
        { x: 0, y: 0 },
        { x: 0.09, y: 0.7 },
        { x: 0.17, y: 0.55 },
        { x: 0.26, y: 1 },
        { x: 0.34, y: 0.62 },
        { x: 0.43, y: 0.78 },
        { x: 0.5, y: 0.5 },
        { x: 0.59, y: 0.86 },
        { x: 0.67, y: 0.58 },
        { x: 0.76, y: 1 },
        { x: 0.85, y: 0.64 },
        { x: 0.92, y: 0.75 },
        { x: 1, y: 0 },
      ],
      hue: [
        { x: 0, y: 0.5 },
        { x: 0.26, y: 0.66 },
        { x: 0.5, y: 0.38 },
        { x: 0.76, y: 0.68 },
        { x: 0.92, y: 0.46 },
        { x: 1, y: 0.5 },
      ],
      // A fire's colour moves with its brightness — the flares run yellower,
      // the lulls redder — so the saturation follows the dips rather than
      // sitting flat.
      saturation: [
        { x: 0, y: 1 },
        { x: 0.26, y: 0.8 },
        { x: 0.5, y: 1.0 },
        { x: 0.76, y: 0.78 },
        { x: 1, y: 1 },
      ],
      saturationScale: 1.4,
      hueShiftDeg: 20,
      attackEnd: 0.09,
      sustainEnd: 0.92,
      duration: 4.7,
    }),
  },
]

/** Look one up by name. Unknown names give `undefined` rather than throwing. */
export function lightPreset(name: string): LightProgram | undefined {
  return lightPresets.find((p) => p.name === name)?.build()
}
