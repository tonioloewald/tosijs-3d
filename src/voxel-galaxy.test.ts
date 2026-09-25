import { describe, expect, test } from 'bun:test'
import { sampleSpiral, starNameFor } from './galaxy-data.js'
import {
  hash32,
  voxelGalaxy,
  starAddress,
  parseStarAddress,
  type VoxelStar,
} from './voxel-galaxy.js'

// A SMALL galaxy for most tests — the properties are scale-free, and the
// suite should stay fast (a per-star expect loop once cost a second here).
const SMALL = {
  seed: 7,
  samples: 30000,
  nx: 32,
  ny: 32,
  nz: 10,
  brightBudget: 3000,
  dimBudget: 15000,
}
const g = voxelGalaxy(SMALL)
const allDim = (galaxy = g) => {
  const out: VoxelStar[] = []
  for (let v = 0; v < galaxy.voxelCount; v++)
    for (const s of galaxy.starsInVoxel(v, 'dim')) out.push(s)
  return out
}

describe('hash32', () => {
  test('is deterministic and order-sensitive', () => {
    expect(hash32(1, 2, 3)).toBe(hash32(1, 2, 3))
    expect(hash32(1, 2, 3)).not.toBe(hash32(3, 2, 1))
    expect(hash32(1, 2)).not.toBe(hash32(1, 2, 0)) // length is mixed in
  })
})

describe('density', () => {
  test('every voxel is non-zero, and it sums to 1', () => {
    let sum = 0
    for (const d of g.density) {
      expect(d).toBeGreaterThan(0)
      sum += d
    }
    expect(sum).toBeCloseTo(1, 9)
  })

  test('the fringe holds exactly its pinned share', () => {
    let fringe = 0
    for (let v = 0; v < g.voxelCount; v++)
      if (!g.populated[v]) fringe += g.density[v]
    expect(fringe).toBeCloseTo(g.options.fringeShare, 9)
  })
})

describe('identity and determinism', () => {
  test('the same options give the same galaxy', () => {
    const again = voxelGalaxy(SMALL)
    const a = g.brightStars()
    const b = again.brightStars()
    expect(b.length).toBe(a.length)
    expect(b.map((s) => s.id + s.position.x)).toEqual(
      a.map((s) => s.id + s.position.x)
    )
  })

  test('a voxel is the same whatever was generated first', () => {
    const fresh = voxelGalaxy(SMALL)
    const v = g.voxelOf({ x: 0.3, y: 0.2, z: 0 })
    // g has generated everything bright already; fresh has generated nothing.
    const a = fresh.starsInVoxel(v, 'dim')
    const b = g.starsInVoxel(v, 'dim')
    expect(a).toEqual(b)
  })

  test('every star has a unique address, and seeds almost never collide', () => {
    const stars = [...g.brightStars(), ...allDim()]
    expect(new Set(stars.map((s) => s.id)).size).toBe(stars.length)
    // generateGalaxy at 100k: 63% of stars share a seed with another. Derived
    // 32-bit seeds collide only by chance (~n²/2³³).
    const seen = new Set<number>()
    let collisions = 0
    for (const s of stars) {
      if (seen.has(s.seed)) collisions++
      seen.add(s.seed)
    }
    expect(collisions).toBeLessThanOrEqual(1)
  })

  test('a different galaxy seed gives a different galaxy', () => {
    const other = voxelGalaxy({ ...SMALL, seed: 8 })
    expect(other.brightStars()[0].position).not.toEqual(
      g.brightStars()[0].position
    )
  })
})

describe('budgets, placement and the populations', () => {
  test('totals land within noise of the budgets', () => {
    expect(
      Math.abs(g.brightStars().length - SMALL.brightBudget) / SMALL.brightBudget
    ).toBeLessThan(0.03)
    expect(
      Math.abs(allDim().length - SMALL.dimBudget) / SMALL.dimBudget
    ).toBeLessThan(0.03)
  })

  test('every star lies inside its own voxel', () => {
    const outside = [...g.brightStars(), ...allDim()].filter(
      (s) => g.voxelOf(s.position) !== s.voxel
    )
    expect(outside.length).toBe(0)
  })

  test('bright is O–G5 and dim is G6–M — the cut is the mix', () => {
    const badBright = g
      .brightStars()
      .filter(
        (s) =>
          s.spectralClass === 'K' ||
          s.spectralClass === 'M' ||
          (s.spectralClass === 'G' && s.spectralIndex > 5)
      )
    const badDim = allDim().filter(
      (s) =>
        !(
          s.spectralClass === 'K' ||
          s.spectralClass === 'M' ||
          (s.spectralClass === 'G' && s.spectralIndex >= 6)
        )
    )
    expect(badBright.length).toBe(0)
    expect(badDim.length).toBe(0)
  })
})

