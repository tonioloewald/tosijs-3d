import { describe, test, expect, beforeAll } from 'bun:test'

let T: typeof import('./table')

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
  T = await import('./table')
})

const ROW_H = 28
const HEAD_H = 26
const BODY_H = 140
const W = 300

const makeRows = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    id: 'r' + i,
    name: 'row ' + i,
    qty: i,
  }))

const mk = (opts: any = {}) => {
  const picked: string[][] = []
  const activated: any[] = []
  const t = T.table({
    rows: makeRows(opts.count ?? 200),
    columns: [
      { key: 'name', label: 'Name', flex: 1 },
      { key: 'qty', label: 'Qty', width: 50, align: 'right' },
    ],
    height: BODY_H,
    rowHeight: ROW_H,
    headerHeight: HEAD_H,
    onSelect: (ids) => picked.push(ids),
    onActivate: (r) => activated.push(r),
    ...opts,
  })
  t.layout(W)
  return { t, picked, activated }
}

/** Widget-local y for the centre of the Nth VISIBLE body row. */
const rowY = (nth: number) => HEAD_H + 2 + nth * ROW_H + ROW_H / 2

const builtRows = (t: any) =>
  t.el.querySelectorAll('[data-tbl="rows"] > g').length

describe('table — virtualization', () => {
  test('builds only what fits, not the whole table', () => {
    const { t } = mk({ count: 500 })
    const n = builtRows(t)
    expect(n).toBeGreaterThan(0)
    expect(n).toBeLessThan(20) // ~5 visible + overscan, not 500
  })

  test('row count built is independent of how many rows exist', () => {
    const small = mk({ count: 30 })
    const huge = mk({ count: 100000 })
    small.t.scrollBy(200)
    huge.t.scrollBy(200)
    expect(builtRows(huge.t)).toBe(builtRows(small.t))
  })

  test('a short table builds every row and cannot scroll', () => {
    const { t } = mk({ count: 3 })
    expect(builtRows(t)).toBe(3)
    t.scrollBy(500)
    expect(builtRows(t)).toBe(3)
  })
})

describe('table — layout', () => {
  test('reports header + body height', () => {
    const { t } = mk()
    expect(t.layout(W)).toBe(HEAD_H + 2 + BODY_H)
  })

  test('the clipPath is NOT transformed — else the top row is silently clipped', () => {
    // Regression: the body layer is translated below the header, and the clip was
    // translated to match. A clip-path resolves in the user space of the element that
    // references it, which already includes that element's transform — so the clip
    // ended up offset twice and ate the first row. It rendered as a blank band under
    // the header with a row missing; counting built rows could not see it.
    const { t } = mk()
    const clip = t.el.querySelector('clipPath') as SVGElement
    expect(clip).not.toBeNull()
    expect(clip.getAttribute('transform')).toBeNull()
  })

  test('with no scroll the first row sits flush under the header', () => {
    const { t } = mk()
    const inner = t.el.querySelector('[data-tbl="rows"]') as SVGElement
    expect(inner.getAttribute('transform')).toBe('translate(0 0)')
    const firstRect = inner.querySelector('g rect') as SVGElement
    expect(firstRect.getAttribute('y')).toBe('0')
  })

  test('renders a header cell per column', () => {
    const { t } = mk()
    const labels = Array.from(
      t.el.querySelectorAll('[data-tbl="head"] text')
    ).map((n: any) => n.textContent)
    expect(labels).toEqual(['Name', 'Qty'])
  })
})

