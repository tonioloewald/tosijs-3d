import { describe, expect, test } from 'bun:test'
import {
  resetSpringChain,
  shiftSpringChain,
  springChain,
  stepSpringChain,
  type SpringChain,
} from './spring-chain.js'

const Q0 = { x: 0, y: 0, z: 0, w: 1 }
// A ponytail sticking straight back (-Z) from the head, five 10 cm segments.
const straightBack = () =>
  springChain(
    [0, 1, 2, 3, 4, 5].map((i) => ({ x: 0, y: 1.7, z: -0.1 * i })),
    Q0
  )
const run = (
  c: SpringChain,
  seconds: number,
  params = {},
  anchor = { x: 0, y: 1.7, z: 0 }
) => {
  for (let t = 0; t < seconds; t += 1 / 60)
    stepSpringChain(c, anchor, Q0, 1 / 60, params)
}
const segLengths = (c: SpringChain) =>
  c.points
    .slice(1)
    .map((p, i) =>
      Math.hypot(p.x - c.points[i].x, p.y - c.points[i].y, p.z - c.points[i].z)
    )

describe('spring chain', () => {
  test('with no stiffness it hangs straight down, lengths kept', () => {
    const c = straightBack()
    run(c, 6, { stiffness: 0 })
    const tip = c.points[5]
    expect(tip.y).toBeCloseTo(1.2, 2)
    expect(Math.abs(tip.z)).toBeLessThan(0.01)
    for (const l of segLengths(c)) expect(l).toBeCloseTo(0.1, 6)
  })

  test('stiff and weightless, it holds its rest shape', () => {
    const c = straightBack()
    run(c, 2, { stiffness: 0.9, gravity: { x: 0, y: 0, z: 0 } })
    expect(c.points[5].z).toBeCloseTo(-0.5, 4)
    expect(c.points[5].y).toBeCloseTo(1.7, 4)
  })

  test('stiffness is a dial: more of it, less sag', () => {
    const sag = (stiffness: number) => {
      const c = straightBack()
      run(c, 4, { stiffness })
      return 1.7 - c.points[5].y
    }
    expect(sag(0.05)).toBeGreaterThan(sag(0.3))
    expect(sag(0.3)).toBeGreaterThan(sag(0.8))
  })

  test('it trails a moving anchor, then swings back and settles', () => {
    const c = straightBack()
    run(c, 3, { stiffness: 0 })
    // Run forward (+Z) at 4 m/s for half a second: the tail streams behind.
    for (let i = 0; i < 30; i++)
      stepSpringChain(c, { x: 0, y: 1.7, z: (i + 1) * (4 / 60) }, Q0, 1 / 60, {
        stiffness: 0,
      })
    const head = c.points[0]
    expect(c.points[5].z).toBeLessThan(head.z - 0.1)
    // Stop: it swings past the vertical, then comes to rest under the head.
    let passed = false
    for (let i = 0; i < 600; i++) {
      stepSpringChain(c, head, Q0, 1 / 60, { stiffness: 0 })
      if (c.points[5].z > head.z + 0.02) passed = true
    }
    expect(passed).toBe(true)
    expect(Math.abs(c.points[5].z - head.z)).toBeLessThan(0.01)
  })

  test('a collider keeps it outside a shoulder', () => {
    const c = springChain(
      [0, 1, 2, 3, 4, 5].map((i) => ({ x: 0, y: 1.7, z: -0.1 * i })),
      Q0
    )
    const shoulder = { center: { x: 0, y: 1.45, z: -0.05 }, radius: 0.15 }
    for (let t = 0; t < 4; t += 1 / 60)
      stepSpringChain(c, { x: 0, y: 1.7, z: 0 }, Q0, 1 / 60, { stiffness: 0 }, [
        shoulder,
      ])
    for (const p of c.points.slice(1)) {
      const d = Math.hypot(
        p.x - shoulder.center.x,
        p.y - shoulder.center.y,
        p.z - shoulder.center.z
      )
      expect(d).toBeGreaterThan(0.15 + 0.03 - 0.02)
    }
  })

  test('frame rate does not change the motion', () => {
    const a = straightBack()
    const b = straightBack()
    for (let t = 0; t < 120; t++)
      stepSpringChain(a, { x: 0, y: 1.7, z: 0 }, Q0, 1 / 60)
    for (let t = 0; t < 180; t++)
      stepSpringChain(b, { x: 0, y: 1.7, z: 0 }, Q0, 1 / 90)
    expect(a.points[5].y).toBeCloseTo(b.points[5].y, 3)
    expect(a.points[5].z).toBeCloseTo(b.points[5].z, 3)
  })

  test('the rest shape turns with the anchor', () => {
    const c = straightBack()
    // The head turned 90° about Y: "back" is now -X.
    const turn = { x: 0, y: Math.SQRT1_2, z: 0, w: Math.SQRT1_2 }
    resetSpringChain(c, { x: 0, y: 1.7, z: 0 }, turn)
    expect(c.points[5].x).toBeCloseTo(-0.5)
    expect(c.points[5].z).toBeCloseTo(0)
  })

  test('a shift moves it without setting it swinging', () => {
    const a = straightBack()
    const b = straightBack()
    run(a, 1, { stiffness: 0 })
    run(b, 1, { stiffness: 0 })
    shiftSpringChain(b, { x: 100, y: 0, z: 0 })
    run(a, 1, { stiffness: 0 })
    run(b, 1, { stiffness: 0 }, { x: 100, y: 1.7, z: 0 })
    for (let i = 0; i < a.points.length; i++) {
      expect(b.points[i].x).toBeCloseTo(a.points[i].x + 100, 6)
      expect(b.points[i].y).toBeCloseTo(a.points[i].y, 6)
      expect(b.points[i].z).toBeCloseTo(a.points[i].z, 6)
    }
  })
})
