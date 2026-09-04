import { describe, test, expect, beforeAll } from 'bun:test'

// isOff guards every 'on'|'off' feature flag — and it is the load-bearing half
// of the tosijs#24 footgun (a wrong-typed `foo: false` write is silently
// discarded upstream, but values that DO arrive as false/'false' from a UI
// toggle must still read as off). The review flagged it untested.
let isOff: typeof import('./b3d-utils.js').isOff

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
  isOff = (await import('./b3d-utils.js')).isOff
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

describe('conventionName — .model is invisible to suffix parsing', () => {
  let conventionName: typeof import('./b3d-utils.js').conventionName
  beforeAll(async () => {
    conventionName = (await import('./b3d-utils.js')).conventionName
  })

  test('a plain export marker strips clean', () => {
    expect(conventionName('scout.model')).toBe('scout')
  })

  test('an export that ALSO carries a behaviour suffix keeps the suffix', () => {
    // The guarantee Tonio asked for: .model is orthogonal to conventions —
    // Hull_collideMesh.model exports AND collides.
    expect(conventionName('Hull_collideMesh.model')).toBe('Hull_collideMesh')
    expect(conventionName('wall_noshadow.model')).toBe('wall_noshadow')
    expect(conventionName('lake_mirror.model')).toBe('lake_mirror')
    expect(conventionName('ref-ignore.model')).toBe('ref-ignore')
  })

  test('clone names are covered (.model mid-name)', () => {
    expect(conventionName('scout.model_instance_0')).toBe('scout_instance_0')
  })

  test('names without the marker pass through untouched', () => {
    expect(conventionName('Hull_collideMesh')).toBe('Hull_collideMesh')
    expect(conventionName('modelling-table')).toBe('modelling-table') // no dot — not the marker
  })
})