describe('table — selection', () => {
  test('clicking a row selects it and reports the ids', () => {
    const { t, picked } = mk({ selection: 'single' })
    t.handle!('up', 40, rowY(0))
    expect(t.selected).toEqual(['r0'])
    expect(picked.at(-1)).toEqual(['r0'])
  })

  test('single-select replaces', () => {
    const { t } = mk({ selection: 'single' })
    t.handle!('up', 40, rowY(0))
    t.handle!('up', 40, rowY(1))
    expect(t.selected).toEqual(['r1'])
  })

  test('multi-select accumulates and toggles', () => {
    const { t } = mk({ selection: 'multi' })
    t.handle!('up', 40, rowY(0))
    t.handle!('up', 40, rowY(1))
    expect(t.selected.sort()).toEqual(['r0', 'r1'])
    t.handle!('up', 40, rowY(0))
    expect(t.selected).toEqual(['r1'])
  })

  test('the selection glyph reflects state (icon, not intensity)', () => {
    const { t } = mk({ selection: 'multi' })
    const before = t.el.querySelectorAll(
      '[data-tbl="rows"] g[data-icon]'
    ).length
    t.handle!('up', 40, rowY(0))
    // A glyph is present either way — unselected is `square`, not an empty slot, so
    // the row's layout doesn't shift when it becomes selected.
    const after = t.el.querySelectorAll('[data-tbl="rows"] g[data-icon]').length
    expect(after).toBe(before)
  })

  test('no selection mode → clicking activates instead', () => {
    const { t, activated, picked } = mk({})
    t.handle!('up', 40, rowY(0))
    expect(picked.length).toBe(0)
    expect(activated.at(-1)?.id).toBe('r0')
  })

  test('re-clicking a selected row activates it (select-then-open, no double-click)', () => {
    const { t, activated } = mk({ selection: 'single' })
    t.handle!('up', 40, rowY(0))
    expect(activated.length).toBe(0)
    t.handle!('up', 40, rowY(0))
    expect(activated.at(-1)?.id).toBe('r0')
  })

  test('allowDeselect clears instead of activating', () => {
    const { t } = mk({ selection: 'single', allowDeselect: true })
    t.handle!('up', 40, rowY(0))
    t.handle!('up', 40, rowY(0))
    expect(t.selected).toEqual([])
  })
})

describe('table — drag to scroll', () => {
  // A wheel is useless on touch and impossible with a VR ray, so dragging the body IS
  // the scroll gesture — and it must not fight selection.
  const drag = (t: any, fromNth: number, dy: number) => {
    const y = rowY(fromNth)
    t.handle('down', 40, y)
    t.handle('move', 40, y - dy) // dragging UP scrolls DOWN
    t.handle('up', 40, y - dy)
  }

  test('dragging the body scrolls it', () => {
    const { t } = mk({ selection: 'single' })
    const first = () =>
      (t.el.querySelector('[data-tbl="rows"] g') as any)?.getAttribute(
        'data-row'
      )
    expect(first()).toBe('r0')
    drag(t, 1, ROW_H * 3)
    expect(first()).not.toBe('r0')
  })

  test('a drag does NOT select the row it started on', () => {
    const { t, picked } = mk({ selection: 'single' })
    drag(t, 0, ROW_H * 3)
    expect(t.selected).toEqual([])
    expect(picked.length).toBe(0)
  })

  test('a slightly shaky tap still selects (movement under the slop)', () => {
    const { t } = mk({ selection: 'single' })
    const y = rowY(0)
    t.handle!('down', 40, y)
    t.handle!('move', 40, y + 2) // under the 4px threshold
    t.handle!('up', 40, y + 2)
    expect(t.selected).toEqual(['r0'])
  })

  test('dragging up past the top clamps rather than overscrolling', () => {
    const { t } = mk({ selection: 'single' })
    drag(t, 1, -ROW_H * 10) // drag DOWN while already at the top
    const first = (
      t.el.querySelector('[data-tbl="rows"] g') as any
    )?.getAttribute('data-row')
    expect(first).toBe('r0')
  })
})

