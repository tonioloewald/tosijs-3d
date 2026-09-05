import { describe, expect, test } from 'bun:test'
import {
  NO_TRANSFORMS,
  RING_BASIS,
  WORLD_FRAME,
  angleAboutAxis,
  axisClosestApproach,
  axisVector,
  beginDrag,
  commitTransform,
  dragChanged,
  noTransforms,
  normaliseDegrees,
  otherAxes,
  rayPerpendicularDistance,
  rayPlanePoint,
  scaleFactor,
  snap,
  snapVec3,
  updateDrag,
  wrapDegrees,
  type Axis,
  type Euler,
  type ManipulatorRay,
  type ManipulatorTransform,
  type Vec3,
} from './manipulator.js'

const v = (x: number, y: number, z: number): Vec3 => ({ x, y, z })
const ray = (
  origin: [number, number, number],
  direction: [number, number, number]
): ManipulatorRay => ({
  origin: v(...origin),
  direction: v(...direction),
})

describe('axisClosestApproach', () => {
  test('finds where a ray crosses an axis', () => {
    // Looking down -Z at the point x=4 on the X axis.
    const t = axisClosestApproach(
      v(0, 0, 0),
      axisVector('x'),
      ray([4, 0, 10], [0, 0, -1])
    )
    expect(t).toBeCloseTo(4, 6)
  })

  test('measures from the handle origin, not the world origin', () => {
    const t = axisClosestApproach(
      v(10, 0, 0),
      axisVector('x'),
      ray([14, 0, 10], [0, 0, -1])
    )
    expect(t).toBeCloseTo(4, 6)
  })

  test('returns null when the ray is parallel to the axis', () => {
    // Dragging an axis you are looking straight down has no answer. Inventing
    // one sends the object to infinity.
    expect(
      axisClosestApproach(
        v(0, 0, 0),
        axisVector('x'),
        ray([0, 0, 0], [1, 0, 0])
      )
    ).toBeNull()
  })

  test('stays parallel-safe at large scene scales', () => {
    // The parallel test is RELATIVE, so a scene measured in kilometres behaves
    // like one measured in metres.
    expect(
      axisClosestApproach(
        v(0, 0, 0),
        v(1000, 0, 0),
        ray([0, 0, 0], [1000, 0, 0])
      )
    ).toBeNull()
  })
})

describe('angleAboutAxis', () => {
  /*
  Pass WORLD axes and this is the world-plane case. It takes vectors rather than
  an axis name because rotation happens in the object's own frame — see
  RING_BASIS for which two axes span each ring, and why their order is not
  arbitrary.
  */
  const about = (axis: Axis, origin: Vec3, r: ManipulatorRay) => {
    const [u, w] = RING_BASIS[axis]
    return angleAboutAxis(
      origin,
      WORLD_FRAME[axis],
      WORLD_FRAME[u],
      WORLD_FRAME[w],
      r
    )
  }

  test('reads an angle around the Y axis in degrees', () => {
    // Crossing the XZ plane at (1,0) is 0°; at (0,1) it is 90°.
    expect(about('y', v(0, 0, 0), ray([1, 5, 0], [0, -1, 0]))).toBeCloseTo(0, 9)
    expect(about('y', v(0, 0, 0), ray([0, 5, 1], [0, -1, 0]))).toBeCloseTo(
      90,
      9
    )
  })

  test('returns null when the ray runs along the plane', () => {
    expect(about('y', v(0, 0, 0), ray([0, 1, 0], [1, 0, 0]))).toBeNull()
  })

  test('returns null when the plane is behind the pointer', () => {
    expect(about('y', v(0, 0, 0), ray([0, 5, 0], [0, 1, 0]))).toBeNull()
  })

  test('measures the plane from the handle origin, not the world origin', () => {
    expect(about('y', v(0, 4, 0), ray([1, 9, 0], [0, -1, 0]))).toBeCloseTo(0, 9)
  })

  test('turns the same way around every axis', () => {
    // Each ring's basis pair is chosen so the angle grows consistently; get one
    // wrong and that ring drags backwards, which reads as a pointer bug.
    for (const axis of ['x', 'y', 'z'] as const) {
      const [, w] = RING_BASIS[axis]
      const target = WORLD_FRAME[w]
      const n = WORLD_FRAME[axis]
      // A ray aimed at a point one unit along `v` should read +90°.
      const from = v(target.x + n.x * 5, target.y + n.y * 5, target.z + n.z * 5)
      expect(
        about(axis, v(0, 0, 0), {
          origin: from,
          direction: v(-n.x, -n.y, -n.z),
        })
      ).toBeCloseTo(90, 6)
    }
  })
})

