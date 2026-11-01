import { describe, expect, test } from 'bun:test'
import { windowsLit } from './window-lights.js'

describe('how many windows are lit', () => {
  test('peaks around ten, rare after midnight, back up at five', () => {
    const peak = windowsLit(22)
    for (let h = 0; h < 24; h += 0.25) expect(windowsLit(h)).toBeLessThanOrEqual(peak)
    expect(windowsLit(2)).toBeLessThan(peak / 4)
    expect(windowsLit(6)).toBeGreaterThan(windowsLit(3) * 3)
  })

  test('continuous round the clock', () => {
    for (let h = 0; h < 48; h += 0.01) expect(Math.abs(windowsLit(h + 0.01) - windowsLit(h))).toBeLessThan(0.01)
  })
})
