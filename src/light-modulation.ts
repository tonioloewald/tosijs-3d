/*#
# light-modulation

**A light that changes over time, described as curves over a period.** Pure,
deterministic, Babylon-free — the model behind [[b3d-lamp]]'s flicker, pulse,
beacon and colour-cycle.

## One period, one phase, three channels

A modulation is a `period` in seconds and up to three curves from
[[curve|curve.ts]] — the same `[0,1] → [0,1]` control-point curves the province
editor edits, so the curve widget is already the editor for this. Time becomes a
phase (`t / period`, wrapped), each curve is sampled at that phase, and the
result is applied to the light.

Because phase is derived from absolute time rather than accumulated per frame, a
lamp does not drift, two lamps given the same period stay in step, and a frame
hitch changes nothing. Determinism is the point: same time in, same light out.

## The channels do NOT share a convention, deliberately

| channel | curve value means | why |
| --- | --- | --- |
| `brightness` | **multiplies** the base intensity — `0` is off, `1` is as declared | "off" has to be reachable, and it is the value you flicker to |
| `range` | **multiplies** the base range — `0` collapses the falloff | same shape as brightness; a range of zero is a light that lights nothing |
| `hue` | **shifts** the base hue, `0.5` = unchanged, scaled by `hueShiftDeg` | hue is circular and has no meaningful zero, so an absolute mapping would throw away the colour you chose |

**The hue shift is RELATIVE, and that has a consequence worth stating.** "Fade
out and go red" is a small shift from a warm white and a very large one from a
cool one: `#cfe8ff` sits near 207°, so a plausible-looking `hueShiftDeg: 45`
takes a dying fluorescent to *cyan*, not red — it needs about 190 to travel
round to amber. Caught in the shipped demo, on the live page, doing exactly
that. Check where your base colour actually is before picking an amplitude;
the default 30 is for leaning, not for changing a lamp's mind.

Mixing conventions looks careless until you try the alternatives. A
*multiplicative* hue is meaningless (hue 0 is red, not "no hue"). An
*absolute* brightness curve cannot express "flicker around whatever the
designer set" without restating the intensity inside the curve. The bipolar
`0.5`-is-neutral form for `hue` is the same convention provinces use for their
water/temperature/volcanism channels, so it is not a new idea to learn.

## Flicker is a curve, not a random number

A stepped curve strobes. A short period with a spiky curve is a failing
fluorescent. A slow `easeInOut` is a beacon. All of it is authored, repeatable,
and editable in the curve widget — where a `Math.random()` flicker would be none
of those, and would also break the "no `Math.random` in a pure model" rule that
makes this testable at all.

For flicker that should NOT look periodic, give a curve with several dissimilar
peaks and a period that is not a round number; the eye reads a long
non-obvious cycle as irregular.
*/
/*{ "parent": "Effects", "order": 120 }*/

import { evaluateCurve, type ControlPoint } from './curve'

/** A curve, or a flat value. A number is the constant curve at that value. */
export type ModulationCurve = ControlPoint[] | number

/**
 * The three channels, without saying WHEN they are sampled.
 *
 * Shared by the looping modulation and by each end of the envelope, so
 * "brightness multiplies, hue shifts about 0.5" is learned once and true
 * everywhere — a turn-on ramp and a steady flicker are the same vocabulary
 * pointed at different clocks.
 */
export interface ChannelCurves {
  /** Multiplies intensity. `0` off, `1` as declared. */
  brightness?: ModulationCurve
  /** Multiplies range/falloff distance. */
  range?: ModulationCurve
  /** Bipolar hue shift: `0.5` unchanged, `0` is `-hueShiftDeg`, `1` is `+hueShiftDeg`. */
  hue?: ModulationCurve
  /** How far the `hue` curve can push, in degrees. Default 30. */
  hueShiftDeg?: number
}

export interface LightModulation extends ChannelCurves {
  /**
   * Seconds for one full pass through the curves. `0` or absent disables
   * modulation entirely (the light sits at its declared values).
   */
  period?: number
  /**
   * Where in the cycle this lamp starts, in turns (`0.5` is half a period in).
   *
   * This is what stops a row of identical lamps pulsing as one organism —
   * give each a different phase and the same three lines of config become a
   * crowd rather than a chorus.
   */
  phase?: number
}

