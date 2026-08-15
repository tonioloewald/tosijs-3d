import { describe, test, expect } from 'bun:test'
import { panelFitWidth } from './widgets3d-layout'

/*
A CENTRED PANEL MUST FIT THE VIEWPORT IT IS CENTRED IN.

The pause panel is camera-relative and sized in world units, so its on-screen
width depends on the camera's FOV and the viewport's ASPECT — and a number
chosen on a 16:9 monitor is too wide on a phone held upright. Reported from a
phone: the Continue button sat off-screen and had to be un-zoomed into reach,
which is a pause panel you have to fight to dismiss.

This pins the sizing rule that replaced the constant. It is the same arithmetic
`_showPausePanel` runs; keeping it here means the portrait case is checked
without a device.
*/

// The REAL function, not a copy of it: a test that mirrors the arithmetic can
// only ever confirm that I typed it twice the same way. Both panels (pause and
// death) call this one.
const panelWidth = (fov: number, aspect: number, z = 2.2, want = 1.1) =>
  panelFitWidth(fov, aspect, z, want)

const FOV = 0.8 // Babylon's default vertical FOV

describe('pause panel fit', () => {
  test('a desktop viewport gets the full intended width', () => {
    expect(panelWidth(FOV, 16 / 9)).toBeCloseTo(1.1, 5)
    expect(panelWidth(FOV, 4 / 3)).toBeCloseTo(1.1, 5)
  })

  test('a phone in PORTRAIT gets a narrower panel, not a clipped one', () => {
    // iPhone-ish portrait: 390x844.
    const w = panelWidth(FOV, 390 / 844)
    expect(w).toBeLessThan(1.1)
    // …and it stays inside the visible width, which is the whole point.
    const visibleW = 2 * 2.2 * Math.tan(FOV / 2) * (390 / 844)
    expect(w).toBeLessThanOrEqual(visibleW)
  })

  test('the old constant would NOT have fitted portrait — the bug, pinned', () => {
    const visibleW = 2 * 2.2 * Math.tan(FOV / 2) * (390 / 844)
    expect(visibleW).toBeLessThan(1.1) // 1.1 overflowed: the reported symptom
  })

  test('it never exceeds the intended width on an ultra-wide viewport', () => {
    expect(panelWidth(FOV, 21 / 9)).toBeCloseTo(1.1, 5)
    expect(panelWidth(FOV, 32 / 9)).toBeCloseTo(1.1, 5)
  })

  test('a narrower FOV shrinks the panel with it', () => {
    expect(panelWidth(0.4, 390 / 844)).toBeLessThan(panelWidth(0.8, 390 / 844))
  })
})