describe('rayPlanePoint', () => {
  test('finds where a ray crosses the plane with a given normal', () => {
    // Straight down onto the XZ plane (normal Y) through the origin.
    expect(rayPlanePoint(v(0, 0, 0), 'y', ray([3, 5, -2], [0, -1, 0]))).toEqual(
      v(3, 0, -2)
    )
  })

  test('measures the plane from the handle origin, not the world origin', () => {
    expect(rayPlanePoint(v(0, 4, 0), 'y', ray([1, 9, 1], [0, -1, 0]))).toEqual(
      v(1, 4, 1)
    )
  })

  test('returns null when the ray runs ALONG the plane', () => {
    // No crossing exists; inventing one sends the object to infinity.
    expect(rayPlanePoint(v(0, 0, 0), 'y', ray([0, 1, 0], [1, 0, 0]))).toBeNull()
  })

  test('returns null when the plane is behind the pointer', () => {
    expect(rayPlanePoint(v(0, 0, 0), 'y', ray([0, 5, 0], [0, 1, 0]))).toBeNull()
  })

  test('agrees with the angle the rotation ring reads', () => {
    // The pad and the ring solve the same intersection, so they can never
    // disagree about where the pointer is.
    const r = ray([2, 5, 2], [0, -1, 0])
    const hit = rayPlanePoint(v(0, 0, 0), 'y', r)!
    const [u, w] = RING_BASIS.y
    expect(
      angleAboutAxis(
        v(0, 0, 0),
        WORLD_FRAME.y,
        WORLD_FRAME[u],
        WORLD_FRAME[w],
        r
      )
    ).toBeCloseTo((Math.atan2(hit.z, hit.x) * 180) / Math.PI, 9)
  })
})

describe('rayPerpendicularDistance', () => {
  test('is the distance from the point to the closest place on the ray', () => {
    // The centre grip's reading: pull away from the widget and it grows.
    expect(
      rayPerpendicularDistance(v(0, 0, 0), ray([3, 0, 10], [0, 0, -1]))
    ).toBeCloseTo(3, 9)
  })

  test('is zero when the ray goes straight through', () => {
    expect(
      rayPerpendicularDistance(v(0, 0, 0), ray([0, 0, 10], [0, 0, -1]))
    ).toBeCloseTo(0, 9)
  })

  test('needs no axis and no camera, so it reads the same from a hand', () => {
    // Same point, ray coming from somewhere else entirely.
    expect(
      rayPerpendicularDistance(v(0, 0, 0), ray([0, 9, 4], [0, -1, 0]))
    ).toBeCloseTo(4, 9)
  })
})

describe('otherAxes', () => {
  test('names the two axes that are not this one', () => {
    expect(otherAxes('x')).toEqual(['y', 'z'])
    expect(otherAxes('y')).toEqual(['z', 'x'])
    expect(otherAxes('z')).toEqual(['x', 'y'])
  })

  test('is what both the plane pads and secondary-scale are built on', () => {
    // A pad's axis is its NORMAL, so the axes it moves you along are the others
    // — the same pair the secondary button scales.
    for (const axis of ['x', 'y', 'z'] as const) {
      expect(otherAxes(axis)).not.toContain(axis)
      expect(new Set(otherAxes(axis)).size).toBe(2)
    }
  })
})

describe('noTransforms', () => {
  test('is true only when the widget would draw nothing', () => {
    expect(noTransforms(NO_TRANSFORMS)).toBe(true)
    expect(noTransforms({ translate: false, rotate: true, scale: false })).toBe(
      false
    )
  })
})

describe('snapping', () => {
  test('quantises to a step', () => {
    expect(snap(4.4, 1)).toBe(4)
    expect(snap(4.6, 1)).toBe(5)
    expect(snap(7, 5)).toBe(5)
  })

  test('treats a zero or negative step as no snapping', () => {
    expect(snap(4.4, 0)).toBe(4.4)
    expect(snap(4.4, -1)).toBe(4.4)
  })

  test('snaps the VALUE, so a long drag cannot accumulate error', () => {
    // Sixty snapped deltas is not the same as one snapped total: stepping the
    // delta walks an object off the grid over a long drag.
    let stepped = 0
    for (let i = 0; i < 60; i++) stepped += snap(0.6, 1)
    expect(stepped).toBe(60)
    expect(snap(0.6 * 60, 1)).toBe(36)
  })

  test('snaps each component of a position', () => {
    expect(snapVec3(v(1.2, 4.7, -3.4), 1)).toEqual(v(1, 5, -3))
  })
})

