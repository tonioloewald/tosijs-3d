import { describe, test, expect } from 'bun:test'
import {
  plane,
  sphere,
  depthIn,
  submergence,
  crossing,
  innermost,
  dragAt,
  fogLayerFor,
} from './medium'

const sea = plane({ name: 'water', y: 0, band: 0.4, drag: 40, maxSpeed: 12 })

describe('depthIn is signed, because depth and altitude are one measurement', () => {
  test('plane: positive below the surface, negative above', () => {
    expect(depthIn({ x: 0, y: -5, z: 0 }, sea)).toBeCloseTo(5)
    expect(depthIn({ x: 0, y: 3, z: 0 }, sea)).toBeCloseTo(-3)
    expect(depthIn({ x: 99, y: 0, z: -99 }, sea)).toBeCloseTo(0)
  })

  test('sphere: positive inside the shell, negative outside', () => {
    const atmosphere = sphere({
      name: 'air',
      centre: { x: 0, y: 0, z: 0 },
      radius: 100,
      band: 5,
    })
    expect(depthIn({ x: 0, y: 0, z: 0 }, atmosphere)).toBeCloseTo(100)
    expect(depthIn({ x: 0, y: 90, z: 0 }, atmosphere)).toBeCloseTo(10)
    expect(depthIn({ x: 0, y: 130, z: 0 }, atmosphere)).toBeCloseTo(-30)
  })
})

describe('submergence ramps rather than snapping', () => {
  test('0 well outside, 1 well inside, 0.5 exactly at the surface', () => {
    expect(submergence({ x: 0, y: 5, z: 0 }, sea)).toBeCloseTo(0)
    expect(submergence({ x: 0, y: -5, z: 0 }, sea)).toBeCloseTo(1)
    expect(submergence({ x: 0, y: 0, z: 0 }, sea)).toBeCloseTo(0.5)
  })

  test('it is monotonic through the band — no crease at either end', () => {
    let prev = -1
    for (let y = 1; y >= -1; y -= 0.05) {
      const w = submergence({ x: 0, y, z: 0 }, sea)
      expect(w).toBeGreaterThanOrEqual(prev)
      prev = w
    }
    expect(prev).toBeCloseTo(1)
  })

  test('a wider band spreads the transition', () => {
    const soft = plane({ name: 'haze', y: 0, band: 20 })
    // 2m under: fully in a tight-banded sea, barely in a wide-banded haze.
    expect(submergence({ x: 0, y: -2, z: 0 }, sea)).toBeCloseTo(1)
    expect(submergence({ x: 0, y: -2, z: 0 }, soft)).toBeLessThan(0.8)
  })
})

describe('crossing catches a fast mover the band would miss', () => {
  test('entering and exiting', () => {
    expect(crossing({ x: 0, y: 2, z: 0 }, { x: 0, y: -1, z: 0 }, sea)).toBe(
      'entered'
    )
    expect(crossing({ x: 0, y: -1, z: 0 }, { x: 0, y: 2, z: 0 }, sea)).toBe(
      'exited'
    )
  })

  test('no crossing when the step stays on one side', () => {
    expect(crossing({ x: 0, y: 9, z: 0 }, { x: 0, y: 3, z: 0 }, sea)).toBeNull()
    expect(
      crossing({ x: 0, y: -9, z: 0 }, { x: 0, y: -3, z: 0 }, sea)
    ).toBeNull()
  })

  test('A 200 m/s ROUND: 3.3 m per frame, never seen inside the 0.4 m band', () => {
    // The reason this is a step test and not a state flag. Sampling position
    // alone at 60fps, this projectile is above the water on one frame and well
    // under it on the next — anything waiting to observe a point inside the
    // band misses the splash completely.
    const above = { x: 0, y: 1.5, z: 0 }
    const below = { x: 0, y: -1.8, z: 0 }
    expect(Math.abs(depthIn(above, sea))).toBeGreaterThan(sea.band)
    expect(Math.abs(depthIn(below, sea))).toBeGreaterThan(sea.band)
    expect(crossing(above, below, sea)).toBe('entered')
  })
})

describe('innermost — space, air, water, in the order you would say them', () => {
  const air = sphere({
    name: 'air',
    centre: { x: 0, y: 0, z: 0 },
    radius: 1000,
    band: 50,
    drag: 1,
  })
  const ocean = sphere({
    name: 'ocean',
    centre: { x: 0, y: 0, z: 0 },
    radius: 900,
    band: 0.4,
    drag: 40,
  })
  const media = [air, ocean]

  test('outside everything is vacuum — the absence of a match', () => {
    expect(innermost({ x: 0, y: 5000, z: 0 }, media)).toBeNull()
  })

  test('between the shells you are in the air', () => {
    expect(innermost({ x: 0, y: 950, z: 0 }, media)?.name).toBe('air')
  })

  test('inside the inner shell you are in the ocean, not the air', () => {
    expect(innermost({ x: 0, y: 100, z: 0 }, media)?.name).toBe('ocean')
  })

  test('order of the list does not matter', () => {
    expect(innermost({ x: 0, y: 100, z: 0 }, [ocean, air])?.name).toBe('ocean')
  })
})