describe('table — D-pad / keyboard traversal', () => {
  const ring = (t: any) =>
    t.el.querySelectorAll('[data-tbl="rows"] [data-focus-ring]').length

  test('the first move enters the list and shows a ring', () => {
    const { t } = mk()
    expect(t.focusIndex).toBe(-1)
    expect(ring(t)).toBe(0)
    expect(t.focusMove(0, 1)).toBe(true)
    expect(t.focusIndex).toBe(0)
    expect(ring(t)).toBe(1)
  })

  test('entering after a scroll lands where you are LOOKING, not at row 0', () => {
    const { t } = mk()
    t.scrollBy(ROW_H * 10)
    t.focusMove(0, 1)
    expect(t.focusIndex).toBe(10)
  })

  test('moves row by row', () => {
    const { t } = mk()
    t.focusMove(0, 1)
    t.focusMove(0, 1)
    t.focusMove(0, 1)
    expect(t.focusIndex).toBe(2)
    t.focusMove(0, -1)
    expect(t.focusIndex).toBe(1)
  })

  test('returns FALSE at the ends so focus can escape (no D-pad dead end)', () => {
    const { t } = mk({ count: 3 })
    t.focusMove(0, 1) // enter at 0
    expect(t.focusMove(0, -1)).toBe(false) // above the top → not consumed
    expect(t.focusIndex).toBe(0) // and does not wrap or clamp-and-swallow
    t.focusMove(0, 1)
    t.focusMove(0, 1) // now at 2, the last row
    expect(t.focusIndex).toBe(2)
    expect(t.focusMove(0, 1)).toBe(false) // below the end → not consumed
  })

  test('an empty table never claims the move', () => {
    const { t } = mk({ count: 0 })
    expect(t.focusMove(0, 1)).toBe(false)
    expect(t.focusIndex).toBe(-1)
  })

  test('focus scrolls itself into view rather than going off-screen', () => {
    const { t } = mk()
    t.focusMove(0, 1) // row 0
    const visible = () =>
      [...t.el.querySelectorAll('[data-tbl="rows"] > g')].map((g: any) =>
        g.getAttribute('data-row')
      )
    // walk past the bottom of the viewport
    for (let i = 0; i < 12; i++) t.focusMove(0, 1)
    expect(t.focusIndex).toBe(12)
    expect(visible()).toContain('r12') // the focused row is actually built
  })

  test('activate commits the focused row — same effect as tapping it', () => {
    const { t, picked } = mk({ selection: 'multi' })
    t.focusMove(0, 1)
    t.focusMove(0, 1) // row 1
    expect(t.focusActivate()).toBe(true)
    expect(t.selected).toEqual(['r1'])
    expect(picked.at(-1)).toEqual(['r1'])
  })

  test('activate with no focus does nothing', () => {
    const { t } = mk({ selection: 'single' })
    expect(t.focusActivate()).toBe(false)
    expect(t.selected).toEqual([])
  })

  test('a pointer tap moves focus there, so mouse → D-pad resumes in place', () => {
    const { t } = mk({ selection: 'single' })
    t.handle!('up', 40, rowY(2))
    expect(t.focusIndex).toBe(2)
    t.focusMove(0, 1)
    expect(t.focusIndex).toBe(3)
  })

  test('focusClear removes the ring', () => {
    const { t } = mk()
    t.focusMove(0, 1)
    expect(ring(t)).toBe(1)
    t.focusClear()
    expect(t.focusIndex).toBe(-1)
    expect(ring(t)).toBe(0)
  })

  test('focus, hover and selection coexist — three channels, all readable', () => {
    const { t } = mk({ selection: 'multi' })
    t.focusMove(0, 1) // focus row 0
    t.focusActivate() // select row 0
    t.handle!('move', 40, rowY(0)) // hover row 0 as well
    const row = t.el.querySelector('[data-tbl="rows"] > g') as any
    expect(t.focusIndex).toBe(0)
    expect(t.selected).toEqual(['r0'])
    // ring present (focus), row fill non-transparent (hover), glyph accent (selected)
    expect(row.querySelector('[data-focus-ring]')).not.toBeNull()
    expect(row.querySelector('rect').getAttribute('fill')).not.toBe(
      'transparent'
    )
  })
})

