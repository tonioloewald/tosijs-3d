import { describe, test, expect, beforeAll } from 'bun:test'
import { Window } from 'happy-dom'

// vector-field builds SVG through tosijs, so it needs a DOM before import.
let mod: typeof import('./vector-field.js')

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
  mod = await import('./vector-field.js')
})

describe('wrapDegrees — the whole difference between euler3d and vector3d', () => {
  test('leaves everything inside the range alone', () => {
    for (const n of [0, 45, -45, 179, -179, 90]) {
      expect(mod.wrapDegrees(n)).toBe(n)
    }
  })

  test('wraps past the ends rather than clamping', () => {
    expect(mod.wrapDegrees(181)).toBe(-179)
    expect(mod.wrapDegrees(-181)).toBe(179)
    expect(mod.wrapDegrees(270)).toBe(-90)
    expect(mod.wrapDegrees(-270)).toBe(90)
  })

  test('multiple turns land where one would', () => {
    expect(mod.wrapDegrees(360 + 45)).toBe(45)
    expect(mod.wrapDegrees(-720 - 45)).toBe(-45)
    expect(mod.wrapDegrees(1080)).toBe(0)
  })

  test('the half-open end: +180 stays +180, and -180 becomes +180', () => {
    // Same orientation either way, so the only question is which one we SHOW.
    // A control that flips sign as you drag across the back of a turn reads as a
    // glitch, and the naive `%` form returns -180 for +180 — disagreeing at
    // exactly the boundary a scrub is most likely to cross.
    expect(mod.wrapDegrees(180)).toBe(180)
    expect(mod.wrapDegrees(-180)).toBe(180)
    expect(mod.wrapDegrees(540)).toBe(180)
  })

  test('a non-finite input yields 0, not NaN', () => {
    // NaN into a field is a value you cannot type your way out of.
    expect(mod.wrapDegrees(NaN)).toBe(0)
    expect(mod.wrapDegrees(Infinity)).toBe(0)
  })
})

describe('vector3d — one row, three fields', () => {
  test('reports the value it was given, and copies it', () => {
    const src = { x: 1.5, y: 0, z: -3.25 }
    const v = mod.vector3d({ value: src })
    expect(v.value).toEqual(src)
    // A live reference would let a caller mutate the widget's state behind its
    // back — and the getter returning the same object would hide it.
    src.x = 99
    expect(v.value.x).toBe(1.5)
    expect(v.value).not.toBe(v.value)
  })

  test('exposes exactly three fields, in axis order', () => {
    const v = mod.vector3d({})
    expect(v.fields).toHaveLength(3)
    expect(v.fields.map((f) => f.value)).toEqual(['0', '0', '0'])
  })

  test('setValue writes through to the fields', () => {
    const v = mod.vector3d({})
    v.setValue({ x: 2, y: -0.5, z: 10 })
    expect(v.value).toEqual({ x: 2, y: -0.5, z: 10 })
    expect(v.fields.map((f) => f.value)).toEqual(['2', '-0.5', '10'])
  })

  test('trailing zeros are trimmed — 1.500 reads as 1.5', () => {
    const v = mod.vector3d({ value: { x: 1.5, y: 2, z: 0.125 } })
    expect(v.fields.map((f) => f.value)).toEqual(['1.5', '2', '0.125'])
  })

  test('precision rounds, and still trims', () => {
    const v = mod.vector3d({ value: { x: 1 / 3, y: 2, z: 0 }, precision: 2 })
    expect(v.fields[0].value).toBe('0.33')
    expect(v.fields[1].value).toBe('2')
  })

  test('layout returns a height and the row is a <g>', () => {
    const v = mod.vector3d({})
    const h = v.layout(300)
    expect(h).toBeGreaterThan(0)
    expect(v.el.tagName.toLowerCase()).toBe('g')
  })

  test('axis letters are overridable', () => {
    const v = mod.vector3d({ axes: ['r', 'g', 'b'] })
    v.layout(300)
    // Direct children only: a descendant query also catches the fields' own
    // text nodes (their values), which are not axis letters.
    const letters = [...v.el.children]
      .filter((n) => n.tagName.toLowerCase() === 'text')
      .map((t) => t.textContent)
    expect(letters).toEqual(['r', 'g', 'b'])
  })
})

describe('euler3d — degrees, and it wraps', () => {
  test('an out-of-range initial value is settled on the way in', () => {
    const e = mod.euler3d({ value: { x: 190, y: -200, z: 45 } })
    // setValue is the documented route; the constructor shows what it was given
    // so a caller can see their own number before touching it.
    e.setValue({ x: 190, y: -200, z: 45 })
    expect(e.value).toEqual({ x: -170, y: 160, z: 45 })
  })

  test('setValue wraps rather than clamping', () => {
    const e = mod.euler3d({})
    e.setValue({ x: 361, y: 720, z: -45 })
    expect(e.value).toEqual({ x: 1, y: 0, z: -45 })
  })

  test('the wrapped value is what the field SHOWS', () => {
    // Silently reinterpreting 190 as -170 while the field still reads 190 would
    // leave two disagreeing claims about one value on screen.
    const e = mod.euler3d({})
    e.setValue({ x: 190, y: 0, z: 0 })
    expect(e.fields[0].value).toBe('-170')
  })

  test('vector3d does NOT wrap — that is the only difference', () => {
    const v = mod.vector3d({})
    v.setValue({ x: 190, y: 720, z: 0 })
    expect(v.value).toEqual({ x: 190, y: 720, z: 0 })
  })
})

describe('focus — a row is three tab stops, not one', () => {
  const states = (v: ReturnType<typeof mod.vector3d>) => {
    const seen: boolean[] = []
    v.fields.forEach((f, i) => {
      // Capture what each field was told, by watching its own setState.
      const orig = f.setState?.bind(f)
      f.setState = (s: any) => {
        seen[i] = s.focused
        orig?.(s)
      }
    })
    v.setState?.({ hovered: false, pressed: false, focused: true })
    return seen
  }

  test('exactly ONE field is told it is focused', () => {
    // All three lit their carets before this — and since the caret IS the focus
    // indicator, "focus is everywhere" says the same as nothing.
    const v = mod.vector3d({})
    expect(states(v).filter(Boolean)).toHaveLength(1)
  })

  test('left/right walks the axes and then escapes', () => {
    const v = mod.vector3d({})
    expect(v.focusMove!(1, 0)).toBe(true) // x → y
    expect(v.focusMove!(1, 0)).toBe(true) // y → z
    expect(v.focusMove!(1, 0)).toBe(false) // z → out, host takes over
  })

  test('up/down escapes immediately — that axis belongs to the panel', () => {
    const v = mod.vector3d({})
    expect(v.focusMove!(0, 1)).toBe(false)
    expect(v.focusMove!(0, -1)).toBe(false)
  })

  test('focus lands on the field you press', () => {
    const v = mod.vector3d({})
    v.layout(300)
    // Press in the last third — the z field.
    v.handle!('down', 290, 10)
    expect(states(v).findIndex(Boolean)).toBe(2)
  })
})
