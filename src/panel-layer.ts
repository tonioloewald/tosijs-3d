/*#
# panel-layer

**Where a panel's popups actually go, when the panel is on a plane.**

A popup that lives inside its panel's SVG is cropped by it. That is the whole
problem: a `select3d` menu comes out squeezed into whatever room is left below
the control, a keyboard refuses outright on a short panel, and in a headset both
read as broken rather than as constrained. Tonio: *"We need popups to be popups
and not constrained by the thing that pops them. Otherwise the user experience
is terrible."*

On a plane a popup is bounded by nothing and sits genuinely IN FRONT, which is
what depth is for.

## Why this is its own module

It was written once, inside `panelScene`, and the in-scene `<tosi-b3d>` settings
panel never got it — so every popup opened from a panel in a headset fell back
to the cropped path. Copying it there would have made a second address for the
placement maths, which is the mistake this repo has already paid for twice (the
panel-sizing formula lived at three sites and was fixed at one).

`owner.openPopup` is taken as a duck-typed argument rather than imported:
`popup-surface` imports `b3d-svg-plane`, so a direct dependency either way round
is a cycle.
*/
/*{ "parent": "UI", "order": 173 }*/

/** The bit of `B3d` a layer needs — duck-typed, to stay out of the cycle. */
export interface PopupOwner {
  openPopup?: (o: Record<string, unknown>) => { close: () => void }
}

/** The bit of a panel element a layer registers through. */
export interface LayerHostTarget {
  addLayerHost?: (fn: unknown) => () => void
}

/**
 * Give a panel-on-a-plane somewhere to put its popups.
 *
 * Registered with `addLayerHost`, not `setLayerHost`: a panel is usually shown
 * TWICE (flat and rasterised), a layer belongs to a PRESENTATION, and an
 * earlier version that installed a single host moved the keyboard onto a plane
 * and out of the DOM entirely. Each presentation adds its own; the popup opens
 * in both, and closing any of them closes them all.
 *
 * A no-op — returning `false` — when the panel or the owner cannot support one,
 * so a caller can wire it unconditionally.
 */
export function attachSceneLayer(opts: {
  /** The panel's SVG, which is what carries the host list. */
  svg: SVGSVGElement
  /** Usually a `<tosi-b3d>`. */
  owner: PopupOwner
  /** The panel's own mesh, so a popup can be owned by it. */
  openerMesh: unknown
  /** The panel plane's world width and height. */
  planeW: number
  planeH: number
}): boolean {
  const panelEl = opts.svg as unknown as LayerHostTarget
  const owner = opts.owner
  if (typeof panelEl.addLayerHost !== 'function' || !owner.openPopup) {
    return false
  }
  const { planeW: width, planeH, openerMesh } = opts
  /*
  THIS host draws chrome — `popup-surface` puts move and close glyphs into the
  top of whatever SVG it is handed — so the sheet must keep a band clear for
  them. A DOM layer draws none and marks nothing, which is what lets a flat-only
  panel skip the band entirely.
  */
  const host = (
      sheet: SVGSVGElement,
      config: {
        anchor: { x: number; y: number; width: number; height: number }
        handleClosed?: () => void
      }
    ) => {
      /*
      Place it against the panel's EDGE, from measured sizes.

      The first version used a guessed fraction of the panel height
      (`-planeH * 0.7`) and put the keyboard at y = -2.41 on a camera looking
      at y = 0 — off screen. Tonio: "the keyboard is appearing below the whole
      panel and with no content."

      Both halves are now derived: the popup's world height comes from its own
      aspect at the width we give it, and the offset is half of each plus a
      gap. Nothing to tune, and it cannot drift when a panel changes shape.
      */
      const popW = Number(sheet.getAttribute('width')) || 360
      const popH = Number(sheet.getAttribute('height')) || 200
      const worldW = width * 0.95
      const worldH = worldW * (popH / popW)

      /*
      PROJECT THE ANCHOR into the plane's own space.

      This ignored `config.anchor` entirely and pinned the popup to the panel's
      bottom edge, so the keyboard sat over the numeric fields and far below
      the text one — Tonio: "the 3d keyboard appears OVER the numeric fields
      and way below the text field (in both cases it's kind of bottom aligned
      with the panel)". The DOM layer honoured the anchor and looked right,
      which is what made the two disagree.

      The plane shows the panel's viewBox across `width` x `planeH`, so a panel
      coordinate maps linearly: x centred, y flipped because SVG y grows down
      and world y grows up.
      */
      const vb = opts.svg.viewBox?.baseVal
      // Only the vertical mapping is needed: the popup is centred in x.
      const panelH = vb && vb.height > 0 ? vb.height : popH
      const a = config.anchor
      // The field's BOTTOM edge, in plane-local world units.
      const anchorBottomY = (0.5 - (a.y + a.height) / panelH) * planeH
      const pop = owner.openPopup!({
        // Tell the layer when the popup's OWN × closes it, so every other
        // presentation goes with it and the opener is not left believing it
        // still has one open. See `LayerHost.handleClosed`.
        handleClosed: config.handleClosed,
        svg: sheet,
        opener: openerMesh,
        width: worldW,
        offset: {
          /*
          Aligned to the panel's BOTTOM EDGE, overlapping upward — not pushed
          out below it.

          Placing it wholly below was geometrically right and useless: the
          panel is ~3.5 world units tall, so anything under it is outside the
          frame, and the keyboard was simply off screen. A phone does not put
          its keyboard below the app either; it lays it OVER the bottom of it,
          which is what the z-separation is for.
          */
          /*
          Hang it from the field. NO CLAMP.

          This was clamped to the panel's own extent, which pushed the keyboard
          back UP over any field in the lower part of the panel — Tonio: "it
          still places the numeric keypad over the field. I think it's refusing
          to push it past the bottom of the panel still (which is more of a 2D
          / DOM constraint)."

          Exactly right, and I had carried a flat-layout instinct into a place
          it does not apply: a popup in the DOM is bounded by something, but a
          PLANE is not. Nothing crops it, nothing reflows around it, and
          hanging below the panel costs nothing — which is the whole reason
          the scene layer exists rather than reusing the panel overlay.
          */
          y: anchorBottomY - worldH / 2,
          // NEARER the viewer — the z-separation is the point, not a nicety:
          // coplanar panels re-sort as you orbit.
          z: -0.08,
        },
      })
      return { close: () => pop.close() }
    }
  ;(host as unknown as { drawsChrome?: boolean }).drawsChrome = true
  panelEl.addLayerHost(host)
  return true
}
