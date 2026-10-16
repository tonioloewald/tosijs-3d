import { describe, test, expect, beforeAll } from 'bun:test'
import { Window } from 'happy-dom'

let D: typeof import('./dials.js')

beforeAll(async () => {
  const win = new Window() as any
  const g = globalThis as any
  g.window ??= win
  for (const k of Object.getOwnPropertyNames(win)) {
    try {
      g[k] ??= win[k]
    } catch {
      /* off-document getters */
    }
  }
  D = await import('./dials.js')
})

describe('compass', () => {
  test('the needle turns against the heading, about the centre', () => {
    const c = D.compassDial()
    c.heading = 90
    expect(
      c.querySelector('[id="Magnet"]')!.getAttribute('transform')
    ).toBe('rotate(-90 128 128)')
    c.heading = -30
    expect(c.heading).toBe(330)
  })
})

describe('watch', () => {
  test('noon is at the top and midnight at the bottom', () => {
    const w = D.watchDial({ time: 18 })
    expect(
      w.querySelector('[id="time_of_day_indicator"]')!.getAttribute('transform')
    ).toBe('rotate(90 128 128)')
  })

  test('dragging the ring sets the hour; dragging the bar sets the speed', () => {
    const times: number[] = []
    const speeds: number[] = []
    const w = D.watchDial({
      time: 12,
      speed: 1,
      handleTime: (h) => times.push(h),
      handleSpeed: (t) => speeds.push(t),
    })
    // On the ring, on the right: 6 pm.
    w.handlePointer('down', 128 + 96, 128)
    expect(w.time).toBeCloseTo(18, 6)
    // Still the ring when the drag wanders over the bar: the bottom, midnight.
    w.handlePointer('move', 128, 152)
    expect(w.time).toBeCloseTo(0, 6)
    w.handlePointer('up', 128, 152)
    expect(speeds.length).toBe(0)
    // The bar, at its slow end.
    w.handlePointer('down', 80, 152)
    w.handlePointer('up', 80, 152)
    expect(w.speed).toBe(0)
    expect(speeds.at(-1)).toBe(0)
    expect(times.length).toBe(2)
  })

  test('speed: still, then real time to an hour a second', () => {
    expect(D.watchSpeedToScale(0)).toBe(0)
    expect(D.watchSpeedToScale(0.02 + 1e-9)).toBeCloseTo(1, 3)
    expect(D.watchSpeedToScale(1)).toBeCloseTo(3600, 6)
    for (const s of [1, 10, 100, 3600])
      expect(D.watchSpeedToScale(D.scaleToWatchSpeed(s))).toBeCloseTo(s, 4)
  })
})
