import { describe, expect, test } from 'bun:test'
import { drawKey } from './draw-order.js'

describe('drawKey', () => {
  const eye = { x: 10, y: 2, z: 0 }
  test('nearer sorts before farther', () => {
    const near = drawKey(false, { x: 12, y: 2, z: 0 }, eye)
    const far = drawKey(false, { x: 90, y: 2, z: 0 }, eye)
    expect(near).toBeLessThan(far)
  })
  test('a mesh pinned to the camera sorts after everything', () => {
    const sky = drawKey(true, eye, eye)
    const horizon = drawKey(false, { x: 1e6, y: 0, z: 1e6 }, eye)
    expect(sky).toBeGreaterThan(horizon)
  })
  test('two skies tie, so their creation order stands', () => {
    expect(drawKey(true, eye, eye)).toBe(
      drawKey(true, { x: 0, y: 0, z: 0 }, eye)
    )
  })
})
