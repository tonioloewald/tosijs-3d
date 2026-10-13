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
