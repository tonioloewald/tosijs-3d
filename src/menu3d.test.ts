import { describe, test, expect, beforeAll } from 'bun:test'
import { Window } from 'happy-dom'

/*
THE ACTION MENU — the counterpart to `select3d`'s value picker (tosijs-3d#59).

The distinction under test is not cosmetic. A select keeps and displays what you
chose; a menu item HAPPENS and leaves nothing behind. Everything below follows
from that: menus close on pick, disabled items are present but inert, and a menu
cell in a grid never joins the selection.
*/

let widgets: typeof import('./widgets3d')
let grid: typeof import('./icon-grid')

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
  widgets = await import('./widgets3d')
  grid = await import('./icon-grid')
})

/**
 * A minimal `WidgetHost` that records what was opened. Real hosting is panel
 * geometry and pointer routing; what a menu needs from it is only "put these
 * widgets up, and take them down when I say".
 */
function fakeHost() {
  const opened: Array<{ anchor: any; items: any[] }> = []
  let closes = 0
  const host: any = {
    showPopup(config: any, ...items: any[]) {
      opened.push({ anchor: config.anchor, items })
      return { close: () => closes++ }
    },
    closePopup() {
      closes++
    },
    relayout() {},
    bounds: () => ({ x: 0, y: 0, width: 300, height: 300 }),
    top: () => null,
    hasLayer: () => false,
    showLayer: () => ({ close: () => {} }),
  }
  return {
    host,
    opened,
    get closes() {
      return closes
    },
    /** Drive the list widget the menu put up, as a press-and-release on row `i`. */
    pick(i: number, rowHeight = 44) {
      const list = opened[opened.length - 1].items[0]
      list.layout(200)
      const y = i * rowHeight + rowHeight / 2
      list.handle('up', 10, y)
    },
  }
}

describe('a menu fires and closes; it does not keep a value', () => {
  test('picking runs the item handler and closes', () => {
    const h = fakeHost()
    const fired: string[] = []
    widgets.openMenu3d(h.host, { x: 0, y: 0, width: 40, height: 40 }, [
      { label: 'Load', handleSelect: () => fired.push('load') },
      { label: 'Save', handleSelect: () => fired.push('save') },
    ])
    h.pick(1)
    expect(fired).toEqual(['save'])
    expect(h.closes).toBeGreaterThan(0)
  })

  test('the menu-level handler gets the ORIGINAL item, not the stripped copy', () => {
    // openMenu3d removes each item's own handleSelect before handing the list
    // to menu3d, so it can dispatch after closing. The item the consumer sees
    // must still be theirs.
    const h = fakeHost()
    let seen: any = null
    const item = { label: 'Save', icon: 'copy', handleSelect: () => {} }
    widgets.openMenu3d(h.host, { x: 0, y: 0, width: 40, height: 40 }, [item], {
      handleSelect: (a, i) => (seen = { a, i }),
    })
    h.pick(0)
    expect(seen.a).toBe(item)
    expect(seen.i).toBe(0)
  })

  test('an empty menu opens nothing and says so', () => {
    // Returning null lets a caller fall back, rather than inferring failure
    // from a popup handle that closes onto an empty box.
    const h = fakeHost()
    expect(
      widgets.openMenu3d(h.host, { x: 0, y: 0, width: 10, height: 10 }, [])
    ).toBeNull()
    expect(h.opened.length).toBe(0)
  })
})

describe('disabled items are present but inert', () => {
  test('a disabled item does not fire', () => {
    const h = fakeHost()
    const fired: string[] = []
    widgets.openMenu3d(h.host, { x: 0, y: 0, width: 40, height: 40 }, [
      { label: 'Load', handleSelect: () => fired.push('load') },
      {
        label: 'Revert',
        disabled: true,
        handleSelect: () => fired.push('revert'),
      },
    ])
    h.pick(1)
    expect(fired).toEqual([])
  })

  test('…but still occupies its row, so the ones below keep their positions', () => {
    // Hiding an unavailable command reflows the menu, so the same action is at
    // a different place depending on state — muscle memory never forms.
    const h = fakeHost()
    const fired: string[] = []
    widgets.openMenu3d(h.host, { x: 0, y: 0, width: 40, height: 40 }, [
      { label: 'Load', handleSelect: () => fired.push('load') },
      {
        label: 'Revert',
        disabled: true,
        handleSelect: () => fired.push('revert'),
      },
      { label: 'Save', handleSelect: () => fired.push('save') },
    ])
    h.pick(2)
    expect(fired).toEqual(['save'])
  })
})

