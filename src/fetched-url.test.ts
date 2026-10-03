import { describe, test, expect, beforeAll } from 'bun:test'
import { Window } from 'happy-dom'

/*
A FETCHED ATTRIBUTE MUST BE A STRING (tosijs-3d#95, from ensemble).
`String(["http://evil…"])` is the URL inside the array, so a skybox fetched
it past any consumer rule that only looked at strings.
*/

let u: typeof import('./b3d-utils.js')

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
  u = await import('./b3d-utils.js')
})

describe('fetchedUrl', () => {
  test('a string passes through; empty and missing are none', () => {
    expect(u.fetchedUrl('/sky/stars', 'test a')).toBe('/sky/stars')
    expect(u.fetchedUrl('', 'test a')).toBe('')
    expect(u.fetchedUrl(undefined, 'test a')).toBe('')
    expect(u.fetchedUrl(null, 'test a')).toBe('')
  })
  test('anything else is REFUSED, never stringified', () => {
    expect(u.fetchedUrl(['http://evil.example/x'], 'test b')).toBe('')
    expect(
      u.fetchedUrl({ toString: () => 'http://evil.example/x' }, 'test c')
    ).toBe('')
    expect(u.fetchedUrl(42, 'test d')).toBe('')
  })
})
