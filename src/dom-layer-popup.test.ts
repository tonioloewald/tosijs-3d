import { describe, test, expect, beforeAll } from 'bun:test'
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
