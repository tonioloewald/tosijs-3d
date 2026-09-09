import { describe, test, expect, beforeAll, afterEach } from 'bun:test'
import { Window } from 'happy-dom'

/*
A FLAT POPUP MUST OPEN ON SCREEN, AND BE MOVABLE.

tosijs-3d-ensemble summoned the keyboard from a field in a right-hand panel and
got it 112px off the right edge, rightmost column of keys unreachable — with no
way back, because the move/close chrome is drawn by PICKING and picking exists
only in the scene presentation (#57).

Two fixes, and both were asked for: place it inside the viewport, and let it be
dragged. The clamp stops the first frame being wrong; the drag is what lets
someone move it off whatever they are typing into, which no placement heuristic
can know.

The placement itself is `placePopup` — the same pure flip/clamp the in-scene
presentation uses, so there is ONE rule rather than two that drift.
*/

let F: typeof import('./flow-layout.js')

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
  F = await import('./flow-layout.js')
})

/** Ensemble's numbers, verbatim from the report. */
const VIEWPORT = { width: 1719, height: 1003 }
const POPUP = { width: 360, height: 218 }

describe('the reported case', () => {
  test('a right-hand anchor no longer overflows', () => {
    // layer rect was [1471, 521, 360, 218] → 112px past the right edge.
    const anchor = { x: 1471, y: 521, width: 40, height: 24 }
    const p = F.placePopup(anchor, POPUP, VIEWPORT)
    expect(p.x + POPUP.width).toBeLessThanOrEqual(VIEWPORT.width)
    expect(p.x).toBeGreaterThanOrEqual(0)
  })

  test('and it stays vertically on screen', () => {
    const anchor = { x: 1471, y: 521, width: 40, height: 24 }
    const p = F.placePopup(anchor, POPUP, VIEWPORT)
    expect(p.y).toBeGreaterThanOrEqual(0)
    expect(p.y + POPUP.height).toBeLessThanOrEqual(VIEWPORT.height)
  })

  test('an anchor near the BOTTOM flips above rather than hanging off', () => {
    const anchor = { x: 100, y: 960, width: 40, height: 24 }
    const p = F.placePopup(anchor, POPUP, VIEWPORT)
    expect(p.side).toBe('above')
    expect(p.y + POPUP.height).toBeLessThanOrEqual(VIEWPORT.height)
  })

  test('a comfortable anchor is left where it asked to be', () => {
    // The clamp must not move popups that were already fine.
    const anchor = { x: 200, y: 200, width: 40, height: 24 }
    const p = F.placePopup(anchor, POPUP, VIEWPORT)
    expect(p.side).toBe('below')
    expect(p.x).toBe(200)
    expect(p.y).toBe(224)
  })

  test('a popup WIDER than the viewport still starts on screen', () => {
    // Degenerate, but "off the left edge instead of the right" is not a fix.
    const p = F.placePopup(
      { x: 900, y: 100, width: 10, height: 10 },
      { width: 3000, height: 200 },
      VIEWPORT
    )
    expect(p.x).toBeLessThanOrEqual(0)
    expect(p.x).toBeGreaterThan(-3000)
  })
})

