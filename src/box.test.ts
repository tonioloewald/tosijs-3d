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
    expect(b.el.querySelector('[data-box-bg]')?.getAttribute('fill')).toBe(
      '#111'
    )
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

describe('box — event model', () => {
  test('focusMove focuses the first focusable, then navigates by direction', () => {
    let activated = ''
    const b = mod.box(
      { width: 300, gap: 10 },
      mod.button('Alpha', { onActivate: () => (activated = 'Alpha') }),
      mod.button('Beta', { onActivate: () => (activated = 'Beta') }),
      mod.button('Gamma', { onActivate: () => (activated = 'Gamma') })
    )
    expect(b.focusIndex()).toBe(-1)
    b.focusMove(1, 0) // first move → first focusable
    expect(b.focusIndex()).toBe(0)
    b.focusMove(1, 0) // right → next
    expect(b.focusIndex()).toBe(1)
    b.focusActivate()
    expect(activated).toBe('Beta')
  })

  test('the focus ring shows on the focused child', () => {
    const b = mod.box({ width: 300 }, mod.button('X'))
    const ring = b.el.querySelector('[data-box-focus]')
    expect(ring?.getAttribute('visibility')).toBe('hidden')
    b.focusMove(1, 0)
    expect(ring?.getAttribute('visibility')).toBe('visible')
  })

  test('pointer down+up over the same child activates it', () => {
    let hit = false
    const b = mod.box(
      { width: 200, padding: 0 },
      mod.button('Go', { onActivate: () => (hit = true) })
    )
    b.handlePointer('down', 15, 15)
    b.handlePointer('up', 15, 15)
    expect(hit).toBe(true)
  })

  test('down on a child then up OUTSIDE it does NOT activate (press capture)', () => {
    let hit = false
    const b = mod.box(
      { width: 200, padding: 0 },
      mod.button('Go', { onActivate: () => (hit = true) })
    )
    b.handlePointer('down', 15, 15) // on the button
    b.handlePointer('up', 195, 15) // off it
    expect(hit).toBe(false)
  })

  test('focus skips non-focusable children (a text block)', () => {
    const b = mod.box(
      { width: 200, padding: 0 },
      mod.textBlock('a label'),
      mod.button('Go')
    )
    b.focusMove(1, 0)
    expect(b.focusIndex()).toBe(1) // the button, not the text
  })
})

describe('box — press/hover/focus feedback', () => {
  test('a button reflects pressed on pointer down, and restores on up', () => {
    const b = mod.box(
      { width: 200, padding: 0 },
      mod.button('Go', {
        background: '#111',
        pressBackground: '#f00',
        hoverBackground: '#0f0',
      })
    )
    const bg = () =>
      b.el.querySelector('[data-box-button] rect')?.getAttribute('fill')
    expect(bg()).toBe('#111')
    b.handlePointer('down', 15, 15)
    expect(bg()).toBe('#f00') // pressed
    b.handlePointer('up', 15, 15)
    expect(bg()).toBe('#0f0') // no longer pressed, but now focused → hover shade
  })

  test('focus tints the button (hover shade) even without a pointer', () => {
    const b = mod.box(
      { width: 200 },
      mod.button('Go', { background: '#111', hoverBackground: '#0f0' })
    )
    const bg = () =>
      b.el.querySelector('[data-box-button] rect')?.getAttribute('fill')
    expect(bg()).toBe('#111')
    b.focusMove(1, 0)
    expect(bg()).toBe('#0f0')
  })
})

describe('box — inner focus (composite children)', () => {
  // A fake keyboard-ish child: three focus stops along x, escape off either end.
  const composite = (calls: string[]) => {
    let inner = -1
    const child: import('./box').BoxChild = {
      el: undefined as any, // filled below — needs the DOM from beforeAll
      kind: 'block',
      measure: () => ({ height: 40 }),
      focusable: true,
      focusMove: (dx, dy) => {
        if (inner < 0) {
          inner = dy < 0 || dx < 0 ? 2 : 0 // seed at the edge you entered from
          return true
        }
        if (dx === 0) return false // one horizontal strip: vertical always escapes
        const next = inner + (dx > 0 ? 1 : -1)
        if (next < 0 || next > 2) return false // escaped off an end
        inner = next
        return true
      },
      focusActivate: () => calls.push(`act:${inner}`),
      focusClear: () => {
        inner = -1
        calls.push('clear')
      },
    }
    return { child, inner: () => inner }
  }
  const mkBox = (calls: string[]) => {
    const c = composite(calls)
    c.child.el = mod.textBlock('kbd').el
    const b = mod.box({ width: 200, gap: 10 }, mod.button('Field'), c.child)
    return { b, c }
  }

  test('entering a composite child seeds its inner focus and hides the box ring', () => {
    const calls: string[] = []
    const { b, c } = mkBox(calls)
    b.focusMove(0, 1) // → button (first focusable), ring visible
    const ring = b.el.querySelector('[data-box-focus]')!
    expect(ring.getAttribute('visibility')).toBe('visible')
    b.focusMove(0, 1) // → composite, seeded at stop 0
    expect(b.focusIndex()).toBe(1)
    expect(c.inner()).toBe(0)
    // the child draws its own indicator; a ring around the whole child is noise
    expect(ring.getAttribute('visibility')).toBe('hidden')
  })

  test('moves are consumed inside until they escape, then the box moves on and clears', () => {
    const calls: string[] = []
    const { b, c } = mkBox(calls)
    b.focusMove(0, 1)
    b.focusMove(0, 1) // enter composite at 0
    b.focusMove(1, 0)
    b.focusMove(1, 0)
    expect(c.inner()).toBe(2) // walked inside; box focus unmoved
    expect(b.focusIndex()).toBe(1)
    b.focusMove(0, -1) // escapes upward → back to the button
    expect(b.focusIndex()).toBe(0)
    expect(calls).toContain('clear')
    expect(c.inner()).toBe(-1)
    const ring = b.el.querySelector('[data-box-focus]')!
    expect(ring.getAttribute('visibility')).toBe('visible')
  })

  test('an escape with nowhere to go leaves inner focus where it was', () => {
    const calls: string[] = []
    const { b, c } = mkBox(calls)
    b.focusMove(0, 1)
    b.focusMove(0, 1) // enter composite
    b.focusMove(1, 0)
    b.focusMove(1, 0) // inner = 2
    b.focusMove(1, 0) // escape right — but nothing is to the right
    expect(b.focusIndex()).toBe(1)
    expect(c.inner()).toBe(2) // not cleared: focus never actually left
  })

  test('focusActivate delegates to the inner-focused item; focusBack clears it', () => {
    const calls: string[] = []
    const { b, c } = mkBox(calls)
    b.focusMove(0, 1)
    b.focusMove(0, 1) // enter composite at 0
    b.focusActivate()
    expect(calls).toContain('act:0')
    b.focusBack()
    expect(b.focusIndex()).toBe(-1)
    expect(c.inner()).toBe(-1)
  })
})
