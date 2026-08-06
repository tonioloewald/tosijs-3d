import { describe, test, expect, beforeAll } from 'bun:test'

// isOff guards every 'on'|'off' feature flag — and it is the load-bearing half
// of the tosijs#24 footgun (a wrong-typed `foo: false` write is silently
// discarded upstream, but values that DO arrive as false/'false' from a UI
// toggle must still read as off). The review flagged it untested.
let isOff: typeof import('./b3d-utils').isOff

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
  isOff = (await import('./b3d-utils')).isOff
})

describe('isOff', () => {
  test('off-side values', () => {
    expect(isOff('off')).toBe(true)
    expect(isOff(false)).toBe(true)
    expect(isOff('false')).toBe(true)
  })

  test('on-side values — including absent/unknown, which default ON', () => {
    expect(isOff('on')).toBe(false)
    expect(isOff(true)).toBe(false)
    expect(isOff('')).toBe(false)
    expect(isOff(undefined)).toBe(false)
    expect(isOff(null)).toBe(false)
    expect(isOff(0)).toBe(false) // numeric zero is NOT an off switch
  })
})