/**
 * A one-shot shape for turning ON and turning OFF, wrapped around the loop.
 *
 * Tonio: _"you can have lights that flicker to life and then fade slowly and go
 * red."_ That is three different clocks in one sentence — a turn-on transient,
 * a steady state, and a turn-off transient — and only the middle one repeats.
 *
 * The envelope MULTIPLIES the loop (and its hue shift ADDS), rather than
 * replacing it. That is what makes "a flickering lamp being switched off" a
 * composition instead of a fourth case: the flicker keeps flickering while the
 * fade takes it down, which is what a dying fluorescent actually does. Replacing
 * would make the flicker vanish the instant you hit the switch.
 */
export interface LightEnvelope {
  /** Seconds to come up. Absent or `0` means instantly on. */
  attack?: number
  /** Seconds to fade out. Absent or `0` means instantly off. */
  decay?: number
  /** Shape of the rise. Default is a linear ramp; give a spiky curve to flicker to life. */
  attackCurves?: ChannelCurves
  /** Shape of the fall. Default is a linear fade; add a `hue` curve to go red as it dies. */
  decayCurves?: ChannelCurves
}

/** Which clock is governing right now. */
export type LightPhase = 'attack' | 'sustain' | 'decay' | 'off'

/** What a modulation says the light should be doing right now. */
export interface ModulationSample {
  /** Multiplier for intensity, `>= 0`. */
  brightness: number
  /** Multiplier for range, `>= 0`. */
  range: number
  /** Hue shift in degrees, signed. */
  hueShiftDeg: number
}

/** The identity sample — what an unmodulated light gets. */
export const NO_MODULATION: ModulationSample = {
  brightness: 1,
  range: 1,
  hueShiftDeg: 0,
}

const DEFAULT_HUE_SHIFT = 30

/**
 * Phase for a time, in `[0, 1)`.
 *
 * Derived from absolute time, never accumulated — accumulation drifts, and two
 * lamps that should be in step would slowly separate for no reason a user could
 * see or fix. A non-finite or non-positive period is "not modulating", which is
 * the honest answer for `period: 0`.
 */
