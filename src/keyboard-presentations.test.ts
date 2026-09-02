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

describe('hardware keys reach a field with NO fieldGroup', () => {
  /*
  The case an adopter actually builds: an `inputField` dropped into a `panel3d`.
  It could be tapped, showed a caret, and ignored every keystroke — because only
  `fieldGroup.attach()` ever installed a listener, and nothing in `panel3d` does.
  Reproduced on our own kitchen sink before the fix: tap, type, nothing.
  */
  const press = (key: string) =>
    globalThis.window.dispatchEvent(
      new (globalThis as any).KeyboardEvent('keydown', {
        key,
        bubbles: true,
        cancelable: true,
      })
    )

  test('a tapped field receives typing', () => {
    const field = kb.inputField({ value: '' })
    const panel: any = w3d.panel3d({ width: 320 }, field)
    document.body.appendChild(panel)
    panel.handlePointer('down', 60, 20)
    panel.handlePointer('up', 60, 20)
    press('a')
    press('b')
    expect(field.value).toBe('ab')
  })

  test('typing does NOT leak to a field that lost focus', () => {
    // Two fields, no group: the second tap must move the receiver.
    const a = kb.inputField({ value: '' })
    const b = kb.inputField({ value: '' })
    const panel: any = w3d.panel3d({ width: 320 }, a, b)
    document.body.appendChild(panel)
    panel.handlePointer('down', 60, 20) // a
    panel.handlePointer('up', 60, 20)
    press('1')
    panel.handlePointer('down', 60, 60) // b
    panel.handlePointer('up', 60, 60)
    press('2')
    expect(a.value).toBe('1')
    expect(b.value).toBe('2')
  })

  test('an attached fieldGroup WINS — no double characters', () => {
    // A group does more than type (Tab traversal, mode switching), so it must
    // win; two handlers would double every keystroke, which is worse than the
    // bug being fixed.
    const field = kb.inputField({ value: '' })
    const group = kb.fieldGroup({ fields: [field] })
    const detach = group.attach()
    group.focus(field)
    press('z')
    expect(field.value).toBe('z')
    detach()
  })
})

describe('inside a SHADOW ROOT — the ensemble topology', () => {
  /*
  Diagnosed by tosijs-ensemble, and it was ours: the mounter appended to
  `root.parentElement`, which in their app is a shadow HOST. Light-DOM children
  of a host with no `<slot>` are never rendered, so the keyboard existed,
  reported 360x209, and painted nothing.

  Two fixes, both pinned here: insert as a SIBLING of the panel (whatever renders
  the panel renders the node beside it), and reach for `parentNode` rather than
  `parentElement` (a panel inside a ShadowRoot has no parent ELEMENT at all —
  `parentElement` is null, so the layer was never even installed).
  */
  // `document.querySelector` does NOT pierce a shadow root, so each test builds
  // its own and queries THAT — the first draft looked in the document and found
  // nothing, which is the same mistake the bug itself is about.
  const inShadow = () => {
    kb.setAutoKeyboard(false)
    const host = document.createElement('div')
    document.body.appendChild(host)
    const shadow = host.attachShadow({ mode: 'open' })
    const field = kb.inputField({ value: 'hi' })
    const panel: any = w3d.panel3d({ width: 320 }, field)
    shadow.appendChild(panel)
    panel.handlePointer('down', 300, 20)
    panel.handlePointer('up', 300, 20)
    return {
      shadow,
      holder: shadow.querySelector('[data-w3d-dom-layer]') as HTMLElement | null,
    }
  }

  test('a panel in a shadow root gets a keyboard, beside itself', () => {
    kb.setAutoKeyboard(false)
    const host = document.createElement('div')
    document.body.appendChild(host)
    const shadow = host.attachShadow({ mode: 'open' })
    const field = kb.inputField({ value: 'hi' })
    const panel: any = w3d.panel3d({ width: 320 }, field)
    shadow.appendChild(panel)

    panel.handlePointer('down', 300, 20)
    panel.handlePointer('up', 300, 20)

    const holder = shadow.querySelector('[data-w3d-dom-layer]')
    expect(holder).not.toBe(null)
    // In the SHADOW root, beside the panel — not in the host's light DOM, where
    // it would never render.
    expect(holder!.parentNode).toBe(shadow)
    expect(holder!.querySelectorAll('[data-key]').length).toBeGreaterThan(20)
  })

  test('the holder carries an explicit size', () => {
    // A consumer stylesheet with fluid `svg { width: 100% }` would otherwise
    // collapse the sheet against a shrink-to-fit holder — each sizing to the
    // other, resolving to zero.
    const { holder } = inShadow()
    expect(holder).not.toBe(null)
    expect(holder!.style.width).not.toBe('')
    expect(holder!.style.height).not.toBe('')
    expect(parseFloat(holder!.style.width)).toBeGreaterThan(0)
  })

  test('positioned ABSOLUTE, so it scrolls with the field', () => {
    // `fixed` needs no positioned ancestor and is tempting for that reason, but
    // it pins the popup to the viewport — one scroll and the keyboard is no
    // longer near the field it types into.
    const { holder } = inShadow()
    expect(holder!.style.position).toBe('absolute')
  })
})