describe('table — hit testing', () => {
  test('a click in the HEADER selects nothing', () => {
    const { t, picked } = mk({ selection: 'single' })
    t.handle!('up', 40, HEAD_H / 2)
    expect(t.selected).toEqual([])
    expect(picked.length).toBe(0)
  })

  test('a click below the last row selects nothing', () => {
    const { t } = mk({ selection: 'single', count: 2 })
    t.handle!('up', 40, rowY(5))
    expect(t.selected).toEqual([])
  })

  test('selection follows the scroll offset', () => {
    const { t } = mk({ selection: 'single' })
    t.scrollBy(ROW_H * 4) // exactly four rows down
    t.handle!('up', 40, rowY(0))
    expect(t.selected).toEqual(['r4'])
  })
})

describe('table — setRows', () => {
  test('drops selections whose rows are gone, and says so', () => {
    const { t, picked } = mk({ selection: 'multi' })
    t.handle!('up', 40, rowY(0))
    t.handle!('up', 40, rowY(1))
    expect(t.selected.length).toBe(2)
    t.setRows([{ id: 'r1', name: 'row 1', qty: 1 }])
    expect(t.selected).toEqual(['r1'])
    expect(picked.at(-1)).toEqual(['r1'])
  })

  test('shrinking the data clamps the scroll back into range', () => {
    const { t } = mk({ count: 500 })
    t.scrollBy(5000)
    t.setRows(makeRows(3))
    expect(builtRows(t)).toBe(3)
  })
})

describe('table — the inner-focus protocol shape (the rc.1 blocker)', () => {
  // rc.1 shipped focusMove(dy) while every host calls (dx, dy): the protocol's
  // dx landed in the dy parameter, so D-pad DOWN (0, 1) read as dy=0 —
  // consumed without moving, focus hard-trapped — and LEFT/RIGHT moved rows.
  test('vertical moves walk rows; horizontal is NOT consumed (escapes to the host)', () => {
    const { t } = mk({ count: 5 })
    expect(t.focusMove(0, 1)).toBe(true) // enter
    const at = t.focusIndex
    expect(t.focusMove(0, 1)).toBe(true)
    expect(t.focusIndex).toBe(at + 1)
    expect(t.focusMove(1, 0)).toBe(false) // horizontal escapes
    expect(t.focusIndex).toBe(at + 1) // and did not move a row
    expect(t.focusMove(-1, 0)).toBe(false)
  })

  test('hosted in a widgetBox, box.focusMove(0, ±1) traverses the rows', async () => {
    // The shipped configuration: the demo hosts the table in a widgetBox. This
    // is the exact path that was dead in rc.1.
    const { widgetBox } = await import('./widget-box')
    const { t } = mk({ count: 5 })
    const b = widgetBox({ width: W, padding: 0 }, [t as any])
    b.focusMove(0, 1) // box focus → the table child (entry delegates inward)
    const first = t.focusIndex
    expect(first).toBeGreaterThanOrEqual(0)
    b.focusMove(0, 1) // delegated: next row
    expect(t.focusIndex).toBe(first + 1)
    b.focusMove(0, -1)
    expect(t.focusIndex).toBe(first)
  })
})

describe('table — scroll within the window is transform-only (the promised behavior)', () => {
  test('a small scroll keeps the built rows; only the transform moves', () => {
    const { t } = mk({ count: 200 })
    const inner = () => t.el.querySelector('[data-tbl="rows"]') as SVGGElement
    t.scrollBy(1000) // settle mid-list
    const before = Array.from(inner().children)
    const tf = inner().getAttribute('transform')
    t.scrollBy(3) // window unchanged (< ROW_H, same start/end)
    expect(Array.from(inner().children)).toEqual(before) // SAME nodes
    expect(inner().getAttribute('transform')).not.toBe(tf)
    t.scrollBy(ROW_H * 3) // window shifted → rebuild
    expect(Array.from(inner().children)).not.toEqual(before)
  })

  test('hover restyles the two affected backgrounds without a rebuild', () => {
    const { t } = mk({ count: 50 })
    const inner = () => t.el.querySelector('[data-tbl="rows"]') as SVGGElement
    t.handle!('move', 20, rowY(1))
    const nodes = Array.from(inner().children)
    const bg1 = nodes[1].querySelector('rect')!
    expect(bg1.getAttribute('fill')).not.toBe('transparent')
    t.handle!('move', 20, rowY(3))
    expect(Array.from(inner().children)).toEqual(nodes) // no rebuild
    expect(bg1.getAttribute('fill')).toBe('transparent')
    const bg3 = nodes[3].querySelector('rect')!
    expect(bg3.getAttribute('fill')).not.toBe('transparent')
  })
})

