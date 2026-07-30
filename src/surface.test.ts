import { describe, test, expect, beforeAll } from 'bun:test'
import { Window } from 'happy-dom'

let S: typeof import('./surface')
let B: typeof import('./box')

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
  S = await import('./surface')
  B = await import('./box')
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
    s.openPopup({ x: 20, y: 20, width: 40, height: 20 }, B.box({ width: 100, height: 60 }))
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
