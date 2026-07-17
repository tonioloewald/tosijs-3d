import { describe, expect, test } from 'bun:test'
import { projectShadowXZ, shadowWindowUv } from './cloud-shadows'

describe('projectShadowXZ', () => {
  test('straight-down sun lands the shadow directly beneath', () => {
    const at = projectShadowXZ(10, 100, -5, { x: 0, y: -1, z: 0 })
    expect(at.x).toBeCloseTo(10)
    expect(at.z).toBeCloseTo(-5)
  })

  test('a 45° sun throws the shadow one altitude sideways', () => {
    const s = Math.SQRT1_2
    const at = projectShadowXZ(0, 100, 0, { x: s, y: -s, z: 0 })
    expect(at.x).toBeCloseTo(100)
    expect(at.z).toBeCloseTo(0)
  })

  test('offset scales with height above the ground plane', () => {
    const s = Math.SQRT1_2
    const lo = projectShadowXZ(0, 50, 0, { x: s, y: -s, z: 0 })
    const hi = projectShadowXZ(0, 200, 0, { x: s, y: -s, z: 0 })
    expect(hi.x).toBeCloseTo(lo.x * 4)
  })

  test('a non-zero ground plane shortens the throw', () => {
    const s = Math.SQRT1_2
    const at = projectShadowXZ(0, 100, 0, { x: s, y: -s, z: 0 }, 60)
    expect(at.x).toBeCloseTo(40)
  })

  test('a horizontal or upward sun leaves the footprint in place', () => {
    expect(projectShadowXZ(7, 100, 3, { x: 1, y: 0, z: 0 })).toEqual({
      x: 7,
      z: 3,
    })
    expect(projectShadowXZ(7, 100, 3, { x: 0, y: 1, z: 0 })).toEqual({
      x: 7,
      z: 3,
    })
  })
})

describe('shadowWindowUv', () => {
  test('the window centre maps to (0.5, 0.5)', () => {
    expect(shadowWindowUv(100, -40, 100, -40, 2000)).toEqual({ u: 0.5, v: 0.5 })
  })

  test('the window edges map to 0 and 1', () => {
    const size = 1000
    expect(shadowWindowUv(-500, 0, 0, 0, size).u).toBeCloseTo(0)
    expect(shadowWindowUv(500, 0, 0, 0, size).u).toBeCloseTo(1)
    expect(shadowWindowUv(0, 500, 0, 0, size).v).toBeCloseTo(1)
  })

  test('outside the window falls outside 0…1 (the shader skips it)', () => {
    const { u } = shadowWindowUv(2000, 0, 0, 0, 1000)
    expect(u).toBeGreaterThan(1)
  })
})
