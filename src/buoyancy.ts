/*#
# buoyancy

**Falling in water is not falling in air.** The pure vertical model behind the
biped's swimming: how fast a body sinks, why it comes back up, and where it
settles. Babylon-free, deterministic, unit tested.

## Why a model rather than a constant

The obvious version — "use a smaller gravity underwater" — sinks you forever,
just slowly. What actually happens is that a body is slightly **less dense than
water**, so it is pushed up in proportion to how much of it is submerged, and it
comes to rest at the depth where that push balances its weight. That is one
equation, and everything readable falls out of it for free:

- Drop in from a height and you plunge, decelerate hard, and **bob back up**.
- Settle and your head is out of the water, because equilibrium is at partial
  submersion — not because anything targets a head height.
- Wade in from a beach and nothing happens until the water is deep enough to
  lift you, because the push scales with submersion.

Aiming at a target depth instead would have to special-case every one of those.

## The numbers, and what they mean

`buoyancy` is the ratio of the upward push at FULL submersion to weight. Above 1
you float, and the equilibrium submersion is `1 / buoyancy` — so the default
`1.15` rests with about 87% of you under, which is roughly a person treading
water. Below 1 you sink forever, which is the honest way to model armour, and
`waterDrag` then sets how fast.

Drag is quadratic, so terminal speed is `sqrt(|a| / drag)` — the default gives
about 1.5 m/s sinking, an order slower than the ~20 m/s of a fall through air.
Slow enough to see, fast enough not to feel broken.
*/
/*{ "parent": "Effects" }*/

export interface BuoyancyParams {
  /** Metres per second squared, negative. Default −9.81. */
  gravity?: number
  /**
   * Upward push at FULL submersion, as a multiple of weight. `> 1` floats,
   * `< 1` sinks. Equilibrium submersion is `1 / buoyancy`. Default 1.15.
   */
  buoyancy?: number
  /** Quadratic drag through water. Much higher than air. Default 4. */
  waterDrag?: number
  /** Quadratic drag through air, for the part of you that is out. Default 0.02. */
  airDrag?: number
  /**
   * Vertical thrust, m/s², signed (positive up) — a swimmer kicking. Added to
   * the acceleration, so it competes with buoyancy rather than overriding it:
   * stop kicking and physics takes over again. Default 0.
   */
  thrust?: number
}

/**
 * How much of a body of height `height`, standing with its feet at `feetY`, is
 * under a surface at `surfaceY`. `0` = dry, `1` = fully under.
 *
 * Clamped both ends, so a caller can hand it any geometry — including a body
 * above the water, which is the common case and must cost nothing.
 */
export function submergedFraction(
  feetY: number,
  height: number,
  surfaceY: number
): number {
  if (height <= 0) return feetY <= surfaceY ? 1 : 0
  const under = (surfaceY - feetY) / height
  return under <= 0 ? 0 : under >= 1 ? 1 : under
}

/**
 * Advance vertical velocity by one step. Returns the new velocity (m/s, up
 * positive) — the caller integrates position, so this composes with whatever
 * else is moving the body.
 *
 * Drag is blended by submersion rather than switched, so crossing the surface
 * is continuous. A hard switch put a step change in the acceleration exactly at
 * the waterline, which reads as a bounce off the surface — the same "kill the
 * discontinuity, not the contrast" lesson the underwater fog learned.
 */
export function buoyantStep(
  vy: number,
  submerged: number,
  dt: number,
  params: BuoyancyParams = {}
): number {
  const {
    gravity = -9.81,
    buoyancy = 1.15,
    waterDrag = 4,
    airDrag = 0.02,
    thrust = 0,
  } = params
  if (dt <= 0) return vy
  const s = submerged <= 0 ? 0 : submerged >= 1 ? 1 : submerged
  // Weight always; the push scales with how much of you is in the water. Thrust
  // only works against something to push on, so it scales with submersion too —
  // kicking in mid-air should not launch you.
  const accel = gravity + -gravity * buoyancy * s + thrust * s
  const drag = airDrag + (waterDrag - airDrag) * s
  const next = vy + accel * dt
  // Drag opposes motion and is applied on the NEW speed, which keeps it stable
  // at large dt instead of overshooting into an oscillation.
  return next - drag * Math.abs(next) * next * dt
}

/**
 * The submersion at which the push balances the weight — where a body floating
 * freely comes to rest. `1` (fully under, i.e. it sinks) when `buoyancy <= 1`.
 */
export function equilibriumSubmersion(buoyancy = 1.15): number {
  return buoyancy <= 1 ? 1 : 1 / buoyancy
}

/**
 * Is this body swimming rather than standing?
 *
 * Swimming is **deep enough AND not resting on the floor**. Note the second
 * term carefully: it is _resting on_, not _within reach of_. Those differ, and
 * the difference is the whole behaviour — a body in six metres of water is
 * floating whether or not its feet could touch the bottom, because buoyancy has
 * already lifted it off. Asking "is there ground below me?" instead left a
 * character standing on the seabed under six metres of water, technically
 * grounded and visibly wrong.
 *
 * So the caller integrates buoyancy first and passes what actually happened.
 * The floor is a floor — it stops you sinking; it does not hold you down.
 */
export function isSwimming(
  submerged: number,
  restingOnFloor: boolean,
  wasSwimming = false
): boolean {
  if (restingOnFloor) return false
  /*
  HYSTERESIS, and it is a concession worth naming.

  MOBILITY-DESIGN.md argues that modes should be DERIVED rather than entered,
  and lists exactly this as what would falsify it: "if deriving cover every
  frame proves too noisy — flickering in and out at a boundary — then it needs
  hysteresis, and hysteresis is a state." It fired here first. Walking down a
  ramp into water, submersion hovers around the threshold and the character
  flickers between swimming and standing — Tonio: "there's sometimes a twitch
  and you go back to standing as you ramp into water."

  So: enter swimming at 0.5, keep it until 0.35. One bit of state, and the
  narrowest kind — it changes when you SWITCH, never what you can do. The
  broader claim survives with a caveat rather than intact, which is worth more
  than pretending the falsifier did not fire.
  */
  return submerged >= (wasSwimming ? 0.35 : 0.5)
}

/**
 * **Buoyancy for a swimmer, which is not buoyancy for a floating body.**
 *
 * A relaxed body corks to the surface; a diver holds depth. Both are true — the
 * difference is that a swimmer manages it (exhaling, finning) and a log does
 * not. So once your head is properly under, buoyancy blends from the floating
 * value toward `neutral`, which is set **just above 1 on purpose**: hold still
 * underwater and you drift slowly up, so you surface if you stop paying
 * attention, but you do not cork the moment you stop kicking.
 *
 * Tonio chose the behaviour: _"holding with a slow drift upward by default."_
 * Games usually hold depth and real bodies cork; holding is the comfortable
 * choice and the drift is what keeps it honest.
 *
 * `headDepth` is how far the TOP of the body is below the surface — negative
 * while any part is still out. The blend is over half a metre so breaking the
 * surface is continuous, for the same reason the drag blend is.
 */
export function swimBuoyancy(
  headDepth: number,
  params: { buoyancy?: number; neutral?: number; blend?: number } = {}
): number {
  const { buoyancy = 1.15, neutral = 1.02, blend = 0.5 } = params
  if (headDepth <= 0) return buoyancy
  const t = blend <= 0 ? 1 : Math.min(1, headDepth / blend)
  return buoyancy + (neutral - buoyancy) * t
}
