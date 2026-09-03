import { describe, test, expect, beforeAll } from 'bun:test'
import { Window } from 'happy-dom'

/*
AN EMBEDDED WIDGET OWNS ITS CONTROLS' LABELS AND NOTHING ABOVE THAT.

`lightEditor3d` shipped with "flip it to watch the attack and decay" hard-coded
above its power switch — right for the demo page it was written for, wrong in
every consumer's property panel, and impossible to turn off (tosijs-3d#65).

Titles, ids and explanation belong to whoever PLACED the widget, because only
they know what the thing is called and who is reading.
*/

let mod: typeof import('./light-editor')

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
  mod = await import('./light-editor')
})

const textOf = (w: any) =>
  [...w.el.querySelectorAll('text')].map((n: any) => n.textContent)

describe('the editor emits no prose of its own', () => {
  test('no hint by default', () => {
    const w = mod.lightEditor3d({})
    w.layout!(320)
    const texts = textOf(w)
    expect(texts.some((t: string) => /watch the attack/i.test(t))).toBe(false)
  })

  test('a consumer can opt IN', () => {
    const w = mod.lightEditor3d({ hint: 'flip it to see the fade' })
    w.layout!(320)
    expect(textOf(w)).toContain('flip it to see the fade')
  })

  test('it still labels its own CONTROLS — that part is its business', () => {
    const w = mod.lightEditor3d({})
    w.layout!(320)
    const texts = textOf(w)
    for (const label of ['power', 'type', 'hue', 'intensity']) {
      expect(texts).toContain(label)
    }
  })

  test('the section divider is a name, not a sentence', () => {
    // "program — attack · sustain · decay" explained the model to a reader of
    // our docs. In someone else's panel it is noise.
    const w = mod.lightEditor3d({})
    w.layout!(320)
    const prose = textOf(w).filter((t: string) => t.split(' ').length > 3)
    expect(prose).toEqual([])
  })
})
