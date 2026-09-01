import { describe, test, expect, beforeAll } from 'bun:test'
import { Window } from 'happy-dom'

let w3d: typeof import('./widgets3d')
let theme: typeof import('./w3d-theme')

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
    const rows = () => [
      w3d.button3d({ label: 'a' }),
      w3d.button3d({ label: 'b' }),
    ]
    theme.setW3dTheme({ spacing: 4 })
    const tight = Number(
      w3d
        .panel3d({ width: 200, height: 'fit' }, ...rows())
        .getAttribute('height')
    )
    theme.setW3dTheme({ spacing: 24 })
    const loose = Number(
      w3d
        .panel3d({ width: 200, height: 'fit' }, ...rows())
        .getAttribute('height')
    )
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

describe('withTheme — one default, per-panel overrides', () => {
  const bgOf = (el: SVGElement) => el.querySelector('rect')?.getAttribute('fill')

  test('a panel built inside the scope differs from one built outside', () => {
    const normal = w3d.panel3d({ width: 200 })
    const warning = theme.withTheme({ panelBg: '#6b2323' }, () =>
      w3d.panel3d({ width: 200 })
    )
    expect(bgOf(warning)).toBe('#6b2323')
    expect(bgOf(normal)).not.toBe('#6b2323')
  })

  test('THE POINT: children built as arguments are inside the scope too', () => {
    // This is why the override is a wrapper and not `panel3d({theme})` — the
    // children evaluate as arguments, so an option on the panel would recolour
    // the panel and leave its contents on the default.
    const lbl = theme.withTheme({ text: '#abcdef' }, () => {
      const l = w3d.label3d({ text: 'scoped' })
      l.layout(200)
      return l
    })
    expect(lbl.el.querySelector('text')?.getAttribute('fill')).toBe('#abcdef')
  })

  test('the default is restored afterwards', () => {
    const before = theme.w3dTheme.panelBg
    theme.withTheme({ panelBg: '#000fff' }, () => w3d.panel3d({ width: 100 }))
    expect(theme.w3dTheme.panelBg).toBe(before)
  })

  test('and restored even when the build THROWS', () => {
    // A theme that silently persists after an error is the worst version of
    // this bug: the next widget looks wrong for no visible reason.
    const before = theme.w3dTheme.accent
    expect(() =>
      theme.withTheme({ accent: '#ff0000' }, () => {
        throw new Error('boom')
      })
    ).toThrow('boom')
    expect(theme.w3dTheme.accent).toBe(before)
  })

  test('scopes nest, and only the overridden keys are touched', () => {
    const before = { ...theme.w3dTheme }
    theme.withTheme({ accent: '#111111' }, () => {
      theme.withTheme({ text: '#222222' }, () => {
        expect(theme.w3dTheme.accent).toBe('#111111')
        expect(theme.w3dTheme.text).toBe('#222222')
      })
      // inner scope restored, outer still in force
      expect(theme.w3dTheme.text).toBe(before.text)
      expect(theme.w3dTheme.accent).toBe('#111111')
    })
    expect(theme.w3dTheme.accent).toBe(before.accent)
  })
})

describe('padding and lineHeight reach CONTROLS, not just text', () => {
  const heightOf = (w: { layout: (n: number) => number }) => w.layout(240)

  test('padding makes a button taller', () => {
    // Both were fixed constants (ROW 40, PAD_X 12), so neither token could
    // affect a button or a field: "lineHeight doesn't seem to have any effect.
    // We also need a padding value that makes buttons and fields more spacious."
    theme.setW3dTheme({ padding: 4 })
    const tight = heightOf(w3d.button3d({ label: 'x' }))
    theme.setW3dTheme({ padding: 20 })
    const roomy = heightOf(w3d.button3d({ label: 'x' }))
    expect(roomy).toBeGreaterThan(tight)
    theme.setW3dTheme({ padding: 12 })
  })

  test('lineHeight does too', () => {
    theme.setW3dTheme({ lineHeight: 1 })
    const tight = heightOf(w3d.button3d({ label: 'x' }))
    theme.setW3dTheme({ lineHeight: 2 })
    const tall = heightOf(w3d.button3d({ label: 'x' }))
    expect(tall).toBeGreaterThan(tight)
    theme.setW3dTheme({ lineHeight: 1.35 })
  })

  test('padding and spacing are DIFFERENT things', () => {
    // padding is inside a control, spacing is the gap between them — a dense
    // inspector wants small padding and comfortable spacing, so one number
    // cannot serve both.
    const rows = () => [w3d.button3d({ label: 'a' }), w3d.button3d({ label: 'b' })]
    theme.setW3dTheme({ padding: 12, spacing: 2 })
    const tightGaps = Number(w3d.panel3d({ width: 240, height: 'fit' }, ...rows()).getAttribute('height'))
    theme.setW3dTheme({ padding: 12, spacing: 24 })
    const looseGaps = Number(w3d.panel3d({ width: 240, height: 'fit' }, ...rows()).getAttribute('height'))
    expect(looseGaps).toBeGreaterThan(tightGaps)
    theme.setW3dTheme({ spacing: 8 })
  })
})

describe('strokeWidth reaches ICONS, not only the caret', () => {
  test('an icon glyph takes its stroke width from the theme', async () => {
    const { iconGlyph } = await import('./svg-icons')
    theme.setW3dTheme({ strokeWidth: 1 })
    const thin = iconGlyph('plus', { size: 24 })
    theme.setW3dTheme({ strokeWidth: 5 })
    const thick = iconGlyph('plus', { size: 24 })
    // The width lands on the returned <g>, not inside the markup.
    const widthOf = (g: SVGGElement) => g.getAttribute('stroke-width')
    expect(widthOf(thin)).toBe('1')
    expect(widthOf(thick)).toBe('5')
    theme.setW3dTheme({ strokeWidth: 2 })
  })

  test('an explicit option still wins over the theme', async () => {
    const { iconGlyph } = await import('./svg-icons')
    theme.setW3dTheme({ strokeWidth: 5 })
    const g = iconGlyph('plus', { size: 24, strokeWidth: 1 })
    expect(g.getAttribute('stroke-width')).toBe('1')
    theme.setW3dTheme({ strokeWidth: 2 })
  })
})
