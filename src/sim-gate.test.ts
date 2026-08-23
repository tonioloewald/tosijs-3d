import { describe, test, expect, beforeAll } from 'bun:test'

// b3d-utils pulls in tosijs (which needs HTMLElement) even for its pure
// helpers, so the usual happy-dom prologue applies. Collapsing these 21 copies
// into a preload is a filed follow-up, not a thing to change mid-release.
let simHalted: typeof import('./b3d-utils').simHalted
let controlsLive: typeof import('./b3d-utils').controlsLive

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
  const utils = await import('./b3d-utils')
  simHalted = utils.simHalted
  controlsLive = utils.controlsLive
})

/*
THE TWO GATES, AND WHY THEY ARE NOT THE SAME GATE.

`simHalted` → do not advance at all. `controlsLive` → advance, but with neutral
input. Collapsing them has cost this project twice:

- #30: a paused scene fed the flight model empty input, and an aircraft with no
  input COASTS. "I can background the tab, come back and the game is continuing
  to run, I just can't steer."
- `freeze()` (0.7.0) repeated it in miniature — everything on `sceneDelta`
  stopped while the piloted aircraft flew on, so raising the re-seat prompt in
  flight could fly you into the ground while the modal was up.

Pure predicates so a THIRD state added later cannot land in one gate and not the
other, which is exactly how `frozen` was missed.
*/
describe('simHalted — halt, do not merely zero the stick', () => {
  test('paused halts', () => expect(simHalted({ paused: true })).toBe(true))
  test('frozen halts — the re-seat modal case', () =>
    expect(simHalted({ frozen: true })).toBe(true))
  test('neither halts', () =>
    expect(simHalted({ paused: false, frozen: false })).toBe(false))
  test('a null owner does not halt (standalone use)', () =>
    expect(simHalted(null)).toBe(false))
  test('input suppression alone does NOT halt — the world keeps running', () =>
    expect(simHalted({ inputSuppressed: true })).toBe(false))
})

describe('controlsLive — read the sticks?', () => {
  test('live by default when nothing says otherwise', () =>
    expect(controlsLive({})).toBe(true))
  test('halted implies not live', () => {
    expect(controlsLive({ paused: true })).toBe(false)
    expect(controlsLive({ frozen: true })).toBe(false)
  })
  test('modal suppression stops input without halting the world', () => {
    expect(controlsLive({ inputSuppressed: true })).toBe(false)
    expect(simHalted({ inputSuppressed: true })).toBe(false)
  })
  test('an unfocused demo idles rather than freezing', () => {
    expect(controlsLive({ hasInputFocus: false })).toBe(false)
    expect(simHalted({ hasInputFocus: false })).toBe(false)
  })
  test('focus defaults to true so a lone scene just works', () =>
    expect(controlsLive({ paused: false })).toBe(true))
})
