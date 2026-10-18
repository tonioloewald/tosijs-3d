import { describe, test, expect, beforeAll } from 'bun:test'
import { Window } from 'happy-dom'

// widgets3d builds SVG at import time, so it needs a DOM first.
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

const BAR = 28

/** Content 400 x 300 that records what reaches it. */
const content = () => {
  const el = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'svg'
  ) as unknown as SVGSVGElement
  el.setAttribute('viewBox', '0 0 400 300')
  el.setAttribute('width', '400')
  el.setAttribute('height', '300')
  const got: string[] = []
  ;(el as any).handlePointer = (k: string, x: number, y: number) =>
    got.push(`${k} ${x} ${y}`)
  return { el, got }
}

describe("titled3d: the settings panel's title bar over any content", () => {
  test('is the content plus the bar, and gives the content back', () => {
    const c = content()
    const t = w3d.titled3d(c.el, { title: 'Inventory', handleClose: () => {} })
    expect(t.getAttribute('viewBox')).toBe(`0 0 400 ${300 + BAR}`)
    expect(c.el.parentNode).toBe(t)
    expect(c.el.getAttribute('y')).toBe(String(BAR))
    expect(t.textContent).toContain('Inventory')
    t.dispose()
    expect(c.el.parentNode).toBeNull()
    expect(c.el.getAttribute('y')).toBeNull()
  })

  test('presses below the bar reach the content in its own units', () => {
    const c = content()
    const t = w3d.titled3d(c.el, { handleClose: () => {} }) as any
    t.handlePointer('down', 50, BAR + 10)
    t.handlePointer('up', 50, BAR + 10)
    expect(c.got).toEqual(['down 50 10', 'up 50 10'])
  })

  test("a drag that began in the content stays the content's over the bar", () => {
    const c = content()
    const t = w3d.titled3d(c.el, { handleClose: () => {} }) as any
    t.handlePointer('down', 50, BAR + 10)
    t.handlePointer('move', 60, 5)
    t.handlePointer('up', 60, 5)
    expect(c.got).toEqual([
      'down 50 10',
      `move 60 ${5 - BAR}`,
      `up 60 ${5 - BAR}`,
    ])
  })

  test('× closes on release there, and the rest of the bar is the grip', () => {
    const c = content()
    let closed = 0
    const t = w3d.titled3d(c.el, { handleClose: () => closed++ }) as any
    t.handlePointer('down', 395, 10)
    t.handlePointer('up', 395, 10)
    expect(closed).toBe(1)
    // A press that slides off the × is not a close.
    t.handlePointer('down', 395, 10)
    t.handlePointer('up', 100, 10)
    expect(closed).toBe(1)
    expect(t.gripHit(100, 10)).toBe(true)
    expect(t.gripHit(395, 10)).toBe(false)
    expect(t.gripHit(100, BAR + 10)).toBe(false)
    expect(c.got.filter((s) => !s.startsWith('leave'))).toEqual([])
  })

  test('follows the content when it changes size (a dock opening)', async () => {
    const c = content()
    const t = w3d.titled3d(c.el, {})
    c.el.setAttribute('viewBox', '0 0 600 500')
    await new Promise((r) => setTimeout(r, 50))
    expect(t.getAttribute('viewBox')).toBe(`0 0 600 ${500 + BAR}`)
  })

  test('setContent swaps the content under the same frame (#111)', () => {
    const home = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    const a = content()
    home.append(a.el)
    const t = w3d.titled3d(a.el, {}) as any
    const b = content()
    b.el.setAttribute('viewBox', '0 0 400 500')
    // A drag in the old content ends there when the content changes.
    t.handlePointer('down', 50, BAR + 10)
    t.setContent(b.el)
    expect(a.got).toEqual(['down 50 10', `leave 0 0`])
    expect(a.el.parentNode).toBe(home)
    expect(a.el.getAttribute('y')).toBeNull()
    expect(b.el.parentNode).toBe(t)
    expect(b.el.getAttribute('y')).toBe(String(BAR))
    expect(t.getAttribute('viewBox')).toBe(`0 0 400 ${500 + BAR}`)
    // The very next press is the new content's.
    t.handlePointer('down', 20, BAR + 30)
    t.handlePointer('up', 20, BAR + 30)
    expect(b.got).toEqual(['down 20 30', 'up 20 30'])
    t.dispose()
    expect(b.el.parentNode).toBeNull()
  })

  test("scrolling is the content's (a wheel over the panel, #114)", () => {
    const panel = w3d.panel3d(
      { width: 300, maxHeight: 120 },
      ...Array.from({ length: 12 }, (_, i) => w3d.button3d({ label: `r${i}` }))
    )
    const t = w3d.titled3d(panel, {}) as any
    expect(t.scrollable).toBe(true)
    t.scrollBy(40)
    expect(panel.scrollTop).toBe(40)
    expect(t.scrollTop).toBe(40)
    t.scrollTop = 0
    expect(panel.scrollTop).toBe(0)
  })
})
