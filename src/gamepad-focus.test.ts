import { describe, expect, test } from 'bun:test'
import { createFocusPulse } from './gamepad-focus'
import { emptyGamepad } from './virtual-gamepad'

const pad = (over: Record<string, unknown> = {}) =>
  ({ ...emptyGamepad(), ...over }) as any

describe('createFocusPulse — edge detection', () => {
  test('a press fires once, not every frame it is held', () => {
    const p = createFocusPulse()
    expect(p(pad({ dpadRight: true }), 0).moves).toEqual([{ dx: 1, dy: 0 }])
    // still held, well inside the repeat delay
    expect(p(pad({ dpadRight: true }), 16).moves).toEqual([])
    expect(p(pad({ dpadRight: true }), 100).moves).toEqual([])
  })

  test('releasing and pressing again fires again', () => {
    const p = createFocusPulse()
    p(pad({ dpadRight: true }), 0)
    p(pad({}), 16)
    expect(p(pad({ dpadRight: true }), 32).moves).toEqual([{ dx: 1, dy: 0 }])
  })

  test('each direction maps to the right vector', () => {
    const p = createFocusPulse()
    expect(p(pad({ dpadUp: true }), 0).moves).toEqual([{ dx: 0, dy: -1 }])
    expect(p(pad({ dpadDown: true }), 1000).moves).toEqual([{ dx: 0, dy: 1 }])
    expect(p(pad({ dpadLeft: true }), 2000).moves).toEqual([{ dx: -1, dy: 0 }])
  })
})

describe('createFocusPulse — repeat ramp', () => {
  test('holding repeats only after the delay, then at the rate', () => {
    const p = createFocusPulse({ repeatDelayMs: 400, repeatRateMs: 100 })
    expect(p(pad({ dpadDown: true }), 0).moves.length).toBe(1) // initial
    expect(p(pad({ dpadDown: true }), 399).moves.length).toBe(0) // still waiting
    expect(p(pad({ dpadDown: true }), 400).moves.length).toBe(1) // delay met
    expect(p(pad({ dpadDown: true }), 450).moves.length).toBe(0) // inside rate
    expect(p(pad({ dpadDown: true }), 500).moves.length).toBe(1) // rate met
  })

  test('the ramp restarts after a release — a tap is never a repeat', () => {
    const p = createFocusPulse({ repeatDelayMs: 400, repeatRateMs: 100 })
    p(pad({ dpadDown: true }), 0)
    p(pad({ dpadDown: true }), 600) // repeating
    p(pad({}), 700) // released
    expect(p(pad({ dpadDown: true }), 701).moves.length).toBe(1)
    expect(p(pad({ dpadDown: true }), 800).moves.length).toBe(0) // delay again
  })
})

describe('createFocusPulse — confirm and back', () => {
  test('menu activates, once per press', () => {
    const p = createFocusPulse()
    expect(p(pad({ menu: 1 }), 0).activate).toBe(true)
    // Held: does NOT repeat. Repeating confirm would fire a key over and over,
    // which is never what holding a button means.
    expect(p(pad({ menu: 1 }), 1000).activate).toBe(false)
    p(pad({}), 1100)
    expect(p(pad({ menu: 1 }), 1200).activate).toBe(true)
  })

  test('A also activates — where a thumb expects it on a hardware pad', () => {
    const p = createFocusPulse()
    expect(p(pad({ buttonA: 1 }), 0).activate).toBe(true)
  })

  test('B goes back, once per press', () => {
    const p = createFocusPulse()
    expect(p(pad({ buttonB: 1 }), 0).back).toBe(true)
    expect(p(pad({ buttonB: 1 }), 500).back).toBe(false)
  })

  test('an idle pad asks for nothing', () => {
    const p = createFocusPulse()
    expect(p(pad(), 0)).toEqual({ moves: [], activate: false, back: false })
  })
})

describe('createFocusPulse — what it deliberately ignores', () => {
  test('the left stick is NOT focus input (it is how you walk)', () => {
    const p = createFocusPulse()
    const r = p(pad({ leftStickX: 1, leftStickY: -1 }), 0)
    expect(r.moves).toEqual([])
  })

  test('two directions at once both step (diagonals are the host box’s problem)', () => {
    const p = createFocusPulse()
    const r = p(pad({ dpadRight: true, dpadDown: true }), 0)
    expect(r.moves.length).toBe(2)
  })
})
