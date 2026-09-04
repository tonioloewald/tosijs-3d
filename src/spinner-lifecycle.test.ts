import { describe, test, expect, beforeAll } from 'bun:test'
import { Window } from 'happy-dom'

/*
A SPINNER JOINS A SHARED TICKER, so something has to take it out again.

`spinner3d` registers into a module-global Set driven by one interval — the
right design (N spinners cost one timer), with one consequence: the element
leaving the tree does not stop the timer, and the tick closure keeps the whole
SVG subtree alive. `B3d` rebuilds its panel rows on every repaint, so before
0.8.1 every rebuild orphaned a spinner that animated forever.

Reaping by `el.isConnected` would be wrong: `SvgTexture` serialises a panel with
`XMLSerializer` and never attaches it, so an in-scene panel's SVG is detached
for its whole life and would be culled while visible. The owner disposes
instead — which is what these tests pin.
*/

let w3d: typeof import('./widgets3d.js')

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
  w3d = await import('./widgets3d.js')
})

/** How far the ring has turned — the observable proof it is still ticking. */
const angleOf = (s: { el: SVGElement }): string =>
  s.el.querySelector('[transform*="rotate"]')?.getAttribute('transform') ?? ''

const settle = (ms: number) => new Promise((r) => setTimeout(r, ms))

describe('spinner3d — the shared ticker releases', () => {
  test('it animates while it is alive', async () => {
    const s = w3d.spinner3d({ label: 'working' })
    s.layout(300)
    const before = angleOf(s)
    await settle(200)
    expect(angleOf(s)).not.toBe(before)
    s.dispose()
  })

  test('dispose STOPS it — the orphan case, before the owner existed', async () => {
    const s = w3d.spinner3d({ label: 'working' })
    s.layout(300)
    await settle(80)
    s.dispose()
    const parked = angleOf(s)
    await settle(200)
    expect(angleOf(s)).toBe(parked)
  })

  test('a detached spinner still animates — isConnected is NOT the signal', async () => {
    // Pinning the trap: an in-scene panel's SVG is never in the document, so a
    // reaper keyed on attachment would cull a visible VR spinner.
    const s = w3d.spinner3d({ label: 'in a texture' })
    s.layout(300)
    expect(s.el.isConnected).toBe(false)
    const before = angleOf(s)
    await settle(200)
    expect(angleOf(s)).not.toBe(before)
    s.dispose()
  })

  test('many rebuilds leave nothing ticking once each is disposed', async () => {
    // The actual leak shape: build a fresh row set repeatedly, as a repaint does.
    const generations: Array<ReturnType<typeof w3d.spinner3d>> = []
    for (let i = 0; i < 5; i++) {
      const s = w3d.spinner3d({ label: `gen ${i}` })
      s.layout(300)
      generations.push(s)
    }
    for (const s of generations) s.dispose()
    const parked = generations.map(angleOf)
    await settle(200)
    expect(generations.map(angleOf)).toEqual(parked)
  })

  test('disposing twice is harmless', () => {
    const s = w3d.spinner3d({})
    s.layout(300)
    expect(() => {
      s.dispose()
      s.dispose()
    }).not.toThrow()
  })

  test('`dispose` is part of the Widget3d contract, not a spinner special case', () => {
    // What lets B3d release a consumer's widget without knowing what it is.
    const s = w3d.spinner3d({})
    const asWidget: import('./widgets3d.js').Widget3d = s
    expect(typeof asWidget.dispose).toBe('function')
    s.dispose()
  })
})
