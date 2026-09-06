import { describe, test, expect, beforeAll } from 'bun:test'
import type { PickerOption } from './picker.js'

/*
DYNAMIC IMPORT, and it has to be. A static import of `picker` pulls in `table`
→ `widgets3d` → tosijs, which touches `HTMLElement` at module scope — before
`beforeAll` has installed happy-dom. The failure names tosijs's bundled source
rather than this file, so it is worth the comment.
*/

let P: typeof import('./picker.js')

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
  g.document ??= win.document
  P = await import('./picker.js')
})

const opt = (value: string, label?: string, group?: string): PickerOption => ({
  value,
  label,
  group,
})

describe('matchesQuery', () => {
  const matchesQuery = (o: PickerOption, q: string) => P.matchesQuery(o, q)
  const model = opt('commercial_road-bend-a', 'road-bend-a', 'commercial')

  test('an empty query matches everything', () => {
    expect(matchesQuery(model, '')).toBe(true)
    expect(matchesQuery(model, '   ')).toBe(true)
  })

  test('matches on the group, the label, or the value', () => {
    expect(matchesQuery(model, 'commercial')).toBe(true)
    expect(matchesQuery(model, 'bend')).toBe(true)
    expect(matchesQuery(model, 'road-bend-a')).toBe(true)
  })

  test('is AND across terms, in ANY order', () => {
    /*
    The whole reason it is not one term over a concatenated string: an author
    who thinks "the bend, in commercial" types it in that order, and a
    substring match on the joined name would find nothing. Word order is the
    thing nobody can guess.
    */
    expect(matchesQuery(model, 'commercial bend')).toBe(true)
    expect(matchesQuery(model, 'bend commercial')).toBe(true)
    expect(matchesQuery(model, 'commercial tower')).toBe(false)
  })

  test('ignores case, which is how names are actually typed', () => {
    expect(matchesQuery(model, 'COMMERCIAL Bend')).toBe(true)
  })

  test('collapses runs of whitespace rather than matching on empty terms', () => {
    // A trailing space is what you have half the time you are still typing;
    // treating it as a term that matches nothing would blank the list.
    expect(matchesQuery(model, 'bend ')).toBe(true)
    expect(matchesQuery(model, 'bend   commercial')).toBe(true)
  })

  test('an option with no group or label still matches on its value', () => {
    expect(matchesQuery(opt('lonely'), 'lone')).toBe(true)
    expect(matchesQuery(opt('lonely'), 'nope')).toBe(false)
  })
})

describe('groupsOf', () => {
  const groupsOf = (o: PickerOption[]) => P.groupsOf(o)
  test("is first-seen order — the content's order, not the alphabet's", () => {
    /*
    A kit lists its families in a deliberate order; sorting them alphabetically
    would scatter a library the author arranged.
    */
    const groups = groupsOf([
      opt('z1', undefined, 'roads'),
      opt('a1', undefined, 'commercial'),
      opt('z2', undefined, 'roads'),
    ])
    expect(groups).toEqual(['roads', 'commercial'])
  })

  test('skips options with no group', () => {
    expect(groupsOf([opt('a'), opt('b', undefined, 'kit')])).toEqual(['kit'])
  })

  test('is empty when nothing is grouped', () => {
    expect(groupsOf([opt('a'), opt('b')])).toEqual([])
  })
})

describe('picker3d', () => {
  const many = Array.from({ length: 40 }, (_, i) =>
    opt(`kit${i % 4}_thing-${i}`, `thing-${i}`, `kit${i % 4}`)
  )

  test('shows the label of the current value, not the raw value', () => {
    const p = P.picker3d({ value: 'kit0_thing-0', options: many })
    p.layout!(240)
    const texts = [...p.el.querySelectorAll('text')].map((t) => t.textContent)
    expect(texts).toContain('thing-0')
  })

  test('falls back to the raw value when nothing matches it', () => {
    // A document can hold a value the current library no longer offers, and
    // showing the placeholder there would claim nothing is chosen.
    const p = P.picker3d({ value: 'gone', options: many })
    p.layout!(240)
    const texts = [...p.el.querySelectorAll('text')].map((t) => t.textContent)
    expect(texts).toContain('gone')
  })

  test('shows the placeholder when nothing is chosen', () => {
    const p = P.picker3d({ options: many, placeholder: 'pick one' })
    p.layout!(240)
    const texts = [...p.el.querySelectorAll('text')].map((t) => t.textContent)
    expect(texts).toContain('pick one')
  })

  test('setValue and setOptions both repaint', () => {
    const p = P.picker3d({ options: many })
    p.layout!(240)
    p.setValue('kit1_thing-5')
    let texts = [...p.el.querySelectorAll('text')].map((t) => t.textContent)
    expect(texts).toContain('thing-5')
    p.setOptions([opt('kit1_thing-5', 'renamed', 'kit1')])
    texts = [...p.el.querySelectorAll('text')].map((t) => t.textContent)
    expect(texts).toContain('renamed')
  })

  test('opening needs a host, and does not throw without one', () => {
    // A bare panel gives no host; a control that throws there is worse than one
    // that is merely inert, which is `select3d`'s rule too.
    const p = P.picker3d({ options: many })
    p.layout!(240)
    expect(() => p.open()).not.toThrow()
  })

  test('opens on RELEASE, not on press', () => {
    /*
    A press that turns into a scroll of the panel must not leave a popup open
    behind it — the same reason the manipulator resolves a click on release.
    */
    let opened = 0
    const host = {
      hasLayer: false,
      bounds: { width: 300, height: 400 },
      top: 0,
      showPopup: () => {
        opened++
        return { close: () => {} }
      },
      showLayer: () => {
        opened++
        return { close: () => {} }
      },
      closePopup: () => {},
      relayout: () => {},
    }
    const p = P.picker3d({ options: many })
    p.setHost!(host as never)
    p.layout!(240)
    p.handle!('down', 10, 10)
    expect(opened).toBe(0)
    p.handle!('up', 10, 10)
    expect(opened).toBe(1)
  })

  test('prefers a LAYER when the host has one', () => {
    // A 500-row list is bigger than most panels, and a bounded popup on a short
    // panel is a list squeezed to nothing over the control it belongs to.
    const calls: string[] = []
    const host = {
      hasLayer: true,
      bounds: { width: 300, height: 120 },
      top: 60,
      showPopup: () => {
        calls.push('popup')
        return { close: () => {} }
      },
      showLayer: () => {
        calls.push('layer')
        return { close: () => {} }
      },
      closePopup: () => {},
      relayout: () => {},
    }
    const p = P.picker3d({ options: many })
    p.setHost!(host as never)
    p.layout!(240)
    p.open()
    expect(calls).toEqual(['layer'])
  })

  test('falls back to a bounded popup when refused a layer', () => {
    const calls: string[] = []
    const host = {
      hasLayer: false,
      bounds: { width: 300, height: 400 },
      top: 40,
      showPopup: () => {
        calls.push('popup')
        return { close: () => {} }
      },
      showLayer: () => {
        calls.push('layer')
        return { close: () => {} }
      },
      closePopup: () => {},
      relayout: () => {},
    }
    const p = P.picker3d({ options: many })
    p.setHost!(host as never)
    p.layout!(240)
    p.open()
    expect(calls).toEqual(['popup'])
  })
})
