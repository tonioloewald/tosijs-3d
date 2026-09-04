import { describe, test, expect, beforeAll } from 'bun:test'
import { Window } from 'happy-dom'

/*
The picker's own behaviour. The colour MATH is pinned in `color.test.ts`; this
is about what a drag does.
*/
let C: typeof import('./color-field.js')

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
  C = await import('./color-field.js')
})

/*
Geometry for `layout(280)` with the default alpha strip, so the tests aim at
real coordinates instead of magic numbers: two 16px strips and two 8px gaps
leave a 224px square, and the square is `round(280 * 0.62)` tall.
*/
const W = 280
const SQ_W = W - (16 * 2 + 8) - 8
const SQ_H = Math.round(W * 0.62)

const mk = (opts: Record<string, unknown> = {}) => {
  const seen: string[] = []
  const committed: string[] = []
  const w = C.color3d({
    value: '#ff0000',
    handleChange: (v) => seen.push(v),
    handleCommit: (v) => committed.push(v),
    ...opts,
  })
  w.layout(280)
  return { w, seen, committed }
}

describe('color3d', () => {
  test('reports its value as canonical hex', () => {
    expect(mk().w.value).toBe('#ff0000')
  })

  test('setValue ignores garbage rather than going black', () => {
    const { w } = mk()
    w.setValue('nonsense')
    expect(w.value).toBe('#ff0000')
  })

  test('dragging the square changes saturation and value', () => {
    const { w, seen } = mk()
    w.handle!('down', 0, 0) // the square's top-left corner IS white
    expect(seen.at(-1)).toBe('#ffffff')
  })

  test('HUE SURVIVES a trip through black — the state is HSV, not RGB', () => {
    /*
    The bug this prevents: drag value to zero and the colour is black, which has
    no hue. Re-deriving H from the emitted RGB loses where the handle was and
    springs it back to red the moment you lift value again.
    */
    const { w } = mk({ value: '#00ff00' }) // hue 120
    w.handle!('down', 0, SQ_H) // bottom of the square → value 0 → black
    expect(w.value).toBe('#000000')
    w.handle!('move', SQ_W, 0) // back to full saturation and value
    expect(w.value).toBe('#00ff00') // still green, not red
  })

  test('a press OWNS its control for the whole gesture', () => {
    // Dragging value to the top edge routinely leaves the square; re-deciding
    // per event would silently turn that into a hue edit.
    const { w } = mk()
    const before = w.value
    w.handle!('down', 4, 4) // grabs the square
    w.handle!('move', 999, 4) // way off to the right, over the strips
    expect(w.value).not.toBe(before)
    // Still a saturation/value edit: hue is untouched, so green and blue stay
    // at zero. Had the move been re-routed to the hue strip they would not.
    expect(w.value.slice(3)).toBe('0000')
  })

  test('commit fires once, on release', () => {
    const { w, seen, committed } = mk()
    w.handle!('down', 40, 40)
    w.handle!('move', 60, 40)
    w.handle!('up', 60, 40)
    expect(seen.length).toBeGreaterThan(1)
    expect(committed).toHaveLength(1)
  })

  test('alpha can be switched off, and then nothing emits one', () => {
    const { w } = mk({ alpha: false, value: '#336699' })
    expect(w.value).toBe('#336699') // no trailing alpha pair
  })

  test('layout reports a height that grows with the widget', () => {
    const a = C.color3d({})
    const b = C.color3d({})
    expect(b.layout(400)).toBeGreaterThan(a.layout(200))
  })
})
