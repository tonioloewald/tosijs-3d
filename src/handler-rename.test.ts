import { describe, test, expect, beforeAll } from 'bun:test'
import { Window } from 'happy-dom'

/*
`onX` -> `handleX`: the old names were REMOVED in 0.10.

Not a style preference. These are plain factory functions today, where `onX` is
harmless — but the moment one becomes a tosijs COMPONENT, the element creator
binds an `on*` prop as a DOM event LISTENER and the class field is silently
never called. `handleX` cannot be mistaken for an event name.

Both spellings worked from 0.8.0 to 0.9.x. What is pinned here is the removal:
the old name is not called, and it is REPORTED, because a callback that is
quietly never called is the bug the rename was for.
*/

let w: typeof import('./widgets3d.js')

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
  w = await import('./widgets3d.js')
})

const press = (widget: any, x = 20, y = 20) => {
  widget.layout(200)
  widget.handle('down', x, y)
  widget.handle('up', x, y)
}

describe('only handleX is called', () => {
  test('toggle3d: handleChange fires, onChange does not', () => {
    let neu = 0
    let old = 0
    press(w.toggle3d({ label: 'a', value: false, handleChange: () => neu++ }))
    press(
      w.toggle3d({ label: 'b', value: false, onChange: () => old++ } as any)
    )
    expect(neu).toBe(1)
    expect(old).toBe(0)
  })

  test('button3d: handleClick fires, onClick does not', () => {
    let neu = 0
    let old = 0
    press(w.button3d({ label: 'a', handleClick: () => neu++ }))
    press(w.button3d({ label: 'b', onClick: () => old++ } as any))
    expect(neu).toBe(1)
    expect(old).toBe(0)
  })
})

describe('the removal warning', () => {
  test('fires ONCE per name, not once per call', () => {
    // A slider reads its callback on every pointer move; a warning per frame is
    // a performance bug wearing a helpful hat.
    const seen: string[] = []
    const real = console.warn
    console.warn = (...a: unknown[]) => seen.push(String(a[0]))
    try {
      for (let i = 0; i < 5; i++) {
        press(
          w.toggle3d({ label: 'x', value: false, onChange: () => {} } as any)
        )
      }
    } finally {
      console.warn = real
    }
    expect(seen.filter((m) => m.includes('`onChange`')).length).toBeLessThan(2)
  })

  test('names the replacement and says the old name is ignored', () => {
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
    expect(seen[0]).toContain('IGNORED')
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
