import { describe, test, expect, beforeAll } from 'bun:test'
import { Window } from 'happy-dom'

let mod: typeof import('./icon-grid')

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
  mod = await import('./icon-grid')
})

// Real icon names — iconGlyph warns on unknown ones, and a test that fills the
// log with warnings trains you to ignore the log.
const ITEMS = [
  { icon: 'close', label: 'close' },
  { icon: 'copy', label: 'copy' },
  { icon: 'camera', label: 'camera' },
  { icon: 'bug', label: 'bug' },
]

/**
 * Press and release on the same cell — what a real click does.
 *
 * Columns are CLAMPED to the item count, so a helper that assumes 4 lands in the
 * wrong cell on a 3-item grid; the first version of this did exactly that and
 * "clicked a disabled cell" while actually clicking its neighbour.
 */
const click = (w: any, i: number, items = ITEMS.length, columns = 4) => {
  w.layout(320)
  const cols = Math.max(1, Math.min(columns, items))
  const cw = 320 / cols
  const x = (i % cols) * cw + 4
  const y = Math.floor(i / cols) * 40 + 4
  w.handle('down', x, y)
  w.handle('up', x, y)
}

describe('the consumer owns MEANING; the grid owns layout', () => {
  test('radio keeps exactly one', () => {
    const w = mod.iconGrid3d({ items: ITEMS, mode: 'radio', selected: 0 })
    click(w, 2)
    expect(w.selection).toEqual([2])
    click(w, 3)
    expect(w.selection).toEqual([3])
  })

  test('checkbox keeps any number, and toggles off', () => {
    const w = mod.iconGrid3d({ items: ITEMS, mode: 'checkbox' })
    click(w, 1)
    click(w, 3)
    expect(w.selection).toEqual([1, 3])
    click(w, 1)
    expect(w.selection).toEqual([3])
  })

  test('buttons light nothing, but still fire', () => {
    const fired: number[] = []
    const w = mod.iconGrid3d({
      items: ITEMS,
      mode: 'buttons',
      onActivate: (i) => fired.push(i),
    })
    click(w, 0)
    click(w, 2)
    expect(w.selection).toEqual([])
    expect(fired).toEqual([0, 2])
  })

  test('onActivate fires on EVERY press, even when the selection does not move', () => {
    // The button-bar path must not depend on whether selection happened to
    // change — pressing the already-selected radio is still a press.
    const fired: number[] = []
    const w = mod.iconGrid3d({
      items: ITEMS,
      mode: 'radio',
      selected: 1,
      onActivate: (i) => fired.push(i),
    })
    click(w, 1)
    click(w, 1)
    expect(fired).toEqual([1, 1])
  })

  test('onSelect fires only when the selection actually changes', () => {
    let calls = 0
    const w = mod.iconGrid3d({
      items: ITEMS,
      mode: 'radio',
      selected: 1,
      onSelect: () => calls++,
    })
    click(w, 1) // same cell — no change
    expect(calls).toBe(0)
    click(w, 2)
    expect(calls).toBe(1)
  })
})

describe('`change` — impose your own rule', () => {
  test('returning `previous` is a veto', () => {
    // One way to say no, rather than a separate cancel flag.
    const w = mod.iconGrid3d({
      items: ITEMS,
      mode: 'radio',
      selected: 0,
      change: ({ previous }) => previous,
    })
    click(w, 2)
    expect(w.selection).toEqual([0])
  })

  test('a mode that refuses to turn itself off', () => {
    const w = mod.iconGrid3d({
      items: ITEMS,
      mode: 'checkbox',
      selected: [1],
      change: ({ selection, previous }) =>
        selection.length === 0 ? previous : selection,
    })
    click(w, 1) // would empty it
    expect(w.selection).toEqual([1])
    click(w, 2)
    expect(w.selection).toEqual([1, 2])
  })

  test('it sees what WOULD happen, not what did', () => {
    let seen: any = null
    const w = mod.iconGrid3d({
      items: ITEMS,
      mode: 'radio',
      selected: 0,
      change: (c) => {
        seen = c
        return c.selection
      },
    })
    click(w, 3)
    expect(seen.index).toBe(3)
    expect(seen.selection).toEqual([3])
    expect(seen.previous).toEqual([0])
  })
})

