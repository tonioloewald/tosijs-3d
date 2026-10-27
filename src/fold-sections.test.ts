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

  test('no sections: the rows come back untouched', () => {
    const plain = [w.label3d({ text: 'a' }), w.label3d({ text: 'b' })]
    expect(w.foldSections(plain, { repaint: () => {} })).toEqual(plain)
    expect(w.foldSections(plain, { mode: 'tabs', repaint: () => {} })).toEqual(
      plain
    )
  })
})
