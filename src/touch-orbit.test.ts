import { describe, expect, test } from 'bun:test'
import * as BABYLON from '@babylonjs/core'
import { pinchZoom, touchOrbit, WHEEL_SHARE } from './touch-orbit.js'

const camera = (set?: (c: BABYLON.ArcRotateCamera) => void) => {
  const scene = new BABYLON.Scene(new BABYLON.NullEngine())
  const c = new BABYLON.ArcRotateCamera(
    'c',
    0,
    1,
    4,
    BABYLON.Vector3.Zero(),
    scene
  )
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
    expect(
      camera((c) => (c.wheelDeltaPercentage = 0.02)).wheelDeltaPercentage
    ).toBe(0.02)
  })

  test('zoom stops short of the target', () => {
    expect(camera().lowerRadiusLimit).toBeGreaterThan(0)
  })

  test('a pinch sent as wheel notches zooms one step a notch', () => {
    expect(pinchZoom(100)).toBeCloseTo(pinchZoom(120), 6)
    expect(pinchZoom(100)).toBeLessThan(1.2)
    expect(pinchZoom(-100)).toBeCloseTo(1 / pinchZoom(100), 6)
  })

  test("a trackpad's small pinch events follow the pinch, capped", () => {
    expect(pinchZoom(2)).toBeCloseTo(Math.exp(0.06), 6)
    expect(pinchZoom(40)).toBeCloseTo(Math.exp(0.25), 6)
  })
})
