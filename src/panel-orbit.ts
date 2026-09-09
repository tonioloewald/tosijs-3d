/*#
# panel-orbit

**Where a spatial panel sits, and how dragging moves it.** Pure — no Babylon, no
DOM — so the placement rule can be tested without a headset.

A panel in a headset is parented to a reference frame at a fixed local offset:
rock-steady relative to you, and something you can point at. What it has not had
is a way to *move* it, so a panel seated above your eyeline had to be read by
looking up while you edited something below you.

## It rides a sphere

Tonio: *"Panel dragging seems simple enough. Drag it on the surface of a sphere
around its rig anchor."* That is the whole model, and it is worth saying why it
is better than the obvious alternative of dragging it on a plane:

| | on a sphere | free in space |
| --- | --- | --- |
| distance | **constant** — it cannot be shoved into your face or out of reach | drifts every drag |
| facing | falls out — it always looks back at the centre | needs its own billboard rule |
| what you control | two angles | six degrees of freedom, by accident |
| losing it | bounded by the clamps below | trivial |

So the state is two angles and a radius, the radius does not change while you
drag, and the panel re-aims at the anchor after every move. Nothing needs to
remember a pose.

## A limit you can feel, not one you hit

A hard stop is the right RESTING behaviour and the wrong LIVE one. The panel
simply stops following your hand, and in a headset — where the only feedback is
what you can see — that reads as a dropped drag rather than a limit. Tonio: *"It
could follow you and rubber band back."*

So a drag past a limit keeps following you and stiffens (`bandOrbit`,
`rubberBand`), and letting go springs back to the clamp (`clampOrbit`). The two
together are what make it a band rather than simply a bigger box: the panel may
PASS a limit, and may never come to REST past one.

`rubberBand` is `max · (1 - e^(-over/max))`, which earns its place over a linear
scale with a cap three times over — it starts at 1:1 so a small overshoot feels
like nothing unusual, it stiffens smoothly rather than arriving at a second hard
stop, and it asymptotes, so pulling harder never takes the panel anywhere new.

## The clamps exist because you cannot chase what you cannot see

`elevationDeg` stops short of straight up and well short of straight down, and
`azimuthDeg` stops before the panel goes behind you.

That is not tidiness. **The controls for recovering a lost panel are ON the
panel** — Exit VR and Re-seat live in its header — so a panel dragged behind
your shoulder is one you cannot reach the recovery button of. A clamp you
occasionally notice is much cheaper than a session you have to end by taking the
headset off.

Straight up is excluded for a second reason: azimuth is undefined at the pole,
so a drag through it would spin the panel around a direction you did not choose.
*/
/*{ "parent": "UI", "order": 172 }*/

/** A point in the anchor's local space. */
export interface OrbitVec3 {
  x: number
  y: number
  z: number
}

/**
 * A panel's seat on its sphere.
 *
 * `azimuthDeg` is 0 straight ahead and grows to the RIGHT; `elevationDeg` is 0
 * at eye level and grows UP. Degrees, per this library's convention — these are
 * authored and read by people.
 */
export interface Orbit {
  azimuthDeg: number
  elevationDeg: number
  radius: number
}

/**
 * Furthest up a panel may be dragged — and it is the DEFAULT SEAT exactly.
 *
 * Not a round number picked for symmetry. The XR panel is seated 60° up the
 * sight-line, and from the headset: *"It starts about as high as it should be
 * allowed."* So the ceiling is the seat, which also means the panel can only
 * ever be dragged somewhere more comfortable than where it began.
 *
 * (`tosi-b3d`'s `ELEV` is the other half of that pair. A test pins them equal,
 * because a seat that drifts above its own ceiling would be clamped on the
 * first drag and appear to jump.)
 */
export const ORBIT_MAX_ELEVATION = 60
/**
 * Furthest down. Deliberately further than the ceiling: looking down is
 * comfortable and looking up is not, so the band is asymmetric on purpose.
 */
export const ORBIT_MIN_ELEVATION = -70
/** Furthest to either side. Short of your shoulder line. */
export const ORBIT_MAX_AZIMUTH = 110