export function modulationPhase(
  timeSeconds: number,
  period: number,
  phaseOffset = 0
): number {
  if (!(period > 0) || !Number.isFinite(period)) return 0
  const raw = timeSeconds / period + phaseOffset
  // `%` keeps the sign of the dividend, so a negative time (or a negative
  // phase offset, which is a legitimate way to say "start earlier") would land
  // outside [0,1) and read off the wrong end of the curve.
  return ((raw % 1) + 1) % 1
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
 * Sample a modulation at a time, in seconds.
 *
 * ```js
 * const flicker = { period: 0.7, brightness: stepped(3) }
 * sampleModulation(flicker, scene.getEngine().getTimeStep() * frame)
 * ```
 *
 * Always returns a usable sample: an absent modulation, a zero period and an
 * empty curve all resolve to the identity rather than to a dark light. A light
 * that goes black because its configuration was incomplete is indistinguishable
 * from one that is broken.
 */
export function sampleModulation(
  mod: LightModulation | null | undefined,
  timeSeconds: number
): ModulationSample {
  if (mod == null || !(mod.period ?? 0)) return NO_MODULATION
  const at = modulationPhase(timeSeconds, mod.period ?? 0, mod.phase ?? 0)
  const amp = mod.hueShiftDeg ?? DEFAULT_HUE_SHIFT
  return {
    // Clamped at zero, not at one: a curve is `[0,1]` by construction so it
    // cannot exceed the declared intensity, and that is the contract — the
    // declared value is the MAXIMUM, so a lamp never surprises you by getting
    // brighter than its own setting.
    brightness: Math.max(0, sampleCurve(mod.brightness, at, 1)),
    range: Math.max(0, sampleCurve(mod.range, at, 1)),
    // Bipolar around 0.5 — see the doc note on why this channel differs.
    hueShiftDeg: (sampleCurve(mod.hue, at, 0.5) - 0.5) * 2 * amp,
  }
}

/** Sample a `ChannelCurves` at a normalised position, with explicit fallbacks. */
function sampleChannels(
  c: ChannelCurves | undefined,
  at: number,
  fallbackBrightness: number,
  fallbackHue = 0.5
): ModulationSample {
  const amp = c?.hueShiftDeg ?? DEFAULT_HUE_SHIFT
  return {
    brightness: Math.max(0, sampleCurve(c?.brightness, at, fallbackBrightness)),
    range: Math.max(0, sampleCurve(c?.range, at, 1)),
    hueShiftDeg: (sampleCurve(c?.hue, at, fallbackHue) - 0.5) * 2 * amp,
  }
}

/**
 * Which phase a lamp is in, given whether it is switched on and how long since
 * that changed.
 *
 * `off` is distinct from `decay` so a lamp can stop doing per-frame work once
 * it has finished dying, rather than integrating a curve forever at zero.
 */
export function lightPhase(
  env: LightEnvelope | null | undefined,
  on: boolean,
  sinceChange: number
): LightPhase {
  if (on) {
    const attack = env?.attack ?? 0
    return attack > 0 && sinceChange < attack ? 'attack' : 'sustain'
  }
  const decay = env?.decay ?? 0
  return decay > 0 && sinceChange < decay ? 'decay' : 'off'
}

/**
 * The envelope's contribution on its own.
 *
 * Defaults are the obvious ones and exist so an envelope can be just two
 * numbers: with no curves, `attack` is a linear ramp up and `decay` a linear
 * fade down. `off` is hard zero — a lamp that is off is off, not "very dim".
 */
export function sampleEnvelope(
  env: LightEnvelope | null | undefined,
  on: boolean,
  sinceChange: number
): ModulationSample {
  const phase = lightPhase(env, on, sinceChange)
  if (phase === 'sustain') return NO_MODULATION
  if (phase === 'off') return { brightness: 0, range: 1, hueShiftDeg: 0 }
  if (phase === 'attack') {
    const t = Math.min(1, sinceChange / (env?.attack ?? 1))
    // Fallback `t`: with no curve the ramp IS the phase position.
    return sampleChannels(env?.attackCurves, t, t)
  }
  const t = Math.min(1, sinceChange / (env?.decay ?? 1))
  // A decay curve is read left-to-right like any other, so its own shape says
  // how it falls — `1 - t` is only the FALLBACK, for an envelope given no curve.
  return sampleChannels(env?.decayCurves, t, 1 - t)
}

/**
 * Everything at once: the loop, shaped by the envelope. This is what a lamp
 * calls each frame.
 *
 * ```js
 * // A tube that stutters on, hums, then dies down to an ember.
 * const mod = { period: 0.12, brightness: stepped(3) }
 * const env = {
 *   attack: 1.2, attackCurves: { brightness: stepped(5) },
 *   decay: 2.5, decayCurves: { hue: constant(0), hueShiftDeg: 40 },
 * }
 * sampleLight(mod, env, { on, sinceChange, time })
 * ```
 *
 * Brightness and range multiply; hue shifts add. Multiplication is what makes
 * the composition read correctly — a lamp mid-flicker that gets switched off
 * keeps flickering as it fades, rather than the flicker disappearing at the
 * instant of the switch.
 */
export function sampleLight(
  mod: LightModulation | null | undefined,
  env: LightEnvelope | null | undefined,
  at: { on: boolean; sinceChange: number; time: number }
): ModulationSample {
  const e = sampleEnvelope(env, at.on, at.sinceChange)
  // Nothing to loop once it is fully off — and sampling the loop there would
  // only multiply by zero anyway.
  if (e.brightness === 0 && lightPhase(env, at.on, at.sinceChange) === 'off') {
    return e
  }
  const m = sampleModulation(mod, at.time)
  return {
    brightness: m.brightness * e.brightness,
    range: m.range * e.range,
    hueShiftDeg: m.hueShiftDeg + e.hueShiftDeg,
  }
}

/** Is there anything to do? Lets a lamp skip per-frame work entirely. */
export function isModulated(mod: LightModulation | null | undefined): boolean {
  if (mod == null || !(mod.period ?? 0)) return false
  return mod.brightness != null || mod.range != null || mod.hue != null
}

/**
 * Rotate a hue by `deg`, on colour components in `[0,1]`.
 *
 * Kept here rather than reaching for Babylon's `Color3.toHSV` so the whole
 * model stays engine-free and testable. Saturation and value are preserved, so
 * shifting a warm white stays a white — it just leans.
 */
export function shiftHue(
  rgb: { r: number; g: number; b: number },
  deg: number
): { r: number; g: number; b: number } {
  if (!deg) return { ...rgb }
  const { r, g, b } = rgb
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  // Grey has no hue to rotate. Returning it unchanged is right, and it also
  // avoids a 0/0 in the hue derivation below.
  if (d === 0) return { r, g, b }

  let h: number
  if (max === r) h = ((g - b) / d) % 6
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  h = (((h * 60 + deg) % 360) + 360) % 360

  const s = max === 0 ? 0 : d / max
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
