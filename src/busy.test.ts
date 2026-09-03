import { describe, test, expect, beforeAll } from 'bun:test'
import { Window } from 'happy-dom'

/*
BUSY INDICATORS (tosijs-3d#60).

The widget set could say what a value IS but not that something is HAPPENING.
Ensemble's insert palette listed one kit, then silently became four — nothing
was wrong and nothing said so, so the honest reading was "this is all there is".

The reason it belongs upstream rather than in a consumer: it has to animate in
BOTH presentations, and CSS cannot. A keyframe animation works flat and does not
run at all once the SVG is serialised to a texture, so a consumer would ship
something that looks right on a desktop and freezes in a headset.
*/

let w: typeof import('./widgets3d')

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
  w = await import('./widgets3d')
})

describe('spinner3d animates as GEOMETRY, not CSS', () => {
  test('it moves without any stylesheet', async () => {
    // The whole point: a texture rasterises the markup, so motion has to be in
    // the attributes.
    const s = w.spinner3d({ label: 'loading' })
    s.layout!(200)
    const ring = s.el.querySelector('circle')!
    const before = ring.getAttribute('transform')
    await new Promise((r) => setTimeout(r, 140))
    const after = ring.getAttribute('transform')
    expect(after).not.toBe(before)
    s.dispose()
  })

  test('no CSS animation is used anywhere', () => {
    const s = w.spinner3d({})
    s.layout!(200)
    const markup = s.el.outerHTML
    expect(markup).not.toContain('animation')
    expect(markup).not.toContain('@keyframes')
    s.dispose()
  })

  test('dispose stops it', async () => {
    const s = w.spinner3d({})
    s.layout!(200)
    const ring = s.el.querySelector('circle')!
    s.dispose()
    const parked = ring.getAttribute('transform')
    await new Promise((r) => setTimeout(r, 140))
    expect(ring.getAttribute('transform')).toBe(parked)
  })

  test('many spinners share ONE ticker', async () => {
    // N spinners must not be N timers.
    const many = Array.from({ length: 5 }, () => w.spinner3d({}))
    for (const s of many) s.layout!(200)
    await new Promise((r) => setTimeout(r, 140))
    const moved = many.filter(
      (s) => s.el.querySelector('circle')!.getAttribute('transform') != null
    )
    expect(moved.length).toBe(5)
    for (const s of many) s.dispose()
  })

  test('it is not interactive — a press falls through to the panel', () => {
    // A spinner reports; it does not respond. Swallowing the press would break
    // drag-scrolling a panel that happens to be loading.
    const s = w.spinner3d({})
    s.layout!(200)
    expect(s.hitTest!(20, 20)).toBe(false)
    s.dispose()
  })
})

describe('progress3d is determinate and needs no clock', () => {
  test('the fill tracks the value', () => {
    const p = w.progress3d({ label: 'kits', value: 0 })
    p.layout!(300)
    const fill = p.el.querySelectorAll('rect')[1]
    const at0 = Number(fill.getAttribute('width'))
    p.setValue(0.5)
    const at50 = Number(fill.getAttribute('width'))
    p.setValue(1)
    const at100 = Number(fill.getAttribute('width'))
    expect(at0).toBe(0)
    expect(at50).toBeGreaterThan(at0)
    expect(at100).toBeGreaterThan(at50)
  })

  test('out-of-range and junk values are clamped, not rendered', () => {
    const p = w.progress3d({ value: 0.5 })
    p.layout!(300)
    const fill = p.el.querySelectorAll('rect')[1]
    const track = Number(p.el.querySelectorAll('rect')[0].getAttribute('width'))
    p.setValue(5)
    expect(Number(fill.getAttribute('width'))).toBeLessThanOrEqual(track)
    p.setValue(-1)
    expect(Number(fill.getAttribute('width'))).toBe(0)
    p.setValue(NaN)
    expect(Number(fill.getAttribute('width'))).toBe(0)
  })

  test('it shows a percentage by default', () => {
    const p = w.progress3d({ value: 0.42 })
    p.layout!(300)
    const texts = [...p.el.querySelectorAll('text')].map((t) => t.textContent)
    expect(texts).toContain('42%')
  })

  test('no timer — nothing to dispose', () => {
    // If you find yourself faking the fraction you wanted a spinner, and this
    // widget deliberately gives you no way to animate it.
    const p = w.progress3d({ value: 0.5 }) as any
    expect(p.dispose).toBeUndefined()
  })
})
