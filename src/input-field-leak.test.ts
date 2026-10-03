import { describe, test, expect, beforeAll } from 'bun:test'
import { Window } from 'happy-dom'

/*
inputField MUST NOT LEAK (tosijs-3d#96, from ensemble). Every field put a
repaint closure into a module-level set that was never pruned, and the
closure reaches the field's SVG (and from there its host, scene and engine),
so nothing was ever collected: +4000 DOM nodes per editor visit, measured.
*/

let kb: typeof import('./keyboard.js')

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
  kb = await import('./keyboard.js')
})

describe('inputField and the shared keyboard toggle', () => {
  test('a dropped field is collectable', async () => {
    let collected = 0
    const registry = new FinalizationRegistry(() => collected++)
    const N = 20
    ;(() => {
      for (let i = 0; i < N; i++) {
        const field = kb.inputField({ value: `f${i}` })
        registry.register(field.el, i)
      }
    })()
    for (let i = 0; i < 6 && collected < N; i++) {
      Bun.gc(true)
      await new Promise((r) => setTimeout(r, 20))
    }
    expect(collected).toBeGreaterThan(N / 2)
  })

  test('a live field still follows the shared toggle', () => {
    const field = kb.inputField({ value: 'x' })
    expect(() => kb.setAutoKeyboard(true)).not.toThrow()
    expect(() => kb.setAutoKeyboard(false)).not.toThrow()
    expect(field.value).toBe('x')
  })
})
