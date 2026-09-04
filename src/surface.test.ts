import { describe, test, expect, beforeAll } from 'bun:test'
import { Window } from 'happy-dom'

let S: typeof import('./surface.js')
let B: typeof import('./box.js')

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
  S = await import('./surface.js')
  B = await import('./box.js')
})

describe('surface — popups', () => {
  test('openPopup mounts a positioned popup in the overlay; closeAll clears it', () => {
    const s = S.surface({ width: 300, height: 300 })
    const b = B.box({ width: 100, height: 60, background: '#111' })
    const p = s.openPopup({ x: 20, y: 20, width: 40, height: 20 }, b, 'below')
    expect(s.popups.length).toBe(1)
    expect(p.y).toBe(40) // below the anchor: 20 + 20
    expect(
      s.el.querySelector('[data-surface-overlay] [data-popup]')
    ).not.toBeNull()
    s.closeAll()
    expect(s.popups.length).toBe(0)
    expect(s.el.querySelector('[data-popup]')).toBeNull()
  })

  test('a down outside all popups dismisses them', () => {
    const s = S.surface({ width: 300, height: 300 })
    s.openPopup(
      { x: 20, y: 20, width: 40, height: 20 },
      B.box({ width: 100, height: 60 })
    )
    s.handlePointer('down', 5, 5) // far from the popup at (20,40)
    expect(s.popups.length).toBe(0)
  })
})

describe('surface — cascade menu', () => {
  const items = () => [
    { label: 'A', onSelect: () => {} },
    { label: 'More', submenu: [{ label: 'X' }, { label: 'Y' }] },
  ]

  test('openMenu opens one popup; activating a submenu item cascades a second (to the right)', () => {
    const s = S.surface({ width: 400, height: 400 })
    const top = S.openMenu(s, { x: 10, y: 10, width: 60, height: 20 }, items())
    expect(s.popups.length).toBe(1)
    // click the "More" row (index 1) inside the menu box
    const r = top.box.childRect(1)!
    top.box.handlePointer('down', r.x + 5, r.y + 5)
    top.box.handlePointer('up', r.x + 5, r.y + 5)
    expect(s.popups.length).toBe(2)
    expect(s.popups[1].side).toBe('right')
  })

  test('selecting a leaf item fires onSelect and closes the whole menu', () => {
    const s = S.surface({ width: 400, height: 400 })
    let picked = ''
    const its = [{ label: 'A', onSelect: () => (picked = 'A') }]
    const top = S.openMenu(s, { x: 10, y: 10, width: 60, height: 20 }, its)
    const r = top.box.childRect(0)!
    top.box.handlePointer('down', r.x + 5, r.y + 5)
    top.box.handlePointer('up', r.x + 5, r.y + 5)
    expect(picked).toBe('A')
    expect(s.popups.length).toBe(0)
  })
})

describe('surface — persistent draggable panel', () => {
  const mk = (o = {}) => {
    const s = S.surface({ width: 400, height: 400 })
    const c = B.box({ width: 160, height: 100, background: '#111' })
    const p = s.openPanel({ x: 40, y: 40 }, c, { title: 'Debug', ...o })
    return { s, p }
  }

  test('openPanel adds a persistent panel that an outside press does NOT dismiss', () => {
    const { s, p } = mk()
    expect(s.popups.length).toBe(1)
    expect(p.kind).toBe('panel')
    s.handlePointer('down', 5, 5) // outside the panel
    expect(s.popups.length).toBe(1) // still open
  })

  test('the close × removes the panel', () => {
    const { s, p } = mk()
    const cr = p.closeRect!
    s.handlePointer(
      'down',
      p.x + cr.x + cr.width / 2,
      p.y + cr.y + cr.height / 2
    )
    expect(s.popups.length).toBe(0)
  })

  test('dragging the title bar moves the panel', () => {
    const { s, p } = mk({ draggable: true })
    s.handlePointer('down', p.x + 20, p.y + 10) // title bar, clear of the ×
    s.handlePointer('move', p.x + 70, p.y + 40)
    s.handlePointer('up', p.x + 70, p.y + 40)
    expect(p.x).toBe(90) // 40 + 50
    expect(p.y).toBe(70) // 40 + 30
  })

  test('a drag is clamped so the panel stays on the surface', () => {
    const { s, p } = mk({ draggable: true })
    s.handlePointer('down', p.x + 20, p.y + 10)
    s.handlePointer('move', p.x + 1020, p.y + 10) // way off-right
    expect(p.x).toBe(240) // clamped: 400 - 160
  })
})

describe('surface — a menu leaf select must not destroy persistent panels (rc.1 review)', () => {
  test('leaf select closes the cascade; an open panel survives', async () => {
    const S = await import('./surface.js')
    const B = await import('./box.js')
    const s = S.surface({ width: 300, height: 260 })
    s.setContent(B.box({ width: 300, height: 260 }, B.textBlock('bg')))
    // a persistent panel, per openPanel's "stays until closed" contract
    const panel = s.openPanel(
      { x: 120, y: 40 },
      B.box({ width: 120, padding: 8 }, B.textBlock('debug'))
    )
    let selected = ''
    const menu = S.openMenu(s, { x: 10, y: 10, width: 60, height: 20 }, [
      { label: 'Talk', onSelect: () => (selected = 'Talk') },
    ])
    // press the leaf item (menu box coords: first row)
    const r = menu.box.childRect(0)!
    s.handlePointer('down', menu.x + r.x + 4, menu.y + r.y + 4)
    s.handlePointer('up', menu.x + r.x + 4, menu.y + r.y + 4)
    expect(selected).toBe('Talk')
    expect(s.popups).toContain(panel) // the panel SURVIVED
    expect(s.popups.length).toBe(1) // and the menu closed
  })

  test('closeMenus closes cascades only; closeAll still closes everything', async () => {
    const S = await import('./surface.js')
    const B = await import('./box.js')
    const s = S.surface({ width: 300, height: 260 })
    s.setContent(B.box({ width: 300, height: 260 }, B.textBlock('bg')))
    const panel = s.openPanel(
      { x: 120, y: 40 },
      B.box({ width: 120, padding: 8 }, B.textBlock('debug'))
    )
    S.openMenu(s, { x: 10, y: 10, width: 60, height: 20 }, [{ label: 'A' }])
    s.closeMenus()
    expect(s.popups).toEqual([panel])
    s.closeAll()
    expect(s.popups).toEqual([])
  })
})

describe('surface — interactiveAt', () => {
  test('popups count wholesale; content delegates to the box', async () => {
    const S = await import('./surface.js')
    const B = await import('./box.js')
    const s = S.surface({ width: 300, height: 260 })
    s.setContent(
      B.box(
        { width: 300, height: 260, padding: 10, gap: 8 },
        B.textBlock('static prose'),
        B.button('Go')
      )
    )
    // content: prose reads static
    expect(s.interactiveAt(15, 15)).toBe(false)
    // a panel claims anywhere in its rect (title bar drags, × closes)
    const p = s.openPanel(
      { x: 150, y: 100 },
      B.box({ width: 100, padding: 8 }, B.textBlock('panel prose'))
    )
    expect(s.interactiveAt(160, 110)).toBe(true)
    s.closePopup(p)
    expect(s.interactiveAt(160, 110)).toBe(false)
  })
})