describe('dragAt — a torpedo needs a number, not a new integrator', () => {
  test('base drag in vacuum', () => {
    expect(dragAt({ x: 0, y: 50, z: 0 }, 0.02, [sea])).toBeCloseTo(0.02)
  })

  test('full multiplier well under', () => {
    expect(dragAt({ x: 0, y: -50, z: 0 }, 0.02, [sea])).toBeCloseTo(0.02 * 40)
  })

  test('half way through the band is part way to the multiplier', () => {
    const k = dragAt({ x: 0, y: 0, z: 0 }, 0.02, [sea]) / 0.02
    expect(k).toBeGreaterThan(1)
    expect(k).toBeLessThan(40)
  })

  test('a medium with no drag stated changes nothing', () => {
    const fog = plane({ name: 'fog', y: 100, band: 10 })
    expect(dragAt({ x: 0, y: 0, z: 0 }, 0.02, [fog])).toBeCloseTo(0.02)
  })
})

describe('the four weapons of #13, expressed in this vocabulary', () => {
  // Each is the same round with a different answer to "what does the surface
  // mean to you" — which is the whole argument for a shared primitive.
  const sea = plane({ name: 'water', y: 0, band: 0.4, drag: 40 })

  test('bomb — the surface means ENTER: drag jumps, nothing else', () => {
    const above = dragAt({ x: 0, y: 5, z: 0 }, 0.02, [sea])
    const below = dragAt({ x: 0, y: -5, z: 0 }, 0.02, [sea])
    expect(below / above).toBeCloseTo(40)
  })

  test('depth charge — the surface means SINK TO A DEPTH: a fuse predicate', () => {
    const fuseAt = 30
    expect(depthIn({ x: 0, y: -10, z: 0 }, sea) >= fuseAt).toBe(false)
    expect(depthIn({ x: 0, y: -31, z: 0 }, sea) >= fuseAt).toBe(true)
  })

  test('torpedo — the surface is a CEILING: exiting is the event to prevent', () => {
    expect(crossing({ x: 0, y: -1, z: 0 }, { x: 0, y: 0.5, z: 0 }, sea)).toBe(
      'exited'
    )
  })

  test('sub-launched missile — a ONE-WAY DOOR: exit once, then it is an air weapon', () => {
    expect(crossing({ x: 0, y: -20, z: 0 }, { x: 0, y: 4, z: 0 }, sea)).toBe(
      'exited'
    )
    // …and above the surface it flies with air drag, unchanged.
    expect(dragAt({ x: 0, y: 4, z: 0 }, 0.02, [sea])).toBeCloseTo(0.02)
  })
})

describe('⚠️ fogLayerFor — the falsifier for the whole generalisation', () => {
  // MEDIUM-DESIGN.md §8: if the optical fields are a union of knobs no two media
  // share, this is fake and the components should stay apart. So the test is
  // whether ONE derivation reproduces what each component hand-rolls today.

  test("WATER: b3d-water's own numbers, from optics alone", () => {
    // underwaterFog 0.12, underwaterMurk over a 30m ramp, sea-blue, end = 3/density
    const sea = plane({
      name: 'water',
      y: 0,
      band: 0.2,
      optics: {
        color: { r: 0, g: 0.15, b: 0.3 },
        density: 0.12,
        murk: 0.08,
        murkDepth: 30,
        minVisibility: 6,
      },
    })
    const shallow = fogLayerFor({ x: 0, y: -1, z: 0 }, sea)!
    expect(shallow.weight).toBeCloseTo(1)
    expect(shallow.color).toEqual({ r: 0, g: 0.15, b: 0.3 })
    expect(shallow.density).toBeCloseTo(0.12 + 0.08 * (1 / 30))
    expect(shallow.end).toBeCloseTo(3 / shallow.density!)

    // …and it THICKENS with depth, which is the behaviour a density-only layer lost.
    const deep = fogLayerFor({ x: 0, y: -30, z: 0 }, sea)!
    expect(deep.density!).toBeGreaterThan(shallow.density!)
    expect(deep.end!).toBeLessThan(shallow.end!)
  })

  test('CLOUD: a fog bank is the same shape with a wide band and no murk', () => {
    const bank = plane({
      name: 'cloud',
      y: 300,
      band: 40, // clouds have soft edges; water does not
      optics: { color: { r: 1, g: 1, b: 1 }, density: 0.08, minVisibility: 12 },
    })
    const inside = fogLayerFor({ x: 0, y: 250, z: 0 }, bank)!
    expect(inside.weight).toBeCloseTo(1)
    expect(inside.color).toEqual({ r: 1, g: 1, b: 1 })
    // partial immersion at the edge — the cloud's `_immersion`, derived
    const edge = fogLayerFor({ x: 0, y: 300, z: 0 }, bank)!
    expect(edge.weight).toBeCloseTo(0.5)
  })

  test('VACUUM: no optics = no layer, not a zero-weight one', () => {
    const space = sphere({
      name: 'vacuum',
      centre: { x: 0, y: 0, z: 0 },
      radius: 1e9,
      band: 1,
    })
    expect(fogLayerFor({ x: 0, y: 0, z: 0 }, space)).toBeNull()
  })

  test('outside the medium contributes nothing at all', () => {
    const sea = plane({
      name: 'water',
      y: 0,
      band: 0.2,
      optics: { density: 0.12 },
    })
    expect(fogLayerFor({ x: 0, y: 50, z: 0 }, sea)).toBeNull()
  })
})
