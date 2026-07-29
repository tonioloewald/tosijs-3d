import { describe, test, expect, beforeAll } from 'bun:test'
import { Window } from 'happy-dom'

// box.ts pulls in tosijs (svgElements) + builds SVG, so it needs a DOM before import.
let mod: typeof import('./box')

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
  mod = await import('./box')
})

// pull the y (or x) out of a wrapper's translate(x y)
const tx = (el: Element) =>
  Number(el.getAttribute('transform')!.match(/translate\((-?\d+)/)![1])
const ty = (el: Element) =>
  Number(el.getAttribute('transform')!.match(/translate\(-?\d+ (-?\d+)/)![1])

describe('box — structure', () => {
  test('returns a <g> with a background rect and a clipped content group', () => {
    const b = mod.box(
      { width: 200, padding: 10, background: '#111', radius: 8 },
      mod.textBlock('hi')
    )
    expect(b.el.tagName.toLowerCase()).toBe('g')
    expect(b.el.querySelector('[data-box-bg]')?.getAttribute('fill')).toBe('#111')
    expect(b.el.querySelector('clipPath')).not.toBeNull()
    expect(b.el.querySelector('[data-box-content]')).not.toBeNull()
  })

  test('positions each block in a padding-translated wrapper, stacked', () => {
    const b = mod.box(
      { width: 200, padding: 10, gap: 8 },
      mod.textBlock('a'),
      mod.textBlock('b')
    )
    const wraps = b.el.querySelectorAll('[data-box-content] > g')
    expect(wraps.length).toBe(2)
    expect(tx(wraps[0])).toBe(10) // padding
    expect(ty(wraps[0])).toBe(10)
    expect(ty(wraps[1])).toBeGreaterThan(10) // stacked below
  })
})

describe('box — resize re-flows text', () => {
  test('a narrower box wraps the paragraph taller', () => {
    const para =
      'the quick brown fox jumps over the lazy dog again and again and again'
    const b = mod.box({ width: 300 }, mod.textBlock(para))
    const wide = b.contentHeight
    b.resize(120)
    expect(b.contentHeight).toBeGreaterThan(wide)
  })
})

describe('box — scroll region', () => {
  test('a fixed height shorter than content becomes scrollable + clamps', () => {
    const para = Array.from(
      { length: 20 },
      (_, i) => `line ${i} with several words that will wrap`
    ).join(' ')
    const b = mod.box({ width: 200, height: 80 }, mod.textBlock(para))
    expect(b.viewportHeight).toBe(80)
    expect(b.contentHeight).toBeGreaterThan(80)
    b.scrollBy(100000) // clamp to the overflow
    const content = b.el.querySelector('[data-box-content]')!
    expect(ty(content)).toBe(-(b.contentHeight - 80))
  })

  test('hug height (no fixed height) → viewport == content', () => {
    const b = mod.box({ width: 200 }, mod.textBlock('short'))
    expect(b.viewportHeight).toBe(b.contentHeight)
  })
})

describe('box — inline children flow', () => {
  test('inline icons pack left-to-right on one row', () => {
    const b = mod.box(
      { width: 200, gap: 8 },
      mod.inlineIcon('check', { size: 20, color: '#fff' }),
      mod.inlineIcon('star', { size: 20, color: '#fff' })
    )
    const wraps = b.el.querySelectorAll('[data-box-content] > g')
    expect(wraps.length).toBe(2)
    expect(tx(wraps[1])).toBeGreaterThan(tx(wraps[0])) // same row, to the right
    expect(ty(wraps[0])).toBe(ty(wraps[1]))
    expect(wraps[0].querySelector('path,polyline,line,g')).not.toBeNull()
  })
})
