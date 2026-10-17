import { describe, test, expect, beforeAll } from 'bun:test'

let w3d: typeof import('./widgets3d.js')

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
  w3d = await import('./widgets3d.js')
})

describe('panel3d scroll position (#110)', () => {
  const build = () => {
    const rows = Array.from({ length: 30 }, (_, i) =>
      w3d.label3d({ text: 'row ' + i })
    )
    const panel = w3d.panel3d({ width: 300, height: 300 }, ...rows)
    return { panel, rows }
  }

  test('scrollTop reads and sets, clamped, so a rebuild can keep its place', () => {
    const a = build().panel
    expect(a.scrollable).toBe(true)
    expect(a.scrollTop).toBe(0)
    a.scrollBy(120)
    expect(a.scrollTop).toBe(120)
    const b = build().panel
    b.scrollTop = a.scrollTop
    expect(b.scrollTop).toBe(120)
    b.scrollTop = 1e6
    expect(b.scrollTop).toBeLessThan(1e6)
    expect(b.scrollTop).toBeGreaterThan(0)
    b.scrollTop = -5
    expect(b.scrollTop).toBe(0)
  })

  test('reveal scrolls the least that brings a row into view', () => {
    const { panel, rows } = build()
    expect(panel.reveal(rows[0])).toBe(true)
    expect(panel.scrollTop).toBe(0)
    expect(panel.reveal(rows[29])).toBe(true)
    const bottom = panel.scrollTop
    expect(bottom).toBeGreaterThan(0)
    // Already in view: nothing moves.
    expect(panel.reveal(rows[28])).toBe(true)
    expect(panel.scrollTop).toBe(bottom)
    panel.reveal(rows[2])
    expect(panel.scrollTop).toBeLessThan(bottom)
    expect(panel.reveal(w3d.label3d({ text: 'elsewhere' }))).toBe(false)
  })
})
