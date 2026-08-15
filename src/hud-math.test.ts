import { describe, expect, test } from 'bun:test'
import {
  hudTrace,
  horizonTransform,
  glassUV,
  hudPointFromUV,
  lockFillOpacity, hudSizePx } from './hud-math'
import {
  IDENTITY_QUAT,
  quatFromAxisAngle,
  type Pose,
} from './spatial-transform'

const DEG = Math.PI / 180
// Viewer at origin, facing +Z (nose), no roll.
const viewer: Pose = { position: { x: 0, y: 0, z: 0 }, rotation: IDENTITY_QUAT }
const opts = { fovH: 90 * DEG, fovV: 90 * DEG, radius: 100 }

describe('hudTrace', () => {
  test('target on the nose → centre, tracked', () => {
    const t = hudTrace(viewer, { x: 0, y: 0, z: 10 }, opts)
    expect(t.tracked).toBe(true)
    expect(t.behind).toBe(false)
    expect(t.x).toBeCloseTo(0, 6)
    expect(t.y).toBeCloseTo(0, 6)
    expect(t.distance).toBeCloseTo(10, 6)
  })

  test('target within FOV to the right/up → tracked, +x and -y (up)', () => {
    const t = hudTrace(viewer, { x: 5, y: 5, z: 10 }, opts)
    expect(t.tracked).toBe(true)
    expect(t.x).toBeGreaterThan(0) // right
    expect(t.y).toBeLessThan(0) // up = negative y (SVG)
    expect(Math.hypot(t.x, t.y)).toBeLessThanOrEqual(opts.radius + 1e-9)
  })

  test('target beyond the FOV to the right → pinned to the right edge', () => {
    const t = hudTrace(viewer, { x: 20, y: 0, z: 5 }, opts) // 76° right, FOV half is 45°
    expect(t.tracked).toBe(false)
    expect(t.behind).toBe(false)
    expect(t.x).toBeCloseTo(opts.radius, 6) // on the ring, straight right
    expect(t.y).toBeCloseTo(0, 6)
  })

  test('pinned traces sit exactly on the ring', () => {
    const t = hudTrace(viewer, { x: 30, y: 20, z: 2 }, opts)
    expect(t.tracked).toBe(false)
    expect(Math.hypot(t.x, t.y)).toBeCloseTo(opts.radius, 6)
  })

  test('target behind → behind flag, pinned to an edge', () => {
    const t = hudTrace(viewer, { x: 3, y: 0, z: -10 }, opts)
    expect(t.behind).toBe(true)
    expect(t.tracked).toBe(false)
    expect(Math.hypot(t.x, t.y)).toBeCloseTo(opts.radius, 6)
    expect(t.x).toBeGreaterThan(0) // slightly-right-behind pins to the right
  })

  test('a rolled/yawed viewer sees a nose-aligned target at centre', () => {
    const rolled: Pose = {
      position: { x: 1, y: 2, z: 3 },
      rotation: quatFromAxisAngle({ x: 0, y: 1, z: 0 }, 40 * DEG),
    }
    // Put the target straight ahead along the viewer's nose (rotate +Z by the yaw).
    const c = Math.cos(40 * DEG)
    const s = Math.sin(40 * DEG)
    const ahead = { x: 1 + s * 10, y: 2, z: 3 + c * 10 }
    const t = hudTrace(rolled, ahead, opts)
    expect(t.tracked).toBe(true)
    expect(t.x).toBeCloseTo(0, 5)
    expect(t.y).toBeCloseTo(0, 5)
  })
})

