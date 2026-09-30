import { describe, test, expect } from 'bun:test'
import { tabLayout, tabAt, tabOrder } from './widgets3d-layout.js'

describe('file tabs (board #2466)', () => {
  test('a tab is at most half the strip', () => {
    expect(tabLayout(3, 300).w).toBe(150)
    expect(tabLayout(9, 300).w).toBe(150)
  })
  test('tabs that fit sit side by side', () => {
    const l = tabLayout(3, 300, 0.5, 80)
    expect(l.w).toBe(80)
    expect(l.x).toEqual([0, 80, 160])
  })
  test('too many OVERLAP around the active tab: left ones before it, right ones after', () => {
    const l = tabLayout(9, 320, 0.5, Infinity, 4) // w 160, active x 80..240
    expect(l.x[4]).toBe(80)
    // the left four share 0..80, the right four share 240..320
    expect(l.visible.slice(0, 4)).toEqual([
      [0, 20],
      [20, 40],
      [40, 60],
      [60, 80],
    ])
    expect(l.visible[8]).toEqual([300, 320])
    expect(l.x[8] + l.w).toBeCloseTo(320, 9)
    expect(l.visible[5]).toEqual([240, 260])
  })
  test('stacking goes TOWARD the active tab, active on top', () => {
    expect(tabOrder(5, 2)).toEqual([0, 1, 4, 3, 2])
    expect(tabOrder(3, 0)).toEqual([2, 1, 0])
  })
  test('every tab stays reachable, whichever is active', () => {
    for (let active = 0; active < 9; active++) {
      const l = tabLayout(9, 320, 0.5, Infinity, active)
      const hit = new Set<number>()
      for (let px = 0; px < 320; px++) hit.add(tabAt(px, l, active))
      for (let i = 0; i < 9; i++) expect(hit.has(i)).toBe(true)
    }
  })
  test('left of the active tab the later one is on top; right of it, the earlier', () => {
    const l = tabLayout(9, 320, 0.5, Infinity, 4)
    // active 4 (x 80..240): at px 30, tabs 0 and 1 overlap; 1 is on top
    expect(tabAt(30, l, 4)).toBe(1)
    // at px 250, right of the active one: tabs 5..8 overlap; 5 is on top
    expect(tabAt(250, l, 4)).toBe(5)
    expect(tabAt(-5, l, 4)).toBe(-1)
  })
})
