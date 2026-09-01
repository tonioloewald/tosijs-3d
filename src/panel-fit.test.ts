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

describe('slider3d readout — a handle position is not a number', () => {
  const textOf = (w: { el: SVGElement }) =>
    [...w.el.querySelectorAll('text')].map((t) => t.textContent ?? '')

  test("showValue:'always' renders the number without being touched", () => {
    const s = w3d.slider3d({
      label: 'x',
      value: 12.5,
      min: 0,
      max: 100,
      step: 0.5,
      showValue: 'always',
    })
    s.layout(300)
    expect(textOf(s)).toContain('12.5')
  })

  test('peek (the default) keeps it hidden until you interact', () => {
    const s = w3d.slider3d({
      label: 'x',
      value: 12.5,
      min: 0,
      max: 100,
      step: 0.5,
    })
    s.layout(300)
    const shown = [...s.el.querySelectorAll('text')]
      .filter((t) => t.getAttribute('display') !== 'none')
      .map((t) => t.textContent)
    expect(shown).toEqual(['x'])
  })

  test('format carries units, and decimals follow the step', () => {
    const s = w3d.slider3d({
      value: 8,
      min: 0,
      max: 24,
      step: 1,
      showValue: 'always',
      format: (v) => `${v.toFixed(0)}h`,
    })
    s.layout(300)
    expect(textOf(s)).toContain('8h')
  })

  test('THE READOUT DOES NOT RESIZE THE TRACK AS YOU DRAG', () => {
    // Width is reserved for the widest value in the range, not the current one.
    // Sizing to the current value makes the track twitch mid-drag, which reads
    // as the slider fighting you.
    const s = w3d.slider3d({
      value: 1,
      min: 1,
      max: 1000,
      step: 1,
      showValue: 'always',
    })
    s.layout(300)
    const track = s.el.querySelector('rect[fill]:not([fill=transparent])')
    const wAt1 = track?.getAttribute('width')
    ;(s as any).handle?.('down', 290, 20) // drag toward the max
    s.layout(300)
    expect(track?.getAttribute('width')).toBe(wAt1!)
  })

  test("'never' shows nothing at all", () => {
    const s = w3d.slider3d({
      label: 'x',
      value: 5,
      min: 0,
      max: 10,
      showValue: 'never',
    })
    s.layout(300)
    const shown = [...s.el.querySelectorAll('text')]
      .filter((t) => t.getAttribute('display') !== 'none')
      .map((t) => t.textContent)
    expect(shown).toEqual(['x'])
  })
})

describe('panel.openPopup — a popup IS a panel (#37 item 4)', () => {
  const openOn = (panel: SVGSVGElement) =>
    (
      panel as unknown as {
        openPopup: (
          c: any,
          ...w: any[]
        ) => {
          el: SVGSVGElement
          x: number
          y: number
          side: string
          close: () => void
        }
      }
    ).openPopup

  test('the popup is a real panel — same contract, so it measures and scrolls', () => {
    const panel = w3d.panel3d({ width: 320, height: 400 })
    const pop = openOn(panel)(
      { anchor: { x: 10, y: 10, width: 100, height: 40 } },
      ...rows(3)
    )
    expect(pop.el.getAttribute('data-w3d')).toBe('panel')
    expect(measureOf(pop.el).fits).toBe(true)
  })

  test('it sizes to its options rather than to a guess', () => {
    const panel = w3d.panel3d({ width: 320, height: 400 })
    const three = openOn(panel)(
      { anchor: { x: 0, y: 0, width: 10, height: 10 } },
      ...rows(3)
    )
    const eight = openOn(panel)(
      { anchor: { x: 0, y: 0, width: 10, height: 10 } },
      ...rows(8)
    )
    expect(Number(eight.el.getAttribute('height'))).toBeGreaterThan(
      Number(three.el.getAttribute('height'))
    )
  })

  test('it FLIPS rather than overflowing the bottom', () => {
    // The whole reason placePopup exists: a select near the bottom edge must
    // open upward, not off the panel.
    const panel = w3d.panel3d({ width: 320, height: 400 })
    const low = openOn(panel)(
      { anchor: { x: 10, y: 380, width: 100, height: 20 } },
      ...rows(3)
    )
    expect(low.side).toBe('above')
    expect(low.y).toBeGreaterThanOrEqual(0)
  })

  test('when NEITHER side fits it keeps the preferred one and clamps on-surface', () => {
    // A popup taller than the whole surface cannot be placed by flipping, so
    // flipping would just move the problem. It lands on-surface and scrolls
    // internally instead — which it can, being a real panel.
    const panel = w3d.panel3d({ width: 320, height: 400 })
    const huge = openOn(panel)(
      { anchor: { x: 10, y: 380, width: 100, height: 20 } },
      ...rows(20)
    )
    expect(huge.side).toBe('below')
    expect(huge.y).toBe(0)
    expect((huge.el as unknown as { scrollable: boolean }).scrollable).toBe(
      true
    )
  })

  test('and opens downward when there IS room', () => {
    const panel = w3d.panel3d({ width: 320, height: 400 })
    const high = openOn(panel)(
      { anchor: { x: 10, y: 10, width: 100, height: 20 } },
      ...rows(2)
    )
    expect(high.side).toBe('below')
  })

  test('bounds can be the HOST, not the opener — a popup may escape its panel', () => {
    const panel = w3d.panel3d({ width: 320, height: 200 })
    const escaping = openOn(panel)(
      {
        anchor: { x: 10, y: 180, width: 100, height: 20 },
        bounds: { width: 1200, height: 900 },
      },
      ...rows(6)
    )
    // With the whole window to play with it no longer needs to flip
    expect(escaping.side).toBe('below')
  })

  test('close() detaches it', () => {
    const panel = w3d.panel3d({ width: 320, height: 400 })
    const pop = openOn(panel)(
      { anchor: { x: 0, y: 0, width: 10, height: 10 } },
      ...rows(2)
    )
    const host = (globalThis as any).document.createElement('div')
    host.append(pop.el)
    expect(host.children.length).toBe(1)
    pop.close()
    expect(host.children.length).toBe(0)
  })
})