describe('a button can be a menu button', () => {
  test('pressing it opens the menu instead of firing onClick', () => {
    const h = fakeHost()
    let clicked = 0
    const b = widgets.button3d({
      label: 'File',
      onClick: () => clicked++,
      menu: [{ label: 'Load' }],
    })
    b.setHost!(h.host)
    b.layout!(120)
    b.handle!('up', 10, 10)
    expect(h.opened.length).toBe(1)
    expect(clicked).toBe(0) // never both — that control would have no meaning
  })

  test('without a menu it still just clicks', () => {
    let clicked = 0
    const b = widgets.button3d({ label: 'Go', onClick: () => clicked++ })
    b.layout!(120)
    b.handle!('up', 10, 10)
    expect(clicked).toBe(1)
  })

  test('the menu is anchored to the BUTTON, so it drops from what you pressed', () => {
    const h = fakeHost()
    const b = widgets.button3d({ label: 'File', menu: [{ label: 'Load' }] })
    b.setHost!(h.host)
    b.layout!(140)
    b.handle!('up', 10, 10)
    expect(h.opened[0].anchor.width).toBe(140)
  })
})

describe('an icon-grid cell can open a menu', () => {
  const PALETTE = [
    { icon: 'mousePointer', label: 'select' },
    { icon: 'move', label: 'move' },
    {
      icon: 'copy',
      label: 'load',
      menu: [{ label: 'slot A' }, { label: 'slot B' }],
    },
  ]
  const press = (w: any, i: number, cols = 3) => {
    w.layout(300)
    const cw = 300 / cols
    const x = (i % cols) * cw + 4
    const y = Math.floor(i / cols) * 40 + 4
    w.handle('down', x, y)
    w.handle('up', x, y)
  }

  test('the menu opens, anchored to that cell', () => {
    const h = fakeHost()
    const w = grid.iconGrid3d({ items: PALETTE, mode: 'radio', selected: 0 })
    w.setHost!(h.host)
    press(w, 2)
    expect(h.opened.length).toBe(1)
    // Third of three columns — anchored right of the origin, not at it.
    expect(h.opened[0].anchor.x).toBeGreaterThan(0)
  })

  test('a menu cell NEVER joins the selection, even in radio mode', () => {
    // The palette case: "Load ▾" beside select/move must not steal the lit slot
    // from the active tool, or opening a menu silently changes your tool.
    const h = fakeHost()
    const w = grid.iconGrid3d({ items: PALETTE, mode: 'radio', selected: 0 })
    w.setHost!(h.host)
    press(w, 2)
    expect(w.selection).toEqual([0])
  })

  test('choosing from it reports the action AND which cell it came from', () => {
    const h = fakeHost()
    let seen: any = null
    const w = grid.iconGrid3d({
      items: PALETTE,
      mode: 'radio',
      selected: 0,
      handleMenuSelect: (action, index, cell) =>
        (seen = { action, index, cell }),
    })
    w.setHost!(h.host)
    press(w, 2)
    h.pick(1)
    expect(seen.action.label).toBe('slot B')
    expect(seen.index).toBe(1)
    expect(seen.cell).toBe(2) // one handler can serve every menu in the palette
  })

  test('handleActivate still fires for a menu cell, and receives the host', () => {
    // The press really happened, and the host is the escape hatch for anything
    // the grid does not model.
    const h = fakeHost()
    let got: any = null
    const w = grid.iconGrid3d({
      items: PALETTE,
      handleActivate: (i, item, host) => (got = { i, label: item.label, host }),
    })
    w.setHost!(h.host)
    press(w, 2)
    expect(got.i).toBe(2)
    expect(got.host).toBe(h.host)
  })

  test('with no host the press is inert rather than throwing', () => {
    // A grid built outside a panel still has to survive being pressed.
    const w = grid.iconGrid3d({ items: PALETTE, mode: 'radio', selected: 0 })
    expect(() => press(w, 2)).not.toThrow()
    expect(w.selection).toEqual([0])
  })
})

