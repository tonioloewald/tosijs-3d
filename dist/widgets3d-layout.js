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
/**
 * Stack `heights` top-to-bottom separated by `gap`. offsets[i] is the y of
 * child i; total is the full content height (no trailing gap).
 */
export function stackLayout(heights, gap) {
    const offsets = [];
    let y = 0;
    for (let i = 0; i < heights.length; i++) {
        offsets.push(y);
        y += heights[i];
        if (i < heights.length - 1)
            y += gap;
    }
    return { offsets, total: y };
}
/** Clamp a scroll offset to [0, max] where max = content beyond the viewport. */
export function clampScroll(offset, contentHeight, viewportHeight) {
    const max = Math.max(0, contentHeight - viewportHeight);
    return Math.min(Math.max(offset, 0), max);
}
/**
 * Greedy word-wrap by a fixed average `charWidth` (px). **Deprecated** — a single
 * average width both clips (a `W` is far wider than an `i`) and wastes space (you
 * pad the average up to be safe). Prefer `wrapByMeasure` / `measureTextWrap`, which
 * measure the actual glyphs. Kept for callers that genuinely only have an average.
 */
export function wrapText(text, maxWidth, charWidth) {
    return wrapByMeasure(text, maxWidth, (s) => s.length * charWidth);
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
export function wrapByMeasure(text, maxWidth, measure) {
    const out = [];
    for (const para of text.split('\n')) {
        const words = para.split(/\s+/).filter(Boolean);
        if (words.length === 0) {
            out.push('');
            continue;
        }
        let current = '';
        for (const word of words) {
            const candidate = current ? `${current} ${word}` : word;
            if (current === '' || measure(candidate) <= maxWidth) {
                current = candidate;
            }
            else {
                out.push(current);
                current = word;
            }
        }
        out.push(current);
    }
    return out.length > 0 ? out : [''];
}
/** CSS `font` shorthand for a spec — what `canvas.measureText` needs on `ctx.font`. */
export function cssFont(f) {
    const style = f.style ? `${f.style} ` : '';
    const weight = f.weight != null ? `${f.weight} ` : '';
    return `${style}${weight}${f.size}px ${f.family ?? 'system-ui, sans-serif'}`;
}
// One shared offscreen 2D context measures every string — the canvas text engine IS
// the same shaper HTML uses, so this isn't an approximation, it's the real width
// (kerning, ligatures, proportional glyphs and all). `undefined` = not tried yet,
// `null` = no canvas here (headless/test), so callers fall back to an estimate.
let _measureCtx;
function measureContext() {
    if (_measureCtx !== undefined)
        return _measureCtx;
    try {
        const c = typeof document !== 'undefined' ? document.createElement('canvas') : null;
        _measureCtx = c?.getContext('2d') ?? null;
    }
    catch {
        _measureCtx = null;
    }
    return _measureCtx;
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
export function textMeasurer(font) {
    const ctx = measureContext();
    if (ctx) {
        const f = cssFont(font);
        return (s) => {
            ctx.font = f;
            return ctx.measureText(s).width;
        };
    }
    const avg = font.size * 0.56;
    return (s) => s.length * avg;
}
/** Wrap `text` to `maxWidth` (layout units) using real glyph measurement. */
export function measureTextWrap(text, maxWidth, font) {
    return wrapByMeasure(text, maxWidth, textMeasurer(font));
}
/** Measured width of the widest line in `text` — for sizing a box to its content. */
export function measureTextWidth(text, font) {
    const measure = textMeasurer(font);
    let max = 0;
    for (const line of text.split('\n'))
        max = Math.max(max, measure(line));
    return max;
}
/** Map a value in [min, max] to a 0..1 fraction (clamped, step-snapped). */
export function valueToFraction(value, min, max) {
    if (max <= min)
        return 0;
    return Math.min(1, Math.max(0, (value - min) / (max - min)));
}
/** Inverse of valueToFraction, snapped to `step` (0 = continuous). */
export function fractionToValue(fraction, min, max, step = 0) {
    const clamped = Math.min(1, Math.max(0, fraction));
    const raw = min + clamped * (max - min);
    if (step <= 0)
        return raw;
    return Math.round((raw - min) / step) * step + min;
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
export function panelFitWidth(fov, aspect, z, want, fill = 0.8) {
    const visibleHeight = 2 * z * Math.tan(fov / 2);
    return Math.min(want, visibleHeight * aspect * fill);
}
//# sourceMappingURL=widgets3d-layout.js.map