describe('wrapDegrees', () => {
  test('wraps across the ±180 seam', () => {
    // Unwrapped, this difference is a 359° jump and the object spins the long
    // way round for one frame.
    expect(wrapDegrees(370)).toBe(10)
    expect(wrapDegrees(-190)).toBe(170)
    expect(wrapDegrees(180)).toBe(180)
    expect(wrapDegrees(-180)).toBe(180)
  })
})

describe('scaleFactor', () => {
  test('is a ratio of drag distances', () => {
    expect(scaleFactor(2, 4)).toBe(2)
    expect(scaleFactor(4, 2)).toBe(0.5)
  })

  test('never mirrors or annihilates an object', () => {
    expect(scaleFactor(2, -4)).toBe(0.01)
    expect(scaleFactor(2, 0)).toBe(0.01)
  })

  test('is identity when the drag started at the pivot', () => {
    expect(scaleFactor(0, 5)).toBe(1)
  })
})

describe('normaliseDegrees', () => {
  test('brings an angle into 0..360', () => {
    expect(normaliseDegrees(-40)).toBeCloseTo(320, 9)
    expect(normaliseDegrees(400)).toBeCloseTo(40, 9)
    expect(normaliseDegrees(-400)).toBeCloseTo(320, 9)
  })

  test('spells a full turn as 0', () => {
    expect(normaliseDegrees(360)).toBe(0)
    expect(normaliseDegrees(-360)).toBe(0)
    expect(normaliseDegrees(720)).toBe(0)
  })

  test('has no negative zero to leak into a file', () => {
    expect(Object.is(normaliseDegrees(-0), 0)).toBe(true)
  })

  test('is NOT what a delta uses', () => {
    /*
    A stored angle has no direction to preserve; a delta does. Turning back five
    degrees is -5, and storing that as 355 would send the object the long way
    round — so `wrapDegrees` keeps the signed wrap for deltas and this is only
    ever applied to the value that lands in a document.
    */
    expect(wrapDegrees(-5)).toBe(-5)
    expect(normaliseDegrees(-5)).toBe(355)
  })
})

/* ------------------------------------------------------------------------- *
 * The drag
 * ------------------------------------------------------------------------- */

const REST: ManipulatorTransform = {
  position: { x: 0, y: 0, z: 0 },
  rotation: { rx: 0, ry: 0, rz: 0 },
  scale: { x: 1, y: 1, z: 1 },
}

/**
 * A stand-in for the engine's rotation composition.
 *
 * Only ever asked to turn about ONE axis from an unrotated start in these
 * tests, which is the case where adding the euler component IS the composition
 * — so this stays honest while keeping Babylon out of a pure test. The real one
 * lives in `manipulator-view`, and the fact that it must is the whole reason
 * `ComposeRotation` is injected.
 */
const composeAdd = (start: Euler, axis: Axis, degrees: number): Euler => ({
  ...start,
  [`r${axis}`]: start[`r${axis}` as keyof Euler] + degrees,
})

