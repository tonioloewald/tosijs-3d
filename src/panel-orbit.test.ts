import { describe, test, expect } from 'bun:test'
import {
  ORBIT_MAX_AZIMUTH,
  ORBIT_MAX_ELEVATION,
  ORBIT_MIN_ELEVATION,
  ORBIT_RUBBER_BAND,
  rubberBand,
  bandOrbit,
  clampOrbit,
  orbitClampedBy,
  orbitFromAim,
  orbitFromDirection,
  orbitCentre,
  orbitOf,
  orbitPosition,
  angularHeight,
  type Orbit,
} from './panel-orbit.js'

/*
A PANEL YOU CANNOT MOVE IS ONE YOU READ BY LOOKING UP WHILE YOU EDIT SOMETHING
BELOW YOU. That was the report from a headset, and the model is Tonio's: drag it
on the surface of a sphere around its rig anchor.

Everything here is about the two properties that model buys — a distance that
cannot drift, and a facing that falls out — plus the clamps, which are not
tidiness: the Exit VR and Re-seat buttons live ON the panel, so a panel dragged
behind your shoulder is one whose recovery controls you cannot reach.
*/

const seat = (az: number, el: number, radius = 2): Orbit => ({
  azimuthDeg: az,
  elevationDeg: el,
  radius,
})

describe('a seat and a position are the same thing, two ways', () => {
  test('straight ahead is +Z, and nothing else', () => {
    const p = orbitPosition(seat(0, 0))
    expect(p.x).toBeCloseTo(0, 9)
    expect(p.y).toBeCloseTo(0, 9)
    expect(p.z).toBeCloseTo(2, 9)
  })

  test('azimuth grows to the RIGHT, elevation grows UP', () => {
    expect(orbitPosition(seat(90, 0)).x).toBeCloseTo(2, 9)
    expect(orbitPosition(seat(0, 90)).y).toBeCloseTo(2, 9)
  })

  test('round-trips', () => {
    for (const [az, el] of [
      [0, 0],
      [37, 12],
      [-80, -45],
      [100, 65],
    ]) {
      const back = orbitOf(orbitPosition(seat(az, el, 1.7)))
      expect(back.azimuthDeg).toBeCloseTo(az, 6)
      expect(back.elevationDeg).toBeCloseTo(el, 6)
      expect(back.radius).toBeCloseTo(1.7, 6)
    }
  })

  test('the origin has no direction rather than an arbitrary one', () => {
    // `atan2(0, 0)` is 0 and reporting it would be a bearing nobody chose —
    // the same rule windToPolar follows, for the same reason.
    expect(orbitOf({ x: 0, y: 0, z: 0 })).toEqual({
      azimuthDeg: 0,
      elevationDeg: 0,
      radius: 0,
    })
  })
})

describe('the drag rides the sphere', () => {
  test('the panel goes where you point', () => {
    const now = seat(0, 0, 2)
    const moved = orbitFromDirection({ x: 1, y: 0, z: 1 }, now)
    expect(moved.azimuthDeg).toBeCloseTo(45, 6)
  })

  test('and keeps the DISTANCE it had, not the one you aimed at', () => {
    /*
    The property that makes a sphere better than free placement: you cannot
    shove the panel into your face or push it out of reach, however far away the
    thing you happened to point at was.
    */
    const now = seat(0, 0, 2)
    const near = orbitFromDirection({ x: 0.01, y: 0, z: 0.01 }, now)
    const far = orbitFromDirection({ x: 900, y: 0, z: 900 }, now)
    expect(near.radius).toBeCloseTo(2, 9)
    expect(far.radius).toBeCloseTo(2, 9)
    expect(near.azimuthDeg).toBeCloseTo(far.azimuthDeg, 6)
  })

  test('a controller reporting nothing leaves the panel alone', () => {
    // A zero direction is a dropped tracking frame, not an instruction to fling
    // the panel at a corner.
    const now = seat(30, 10, 2)
    expect(orbitFromDirection({ x: 0, y: 0, z: 0 }, now)).toEqual(
      clampOrbit(now)
    )
    expect(orbitFromDirection({ x: NaN, y: 0, z: 1 }, now)).toEqual(
      clampOrbit(now)
    )
  })

  test('it reports the RAW seat — the caller decides band or clamp', () => {
    /*
    Only the caller knows which it wants: `bandOrbit` while the hand is down so
    the panel keeps following you, `clampOrbit` when it lets go so it cannot
    come to rest somewhere its own recovery buttons are hard to reach. Clamping
    here would have made the first impossible.
    */
    const behind = orbitFromDirection({ x: 0, y: 0, z: -1 }, seat(0, 0, 2))
    expect(Math.abs(behind.azimuthDeg)).toBeGreaterThan(ORBIT_MAX_AZIMUTH)
    // ...and both dispositions are one call away.
    expect(Math.abs(clampOrbit(behind).azimuthDeg)).toBe(ORBIT_MAX_AZIMUTH)
    expect(Math.abs(bandOrbit(behind).azimuthDeg)).toBeGreaterThan(
      ORBIT_MAX_AZIMUTH
    )
  })
})

