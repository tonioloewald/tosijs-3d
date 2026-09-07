import { describe, test, expect, beforeAll } from 'bun:test'
import { Window } from 'happy-dom'

/*
THE EDITOR READS THE SCHEMA, so it cannot disagree with the element.

Ensemble hand-wrote a terrain schema and had it wrong three ways in one day
(#66): `biome` as a free string when it is `'on' | 'off'`, every default in the
first 3% of its track because the scales are frequencies, and `reach` unbounded
into tab-death. Easy to get wrong from outside; impossible to get wrong if the
control is built from the same metadata the element publishes.

These tests are about that WIRING — that a schema fact reaches the control —
rather than about pixels.
*/

let T: typeof import('./terrain-editor.js')
let W: typeof import('./widgets3d.js')
let S: typeof import('./scene-schemas.js')

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
  T = await import('./terrain-editor.js')
  S = await import('./scene-schemas.js')
  W = await import('./widgets3d.js')
})

const kinds = (el: Element) =>
  [...el.querySelectorAll('[data-w3d]')].map((n) => n.getAttribute('data-w3d'))

describe('terrainEditor3d', () => {
  test('it builds controls, and lays out to a real height', () => {
    const ed = T.terrainEditor3d({})
    const h = ed.layout(320)
    expect(kinds(ed.el).length).toBeGreaterThan(5)
    expect(h).toBeGreaterThan(100)
  })

  test('an ENUM becomes a select — the `biome` mistake made impossible', () => {
    // Ensemble declared `biome` a free string defaulting to "temperate"; it is
    // `'on' | 'off'` and the field had never done anything.
    const ed = T.terrainEditor3d({ advanced: true })
    ed.layout(320)
    expect(kinds(ed.el)).toContain('select')
  })

  test('the surface enum offers only what the element implements', () => {
    const props = (S.sceneSchemas.terrain() as any).properties
    expect(props.surfaceType.enum).not.toContain('plane')
  })

  test('a frequency gets a LOG track, from the schema and not by hand', () => {
    const props = (S.sceneSchemas.terrain() as any).properties
    expect(props.grossScale['x-scale']).toBe('log')
    // …and the editor asks for it, rather than hardcoding a scale.
    const ed = T.terrainEditor3d({})
    ed.layout(320)
    expect(kinds(ed.el)).toContain('slider')
  })

  test('advanced adds groups rather than replacing them', () => {
    const plain = T.terrainEditor3d({})
    const adv = T.terrainEditor3d({ advanced: true })
    plain.layout(320)
    adv.layout(320)
    expect(kinds(adv.el).length).toBeGreaterThan(kinds(plain.el).length)
  })

  test('edits accumulate and report as a whole settings object', () => {
    const seen: Array<Record<string, unknown>> = []
    const ed = T.terrainEditor3d({
      value: { grossScale: 0.02 },
      handleChange: (s) => seen.push(s),
    })
    ed.layout(320)
    ed.setValue({ detailAmplitude: 12 })
    expect(ed.value.grossScale).toBe(0.02)
    expect(ed.value.detailAmplitude).toBe(12)
  })

  test('hit-testing a row does not re-lay-out the editor', () => {
    /*
    The geometry bug you cannot unit-test by looking at values.

    `rowAt` used to read a row's height by calling `layout(0)` — which LAYS THE
    ROW OUT AGAIN, at zero width. Every slider track collapsed onto its label
    and the panel rendered handles sitting on the text; nothing threw, and every
    value was still correct. So this asserts the track geometry SURVIVES a hit
    test rather than asserting the hit test's answer.
    */
    const ed = T.terrainEditor3d({})
    ed.layout(320)
    // The TOTAL, and a hit test past the last row, so every row is visited —
    // a max() over a hit near the top misses it entirely, because the search
    // returns early and the untouched rows still hold the widest track.
    const totalTrack = () =>
      [...ed.el.querySelectorAll('rect')].reduce(
        (n, r) => n + Number(r.getAttribute('width') ?? 0),
        0
      )
    const before = totalTrack()
    expect(before).toBeGreaterThan(100)
    ed.hitTest?.(100, 1e6)
    ed.handle?.('move', 100, 1e6)
    expect(totalTrack()).toBe(before)
  })

  test('a partial setValue does not blank the other fields', () => {
    const ed = T.terrainEditor3d({ value: { seed: 7, grossScale: 0.03 } })
    ed.setValue({ seed: 9 })
    expect(ed.value.seed).toBe(9)
    expect(ed.value.grossScale).toBe(0.03) // not clobbered
  })
})

describe('a frequency gets a log track, because linear makes it useless', () => {
  /*
  From a headset, on the shipped sliders:

    "The sliders are useless around the 0 point because they're still linear.
     ensemble asked for log scales precisely for this reason and we still have
     90% of the dial devoted to the white noise side."

  A noise `scale` is a FREQUENCY. On a linear track from 0.005 to 0.3 the whole
  usable band — roughly 0.005 to 0.05 — is the first 15% of the dial and the
  remaining 85% is progressively whiter noise. The default sits at 3%, which is
  why it reads as "useless around zero": every value you actually want is
  crushed against the left stop.

  The schema has said `x-scale: 'log'` all along. This pins that the editor
  HONOURS it, which is the half that can silently stop being true — the demos
  hand-rolled their own sliders and did not, which is how this shipped.
  */

  const sliderFor = (label: string) => {
    const ed = T.terrainEditor3d({ value: {}, advanced: true })
    ed.layout(296)
    return ed.el.outerHTML.includes(`>${label}<`)
  }

  test('the editor offers the frequency controls at all', () => {
    expect(sliderFor('landform scale')).toBe(true)
    expect(sliderFor('detail scale')).toBe(true)
  })

  test('a log-hinted schema entry produces a LOG track, not a linear one', () => {
    /*
    Measured through the handle position rather than a config read: the value
    that matters is where the control puts the thing you are dragging.
    */
    const at = (scale: 'linear' | 'log', value = 0.015) => {
      const s = W.slider3d({ label: 'x', value, min: 0.005, max: 0.3, scale })
      s.layout(296)
      return Number(s.el.querySelector('circle')?.getAttribute('cx') ?? 0)
    }
    // Measured as a FRACTION of the track, so the assertion says what it means
    // and does not move when padding does.
    const left = at('linear', 0.005)
    const right = at('linear', 0.3)
    const frac = (x: number) => (x - left) / (right - left)

    // The default is crushed against the left stop on a linear track...
    expect(frac(at('linear'))).toBeLessThan(0.06)
    // ...and has room on a log one. (0.005→0.3 is 1.78 decades; 0.015 is 0.48
    // of the way along.)
    expect(frac(at('log'))).toBeGreaterThan(0.2)
    expect(frac(at('log'))).toBeLessThan(0.35)
  })

  test('a quantity that legitimately reaches ZERO stays linear', () => {
    /*
    The other half, and why this is not "make everything log": a log track has
    no zero. `landform height` runs from 0, and 0 means flat — a real value
    someone picks, not a floor to avoid.
    */
    const ed = T.terrainEditor3d({ value: {}, advanced: true })
    ed.layout(296)
    expect(ed.el.outerHTML.includes('>landform height<')).toBe(true)
  })
})
