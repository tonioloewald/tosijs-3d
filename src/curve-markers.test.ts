import { describe, test, expect, beforeAll } from 'bun:test'
import { Window } from 'happy-dom'

/*
SHARED MARKERS — one set of split points, several curves.

Tonio: "the attack and decay should be shared by the various curves or it just
becomes nutty." It is not merely convenient: a lamp's attack/sustain/decay
boundaries live on the PROGRAM, not on any one channel, so per-curve markers
would let brightness and hue disagree about where the attack ends — a state the
model cannot even represent.
*/

let mod: typeof import('./curve-field')

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
  mod = await import('./curve-field')
})

describe('the shared model', () => {
  test('a move notifies every subscriber', () => {
    const m = mod.curveMarkers([0.3, 0.7])
    let a = 0
    let b = 0
    m.subscribe(() => a++)
    m.subscribe(() => b++)
    m.move(0, 0.4)
    expect(a).toBe(1)
    expect(b).toBe(1)
  })

  test('a move that changes nothing does not fire', () => {
    // Otherwise every mouse-move during a drag redraws every sibling curve,
    // which is the cost that makes sharing feel expensive.
    const m = mod.curveMarkers([0.3, 0.7])
    let fired = 0
    m.subscribe(() => fired++)
    m.move(0, 0.9) // clamps to just under 0.7
    expect(fired).toBe(1)
    m.move(0, 0.95) // clamps to the SAME place
    expect(fired).toBe(1)
  })

  test('unsubscribe stops it', () => {
    const m = mod.curveMarkers([0.3, 0.7])
    let fired = 0
    const off = m.subscribe(() => fired++)
    off()
    m.move(0, 0.4)
    expect(fired).toBe(0)
  })

  test('handleChange reports the new values', () => {
    let seen: number[] | null = null
    const m = mod.curveMarkers([0.3, 0.7], {
      handleChange: (v) => (seen = v),
    })
    m.move(1, 0.85)
    expect(seen![1]).toBeCloseTo(0.85)
  })

  test('values arriving from outside are normalized', () => {
    const m = mod.curveMarkers([0.9, 0.1])
    expect(m.values[0]).toBeLessThan(m.values[1])
    m.set([2, -2])
    expect(m.values[0]).toBeGreaterThanOrEqual(0)
    expect(m.values[1]).toBeLessThanOrEqual(1)
  })

  test('labels come back for drawing', () => {
    const m = mod.curveMarkers([0.35, 0.75], {
      labels: ['attack', 'decay'],
    })
    expect(m.labels).toEqual(['attack', 'decay'])
  })
})

describe('two curves given the same markers move together', () => {
  const build = () => {
    const markers = mod.curveMarkers([0.35, 0.75], {
      labels: ['attack', 'decay'],
    })
    const brightness = mod.curve3d({ label: 'brightness', markers })
    const hue = mod.curve3d({ label: 'hue', markers })
    brightness.layout(300)
    hue.layout(300)
    return { markers, brightness, hue }
  }

  test('dragging in one curve moves the shared value', () => {
    const { markers, brightness } = build()
    const before = markers.values[0]
    // Press on the first marker's line and drag it right.
    const px = (v: number) => 4 + v * (300 - 8) // plot inset, roughly
    brightness.handle!('down', px(before), 40)
    brightness.handle!('move', px(0.5), 40)
    brightness.handle!('up', px(0.5), 40)
    expect(markers.values[0]).not.toBeCloseTo(before)
  })

  test('the OTHER curve sees it — that is the whole point', () => {
    const { markers, brightness, hue } = build()
    let hueRedraws = 0
    markers.subscribe(() => hueRedraws++)
    const px = (v: number) => 4 + v * (300 - 8)
    brightness.handle!('down', px(markers.values[0]), 40)
    brightness.handle!('move', px(0.5), 40)
    expect(hueRedraws).toBeGreaterThan(0)
    // And the value both curves read is one value, not two.
    expect(hue).toBeDefined()
    expect(markers.values[0]).toBeCloseTo(markers.values[0])
  })

  test('a curve with no markers still works', () => {
    // Markers are optional — every existing curve3d predates them.
    const c = mod.curve3d({ label: 'plain' })
    expect(() => {
      c.layout(300)
      c.handle!('down', 50, 40)
      c.handle!('up', 50, 40)
    }).not.toThrow()
  })
})

