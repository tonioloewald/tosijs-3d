import { describe, test, expect, beforeAll } from 'bun:test'
import { Window } from 'happy-dom'

let te: typeof import('./theme-editor')
let theme: typeof import('./w3d-theme')

beforeAll(async () => {
  const win = new Window() as any
  const g = globalThis as any
  g.window ??= win
  for (const k of Object.getOwnPropertyNames(win)) {
    try { g[k] ??= win[k] } catch { /* off-document getters */ }
  }
  te = await import('./theme-editor')
  theme = await import('./w3d-theme')
})

describe('themeEditor — injected colour controls', () => {
  test('a control that calls back with a STRING sets the token', () => {
    let fire: ((v: unknown) => void) | null = null
    te.themeEditor({
      colours: ['accent'],
      metrics: [],
      colorInput: ({ onChange }) => {
        fire = onChange as (v: unknown) => void
        return document.createElement('span')
      },
    })
    fire!('#ff0000')
    expect(theme.w3dTheme.accent).toBe('#ff0000')
  })

  test('a control that calls back with a DOM EVENT also works', () => {
    // The bug: a tosijs Component binds `on*` as an event listener, so an
    // injected colorInput calls back with an Event. Setting a token to an event
    // object throws nothing — it stringifies, fails to parse, and the widget
    // paints BLACK. Silent, and looks like a theme bug rather than a wiring one.
    let fire: ((v: unknown) => void) | null = null
    te.themeEditor({
      colours: ['accent'],
      metrics: [],
      colorInput: ({ onChange }) => {
        fire = onChange as (v: unknown) => void
        return document.createElement('span')
      },
    })
    fire!({ target: { value: '#00ff00' } })
    expect(theme.w3dTheme.accent).toBe('#00ff00')
  })

  test('garbage is IGNORED rather than written as a colour', () => {
    theme.setW3dTheme({ accent: '#123456' })
    let fire: ((v: unknown) => void) | null = null
    te.themeEditor({
      colours: ['accent'],
      metrics: [],
      colorInput: ({ onChange }) => {
        fire = onChange as (v: unknown) => void
        return document.createElement('span')
      },
    })
    for (const junk of [null, undefined, {}, 42, '']) fire!(junk)
    expect(theme.w3dTheme.accent).toBe('#123456')
  })
})

describe('themeEditor — structure', () => {
  test('titled, and every metric gets a slider AND a number field', () => {
    const el = te.themeEditor({ colours: [], metrics: [['spacing', 0, 20, 1]] })
    expect(el.querySelector('h3')?.textContent).toBe('Theme Editor')
    expect(el.querySelectorAll('input[type=range]')).toHaveLength(1)
    expect(el.querySelectorAll('input[type=number]')).toHaveLength(1)
  })

  test('the pair stays in sync — two things must not both claim to be the value', () => {
    const el = te.themeEditor({ colours: [], metrics: [['spacing', 0, 20, 1]] })
    // Attach before dispatching — tosijs wires listeners on connect, so an
    // unmounted control receives events and does nothing.
    document.body.append(el)
    const range = el.querySelector('input[type=range]') as HTMLInputElement
    const num = el.querySelector('input[type=number]') as HTMLInputElement
    num.value = '17'
    // happy-dom rejects a foreign Event class, so take it from the document's
    // own view rather than globalThis.
    const W = num.ownerDocument.defaultView as any
    num.dispatchEvent(new W.Event('change'))
    expect(range.value).toBe('17')
    expect(theme.w3dTheme.spacing).toBe(17)
    theme.setW3dTheme({ spacing: 8 })
  })

  test('title can be suppressed', () => {
    expect(te.themeEditor({ title: '', colours: [], metrics: [] }).querySelector('h3')).toBe(null)
  })
})
