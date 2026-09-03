/*#
# widgets3d-layout

Pure layout math for [[widgets3d]] — no tosijs, no DOM, no Babylon, so it is
directly unit-testable. The widget collection imports these helpers to stack
its children and decide when a panel must scroll.

The layout model: a container has a fixed content width. It hands that width to
each child, each child reports the height it needs, and the container stacks
them top-to-bottom with a gap. If the stack is taller than the viewport, the
container scrolls.

## Example

Pure helpers [widgets3d](?widgets3d.ts) calls internally — no scene of their own:

```javascript
import { stackLayout, measureTextWrap, cssFont } from 'tosijs-3d'

// stackLayout(children, opts) → arranges a column: each child reports its height, they stack
// top-to-bottom with a gap, and it returns the total height (+ whether it overflows → scroll).
//
// measureTextWrap(text, width, cssFont(spec)) → breaks a paragraph into lines by REAL glyph
// measurement (canvas measureText), not a guessed character count, so an SVG panel wraps where
// the text actually overflows. See <tosi-b3d-panel> / widgets3d for the assembled panels.
```
*/
/*{ "parent": "UI", "order": 900 }*/

/** Vertical stack result: the y offset of each child and the total height. */
export type StackLayout = { offsets: number[]; total: number }

/**
 * Stack `heights` top-to-bottom separated by `gap`. offsets[i] is the y of
 * child i; total is the full content height (no trailing gap).
 */
export function stackLayout(heights: number[], gap: number): StackLayout {
  const offsets: number[] = []
  let y = 0
  for (let i = 0; i < heights.length; i++) {
    offsets.push(y)
    y += heights[i]
    if (i < heights.length - 1) y += gap
  }
  return { offsets, total: y }
}

/** Clamp a scroll offset to [0, max] where max = content beyond the viewport. */
/** One column of a row: where it starts and how wide it is. */
export interface RowColumn {
  x: number
  width: number
}

/**
 * Split a row's width into columns.
 *
 * `weights` are proportional shares of the space left after the gaps; omit it
 * (or pass all-zero) for equal columns. A negative or zero total weight falls
 * back to equal rather than dividing by zero — a row that renders wrong is
 * better than a row that renders `NaN`, which propagates into every downstream
 * coordinate and takes the whole panel with it.
 *
 * Exists because a panel that only stacks makes a label-and-field pair cost two
 * rows: the ensemble editor's eight fields became sixteen rows of mostly
 * whitespace (tosijs-3d#37, item 5).
 */
export function rowColumns(
  width: number,
  count: number,
  gap: number,
  weights?: number[]
): RowColumn[] {
  if (count <= 0) return []
  const usable = Math.max(0, width - gap * (count - 1))
  const w =
    weights != null && weights.length === count
      ? weights.map((v) => (Number.isFinite(v) && v > 0 ? v : 0))
      : []
  const totalWeight = w.reduce((a, b) => a + b, 0)
  const shares =
    totalWeight > 0
      ? w.map((v) => v / totalWeight)
      : Array(count).fill(1 / count)
  const out: RowColumn[] = []
  let x = 0
  for (let i = 0; i < count; i++) {
    const cw = usable * shares[i]
    out.push({ x, width: cw })
    x += cw + gap
  }
  return out
}

/**
 * Vertical offset for a child of `childHeight` inside a row of `rowHeight`.
 *
 * `'middle'` is the default because the common case is a short label beside a
 * taller control, and top-aligning those makes the label look detached from the
 * thing it names.
 */
export function alignOffset(
  rowHeight: number,
  childHeight: number,
  align: 'top' | 'middle' | 'bottom' = 'middle'
): number {
  if (align === 'top') return 0
  const slack = Math.max(0, rowHeight - childHeight)
  return align === 'bottom' ? slack : slack / 2
}