/**
 * How far past a limit a drag may VISIBLY stretch before it springs back.
 *
 * A hard stop is the right resting behaviour and the wrong live one: the panel
 * simply stops following your hand, which reads as a dropped drag rather than a
 * limit — and in a headset, where the only feedback is what you can see, there
 * is nothing else to tell you which it was. Tonio: *"It could follow you and
 * rubber band back."*
 *
 * So the band is feedback, not a wider clamp. It never becomes a place the
 * panel can rest.
 */
export const ORBIT_RUBBER_BAND = 18

const DEG = Math.PI / 180
const clamp = (v: number, lo: number, hi: number) =>
  v < lo ? lo : v > hi ? hi : v

/**
 * Hold a seat inside the reachable band.
 *
 * Radius is clamped positive rather than left alone: a zero or negative radius
 * puts the panel at the anchor's origin — inside your head — where it is both
 * unreadable and unpickable, and nothing downstream would report why.
 */
export function clampOrbit(o: Orbit): Orbit {
  return {
    azimuthDeg: clamp(o.azimuthDeg, -ORBIT_MAX_AZIMUTH, ORBIT_MAX_AZIMUTH),
    elevationDeg: clamp(
      o.elevationDeg,
      ORBIT_MIN_ELEVATION,
      ORBIT_MAX_ELEVATION
    ),
    radius: Math.max(0.1, o.radius),
  }
}

/**
 * The local position a seat puts the panel at.
 *
 * Forward is +Z, up is +Y, right is +X — the engine's frame, so the result
 * drops straight onto a `TransformNode.position`.
 */
export function orbitPosition(o: Orbit): OrbitVec3 {
  const az = o.azimuthDeg * DEG
  const el = o.elevationDeg * DEG
  const horiz = Math.cos(el) * o.radius
  return {
    x: Math.sin(az) * horiz,
    y: Math.sin(el) * o.radius,
    z: Math.cos(az) * horiz,
  }
}

/**
 * The seat a position corresponds to. Inverse of `orbitPosition`.
 *
 * A point at the origin has no direction, so it reports straight ahead rather
 * than whatever `atan2(0, 0)` happens to give — the same rule `windToPolar`
 * follows, and for the same reason: a bearing nobody chose flickers.
 */
export function orbitOf(p: OrbitVec3): Orbit {
  const radius = Math.hypot(p.x, p.y, p.z)
  if (radius < 1e-9) return { azimuthDeg: 0, elevationDeg: 0, radius: 0 }
  const horiz = Math.hypot(p.x, p.z)
  return {
    azimuthDeg: Math.atan2(p.x, p.z) / DEG,
    elevationDeg: Math.atan2(p.y, horiz) / DEG,
    radius,
  }
}

/**
 * Where a POINTING RAY lands on the sphere — the drag, done properly.
 *
 * ⚠️ NOT the ray's direction. The direction belongs to the CONTROLLER and the
 * sphere is centred on your HEAD, so applying one to the other treats your hand
 * as if it were at your eyes. The panel then sits where the arithmetic says
 * rather than where you are pointing, and every wobble of your hand swings it
 * by the whole offset between the two — which is what "jittery, and doesn't
 * track the cursor" was.
 *
 * The question is "where on my sphere am I pointing", so: take a point along
 * the ray at the sphere's radius, and ask which way THAT lies from the centre.
 * Both arguments are in the anchor's own space; the caller does the transform,
 * and must transform the origin as a POINT and the direction as a VECTOR —
 * using the same one for both is the same class of error again.
 */
export function orbitFromAim(
  rayOrigin: OrbitVec3,
  rayDirection: OrbitVec3,
  current: Orbit
): Orbit {
  const len = Math.hypot(rayDirection.x, rayDirection.y, rayDirection.z)
  if (!Number.isFinite(len) || len < 1e-9) return { ...current }
  const k = current.radius / len
  return orbitFromDirection(
    {
      x: rayOrigin.x + rayDirection.x * k,
      y: rayOrigin.y + rayDirection.y * k,
      z: rayOrigin.z + rayDirection.z * k,
    },
    current
  )
}

/**
 * One axis of the rubber band: how far past a limit an overshoot SHOWS.
 *
 * `max · (1 - e^(-over/max))`. Three properties earn it over a linear scale
 * with a cap: it starts at 1:1 so small overshoots feel like nothing unusual,
 * it stiffens smoothly rather than hitting a second hard stop, and it asymptotes
 * — pull as far as you like and the panel never runs away.
 */
