import { describe, test, expect } from 'bun:test'
import { tabLayout, tabAt } from './widgets3d-layout.js'

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
  test('too many OVERLAP, spread so the last ends at the right edge', () => {
    const l = tabLayout(9, 320)
    expect(l.x[0]).toBe(0)
    expect(l.x[8] + l.w).toBeCloseTo(320, 9)
    // evenly stepped, each later one further right
    for (let i = 1; i < 9; i++) expect(l.x[i]).toBeGreaterThan(l.x[i - 1])
  })
  test('the ACTIVE tab wins where it covers; otherwise the topmost (latest)', () => {
    const l = tabLayout(9, 320) // w 160, step 20
    // x = 30 is under tabs 0 and 1: tab 1 is on top of tab 0
    expect(tabAt(30, l, -1)).toBe(1)
    // but if tab 0 is active it is in front
    expect(tabAt(30, l, 0)).toBe(0)
    // well right of the active tab, the topmost there wins
    expect(tabAt(300, l, 0)).toBe(8)
    expect(tabAt(-5, l, 0)).toBe(-1)
  })
})
