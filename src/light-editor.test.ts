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

let mod: typeof import('./light-editor.js')

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
  mod = await import('./light-editor.js')
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

/*
A NESTED WIDGET'S POPUP MUST OPEN BESIDE THE CONTROL, not at the top of its
container.

A widget anchors in ITS OWN coordinates — `select3d` uses `y: 0` for "the top of
my row" — and every container it sits inside owes it a translation. `panel3d`
already did this; `lightEditor3d` and `curveProgram3d` forwarded the host
untouched, so the preset menu opened at the top of the editor.
*/
describe('popup anchoring through a container', () => {
  const hostSpy = () => {
    const opened: Array<{ x: number; y: number }> = []
    const host: any = {
      showPopup: (config: any) => {
        opened.push({ x: config.anchor.x, y: config.anchor.y })
        return { close: () => {} }
      },
      closePopup: () => {},
      relayout: () => {},
      bounds: () => ({ x: 0, y: 0, width: 320, height: 600 }),
      top: () => null,
      hasLayer: () => false,
      showLayer: () => ({ close: () => {} }),
    }
    return { host, opened }
  }

  /** Press the `›` stepper of the Nth select, in editor-local coordinates. */
  const openPresetMenu = (w: any) => {
    const selects = [...w.el.querySelectorAll('[data-w3d="select"]')]
    const sel = selects[selects.length - 1] // preset is the last select
    const t = [...sel.querySelectorAll('text')].find(
      (n: any) => n.textContent === '›'
    )!
    // Walk up to find this row's offset inside the editor.
    const m = /translate\(\s*(-?[\d.]+)[ ,]+(-?[\d.]+)/.exec(
      sel.getAttribute('transform') ?? ''
    )
    const rowY = m ? Number(m[2]) : 0
    // Press the VALUE zone, which is what opens the menu.
    const vx = Number(t.getAttribute('x')) - 40
    w.handle('down', vx, rowY + 22)
    w.handle('up', vx, rowY + 22)
    return rowY
  }

  test('the popup anchor is translated by the row offset', () => {
    const { host, opened } = hostSpy()
    const w = mod.lightEditor3d({})
    w.setHost!(host)
    w.layout!(320)
    const rowY = openPresetMenu(w)
    expect(opened.length).toBeGreaterThan(0)
    // The bug: anchor.y came through as 0 regardless of where the row was.
    expect(rowY).toBeGreaterThan(0)
    expect(opened[0].y).toBeGreaterThanOrEqual(rowY)
  })

  test('it is read at POPUP time, not at wiring time', () => {
    // Offsets come from layout, which happens after setHost — and again on
    // every resize.
    const { host, opened } = hostSpy()
    const w = mod.lightEditor3d({})
    w.setHost!(host)
    w.layout!(320)
    openPresetMenu(w)
    const narrow = opened[0].y
    w.layout!(200) // relayout: rows may move
    opened.length = 0
    const rowY = openPresetMenu(w)
    expect(opened[0].y).toBeGreaterThanOrEqual(rowY)
    expect(Number.isFinite(narrow)).toBe(true)
  })
})
