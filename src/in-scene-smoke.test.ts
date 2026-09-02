import { describe, test, expect, beforeAll } from 'bun:test'
import { Window } from 'happy-dom'

/*
EVERY widget must survive the trip to a texture.

The in-scene path is what makes these widgets worth having, and it is the path
no demo exercises for `curve3d`, `footprint3d` or `vector3d` — they are shown
flat only. An unexercised second presentation is exactly how the "one UI, two
presentations" divergence got in before (UI-DESIGN-NOTES → "One UI, two
presentations"), where the XR panel grew its own refresh and silently detached
the closures `panel3d` hangs off the element.

This is not a rendering test — it cannot be, without a GPU. It pins the two
things that actually broke last time and that a flat demo cannot catch:

  1. The widget SERIALISES. `SvgTexture` clones the element and runs it through
     `XMLSerializer`, which is a different code path from being in the document:
     a stray DOM-only node, or an attribute set to `undefined`, dies here and
     nowhere else.
  2. `panel3d`'s behaviour SURVIVES being put in a panel — `handlePointer` and
     `scrollBy` are hung off the element, and anything that replaces the
     element's children detaches them.
*/
let w3d: typeof import('./widgets3d')
let curve: typeof import('./curve-field')
let footprint: typeof import('./footprint-field')
let vector: typeof import('./vector-field')
let grid: typeof import('./icon-grid')

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
  curve = await import('./curve-field')
  footprint = await import('./footprint-field')
  vector = await import('./vector-field')
  grid = await import('./icon-grid')
})

/*
Names are a plain literal and construction is DEFERRED into a function, because
a `describe` body runs BEFORE `beforeAll` — so building widgets at describe time
reads the module handles while they are still undefined. Cost me a run.
*/
const NAMES = [
  'curve3d',
  'curve3d falloff',
  'footprint3d',
  'vector3d',
  'euler3d',
  'iconGrid3d',
] as const

const make = (name: (typeof NAMES)[number]) => {
  switch (name) {
    case 'curve3d':
      return curve.curve3d({ kind: 'profile', label: 'shape' })
    case 'curve3d falloff':
      return curve.curve3d({ kind: 'falloff' })
    case 'footprint3d':
      return footprint.footprint3d({ value: 'hexagon' })
    case 'vector3d':
      return vector.vector3d({ value: { x: 1, y: 2, z: 3 } })
    case 'euler3d':
      return vector.euler3d({ value: { x: 0, y: 45, z: 0 } })
    case 'iconGrid3d':
      return grid.iconGrid3d({ items: [{ icon: 'close' }, { icon: 'copy' }] })
  }
}

describe('every widget survives the trip to a texture', () => {
  for (const name of NAMES) {
    test(`${name} serialises to non-trivial SVG`, () => {
      const panel = w3d.panel3d({ width: 300 }, make(name) as any)
      // The same clone-and-serialise SvgTexture does each frame.
      const clone = panel.cloneNode(true) as SVGSVGElement
      clone.removeAttribute('style')
      const xml = new XMLSerializer().serializeToString(clone)
      expect(xml.length).toBeGreaterThan(200)
      expect(xml).toContain('<svg')
      // `undefined` reaching an attribute is the classic failure — it survives
      // in the DOM and serialises as the literal string.
      expect(xml).not.toContain('undefined')
      expect(xml).not.toContain('NaN')
    })
  }

  test('a panel holding ALL of them still serialises, and keeps its behaviour', () => {
    const panel = w3d.panel3d(
      { width: 320 },
      ...NAMES.map((n) => make(n) as any)
    ) as any
    const xml = new XMLSerializer().serializeToString(
      panel.cloneNode(true) as SVGSVGElement
    )
    expect(xml).not.toContain('undefined')
    expect(xml).not.toContain('NaN')
    // The closures panel3d hangs off the element — the thing that silently
    // detached last time and made an XR panel untargetable.
    expect(typeof panel.handlePointer).toBe('function')
    expect(typeof panel.openPopup).toBe('function')
  })

  test('pointer routing reaches every widget through the panel', () => {
    // Coordinate-routed, which is what makes the in-scene path work at all: in a
    // scene there are no DOM events, only a uv mapped back to viewBox coords.
    const hits: string[] = []
    const probes = NAMES.map((name) => {
      const w = make(name)
      const spy = { ...(w as any) }
      spy.handle = (...args: unknown[]) => {
        hits.push(name)
        return (w as any).handle?.(...(args as [any, number, number]))
      }
      return spy
    })
    const panel = w3d.panel3d({ width: 320 }, ...(probes as any)) as any
    /*
    Sweep x as well as y. A widget's hit area is not its row: `footprint3d` draws
    a CENTRED square and rejects presses outside it, so a probe pinned to x=40
    walked straight past it and reported it unreachable. That is the widget being
    right and the probe being naive — but it is also the shape of a real bug this
    test should be able to catch, so the sweep is the honest fix rather than
    moving the probe to x=160 and hoping.
    */
    for (let y = 8; y < 900; y += 12) {
      for (const x of [40, 160, 280]) panel.handlePointer('down', x, y)
    }
    // Every widget should have been reachable by SOME press.
    for (const name of NAMES) expect(hits).toContain(name)
  })
})
