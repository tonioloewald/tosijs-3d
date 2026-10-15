/*
AN OUTLINE, because a panel in the scene has no shadow.

On a page an overlay is separated from what is under it by a drop shadow. In
the scene there is nothing for one to fall on, and a dark panel over a dark sky
had no edge at all. Tonio: "add a glow outline to the panels because we no
longer have shadow separation", then: "The outline of the dialog should match
the outline of the top left widget". So this is that outline: the corner
toolbar draws through it too, and every panel and popup wears the same one.

A light, half-transparent line, so it holds against a dark scene and still
reads (as a lighter edge on the panel's own fill) against a pale one.

INSET by half its width. A stroke straddles its path, and a texture ends at
its viewBox: a stroke ON the bounds loses its outer half along the straight
edges but keeps it at rounded corners, where the texture is still there and
transparent, so the corners came out heavier than the sides.

Its own module so `panel3d`, `popup-surface` and `system-bar` share one
without importing each other.
*/

import { svgElements } from 'tosijs'

/** The outline's colour and width (viewBox units). */
export const RIM_STROKE = 'rgba(255,255,255,0.45)'
export const RIM_WIDTH = 2.5

/** The outline for a `width` × `height` panel whose corners have `radius`. */
export function panelRim(
  width: number,
  height: number,
  radius: number,
  /** Line width in viewBox units: more for art drawn much smaller than its units. */
  stroke = RIM_WIDTH
): SVGElement {
  const i = stroke / 2
  const r = Math.max(0, radius - i)
  const rim = svgElements.rect({
    'data-w3d-rim': '',
    x: i,
    y: i,
    width: Math.max(0, width - stroke),
    height: Math.max(0, height - stroke),
    rx: r,
    ry: r,
    fill: 'none',
    stroke: RIM_STROKE,
    'stroke-width': stroke,
  }) as unknown as SVGElement
  rim.style.pointerEvents = 'none'
  return rim
}
