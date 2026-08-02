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
