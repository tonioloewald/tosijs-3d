import { describe, test, expect, beforeAll } from 'bun:test'
import { readFileSync } from 'node:fs'
import { isTextEntry } from './text-entry.js'

/*
WE WERE EATING OTHER PEOPLE'S KEYSTROKES.

`KeyboardGamepad` listens on `window` so you can steer without clicking the
canvas first, and the on-screen keyboard listens there so an in-scene field can
type with no DOM focus — which is the only way it works in a headset. Both then
`preventDefault` the keys they claim.

A page is not only a scene. `a` is a strafe key, so typing "lamp" into the doc
site's nav search lost the character AND strafed the demo while it was typed:

  "I was trying to search nav for lamp and typing (on my iPhone) didn't work.
   Are we somehow preventing regular keyboards from working?"

No DOM here on purpose — the predicate reads properties off whatever it is
given, so it is testable with plain objects and works against elements nobody
has written yet.
*/

/** A minimal stand-in for an element, shaped like the properties we read. */
const el = (
  tagName: string,
  extra: Record<string, unknown> = {}
): Record<string, unknown> => ({
  tagName,
  getAttribute: (n: string) => (extra[`@${n}`] as string) ?? null,
  ...extra,
})

/** An event whose composedPath is the chain given, innermost first. */
const evt = (path: unknown[]): unknown => ({
  target: path[0],
  composedPath: () => path,
})

describe('what counts as typing', () => {
  test('a text input does', () => {
    expect(isTextEntry(evt([el('INPUT', { type: 'text' })]))).toBe(true)
    // Absent `type` means text, which is the default and the common case.
    expect(isTextEntry(evt([el('INPUT')]))).toBe(true)
    expect(isTextEntry(evt([el('input', { type: 'search' })]))).toBe(true)
  })

  test('a textarea and a select do', () => {
    expect(isTextEntry(evt([el('TEXTAREA')]))).toBe(true)
    expect(isTextEntry(evt([el('SELECT')]))).toBe(true)
  })

  test('an input you PRESS does not — a checkbox is not typing', () => {
    /*
    The distinction that matters: space on a checkbox is a press, and a scene
    that wanted space for `jump` should still get it. Claiming every `<input>`
    would have made this a different bug rather than a fix.
    */
    for (const type of ['checkbox', 'radio', 'button', 'submit', 'range']) {
      expect(isTextEntry(evt([el('INPUT', { type })])), type).toBe(false)
    }
  })

  test('contenteditable does', () => {
    expect(isTextEntry(evt([el('DIV', { isContentEditable: true })]))).toBe(
      true
    )
  })

  test('a typing ROLE does, for a widget nobody has written yet', () => {
    expect(isTextEntry(evt([el('DIV', { '@role': 'searchbox' })]))).toBe(true)
    expect(isTextEntry(evt([el('SPAN', { '@role': 'combobox' })]))).toBe(true)
    expect(isTextEntry(evt([el('DIV', { '@role': 'button' })]))).toBe(false)
  })

  test('a canvas does NOT — that is where steering is supposed to work', () => {
    expect(isTextEntry(evt([el('CANVAS')]))).toBe(false)
    expect(isTextEntry(evt([el('BODY')]))).toBe(false)
  })
})

describe('shadow DOM, which is why composedPath comes first', () => {
  test('an input inside a shadow root still counts', () => {
    /*
    `event.target` for one is the HOST element — a custom element, which is not
    an input and matches nothing. A consumer wrapping their own search field in
    a component is not an exotic case, and `target` alone would have called it
    "not typing" and eaten the keystroke.
    */
    const input = el('INPUT', { type: 'text' })
    const hostEl = el('MY-SEARCH')
    const e = { target: hostEl, composedPath: () => [input, hostEl] }
    expect(isTextEntry(e)).toBe(true)
    // ...and `target` alone is exactly what would have missed it.
    expect(isTextEntry({ target: hostEl })).toBe(false)
  })

  test('it stops at the document rather than walking to window', () => {
    const e = evt([el('CANVAS'), { nodeType: 9 }, el('INPUT')])
    expect(isTextEntry(e)).toBe(false)
  })
})

describe('it never throws — a dead listener is worse than a claimed key', () => {
  test('missing or malformed events are simply not typing', () => {
    expect(isTextEntry(null)).toBe(false)
    expect(isTextEntry(undefined)).toBe(false)
    expect(isTextEntry({})).toBe(false)
    expect(isTextEntry({ target: null })).toBe(false)
    expect(isTextEntry({ target: {} })).toBe(false)
  })

  test('a composedPath that throws falls back to the target', () => {
    const input = el('INPUT', { type: 'text' })
    expect(
      isTextEntry({
        target: input,
        composedPath: () => {
          throw new Error('synthetic')
        },
      })
    ).toBe(true)
  })
})

describe('the global listeners actually consult it', () => {
  // `KeyboardGamepadSource extends Component`, so it touches HTMLElement at
  // import — the rest of this file is deliberately DOM-free.
  let KG: typeof import('./keyboard-gamepad.js')
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
    g.document ??= win.document
    KG = await import('./keyboard-gamepad.js')
  })

  /*
  The predicate being right proves nothing about whether anything asks it —
  which is the gap that let this ship. `KeyboardGamepad` is drivable with a
  plain object, so this presses a key "in" a search box and checks the pad did
  not take it.
  */

  test('KeyboardGamepad ignores a key typed into an input', () => {
    const pad: any = new (KG.KeyboardGamepadSource as any)()

    let prevented = 0
    const press = (key: string, target: unknown) =>
      (pad as any)._handleKeyDown({
        key,
        code: `Key${key.toUpperCase()}`,
        target,
        composedPath: () => [target],
        preventDefault: () => prevented++,
      })

    // `keycode` strips the `Key`/`Digit` prefix, so the pad's own name is `A`.
    // On the page at large, `a` is a strafe key and is claimed.
    press('a', { tagName: 'CANVAS' })
    expect(prevented).toBe(1)
    expect(pad.pressedKeys.has('A')).toBe(true)

    pad.pressedKeys.clear()
    prevented = 0

    // In a search box it is a letter, and neither claimed nor steered with.
    press('a', { tagName: 'INPUT', type: 'search', getAttribute: () => null })
    expect(prevented, 'preventDefault stole the character').toBe(0)
    expect(pad.pressedKeys.has('A'), 'typing strafed the demo').toBe(false)
  })

  test('...but a key RELEASE is never ignored', () => {
    /*
    Deliberately unguarded: press on the canvas, click into a field, release —
    if the keyup were ignored the key would stay down and the entity would
    strafe forever. Asserted so a later tidy-up does not "fix" the asymmetry.
    */
    const src = readFileSync(
      new URL('./keyboard-gamepad.ts', import.meta.url).pathname,
      'utf8'
    )
    const up = src.slice(src.indexOf('_handleKeyUp'))
    expect(up.slice(0, 300)).not.toContain('isTextEntry')
  })
})