/*
`disabled` AS A PREDICATE — what makes a menu a reusable object.

Tonio: "disabled should be a callback function not a static value. This allows a
menu to be a reusable object and not have to be built per use."

With a boolean, `{ label: 'Revert', disabled: !dirty }` captures `dirty` at
construction, so the only way to keep it honest is to rebuild the array — which
means the menu cannot be a constant, and every consumer reinvents
rebuild-on-change. With a predicate the same array is correct forever.
*/
describe('disabled is asked, not remembered', () => {
  // Declared ONCE, at "module scope", exactly as a consumer would.
  const doc = { dirty: false }
  const FILE_MENU = [
    { label: 'Save', handleSelect: () => fired.push('save') },
    {
      label: 'Revert',
      disabled: () => !doc.dirty,
      handleSelect: () => fired.push('revert'),
    },
  ]
  let fired: string[] = []

  test('the SAME menu object follows the state it closes over', () => {
    const h = fakeHost()

    fired = []
    doc.dirty = false
    widgets.openMenu3d(h.host, { x: 0, y: 0, width: 40, height: 40 }, FILE_MENU)
    h.pick(1)
    expect(fired).toEqual([]) // clean: Revert is inert

    fired = []
    doc.dirty = true
    widgets.openMenu3d(h.host, { x: 0, y: 0, width: 40, height: 40 }, FILE_MENU)
    h.pick(1)
    expect(fired).toEqual(['revert']) // dirty: same array, now live
  })

  test('it is re-asked WHILE the menu is open, not frozen at layout', () => {
    // A menu is short-lived but not instantaneous, and the state behind it can
    // move underneath. What governs is the reading at the moment of firing.
    const h = fakeHost()
    fired = []
    doc.dirty = true
    widgets.openMenu3d(h.host, { x: 0, y: 0, width: 40, height: 40 }, FILE_MENU)
    doc.dirty = false // becomes unavailable after opening
    h.pick(1)
    expect(fired).toEqual([])
  })

  test('a plain boolean still works — a genuinely constant item stays simple', () => {
    const h = fakeHost()
    const log: string[] = []
    widgets.openMenu3d(h.host, { x: 0, y: 0, width: 40, height: 40 }, [
      { label: 'Nope', disabled: true, handleSelect: () => log.push('nope') },
    ])
    h.pick(0)
    expect(log).toEqual([])
  })
})

describe('an icon-grid palette can be a constant too', () => {
  test('a cell disabled by predicate follows live state', () => {
    const sel = { count: 0 }
    // Built once; never rebuilt.
    const PALETTE = [
      { icon: 'move', label: 'move' },
      { icon: 'trash', label: 'delete', disabled: () => sel.count === 0 },
    ]
    const w = grid.iconGrid3d({ items: PALETTE, mode: 'buttons' })
    const press = (i: number) => {
      w.layout(200)
      const x = (i % 2) * 100 + 4
      w.handle!('down', x, 4)
      w.handle!('up', x, 4)
    }
    const fired: number[] = []
    const w2 = grid.iconGrid3d({
      items: PALETTE,
      mode: 'buttons',
      handleActivate: (i) => fired.push(i),
    })
    const press2 = (i: number) => {
      w2.layout(200)
      const x = (i % 2) * 100 + 4
      w2.handle!('down', x, 4)
      w2.handle!('up', x, 4)
    }

    press2(1)
    expect(fired).toEqual([]) // nothing selected — delete is inert

    sel.count = 1
    press2(1)
    expect(fired).toEqual([1]) // same palette object, now live
    expect(() => press(0)).not.toThrow()
  })
})
