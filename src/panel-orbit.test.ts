import { describe, test, expect } from 'bun:test'
import {
  ORBIT_MAX_AZIMUTH,
  ORBIT_MAX_ELEVATION,
  ORBIT_MIN_ELEVATION,
  clampOrbit,
  orbitClampedBy,
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
    expect(orbitFromDirection({ x: 0, y: 0, z: 0 }, now)).toEqual(clampOrbit(now))
    expect(orbitFromDirection({ x: NaN, y: 0, z: 1 }, now)).toEqual(
      clampOrbit(now)
    )
  })

  test('a drag never leaves the reachable band', () => {
    // Straight behind you, which is where an unclamped drag would happily go.
    const behind = orbitFromDirection({ x: 0, y: 0, z: -1 }, seat(0, 0, 2))
    expect(Math.abs(behind.azimuthDeg)).toBeLessThanOrEqual(ORBIT_MAX_AZIMUTH)
    // Straight up, where azimuth is undefined and a drag would spin it.
    const overhead = orbitFromDirection({ x: 0, y: 1, z: 0 }, seat(0, 0, 2))
    expect(overhead.elevationDeg).toBeLessThanOrEqual(ORBIT_MAX_ELEVATION)
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

  test('the two halves MEET at the equator — no step to feel', () => {
    // Dragging through eye level must not jump the panel by its own height.
    const above = orbitCentre(seat(0, 0.001), 30).elevationDeg
    const below = orbitCentre(seat(0, -0.001), 30).elevationDeg
    expect(Math.abs(above - below)).toBeLessThan(30)
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