/** What a panel's content needs versus what it can show. */
export interface PanelFit {
  /** Total height of the stacked content, in viewBox units. */
  content: number
  /** Height actually visible between the paddings. */
  viewport: number
  /** How much is hidden. `0` when everything fits. */
  overflow: number
  /** True when nothing is clipped. */
  fits: boolean
}

/**
 * Measure content against viewport.
 *
 * Exists because **clipping is silent**: a panel too short for its content
 * looks exactly like a panel whose last control was never added, so every
 * height ends up a hand-tuned constant that is wrong the moment the content
 * changes. Reported by the ensemble editor, which got three heights wrong in
 * one sitting — a command hidden behind another panel, an option cut in half,
 * a list showing five of eight rows — and noticed none of them at the time.
 */
export function panelFit(content: number, viewport: number): PanelFit {
  const over = content - viewport
  return {
    content,
    viewport,
    overflow: over > 0 ? over : 0,
    fits: over <= 0,
  }
}

/**
 * The height a panel should be, given what it contains.
 *
 * `requested` is a number to honour it, or `'fit'` to size to the content.
 * `'fit'` is clamped by `maxHeight` when given, so a panel that outgrows its
 * space scrolls rather than growing without bound — fitting and scrolling are
 * the same mechanism seen from either side of that limit, not two modes.
 */
export function panelHeight(
  contentTotal: number,
  paddingTop: number,
  padding: number,
  requested: number | 'fit' = 'fit',
  maxHeight?: number
): number {
  if (typeof requested === 'number') return requested
  const needed = contentTotal + paddingTop + padding
  return maxHeight != null && needed > maxHeight ? maxHeight : needed
}

export function clampScroll(
  offset: number,
  contentHeight: number,
  viewportHeight: number
): number {
  const max = Math.max(0, contentHeight - viewportHeight)
  return Math.min(Math.max(offset, 0), max)
}

/**
 * Greedy word-wrap by a fixed average `charWidth` (px). **Deprecated** — a single
 * average width both clips (a `W` is far wider than an `i`) and wastes space (you
 * pad the average up to be safe). Prefer `wrapByMeasure` / `measureTextWrap`, which
 * measure the actual glyphs. Kept for callers that genuinely only have an average.
 */
export function wrapText(
  text: string,
  maxWidth: number,
  charWidth: number
): string[] {
  return wrapByMeasure(text, maxWidth, (s) => s.length * charWidth)
}

/**
 * Greedy word-wrap against a **measure** function (the pixel width of a string).
 *
 * This is the pure core: pass any measurer — a real canvas (`textMeasurer`) in the
 * browser, or a synthetic one (`s => s.length`) in a test. Honest boundary, on the
 * record so nobody mistakes it for a real text engine: it breaks on **whitespace
 * only** (no hyphenation, no CJK mid-run breaks) and does **not** reorder bidi. That
 * is genuinely enough for LTR UI chrome and nothing more — because the truly hard
 * layers (glyph shaping, kerning) are done for you by whatever measurer you pass, and
 * bidi is absent as long as the text is left-to-right.
 *
 * Respects explicit newlines (each `\n` is a hard break). A single word wider than
 * the line is kept whole — it overflows rather than vanishing. Always ≥1 line.
 */
export function wrapByMeasure(
  text: string,
  maxWidth: number,
  measure: (s: string) => number
): string[] {
  const out: string[] = []
  for (const para of text.split('\n')) {
    const words = para.split(/\s+/).filter(Boolean)
    if (words.length === 0) {
      out.push('')
      continue
    }
    let current = ''
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word
      if (current === '' || measure(candidate) <= maxWidth) {
        current = candidate
      } else {
        out.push(current)
        current = word
      }
    }
    out.push(current)
  }
  return out.length > 0 ? out : ['']
}

/** A font, enough to measure and to stamp matching `font-*` attributes on `<text>`. */
export interface FontSpec {
  size: number
  family?: string
  weight?: string | number
  style?: string
}

