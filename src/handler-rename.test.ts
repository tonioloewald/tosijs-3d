import { describe, test, expect, beforeAll } from 'bun:test'
import { Window } from 'happy-dom'

/*
`onX` -> `handleX`, WITH A SHIM.

Not a style preference. These are plain factory functions today, where `onX` is
harmless — but the moment one becomes a tosijs COMPONENT, the element creator
binds an `on*` prop as a DOM event LISTENER and the class field is silently
never called. No error, no warning, a callback that simply never fires.
`handleX` cannot be mistaken for an event name, so the rename removes the trap
rather than documenting it.

Both spellings work through 0.8.x so an adopter is not chasing renames one
widget at a time.
*/

let w: typeof import('./widgets3d')

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
  w = await import('./widgets3d')
})

const press = (widget: any, x = 20, y = 20) => {
  widget.layout(200)
  widget.handle('down', x, y)
  widget.handle('up', x, y)
}

describe('both spellings work', () => {
  test('toggle3d: handleChange and onChange each fire', () => {
    let neu = 0
    let old = 0
    press(w.toggle3d({ label: 'a', value: false, handleChange: () => neu++ }))
    press(w.toggle3d({ label: 'b', value: false, onChange: () => old++ }))
    expect(neu).toBe(1)
    expect(old).toBe(1)
  })

  test('button3d: handleClick and onClick each fire', () => {
    let neu = 0
    let old = 0
    press(w.button3d({ label: 'a', handleClick: () => neu++ }))
    press(w.button3d({ label: 'b', onClick: () => old++ }))
    expect(neu).toBe(1)
    expect(old).toBe(1)
  })

  test('the NEW name wins when both are given', () => {
    // No ambiguity about which fires, and no double-firing.
    let neu = 0
    let old = 0
    press(
      w.button3d({
        label: 'both',
        handleClick: () => neu++,
        onClick: () => old++,
      })
    )
    expect(neu).toBe(1)
    expect(old).toBe(0)
  })
})

describe('the deprecation warning', () => {
  test('fires ONCE per name, not once per call', () => {
    // A slider reads its callback on every pointer move; a warning per frame is
    // a performance bug wearing a helpful hat.
    const seen: string[] = []
    const real = console.warn
    console.warn = (...a: unknown[]) => seen.push(String(a[0]))
    try {
      for (let i = 0; i < 5; i++) {
        press(w.toggle3d({ label: 'x', value: false, onChange: () => {} }))
      }
    } finally {
      console.warn = real
    }
    // Whatever else has warned this run, this name cannot warn five times.
    expect(seen.filter((m) => m.includes('`onChange`')).length).toBeLessThan(2)
  })

  test('names the replacement and the version it goes away in', () => {
    // A deprecation that does not say what to do instead is just noise.
    const seen: string[] = []
    const real = console.warn
    console.warn = (...a: unknown[]) => seen.push(String(a[0]))
    try {
      w.handlerOf(
        { onNeverWarnedBefore: () => {} },
        'handleNeverWarnedBefore',
        'onNeverWarnedBefore'
      )
    } finally {
      console.warn = real
    }
    expect(seen[0]).toContain('handleNeverWarnedBefore')
    expect(seen[0]).toContain('0.9')
  })

  test('nothing warns when only the new name is used', () => {
    const seen: string[] = []
    const real = console.warn
    console.warn = (...a: unknown[]) => seen.push(String(a[0]))
    try {
      press(w.toggle3d({ label: 'y', value: false, handleChange: () => {} }))
    } finally {
      console.warn = real
    }
    expect(seen).toEqual([])
  })
})