describe('the local query the baker needs', () => {
  const eye = { x: 0.5, y: 0, z: 0.01 }

  test('dimStarsNear is exactly the dim stars of the voxels near the point', () => {
    const near = g.voxelsNear(eye, 0.15)
    const expected = near.flatMap((v) => g.starsInVoxel(v, 'dim'))
    expect(g.dimStarsNear(eye, 0.15)).toEqual(expected)
    // ...and only a small fraction of the galaxy was touched.
    expect(near.length).toBeLessThan(g.voxelCount * 0.05)
  })

  test('every voxel it touches actually comes within the radius', () => {
    const r = 0.15
    for (const v of g.voxelsNear(eye, r)) {
      const c = g.voxelCenter(v)
      // centre-to-point minus the half-diagonal is a lower bound on the box
      const half = Math.hypot(
        2.1 / SMALL.nx / 2,
        2.1 / SMALL.ny / 2,
        0.6 / SMALL.nz / 2
      )
      expect(
        Math.hypot(c.x - eye.x, c.y - eye.y, c.z - eye.z) - half
      ).toBeLessThanOrEqual(r + 1e-9)
    }
  })

  test('and it misses none that do', () => {
    const r = 0.15
    const near = new Set(g.voxelsNear(eye, r))
    const within = allDim().filter(
      (s) =>
        Math.hypot(
          s.position.x - eye.x,
          s.position.y - eye.y,
          s.position.z - eye.z
        ) <= r
    )
    for (const s of within) expect(near.has(s.voxel)).toBe(true)
  })
})

describe('the falsifier — it reproduces the galaxy it was sampled from', () => {
  /*
  GALAXY-DESIGN.md: the global bright pass plus every voxel's dim pass must
  reproduce the sampled distribution within noise. If matching needed a special
  case, that case would name what the model is missing.
  */
  // The MODEL the density is sampled from (not generateGalaxy, which is now
  // an adapter over this very galaxy and would make the test circular).
  const sampled = sampleSpiral(SMALL.seed, SMALL.samples)
  const generated = [...g.brightStars(), ...allDim()].map((s) => s.position)

  const hist = (
    pts: Array<{ x: number; y: number; z: number }>,
    key: (p: { x: number; y: number; z: number }) => number | null,
    bins: number
  ) => {
    const h = new Array(bins).fill(0)
    let n = 0
    for (const p of pts) {
      const k = key(p)
      if (k == null) continue
      h[Math.min(bins - 1, Math.max(0, Math.floor(k * bins)))]++
      n++
    }
    return h.map((c) => c / n)
  }

  test('the radial profile matches', () => {
    const radial = (p: { x: number; y: number }) => Math.hypot(p.x, p.y) / 1.05
    const a = hist(sampled, radial, 10)
    const b = hist(generated, radial, 10)
    for (let i = 0; i < 10; i++)
      expect(Math.abs(a[i] - b[i])).toBeLessThan(0.025)
  })

  test('the ARMS survive — the angular pattern at mid radius correlates', () => {
    const angle = (p: { x: number; y: number }) => {
      const r = Math.hypot(p.x, p.y)
      if (r < 0.35 || r > 0.7) return null
      return (Math.atan2(p.y, p.x) + Math.PI) / (2 * Math.PI)
    }
    const a = hist(sampled, angle, 36)
    const b = hist(generated, angle, 36)
    const mean = (x: number[]) => x.reduce((s, v) => s + v, 0) / x.length
    const ma = mean(a)
    const mb = mean(b)
    let num = 0
    let da = 0
    let db = 0
    for (let i = 0; i < a.length; i++) {
      num += (a[i] - ma) * (b[i] - mb)
      da += (a[i] - ma) ** 2
      db += (b[i] - mb) ** 2
    }
    expect(num / Math.sqrt(da * db)).toBeGreaterThan(0.8)
  })
})

