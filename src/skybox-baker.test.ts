import { describe, expect, test } from 'bun:test'
import {
  starsFromGalaxy,
  starsFromVoxelGalaxy,
  defaultBakePose,
} from './skybox-baker.js'
import { voxelGalaxy } from './voxel-galaxy.js'

const pt = (x: number, s = 1, r = 1) => ({
  position: { x, y: 0, z: 0 },
  scaling: { x: s },
  color: { r, g: 1, b: 1 },
})

// A galaxy shaped like b3d-galaxy's: the star mesh holds the disc stars
// followed by the distant stars, which also have their own accessor.
const galaxy = {
  getStarPoints: () => [pt(10, 1), pt(20, 2), pt(30, 0.5)],
  getDistantStarParticles: () => [pt(30, 0.5)],
  getDistantGalaxyParticles: () => [pt(40, 4.5)],
  getGalaxyData: () => ({
    stars: [
      { spectralType: 'G2', scale: 1 },
      { spectralType: 'M5', scale: 2 },
    ],
  }),
}

describe('starsFromGalaxy', () => {
  test('encodes each distant star ONCE, not again as a disc star', () => {
    const out = starsFromGalaxy(galaxy, { x: 0, y: 0, z: 0 })
    // 2 disc stars + 1 distant galaxy + 1 distant star
    expect(out.length).toBe(4)
    expect(out.filter((o) => o.x === 30).length).toBe(1)
  })

  test('disc stars carry spectral colour and brightness from authored scale', () => {
    const [a, b] = starsFromGalaxy(galaxy, { x: 0, y: 0, z: 0 })
    expect(a.spectral).toBeDefined()
    expect(b.brightness).toBe(1) // the largest scale normalises to 1
    expect(a.brightness).toBe(0.5)
  })

  test('positions are relative to the eye', () => {
    const [a] = starsFromGalaxy(galaxy, { x: 10, y: 1, z: 2 })
    expect([a.x, a.y, a.z]).toEqual([0, -1, -2])
  })

  test('a distant galaxy is a disc — it has a size', () => {
    const out = starsFromGalaxy(galaxy, { x: 0, y: 0, z: 0 })
    expect(out.find((o) => o.x === 40)?.size).toBe(0.5)
  })

  test('without star data, every star point is taken', () => {
    const bare = { getStarPoints: galaxy.getStarPoints }
    expect(starsFromGalaxy(bare, { x: 0, y: 0, z: 0 }).length).toBe(3)
  })
})

describe('defaultBakePose', () => {
  test('55% out, just off the plane', () => {
    const pose = defaultBakePose(100)
    expect(pose.x).toBeCloseTo(55, 9)
    expect([pose.y, pose.z]).toEqual([1, 0])
  })
})

describe('starsFromVoxelGalaxy — the voxel galaxy as a point sky', () => {
  const galaxy = voxelGalaxy({
    seed: 3,
    samples: 20000,
    nx: 32,
    ny: 32,
    nz: 10,
    brightBudget: 1500,
    dimBudget: 200000,
  })
  const shell = {
    distantGalaxies: [
      {
        position: { x: 2, y: 0, z: 0 },
        scale: 4.5,
        rgb: [200, 200, 255] as [number, number, number],
        type: 'emission' as const,
        opacity: 1,
      },
    ],
    distantStars: [
      {
        position: { x: 0, y: 2, z: 0 },
        scale: 1,
        rgb: [255, 220, 160] as [number, number, number],
      },
    ],
  }
  const eye = defaultBakePose(100, 0.42, 1)
  const sky = starsFromVoxelGalaxy(galaxy, shell, eye, {
    dimReach: 0.03,
    floor: 0.02,
  })

  test('every bright star, the local dim stars, and the shell once', () => {
    expect(sky.bright).toBe(galaxy.brightStars().length)
    expect(sky.dim).toBeGreaterThan(0)
    expect(sky.objects.length).toBe(sky.bright + sky.dim + 2)
  })

  test('no dim star below the floor or beyond the computed radius', () => {
    // The dim objects follow the bright ones and precede the shell.
    const dim = sky.objects.slice(sky.bright, sky.bright + sky.dim)
    const sf = 100 / 0.9
    for (const o of dim) {
      expect(o.brightness).toBeGreaterThanOrEqual(0.02)
      expect(Math.hypot(o.x, o.y, o.z) / sf).toBeLessThanOrEqual(
        sky.dimRadius + 1e-9
      )
    }
  })

  test("the frame is the live galaxy's: generator z-up → scene y-up, scaled", () => {
    const s = galaxy.brightStars()[0]
    const o = sky.objects[0]
    const sf = 100 / 0.9
    expect(o.x).toBeCloseTo(s.position.x * sf - eye.x, 6)
    expect(o.y).toBeCloseTo(s.position.z * sf - eye.y, 6)
    expect(o.z).toBeCloseTo(s.position.y * sf - eye.z, 6)
  })
})
