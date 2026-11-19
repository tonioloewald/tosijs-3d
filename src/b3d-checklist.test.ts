import { beforeAll, describe, expect, test } from 'bun:test'
import { Window } from 'happy-dom'

// b3d-panel is a component, so the module needs a DOM to load.
let m: typeof import('./b3d-checklist.js')
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
  m = await import('./b3d-checklist.js')
})

const list = {
  id: 'l1',
  title: 'Menus',
  sections: [
    { title: 'Phone', items: [{ id: 'tap', text: 'opens' }, 'wraps'] },
    { items: ['scrolls'] },
  ],
}

describe('b3d-checklist', () => {
  test('every item has an id, numbered as tosijs-ui numbers them', () => {
    const ids = m
      .checklistSections(list)
      .flatMap((s) => s.items.map((i) => i.id))
    expect(ids).toEqual(['tap', 's1-2', 's2-1'])
    expect(
      m.checklistSections({ id: 'x', title: 't', items: ['a'] })[0].items[0].id
    ).toBe('s1-1')
    expect(m.checklistSections(null)).toEqual([])
  })

  test('a verdict pressed again is taken back', () => {
    expect(m.nextVerdict(null, 'pass')).toBe('pass')
    expect(m.nextVerdict('pass', 'pass')).toBe(null)
    expect(m.nextVerdict('pass', 'fail')).toBe('fail')
  })

  test('counts passed, failed and still to check', () => {
    expect(
      m.checklistCounts(list, {
        tap: { verdict: 'pass', comment: '' },
        's1-2': { verdict: 'fail', comment: 'clipped' },
        's2-1': { verdict: null, comment: 'later' },
      })
    ).toEqual({ pass: 1, fail: 1, open: 1 })
  })

  test('off the dev server it does nothing', () => {
    const stop = m.watchSceneChecklist({} as HTMLElement)
    expect(typeof stop).toBe('function')
    stop()
  })

  test('the panel shows one item at a time, opening on the first still to check', () => {
    const changes: any[] = []
    let svg = m.checklistPanel(
      { list, answers: { tap: { verdict: 'pass', comment: '' } } },
      (c) => changes.push(c)
    ) as any
    svg.handleReplace = (next: any) => {
      next.handleReplace = svg.handleReplace
      svg = next
    }
    const controls = () => {
      const all: any[] = []
      const walk = (ns: any[]) => {
        for (const n of ns) {
          all.push(n)
          walk(n.children ?? [])
        }
      }
      walk(svg.controls())
      return all
    }
    const named = (name: string) => controls().find((n) => n.name === name)
    // The first item passed already, so it opens on the second.
    expect(named('fails: wraps')).toBeDefined()
    expect(named('passes: opens')).toBeUndefined()
    const fail = named('fails: wraps')
    ;(fail.activate ?? (() => fail.set(true)))()
    expect(changes.at(-1)).toMatchObject({
      itemId: 's1-2',
      verdict: 'fail',
      changed: 'verdict',
    })
    named('next').activate()
    expect(named('comment on: scrolls')).toBeDefined()
    named('previous').activate()
    named('previous').activate()
    expect(named('passes: opens')).toBeDefined()
  })
})