describe('iconBar3d colours like a button', () => {
  const fillOf = (w: { el: SVGElement }, i: number) =>
    w.el.querySelectorAll('rect')[i * 2]?.getAttribute('fill')

  const bar = (active = false) =>
    w3d.iconBar3d({ items: [{ icon: 'plus', active }, { icon: 'move' }] })

  test('rest → hover → pressed are three DIFFERENT colours', () => {
    // Previously pressing showed nothing new, because the selected colour and
    // the press colour were the same token.
    const b = bar()
    b.layout(200)
    const rest = fillOf(b, 0)
    b.handle!('move', 8, 10)
    const hover = fillOf(b, 0)
    b.handle!('down', 8, 10)
    const held = fillOf(b, 0)
    expect(new Set([rest, hover, held]).size).toBe(3)
  })

  test('SELECTED is its own colour, not the press colour', () => {
    // Selection is a different axis from press — a selected button must not
    // look permanently held.
    const plain = bar(false)
    const chosen = bar(true)
    plain.layout(200)
    chosen.layout(200)
    plain.handle!('down', 8, 10)
    expect(fillOf(chosen, 0)).not.toBe(fillOf(plain, 0))
  })

  test('release clears the pressed look before the handler runs', () => {
    // A handler that rebuilds the panel would otherwise leave a button stuck
    // looking held.
    let seen: string | null = null
    const b = w3d.iconBar3d({
      items: [{ icon: 'plus', onClick: () => { seen = fillOf(b, 0) } }],
    })
    b.layout(200)
    b.handle!('down', 8, 10)
    const held = fillOf(b, 0)
    b.handle!('up', 8, 10)
    expect(seen).not.toBe(held)
  })

  test('a press that drifts off the button does not fire it', () => {
    let fired = 0
    const b = w3d.iconBar3d({
      items: [{ icon: 'plus', onClick: () => fired++ }, { icon: 'move' }],
    })
    b.layout(200)
    b.handle!('down', 8, 10)
    b.handle!('up', 60, 10) // released over the second button
    expect(fired).toBe(0)
  })
})

describe('panels do not cast shadows by default', () => {
  test('the mesh name carries the _nocast convention', async () => {
    // `register()` is the shadow-caster contract, so a panel opted IN simply by
    // existing. The name is how b3d-shadows is told otherwise.
    const { conventionName } = await import('./b3d-utils')
    expect(conventionName('svg-plane_nocast')).toContain('_nocast')
    expect(conventionName('svg-plane')).not.toContain('_nocast')
  })
})
