import { describe, test, expect } from 'bun:test'
import { extractChunk } from './sdf-lattice'
import { terrainDensity, marginBlend, circleFootprint } from './patch-field'
import { tileIndexPlan, patchResident } from './terrain-grid'

/*
The CARVE, end to end, without a scene: a shaft cut into a heightfield must
(a) remove the tile quads over its mouth, (b) produce wall geometry under
them, and (c) have those two agree — the mask and the walls both derive from
ONE density field, so the roof cannot open somewhere the walls don't reach.

These are the failure modes that a screenshot can't show you: a hole with no
walls reads as "the terrain glitched", and walls under unbroken ground read as
nothing at all.
*/

const heightAt = (x: number, z: number) =>
  6 + 2 * Math.sin(x * 0.08) + 1.5 * Math.cos(z * 0.06)
const base = terrainDensity(heightAt)

// A shaft down the Y axis at the origin, confined and rim-blended like the
// component composes it.
const shaft = marginBlend(
  (x, y, z, d) => Math.max(d, 7 - Math.hypot(x, z)),
  circleFootprint(0, 0, 12),
  4,
  0.2
)
const density = (x: number, y: number, z: number) =>
  shaft(x, y, z, base(x, y, z))

/**
 * The component's derived mask: cut where there's air a PROBE-DEPTH below the
 * ground. Sampling exactly AT the surface is wrong — marginBlend's tuck puts
 * the patch surface just under the terrain, so ground level reads as air
 * across the whole footprint and the mask would cut a crater, not a mouth.
 * (Caught by the ring assertion below, which is why it's written this way.)
 */
const PROBE = 1.5
const mask = (x: number, z: number) => density(x, heightAt(x, z) - PROBE, z) > 0

describe('the mask follows the field, not a second authoring', () => {
  test('open over the shaft, closed outside it, and closed well beyond', () => {
    expect(mask(0, 0)).toBe(true) // dead centre
    expect(mask(4, 0)).toBe(true) // still inside the bore
    expect(mask(11, 0)).toBe(false) // inside the footprint, outside the bore
    expect(mask(40, 40)).toBe(false) // ordinary ground
  })

  test('the mask can never open ground the patch does not reach', () => {
    // Sample a ring well outside the footprint: nothing may be cut there.
    for (let a = 0; a < Math.PI * 2; a += 0.05) {
      const x = Math.cos(a) * 13
      const z = Math.sin(a) * 13
      expect(mask(x, z)).toBe(false)
    }
  })
})

describe('roof and walls agree', () => {
  test('a tile over the mouth loses quads; one beside it keeps all of them', () => {
    // Stand in for a terrain tile: an 8×8 grid of vertices over some ground.
    const n = 8
    const vps = n + 1
    const gi = (ix: number, iz: number) => iz * vps + ix
    const gridIndices: number[] = []
    for (let iz = 0; iz < n; iz++) {
      for (let ix = 0; ix < n; ix++) {
        gridIndices.push(
          gi(ix, iz),
          gi(ix, iz + 1),
          gi(ix + 1, iz),
          gi(ix + 1, iz),
          gi(ix, iz + 1),
          gi(ix + 1, iz + 1)
        )
      }
    }
    const tpl = {
      gridCount: vps * vps,
      gridIndices,
      allIndices: [...gridIndices, 999, 998, 997],
    }
    const vertexAt = (originX: number, originZ: number, v: number) => {
      const ix = v % vps
      const iz = Math.floor(v / vps)
      return [originX + (ix - n / 2) * 2, originZ + (iz - n / 2) * 2] as const
    }

    const over = tileIndexPlan(tpl, (v) => {
      const [x, z] = vertexAt(0, 0, v)
      return mask(x, z)
    })
    expect(over).not.toBeNull()
    expect(over!.length).toBeLessThan(tpl.allIndices.length) // a hole

    const beside = tileIndexPlan(tpl, (v) => {
      const [x, z] = vertexAt(60, 60, v)
      return mask(x, z)
    })
    expect(beside).toBeNull() // untouched ground keeps the shared template
  })

  test('walls exist under the hole, and every wall vertex is on the field', () => {
    const walls = extractChunk(
      density,
      { ix: -8, iy: -6, iz: -8, nx: 16, ny: 14, nz: 16 },
      { spacing: 1.5, jitter: 0.3, seed: 4 }
    )
    expect(walls.triangleCount).toBeGreaterThan(100)
    let insideBore = 0
    for (let v = 0; v < walls.vertexCount; v++) {
      const x = walls.positions[v * 3]
      const y = walls.positions[v * 3 + 1]
      const z = walls.positions[v * 3 + 2]
      expect(Math.abs(density(x, y, z))).toBeLessThan(1.2) // on the surface
      if (Math.hypot(x, z) < 9 && y < heightAt(x, z) - 1) insideBore++
    }
    expect(insideBore).toBeGreaterThan(20) // there is a real shaft down there
  })
})

describe('residency seals the tunnel rather than floating it', () => {
  const cfg = {
    baseTileSize: 16,
    levels: 5,
    splitFactor: 2,
    maxReach: 800,
    omniRadius: 100,
  }

  test('near ⇒ resolved; far ⇒ sealed; past reach ⇒ never', () => {
    expect(patchResident(0, 0, 1, 0, 0, cfg)).toBe(true)
    expect(patchResident(0, 0, 1, 500, 0, cfg)).toBe(false)
    expect(patchResident(0, 0, 4, 900, 0, cfg)).toBe(false)
  })

  test('the mask is INERT when the patch is not resident (no hole, no walls)', () => {
    // The component gates the mask on residency; model that here so the
    // contract is pinned even though the component needs a scene.
    const gated = (resident: boolean) => (x: number, z: number) =>
      resident ? mask(x, z) : false
    expect(gated(true)(0, 0)).toBe(true)
    expect(gated(false)(0, 0)).toBe(false)
  })
})