describe('presses behave like buttons', () => {
  test('a release that lands off the pressed cell does NOT fire', () => {
    // So a mis-aimed press can be aborted by sliding off, rather than being
    // committed on release — which matters most where aiming is expensive.
    const fired: number[] = []
    const w = mod.iconGrid3d({ items: ITEMS, onActivate: (i) => fired.push(i) })
    w.layout(320)
    w.handle!('down', 4, 4) // cell 0
    w.handle!('up', 300, 4) // cell 3
    expect(fired).toEqual([])
  })

  test('a disabled cell cannot be activated but still holds its place', () => {
    const items = [ITEMS[0], { ...ITEMS[1], disabled: true }, ITEMS[2]]
    const fired: number[] = []
    const w = mod.iconGrid3d({
      items,
      mode: 'checkbox',
      onActivate: (i) => fired.push(i),
    })
    click(w, 1, items.length)
    expect(fired).toEqual([])
    expect(w.selection).toEqual([])
    // …and the grid still lays out three cells, so nothing reflows around it.
    expect(w.layout(320)).toBeGreaterThan(0)
    expect(w.hitTest!(4, 4)).toBe(true)
  })
})

describe('sizing', () => {
  test('captions force a narrower default column count', () => {
    const captioned = mod.iconGrid3d({ items: ITEMS })
    const bare = mod.iconGrid3d({
      items: ITEMS.map((i) => ({ icon: i.icon })),
    })
    // Same items, no captions: the row is shorter because more fit across.
    expect(bare.layout(320)).toBeLessThan(captioned.layout(320))
  })

  test('more items than columns wrap to more rows', () => {
    const one = mod.iconGrid3d({ items: ITEMS, columns: 4 })
    const two = mod.iconGrid3d({ items: ITEMS, columns: 2 })
    expect(two.layout(320)).toBeGreaterThan(one.layout(320))
  })

  test('an explicit cellSize wins over the sniffed default', () => {
    const small = mod.iconGrid3d({ items: ITEMS, cellSize: 24 })
    const big = mod.iconGrid3d({ items: ITEMS, cellSize: 64 })
    expect(big.layout(320)).toBeGreaterThan(small.layout(320))
  })
})

describe('D-pad traversal escapes rather than trapping', () => {
  const grid = () => {
    const w = mod.iconGrid3d({ items: ITEMS, columns: 2 })
    w.layout(320)
    return w
  }

  test('left/right walks the row and stops at its ends', () => {
    const w = grid()
    w.focusClear!()
    expect(w.focusMove!(1, 0)).toBe(true) // 0 -> 1
    expect(w.focusMove!(1, 0)).toBe(false) // off the right edge, host takes over
  })

  test('up/down changes row, and escapes past the last one', () => {
    const w = grid()
    w.focusClear!()
    expect(w.focusMove!(0, 1)).toBe(true) // row 0 -> row 1
    expect(w.focusMove!(0, 1)).toBe(false) // no row 2
    expect(w.focusMove!(0, -1)).toBe(true) // back up
    expect(w.focusMove!(0, -1)).toBe(false) // above row 0 — escape
  })

  test('focusActivate presses the focused cell', () => {
    const fired: number[] = []
    const w = mod.iconGrid3d({
      items: ITEMS,
      columns: 2,
      onActivate: (i) => fired.push(i),
    })
    w.layout(320)
    w.focusClear!()
    w.focusMove!(1, 0)
    w.focusActivate!()
    expect(fired).toEqual([1])
  })
})