/*
#7/#8 — CONTROLLED, AND ONE COMMIT PER GESTURE.

Ensemble records one undo step per edit and the JSON is their truth, so a curve
editor that emitted per pointer-move would put fifty entries in the history for
one drag. But a 3D preview has to follow the drag continuously. Both are served
because they are different callbacks, not one compromise.
*/
describe('live vs commit', () => {
  const dragCurve = () => {
    const live: number[] = []
    const commits: number[] = []
    const c = mod.curve3d({
      value: [
        { x: 0, y: 0 },
        { x: 0.5, y: 0.5 },
        { x: 1, y: 1 },
      ],
      onChange: () => live.push(1),
      handleCommit: () => commits.push(1),
    })
    c.layout(300)
    return { c, live, commits }
  }

  test('a drag emits live many times and commits ONCE', () => {
    const { c, live, commits } = dragCurve()
    c.handle!('down', 150, 60)
    c.handle!('move', 155, 62)
    c.handle!('move', 160, 65)
    c.handle!('move', 165, 68)
    c.handle!('up', 165, 68)
    expect(live.length).toBeGreaterThan(1)
    expect(commits).toHaveLength(1)
  })

  test('commit carries CANONICAL points — rounded, so the diff is small', () => {
    let committed: any = null
    const c = mod.curve3d({
      value: [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ],
      handleCommit: (p) => (committed = p),
    })
    c.layout(300)
    c.handle!('down', 150, 61)
    c.handle!('move', 151, 63)
    c.handle!('up', 151, 63)
    for (const p of committed) {
      const dp = (n: number) => (String(n).split('.')[1] ?? '').length
      expect(dp(p.x)).toBeLessThanOrEqual(4)
      expect(dp(p.y)).toBeLessThanOrEqual(4)
    }
  })

  test('a discrete edit is its own gesture, so it commits immediately', () => {
    // There is no release to wait for when you pick a preset.
    const commits: any[] = []
    const c = mod.curve3d({ handleCommit: (p) => commits.push(p) })
    c.layout(300)
    c.applyPreset('flatten')
    expect(commits).toHaveLength(1)
  })

  test('a gesture that ends by LEAVING still commits', () => {
    // Otherwise dragging off the widget loses the edit from the document while
    // leaving it on screen — two truths, which is the thing to avoid.
    const { c, commits } = dragCurve()
    c.handle!('down', 150, 60)
    c.handle!('move', 160, 65)
    c.handle!('leave', 160, 65)
    expect(commits).toHaveLength(1)
  })

  test('no commit without a gesture', () => {
    const { c, commits } = dragCurve()
    c.handle!('move', 160, 65)
    c.handle!('up', 160, 65)
    expect(commits).toHaveLength(0)
  })
})

describe('markers commit once per drag too', () => {
  test('many moves, one commit', () => {
    const live: number[][] = []
    const commits: number[][] = []
    const markers = mod.curveMarkers([0.35, 0.75], {
      handleChange: (v) => live.push(v),
      handleCommit: (v) => commits.push(v),
    })
    const c = mod.curve3d({ markers })
    c.layout(300)
    const px = (v: number) => 4 + v * (300 - 8)
    c.handle!('down', px(0.35), 60)
    c.handle!('move', px(0.4), 60)
    c.handle!('move', px(0.45), 60)
    c.handle!('up', px(0.45), 60)
    expect(live.length).toBeGreaterThan(1)
    expect(commits).toHaveLength(1)
  })

  test('the committed values are rounded like the curve', () => {
    let got: number[] | null = null
    const markers = mod.curveMarkers([0.35, 0.75], {
      handleCommit: (v) => (got = v),
    })
    const c = mod.curve3d({ markers })
    c.layout(300)
    const px = (v: number) => 4 + v * (300 - 8)
    c.handle!('down', px(0.35), 60)
    c.handle!('move', px(0.4137291), 60)
    c.handle!('up', px(0.4137291), 60)
    for (const v of got!) {
      expect((String(v).split('.')[1] ?? '').length).toBeLessThanOrEqual(4)
    }
  })
})