describe('the rubber band — resistance, not a wider box', () => {
  /*
  A hard stop is the right RESTING behaviour and the wrong LIVE one: the panel
  simply stops following your hand, which reads as a dropped drag rather than a
  limit. In a headset the only feedback is what you can see, so there is nothing
  else to tell you which it was.

    Tonio: "It could follow you and rubber band back."
  */

  test('inside the band nothing is softened at all', () => {
    const ok = seat(40, -20, 1.4)
    expect(bandOrbit(ok)).toEqual(ok)
  })

  test('it starts 1:1, so a small overshoot feels like nothing unusual', () => {
    expect(rubberBand(0.5)).toBeCloseTo(0.5, 1)
  })

  test('it stiffens — twice the pull is less than twice the stretch', () => {
    expect(rubberBand(20)).toBeLessThan(2 * rubberBand(10))
  })

  test('and it never runs away, however hard you pull', () => {
    // Strictly under while there is still stretch left...
    expect(rubberBand(40)).toBeLessThan(ORBIT_RUBBER_BAND)
    // ...and asymptotic beyond that (far enough out it rounds to the limit in
    // floating point, which is the correct answer, not a leak).
    for (const over of [400, 4000, 1e6]) {
      expect(rubberBand(over)).toBeLessThanOrEqual(ORBIT_RUBBER_BAND)
    }
    expect(rubberBand(1e6)).toBeCloseTo(ORBIT_RUBBER_BAND, 6)
  })

  test('it is symmetric — the floor stretches like the ceiling', () => {
    expect(rubberBand(-30)).toBeCloseTo(-rubberBand(30), 9)
  })

  test('a banded seat is bounded by limit + band, on both axes', () => {
    const far = bandOrbit(seat(900, -900))
    expect(far.azimuthDeg).toBeLessThanOrEqual(
      ORBIT_MAX_AZIMUTH + ORBIT_RUBBER_BAND
    )
    expect(far.azimuthDeg).toBeGreaterThan(ORBIT_MAX_AZIMUTH)
    expect(far.elevationDeg).toBeGreaterThanOrEqual(
      ORBIT_MIN_ELEVATION - ORBIT_RUBBER_BAND
    )
    expect(far.elevationDeg).toBeLessThan(ORBIT_MIN_ELEVATION)
  })

  test('the band is NOT a resting place — clamp still holds the limit', () => {
    // The property that makes it a band rather than a bigger box. If these ever
    // agreed, a panel could be let go behind your shoulder.
    const stretched = bandOrbit(seat(900, 900))
    expect(clampOrbit(stretched).azimuthDeg).toBe(ORBIT_MAX_AZIMUTH)
    expect(clampOrbit(stretched).elevationDeg).toBe(ORBIT_MAX_ELEVATION)
  })

  test('nonsense stretches nowhere', () => {
    expect(rubberBand(NaN)).toBe(0)
    expect(rubberBand(10, 0)).toBe(0)
  })
})

describe('the clamps', () => {
  test('hold both angles inside the band', () => {
    const held = clampOrbit(seat(900, -900))
    expect(held.azimuthDeg).toBe(ORBIT_MAX_AZIMUTH)
    expect(held.elevationDeg).toBe(ORBIT_MIN_ELEVATION)
  })

  test('leave a seat inside the band untouched', () => {
    const ok = seat(40, -20, 1.4)
    expect(clampOrbit(ok)).toEqual(ok)
  })

  test('a zero radius is pushed off the anchor, not left inside your head', () => {
    // At the origin the panel is unreadable AND unpickable, and nothing
    // downstream would report why.
    expect(clampOrbit(seat(0, 0, 0)).radius).toBeGreaterThan(0)
    expect(clampOrbit(seat(0, 0, -5)).radius).toBeGreaterThan(0)
  })

  test('the ceiling is the DEFAULT SEAT, and the floor is lower', () => {
    /*
    From the headset: "It starts about as high as it should be allowed." So the
    panel can only ever be dragged somewhere more comfortable than where it
    began — and the band is asymmetric on purpose, because looking down is
    comfortable and looking up is not.

    `tosi-b3d` seats the panel at 60° up the sight-line; if that drifted above
    this ceiling the panel would be clamped on its first drag and appear to
    jump, so the two are pinned together here.
    */
    expect(ORBIT_MAX_ELEVATION).toBe(60)
    expect(ORBIT_MIN_ELEVATION).toBeLessThan(-ORBIT_MAX_ELEVATION)
    // The seat itself is not clamped — it is exactly at the limit, not past it.
    expect(orbitClampedBy(seat(0, 60))).toBe(0)
  })

  test('report HOW FAR they held it, so a caller can say so', () => {
    /*
    A panel that stops following your hand with no explanation reads as a broken
    drag rather than a limit — and the fix for that is a nudge of feedback, not
    a wider band.
    */
    expect(orbitClampedBy(seat(40, 10))).toBe(0)
    expect(orbitClampedBy(seat(ORBIT_MAX_AZIMUTH + 25, 0))).toBeCloseTo(25, 9)
  })
})