/*
The MOUNTER, driven for real — the half that placement maths cannot cover.

`showLayer` lives on the `WidgetHost` a widget receives, not on the panel
element, so this reaches the registered host directly. That is deliberate: it
exercises the actual holder creation, placement and drag wiring rather than a
reimplementation of them.
*/
describe('the DOM layer mounter', () => {
  let w3d: typeof import('./widgets3d.js')

  beforeAll(async () => {
    w3d = await import('./widgets3d.js')
  })

  const mount = () => {
    const panel = w3d.panel3d({ width: 300 }, w3d.label3d({ text: 'x' })) as any
    document.body.appendChild(panel)
    panel.useDomLayer(document.body)
    const sheet = w3d.panel3d(
      { width: 360 },
      w3d.label3d({ text: 'popup' })
    ) as any
    sheet.setAttribute('width', '360')
    sheet.setAttribute('height', '218')
    const handle = panel.__layerHosts[0](sheet, {
      anchor: { x: 10, y: 10, width: 40, height: 20 },
    })
    const holder = document.querySelector('[data-w3d-dom-layer]') as any
    return { panel, sheet, holder, handle }
  }

  const point = (kind: string, x: number, y: number) =>
    new (window as any).PointerEvent(kind, {
      bubbles: true,
      clientX: x,
      clientY: y,
      pointerId: 1,
    })

  test('it mounts a positioned holder', () => {
    const { holder, handle } = mount()
    expect(holder).not.toBe(null)
    expect(holder.style.position).toBe('absolute')
    handle.close()
  })

  test('dragging the holder moves it — the ask that fixes #57', () => {
    const { holder, handle } = mount()
    const left = parseFloat(holder.style.left) || 0
    const top = parseFloat(holder.style.top) || 0
    holder.dispatchEvent(point('pointerdown', 100, 100))
    holder.dispatchEvent(point('pointermove', 160, 130))
    expect(parseFloat(holder.style.left) - left).toBe(60)
    expect(parseFloat(holder.style.top) - top).toBe(30)
    handle.close()
  })

  test('a press that starts on a WIDGET does not drag — you must be able to type', () => {
    const { sheet, holder, handle } = mount()
    const key = sheet.querySelector('[data-w3d]:not([data-w3d="panel"])')
    expect(key).not.toBe(null)
    const left = parseFloat(holder.style.left) || 0
    key.dispatchEvent(point('pointerdown', 100, 100))
    holder.dispatchEvent(point('pointermove', 200, 100))
    expect(parseFloat(holder.style.left)).toBe(left)
    handle.close()
  })

  test('releasing ends the drag', () => {
    const { holder, handle } = mount()
    holder.dispatchEvent(point('pointerdown', 100, 100))
    holder.dispatchEvent(point('pointermove', 150, 100))
    holder.dispatchEvent(point('pointerup', 150, 100))
    const parked = parseFloat(holder.style.left)
    holder.dispatchEvent(point('pointermove', 400, 100))
    expect(parseFloat(holder.style.left)).toBe(parked)
    handle.close()
  })

  test('close removes it', () => {
    const { handle } = mount()
    handle.close()
    expect(document.querySelectorAll('[data-w3d-dom-layer]')).toHaveLength(0)
  })
})

