import { beforeAll, describe, expect, test } from 'bun:test'
import { radialSlot } from './radial-layout.js'

let withBack: typeof import('./radial-host.js').withBack
let isRadialBack: typeof import('./radial-host.js').isRadialBack

// The host imports the drawing, which needs a document.
beforeAll(async () => {
  const { Window } = await import('happy-dom')
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
  ;({ withBack, isRadialBack } = await import('./radial-host.js'))
})

describe('withBack', () => {
  test("a sub-ring's back points straight up", () => {
    for (let n = 1; n <= 7; n++) {
      const items = withBack(
        Array.from({ length: n }, (_, i) => ({ label: `${i}` }))
      )
      const i = items.findIndex(isRadialBack)
      expect(i).toBeGreaterThanOrEqual(0)
      expect(radialSlot(i, items).angle).toBeCloseTo(0, 9)
    }
  })
  test('an item set apart still points (about) down', () => {
    const items = withBack([
      { label: 'a' },
      { label: 'b' },
      { label: 'c' },
      { label: 'd' },
      { label: 'drop', apart: true },
    ])
    const back = items.findIndex(isRadialBack)
    const drop = items.findIndex((it) => it.label === 'drop')
    expect(radialSlot(back, items).angle).toBeCloseTo(0, 9)
    const a = radialSlot(drop, items).angle
    const off = Math.abs(((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) - Math.PI)
    expect(off).toBeLessThan(0.4)
  })
})
