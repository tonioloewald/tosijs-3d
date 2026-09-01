import { describe, test, expect, beforeAll } from 'bun:test'
import { Window } from 'happy-dom'

let w3d: typeof import('./widgets3d')
let theme: typeof import('./w3d-theme')

beforeAll(async () => {
  const win = new Window() as any
  const g = globalThis as any
  g.window ??= win
  for (const k of Object.getOwnPropertyNames(win)) {
    try { g[k] ??= win[k] } catch { /* off-document getters */ }
  }
  w3d = await import('./widgets3d')
  theme = await import('./w3d-theme')
})

const paintOf = (el: SVGElement, sel: string, attr: string) =>
  el.querySelector(sel)?.getAttribute(attr)

describe('setW3dTheme reaches widgets built AFTER it (#the-theme-demo-did-nothing)', () => {
  test('a colour token changes what a new panel paints', () => {
    // The bug this pins: `const PANEL_BG = w3dTheme.panelBg` at module scope
    // captured the palette at IMPORT, so setW3dTheme could never reach it and
    // a theme editor changed nothing at all.
    const before = paintOf(w3d.panel3d({ width: 200 }), 'rect', 'fill')
    theme.setW3dTheme({ panelBg: '#ff00ff' })
    const after = paintOf(w3d.panel3d({ width: 200 }), 'rect', 'fill')
    expect(after).toBe('#ff00ff')
    expect(after).not.toBe(before)
    theme.setW3dTheme({ panelBg: before! })
  })

  test('text colour too', () => {
    theme.setW3dTheme({ text: '#00ff00' })
    const lbl = w3d.label3d({ text: 'hi' })
    lbl.layout(200)
    expect(paintOf(lbl.el, 'text', 'fill')).toBe('#00ff00')
  })

  test('FONTS are live — the family reaches the rendered text', () => {
    theme.setW3dTheme({ fontFamily: 'Georgia, serif' })
    const lbl = w3d.label3d({ text: 'hi' })
    lbl.layout(200)
    expect(paintOf(lbl.el, 'text', 'font-family')).toBe('Georgia, serif')
  })

  test('METRICS are live — font size reaches the rendered text', () => {
    theme.setW3dTheme({ fontSize: 22 })
    const lbl = w3d.label3d({ text: 'hi' })
    lbl.layout(200)
    expect(Number(paintOf(lbl.el, 'text', 'font-size'))).toBe(22)
    theme.setW3dTheme({ fontSize: 16 })
  })

  test('spacing changes panel layout, not just paint', () => {
    const rows = () => [w3d.button3d({ label: 'a' }), w3d.button3d({ label: 'b' })]
    theme.setW3dTheme({ spacing: 4 })
    const tight = Number(w3d.panel3d({ width: 200, height: 'fit' }, ...rows()).getAttribute('height'))
    theme.setW3dTheme({ spacing: 24 })
    const loose = Number(w3d.panel3d({ width: 200, height: 'fit' }, ...rows()).getAttribute('height'))
    expect(loose).toBeGreaterThan(tight)
    theme.setW3dTheme({ spacing: 8 })
  })

  test('a widget built BEFORE the change keeps its colours', () => {
    // Documented behaviour, not an oversight: widgets bake at construction, so
    // a theme editor must rebuild. Pinned so it stays a decision.
    const panel = w3d.panel3d({ width: 200 })
    const atBuild = paintOf(panel, 'rect', 'fill')
    theme.setW3dTheme({ panelBg: '#123456' })
    expect(paintOf(panel, 'rect', 'fill')).toBe(atBuild!)
    theme.setW3dTheme({ panelBg: atBuild! })
  })
})