describe('at the default scale', () => {
  test('~5k bright, and the bake-point query is small and cheap', () => {
    const full = voxelGalaxy({ seed: 1234 })
    const bright = full.brightStars().length
    expect(Math.abs(bright - 5000)).toBeLessThan(150)
    const near = full.voxelsNear({ x: 0.495, y: 0, z: 0.01 }, 0.08)
    expect(near.length).toBeLessThan(full.voxelCount * 0.01)
  })
})

describe('view — the GalaxyData every consumer reads (reconciliation)', () => {
  test('every bright star, named from its seed, with its address', () => {
    const v = g.view()
    expect(v.stars.length).toBe(g.brightStars().length)
    const s = v.stars[0]
    expect(s.id).toMatch(/^7:bright:\d+:\d+$/)
    expect(s.name).toBe(starNameFor(s.seed))
    expect(new Set(v.stars.map((x) => x.id)).size).toBe(v.stars.length)
    // Sorted by name, as the old generator's consumers expect.
    for (let i = 1; i < v.stars.length; i++)
      expect(v.stars[i - 1].name <= v.stars[i].name).toBe(true)
  })

  test('dim stars join only near a point', () => {
    const eye = { x: 0.5, y: 0, z: 0.01 }
    const near = g.view({ near: eye, radius: 0.1 })
    expect(near.stars.length).toBe(
      g.brightStars().length + g.dimStarsNear(eye, 0.1).length
    )
    expect(near.stars.some((s) => s.id!.startsWith('7:dim:'))).toBe(true)
  })

  test('nebulae and shell are on their own seeds — the star budget cannot move them', () => {
    const a = voxelGalaxy({ ...SMALL, nebulaBudget: 300 })
    const b = voxelGalaxy({ ...SMALL, brightBudget: 900, nebulaBudget: 300 })
    expect(b.nebulae()).toEqual(a.nebulae())
    expect(b.shell()).toEqual(a.shell())
    expect(voxelGalaxy({ ...SMALL, seed: 8 }).shell()).not.toEqual(a.shell())
  })

  test('the distant galaxies are appended to nebulae, as before', () => {
    const v = g.view()
    const { distantGalaxies } = g.shell()
    expect(v.nebulae.slice(-distantGalaxies.length)).toEqual(distantGalaxies)
    expect(v.distantStars.length).toBe(3000)
  })
})

describe('star(id) — an address resolves without the galaxy', () => {
  test('finds exactly the star the view has under that id', () => {
    const eye = { x: 0.5, y: 0, z: 0.01 }
    const v = g.view({ near: eye, radius: 0.1 })
    for (const s of [
      v.stars[0],
      v.stars.find((x) => x.id!.startsWith('7:dim:'))!,
    ])
      expect(g.star(s.id!)).toEqual(s)
  })

  test('a fresh galaxy resolves it too — identity does not depend on loading', () => {
    const id = g.view().stars[7].id!
    expect(voxelGalaxy(SMALL).star(id)).toEqual(g.star(id))
  })

  test('malformed or vacant addresses are null', () => {
    expect(g.star('nonsense')).toBeNull()
    expect(g.star('7:bright:999999999:0')).toBeNull()
    // Another galaxy's address does not resolve here.
    expect(g.star('8:bright:0:0')).toBeNull()
  })

  test('an address resolves in a galaxy computed with a SMALLER budget (Tonio)', () => {
    const big = voxelGalaxy({ ...SMALL, dimBudget: 60000 })
    const small = voxelGalaxy({ ...SMALL, dimBudget: 2000 })
    const eye = { x: 0.5, y: 0, z: 0.01 }
    // A star the small galaxy never shows: beyond its count in that voxel.
    const shown = new Set(small.dimStarsNear(eye, 0.1).map((s) => s.id))
    const extra = big.dimStarsNear(eye, 0.1).find((s) => !shown.has(s.id))!
    expect(extra).toBeDefined()
    expect(small.star(extra.id)).toEqual(big.star(extra.id))
    // …and the stars both show are the same stars.
    const both = small.dimStarsNear(eye, 0.1)[0]
    expect(big.star(both.id)).toEqual(small.star(both.id))
  })

  test('starAddress and parseStarAddress round-trip', () => {
    expect(parseStarAddress(starAddress(1234, 'dim', 5021, 3))).toEqual({
      seed: 1234,
      population: 'dim',
      voxel: 5021,
      n: 3,
    })
    expect(parseStarAddress('bright:1:2')).toBeNull()
  })
})
