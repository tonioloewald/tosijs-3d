import { describe, expect, test } from 'bun:test'
import {
  constant,
  deletePoint,
  easeInOut,
  evaluateCurve,
  falloffDefault,
  insertPoint,
  linear,
  movePoint,
  normalizeCurve,
  pointAt,
  presetsFor,
  rim,
  stepped,
  type ControlPoint,
} from './curve'

const xs = (pts: ControlPoint[]) => pts.map((p) => p.x)
const sortedByX = (pts: ControlPoint[]) =>
  pts.every((p, i) => i === 0 || pts[i - 1].x <= p.x)
const inUnitSquare = (pts: ControlPoint[]) =>
  pts.every((p) => p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1)

describe('the range is CLOSED — amplitude belongs to the block', () => {
  test('a point outside the unit square is clamped, not accepted', () => {
    // Not a nicety: a profile that can return 1.4 changes the height a province
    // occupies, which is what carve/patch-field must agree about.
    const c = normalizeCurve([
      { x: -0.5, y: 1.4 },
      { x: 1.5, y: -2 },
    ])
    expect(inUnitSquare(c)).toBe(true)
  })

  test('a drag clamps rather than pushing the range', () => {
    const { points } = movePoint(linear(), 0, -3, 9)
    expect(inUnitSquare(points)).toBe(true)
    expect(points[0].y).toBe(1)
  })

  test('non-finite input never becomes NaN in the curve', () => {
    const c = normalizeCurve([
      { x: NaN, y: 0.5 },
      { x: 0, y: Infinity },
      { x: 1, y: 0.5 },
    ])
    expect(c.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(
      true
    )
  })
})

describe('the domain is always covered', () => {
  test('missing ends are supplied, holding the end value', () => {
    const c = normalizeCurve([
      { x: 0.3, y: 0.2 },
      { x: 0.7, y: 0.9 },
    ])
    expect(xs(c)[0]).toBe(0)
    expect(xs(c)[c.length - 1]).toBe(1)
    expect(c[0].y).toBe(0.2)
  })

  test('an empty list yields the kind default, not an empty curve', () => {
    expect(normalizeCurve([]).length).toBeGreaterThan(1)
    expect(evaluateCurve(normalizeCurve([], 'falloff'), 1)).toBe(0)
  })

  test('points come back sorted by x', () => {
    const c = normalizeCurve([
      { x: 0.9, y: 0.1 },
      { x: 0.1, y: 0.9 },
      { x: 0.5, y: 0.5 },
    ])
    expect(sortedByX(c)).toBe(true)
  })
})

describe('falloff pins f(1) = 0; profile does not', () => {
  test('a falloff always reaches zero at the edge', () => {
    // A province still carrying weight at its boundary does not blend into the
    // terrain around it — a visible step, and a silent one.
    const c = normalizeCurve(
      [
        { x: 0, y: 1 },
        { x: 1, y: 0.7 },
      ],
      'falloff'
    )
    expect(evaluateCurve(c, 1)).toBe(0)
  })

  test('you cannot drag the edge point off zero', () => {
    const c = falloffDefault()
    const { points } = movePoint(c, c.length - 1, 1, 0.8, 'falloff')
    expect(points[points.length - 1].y).toBe(0)
  })

  test('a profile keeps whatever its endpoints say', () => {
    const c = normalizeCurve(constant(0.6), 'profile')
    expect(evaluateCurve(c, 1)).toBeCloseTo(0.6, 6)
  })
})

describe('NOT monotonic — a rim has to be representable', () => {
  test('a rim rises then falls, and survives normalisation', () => {
    const c = rim(0.7, 1)
    const mid = evaluateCurve(c, 0.7)
    expect(mid).toBeGreaterThan(evaluateCurve(c, 0.2))
    expect(mid).toBeGreaterThan(evaluateCurve(c, 0.95))
    // …and still obeys the falloff rule, which is the point: the edge is pinned,
    // the middle is free.
    expect(evaluateCurve(c, 1)).toBe(0)
  })
})

describe('endpoints own the domain edges', () => {
  test('dragging an end point sideways does not move it off the edge', () => {
    const { points } = movePoint(linear(), 0, 0.4, 0.5)
    expect(points[0].x).toBe(0)
    const last = movePoint(linear(), 1, 0.4, 0.5)
    expect(last.points[last.points.length - 1].x).toBe(1)
  })

  test('an end point cannot be deleted', () => {
    const c = easeInOut()
    expect(deletePoint(c, 0).length).toBe(c.length)
    expect(deletePoint(c, c.length - 1).length).toBe(c.length)
  })

  test('a curve never drops below two points', () => {
    const two = linear()
    expect(deletePoint(two, 0)).toHaveLength(2)
  })
})

describe('a drag that reorders reports the NEW index', () => {
  test('dragging past a neighbour returns where the point went', () => {
    // A caller keeping the old index grabs a different point mid-gesture, which
    // reads as the curve fighting you.
    const c = normalizeCurve([
      { x: 0, y: 0 },
      { x: 0.3, y: 0.3 },
      { x: 0.6, y: 0.6 },
      { x: 1, y: 1 },
    ])
    const { points, index } = movePoint(c, 1, 0.8, 0.3)
    expect(index).toBe(2)
    expect(points[index].x).toBeCloseTo(0.8, 6)
    expect(points[index].y).toBeCloseTo(0.3, 6)
    expect(sortedByX(points)).toBe(true)
  })

  test('an inserted point reports its index so it can be dragged at once', () => {
    const { points, index } = insertPoint(linear(), 0.5, 0.9)
    expect(points[index].x).toBeCloseTo(0.5, 6)
    expect(points[index].y).toBeCloseTo(0.9, 6)
  })
})

describe('evaluate', () => {
  test('linear is the identity', () => {
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      expect(evaluateCurve(linear(), t)).toBeCloseTo(t, 6)
    }
  })

  test('constant ignores its input', () => {
    const c = constant(0.4)
    expect(evaluateCurve(c, 0)).toBeCloseTo(0.4, 6)
    expect(evaluateCurve(c, 1)).toBeCloseTo(0.4, 6)
  })

  test('input is clamped — you cannot read off the ends', () => {
    expect(evaluateCurve(linear(), -5)).toBe(0)
    expect(evaluateCurve(linear(), 5)).toBe(1)
  })

  test('easeInOut is symmetric about the middle', () => {
    for (const t of [0.1, 0.25, 0.4]) {
      const a = evaluateCurve(easeInOut(), t)
      const b = 1 - evaluateCurve(easeInOut(), 1 - t)
      expect(a).toBeCloseTo(b, 6)
    }
  })

  test('stepped is flat across each tread', () => {
    const c = stepped(4)
    // Both inside the SECOND tread (0.25 … 0.5) — the first draft straddled a
    // riser, which of course changes value, and proves nothing either way.
    expect(evaluateCurve(c, 0.48)).toBeCloseTo(evaluateCurve(c, 0.26), 6)
    // …and the riser really is a step: adjacent treads differ.
    expect(evaluateCurve(c, 0.6)).toBeGreaterThan(evaluateCurve(c, 0.4))
  })
})