// The glass is the z = 0 square spanning ±half in the quad's LOCAL space; the eye sits
// behind it at negative z and looks through it at a target beyond. Everything below is
// stated in that frame, which is exactly what b3d-hud hands these functions.
describe('glassUV — eye→target ray crossing the combiner glass', () => {
  const eye = { x: 0, y: 0, z: -1 }

  test('target straight through the middle → centre of the glass', () => {
    const uv = glassUV(eye, { x: 0, y: 0, z: 10 }, 1)
    expect(uv).not.toBeNull()
    expect(uv!.u).toBeCloseTo(0, 6)
    expect(uv!.v).toBeCloseTo(0, 6)
  })

  test('target up and to the right → +u, +v (glass is +y UP)', () => {
    const uv = glassUV(eye, { x: 5, y: 5, z: 9 }, 1)!
    // Ray crosses z = 0 one tenth of the way along, so 0.5 out of ±1 on each axis.
    expect(uv.u).toBeCloseTo(0.5, 6)
    expect(uv.v).toBeCloseTo(0.5, 6)
  })

  test('anything past the edge of the glass reads |u| or |v| > 1 (caller pins it)', () => {
    const uv = glassUV(eye, { x: 30, y: 0, z: 2 }, 1)!
    expect(uv.u).toBeGreaterThan(1)
  })

  test('two targets on the SAME ray from the eye project to the same point', () => {
    // The invariant that makes this a real ray-plane crossing rather than a fudge:
    // distance along the line of sight must not move the mark.
    const near = { x: 1, y: -0.5, z: 2 }
    const dir = { x: near.x - eye.x, y: near.y - eye.y, z: near.z - eye.z }
    const far = {
      x: eye.x + 3 * dir.x,
      y: eye.y + 3 * dir.y,
      z: eye.z + 3 * dir.z,
    }
    const a = glassUV(eye, near, 1)!
    const b = glassUV(eye, far, 1)!
    expect(b.u).toBeCloseTo(a.u, 9)
    expect(b.v).toBeCloseTo(a.v, 9)
  })

  test('a bigger pane maps the same crossing to a smaller normalised offset', () => {
    const one = glassUV(eye, { x: 5, y: 0, z: 9 }, 1)!
    const two = glassUV(eye, { x: 5, y: 0, z: 9 }, 2)!
    expect(two.u).toBeCloseTo(one.u / 2, 9)
  })

  test('null when the ray is parallel to the glass', () => {
    expect(glassUV(eye, { x: 5, y: 5, z: -1 }, 1)).toBeNull()
  })

  test('null when the target is on the eye’s side — nothing to draw', () => {
    expect(glassUV(eye, { x: 0, y: 0, z: -5 }, 1)).toBeNull()
  })

  test('null for a degenerate pane', () => {
    expect(glassUV(eye, { x: 0, y: 0, z: 10 }, 0)).toBeNull()
  })
})

describe('hudPointFromUV — placing/pinning a contact in viewBox coords', () => {
  const opts = { center: 128, pinRadius: 100 }

  test('centre of the surface → centre of the viewBox, tracked', () => {
    const p = hudPointFromUV(0, 0, opts)
    expect(p).toEqual({ x: 128, y: 128, tracked: true })
  })

  test('+v is UP, so it maps to a SMALLER y (SVG y grows downward)', () => {
    const p = hudPointFromUV(0, 0.5, opts)
    expect(p.tracked).toBe(true)
    expect(p.y).toBeLessThan(opts.center)
    expect(p.y).toBeCloseTo(64, 6)
    expect(hudPointFromUV(0, -0.5, opts).y).toBeCloseTo(192, 6)
  })

  test('the edges of the surface land on the edges of the viewBox', () => {
    expect(hudPointFromUV(1, 0, opts).x).toBeCloseTo(256, 6) // hard right
    expect(hudPointFromUV(-1, 0, opts).x).toBeCloseTo(0, 6) // hard left
    expect(hudPointFromUV(0, 1, opts).y).toBeCloseTo(0, 6) // top
  })

  test('off the surface → not tracked, pinned exactly on the ring', () => {
    const p = hudPointFromUV(4, 0, opts)
    expect(p.tracked).toBe(false)
    expect(p.x).toBeCloseTo(opts.center + opts.pinRadius, 6)
    expect(p.y).toBeCloseTo(opts.center, 6)
  })

  test('a pinned contact keeps its bearing and sits on the ring', () => {
    const p = hudPointFromUV(-3, 3, opts) // up and to the left
    expect(p.tracked).toBe(false)
    expect(Math.hypot(p.x - opts.center, p.y - opts.center)).toBeCloseTo(
      opts.pinRadius,
      6
    )
    expect(p.x).toBeLessThan(opts.center) // left
    expect(p.y).toBeLessThan(opts.center) // up
  })

  test('the surface is a SQUARE — a corner is still tracked, not pinned', () => {
    // |u|,|v| ≤ 1 is the test, not u² + v² ≤ 1: the glass is a pane, not a disc.
    expect(hudPointFromUV(1, 1, opts).tracked).toBe(true)
  })
})

describe('horizonTransform', () => {
  test('pitch up slides the ladder down; roll counter-rotates', () => {
    const h = horizonTransform(10, 5, 2)
    expect(h.offsetY).toBeCloseTo(20, 6) // 10° * 2px
    expect(h.rollDeg).toBeCloseTo(-5, 6) // opposite the aircraft roll
  })

  test('level flight → no offset, no roll', () => {
    const h = horizonTransform(0, 0, 3)
    expect(h.offsetY).toBe(0)
    expect(h.rollDeg).toBe(-0)
  })
})