describe('a seat names the edge, not the middle', () => {
  /*
  Tonio, from the headset: "Panels below the equator should be bottom relative."

  Centre-anchoring makes a tall panel grow in BOTH directions, so half of it
  lands somewhere worse than where you put it: seated at -40° it trails down
  past -70° into the floor, and seated at the 60° ceiling it pushes its top
  above the ceiling it was just clamped to. Pinning the edge FURTHEST from the
  equator means the extra height always goes somewhere more comfortable.
  */

  test('below the equator it is bottom-relative — it grows UP', () => {
    const c = orbitCentre(seat(0, -40), 30)
    expect(c.elevationDeg).toBeCloseTo(-25, 9) // centre is 15° above the seat
    // ...so the bottom edge is exactly where you dragged it.
    expect(c.elevationDeg - 15).toBeCloseTo(-40, 9)
  })

  test('above the equator it is top-relative — it grows DOWN', () => {
    const c = orbitCentre(seat(0, 60), 30)
    expect(c.elevationDeg).toBeCloseTo(45, 9)
    expect(c.elevationDeg + 15).toBeCloseTo(60, 9)
  })

  test('a tall panel at the ceiling does not push its top past it', () => {
    // The concrete failure: 60° is the ceiling because that is as high as it
    // should ever be, and a centred 40°-tall panel would put its top at 80°.
    const tall = 40
    const c = orbitCentre(seat(0, ORBIT_MAX_ELEVATION), tall)
    expect(c.elevationDeg + tall / 2).toBeLessThanOrEqual(ORBIT_MAX_ELEVATION)
  })

  test('a tall panel at the floor does not trail below it', () => {
    const tall = 40
    const c = orbitCentre(seat(0, ORBIT_MIN_ELEVATION), tall)
    expect(c.elevationDeg - tall / 2).toBeGreaterThanOrEqual(
      ORBIT_MIN_ELEVATION
    )
  })

  test('dragging THROUGH the horizon does not jump the panel', () => {
    /*
    ⚠️ THE TEST THAT PROVED NOTHING. This asserted `< 30` on a 30° panel — where
    the jump WAS 30, and it passed on a rounding sliver of 29.998. It named the
    exact property ("must not jump the panel by its own height") and could not
    detect its violation, which is the failure I have been calling out in other
    people's tests all week.

    The real assertion is continuity: an arbitrarily small step in the seat
    produces an arbitrarily small step in the centre.
    */
    const above = orbitCentre(seat(0, 0.001), 30).elevationDeg
    const below = orbitCentre(seat(0, -0.001), 30).elevationDeg
    expect(Math.abs(above - below)).toBeLessThan(0.01)
  })

  test('and it is smooth ACROSS the whole crossing, not just at the seam', () => {
    // A blend can be continuous at one point and still lurch either side of it.
    // Walk the band and hold every step to a fraction of the panel's height.
    let prev = orbitCentre(seat(0, -20), 30).elevationDeg
    for (let e = -19.5; e <= 20; e += 0.5) {
      const now = orbitCentre(seat(0, e), 30).elevationDeg
      expect(Math.abs(now - prev), `step at ${e}°`).toBeLessThan(1)
      prev = now
    }
  })

  test('at eye level it is CENTRED, which is what eye level means', () => {
    expect(orbitCentre(seat(0, 0), 30).elevationDeg).toBeCloseTo(0, 9)
  })

  test('azimuth and radius are untouched — this is the elevation rule only', () => {
    const c = orbitCentre(seat(37, -20, 1.4), 30)
    expect(c.azimuthDeg).toBe(37)
    expect(c.radius).toBe(1.4)
  })
})