describe('presets are scoped to the kind they are valid for', () => {
  test('constant is offered for a profile and NOT for a falloff', () => {
    // Falls straight out of the endpoint rule: a constant falloff is weight 1 at
    // the boundary, which is the step the pin exists to prevent.
    expect(presetsFor('profile').map((p) => p.name)).toContain('constant')
    expect(presetsFor('falloff').map((p) => p.name)).not.toContain('constant')
  })

  test('every falloff preset actually reaches zero at the edge', () => {
    for (const p of presetsFor('falloff')) {
      expect(evaluateCurve(normalizeCurve(p.build(), 'falloff'), 1)).toBe(0)
    }
  })

  test('every preset is a valid curve for the kinds it claims', () => {
    for (const p of curvePresetsAll()) {
      for (const kind of p.kinds) {
        const c = normalizeCurve(p.build(), kind)
        expect(inUnitSquare(c)).toBe(true)
        expect(sortedByX(c)).toBe(true)
        expect(c.length).toBeGreaterThan(1)
      }
    }
  })
})

// Both kinds' presets, so the sweep above cannot silently skip a set.
function curvePresetsAll() {
  return [...presetsFor('profile'), ...presetsFor('falloff')]
}

describe('pointAt — hit testing for the editor', () => {
  test('finds the nearest point inside the radius', () => {
    const c = linear()
    expect(pointAt(c, 0.02, 0.02, 0.1)).toBe(0)
    expect(pointAt(c, 0.98, 0.98, 0.1)).toBe(1)
  })

  test('returns -1 when nothing is close enough', () => {
    expect(pointAt(linear(), 0.5, 0.5, 0.05)).toBe(-1)
  })
})

describe('the plateau: a constant profile with an eased falloff', () => {
  test('reproduces `pad` — flat inside, blended to nothing at the edge', () => {
    // Tonio: "a constant province with a gradual fallout gives you a plateau",
    // which is what landform.pad(radius, level, blend) already hand-writes.
    const profile = constant(0.6)
    const falloff = falloffDefault()
    const at = (r: number) => evaluateCurve(profile, r) * evaluateCurve(falloff, r)

    // Flat and at full level in the core…
    expect(evaluateCurve(profile, 0)).toBeCloseTo(0.6, 6)
    expect(evaluateCurve(profile, 0.5)).toBeCloseTo(0.6, 6)
    // …and gone by the boundary, so it blends rather than stepping.
    expect(at(1)).toBe(0)
    expect(at(0)).toBeGreaterThan(at(0.9))
  })
})