/*
AN ICON COLUMN — a piece list says what KIND of thing a row is before it says
its name, and `sun`, `sea`, `skybox` and `lantern` are identical rows of text
without one (tosijs-3d#64).
*/
describe('kind: icon columns', () => {
  const rows = [
    { id: 'a', kind: 'star', name: 'sun' },
    { id: 'b', kind: 'cloud', name: 'sky' },
    { id: 'c', kind: 'definitely-not-an-icon', name: 'mystery' },
  ]
  const build = () => {
    const t = T.table({
      rows,
      columns: [
        { key: 'kind', width: 28, kind: 'icon' as const },
        { key: 'name', flex: 1 },
      ],
      height: 120,
    })
    t.layout(240)
    return t
  }

  test('an icon cell draws a glyph, not the name as text', () => {
    const t = build()
    const texts = [...t.el.querySelectorAll('text')].map((n) => n.textContent)
    expect(texts).toContain('sun')
    expect(texts).not.toContain('star') // the icon NAME never appears as text
  })

  test('a text column is untouched', () => {
    expect(
      [...build().el.querySelectorAll('text')].map((n) => n.textContent)
    ).toContain('mystery')
  })

  test('an unresolvable name draws a fallback rather than throwing', () => {
    // A table is the wrong place to discover a typo, and losing half a list is
    // worse than one wrong glyph.
    expect(() => build()).not.toThrow()
  })

  test('every row still renders when one icon is bad', () => {
    expect(build().el.querySelectorAll('[data-row]').length).toBe(3)
  })
})

/*
FILTERED TABLES AND BUTTON COLUMNS.

A scene-graph list needs to be searchable, and each row needs an action of its
own — Tonio: "filtered tables and possibly button columns on tables… and button
columns in tables should be able to pop menus."
*/
describe('filtering', () => {
  const rows = [
    { id: 'a', name: 'sun', kind: 'light' },
    { id: 'b', name: 'sea', kind: 'water' },
    { id: 'c', name: 'lantern', kind: 'light' },
  ]
  const build = (over: any = {}) => {
    const t = T.table({
      rows,
      columns: [{ key: 'name', flex: 1 }],
      height: 200,
      ...over,
    })
    t.layout(240)
    return t
  }
  const names = (t: any) =>
    [...t.el.querySelectorAll('text')].map((n: any) => n.textContent)

  test('a predicate shows only matching rows', () => {
    const t = build({ filter: (r: any) => r.kind === 'light' })
    expect(names(t)).toContain('sun')
    expect(names(t)).not.toContain('sea')
  })

  test('setFilter narrows and clearing restores', () => {
    const t = build()
    t.setFilter((r: any) => r.name.startsWith('s'))
    expect(t.counts).toEqual({ visible: 2, total: 3 })
    t.setFilter(null)
    expect(t.counts).toEqual({ visible: 3, total: 3 })
    expect(names(t)).toContain('lantern')
  })

  test('FILTERING DOES NOT DROP A SELECTION', () => {
    // Hiding is a view state. Losing a selection to it would make typing in a
    // search box quietly destructive.
    const t = build({ selection: 'multi' })
    t.layout(240)
    t.handle!('down', 40, 40)
    t.handle!('up', 40, 40)
    expect(t.selected).toEqual(['a'])
    t.setFilter((r: any) => r.id === 'c')
    expect(t.selected).toEqual(['a'])
    t.setFilter(null)
    expect(t.selected).toEqual(['a'])
  })

  test('setRows checks selections against ALL rows, not the visible ones', () => {
    const t = build({ selection: 'multi' })
    t.handle!('down', 40, 40)
    t.handle!('up', 40, 40)
    t.setFilter((r: any) => r.id === 'b')
    // 'a' is hidden but still exists, so it stays selected.
    t.setRows(rows)
    expect(t.selected).toEqual(['a'])
    // …and genuinely removing it does drop it.
    t.setRows(rows.filter((r) => r.id !== 'a'))
    expect(t.selected).toEqual([])
  })

  test('a filter that hides everything is empty, not broken', () => {
    const t = build()
    expect(() => t.setFilter(() => false)).not.toThrow()
    expect(t.counts.visible).toBe(0)
  })
})