describe('a translate drag', () => {
  test('moves by the distance the pointer travelled along the axis', () => {
    const drag = beginDrag(
      { kind: 'translate', axis: 'x' },
      v(0, 0, 0),
      REST,
      ray([0, 0, 10], [0, 0, -1])
    )!
    expect(drag.moved).toBe(false)
    updateDrag(drag, ray([3, 0, 10], [0, 0, -1]), composeAdd)
    expect(drag.current.position.x).toBeCloseTo(3, 6)
    expect(drag.current.position.y).toBe(0)
    expect(drag.moved).toBe(true)
  })

  test('measures from the START, so a wandering drag cannot accumulate', () => {
    const drag = beginDrag(
      { kind: 'translate', axis: 'x' },
      v(0, 0, 0),
      REST,
      ray([0, 0, 10], [0, 0, -1])
    )!
    for (const x of [1, 5, 2, 9, 3]) {
      updateDrag(drag, ray([x, 0, 10], [0, 0, -1]), composeAdd)
    }
    expect(drag.current.position.x).toBeCloseTo(3, 6)
  })

  test('snaps the POSITION live, not the delta', () => {
    const drag = beginDrag(
      { kind: 'translate', axis: 'x' },
      v(0, 0, 0),
      { ...REST, position: v(0.4, 0, 0) },
      ray([0, 0, 10], [0, 0, -1])
    )!
    updateDrag(drag, ray([1.3, 0, 10], [0, 0, -1]), composeAdd, { gridSnap: 1 })
    // 0.4 + 1.3 = 1.7 → 2, not 0.4 + round(1.3).
    expect(drag.current.position.x).toBe(2)
  })

  test('a nudge inside one grid step still counts as a DRAG', () => {
    /*
    The distinction the whole click-versus-drag rule rests on: the value snapped
    back to where it started, so there is nothing to commit — but the pointer
    moved, so this is not a tap and must not hand the selection to whatever is
    behind the widget.
    */
    const drag = beginDrag(
      { kind: 'translate', axis: 'x' },
      v(0, 0, 0),
      REST,
      ray([0, 0, 10], [0, 0, -1])
    )!
    updateDrag(drag, ray([0.2, 0, 10], [0, 0, -1]), composeAdd, { gridSnap: 1 })
    expect(drag.moved).toBe(true)
    expect(dragChanged(drag, commitTransform(drag, { gridSnap: 1 }))).toBe(
      false
    )
  })
})

describe('a planar drag', () => {
  test('moves both in-plane axes and leaves the normal alone', () => {
    const drag = beginDrag(
      { kind: 'planar', axis: 'y' },
      v(0, 0, 0),
      { ...REST, position: v(0, 5, 0) },
      ray([0, 9, 0], [0, -1, 0])
    )!
    updateDrag(drag, ray([2, 9, -3], [0, -1, 0]), composeAdd)
    expect(drag.current.position.x).toBeCloseTo(2, 6)
    expect(drag.current.position.z).toBeCloseTo(-3, 6)
    expect(drag.current.position.y).toBe(5) // the normal is exactly what stays
  })
})

describe('a rotate drag', () => {
  test('turns by the angle swept, composed from the START rotation', () => {
    const drag = beginDrag(
      { kind: 'rotate', axis: 'y' },
      v(0, 0, 0),
      REST,
      ray([1, 5, 0], [0, -1, 0]) // 0° on the XZ ring
    )!
    updateDrag(drag, ray([0, 5, 1], [0, -1, 0]), composeAdd) // 90°
    expect(drag.current.rotation.ry).toBeCloseTo(90, 6)
  })

  test('snaps the DELTA, so an off-grid start rotation survives', () => {
    const drag = beginDrag(
      { kind: 'rotate', axis: 'y' },
      v(0, 0, 0),
      { ...REST, rotation: { rx: 0, ry: 7, rz: 0 } },
      ray([1, 5, 0], [0, -1, 0])
    )!
    updateDrag(drag, ray([0.1, 5, 1], [0, -1, 0]), composeAdd, {
      angleSnap: 15,
    })
    // ~84° swept snaps to 90, applied to the 7 it started at — NOT rounded to
    // 90 outright, which would silently straighten an object you only turned.
    expect(drag.current.rotation.ry).toBeCloseTo(97, 6)
  })

  test('crosses the ±180 seam without spinning the long way', () => {
    const drag = beginDrag(
      { kind: 'rotate', axis: 'y' },
      v(0, 0, 0),
      REST,
      ray([-1, 5, -0.05], [0, -1, 0]) // just under -180°
    )!
    updateDrag(drag, ray([-1, 5, 0.05], [0, -1, 0]), composeAdd) // just over +180°
    expect(Math.abs(drag.current.rotation.ry)).toBeLessThan(10)
  })
})

