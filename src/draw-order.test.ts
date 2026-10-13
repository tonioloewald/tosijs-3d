import { describe, expect, test } from 'bun:test'
import { drawKey, nearFirst } from './draw-order.js'

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

describe('nearFirst', () => {
  const fake = (n: number) => {
    let asked = 0
    const subs = Array.from({ length: n }, (_, i) => ({
      getMesh: () => ({ infiniteDistance: false }),
      getBoundingInfo: () => {
        asked++
        return {
          boundingSphere: { centerWorld: { x: (i * 7919) % n, y: 0, z: 0 } },
        }
      },
    }))
    return { subs, asked: () => asked }
  }

  test('works each key out once per pass, however often it is compared', () => {
    let pass = 1
    const scene = {
      activeCamera: { globalPosition: { x: 0, y: 0, z: 0 } },
      getRenderId: () => pass,
    }
    const order = nearFirst(scene as any)
    const { subs, asked } = fake(500)
    const sorted = [...subs].sort(order as any)
    expect(asked()).toBe(500)
    // Nearest first.
    const x = (s: any) => s.getBoundingInfo().boundingSphere.centerWorld.x
    expect(x(sorted[0])).toBeLessThanOrEqual(x(sorted[499]))
    // A new pass asks again: the camera may have moved.
    const before = asked()
    pass = 2
    ;[...subs].sort(order as any)
    expect(asked() - before).toBe(500)
  })
})