describe('angularHeight bridges metres to degrees', () => {
  test('a panel subtends less from further away', () => {
    expect(angularHeight(1, 1)).toBeGreaterThan(angularHeight(1, 4))
  })

  test('a half-metre panel at half a metre is 53°, which is a lot', () => {
    // Sanity anchor: 2·atan(0.25/0.5).
    expect(angularHeight(0.5, 0.5)).toBeCloseTo(53.13, 1)
  })

  test('nonsense is zero rather than NaN weather', () => {
    expect(angularHeight(0, 2)).toBe(0)
    expect(angularHeight(1, 0)).toBe(0)
    expect(angularHeight(1, -2)).toBe(0)
  })
})

describe('the ceiling and the SEAT are one number', () => {
  /*
  `tosi-b3d` seats the XR panel `ELEV` up the sight-line and `panel-orbit`
  clamps a drag at `ORBIT_MAX_ELEVATION`. If those drift apart the panel is
  clamped on its first drag and appears to JUMP — a silent failure, because both
  values look reasonable on their own and neither file mentions the other.

  Read out of the source rather than restated, so this cannot pass against a
  copy of the number it is checking.
  */
  test('tosi-b3d seats the panel exactly at ORBIT_MAX_ELEVATION', async () => {
    const { readFileSync } = await import('node:fs')
    const src = readFileSync(
      new URL('./tosi-b3d.ts', import.meta.url).pathname,
      'utf8'
    )
    const m = /const ELEV = \(([-\d.]+) \* Math\.PI\) \/ 180/.exec(src)
    expect(m, 'ELEV not found — did the seat move or get renamed?').toBeTruthy()
    expect(Number(m![1])).toBe(ORBIT_MAX_ELEVATION)
  })
})

describe('orbitFromAim — the drag, from a ray that starts at your HAND', () => {
  /*
  The bug this exists to make untestable-by-construction: the first version used
  the ray's DIRECTION as the seat direction. The direction is the controller's
  and the sphere is centred on the head, so the panel went where the arithmetic
  said rather than where the ray pointed, and hand wobble moved it by the whole
  head-to-hand offset.

    "jittery while dragging and doesn't seem to track the cursor properly (the
     cursor points towards it not away)."
  */

  /** A hand below and ahead of the eyes, which is where one actually is. */
  const HAND = { x: 0.2, y: -0.4, z: 0.1 }

  test('a ray from the ORIGIN behaves exactly like a direction', () => {
    // The degenerate case, so the difference below is attributable to the
    // offset rather than to a change in the maths.
    const now = seat(0, 0, 2)
    const dir = { x: 1, y: 0, z: 1 }
    expect(orbitFromAim({ x: 0, y: 0, z: 0 }, dir, now)).toEqual(
      orbitFromDirection(dir, now)
    )
  })

  test('an offset hand aiming straight ahead does NOT put the panel straight ahead', () => {
    /*
    The heart of it. Your hand is below your eyes; pointing horizontally forward
    from there lands BELOW eye level on a sphere centred on your head — which is
    what you see, and what using the direction alone got wrong.
    */
    const now = seat(0, 0, 2)
    const ahead = { x: 0, y: 0, z: 1 }
    expect(orbitFromDirection(ahead, now).elevationDeg).toBeCloseTo(0, 9)
    expect(orbitFromAim(HAND, ahead, now).elevationDeg).toBeLessThan(-5)
  })

  test('it tracks the ray — pointing further up seats it higher', () => {
    const now = seat(0, 0, 2)
    const low = orbitFromAim(HAND, { x: 0, y: 0, z: 1 }, now)
    const high = orbitFromAim(HAND, { x: 0, y: 0.6, z: 1 }, now)
    expect(high.elevationDeg).toBeGreaterThan(low.elevationDeg)
  })

  test('and pointing right seats it right, not left', () => {
    // "the cursor points towards it not away" — a sign error would show here.
    const now = seat(0, 0, 2)
    expect(
      orbitFromAim(HAND, { x: 1, y: 0, z: 1 }, now).azimuthDeg
    ).toBeGreaterThan(0)
  })

  test("the radius is still the sphere's, however far along the ray you aim", () => {
    const now = seat(0, 0, 2)
    const near = orbitFromAim(HAND, { x: 0, y: 0, z: 0.01 }, now)
    const far = orbitFromAim(HAND, { x: 0, y: 0, z: 900 }, now)
    expect(near.radius).toBeCloseTo(2, 9)
    expect(far.radius).toBeCloseTo(2, 9)
  })

  test('a dead ray leaves the seat alone rather than flinging it', () => {
    const now = seat(30, 10, 2)
    expect(orbitFromAim(HAND, { x: 0, y: 0, z: 0 }, now)).toEqual(now)
    expect(orbitFromAim(HAND, { x: NaN, y: 0, z: 1 }, now)).toEqual(now)
  })
})
