import { describe, expect, test } from 'bun:test'
import {
  blendSample,
  circle,
  constant,
  deletePoint,
  easeInOut,
  evaluateCurve,
  falloffDefault,
  insertPoint,
  linear,
  movePoint,
  closePolygon,
  isStarShaped,
  polygonExtent,
  messyNgon,
  shelfAndMountains,
  desertTerraces,
  moveVertex,
  ngon,
  normalizeCurve,
  polygonVertices,
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
  test('a flattening preset is offered for a profile and NOT for a falloff', () => {
    // Falls straight out of the endpoint rule: a constant-valued falloff is
    // weight 1 at the boundary, which is the step the pin exists to prevent.
    // (The preset is named `flatten` now — named for what it does to terrain
    // rather than for the shape of its graph.)
    expect(presetsFor('profile').map((p) => p.name)).toContain('flatten')
    for (const p of presetsFor('falloff')) {
      const c = normalizeCurve(p.build(), 'falloff')
      expect(evaluateCurve(c, 1)).toBe(0)
    }
  })

  test('presets are named for what they are, not for their maths', () => {
    // A menu offering "ease in-out" tells you the shape of a graph; "smooth
    // edge" tells you what the province will look like, which is the question
    // being asked. The maths names stay exported as building blocks.
    const falloffs = presetsFor('falloff').map((p) => p.name)
    expect(falloffs).toContain('plateau')
    expect(falloffs).toContain('smooth edge')
    expect(falloffs).toContain('abrupt edge')
    const shapes = presetsFor('profile').map((p) => p.name)
    expect(shapes).toContain('shelf + mountains')
    expect(shapes).toContain('desert terraces')
    expect(shapes).toContain('no change')
  })

  test('"no change" really is the identity', () => {
    const c = normalizeCurve(
      presetsFor('profile')
        .find((p) => p.name === 'no change')!
        .build(),
      'profile'
    )
    for (const t of [0, 0.3, 0.7, 1])
      expect(evaluateCurve(c, t)).toBeCloseTo(t, 6)
  })

  test('shelf + mountains has a FLAT middle — that is what makes it read as Earth', () => {
    // Real terrain spends most of its area near sea level; a monotonic ramp
    // reads as noise.
    const c = normalizeCurve(shelfAndMountains(), 'profile')
    const shelf = [0.2, 0.3, 0.4].map((t) => evaluateCurve(c, t))
    const spread = Math.max(...shelf) - Math.min(...shelf)
    expect(spread).toBeLessThan(0.08)
    // …and the top of the range climbs hard.
    expect(evaluateCurve(c, 1) - evaluateCurve(c, 0.85)).toBeGreaterThan(0.25)
  })

  test('desert terraces steps, and never dips', () => {
    const c = normalizeCurve(desertTerraces(), 'profile')
    let last = -1
    for (let i = 0; i <= 40; i++) {
      const v = evaluateCurve(c, i / 40)
      expect(v).toBeGreaterThanOrEqual(last - 1e-9)
      last = v
    }
  })

  test('messy circle is deterministic and still star-shaped', () => {
    // A footprint that reshuffled on reload would make a province
    // unreproducible, which is the one thing a seeded world cannot have.
    expect(messyNgon()).toEqual(messyNgon())
    expect(isStarShaped(messyNgon())).toBe(true)
    // …and actually messy, or the name lies.
    const rs = messyNgon().map((v) => v.y)
    expect(Math.max(...rs) - Math.min(...rs)).toBeGreaterThan(0.05)
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
    const at = (r: number) =>
      evaluateCurve(profile, r) * evaluateCurve(falloff, r)

    // Flat and at full level in the core…
    expect(evaluateCurve(profile, 0)).toBeCloseTo(0.6, 6)
    expect(evaluateCurve(profile, 0.5)).toBeCloseTo(0.6, 6)
    // …and gone by the boundary, so it blends rather than stepping.
    expect(at(1)).toBe(0)
    expect(at(0)).toBeGreaterThan(at(0.9))
  })
})

