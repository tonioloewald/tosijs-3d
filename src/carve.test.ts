import { describe, test, expect } from 'bun:test'
import {
  applyCarve,
  sphere,
  capsule,
  tube,
  box,
  union,
  smoothUnion,
  subtract,
  intersect,
  roughen,
  warp,
  shaft,
  type Carve,
} from './carve'

/** Walk a ray and find where the carve's sign changes — its surface. */
const surfaceAlong = (
  c: Carve,
  from: [number, number, number],
  dir: [number, number, number],
  max = 200
) => {
  let prev = c(...from)
  for (let t = 0.05; t < max; t += 0.05) {
    const v = c(
      from[0] + dir[0] * t,
      from[1] + dir[1] * t,
      from[2] + dir[2] * t
    )
    if (v < 0 !== prev < 0) return t
    prev = v
  }
  return null
}

describe('the primitives measure what they claim', () => {
  test('sphere: positive inside, zero at the radius, negative outside', () => {
    const s = sphere({ x: 10, y: -5, z: 3 }, 8)
    expect(s(10, -5, 3)).toBeCloseTo(8) // centre: distance to the wall
    expect(s(18, -5, 3)).toBeCloseTo(0) // on the surface
    expect(s(20, -5, 3)).toBeLessThan(0) // in the rock
  })

  test('capsule: a segment with a radius — uniform along it, round at the caps', () => {
    const c = capsule({ x: 0, y: 0, z: 0 }, { x: 100, y: 0, z: 0 }, 6)
    for (const x of [0, 25, 50, 100]) {
      expect(c(x, 0, 0)).toBeCloseTo(6) // the axis is `radius` from the wall
      expect(c(x, 6, 0)).toBeCloseTo(0) // …and the wall is where it says
    }
    expect(c(-6, 0, 0)).toBeCloseTo(0) // the cap is round, not flat
    expect(c(-8, 0, 0)).toBeLessThan(0)
  })

  test('capsule tapers when given a second radius', () => {
    const c = capsule({ x: 0, y: 0, z: 0 }, { x: 100, y: 0, z: 0 }, 10, 2)
    expect(c(0, 0, 0)).toBeCloseTo(10)
    expect(c(100, 0, 0)).toBeCloseTo(2)
    expect(c(50, 0, 0)).toBeCloseTo(6)
  })

  test('tube chains capsules with NO gap at the bend', () => {
    const t = tube(
      [
        { x: 0, y: 0, z: 0 },
        { x: 50, y: 0, z: 0 },
        { x: 50, y: 0, z: 50 },
      ],
      8
    )
    // walk the spine including the corner: air the whole way
    for (let s = 0; s <= 50; s += 5) {
      expect(t(s, 0, 0)).toBeGreaterThan(0)
      expect(t(50, 0, s)).toBeGreaterThan(0)
    }
    expect(t(50, 0, 0)).toBeGreaterThan(0) // the elbow itself
  })

  test('box: rounded, and its half-extents are honoured', () => {
    const b = box({ x: 0, y: 0, z: 0 }, { x: 20, y: 5, z: 10 }, 2)
    expect(b(0, 0, 0)).toBeGreaterThan(0)
    expect(b(19, 0, 0)).toBeGreaterThan(0)
    expect(b(21, 0, 0)).toBeLessThan(0)
    expect(b(0, 6, 0)).toBeLessThan(0)
  })
})

describe('composition', () => {
  const a = sphere({ x: -10, y: 0, z: 0 }, 12)
  const b = sphere({ x: 10, y: 0, z: 0 }, 12)

  test('union is the air of both', () => {
    const u = union(a, b)
    expect(u(-10, 0, 0)).toBeGreaterThan(0)
    expect(u(10, 0, 0)).toBeGreaterThan(0)
    expect(u(0, 0, 30)).toBeLessThan(0)
  })

  test('smoothUnion FILLETS the junction — more air at the waist than a hard union', () => {
    const hard = union(a, b)
    const soft = smoothUnion(8, a, b)
    // at the waist between the two spheres the blend adds material
    expect(soft(0, 0, 8)).toBeGreaterThan(hard(0, 0, 8))
    // …without moving the far side of either sphere much
    expect(soft(-22, 0, 0)).toBeCloseTo(hard(-22, 0, 0), 0)
  })

  test('smoothUnion with k = 0 is exactly a hard union', () => {
    const soft = smoothUnion(0, a, b)
    const hard = union(a, b)
    for (const p of [
      [0, 0, 0],
      [-10, 3, 2],
      [14, 0, 0],
    ] as const) {
      expect(soft(p[0], p[1], p[2])).toBe(hard(p[0], p[1], p[2]))
    }
  })

  test('subtract leaves rock standing inside the air', () => {
    const hall = sphere({ x: 0, y: 0, z: 0 }, 30)
    const pillar = capsule({ x: 0, y: -30, z: 0 }, { x: 0, y: 30, z: 0 }, 5)
    const withPillar = subtract(hall, pillar)
    expect(withPillar(20, 0, 0)).toBeGreaterThan(0) // open floor
    expect(withPillar(0, 0, 0)).toBeLessThan(0) // solid pillar
  })

  test('intersect clips one carve to another', () => {
    const clipped = intersect(
      sphere({ x: 0, y: 0, z: 0 }, 40),
      box({ x: 0, y: 0, z: 0 }, { x: 10, y: 40, z: 40 })
    )
    expect(clipped(0, 0, 0)).toBeGreaterThan(0)
    expect(clipped(20, 0, 0)).toBeLessThan(0) // outside the box, inside the sphere
  })
})