/** CSS `font` shorthand for a spec — what `canvas.measureText` needs on `ctx.font`. */
export function cssFont(f: FontSpec): string {
  const style = f.style ? `${f.style} ` : ''
  const weight = f.weight != null ? `${f.weight} ` : ''
  return `${style}${weight}${f.size}px ${f.family ?? 'system-ui, sans-serif'}`
}

// One shared offscreen 2D context measures every string — the canvas text engine IS
// the same shaper HTML uses, so this isn't an approximation, it's the real width
// (kerning, ligatures, proportional glyphs and all). `undefined` = not tried yet,
// `null` = no canvas here (headless/test), so callers fall back to an estimate.
let _measureCtx: CanvasRenderingContext2D | null | undefined

function measureContext(): CanvasRenderingContext2D | null {
  if (_measureCtx !== undefined) return _measureCtx
  try {
    const c =
      typeof document !== 'undefined' ? document.createElement('canvas') : null
    _measureCtx = (c?.getContext('2d') as CanvasRenderingContext2D) ?? null
  } catch {
    _measureCtx = null
  }
  return _measureCtx
}

/**
 * A measurer for a font: `(string) => width` in the **same units as `font.size`**.
 *
 * Measure in your LAYOUT space (SVG user units), NOT the rasterised texture space —
 * so the wrap is resolution-independent and bumping the texture from 384 to 512 px
 * doesn't silently re-wrap every label. Sets `ctx.font` on each call (cheap, and safe
 * against two measurers sharing the one context). Falls back to a crude average width
 * where there's no canvas (headless), so this never throws.
 */
export function textMeasurer(font: FontSpec): (s: string) => number {
  const ctx = measureContext()
  if (ctx) {
    const f = cssFont(font)
    return (s) => {
      ctx.font = f
      return ctx.measureText(s).width
    }
  }
  const avg = font.size * 0.56
  return (s) => s.length * avg
}

/** Wrap `text` to `maxWidth` (layout units) using real glyph measurement. */
export function measureTextWrap(
  text: string,
  maxWidth: number,
  font: FontSpec
): string[] {
  return wrapByMeasure(text, maxWidth, textMeasurer(font))
}

/** Measured width of the widest line in `text` — for sizing a box to its content. */
export function measureTextWidth(text: string, font: FontSpec): number {
  const measure = textMeasurer(font)
  let max = 0
  for (const line of text.split('\n')) max = Math.max(max, measure(line))
  return max
}

/** Map a value in [min, max] to a 0..1 fraction (clamped, step-snapped). */
/**
 * How a slider's travel maps to its value.
 *
 * `log` exists because a range like intensity 0..1000 puts everything below 1
 * in the first thousandth of the track — you cannot set 0.5, and the values
 * people actually reach for are the ones the control cannot express. Tonio, on
 * the light editor: _"the intensity slider goes from 0 to 1000 with very little
 * wiggle-room in 0-1."_
 *
 * On a log scale each DECADE gets equal travel, so 0.01→0.1 is as easy to hit
 * as 100→1000.
 */
export type SliderScale = 'linear' | 'log' | 'log2'

/**
 * The base a log scale's STEP is measured in — and only its step.
 *
 * The position mapping is base-independent: `log_b(x) = ln(x)/ln(b)`, so the
 * base cancels in the fraction. `log` and `log2` therefore put the handle in
 * exactly the same place; they differ only in what one `step` means — a DECADE
 * versus an OCTAVE. Which is the useful distinction: `log2` with `step: 1`
 * gives you 1, 2, 4, 8, 16 — grid sizes, texture sizes, buffer counts.
 */
const logBase = (scale: SliderScale): number => (scale === 'log2' ? 2 : 10)

/**
 * A log scale has no meaning at or below zero, so a bad range falls back to
 * linear rather than producing NaN. A slider that silently stops working is
 * worse than one that is merely the wrong shape.
 */