describe('a MENU is a popup too, not something the panel crops', () => {
  let w3d: typeof import('./widgets3d.js')
  const mounted: Element[] = []
  beforeAll(async () => {
    w3d = await import('./widgets3d.js')
  })
  // Module state and stray layers leak into later files otherwise — the same
  // class of leak the keyboard tests hit.
  afterEach(() => {
    for (const el of mounted.splice(0)) el.remove()
    for (const l of document.querySelectorAll('[data-w3d-dom-layer]'))
      l.remove()
  })

  /*
  The keyboard got the layer treatment because someone knew `showLayer` existed.
  Every other popup — `select3d`'s menu, `openMenu3d` — went to `showPopup`,
  which was the panel-bounded path: cropped to whatever room was left under its
  own row, on a control that is usually near the bottom of a settings panel.

  Measured on the second `tosi-b3d` demo, whose panel holds a `spin` select:
  zero DOM layers installed, and the menu mounted INSIDE the panel's own SVG.

    "the pop up for speed is tiny… and it's clipped to the panel. We need pop
     ups to be pop ups and not constrained by the thing that pops them.
     Otherwise the user experience is terrible."

  ⚠️ Reported from a headset, and true FLAT as well — which is the part I got
  wrong twice. A panel renders the same either way, so this is reproducible here
  with no scene at all.

  `showPopup` now prefers a layer and keeps the bounded path as its fallback, so
  the fix reaches every caller rather than the ones that knew the second method.
  */

  const openSelect = () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    mounted.push(host)
    const panel: any = w3d.panel3d(
      { width: 320, height: 'fit', maxHeight: 620, paddingTop: 34 },
      w3d.select3d({
        label: 'spin',
        value: 'medium',
        options: ['slow', 'medium', 'fast'],
      })
    )
    host.appendChild(panel)
    panel.handlePointer('down', 250, 50)
    panel.handlePointer('up', 250, 50)
    return { host, panel }
  }

  test('the menu opens in a LAYER, not inside the panel', () => {
    const { panel } = openSelect()
    expect(document.querySelectorAll('[data-w3d-dom-layer]').length).toBe(1)
    // A panel nested inside the panel's own SVG is the cropped fallback.
    expect(
      panel.querySelector('[data-w3d="panel"] [data-w3d="panel"]')
    ).toBeNull()
  })

  test('and it is sized by its own content, not the room left below', () => {
    // The "tiny" in the report: the fallback caps height at whatever is under
    // the control, which on a settings panel is often almost nothing.
    openSelect()
    const svg = document
      .querySelector('[data-w3d-dom-layer]')
      ?.querySelector('svg')
    expect(Number(svg?.getAttribute('height'))).toBeGreaterThan(100)
  })

  test('no empty band above it — a DOM layer draws no chrome', () => {
    /*
    The sheet reserved 30px of headroom unconditionally, for the move and close
    glyphs `popup-surface` draws into the top of an in-scene popup. A DOM layer
    draws none, so flat that band was an empty strip above every menu. Tonio:
    "The popup is good but it has a lot of wasted space up top."

    Measured on this exact shape: 180px tall before, 150 after — the whole band.

    It stays reserved when a chrome-drawing host IS mounting, because the sheet
    is SHARED by every presentation and two sheets would be the divergence this
    arrangement exists to prevent. Paying it flat so the in-scene one has room
    for its handles is the right side of that trade; paying it when nothing
    draws handles is just waste.
    */
    openSelect()
    const svg = document
      .querySelector('[data-w3d-dom-layer]')
      ?.querySelector('svg')
    const h = Number(svg?.getAttribute('height'))
    // Three 40px rows plus the panel's own padding — and no chrome band.
    expect(h).toBe(150)
  })

  test('...but a chrome-drawing host still gets its band', () => {
    // The other side of the trade, asserted so "reclaim the space" cannot
    // quietly become "never leave room for the handles".
    const host = document.createElement('div')
    document.body.appendChild(host)
    mounted.push(host)
    const panel: any = w3d.panel3d(
      { width: 320, height: 'fit', maxHeight: 620, paddingTop: 34 },
      w3d.select3d({ label: 'spin', value: 'a', options: ['a', 'b', 'c'] })
    )
    host.appendChild(panel)
    let sheet: SVGSVGElement | null = null
    const scenish = (s: SVGSVGElement) => {
      sheet = s
      return { close: () => {} }
    }
    ;(scenish as unknown as { drawsChrome: boolean }).drawsChrome = true
    panel.__layerHosts = [scenish]
    panel.handlePointer('down', 250, 50)
    panel.handlePointer('up', 250, 50)
    expect(sheet).toBeTruthy()
    expect(Number(sheet!.getAttribute('height'))).toBe(180)
  })

  test('picking an option DISMISSES the menu', () => {
    /*
    `host.closePopup()` is the panel's single-popup tracking, which the LAYER
    path knows nothing about — so once a menu opened as a layer, picking an
    option set the value and left the menu standing. Tonio: "Clicking an option
    on the popup in the kitchen sink demo doesn't dismiss the popup."

    Closing the HANDLE `showPopup` returned works whichever path opened it,
    which is what returning one is for.
    */
    const { panel } = openSelect()
    expect(document.querySelectorAll('[data-w3d-dom-layer]').length).toBe(1)
    const layer: any = document.querySelector('[data-w3d-dom-layer]')
    // Press the first row of the menu.
    layer.querySelector('svg').handlePointer('down', 40, 44)
    layer.querySelector('svg').handlePointer('up', 40, 44)
    expect(
      document.querySelectorAll('[data-w3d-dom-layer]').length,
      'the menu stayed open after a pick'
    ).toBe(0)
    void panel
  })

  test('a DETACHED panel still gets a menu — degrading beats failing', () => {
    // The bounded path is a last resort, not a bug: with nowhere to mount, a
    // cropped menu is better than none.
    const panel: any = w3d.panel3d(
      { width: 320, height: 400 },
      w3d.select3d({ label: 'spin', value: 'a', options: ['a', 'b'] })
    )
    expect(() => {
      panel.handlePointer('down', 250, 50)
      panel.handlePointer('up', 250, 50)
    }).not.toThrow()
  })
})
