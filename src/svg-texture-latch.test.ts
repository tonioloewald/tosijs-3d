import { describe, test, expect, beforeAll } from 'bun:test'

// The busy-latch regression the review flagged as shipped-untested: a failed
// rasterize must release `_rendering` and NOT commit `_lastXml`, so the next
// tick retries instead of the plane freezing for the session (the "keyboard
// types but the plane never shows it" bug).
//
// SvgTexture's constructor needs a real Babylon DynamicTexture, but `render()`
// only touches `this._element/_rendering/_lastXml/_img` and the texture's
// getContext()/update() — so we drive render() on a prototype instance with a
// fake texture and a controllable fake Image. Brittle-by-design tradeoff:
// if render() grows new dependencies this test fails loudly, which is fine.

let SvgTexture: typeof import('./svg-texture').SvgTexture

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
  g.URL.createObjectURL ??= () => 'blob:fake'
  g.URL.revokeObjectURL ??= () => {}
  SvgTexture = (await import('./svg-texture')).SvgTexture
})

const mk = () => {
  const updates: boolean[] = []
  const ctx = {
    save() {},
    clearRect() {},
    translate() {},
    scale() {},
    drawImage() {},
    restore() {},
  }
  const img: any = { onload: null, onerror: null, _srcSets: 0 }
  Object.defineProperty(img, 'src', {
    set() {
      img._srcSets++
    },
  })
  const t: any = Object.create(SvgTexture.prototype)
  t.texture = { getContext: () => ctx, update: (b: boolean) => updates.push(b) }
  t._resolution = 64
  t._rendering = false
  t._lastXml = ''
  t._img = img
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 10 10')
  t._element = svg
  return { t, img, updates, svg }
}

describe('SvgTexture — the rasterize busy latch', () => {
  test('a FAILED rasterize releases the latch and does not commit lastXml', () => {
    const { t, img, updates } = mk()
    t.render()
    expect(t._rendering).toBe(true) // in flight
    img.onerror() // rasterize fails
    expect(t._rendering).toBe(false) // latch released — rc.0 kept it forever
    expect(t._lastXml).toBe('') // NOT remembered as done
    expect(updates).toEqual([]) // no GPU upload of a bad frame
  })

  test('…so the next tick RETRIES the same xml, and success commits it', () => {
    const { t, img, updates } = mk()
    t.render()
    img.onerror()
    t.render() // same xml — must NOT be skipped, the failure never committed
    expect(t._rendering).toBe(true)
    img.onload()
    expect(t._rendering).toBe(false)
    expect(t._lastXml).not.toBe('')
    expect(updates).toEqual([false]) // one upload
    // and now the dedupe kicks in: unchanged xml renders nothing
    t.render()
    expect(t._rendering).toBe(false)
    expect(img._srcSets).toBe(2) // two real rasterizes, no third
  })

  test('a render while one is in flight is dropped (the latch is the guard)', () => {
    const { t, img } = mk()
    t.render()
    t.render()
    expect(img._srcSets).toBe(1)
    img.onload()
  })
})
