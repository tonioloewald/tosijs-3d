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
/*{ "parent": "UI", "order": 420 }*/
/**
 * Lay out the title bar's glyphs.
 *
 * Both insets are derived from the BAR HEIGHT and applied on both axes, so a
 * glyph is square and sits the same distance from the top as from its edge —
 * which is what makes the hit regions below expressible as plain rectangles.
 */
export function chromeLayout(vbWidth, vbHeight, gripHeight, draggable = true) {
    const barHeight = Math.max(0, Math.min(1, gripHeight)) * vbHeight;
    // Bounded by the bar AND the width: a tall grip on a narrow panel would
    // otherwise size the glyphs off the ends.
    const size = Math.max(0, Math.min(barHeight * 0.62, vbWidth / 4));
    /*
    TWO INSETS, because they answer different questions. The vertical one CENTRES
    the glyph in the bar; the horizontal one is a margin from the edge, and it has
    to leave room for the other glyph.
  
    Using the vertical inset on both axes is what broke first: on a 120-wide panel
    with a 300-tall bar it came out at 130, putting the close glyph at x = -50 —
    outside the panel entirely. Height told the width where to sit.
    */
    const insetY = (barHeight - size) / 2;
    const insetX = Math.max(0, Math.min(insetY, (vbWidth - 2 * size) / 3));
    return {
        barHeight,
        move: draggable ? { x: insetX, y: insetY, size } : null,
        close: { x: vbWidth - size - insetX, y: insetY, size },
    };
}
/**
 * Classify a press, in the SAME units the layout is expressed in.
 *
 * The close region is the glyph's rectangle GROWN to the full bar height and
 * out to the panel edge — a target you can hit, rather than one that demands
 * you land on the glyph itself. Everything else in the bar drags; everything
 * below the bar is the panel's own content and must reach it untouched, or a
 * popup could never contain a button.
 */
export function chromeHit(x, y, layout) {
    if (layout.barHeight <= 0)
        return 'drag'; // no bar: the whole panel drags
    if (y > layout.barHeight)
        return 'content';
    if (x >= layout.close.x)
        return 'close';
    return 'drag';
}
/**
 * Convert a texture coordinate to viewBox coordinates.
 *
 * UV `v` runs from the BOTTOM, SVG `y` from the top — the flip that makes a
 * title bar land at the bottom of the panel if you forget it.
 */
export function uvToViewBox(u, v, vbWidth, vbHeight) {
    return { x: u * vbWidth, y: (1 - v) * vbHeight };
}
//# sourceMappingURL=popup-chrome.js.map