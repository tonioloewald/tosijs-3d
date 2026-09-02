import { describe, test, expect, beforeAll, beforeEach } from 'bun:test'
import { Window } from 'happy-dom'

// widgets3d builds SVG at import time, so it needs a DOM first.
let w3d: typeof import('./widgets3d')
let w3d_kb: typeof import('./keyboard')

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
  w3d_kb = await import('./keyboard')
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
      items: [
        {
          icon: 'plus',
          onClick: () => {
            seen = fillOf(b, 0)
          },
        },
      ],
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

describe('panels live outside the world by default', () => {
  test('both conventions are recognised on one name', async () => {
    // Registering opted a panel into BOTH: casting (the shadow-caster
    // contract) and receiving (b3d-shadows sets receiveShadows unless told
    // otherwise). Neither was a decision — they fell out of register().
    const { conventionName } = await import('./b3d-utils')
    const both = conventionName('svg-plane_nocast_noshadow')
    expect(both).toContain('_nocast')
    expect(both).toContain('_noshadow')
  })

  test('and they are INDEPENDENT — a cockpit instrument receives but need not cast', async () => {
    const { conventionName } = await import('./b3d-utils')
    const receivesOnly = conventionName('svg-plane_nocast')
    expect(receivesOnly).toContain('_nocast')
    expect(receivesOnly).not.toContain('_noshadow')
  })
})

describe('select3d opens a MENU from its value, and keeps its steppers', () => {
  const OPTIONS = ['alpha', 'beta', 'gamma', 'delta']

  /** A panel wrapping one select, laid out — which is what supplies the host. */
  const build = (onChange?: (v: string | number) => void) => {
    const sel = w3d.select3d({ value: 'alpha', options: OPTIONS, onChange })
    const panel = w3d.panel3d({ width: 300 }, sel) as any
    return { sel, panel }
  }

  const press = (panel: any, x: number, y: number) => {
    panel.handlePointer('down', x, y)
    panel.handlePointer('up', x, y)
  }

  test('the arrows still step — the menu does not replace them', () => {
    let seen: unknown = null
    const { panel } = build((v) => (seen = v))
    // Far right of the row is the › stepper.
    press(panel, 285, 30)
    expect(seen).toBe('beta')
  })

  test('pressing the VALUE opens a popup', () => {
    const { panel } = build()
    expect(panel.querySelectorAll('svg').length).toBe(0)
    press(panel, 200, 30) // between the arrows
    expect(panel.querySelectorAll('svg').length).toBe(1)
  })

  test('the popup lists every option', () => {
    const { panel } = build()
    press(panel, 200, 30)
    const labels = [...panel.querySelectorAll('svg text')].map((t: any) =>
      t.textContent
    )
    for (const o of OPTIONS) expect(labels).toContain(o)
  })

  test('a press OUTSIDE the popup dismisses it, and does not reach what is under it', () => {
    // Routing by what is underneath would let you press a control through an
    // open menu — the "it clicked the wrong thing" bug in its purest form.
    let seen: unknown = null
    const { panel } = build((v) => (seen = v))
    press(panel, 200, 30)
    expect(panel.querySelectorAll('svg').length).toBe(1)
    panel.handlePointer('down', 285, 30) // the › stepper, under the menu's row
    expect(panel.querySelectorAll('svg').length).toBe(0)
    expect(seen).toBe(null)
  })

  test('only ONE popup at a time', () => {
    const { panel } = build()
    press(panel, 200, 30)
    press(panel, 200, 30)
    expect(panel.querySelectorAll('svg').length).toBeLessThanOrEqual(1)
  })

  test('without a host it stays a stepper rather than going inert', () => {
    // A control that does nothing in some containers is worse than one that is
    // merely plainer.
    let seen: unknown = null
    const sel = w3d.select3d({
      value: 'alpha',
      options: OPTIONS,
      onChange: (v) => (seen = v),
    })
    sel.layout(300)
    sel.handle!('down', 285, 30)
    sel.handle!('up', 285, 30)
    expect(seen).toBe('beta')
  })
})