describe('blendSample — why the closed range buys anything', () => {
  test('a convex blend of in-range values cannot leave the range', () => {
    // The point of the whole exercise: a tile's bounds are known BEFORE anything
    // is evaluated, so a carve can be authored against a real height rather than
    // against "usually about this tall".
    for (let i = 0; i <= 20; i++) {
      for (let j = 0; j <= 20; j++) {
        const a = i / 20
        const b = j / 20
        for (const w of [0, 0.13, 0.5, 0.87, 1]) {
          const out = blendSample(a, b, w)
          expect(out).toBeGreaterThanOrEqual(0)
          expect(out).toBeLessThanOrEqual(1)
        }
      }
    }
  })

  test('the endpoints are exactly the two inputs', () => {
    expect(blendSample(0.2, 0.9, 0)).toBeCloseTo(0.2, 6)
    expect(blendSample(0.2, 0.9, 1)).toBeCloseTo(0.9, 6)
  })

  test('out-of-range inputs are clamped, not trusted', () => {
    // The guarantee is worth more than the caller's arithmetic.
    expect(blendSample(5, -5, 0.5)).toBeCloseTo(0.5, 6)
    expect(blendSample(NaN, 1, 1)).toBe(1)
  })

  test('composing a whole province stays in range for every preset pair', () => {
    for (const p of presetsFor('profile')) {
      for (const f of presetsFor('falloff')) {
        const shape = normalizeCurve(p.build(), 'profile')
        const fall = normalizeCurve(f.build(), 'falloff')
        for (let i = 0; i <= 10; i++) {
          const r = i / 10
          const out = blendSample(
            0.5,
            evaluateCurve(shape, r),
            evaluateCurve(fall, r)
          )
          expect(out).toBeGreaterThanOrEqual(0)
          expect(out).toBeLessThanOrEqual(1)
        }
      }
    }
  })
})

describe('radial — the FOOTPRINT, and it has to close', () => {
  test('the two ends are the same point, one turn apart', () => {
    // Disagreeing ends put a discontinuity along one bearing, which reads as a
    // crack in the province rather than as a curve that needed pinning.
    const c = normalizeCurve(
      [
        { x: 0, y: 0.4 },
        { x: 0.5, y: 1 },
        { x: 1, y: 0.9 },
      ],
      'radial'
    )
    expect(c[c.length - 1].y).toBe(c[0].y)
  })

  test('dragging either end moves BOTH — they are one point seen twice', () => {
    const start = normalizeCurve(circle(), 'radial')
    const moved = movePoint(start, 0, 0, 0.3, 'radial')
    expect(moved.points[0].y).toBeCloseTo(0.3, 6)
    expect(moved.points[moved.points.length - 1].y).toBeCloseTo(0.3, 6)

    const other = movePoint(start, start.length - 1, 1, 0.7, 'radial')
    expect(other.points[0].y).toBeCloseTo(0.7, 6)
    expect(other.points[other.points.length - 1].y).toBeCloseTo(0.7, 6)
  })

  test('a circle is every direction alike', () => {
    const c = normalizeCurve(circle(), 'radial')
    for (const t of [0, 0.2, 0.5, 0.8, 1]) {
      expect(evaluateCurve(c, t)).toBeCloseTo(1, 6)
    }
  })

  test('an n-gon is exactly n vertices — a hexagon is six numbers', () => {
    // Tonio: "a hexagon would just be a hexagon."
    for (const n of [3, 4, 6, 8, 16]) expect(ngon(n)).toHaveLength(n)
  })

  test('an n-gon reaches full extent at its vertices and less on its edges', () => {
    // Circumradius 1: the vertices touch the declared extent, the edges fall
    // inside it, and cos(pi/n) is exactly the edge-midpoint radius.
    for (const n of [3, 4, 6, 8]) {
      const v = ngon(n)
      expect(polygonExtent(v, 0)).toBeCloseTo(1, 6)
      expect(polygonExtent(v, 1 / (2 * n))).toBeCloseTo(
        Math.cos(Math.PI / n),
        6
      )
    }
  })

  test('EDGES ARE STRAIGHT — the reason for ray-casting', () => {
    // Interpolating radius against angle (what a piecewise-linear curve does)
    // bows every edge inward. Checked against the true straight-edge radius at
    // several points along one edge of a square, to six places: an interpolation
    // would be visibly short in the middle.
    const sq = ngon(4)
    for (const frac of [0.1, 0.25, 0.5, 0.75, 0.9]) {
      const t = frac / 4 // along the first edge
      const a = t * Math.PI * 2
      const exact = Math.cos(Math.PI / 4) / Math.cos(a - Math.PI / 4)
      expect(polygonExtent(sq, t)).toBeCloseTo(exact, 6)
    }
  })

  test('a circle is a 16-gon, and is round enough to pass for one', () => {
    // Tonio: "a circle becomes the expensive shape but even that could be a 16
    // gon and work quite well." Worst case is the edge midpoint, cos(pi/16).
    const c = circle()
    expect(c).toHaveLength(16)
    let lo = 1
    for (let i = 0; i <= 200; i++) lo = Math.min(lo, polygonExtent(c, i / 200))
    expect(lo).toBeGreaterThan(0.98)
  })

  test('an n-gon has n-fold symmetry', () => {
    const v = ngon(6)
    for (const t of [0.03, 0.09, 0.14]) {
      expect(polygonExtent(v, t)).toBeCloseTo(polygonExtent(v, t + 1 / 6), 6)
    }
  })

  test('the ray goes FORWARD — the opposite edge crosses the line too', () => {
    // Every direction must return a positive radius; a sign slip here would
    // silently mirror the footprint for half the compass.
    const v = ngon(5)
    for (let i = 0; i < 40; i++)
      expect(polygonExtent(v, i / 40)).toBeGreaterThan(0)
  })

  test('points stay monotonic in theta', () => {
    // Tonio: "it's just a closed ngon and its points are monotonic in theta."
    expect(sortedByX(normalizeCurve(ngon(5), 'radial'))).toBe(true)
  })
})

