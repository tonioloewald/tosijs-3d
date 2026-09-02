/*#
# popup-chrome

**Where a popup's move and close glyphs are drawn, and where pressing counts.**
Pure, in viewBox units — the one place both answers come from.

## Why this is its own module

The first version computed the glyph rectangles in the drawing code and the hit
thresholds in the pointer handler, in different units, and they disagreed:

- the glyph was inset by `pad = (barHeight - glyph) / 2` — a **height**-derived
  value — applied on the **x** axis;
- the close region was `uv.x > 1 - gripHeight * 0.55`, comparing a **width**
  fraction against a **height** fraction.

On a portrait 200×600 panel the × was drawn across `u ∈ [0.655, 0.745]` while
the close region began at `u > 0.89`: **fully disjoint**. Pressing the visible ×
fell through to the drag branch and, because dragging an owned popup tears it
off, **the close button tore the popup off its opener instead of closing it**.
The shipped demo's landscape card happened to be one of the aspects where it
worked, which is exactly why nobody caught it.

Two derivations of the same rectangle will drift. One derivation, used by both,
cannot — so this returns the geometry, the drawing code places glyphs at it, and
the pointer code tests against it.
*/
/*{ "parent": "UI", "order": 900 }*/

/** A rectangle in viewBox units. */
export interface ChromeRect {
  x: number
  y: number
  size: number
}

export interface ChromeLayout {
  /** Title-bar height in viewBox units. `0` when there is no bar. */
  barHeight: number
  /** Where the move glyph goes (left of the bar), or null if not draggable. */
  move: ChromeRect | null
  /** Where the close glyph goes (right of the bar). */
  close: ChromeRect
  /**
   * Left edge of the close TARGET — everything right of this closes.
   *
   * Separate from `close.x` because the glyph is drawn small and the target must
   * not follow it down: a shrunken × on a controller ray is a miss waiting to
   * happen. At least as wide as the bar is tall.
   */
  closeHitX: number
}

/**
 * Lay out the title bar's glyphs.
 *
 * Both insets are derived from the BAR HEIGHT and applied on both axes, so a
 * glyph is square and sits the same distance from the top as from its edge —
 * which is what makes the hit regions below expressible as plain rectangles.
 */
export function chromeLayout(
  vbWidth: number,
  vbHeight: number,
  gripHeight: number,
  draggable = true
): ChromeLayout {
  const barHeight = Math.max(0, Math.min(1, gripHeight)) * vbHeight
  // Bounded by the bar AND the width: a tall grip on a narrow panel would
  // otherwise size the glyphs off the ends.
  /*
  Glyph size, and it is deliberately modest.

  Was `barHeight * 0.62`. Tonio, once the chrome was legible in the scene: "make
  the affordances about 75% the size and a smidge closer to the corners." Chrome
  is not the content — it should be findable and then get out of the way, and
  the HIT region is set separately below, so shrinking the glyph costs no
  targeting accuracy.
  */
  const size = Math.max(0, Math.min(barHeight * 0.62 * 0.75, vbWidth / 4))
  /*
  TWO INSETS, because they answer different questions. The vertical one CENTRES
  the glyph in the bar; the horizontal one is a margin from the edge, and it has
  to leave room for the other glyph.

  Using the vertical inset on both axes is what broke first: on a 120-wide panel
  with a 300-tall bar it came out at 130, putting the close glyph at x = -50 —
  outside the panel entirely. Height told the width where to sit.
  */
  /*
  Tucked toward the corners: 60% of the centring inset rather than all of it.

  Centring the glyph in the bar was correct and read as floaty — a corner
  affordance wants to look anchored to its corner. Still an inset rather than
  flush, because a glyph touching the edge reads as clipped.
  */
  const CORNER_PULL = 0.6
  const insetY = ((barHeight - size) / 2) * CORNER_PULL
  const insetX = Math.max(0, Math.min(insetY, (vbWidth - 2 * size) / 3))
  /*
  The close TARGET, sized independently of the glyph.

  At least as wide as the bar is tall — a roughly square target at the corner,
  which is what a finger or a ray needs regardless of how small the × is drawn.
  */
  const closeX = vbWidth - size - insetX
  const closeHitX = Math.min(closeX, vbWidth - Math.max(barHeight, size * 2))
  return {
    barHeight,
    closeHitX,
    move: draggable ? { x: insetX, y: insetY, size } : null,
    close: { x: closeX, y: insetY, size },
  }
}

/** What a press at these viewBox coordinates means. */
export type ChromeHit = 'close' | 'drag' | 'content'

/**
 * Classify a press, in the SAME units the layout is expressed in.
 *
 * The close region is the glyph's rectangle GROWN to the full bar height and
 * out to the panel edge — a target you can hit, rather than one that demands
 * you land on the glyph itself. Everything else in the bar drags; everything
 * below the bar is the panel's own content and must reach it untouched, or a
 * popup could never contain a button.
 */
export function chromeHit(
  x: number,
  y: number,
  layout: ChromeLayout
): ChromeHit {
  if (layout.barHeight <= 0) return 'drag' // no bar: the whole panel drags
  if (y > layout.barHeight) return 'content'
  // The TARGET, not the glyph — see `closeHitX`.
  if (x >= layout.closeHitX) return 'close'
  return 'drag'
}

/**
 * Convert a texture coordinate to viewBox coordinates.
 *
 * UV `v` runs from the BOTTOM, SVG `y` from the top — the flip that makes a
 * title bar land at the bottom of the panel if you forget it.
 */
export function uvToViewBox(
  u: number,
  v: number,
  vbWidth: number,
  vbHeight: number
): { x: number; y: number } {
  return { x: u * vbWidth, y: (1 - v) * vbHeight }
}
