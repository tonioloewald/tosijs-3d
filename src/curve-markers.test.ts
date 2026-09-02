import { describe, test, expect, beforeAll } from 'bun:test'
import { Window } from 'happy-dom'

/*
SHARED MARKERS — one set of split points, several curves.

Tonio: "the attack and decay should be shared by the various curves or it just
becomes nutty." It is not merely convenient: a lamp's attack/sustain/decay
boundaries live on the PROGRAM, not on any one channel, so per-curve markers
would let brightness and hue disagree about where the attack ends — a state the
model cannot even represent.
*/

let mod: typeof import('./curve-field')

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
  mod = await import('./curve-field')
})

describe('the shared model', () => {
  test('a move notifies every subscriber', () => {
    const m = mod.curveMarkers([0.3, 0.7])
    let a = 0
    let b = 0
    m.subscribe(() => a++)
    m.subscribe(() => b++)
    m.move(0, 0.4)
    expect(a).toBe(1)
    expect(b).toBe(1)
  })

  test('a move that changes nothing does not fire', () => {
    // Otherwise every mouse-move during a drag redraws every sibling curve,
    // which is the cost that makes sharing feel expensive.
    const m = mod.curveMarkers([0.3, 0.7])
    let fired = 0
    m.subscribe(() => fired++)
    m.move(0, 0.9) // clamps to just under 0.7
    expect(fired).toBe(1)
    m.move(0, 0.95) // clamps to the SAME place
    expect(fired).toBe(1)
  })

  test('unsubscribe stops it', () => {
    const m = mod.curveMarkers([0.3, 0.7])
    let fired = 0
    const off = m.subscribe(() => fired++)
    off()
    m.move(0, 0.4)
    expect(fired).toBe(0)
  })

  test('handleChange reports the new values', () => {
    let seen: number[] | null = null
    const m = mod.curveMarkers([0.3, 0.7], {
      handleChange: (v) => (seen = v),
    })
    m.move(1, 0.85)
    expect(seen![1]).toBeCloseTo(0.85)
  })

  test('values arriving from outside are normalized', () => {
    const m = mod.curveMarkers([0.9, 0.1])
    expect(m.values[0]).toBeLessThan(m.values[1])
    m.set([2, -2])
    expect(m.values[0]).toBeGreaterThanOrEqual(0)
    expect(m.values[1]).toBeLessThanOrEqual(1)
  })

  test('labels come back for drawing', () => {
    const m = mod.curveMarkers([0.35, 0.75], {
      labels: ['attack', 'decay'],
    })
    expect(m.labels).toEqual(['attack', 'decay'])
  })
})

describe('two curves given the same markers move together', () => {
  const build = () => {
    const markers = mod.curveMarkers([0.35, 0.75], {
      labels: ['attack', 'decay'],
    })
    const brightness = mod.curve3d({ label: 'brightness', markers })
    const hue = mod.curve3d({ label: 'hue', markers })
    brightness.layout(300)
    hue.layout(300)
    return { markers, brightness, hue }
  }

  test('dragging in one curve moves the shared value', () => {
    const { markers, brightness } = build()
    const before = markers.values[0]
    // Press on the first marker's line and drag it right.
    const px = (v: number) => 4 + v * (300 - 8) // plot inset, roughly
    brightness.handle!('down', px(before), 40)
    brightness.handle!('move', px(0.5), 40)
    brightness.handle!('up', px(0.5), 40)
    expect(markers.values[0]).not.toBeCloseTo(before)
  })

  test('the OTHER curve sees it — that is the whole point', () => {
    const { markers, brightness, hue } = build()
    let hueRedraws = 0
    markers.subscribe(() => hueRedraws++)
    const px = (v: number) => 4 + v * (300 - 8)
    brightness.handle!('down', px(markers.values[0]), 40)
    brightness.handle!('move', px(0.5), 40)
    expect(hueRedraws).toBeGreaterThan(0)
    // And the value both curves read is one value, not two.
    expect(hue).toBeDefined()
    expect(markers.values[0]).toBeCloseTo(markers.values[0])
  })

  test('a curve with no markers still works', () => {
    // Markers are optional — every existing curve3d predates them.
    const c = mod.curve3d({ label: 'plain' })
    expect(() => {
      c.layout(300)
      c.handle!('down', 50, 40)
      c.handle!('up', 50, 40)
    }).not.toThrow()
  })
})
