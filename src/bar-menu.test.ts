import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import { Window } from 'happy-dom'

let barMenu: typeof import('./bar-menu.js').barMenu
// happy-dom's elements take only its own events: Bun's are swapped out for
// this file and put back after it.
const g = globalThis as any
const bunEvents = { Event: g.Event, CustomEvent: g.CustomEvent }
afterAll(() => Object.assign(g, bunEvents))

beforeAll(async () => {
  const win = new Window() as any
  g.Event = win.Event
  g.CustomEvent = win.CustomEvent
  g.window ??= win
  for (const k of Object.getOwnPropertyNames(win)) {
    try {
      g[k] ??= win[k]
    } catch {
      /* off-document getters */
    }
  }
  ;({ barMenu } = await import('./bar-menu.js'))
})

const ROW = 36
const PAD = 6
/** Press and release on list row `i` (rows below separators shift: pass y). */
const tap = (menu: any, y: number) => {
  menu.svg.handlePointer('down', 40, y)
  menu.svg.handlePointer('up', 40, y)
}
const rowY = (i: number) => PAD + i * ROW + ROW / 2

describe('barMenu', () => {
  test('a select: picking an option sets the value and calls handleChange', () => {
    const picked: string[] = []
    const m: any = barMenu({
      icon: 'sun',
      title: 'Weather',
      options: ['clear', 'cloudy', 'storm'],
      handleChange: (v) => picked.push(v),
    })
    expect(m.value).toBe('clear')
    tap(m, rowY(2))
    expect(picked).toEqual(['storm'])
    expect(m.value).toBe('storm')
  })

  test('an action runs and leaves the value alone', () => {
    let ran = 0
    const m: any = barMenu({
      icon: 'character',
      title: 'Character',
      options: [{ label: 'Save', handleSelect: () => ran++ }],
    })
    tap(m, rowY(0))
    expect(ran).toBe(1)
  })

  test('a submenu opens in place, with a way back', () => {
    let loaded = ''
    const m: any = barMenu({
      icon: 'character',
      title: 'Character',
      options: [
        { label: 'Select', items: () => [{ label: 'Ada', handleSelect: () => (loaded = 'Ada') }] },
        { label: 'Save', handleSelect: () => {} },
      ],
    })
    const top = m.svg
    tap(m, rowY(0))
    expect(m.svg).not.toBe(top) // a new level is a new SVG
    // Row 0 is "‹ Character", row 1 is Ada.
    tap(m, rowY(1))
    expect(loaded).toBe('Ada')
  })

  test('back returns to the parent list', () => {
    const m: any = barMenu({
      icon: 'character',
      title: 'Character',
      options: [{ label: 'Select', items: ['Ada', 'Bo'] }, { label: 'Save' }],
    })
    tap(m, rowY(0))
    const sub = m.svg
    tap(m, rowY(0)) // ‹ back
    expect(m.svg).not.toBe(sub)
    expect(m.svg.textContent).toContain('Save')
  })

  test('separators and disabled rows are not pickable', () => {
    let ran = 0
    const m: any = barMenu({
      icon: 'character',
      title: 'Character',
      options: [
        { label: 'Rename', disabled: true, handleSelect: () => ran++ },
        { separator: true },
        { label: 'Export', handleSelect: () => ran++ },
      ],
    })
    tap(m, rowY(0))
    expect(ran).toBe(0)
    tap(m, PAD + ROW + 5) // the rule
    expect(ran).toBe(0)
    tap(m, PAD + ROW + 11 + ROW / 2) // Export, below the 11-unit rule
    expect(ran).toBe(1)
  })

  test('options as a function are read when the menu opens', () => {
    let saved = ['Ada']
    const m: any = barMenu({
      icon: 'character',
      title: 'Character',
      layout: 'list',
      options: () => saved.map((n) => ({ label: n, handleSelect: () => {} })),
    })
    expect(m.svg.textContent).toContain('Ada')
    saved = ['Ada', 'Bo']
    m.dispatchEvent(new CustomEvent('paneltoggle', { detail: { open: true } }))
    expect(m.svg.textContent).toContain('Bo')
  })

  test('every option with an icon: a toolbar, unless the layout says list', () => {
    const opts = [
      { value: 'front', icon: 'bipedFront' },
      { value: 'back', icon: 'bipedBack' },
    ]
    const tool: any = barMenu({ icon: 'camera', title: 'View', options: opts })
    const list: any = barMenu({ icon: 'camera', title: 'View', options: opts, layout: 'list' })
    // A toolbar is one row; a list is a row per option.
    expect(Number(tool.svg.getAttribute('height'))).toBe(PAD * 2 + 44)
    expect(Number(list.svg.getAttribute('height'))).toBe(PAD * 2 + 2 * ROW)
    expect(list.svg.textContent).toContain('front')
  })
})
