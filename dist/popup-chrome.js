/*
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
    /*
    Glyph size, and it is deliberately modest.
  
    Was `barHeight * 0.62`. Tonio, once the chrome was legible in the scene: "make
    the affordances about 75% the size and a smidge closer to the corners." Chrome
    is not the content — it should be findable and then get out of the way, and
    the HIT region is set separately below, so shrinking the glyph costs no
    targeting accuracy.
    */
    const size = Math.max(0, Math.min(barHeight * 0.62 * 0.75, vbWidth / 4));
    /*
    TWO INSETS, because they answer different questions. The vertical one CENTRES
    the glyph in the bar; the horizontal one is a margin from the edge, and it has
    to leave room for the other glyph.
  
    Using the vertical inset on both axes is what broke first: on a 120-wide panel
    with a 300-tall bar it came out at 130, putting the close glyph at x = -50 —
    outside the panel entirely. Height told the width where to sit.
    */
    /*
    CENTRED in the bar, and the same margin from the side as from the top.
  
    For a while they were pulled 40% toward their corners (centred read as
    floaty), and that overshot. Tonio, 2026-10-16: "visually the two icons are a
    bit too tucked into their corners … vertically center the close and move
    widgets". Centred vertically, with an equal side margin, they sit in the
    bar's ends rather than in its corners.
    */
    const insetY = (barHeight - size) / 2;
    // Never so far in that the move glyph reaches the close TARGET (as wide as
    // the bar is tall: on a narrow panel with a tall bar that is most of it).
    const hitWidth = Math.max(barHeight, size * 2);
    const insetX = Math.max(0, Math.min(insetY, (vbWidth - 2 * size) / 3, vbWidth - hitWidth - size * 1.1));
    /*
    The × is drawn LARGER than the move glyph, so the two read the same size.
  
    Both are 24-unit icons, but Feather's × reaches from 6 to 18 and the move
    arrows from 2 to 22. At one size the × has 60% of the move's reach and looks
    like an afterthought ("The x seems small compared with the move widget").
    This scales its box so the ×'s ink comes to about 80% of the move's (a × is
    all diagonals and looks bigger than its extent), centred on the same point a
    move-sized glyph would sit, and never taller than the bar.
    */
    const CLOSE_OPTICAL = 1.35;
    const closeSize = Math.min(size * CLOSE_OPTICAL, barHeight);
    /*
    The close TARGET, sized independently of the glyph.
  
    At least as wide as the bar is tall — a roughly square target at the corner,
    which is what a finger or a ray needs regardless of how small the × is drawn.
    */
    const closeX = Math.min(vbWidth - insetX - size / 2 - closeSize / 2, vbWidth - closeSize);
    const closeHitX = Math.min(closeX, vbWidth - hitWidth);
    return {
        barHeight,
        closeHitX,
        move: draggable ? { x: insetX, y: insetY, size } : null,
        close: { x: closeX, y: (barHeight - closeSize) / 2, size: closeSize },
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
    // The TARGET, not the glyph — see `closeHitX`.
    if (x >= layout.closeHitX)
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