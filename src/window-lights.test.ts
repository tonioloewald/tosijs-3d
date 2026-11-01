import { describe, expect, test } from 'bun:test'
import { roomLit } from './window-lights.js'

/** The share of a street's rooms lit at `hour`. */
function share(hour: number): number {
  let lit = 0
  let n = 0
  for (let a = 0; a < 1; a += 0.01)
    for (let b = 0; b < 1; b += 0.05) {
      n++
      // A fresh bathroom roll per room, as the shader's hash gives.
      if (roomLit(a, b, hour, (a * 7.3 + b * 3.1 + hour) % 1)) lit++
    }
  return lit / n
}

describe('room habits', () => {
  test('busiest around ten, rare after midnight, back up at five', () => {
    const hours = Array.from({ length: 48 }, (_, i) => i / 2)
    const busiest = hours.reduce((a, b) => (share(b) > share(a) ? b : a))
    expect(busiest).toBeGreaterThanOrEqual(20)
    expect(busiest).toBeLessThanOrEqual(23)
    const peak = share(busiest)
    expect(share(3)).toBeLessThan(peak / 4)
    expect(share(6.5)).toBeGreaterThan(share(3) * 3)
  })

  test('a room keeps its habit: an always-dark room never lights, a night owl is lit at midnight', () => {
    for (let h = 0; h < 24; h += 0.25) expect(roomLit(0.1, 0.5, h, 0)).toBe(false)
    expect(roomLit(0.3, 0.5, 0, 0.5)).toBe(true)
    expect(roomLit(0.3, 0.5, 12, 0.5)).toBe(false)
  })
})
