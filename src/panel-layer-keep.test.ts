import { beforeAll, describe, expect, test } from 'bun:test'

/*
THE POPUP MUST SURVIVE THE PANEL BEING REBUILT.

A `widgets3d` popup mounts as a SIBLING of its panel — a DOM layer, because a
popup inside the panel's `<svg>` is cropped by its viewBox — so it is a child of
whatever container holds the panel. The scene panel rebuilds that container on
every repaint, and every action button in a debug panel repaints.

So the popup you were pressing a button in vanished, and `_debugOpen` still held
its id, which is why bringing it back took two clicks: the first one only turned
the flag off again. Tonio, twice: "clicking reset worst closed the panel", then
"reset worst still disappears the panel and it then takes two clicks to bring
back".

It went wrong twice because the first fix was described in a commit message and
not present in the diff. This is the version that cannot be described without
being there.
*/
let U: typeof import('./b3d-utils.js')

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
  g.document ??= win.document
  // Babylon is imported for its side effects by the barrel; this module needs
  // only the DOM, so import it directly rather than through `index`.
  U = await import('./b3d-utils.js')
})

/**
 * A panel host: header, panel, and one open popup layer beside it.
 *
 * DETACHED, deliberately. Bun shares a process across test files, so nodes left
 * in `document.body` are visible to every other suite — six strays from an
 * earlier draft of this file made `dom-layer-popup`'s "close removes it" count
 * six instead of zero, in a suite that never mentions this one. Nothing here
 * needs a layout, so nothing here needs the document.
 */
function host(): HTMLElement {
  const el = document.createElement('div')
  const head = document.createElement('div')
  head.className = 'head'
  const panel = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  const layer = document.createElement('div')
  layer.setAttribute('data-w3d-dom-layer', '')
  layer.style.left = '240px'
  el.append(head, panel, layer)
  return el
}

describe('replaceKeepingLayers', () => {
  test('a rebuild keeps the popup layer', () => {
    const el = host()
    const kept = el.querySelector('[data-w3d-dom-layer]')
    U.replaceKeepingLayers(
      el,
      document.createElement('div'),
      document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    )
    expect(el.querySelectorAll('[data-w3d-dom-layer]')).toHaveLength(1)
    // The SAME node, not a replacement: a popup rebuilt from scratch loses its
    // drag position, its scroll offset and the live rows registered against it.
    expect(el.querySelector('[data-w3d-dom-layer]')).toBe(kept)
  })

  test('the layer keeps where it was dragged to', () => {
    const el = host()
    U.replaceKeepingLayers(el, document.createElement('div'))
    const layer = el.querySelector('[data-w3d-dom-layer]') as HTMLElement
    expect(layer.style.left).toBe('240px')
  })

  test('the layer stays LAST, so it paints over the rebuilt panel', () => {
    const el = host()
    U.replaceKeepingLayers(
      el,
      document.createElement('div'),
      document.createElement('div')
    )
    expect(el.lastElementChild?.hasAttribute('data-w3d-dom-layer')).toBe(true)
  })

  test('everything else IS replaced — this is not an append', () => {
    const el = host()
    const fresh = document.createElement('div')
    fresh.className = 'fresh'
    U.replaceKeepingLayers(el, fresh)
    expect(el.querySelector('.head')).toBe(null)
    expect(el.querySelector(':scope > svg')).toBe(null)
    expect(el.querySelector('.fresh')).toBe(fresh)
  })

  test('a container with no layers behaves exactly like replaceChildren', () => {
    const el = document.createElement('div')
    el.append(document.createElement('span'))
    const fresh = document.createElement('p')
    U.replaceKeepingLayers(el, fresh)
    expect([...el.children]).toEqual([fresh] as any)
  })

  test('only DIRECT children are kept — a layer inside the panel is not ours', () => {
    /*
    `:scope >`, not a descendant query. A layer nested inside the panel being
    replaced belongs to that panel and goes with it; re-appending it would
    resurrect a popup whose opener no longer exists.
    */
    const el = document.createElement('div')
    const panel = document.createElement('div')
    const inner = document.createElement('div')
    inner.setAttribute('data-w3d-dom-layer', '')
    panel.append(inner)
    el.append(panel)
    U.replaceKeepingLayers(el, document.createElement('div'))
    expect(el.querySelectorAll('[data-w3d-dom-layer]')).toHaveLength(0)
  })
})
