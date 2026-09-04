import { describe, test, expect, beforeAll } from 'bun:test'
let T: typeof import('./w3d-theme.js')

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
  T = await import('./w3d-theme.js')
})

describe('w3dTheme — the tokens a themed SVG UI needs', () => {
  test('every requested token exists', () => {
    const want = [
      'panelBg',
      'text',
      'accent',
      'rowHover',
      'buttonHover',
      'focus',
      'selectedBg',
      'disabledBg',
      'disabledText',
      'strokeWidth',
      'fontFamily',
      'textWeight',
      'codeFontFamily',
      'codeFontWeight',
      'roundedRadius',
      'spacing',
      'lineHeight',
      'overlay',
      'divider',
      'placeholder',
      'caret',
    ]
    for (const k of want) expect(T.w3dTheme).toHaveProperty(k)
  })

  test('the four interaction states are DISTINCT values', () => {
    // They must stay tellable apart — that is why they are separate tokens
    // rather than one "highlight". Collapsing any two makes a focused row and
    // a selected row indistinguishable, which is worse than neither.
    const { rowHover, focus, selectedBg, disabledBg } = T.w3dTheme
    expect(new Set([rowHover, focus, selectedBg, disabledBg]).size).toBe(4)
  })

  test('numeric tokens are numbers, not strings', () => {
    // A string here silently produces `rx="6px6"`-style garbage downstream.
    for (const k of [
      'strokeWidth',
      'roundedRadius',
      'spacing',
      'lineHeight',
      'fontSize',
    ] as const) {
      expect(typeof T.w3dTheme[k]).toBe('number')
      expect(Number.isFinite(T.w3dTheme[k])).toBe(true)
    }
  })

  test('setW3dTheme overrides at runtime — what a theme editor needs', () => {
    const before = T.w3dTheme.accent
    T.setW3dTheme({ accent: '#ff00ff', roundedRadius: 12 })
    expect(T.w3dTheme.accent).toBe('#ff00ff')
    expect(T.w3dTheme.roundedRadius).toBe(12)
    T.setW3dTheme({ accent: before, roundedRadius: 6 })
    expect(T.w3dTheme.accent).toBe(before)
  })

  test('a partial override leaves everything else alone', () => {
    const text = T.w3dTheme.text
    T.setW3dTheme({ accent: '#123456' })
    expect(T.w3dTheme.text).toBe(text)
  })
})
