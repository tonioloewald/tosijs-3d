import { describe, test, expect, beforeAll } from 'bun:test'
import { Window } from 'happy-dom'

/*
A WIDGET BOUND TO A BOX LETS GO OF IT WHEN DISPOSED (#100).

`boundValue` threw away the unsubscribe, so every bound row left a listener in
tosijs's module-level list, holding the row's element, its panel and its host.
Ensemble measured +125 listeners and +5,360 nodes per round of panel rebuilds.
*/

let w3d: typeof import('./widgets3d.js')

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
  w3d = await import('./widgets3d.js')
})

/** A box shaped like a tosijs boxed leaf, that counts who is listening. */
const countingBox = <T>(value: T) => {
  const listeners = new Set<() => void>()
  return {
    listeners,
    get value() {
      return value
    },
    set value(v: T) {
      value = v
      for (const cb of listeners) cb()
    },
    observe(cb: () => void) {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
  }
}

describe('bound widgets unsubscribe (#100)', () => {
  test('disposing a panel releases every bound row', () => {
    const on = countingBox(true)
    const level = countingBox(0.5)
    const pick = countingBox('b')
    const panel = w3d.panel3d(
      { width: 300 },
      w3d.toggle3d({ label: 'on', value: on as any }),
      w3d.slider3d({ label: 'level', value: level as any }),
      w3d.select3d({ label: 'pick', value: pick as any, options: ['a', 'b'] })
    ) as any
    expect(on.listeners.size + level.listeners.size + pick.listeners.size).toBe(
      3
    )
    panel.dispose()
    expect(on.listeners.size + level.listeners.size + pick.listeners.size).toBe(
      0
    )
    // Twice is harmless.
    panel.dispose()
  })

  test('a single widget releases its box', () => {
    const on = countingBox(false)
    const t = w3d.toggle3d({ label: 'x', value: on as any })
    expect(on.listeners.size).toBe(1)
    t.dispose?.()
    expect(on.listeners.size).toBe(0)
  })
})