describe('the keyboard affordance — summon it without reaching for a real one', () => {
  // The preference is SHARED and lives at module scope — which is the point of
  // it, and means a test that flips it would leak into the next. Reset per test.
  beforeEach(() => w3d_kb.setAutoKeyboard(false))

  // TALL, because a keyboard needs room — on a fit-height panel (64px) it would
  // be capped to 64px and land on top of the field, which is why it now refuses.
  const build = (keyboard?: 'auto' | 'always' | 'never') => {
    const field = w3d_kb.inputField({ value: 'hi', keyboard })
    const panel = w3d.panel3d({ width: 300, height: 400 }, field) as any
    return { field, panel }
  }
  const tapAt = (panel: any, x: number) => {
    panel.handlePointer('down', x, 20)
    panel.handlePointer('up', x, 20)
  }

  test('the glyph is drawn by default, and not when disabled', () => {
    // Always present, because the device cannot tell you whether a keyboard is
    // within REACH. Tonio: a computer plugged into a TV has one you would rather
    // not get up for.
    // `iconGlyph` returns a bare <g> with no data- marker, so compare structure
    // rather than selecting one.
    const on = build()
    const off = build('never')
    expect(on.field.el.children.length).toBeGreaterThan(
      off.field.el.children.length
    )
  })

  test('pressing the glyph opens a keyboard popup', () => {
    const { panel } = build()
    expect(panel.querySelectorAll('svg').length).toBe(0)
    tapAt(panel, 288) // the glyph sits at the right edge
    expect(panel.querySelectorAll('svg').length).toBe(1)
  })

  test('pressing it again puts the keyboard away', () => {
    // A summoned panel you cannot dismiss the way you called it is in your way.
    const { panel } = build()
    tapAt(panel, 288)
    tapAt(panel, 288)
    expect(panel.querySelectorAll('svg').length).toBe(0)
  })

  test('a tap in the FIELD does not auto-open on a fine pointer', () => {
    // The default errs toward not: a field that sprouted a keyboard on every
    // desktop click would be worse than one that never did.
    const { panel } = build()
    tapAt(panel, 60)
    expect(panel.querySelectorAll('svg').length).toBe(0)
  })

  test('the glyph is a TOGGLE — it flips the shared preference for every field', () => {
    // Tonio: "if you click it, you start getting the on screen keyboard
    // automatically until you toggle it off." So it is a mode, not a one-shot,
    // and it cannot be per-field: two glyphs on one panel would disagree.
    const { panel } = build()
    expect(w3d_kb.autoKeyboardEnabled()).toBe(false)
    panel.handlePointer('down', 288, 20)
    panel.handlePointer('up', 288, 20)
    expect(w3d_kb.autoKeyboardEnabled()).toBe(true)
  })

  test('once toggled on, a tap in the FIELD summons it', () => {
    const { panel } = build()
    w3d_kb.setAutoKeyboard(true)
    tapAt(panel, 60)
    expect(panel.querySelectorAll('svg').length).toBe(1)
  })

  test("`always` opens on a tap anywhere in the field — what an XR panel wants", () => {
    const { panel } = build('always')
    tapAt(panel, 60)
    expect(panel.querySelectorAll('svg').length).toBe(1)
  })

  test('it REFUSES rather than opening a keyboard with nowhere to go', () => {
    // Measured before this existed: on a 64px panel the popup was capped to
    // 64px and placed at y=0, i.e. squeezed flat and covering the field it types
    // into. Half a keyboard is not a degraded mode.
    const field = w3d_kb.inputField({ value: 'hi' })
    const panel = w3d.panel3d({ width: 300 }, field) as any // height: 'fit' -> 64
    panel.handlePointer('down', 288, 20)
    panel.handlePointer('up', 288, 20)
    expect(panel.querySelectorAll('svg').length).toBe(0)
  })

  test('`openKeyboard` lets the app put it somewhere that fits', () => {
    // The documented way out of the refusal above: the app knows whether a
    // plane, a sibling or a surface is right here; the field does not.
    let opened = 0
    let closed = 0
    const field = w3d_kb.inputField({
      value: 'hi',
      openKeyboard: () => {
        opened++
        return () => closed++
      },
    })
    const panel = w3d.panel3d({ width: 300 }, field) as any
    panel.handlePointer('down', 288, 20)
    panel.handlePointer('up', 288, 20)
    expect(opened).toBe(1)
    // …and toggling off calls the closer it handed back.
    panel.handlePointer('down', 288, 20)
    panel.handlePointer('up', 288, 20)
    expect(closed).toBe(1)
  })

  test('the glyph does NOT hijack a scrub that ends near it', () => {
    // The gesture belongs to where it BEGAN. Testing the live x swallowed any
    // drag finishing at the right edge.
    const field = w3d_kb.inputField({ type: 'number', value: '0', scrub: 0.1 })
    w3d.panel3d({ width: 300 }, field)
    field.layout(300)
    field.handle!('down', 40, 20)
    field.handle!('move', 290, 20) // ends inside the glyph zone
    field.handle!('up', 290, 20)
    expect(Number(field.value)).toBeGreaterThan(0)
  })

  test('and does not swallow the whole field before layout runs', () => {
    // `width` starts at 0, so `x >= width - KB_ZONE` was true everywhere.
    const field = w3d_kb.inputField({ type: 'number', value: '0', scrub: 0.1 })
    field.handle!('down', 10, 20)
    field.handle!('move', 110, 20)
    field.handle!('up', 110, 20)
    expect(Number(field.value)).toBeGreaterThan(0)
  })
})
