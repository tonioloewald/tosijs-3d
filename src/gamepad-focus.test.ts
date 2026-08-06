import { describe, expect, test } from 'bun:test'
import { createFocusPulse } from './gamepad-focus'
import { emptyGamepad } from './virtual-gamepad'

const pad = (over: Record<string, unknown> = {}) =>
  ({ ...emptyGamepad(), ...over } as any)

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

describe('gamepadFocus — claim (one pad, several UIs)', () => {
  // These need a DOM (window listener, Element.contains); the pulse tests above
  // deliberately do not.
  const dom = async () => {
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
    return (globalThis as any).window
  }

  const pump = () => {
    let cbs: Array<() => void> = []
    return {
      raf: (cb: () => void) => (cbs.push(cb), cbs.length),
      cancel: () => {},
      step: () => {
        const run = cbs
        cbs = []
        run.forEach((f) => f())
      },
    }
  }

  const target = () => {
    const moves: Array<{ dx: number; dy: number }> = []
    return {
      moves,
      t: {
        focusMove: (dx: number, dy: number) => moves.push({ dx, dy }),
        focusActivate: () => {},
        focusBack: () => {},
      },
    }
  }

  const press = () => pad({ dpadRight: true })
  const idle = () => pad()

  test('unclaimed: every instance responds (a lone UI needs no wiring)', async () => {
    const win = await dom()
    const { gamepadFocus } = await import('./gamepad-focus')
    const doc = win.document
    const elA = doc.createElement('div')
    const elB = doc.createElement('div')
    doc.body.append(elA, elB)
    let state = idle()
    const A = target()
    const B = target()
    const p = pump()
    const stopA = gamepadFocus({
      poll: () => state,
      target: A.t,
      claim: elA,
      raf: p.raf,
      cancel: p.cancel,
    })
    const stopB = gamepadFocus({
      poll: () => state,
      target: B.t,
      claim: elB,
      raf: p.raf,
      cancel: p.cancel,
    })
    state = press()
    p.step()
    expect(A.moves.length).toBe(1)
    expect(B.moves.length).toBe(1)
    stopA()
    stopB()
    elA.remove()
    elB.remove()
  })

  test('a pointerdown inside one claim routes the pad THERE only — and moves with the pointer', async () => {
    const win = await dom()
    const { gamepadFocus } = await import('./gamepad-focus')
    const doc = win.document
    const elA = doc.createElement('div')
    const elB = doc.createElement('div')
    doc.body.append(elA, elB)
    let state = idle()
    const A = target()
    const B = target()
    const p = pump()
    const stopA = gamepadFocus({
      poll: () => state,
      target: A.t,
      claim: elA,
      raf: p.raf,
      cancel: p.cancel,
    })
    const stopB = gamepadFocus({
      poll: () => state,
      target: B.t,
      claim: elB,
      raf: p.raf,
      cancel: p.cancel,
    })

    elA.dispatchEvent(new win.Event('pointerdown', { bubbles: true }))
    state = press()
    p.step()
    expect(A.moves.length).toBe(1)
    expect(B.moves.length).toBe(0) // B ran its pulse but did not apply it

    // release, claim B, press again — the pad follows the pointer
    state = idle()
    p.step()
    elB.dispatchEvent(new win.Event('pointerdown', { bubbles: true }))
    state = press()
    p.step()
    expect(A.moves.length).toBe(1)
    expect(B.moves.length).toBe(1)
    stopA()
    stopB()
    elA.remove()
    elB.remove()
  })

  test('stopping the claimed instance releases the claim', async () => {
    const win = await dom()
    const { gamepadFocus } = await import('./gamepad-focus')
    const doc = win.document
    const elA = doc.createElement('div')
    const elB = doc.createElement('div')
    doc.body.append(elA, elB)
    let state = idle()
    const A = target()
    const B = target()
    const p = pump()
    const stopA = gamepadFocus({
      poll: () => state,
      target: A.t,
      claim: elA,
      raf: p.raf,
      cancel: p.cancel,
    })
    const stopB = gamepadFocus({
      poll: () => state,
      target: B.t,
      claim: elB,
      raf: p.raf,
      cancel: p.cancel,
    })
    elA.dispatchEvent(new win.Event('pointerdown', { bubbles: true }))
    stopA() // the claimed one goes away
    state = press()
    p.step()
    expect(B.moves.length).toBe(1) // unclaimed again — B responds
    stopB()
    elA.remove()
    elB.remove()
  })
})

describe('gamepadFocus — a claimless instance is not starved forever', () => {
  test('clicking OUTSIDE the claimed element releases the pad to everyone', async () => {
    const win = await (async () => {
      const { Window } = await import('happy-dom')
      const w = new Window() as any
      const g = globalThis as any
      g.window ??= w
      return (globalThis as any).window
    })()
    const { gamepadFocus } = await import('./gamepad-focus')
    const doc = win.document
    const elA = doc.createElement('div')
    const outside = doc.createElement('div')
    doc.body.append(elA, outside)
    let state = pad()
    const moved: string[] = []
    const t = (name: string) => ({
      focusMove: () => moved.push(name),
      focusActivate: () => {},
    })
    let cbs: Array<() => void> = []
    const p = {
      raf: (cb: () => void) => (cbs.push(cb), cbs.length),
      cancel: () => {},
      step: () => {
        const run = cbs
        cbs = []
        run.forEach((f) => f())
      },
    }
    const stopA = gamepadFocus({ poll: () => state, target: t('A'), claim: elA, raf: p.raf, cancel: p.cancel })
    const stopB = gamepadFocus({ poll: () => state, target: t('B'), raf: p.raf, cancel: p.cancel }) // NO claim
    elA.dispatchEvent(new win.Event('pointerdown', { bubbles: true }))
    state = pad({ dpadRight: true })
    p.step()
    expect(moved).toEqual(['A']) // A claimed: B silent (correct while claimed)
    state = pad()
    p.step()
    // rc.1-rc.3: B was starved FOREVER here — it registers no claim element, so
    // no click could ever route the pad back. Now a press outside A releases.
    outside.dispatchEvent(new win.Event('pointerdown', { bubbles: true }))
    state = pad({ dpadRight: true })
    p.step()
    expect(moved).toContain('B')
    stopA()
    stopB()
    elA.remove()
    outside.remove()
  })
})