const useLog = (scale: SliderScale, min: number, max: number): boolean =>
  (scale === 'log' || scale === 'log2') && min > 0 && max > min

export function valueToFraction(
  value: number,
  min: number,
  max: number,
  scale: SliderScale = 'linear'
): number {
  if (max <= min) return 0
  if (useLog(scale, min, max)) {
    const f =
      (Math.log(Math.max(min, value)) - Math.log(min)) /
      (Math.log(max) - Math.log(min))
    return Math.min(1, Math.max(0, f))
  }
  return Math.min(1, Math.max(0, (value - min) / (max - min)))
}

/**
 * Inverse of valueToFraction, snapped to `step` (0 = continuous).
 *
 * On a LOG scale `step` is in **decades**, not in units — a step of 1 gives you
 * 0.01, 0.1, 1, 10; a step of 0.5 gives half-decades. Units would be
 * meaningless here, since a fixed increment is enormous at one end of the range
 * and invisible at the other, which is the problem the log scale exists to fix.
 */
export function fractionToValue(
  fraction: number,
  min: number,
  max: number,
  step = 0,
  scale: SliderScale = 'linear',
  snap = 0
): number {
  const clamped = Math.min(1, Math.max(0, fraction))
  let out: number
  if (useLog(scale, min, max)) {
    const b = logBase(scale)
    const lo = Math.log(min) / Math.log(b)
    const hi = Math.log(max) / Math.log(b)
    let e = lo + clamped * (hi - lo)
    if (step > 0) e = Math.round(e / step) * step
    /*
    Exponentiating a float leaves noise — 0.01 comes back as
    0.010000000000000009 and 1000 as 999.999999999999. Harmless on screen,
    NOT harmless in a document: these are values a consumer serialises and
    diffs, and the same slider position would produce different bytes on
    different runs. Twelve significant digits is far beyond any control's
    resolution and lands exactly on the round numbers a log scale is made of.
    */
    out = Number((b ** Math.min(hi, Math.max(lo, e))).toPrecision(12))
  } else {
    out = min + clamped * (max - min)
    if (step > 0) out = Math.round((out - min) / step) * step + min
  }
  /*
  `snap` quantises the VALUE, after the scale has been applied — which is a
  different question from `step`, and both are wanted.

  `step` asks "how far does one notch move me", in the scale's own units:
  octaves on log2, so `step: 1` walks 1, 2, 4, 8. `snap` asks "what values are
  legal at all", in plain units: `snap: 1` keeps a grid size a whole number
  however it was reached. Tonio wanted both — "a log 2 scale that snaps to
  integers for grid size".

  Clamped afterwards, because rounding at the top of a range can overshoot it.
  */
  if (snap > 0) out = Math.round(out / snap) * snap
  return Math.min(max, Math.max(min, out))
}

/**
 * How wide a camera-relative panel may be, in world units, to stay on screen.
 *
 * A constant chosen on a desktop is too wide on a phone held upright: at the
 * default ~0.8 rad vertical FOV a portrait viewport shows only ~0.86 units
 * across at z=2.2, so a 1.1-wide panel puts its edges — and its buttons — off
 * screen. That shipped, and the report was "I had to un-zoom to touch the
 * button" (tosijs-3d, 2026-08-15).
 *
 * Shared because there are two of these panels (pause, death) and a number
 * copied into both is a number that will disagree with itself later.
 *
 * @param fov vertical field of view in radians
 * @param aspect viewport width / height
 * @param z distance from the camera
 * @param want the width you'd use if there were room
 * @param fill fraction of the visible width to occupy
 */
export function panelFitWidth(
  fov: number,
  aspect: number,
  z: number,
  want: number,
  fill = 0.8
): number {
  const visibleHeight = 2 * z * Math.tan(fov / 2)
  return Math.min(want, visibleHeight * aspect * fill)
}