describe('perturbation — what stops a carve looking carved', () => {
  const straight = capsule({ x: 0, y: 0, z: 0 }, { x: 300, y: 0, z: 0 }, 12)

  test('roughen moves the WALL but keeps the passage a passage', () => {
    const rough = roughen(straight, {
      amp: 3,
      scale: 0.05,
      octaves: 3,
      seed: 5,
    })
    let min = Infinity
    let max = -Infinity
    let open = 0
    for (let x = 10; x < 290; x += 5) {
      const r = surfaceAlong(rough, [x, 0, 0], [0, 1, 0], 40)!
      expect(r).not.toBeNull()
      min = Math.min(min, r)
      max = Math.max(max, r)
      if (rough(x, 0, 0) > 0) open++
    }
    expect(open).toBe(56) // the axis is air for the whole length
    expect(max - min).toBeGreaterThan(1) // …but the wall is not a cylinder
    expect(min).toBeGreaterThan(12 - 3 - 0.6) // and it eats at most `amp`
    expect(max).toBeLessThan(12 + 3 + 0.6)
  })

  test('roughen is deterministic per seed, and different across seeds', () => {
    const a = roughen(straight, { amp: 3, scale: 0.05, seed: 1 })
    const b = roughen(straight, { amp: 3, scale: 0.05, seed: 1 })
    const c = roughen(straight, { amp: 3, scale: 0.05, seed: 2 })
    expect(a(37, 4, 2)).toBe(b(37, 4, 2))
    expect(a(37, 4, 2)).not.toBe(c(37, 4, 2))
  })

  test('warp MEANDERS the spine — the axis wanders off the straight line', () => {
    const bent = warp(straight, { amp: 14, scale: 0.008, octaves: 2, seed: 3 })
    // find the air centre at a few stations: it should NOT stay at z = 0
    let maxOffset = 0
    for (let x = 40; x < 280; x += 20) {
      let best = -Infinity
      let bestZ = 0
      for (let z = -40; z <= 40; z += 1) {
        const v = bent(x, 0, z)
        if (v > best) {
          best = v
          bestZ = z
        }
      }
      maxOffset = Math.max(maxOffset, Math.abs(bestZ))
    }
    expect(maxOffset).toBeGreaterThan(4) // it wanders
  })

  test('a warped tunnel still CONNECTS (the clearance caveat, made concrete)', () => {
    // warp moves the surface, so a passage must be re-checked, not assumed —
    // this is the check, and it's why TUNNEL-DESIGN says certify after warping.
    const bent = warp(straight, { amp: 10, scale: 0.01, seed: 9 })
    let blocked = 0
    for (let x = 10; x < 290; x += 5) {
      let open = false
      for (let z = -30; z <= 30 && !open; z += 1) {
        for (let y = -20; y <= 20 && !open; y += 1) {
          if (bent(x, y, z) > 0) open = true
        }
      }
      if (!open) blocked++
    }
    expect(blocked).toBe(0)
  })
})

describe('shaft — written in DEPTH so it follows the hillside', () => {
  const s = shaft(0, 0, 20, 120, { x: 30, y: 0, z: 0 })

  test('open from the surface down to its floor, sealed below', () => {
    expect(s(0, 0, 0, 0)).toBeGreaterThan(0) // at the mouth
    expect(s(0, 0, 0, -60)).toBeGreaterThan(0) // halfway down
    expect(s(0, 0, 0, -130)).toBeLessThan(0) // past the floor: rock
  })

  test('lean slides the bore sideways with depth — not a plumb line', () => {
    expect(s(0, 0, 0, -5)).toBeGreaterThan(0) // near the top, still over x=0
    expect(s(30, 0, 0, -118)).toBeGreaterThan(0) // near the floor, moved to x=30
    expect(s(30, 0, 0, -5)).toBeLessThan(0) // that spot is rock up top
  })

  test('applyCarve only ever ADDS air to the density', () => {
    const field = applyCarve(sphere({ x: 0, y: 0, z: 0 }, 10))
    expect(field(0, 0, 0, -50)).toBeGreaterThan(-50) // carved open
    expect(field(100, 0, 0, -50)).toBe(-50) // untouched rock, exactly
  })
})