describe('a scale drag', () => {
  test('scales the grabbed axis by the ratio of drag distances', () => {
    const drag = beginDrag(
      { kind: 'scale', axis: 'x' },
      v(0, 0, 0),
      REST,
      ray([2, 0, 10], [0, 0, -1])
    )!
    updateDrag(drag, ray([4, 0, 10], [0, 0, -1]), composeAdd)
    expect(drag.current.scale.x).toBeCloseTo(2, 6)
    expect(drag.current.scale.y).toBe(1)
    expect(drag.current.scale.z).toBe(1)
  })

  test('the secondary button scales the OTHER two axes', () => {
    // "Thinner, same height" without a second drag.
    const drag = beginDrag(
      { kind: 'scale', axis: 'x' },
      v(0, 0, 0),
      REST,
      ray([2, 0, 10], [0, 0, -1]),
      WORLD_FRAME,
      { secondary: true }
    )!
    updateDrag(drag, ray([4, 0, 10], [0, 0, -1]), composeAdd)
    expect(drag.current.scale.x).toBe(1)
    expect(drag.current.scale.y).toBeCloseTo(2, 6)
    expect(drag.current.scale.z).toBeCloseTo(2, 6)
  })

  test('the modifier is latched at the grab, not read live', () => {
    // Passing it again to updateDrag must not change which axes move — a
    // modifier that can flip mid-drag makes the outcome depend on whether you
    // happened to be holding it when you let go.
    const drag = beginDrag(
      { kind: 'scale', axis: 'x' },
      v(0, 0, 0),
      REST,
      ray([2, 0, 10], [0, 0, -1])
    )!
    updateDrag(drag, ray([4, 0, 10], [0, 0, -1]), composeAdd, {
      secondary: true,
    } as never)
    expect(drag.current.scale.x).toBeCloseTo(2, 6)
    expect(drag.current.scale.y).toBe(1)
  })

  test('uniform scales all three from the distance to the widget', () => {
    const drag = beginDrag(
      { kind: 'uniform' },
      v(0, 0, 0),
      REST,
      ray([2, 0, 10], [0, 0, -1])
    )!
    updateDrag(drag, ray([6, 0, 10], [0, 0, -1]), composeAdd)
    for (const k of ['x', 'y', 'z'] as const) {
      expect(drag.current.scale[k]).toBeCloseTo(3, 6)
    }
  })
})

describe('starting and committing a drag', () => {
  test('will not start when the pointer has no reading for the grip', () => {
    // Looking straight down the axis you grabbed. Starting anyway makes the
    // object leap on the first frame that DOES produce a number.
    expect(
      beginDrag(
        { kind: 'translate', axis: 'x' },
        v(0, 0, 0),
        REST,
        ray([0, 0, 0], [1, 0, 0])
      )
    ).toBeNull()
  })

  test('a frame with no reading holds the last value rather than jumping', () => {
    const drag = beginDrag(
      { kind: 'planar', axis: 'y' },
      v(0, 0, 0),
      REST,
      ray([0, 5, 0], [0, -1, 0])
    )!
    updateDrag(drag, ray([2, 5, 2], [0, -1, 0]), composeAdd)
    const held = { ...drag.current.position }
    expect(updateDrag(drag, ray([0, 5, 0], [0, 1, 0]), composeAdd)).toBe(false)
    expect(drag.current.position).toEqual(held)
  })

  test('commit snaps, then normalises — 359.6 is stored as 0, not 360', () => {
    const drag = beginDrag(
      { kind: 'rotate', axis: 'y' },
      v(0, 0, 0),
      { ...REST, rotation: { rx: 0, ry: 359.6, rz: 0 } },
      ray([1, 5, 0], [0, -1, 0])
    )!
    expect(commitTransform(drag, { angleSnap: 1 }).rotation.ry).toBe(0)
  })

  test('a drag that wandered and came back has nothing to commit', () => {
    const drag = beginDrag(
      { kind: 'translate', axis: 'x' },
      v(0, 0, 0),
      REST,
      ray([0, 0, 10], [0, 0, -1])
    )!
    updateDrag(drag, ray([5, 0, 10], [0, 0, -1]), composeAdd)
    updateDrag(drag, ray([0, 0, 10], [0, 0, -1]), composeAdd)
    expect(drag.moved).toBe(true)
    expect(dragChanged(drag, commitTransform(drag))).toBe(false)
  })

  test('-40 and 320 are the same rotation, so neither is a change', () => {
    const drag = beginDrag(
      { kind: 'rotate', axis: 'y' },
      v(0, 0, 0),
      { ...REST, rotation: { rx: 0, ry: -40, rz: 0 } },
      ray([1, 5, 0], [0, -1, 0])
    )!
    expect(
      dragChanged(drag, {
        ...REST,
        rotation: { rx: 0, ry: 320, rz: 0 },
      })
    ).toBe(false)
  })
})
