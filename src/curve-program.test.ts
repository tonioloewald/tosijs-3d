import { describe, test, expect, beforeAll } from 'bun:test'
import { Window } from 'happy-dom'

/*
THE PROGRAM EDITOR — one widget, because the invariant needs somewhere to live.

Six sibling fields would let brightness and hue be edited into disagreement
about where the attack ends, which the runtime cannot represent. Ensemble:
"a truth that cannot be executed is worse than a coarser panel."
*/

let mod: typeof import('./curve-program.js')

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
  mod = await import('./curve-program.js')
})

const PROGRAM = {
  brightness: [
    { x: 0, y: 0 },
    { x: 0.35, y: 1 },
    { x: 0.75, y: 1 },
    { x: 1, y: 0 },
  ],
  hue: [
    { x: 0, y: 0.5 },
    { x: 0.75, y: 0.5 },
    { x: 1, y: 0 },
  ],
  hueShiftDeg: 190,
  attackEnd: 0.35,
  sustainEnd: 0.75,
  attack: 1.3,
  period: 3,
  decay: 2.2,
}

/**
 * Real geometry from the rendered markers, rather than guessing the plot inset.
 * The first attempt at this file hard-coded an inset and pressed into the wrong
 * place — which fails as "wrong describe string", not as "missed".
 */
const markerXs = (w: any): number[] => {
  const g = [...w.el.querySelectorAll('[data-curve-markers]')].filter(
    (n: any) => n.children.length > 0
  )[0]
  return [...g.querySelectorAll('path')].map((p: any) =>
    Number(/M([\d.]+)/.exec(p.getAttribute('d'))![1])
  )
}

/**
 * The y of a marker's grab TAB, just above the plot. Markers are grabbed there
 * rather than mid-plot, because a control point sitting on a split otherwise
 * swallows the press — which is exactly why the tab band takes priority.
 */
const TAB_Y = 26

const build = (over: any = {}) => {
  const live: any[] = []
  const commits: Array<{ program: any; describe: string }> = []
  const w = mod.curveProgram3d({
    value: PROGRAM,
    handleChange: (p) => live.push(p),
    handleCommit: (program, describe) => commits.push({ program, describe }),
    ...over,
  })
  w.layout(320)
  return { w, live, commits }
}

describe('which channels it shows', () => {
  test('the ones the value carries, brightness always', () => {
    // Three empty plots invite you to fill them in, which is the opposite of
    // what a default should suggest.
    const w = mod.curveProgram3d({ value: PROGRAM })
    expect(w.el.querySelectorAll('[data-w3d="curve"]').length).toBe(2)
  })

  test('brightness alone for an empty program', () => {
    const w = mod.curveProgram3d({})
    expect(w.el.querySelectorAll('[data-w3d="curve"]').length).toBe(1)
  })

  test('an explicit list wins', () => {
    const w = mod.curveProgram3d({
      value: PROGRAM,
      channels: ['brightness', 'hue', 'saturation', 'range'],
    })
    expect(w.el.querySelectorAll('[data-w3d="curve"]').length).toBe(4)
  })
})

describe('the markers are ONE pair, shared by every plot', () => {
  test('each plot draws the same two', () => {
    const { w } = build()
    const groups = [...w.el.querySelectorAll('[data-curve-markers]')].filter(
      (g) => g.children.length > 0
    )
    expect(groups.length).toBe(2)
    const xs = groups.map((g) =>
      [...g.querySelectorAll('path')].map((p) =>
        Number(/M([\d.]+)/.exec(p.getAttribute('d')!)![1])
      )
    )
    expect(xs[0]).toEqual(xs[1])
  })

  test('the program can never hold two disagreeing values', () => {
    // The whole reason this is one widget: there is one attackEnd, so there is
    // nothing to disagree.
    const { w } = build()
    expect(typeof w.value.attackEnd).toBe('number')
    expect(typeof w.value.sustainEnd).toBe('number')
    expect(w.value.sustainEnd!).toBeGreaterThan(w.value.attackEnd!)
  })
})