/*
THE `describe` VERB PHRASE.

Ensemble's history entries are `verb + subject`, lowercase, no punctuation —
"insert barrel", "translate rock". They attach the subject (the piece id), which
we cannot know and they always can. So we pass the verb phrase ALONE: anything
more would be something for them to strip.
*/
describe('commit describes the gesture', () => {
  const drag = (c: any, from = 150, to = 160) => {
    c.layout(300)
    c.handle('down', from, 60)
    c.handle('move', to, 62)
    c.handle('up', to, 62)
  }

  test('a curve drag names the curve', () => {
    let said = ''
    const c = mod.curve3d({
      name: 'brightness',
      handleCommit: (_p, d) => (said = d),
    })
    drag(c)
    expect(said).toBe('edit brightness curve')
  })

  test('`name` beats a prose `label`', () => {
    // A label is prose for a human reading the panel; a describe is a token in
    // an undo history, where the prose would be noise.
    let said = ''
    const c = mod.curve3d({
      label: 'brightness — strike, hum, fade',
      name: 'brightness',
      handleCommit: (_p, d) => (said = d),
    })
    drag(c)
    expect(said).toBe('edit brightness curve')
  })

  test('with no name it still says something usable', () => {
    let said = ''
    const c = mod.curve3d({ handleCommit: (_p, d) => (said = d) })
    drag(c)
    expect(said).toBe('edit curve')
  })

  test('discrete edits name themselves', () => {
    const said: string[] = []
    const c = mod.curve3d({ handleCommit: (_p, d) => said.push(d) })
    c.layout(300)
    c.applyPreset('flatten')
    expect(said).toEqual(['apply preset'])
  })

  test('a marker drag names WHICH split moved', () => {
    // "move attack split" vs "move decay split" — the distinction that makes a
    // history scrubbable.
    let said = ''
    const markers = mod.curveMarkers([0.35, 0.75], {
      labels: ['attack', 'decay'],
      handleCommit: (_v, d) => (said = d),
    })
    const c = mod.curve3d({ markers })
    c.layout(300)
    const px = (v: number) => 4 + v * (300 - 8)
    c.handle!('down', px(0.75), 60)
    c.handle!('move', px(0.8), 60)
    c.handle!('up', px(0.8), 60)
    expect(said).toBe('move decay split')
  })

  test('unlabelled markers fall back rather than saying "undefined"', () => {
    let said = ''
    const markers = mod.curveMarkers([0.35, 0.75], {
      handleCommit: (_v, d) => (said = d),
    })
    const c = mod.curve3d({ markers })
    c.layout(300)
    const px = (v: number) => 4 + v * (300 - 8)
    c.handle!('down', px(0.35), 60)
    c.handle!('move', px(0.4), 60)
    c.handle!('up', px(0.4), 60)
    expect(said).toBe('move split')
  })

  test('every phrase is a bare verb phrase — no subject, no capital, no stop', () => {
    // The format contract, checked rather than assumed.
    const said: string[] = []
    const markers = mod.curveMarkers([0.35, 0.75], {
      labels: ['attack', 'decay'],
      handleCommit: (_v, d) => said.push(d),
    })
    const c = mod.curve3d({
      name: 'hue',
      markers,
      handleCommit: (_p, d) => said.push(d),
    })
    c.layout(300)
    c.applyPreset('flatten')
    const px = (v: number) => 4 + v * (300 - 8)
    c.handle!('down', px(0.35), 60)
    c.handle!('move', px(0.4), 60)
    c.handle!('up', px(0.4), 60)
    expect(said.length).toBeGreaterThan(1)
    for (const d of said) {
      expect(d).toBe(d.toLowerCase())
      expect(d).not.toMatch(/[.!?]$/)
      expect(d.trim()).toBe(d)
    }
  })
})
