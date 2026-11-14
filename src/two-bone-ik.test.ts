import { describe, expect, test } from 'bun:test'
import { twoBoneIk } from './two-bone-ik.js'
import { rotateVector, sub } from './spatial-transform.js'

const len = (v: { x: number; y: number; z: number }) => Math.hypot(v.x, v.y, v.z)

describe('twoBoneIk', () => {
  // A straight arm out along +x, 0.3 + 0.25 long.
  const root = { x: 0, y: 0, z: 0 }
  const mid = { x: 0.3, y: 0, z: 0 }
  const end = { x: 0.55, y: 0, z: 0 }

  test('reaches a point in range, the elbow bending the asked way', () => {
    const goal = { x: 0.2, y: 0, z: 0.25 }
    const t = twoBoneIk(root, mid, end, goal, { x: 0, y: -1, z: 0 })!
    expect(len(sub(t.end, goal))).toBeLessThan(1e-6)
    expect(len(sub(t.mid, root))).toBeCloseTo(0.3, 6)
    expect(len(sub(t.end, t.mid))).toBeCloseTo(0.25, 6)
    expect(t.mid.y).toBeLessThan(-0.05)
    // The turns carry the bones where the joints went.
    const upper = rotateVector(t.first, sub(mid, root))
    expect(len(sub(upper, sub(t.mid, root)))).toBeLessThan(1e-6)
    const lower = rotateVector(t.second, sub(end, mid))
    expect(len(sub(lower, sub(t.end, t.mid)))).toBeLessThan(1e-6)
  })

  test('reaches toward a point out of range in a straight line', () => {
    const t = twoBoneIk(root, mid, end, { x: 0, y: 0, z: 2 }, { x: 0, y: -1, z: 0 })!
    expect(t.end.z).toBeCloseTo(0.55, 4)
    expect(Math.abs(t.end.x)).toBeLessThan(1e-4)
  })

  test('nothing to do when already there', () => {
    expect(twoBoneIk(root, mid, end, end, { x: 0, y: -1, z: 0 })).toBeNull()
  })
})