describe('footprint polygons — monotonic in theta, and enclosing the centre', () => {
  const square = () => polygonVertices(ngon(4))

  test('vertices round-trip through the closed form', () => {
    const v = square()
    expect(closePolygon(v)[0].y).toBeCloseTo(v[0].y, 6)
    expect(polygonVertices(closePolygon(v))).toHaveLength(v.length)
  })

  test('a vertex cannot be dragged through its neighbour', () => {
    // Tonio: "you can't move a point to make an edge degenerate". Clamped, not
    // rejected — a drag that stops shows you the limit; one that refuses looks
    // broken.
    const v = square()
    const target = v[2].x // try to land exactly on the next vertex
    const { vertices: moved } = moveVertex(v, 1, target, v[1].y)
    expect(moved[1].x).toBeLessThan(v[2].x)
    expect(moved[1].x).toBeGreaterThan(v[0].x)
    expect(isStarShaped(moved)).toBe(true)
  })

  test('and cannot be dragged backwards through the previous one either', () => {
    const v = square()
    const { vertices: moved } = moveVertex(v, 2, v[1].x, v[2].y)
    expect(moved[2].x).toBeGreaterThan(v[1].x)
    expect(isStarShaped(moved)).toBe(true)
  })

  test('a vertex cannot reach the centre', () => {
    // At the origin two edges collapse onto each other and "distance in this
    // direction" stops having an answer.
    const { vertices: moved } = moveVertex(square(), 0, 0, 0)
    expect(moved[0].y).toBeGreaterThanOrEqual(0.05)
    expect(isStarShaped(moved)).toBe(true)
  })

  test('the wrap needs no special case — vertex 0 clamps against the last', () => {
    const v = square()
    // Drag vertex 0 backwards past x = 0, i.e. through the wrap.
    const { vertices: moved, index } = moveVertex(v, 0, 0.99, 0.8)
    // It wrapped to the far end of the array and says so — the list is a CYCLIC
    // sequence in a linear array, and reporting the new index is what keeps a
    // drag holding the point it started on.
    expect(moved).toHaveLength(v.length)
    expect(isStarShaped(moved)).toBe(true)
    expect(moved[index].y).toBeCloseTo(0.8, 6)
  })

  test('every n-gon preset is star-shaped to begin with', () => {
    for (const n of [3, 4, 6, 8]) {
      expect(isStarShaped(polygonVertices(ngon(n)))).toBe(true)
    }
  })

  test('no drag can make a polygon un-star-shaped', () => {
    // Sweep: every vertex, dragged to a spread of angles and radii.
    let v = polygonVertices(ngon(6))
    for (let i = 0; i < v.length; i++) {
      for (const t of [0, 0.17, 0.4, 0.83, 1.2, -0.3]) {
        for (const r of [-1, 0, 0.3, 1, 4]) {
          v = moveVertex(v, i, t, r).vertices
          expect(isStarShaped(v)).toBe(true)
        }
      }
    }
  })
})

describe('a profile is a LEVELS MAP, not a second radial curve', () => {
  test('a linear profile passes the height sample through, at ANY weight', () => {
    // Tonio: "the default province would be a line from 0,0 to 1,1 and this
    // would just pass the height sample through directly." That is the identity
    // property, and it holds for every falloff weight — which is what makes a
    // fresh province invisible until you shape it.
    const identity = linear()
    for (let i = 0; i <= 20; i++) {
      const sample = i / 20
      for (const w of [0, 0.25, 0.5, 0.75, 1]) {
        expect(
          blendSample(sample, evaluateCurve(identity, sample), w)
        ).toBeCloseTo(sample, 6)
      }
    }
  })

  test('a constant profile FLATTENS whatever terrain is there — the plateau', () => {
    // …and this is why constant + a gradual falloff reproduces `pad`: at full
    // weight every sample maps to one height, so the ground goes flat.
    const flat = constant(0.6)
    const heights = [0, 0.2, 0.5, 0.9, 1].map((sample) =>
      blendSample(sample, evaluateCurve(flat, sample), 1)
    )
    for (const h of heights) expect(h).toBeCloseTo(0.6, 6)
  })

  test('at zero weight the province has no say, whatever its profile', () => {
    for (const p of presetsFor('profile')) {
      const c = normalizeCurve(p.build(), 'profile')
      for (const sample of [0.1, 0.4, 0.8]) {
        expect(blendSample(sample, evaluateCurve(c, sample), 0)).toBeCloseTo(
          sample,
          6
        )
      }
    }
  })
})