describe('button columns', () => {
  const rows = [{ id: 'a', name: 'sun', act: 'moreVertical' }]
  const spyHost = () => {
    const opened: any[] = []
    return {
      opened,
      host: {
        showPopup: (c: any, ...items: any[]) => {
          opened.push({ anchor: c.anchor, items })
          return { close: () => {} }
        },
        closePopup: () => {},
        relayout: () => {},
        bounds: () => ({ x: 0, y: 0, width: 240, height: 200 }),
        top: () => null,
        hasLayer: () => false,
        showLayer: () => ({ close: () => {} }),
      } as any,
    }
  }
  const build = (col: any, selection?: any) => {
    const t = T.table({
      rows,
      columns: [{ key: 'name', flex: 1 }, { key: 'act', width: 30, ...col }],
      height: 200,
      selection,
    })
    t.layout(240)
    return t
  }

  test('pressing a button cell opens its menu', () => {
    const { host, opened } = spyHost()
    const t = build({
      kind: 'button',
      menu: () => [{ label: 'Delete' }, { label: 'Duplicate' }],
    })
    t.setHost!(host)
    t.handle!('down', 225, 40)
    t.handle!('up', 225, 40)
    expect(opened.length).toBe(1)
  })

  test('and does NOT also select the row', () => {
    // Two things from one tap, and the selection is the one nobody asked for.
    const { host } = spyHost()
    const t = build({ kind: 'button', menu: () => [{ label: 'x' }] }, 'multi')
    t.setHost!(host)
    t.handle!('down', 225, 40)
    t.handle!('up', 225, 40)
    expect(t.selected).toEqual([])
  })

  test('a press elsewhere in the row still selects', () => {
    const { host } = spyHost()
    const t = build({ kind: 'button', menu: () => [{ label: 'x' }] }, 'multi')
    t.setHost!(host)
    t.handle!('down', 40, 40)
    t.handle!('up', 40, 40)
    expect(t.selected).toEqual(['a'])
  })

  test('without a menu it fires handlePress', () => {
    const fired: string[] = []
    const t = build({
      kind: 'button',
      handlePress: (r: any) => fired.push(r.id),
    })
    t.handle!('down', 225, 40)
    t.handle!('up', 225, 40)
    expect(fired).toEqual(['a'])
  })

  test('an empty menu falls through to handlePress rather than opening nothing', () => {
    const { host } = spyHost()
    const fired: string[] = []
    const t = build({
      kind: 'button',
      menu: () => [],
      handlePress: (r: any) => fired.push(r.id),
    })
    t.setHost!(host)
    t.handle!('down', 225, 40)
    t.handle!('up', 225, 40)
    expect(fired).toEqual(['a'])
  })

  test('with no host it is inert rather than throwing', () => {
    const t = build({ kind: 'button', menu: () => [{ label: 'x' }] })
    expect(() => {
      t.handle!('down', 225, 40)
      t.handle!('up', 225, 40)
    }).not.toThrow()
  })
})