describe('lockFillOpacity — a trace solidifies as the radar builds a lock', () => {
  test('no lock, no fill — an unlocked contact is outline only', () => {
    expect(lockFillOpacity(0)).toBe(0)
  })

  test('fills to 50% white across the acquisition ramp', () => {
    expect(lockFillOpacity(0.5)).toBeCloseTo(0.25, 6)
    expect(lockFillOpacity(1)).toBeCloseTo(0.5, 6)
  })

  test('monotonic — holding the nose on a contact never makes it fade', () => {
    let prev = -1
    for (let p = 0; p <= 1.0001; p += 0.05) {
      const v = lockFillOpacity(p)
      expect(v).toBeGreaterThanOrEqual(prev)
      prev = v
    }
  })

  test('locked fills bolder — 75%, above anything the ramp can reach', () => {
    // NB this alone is NOT what makes a lock readable: lock was once drawn as only a
    // denser fill of the same colour (0.5 → 0.75) and was unreadable on a thin glyph at
    // speed. The categorical cue is the outline going white + the fill switching to the
    // faction colour (pinned in hud-trace.test.ts). The extra opacity is here because a
    // 50% faction fill looks washed out inside a white outline.
    expect(lockFillOpacity(1, true)).toBe(0.75)
    expect(lockFillOpacity(1, true)).toBeGreaterThan(lockFillOpacity(1))
  })

  test('locked pins the fill full, even if the progress arrives short', () => {
    expect(lockFillOpacity(0, true)).toBe(0.75)
    expect(lockFillOpacity(0.3, true)).toBe(0.75)
  })

  test('garbage in stays in range — it is an opacity', () => {
    expect(lockFillOpacity(-1)).toBe(0)
    expect(lockFillOpacity(NaN)).toBe(0)
    expect(lockFillOpacity(5)).toBe(0.5) // clamped, not 2.5
  })
})

import { arcDashArray } from './hud-math'

/*
One path, several spans: the trick the meter marks use, generalised. A single
arc can carry a fill, a set-point notch and a ground reference without four
copies of the geometry to keep aligned — so the maths has to be right, because
a malformed dasharray fails silently (it just draws something plausible).
*/
describe('arcDashArray — many bars on one arc', () => {
  const nums = (s: string) => s.split(' ').map(Number)

  test('a single span lights exactly that range', () => {
    const d = nums(arcDashArray([[0.25, 0.5]], 1000))
    expect(d).toEqual([0, 250, 250, 500]) // lead-in gap, dash, trailing gap
  })

  test('the leading zero makes the FIRST entry a gap, not a dash', () => {
    expect(nums(arcDashArray([[0.5, 0.6]], 1000))[0]).toBe(0)
  })

  test('several spans coexist on one path', () => {
    const d = nums(
      arcDashArray(
        [
          [0, 0.1],
          [0.4, 0.5],
          [0.9, 1],
        ],
        1000
      )
    )
    // 0 | dash 100 | gap 300 | dash 100 | gap 400 | dash 100 | gap 0
    expect(d).toEqual([0, 0, 100, 300, 100, 400, 100, 0])
    // dashes (odd indices after the lead) sum to the lit total
    expect(d[2] + d[4] + d[6]).toBe(300)
  })

  test('overlapping spans MERGE rather than corrupting the array', () => {
    const d = nums(
      arcDashArray(
        [
          [0.2, 0.5],
          [0.4, 0.7],
        ],
        1000
      )
    )
    expect(d).toEqual([0, 200, 500, 300]) // one 0.2→0.7 dash
  })

  test('out-of-order and out-of-range input is tolerated', () => {
    expect(nums(arcDashArray([[0.6, 0.3]], 1000))).toEqual([0, 300, 300, 400])
    expect(nums(arcDashArray([[-1, 2]], 1000))).toEqual([0, 0, 1000, 0])
  })

  test('empty or degenerate spans light nothing', () => {
    expect(nums(arcDashArray([], 1000))).toEqual([0, 1000])
    expect(nums(arcDashArray([[0.5, 0.5]], 1000))).toEqual([0, 1000])
  })
})

describe('hudSizePx — the circle must not dominate a portrait viewport', () => {
  const PCT = 0.7

  test('landscape is essentially unchanged by the long-side cap', () => {
    // 1400x713, the measured desktop case: 499 before, 490 after.
    const px = hudSizePx(1400, 713, PCT)
    expect(px).toBeCloseTo(490, 0)
    expect(px / 713).toBeGreaterThan(0.65) // still ~the small side's 70%
  })

  test('portrait shrinks — the reported pathology', () => {
    // 500x757: the old rule gave 350 (70% of the WIDTH, which is what "the hud
    // circle gets pathologically big" was describing).
    const px = hudSizePx(500, 757, PCT)
    expect(px).toBeCloseTo(265, 0)
    expect(px / 500).toBeLessThan(0.55) // was 0.70
  })

  test('the same viewport turned gives a similar fraction of the LONG side', () => {
    // That is the property the cap buys: rotating the device shouldn't change
    // how much of the screen the circle eats.
    const landscape = hudSizePx(844, 390, PCT) / 844
    const portrait = hudSizePx(390, 844, PCT) / 844
    expect(portrait).toBeCloseTo(landscape, 5)
  })

  test('degenerate viewports return 0 rather than NaN', () => {
    expect(hudSizePx(0, 0, PCT)).toBe(0)
    expect(hudSizePx(100, 0, PCT)).toBe(0)
  })
})
