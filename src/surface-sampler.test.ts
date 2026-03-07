import { test, expect, describe } from 'bun:test'
import { TorusSampler, SphereSampler } from './surface-sampler'

describe('TorusSampler', () => {
  const torus = new TorusSampler(10, 3)

  test('sample at u=0,v=0 is on the outer edge', () => {
    const p = torus.sample(0, 0)
    // At u=0, v=0: x = majorR + minorR, y = 0, z = 0
    expect(p.x).toBeCloseTo(13)
    expect(p.y).toBeCloseTo(0)
    expect(p.z).toBeCloseTo(0)
  })

  test('sample wraps seamlessly at u=1', () => {
    const p0 = torus.sample(0, 0)
    const p1 = torus.sample(1, 0)
    expect(p1.x).toBeCloseTo(p0.x, 5)
    expect(p1.y).toBeCloseTo(p0.y, 5)
    expect(p1.z).toBeCloseTo(p0.z, 5)
  })

  test('sample wraps seamlessly at v=1', () => {
    const p0 = torus.sample(0, 0)
    const p1 = torus.sample(0, 1)
    expect(p1.x).toBeCloseTo(p0.x, 5)
    expect(p1.y).toBeCloseTo(p0.y, 5)
    expect(p1.z).toBeCloseTo(p0.z, 5)
  })

  test('normal at u=0,v=0 points outward', () => {
    const n = torus.normal(0, 0)
    expect(n.x).toBeCloseTo(1)
    expect(n.y).toBeCloseTo(0)
    expect(n.z).toBeCloseTo(0)
  })

  test('normal is unit length', () => {
    const n = torus.normal(0.3, 0.7)
    const len = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z)
    expect(len).toBeCloseTo(1)
  })
})

describe('SphereSampler', () => {
  const sphere = new SphereSampler(5)

  test('sample at north pole', () => {
    const p = sphere.sample(0, 0)
    expect(p.y).toBeCloseTo(5)
    expect(Math.abs(p.x)).toBeLessThan(0.001)
    expect(Math.abs(p.z)).toBeLessThan(0.001)
  })

  test('sample at equator u=0', () => {
    const p = sphere.sample(0, 0.5)
    expect(p.x).toBeCloseTo(5)
    expect(Math.abs(p.y)).toBeLessThan(0.001)
    expect(Math.abs(p.z)).toBeLessThan(0.001)
  })

  test('sample wraps seamlessly at u=1', () => {
    const p0 = sphere.sample(0, 0.5)
    const p1 = sphere.sample(1, 0.5)
    expect(p1.x).toBeCloseTo(p0.x, 5)
    expect(p1.y).toBeCloseTo(p0.y, 5)
    expect(p1.z).toBeCloseTo(p0.z, 5)
  })

  test('normal is unit length', () => {
    const n = sphere.normal(0.3, 0.7)
    const len = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z)
    expect(len).toBeCloseTo(1)
  })

  test('sample lies on sphere surface', () => {
    const p = sphere.sample(0.3, 0.7)
    const dist = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z)
    expect(dist).toBeCloseTo(5)
  })
})
