import { describe, test, expect, beforeAll } from 'bun:test'
import { Window } from 'happy-dom'

// widgets3d builds SVG at import time, so it needs a DOM first.
let w3d: typeof import('./widgets3d')

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
  w3d = await import('./widgets3d')
})

const measureOf = (panel: SVGSVGElement) =>
  (
    panel as unknown as { measure: () => import('./widgets3d-layout').PanelFit }
  ).measure()

const rows = (n: number) =>
  Array.from({ length: n }, (_, i) => w3d.button3d({ label: `row ${i}` }))

describe("panel3d height: 'fit' — a panel sized by what it holds", () => {
  test('grows to its content, and reports that nothing is hidden', () => {
    const panel = w3d.panel3d({ width: 300, height: 'fit' }, ...rows(4))
    const m = measureOf(panel)
    expect(m.fits).toBe(true)
    expect(m.overflow).toBe(0)
    // the rendered height really follows the content, rather than a constant
    expect(Number(panel.getAttribute('height'))).toBeGreaterThan(m.content)
  })

  test('more content ⇒ a taller panel (the property, not a magic number)', () => {
    const small = Number(
      w3d
        .panel3d({ width: 300, height: 'fit' }, ...rows(2))
        .getAttribute('height')
    )
    const big = Number(
      w3d
        .panel3d({ width: 300, height: 'fit' }, ...rows(8))
        .getAttribute('height')
    )
    expect(big).toBeGreaterThan(small)
  })

  test('fit is the DEFAULT — the silent-clipping case has to be opted into', () => {
    const fitted = w3d.panel3d({ width: 300 }, ...rows(3))
    expect(measureOf(fitted).fits).toBe(true)
  })
})

describe('panel3d measure() — clipping stops being silent', () => {
  test('a too-short panel says so, instead of just cropping', () => {
    // Exactly the ensemble failure: a height guessed too small looks identical
    // to a control that was never added.
    const panel = w3d.panel3d({ width: 300, height: 80 }, ...rows(8))
    const m = measureOf(panel)
    expect(m.fits).toBe(false)
    expect(m.overflow).toBeGreaterThan(0)
    expect(m.content).toBeGreaterThan(m.viewport)
  })

  test('and such a panel is scrollable, so nothing is unreachable', () => {
    const panel = w3d.panel3d({ width: 300, height: 80 }, ...rows(8))
    expect((panel as unknown as { scrollable: boolean }).scrollable).toBe(true)
  })

  test('an explicit height is still honoured verbatim', () => {
    const panel = w3d.panel3d({ width: 300, height: 400 }, ...rows(2))
    expect(Number(panel.getAttribute('height'))).toBe(400)
  })
})

describe('maxHeight — fitting and scrolling are one mechanism', () => {
  test('past the cap the panel scrolls rather than growing', () => {
    const panel = w3d.panel3d(
      { width: 300, height: 'fit', maxHeight: 150 },
      ...rows(12)
    )
    expect(Number(panel.getAttribute('height'))).toBe(150)
    const m = measureOf(panel)
    expect(m.fits).toBe(false)
    expect((panel as unknown as { scrollable: boolean }).scrollable).toBe(true)
  })

  test('under the cap it is simply ignored', () => {
    const panel = w3d.panel3d(
      { width: 300, height: 'fit', maxHeight: 5000 },
      ...rows(3)
    )
    expect(Number(panel.getAttribute('height'))).toBeLessThan(5000)
    expect(measureOf(panel).fits).toBe(true)
  })
})

describe('row3d — the missing axis', () => {
  test('a label and a field share ONE row, not two', () => {
    const stacked = w3d.panel3d(
      { width: 320, height: 'fit' },
      w3d.label3d({ text: 'name' }),
      w3d.button3d({ label: 'edit' })
    )
    const inARow = w3d.panel3d(
      { width: 320, height: 'fit' },
      w3d.row3d(
        { weights: [1, 2] },
        w3d.label3d({ text: 'name' }),
        w3d.button3d({ label: 'edit' })
      )
    )
    expect(measureOf(inARow).content).toBeLessThan(measureOf(stacked).content)
  })

  test('a row is as tall as its tallest child, not their sum', () => {
    const a = w3d.button3d({ label: 'a' })
    const b = w3d.button3d({ label: 'b' })
    const row = w3d.row3d({}, a, b)
    const rowH = row.layout(300)
    expect(rowH).toBe(Math.max(a.layout(150), b.layout(150)))
  })

  test('POINTER ROUTING: a click in the right column reaches the RIGHT child', () => {
    // The bug this guards: routing by row rather than column fires the first
    // child for every click, which reads as "the second button does nothing".
    const hits: string[] = []
    const row = w3d.row3d(
      {},
      w3d.button3d({ label: 'L', onClick: () => hits.push('L') }),
      w3d.button3d({ label: 'R', onClick: () => hits.push('R') })
    )
    const panel = w3d.panel3d({ width: 324, height: 'fit' }, row)
    const p = panel as unknown as {
      handlePointer: (k: string, x: number, y: number) => void
    }
    // padding is 12, so the row spans x = 12..312; right column starts ~x=162
    p.handlePointer('down', 260, 26)
    p.handlePointer('up', 260, 26)
    expect(hits).toEqual(['R'])
  })

  test('and the left column reaches the left child', () => {
    const hits: string[] = []
    const panel = w3d.panel3d(
      { width: 324, height: 'fit' },
      w3d.row3d(
        {},
        w3d.button3d({ label: 'L', onClick: () => hits.push('L') }),
        w3d.button3d({ label: 'R', onClick: () => hits.push('R') })
      )
    )
    const p = panel as unknown as {
      handlePointer: (k: string, x: number, y: number) => void
    }
    p.handlePointer('down', 60, 26)
    p.handlePointer('up', 60, 26)
    expect(hits).toEqual(['L'])
  })

  test('an empty row is zero-height rather than a crash', () => {
    expect(w3d.row3d({}).layout(300)).toBe(0)
  })
})
