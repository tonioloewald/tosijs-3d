import { describe, test, expect, beforeAll } from 'bun:test'

// popup-surface imports Babylon + tosijs, so the happy-dom prologue applies
// even though the function under test is pure.
let modalPickable: typeof import('./popup-surface.js').modalPickable

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
  modalPickable = (await import('./popup-surface.js')).modalPickable
})

/*
Modal blocking, as pure logic.

The ORDERING bug this was extracted alongside — `openPopup` applied modal
blocking during mount, which `appendChild` runs synchronously, BEFORE the popup
was registered — is an integration failure these tests cannot see (filed in
TODO). What they do pin is the rule itself, including the restore-on-close half:
regress that and the whole stack stays permanently untargetable while the camera
still works, which reads as "the UI died" rather than as a bug in popups.
*/
describe('modalPickable', () => {
  test('no modal: everything is pickable', () => {
    expect(modalPickable([{}, {}, {}])).toEqual([true, true, true])
  })

  test('a modal blocks every other popup', () => {
    expect(modalPickable([{ modal: true }, {}, {}])).toEqual([
      true,
      false,
      false,
    ])
  })

  test('the modal need not be on top', () => {
    expect(modalPickable([{}, { modal: true }, {}])).toEqual([
      false,
      true,
      false,
    ])
  })

  test('two modals: the first wins, and exactly one is pickable', () => {
    const r = modalPickable([{}, { modal: true }, { modal: true }])
    expect(r).toEqual([false, true, false])
    expect(r.filter(Boolean).length).toBe(1)
  })

  test('closing the modal restores the stack — the "UI died" regression', () => {
    const stack = [{ modal: true }, {}, {}]
    expect(modalPickable(stack)).toEqual([true, false, false])
    stack.shift() // close()
    expect(modalPickable(stack)).toEqual([true, true])
  })

  test('an empty stack is not an error', () => {
    expect(modalPickable([])).toEqual([])
  })

  test('modal: false is not modal', () => {
    expect(modalPickable([{ modal: false }, {}])).toEqual([true, true])
  })
})