describe('one gesture is one commit', () => {
  test('a marker drag emits live repeatedly and commits ONCE', () => {
    const { w, live, commits } = build()
    const [a] = markerXs(w)
    w.handle!('down', a, TAB_Y)
    w.handle!('move', a + 15, TAB_Y)
    w.handle!('move', a + 30, TAB_Y)
    w.handle!('up', a + 30, TAB_Y)
    expect(live.length).toBeGreaterThan(1)
    expect(commits).toHaveLength(1)
  })

  test('the commit carries the WHOLE program, not one channel', () => {
    // So `edit(describe, mutate)` writes four curves and two markers as one
    // entry in a history.
    const { w, commits } = build()
    const [a] = markerXs(w)
    w.handle!('down', a, TAB_Y)
    w.handle!('move', a + 30, TAB_Y)
    w.handle!('up', a + 30, TAB_Y)
    const p = commits[0].program
    expect(p.brightness).toBeDefined()
    expect(p.hue).toBeDefined()
    expect(p.attackEnd).toBeGreaterThan(0.35)
    expect(p.sustainEnd).toBeCloseTo(0.75, 2)
  })

  test('the describe says which split moved', () => {
    const { w, commits } = build()
    const [, b] = markerXs(w)
    w.handle!('down', b, TAB_Y)
    w.handle!('move', b + 12, TAB_Y)
    w.handle!('up', b + 12, TAB_Y)
    expect(commits[0].describe).toBe('move decay split')
  })

  test('committed values are canonical, so a document diff stays small', () => {
    const { w, commits } = build()
    const [a] = markerXs(w)
    w.handle!('down', a, TAB_Y)
    w.handle!('move', a + 17.3719, TAB_Y)
    w.handle!('up', a + 17.3719, TAB_Y)
    const dp = (n: number) => (String(n).split('.')[1] ?? '').length
    expect(dp(commits[0].program.attackEnd)).toBeLessThanOrEqual(4)
    for (const p of commits[0].program.brightness) {
      expect(dp(p.x)).toBeLessThanOrEqual(4)
      expect(dp(p.y)).toBeLessThanOrEqual(4)
    }
  })
})

describe('controlled — value in, value out', () => {
  test('setValue replaces what the plots show', () => {
    const { w } = build()
    w.setValue({ ...PROGRAM, attackEnd: 0.1, sustainEnd: 0.9 })
    expect(w.value.attackEnd).toBeCloseTo(0.1)
    expect(w.value.sustainEnd).toBeCloseTo(0.9)
  })

  test('setValue does NOT echo a change back at the consumer', () => {
    // For a document that treats its own change events as edits, an echo is an
    // undo entry for an undo — the loop that makes controlled components feel
    // haunted.
    const { w, live, commits } = build()
    live.length = 0
    w.setValue({ ...PROGRAM, attackEnd: 0.2, sustainEnd: 0.8 })
    expect(live).toHaveLength(0)
    expect(commits).toHaveLength(0)
  })

  test('`value` is a copy — mutating it does nothing', () => {
    const { w } = build()
    const got: any = w.value
    got.attackEnd = 99
    expect(w.value.attackEnd).not.toBe(99)
  })
})

describe('pointer routing between stacked plots', () => {
  test('a press lands in the plot under it', () => {
    const { w, commits } = build()
    const h = w.layout!(320)
    // Low in the widget: the second channel. Away from a marker line, so this
    // exercises the CURVE not the split.
    w.handle!('down', 170, h - 60)
    w.handle!('move', 175, h - 62)
    w.handle!('up', 175, h - 62)
    expect(commits[0].describe).toBe('edit hue curve')
  })

  test('a drag stays with the plot it STARTED in', () => {
    // Otherwise dragging a point upward hands the gesture to the plot above
    // mid-move, which is indistinguishable from the curve fighting you.
    const { w, commits } = build()
    const h = w.layout!(320)
    w.handle!('down', 170, h - 60) // starts in hue
    w.handle!('move', 170, 10) // pointer now over brightness
    w.handle!('up', 170, 10)
    expect(commits).toHaveLength(1)
    expect(commits[0].describe).toBe('edit hue curve')
  })

  test('a press outside every plot does nothing', () => {
    const { w, commits } = build()
    const h = w.layout!(320)
    expect(() => w.handle!('down', 170, h + 500)).not.toThrow()
    expect(commits).toHaveLength(0)
  })
})
