/*#
# w3d-theme

The **one** place the `--w3d-*` theme variables are read. Every SVG-UI module
(widgets3d, keyboard, table, …) draws from this table instead of re-typing the
variable names and fallback literals — three drifting copies of this block is
exactly how a themed color ends up wrong in one widget only (caught by the
0.6.0 review).

**Values are resolved ONCE, at module load, in JS — deliberately.** These
surfaces rasterize onto 3D textures via `XMLSerializer`, where a literal
`var(--w3d-text)` in a serialized attribute resolves against *nothing* and
paints black. Reading the computed value at load and baking the literal into
the SVG is what makes the same markup render identically in the DOM and on a
plane. The cost: the theme is not live-reactive to later JS changes — restyle
before the bundle loads (tosijs's `vars`/`StyleSheet` at startup is fine).
*/
/*{ "parent": "UI", "order": 900 }*/

const rootStyle =
  typeof document !== 'undefined'
    ? getComputedStyle(document.documentElement)
    : null

/** Read a CSS variable's computed value, falling back when absent/headless. */
export const cssVar = (name: string, fallback: string): string => {
  const v = rootStyle?.getPropertyValue(name).trim()
  return v ? v : fallback
}

/**
 * The `--w3d-*` theme, resolved at load. One object so a consumer (or a test)
 * can see the whole palette in one place; individual constants below for the
 * common destructure.
 */
export const w3dTheme = {
  fontSize: parseFloat(cssVar('--w3d-font-size', '16')) || 16,
  fontFamily: cssVar('--w3d-font-family', 'system-ui, sans-serif'),
  text: cssVar('--w3d-text', '#f0f0f0'),
  muted: cssVar('--w3d-muted', '#9aa0a6'),
  headingWeight: cssVar('--w3d-heading-weight', '700'),
  textWeight: cssVar('--w3d-text-weight', '400'),
  panelBg: cssVar('--w3d-panel-bg', 'rgba(20,22,28,0.94)'),
  buttonBg: cssVar('--w3d-button-bg', '#2a2f3a'),
  buttonHover: cssVar('--w3d-button-hover', '#333b49'),
  buttonActive: cssVar('--w3d-button-active', '#3a4150'),
  track: cssVar('--w3d-track', '#3a3f4a'),
  accent: cssVar('--w3d-accent', '#39c5ff'),
  rowBg: cssVar('--w3d-row-bg', 'rgba(255,255,255,0.05)'),
  rowHover: cssVar('--w3d-row-hover', 'rgba(255,255,255,0.13)'),
} as const