export function rubberBand(over: number, max = ORBIT_RUBBER_BAND): number {
  if (!(max > 0) || !Number.isFinite(over)) return 0
  const sign = over < 0 ? -1 : 1
  return sign * max * (1 - Math.exp(-Math.abs(over) / max))
}

/**
 * A seat for LIVE DRAG feedback: inside the band it is exact, outside it
 * stretches and stiffens.
 *
 * Pair it with `clampOrbit` on release — that is what makes it a band rather
 * than a bigger box. A panel must never come to rest out here, because out here
 * is where its own recovery buttons are hard to reach.
 */
export function bandOrbit(o: Orbit): Orbit {
  const soften = (v: number, lo: number, hi: number) =>
    v > hi ? hi + rubberBand(v - hi) : v < lo ? lo + rubberBand(v - lo) : v
  return {
    azimuthDeg: soften(o.azimuthDeg, -ORBIT_MAX_AZIMUTH, ORBIT_MAX_AZIMUTH),
    elevationDeg: soften(
      o.elevationDeg,
      ORBIT_MIN_ELEVATION,
      ORBIT_MAX_ELEVATION
    ),
    radius: Math.max(0.1, o.radius),
  }
}

/**
 * Where a pointing direction puts the panel, at the radius it already has.
 *
 * This is the drag: the panel goes where you point, and the radius comes from
 * where it already was rather than from how far away you happened to aim. The
 * direction need not be unit-length; a zero direction leaves the seat alone,
 * because a controller reporting nothing should not fling the panel to a corner.
 *
 * ⚠️ RAW — neither clamped nor banded, because only the caller knows which it
 * wants. `bandOrbit` while the hand is down, `clampOrbit` when it lets go.
 */
export function orbitFromDirection(dir: OrbitVec3, current: Orbit): Orbit {
  const len = Math.hypot(dir.x, dir.y, dir.z)
  if (!Number.isFinite(len) || len < 1e-9) return { ...current }
  const seat = orbitOf(dir)
  return {
    azimuthDeg: seat.azimuthDeg,
    elevationDeg: seat.elevationDeg,
    radius: current.radius,
  }
}

/**
 * How tall a panel looks from the anchor, in degrees.
 *
 * A panel's height is metres; a seat is angles. This is the bridge, and it is
 * why the same panel needs more room low down than it does close up.
 */
export function angularHeight(height: number, radius: number): number {
  if (!(radius > 0) || !(height > 0)) return 0
  return (2 * Math.atan(height / 2 / radius)) / DEG
}

/**
 * The CENTRE a seat puts the panel's centre at, given how tall it looks.
 *
 * A seat names the edge FURTHEST from the equator, and the panel extends back
 * TOWARD eye level. Tonio, from the headset: *"Panels below the equator should
 * be bottom relative."*
 *
 * The reason generalises to both halves. Centre-anchoring makes a tall panel
 * grow in BOTH directions, so half of it goes somewhere worse than where you
 * put it: a panel seated at −40° trails down past −70° into the floor, and one
 * seated at the 60° ceiling pushes its top above the ceiling it was clamped to.
 * Pinning the far edge means the extra height always lands somewhere more
 * comfortable, and the seat you dragged to is the extreme rather than the
 * middle.
 *
 * At the equator the two halves agree at centred, so there is no discontinuity
 * to feel as you drag through it.
 */
export function orbitCentre(seat: Orbit, angularHeightDeg: number): Orbit {
  const half = angularHeightDeg / 2
  // `>= 0` and `<= 0` both give `-half`/`+half` → 0 at the equator, so the two
  // branches meet rather than stepping.
  const shift = seat.elevationDeg >= 0 ? -half : half
  return {
    azimuthDeg: seat.azimuthDeg,
    elevationDeg: seat.elevationDeg + shift,
    radius: seat.radius,
  }
}

/**
 * How far a seat had to be clamped — `0` when the drag landed inside the band.
 *
 * Exists so a caller can SAY so: a panel that stops following your hand with no
 * explanation reads as a broken drag rather than a limit, and the fix is a nudge
 * of feedback rather than a wider band.
 */
export function orbitClampedBy(wanted: Orbit): number {
  const held = clampOrbit(wanted)
  return Math.max(
    Math.abs(held.azimuthDeg - wanted.azimuthDeg),
    Math.abs(held.elevationDeg - wanted.elevationDeg)
  )
}
