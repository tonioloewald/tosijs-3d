import { box, type Box, type BoxChild } from './box';
import type { Widget3d } from './widgets3d';
/**
 * Wrap a {@link Widget3d} as a {@link BoxChild}.
 *
 * The protocols line up almost exactly — `layout(width) → height` is `measure`, and
 * `handle`/`hitTest` are the raw pointer pair `box` now understands — so this is a
 * rename, not a reimplementation.
 */
export declare function widgetChild(w: Widget3d): BoxChild;
/**
 * Build a {@link Box} whose children are {@link Widget3d}s — the drop-in way to put
 * an existing panel's rows inside a `surface` panel, popup, or scrolling region.
 *
 * Takes the same options as `box` (width/height/padding/gap/background/…).
 */
export declare function widgetBox(config: Parameters<typeof box>[0], widgets: Widget3d[]): Box;
//# sourceMappingURL=widget-box.d.ts.map