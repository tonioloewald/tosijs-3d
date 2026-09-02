import { describe, test, expect, beforeAll, beforeEach } from 'bun:test'
import { Window } from 'happy-dom'

/*
THE KEYBOARD MUST WORK WITH ONE PRESENTATION, NOT JUST TWO.

Written after ensemble — which is DOM-only — got no keyboard at all. Two faults,
both from building against the kitchen sink, where a panel is shown flat AND on a
plane and the demo calls `useDomLayer` by hand:

  1. `useDomLayer` was OPT-IN, so a flat-only consumer fell back to a popup
     mounted INSIDE the panel, cropped by its viewBox.
  2. The room check then refused outright on a `height: 'fit'` panel, which is
     the common case — measured as zero keyboard.

A feature that only works if you know a second call exists is a feature most
people do not have.
*/
let w3d: typeof import('./widgets3d')
let kb: typeof import('./keyboard')

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
  kb = await import('./keyboard')
})

// The preference is shared module state — reset, or one test arms the next.
beforeEach(() => kb.setAutoKeyboard(false))

/** Press the field's ⌨ glyph, which sits at the right edge of its row. */
const summon = (panel: any) => {
  panel.handlePointer('down', 300, 20)
  panel.handlePointer('up', 300, 20)
}
const layerKeys = () =>
  document.querySelectorAll('[data-w3d-dom-layer] [data-key]').length

describe('DOM only — no scene anywhere', () => {
  test("a `height: 'fit'` panel still gets a full keyboard", () => {
    // The case ensemble hit. Short panel, no `useDomLayer` call, nothing else.
    const panel: any = w3d.panel3d({ width: 320 }, kb.inputField({ value: 'hi' }))
    document.body.appendChild(panel)
    summon(panel)
    expect(layerKeys()).toBeGreaterThan(20)
    // …and NOT inside the panel, where its viewBox would crop it.
    expect(panel.querySelectorAll('svg').length).toBe(0)
  })

  test('a tall panel too, and still outside the panel', () => {
    const panel: any = w3d.panel3d(
      { width: 320, height: 420 },
      kb.inputField({ value: 'hi' })
    )
    document.body.appendChild(panel)
    summon(panel)
    expect(layerKeys()).toBeGreaterThan(20)
    expect(panel.querySelectorAll('svg').length).toBe(0)
  })

  test('an explicit useDomLayer still wins — it chooses the CONTAINER', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const panel: any = w3d.panel3d({ width: 320 }, kb.inputField({ value: 'hi' }))
    host.appendChild(panel)
    panel.useDomLayer(host)
    summon(panel)
    expect(host.querySelectorAll('[data-w3d-dom-layer] [data-key]').length)
      .toBeGreaterThan(20)
  })
})

describe('detached — genuinely nowhere to put it', () => {
  test('degrades to a popup rather than throwing or vanishing', () => {
    // A panel not on the page yet. It cannot have a DOM layer, so the bounded
    // popup is the honest fallback — and a tall panel has room for one.
    const panel: any = w3d.panel3d(
      { width: 320, height: 420 },
      kb.inputField({ value: 'hi' })
    )
    summon(panel)
    expect(panel.querySelectorAll('svg').length).toBe(1)
  })
})
