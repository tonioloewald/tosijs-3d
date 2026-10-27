import { describe, expect, test } from 'bun:test'
import * as BABYLON from '@babylonjs/core'
import { touchOrbit, WHEEL_SHARE } from './touch-orbit.js'

const camera = (set?: (c: BABYLON.ArcRotateCamera) => void) => {
  const scene = new BABYLON.Scene(new BABYLON.NullEngine())
  const c = new BABYLON.ArcRotateCamera('c', 0, 1, 4, BABYLON.Vector3.Zero(), scene)
  set?.(c)
  touchOrbit(c)
  return c
}

describe('touchOrbit', () => {
  test('the wheel zooms by a share of the distance', () => {
    expect(camera().wheelDeltaPercentage).toBe(WHEEL_SHARE)
  })

  test("a page's own wheel setting wins", () => {
    const precise = camera((c) => (c.wheelPrecision = 60))
    expect(precise.wheelDeltaPercentage).toBe(0)
    expect(precise.wheelPrecision).toBe(60)
    expect(camera((c) => (c.wheelDeltaPercentage = 0.02)).wheelDeltaPercentage).toBe(0.02)
  })

  test('zoom stops short of the target', () => {
    expect(camera().lowerRadiusLimit).toBeGreaterThan(0)
  })
})
