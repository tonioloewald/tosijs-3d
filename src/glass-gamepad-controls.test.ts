import { describe, test, expect, beforeAll } from 'bun:test'

/*
PINS THE DOCUMENTED SYNTAX, because the doc was wrong and failed silently.

The `controls` row claimed a default of `'sticks buttons'`, space-separated.
The parser splits on COMMAS and knows no `sticks`/`buttons` tokens, so copying
the documented value produced an empty control list — which renders a pad with
no left cluster, no right cluster and no top cluster. No error, no warning, just
a blank gamepad.

These assertions are the doc. If one fails, the table above `parseGamepadControls`
is what needs changing.
*/
let parse: typeof import('./glass-gamepad.js').parseGamepadControls

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
  parse = (await import('./glass-gamepad.js')).parseGamepadControls
})

describe('parseGamepadControls — the documented contract', () => {
  test("the DEFAULT ('') means ALL controls, not none", () => {
    // `controls` undefined leaves this empty; it must not mean "show nothing".
    expect(parse('').controls).toBeUndefined()
    expect(parse('true').controls).toBeUndefined()
  })

  test('the value the docs USED to advertise names no real control — the silent blank pad', () => {
    // `sticks`/`buttons` are not tokens the pad knows, so nothing is shown and
    // nothing complains. Asserted as "contains no real piece" rather than
    // "empty", because tokenising now yields the two unknown words.
    const r = parse('sticks buttons')
    for (const real of ['A', 'B', 'X', 'Y', 'left_stick', 'right_stick']) {
      expect(r.controls).not.toContain(real)
    }
  })

  test('a comma INSIDE an offset does not split the token', () => {
    // `split(',')` tore `right_stick(40,0)` into `right_stick(40` + `0)`, so the
    // piece vanished AND its offset was lost — silently. The example in
    // parseGamepadControls' own JSDoc could not parse.
    const r = parse('a,b,right_stick(40,0),menu')
    expect(r.controls).toEqual(['A', 'B', 'right_stick', 'menu'])
    expect(r.offsets['right_stick']).toEqual({ x: 40, y: 0 })
  })

  test('comma-separated, as documented', () => {
    expect(parse('a,b').controls).toEqual(['A', 'B'])
  })

  test('a/b/x/y map to upper case', () => {
    expect(parse('x,y').controls).toEqual(['X', 'Y'])
  })

  test('dpad expands to four directions', () => {
    const r = parse('dpad')
    expect(r.controls?.length).toBe(4)
  })

  test('name(dx,dy) records a per-piece offset', () => {
    const r = parse('right_stick(40,0)')
    expect(r.offsets['right_stick']).toEqual({ x: 40, y: 0 })
  })

  test('whitespace around tokens is tolerated', () => {
    expect(parse(' a , b ').controls).toEqual(['A', 'B'])
  })
})
