import { describe, test, expect, beforeAll } from 'bun:test'
import { Window } from 'happy-dom'

/*
FOLDING IS NOT <tosi-b3d>'s ALONE (board #2805, tosijs-3d#99).

A collapsible label3d folded only inside <tosi-b3d>'s own scene panel, so an
editor building its panels with panel3d (ensemble's: a 30-row sky panel) got a
chevron that did nothing. The fold is now the exported foldSections, which
<tosi-b3d> itself uses: these pin what any panel builder gets.
*/

let w: typeof import('./widgets3d.js')

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
  w = await import('./widgets3d.js')
})

const rows = () => [
  w.label3d({ text: 'intro' }),
  w.label3d({ text: 'Sky', collapsible: true }),
  w.label3d({ text: 'sky row' }),
  w.label3d({ text: 'Sea', collapsible: true, icon: 'water' }),
  w.label3d({ text: 'sea row 1' }),
  w.label3d({ text: 'sea row 2' }),
]
const names = (list: any[]) =>
  list.map((r) => r.section?.title ?? r.el.textContent ?? '?')

describe('foldSections', () => {
  test('fold: headers always show; only the FIRST section starts open', () => {
    const shown = w.foldSections(rows(), { repaint: () => {} })
    expect(shown.length).toBe(4) // intro, Sky, sky row, Sea
    expect(names(shown)).toContain('Sea')
    expect(names(shown)).not.toContain('sea row 1')
  })

  test('a header toggle flips its section and asks for a REPAINT', () => {
    let repaints = 0
    const list = rows()
    const opts = { key: 'test-fold', repaint: () => repaints++ }
    const first = w.foldSections(list, opts)
    const sea = first.find((r: any) => r.section?.title === 'Sea') as any
    sea.section.toggle()
    expect(repaints).toBe(1)
    // The caller rebuilds from the same rows: Sea is open now, and Sky,
    // open before it, has closed (one at a time).
    const again = w.foldSections(rows(), opts)
    expect(names(again)).toEqual([
      'intro',
      'Sky',
      'Sea',
      'sea row 1',
      'sea row 2',
    ])
  })

  test('fold is an accordion that can close completely', () => {
    const opts = { key: 'test-accordion', repaint: () => {} }
    const sky = (list: any[]) => list.find((r) => r.section?.title === 'Sky')
    // Sky starts open; closing it leaves every section closed.
    sky(w.foldSections(rows(), opts)).section.toggle()
    expect(names(w.foldSections(rows(), opts))).toEqual(['intro', 'Sky', 'Sea'])
  })

  test('fold: of several sections declared open, the first wins', () => {
    const both = [
      w.label3d({ text: 'Sky', collapsible: true, open: true }),
      w.label3d({ text: 'sky row' }),
      w.label3d({ text: 'Sea', collapsible: true, open: true }),
      w.label3d({ text: 'sea row' }),
    ]
    expect(names(w.foldSections(both, { repaint: () => {} }))).toEqual([
      'Sky',
      'sky row',
      'Sea',
    ])
  })

  test('folds: several sections may be open at once', () => {
    const opts = {
      key: 'test-folds',
      mode: 'folds' as const,
      repaint: () => {},
    }
    const first = w.foldSections(rows(), opts) as any[]
    first.find((r) => r.section?.title === 'Sea').section.toggle()
    expect(w.foldSections(rows(), opts).length).toBe(6)
  })

  test('tabs: rows before the first section, a strip, then ONE section', () => {
    const shown = w.foldSections(rows(), {
      mode: 'tabs',
      repaint: () => {},
    }) as any[]
    // intro, the strip, and Sky's one row
    expect(shown.length).toBe(3)
    expect(shown[1].el.getAttribute('data-w3d')).toBe('tabs')
  })

  test('tabs: a leading inTabs icon bar goes on the strip, at its right end', () => {
    let undone = 0
    const bar = w.iconBar3d({
      inTabs: true,
      items: [
        { spacer: true },
        { icon: 'rotateCcw', title: 'undo', handleClick: () => undone++ },
      ],
    })
    const shown = w.foldSections([bar, ...rows()], {
      mode: 'tabs',
      repaint: () => {},
    }) as any[]
    // no row of its own: intro, the strip, Sky's row
    expect(shown.length).toBe(3)
    const strip = shown[1]
    expect(strip.el.contains(bar.el)).toBe(true)
    strip.layout(300)
    // a press at the strip's right end is the bar's
    strip.handle('down', 300 - 10, 15)
    strip.handle('up', 300 - 10, 15)
    expect(undone).toBe(1)
  })

  test('an icon bar spacer puts what follows at the right end', () => {
    const bar = w.iconBar3d({
      items: [{ icon: 'rotateCw' }, { spacer: true }, { icon: 'rotateCcw' }],
    }) as any
    bar.layout(300)
    const cells = [...bar.el.querySelectorAll('[data-w3d-icon]')]
    expect(cells[0].getAttribute('transform')).toMatch(/^translate\(0 /)
    expect(cells[1].getAttribute('transform')).toMatch(/^translate\(268 /)
  })

  test('no sections: the rows come back untouched', () => {
    const plain = [w.label3d({ text: 'a' }), w.label3d({ text: 'b' })]
    expect(w.foldSections(plain, { repaint: () => {} })).toEqual(plain)
    expect(w.foldSections(plain, { mode: 'tabs', repaint: () => {} })).toEqual(
      plain
    )
  })
})

describe('a panel folds its own sections', () => {
  /*
  A panel3d no host folded (a tool's own system panel): its headers still
  work. A tap rebuilds the panel from the same rows and hands the new one to
  whatever shows it.
  */
  const text = (svg: Element) => svg.textContent ?? ''
  test('closed sections are left out, and a tap hands over the rebuilt panel', () => {
    const list = [
      w.label3d({ text: 'Alpha', collapsible: true }),
      w.label3d({ text: 'alpha row' }),
      w.label3d({ text: 'Beta', collapsible: true }),
      w.label3d({ text: 'beta row' }),
    ]
    const panel = w.panel3d({ width: 300 }, ...list)
    expect(text(panel)).toContain('alpha row')
    expect(text(panel)).not.toContain('beta row')
    let next: any = null
    panel.handleReplace = (n) => (next = n)
    ;(list[2] as any).section.toggle()
    expect(next).not.toBeNull()
    expect(next).not.toBe(panel)
    expect(text(next)).toContain('beta row')
    expect(text(next)).not.toContain('alpha row')
  })
  test('a panel in the page replaces itself there when no host takes it', () => {
    const list = [
      w.label3d({ text: 'Gamma', collapsible: true }),
      w.label3d({ text: 'gamma row' }),
      w.label3d({ text: 'Delta', collapsible: true }),
      w.label3d({ text: 'delta row' }),
    ]
    const host = document.createElement('div')
    const panel = w.panel3d({ width: 300 }, ...list)
    host.appendChild(panel)
    ;(list[2] as any).section.toggle()
    expect(host.firstChild).not.toBe(panel)
    expect(text(host.firstChild as Element)).toContain('delta row')
  })
})

describe('foldSections: sub-sections', () => {
  const nested = () => [
    w.label3d({ text: 'Body', collapsible: true }),
    w.label3d({ text: 'source row' }),
    w.label3d({ text: 'shape', collapsible: true, level: 2 }),
    w.label3d({ text: 'gender row' }),
    w.label3d({ text: 'ancestry', collapsible: true, level: 2 }),
    w.label3d({ text: 'african row' }),
    w.label3d({ text: 'Hair', collapsible: true }),
    w.label3d({ text: 'hair row' }),
  ]

  test('a tab folds its own sub-sections: the first open, the rest closed', () => {
    const shown = w.foldSections(nested(), {
      key: 'sub-tabs',
      mode: 'tabs',
      repaint: () => {},
    })
    const n = names(shown).slice(1) // after the tab strip
    expect(n).toEqual(['source row', 'shape', 'gender row', 'ancestry'])
  })

  test('opening one sub-section closes its sibling, and the tab stays put', () => {
    const opts = { key: 'sub-tabs-2', mode: 'tabs' as const, repaint: () => {} }
    const first = w.foldSections(nested(), opts)
    const ancestry = first.find(
      (r: any) => r.section?.title === 'ancestry'
    ) as any
    ancestry.section.toggle()
    const again = names(w.foldSections(nested(), opts)).slice(1)
    expect(again).toEqual(['source row', 'shape', 'ancestry', 'african row'])
  })

  test('in fold mode a sub-section folds inside its open parent', () => {
    const shown = names(
      w.foldSections(nested(), { key: 'sub-fold', repaint: () => {} })
    )
    expect(shown).toEqual([
      'Body',
      'source row',
      'shape',
      'gender row',
      'ancestry',
      'Hair',
    ])
  })

  test('a closed parent hides its sub-sections, headers and all', () => {
    const opts = { key: 'sub-fold-2', repaint: () => {} }
    const first = w.foldSections(nested(), opts)
    ;(
      first.find((r: any) => r.section?.title === 'Hair') as any
    ).section.toggle()
    expect(names(w.foldSections(nested(), opts))).toEqual([
      'Body',
      'Hair',
      'hair row',
    ])
  })
})

describe('sub-sections in the control tree', () => {
  test('a sub-section is a level under its section', async () => {
    const { controlTree } = await import('./widget-semantics.js')
    const tree = controlTree([
      w.label3d({ text: 'Body', collapsible: true }),
      w.label3d({ text: 'shape', collapsible: true, level: 2 }),
      w.slider3d({ label: 'gender', value: 0.5, min: 0, max: 1 }),
      w.label3d({ text: 'Hair', collapsible: true }),
    ])
    expect(tree.map((n) => n.name)).toEqual(['Body', 'Hair'])
    const shape = tree[0].children![0]
    expect(shape.path).toBe('Body/shape')
    expect(shape.children![0].path).toBe('Body/shape/gender')
  })
})

describe('sub-sections with no section above them (a tab)', () => {
  test("are siblings, not each other's children", async () => {
    const { controlTree } = await import('./widget-semantics.js')
    const tree = controlTree([
      w.label3d({ text: 'shape', collapsible: true, level: 2 }),
      w.label3d({ text: 'figure', collapsible: true, level: 2 }),
      w.label3d({ text: 'ancestry', collapsible: true, level: 2 }),
    ])
    expect(tree.map((n) => n.path)).toEqual(['shape', 'figure', 'ancestry'])
  })
})
