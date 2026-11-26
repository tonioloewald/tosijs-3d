/*
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

## Tips are surfaces too

A tooltip or an info card drawn inside its panel is clipped by it the same
way: the top row's card ran under the title bar, an edge icon's tip off the
plane. `showTipSurface(root, sheet, anchor, side)` shows one as its own
surface, under the anchor (`'below'`, a tooltip, above it when the screen
runs out) or beside it (`'right'`, an info card), drawn over every panel and
popup and never picked, so a ray or a click goes through it to what it is
about. Panels' tooltips and the inventory's info cards use it; a panel only
on the page has no presentation that holds tips, and draws them in itself.

## Over-surfaces, and popups' own popups

`showOverSurface(root, sheet, anchor, { pickable, dismissOutside })` shows a
drawing centred on a point of the panel, on its own surface in front of it,
at the panel's scale and with no chrome: the on-screen keyboard's rings,
whole round their key instead of cropped by the board. A widget reaches it as
`host.showOver`. A popup's sheet gets a layer of its own while it is up, so
what a widget inside a popup opens (a ring, a tip, a menu) is a surface too.

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

/**
 * Let any panel SVG carry layer hosts (`addLayerHost`), the list a popup or a
 * tip is mounted through. A `panel3d` has it already; a panel drawn by other
 * code (the trade panel, the inventory dock) gets it here.
 */
export function layerHostable(svg: SVGSVGElement): void {
  const el = svg as unknown as {
    addLayerHost?: (fn: unknown) => () => void
    __layerHosts?: unknown[]
  }
  if (typeof el.addLayerHost === 'function') return
  el.addLayerHost = (fn) => {
    const list = (el.__layerHosts ??= [])
    list.push(fn)
    return () => {
      const i = list.indexOf(fn)
      if (i >= 0) list.splice(i, 1)
    }
  }
}

/** Where a tip goes against its anchor: under it (a tooltip) or beside it (an info card). */
export type TipSide = 'below' | 'right'

/**
 * Show `sheet` as a TIP (a tooltip, an info card) for `anchor` in `root`'s
 * own units: its own surface, beside or under the anchor and in front of the
 * panel, so the panel's edge cannot clip it, and never picked. Mounted by
 * every presentation of the panel that can hold one. Null when none can (a
 * panel only on the page): draw it in the panel as before.
 */
export function showTipSurface(
  root: SVGSVGElement,
  sheet: SVGSVGElement,
  anchor: { x: number; y: number; width: number; height: number },
  side: TipSide = 'below'
): { close: () => void } | null {
  type Host = ((s: SVGSVGElement, c: object) => { close: () => void }) & {
    tips?: boolean
  }
  const hosts = (
    (root as unknown as { __layerHosts?: Host[] }).__layerHosts ?? []
  ).filter((h) => h.tips)
  if (hosts.length === 0) return null
  const opened = hosts.map((h) => h(sheet, { anchor, tip: side }))
  return { close: () => opened.forEach((o) => o.close()) }
}

/** How an over-surface behaves (see `showOverSurface`). */
export interface OverOptions {
  /** Takes the pointer (its SVG's `handlePointer`); else a ray goes through it. */
  pickable?: boolean
  /** A press on neither it nor its panel closes it. */
  dismissOutside?: boolean
  /** Told when it goes, however it went. */
  handleClosed?: () => void
}

/*
AN OVER-SURFACE: a drawing centred on a point of the panel, on its own
surface in front of it, the panel's scale, with no chrome and no drag. A
keyboard key's ring of choices is one: centred on the key, as big as it
needs to be, and not cropped by the keyboard. Pickable or not; null when no
presentation of the panel can hold one (a panel only on the page), and the
caller draws it in the panel.
*/
export function showOverSurface(
  root: SVGSVGElement,
  sheet: SVGSVGElement,
  anchor: { x: number; y: number; width: number; height: number },
  options: OverOptions = {}
): { close: () => void } | null {
  type Host = ((s: SVGSVGElement, c: object) => { close: () => void }) & {
    over?: boolean
  }
  const hosts = (
    (root as unknown as { __layerHosts?: Host[] }).__layerHosts ?? []
  ).filter((h) => h.over)
  if (hosts.length === 0) return null
  const opened = hosts.map((h) => h(sheet, { anchor, over: options }))
  return { close: () => opened.forEach((o) => o.close()) }
}

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
  /**
   * The panel's own mesh, so a popup can be owned by it; or a function that
   * gives it when a popup opens (a popup's plane builds its mesh a moment
   * after it is made).
   */
  openerMesh: unknown
  /** The panel plane's world width and height. */
  planeW: number
  planeH: number
  /**
   * Where the screen ends, for a panel pinned to it: the visible span in the
   * panel's own viewBox units (`top` is negative when the panel sits below
   * the screen's top). With it a popup is no taller than the screen and is
   * kept on it; without it (a plane in a headset) nothing bounds a popup.
   */
  screenRoom?: () => { top: number; bottom: number } | null
  /**
   * When `svg` is shown INSIDE another SVG on the plane (a title bar's
   * frame), that SVG and where `svg`'s top sits in it: the plane maps the
   * frame, so anchors are moved down by `top` and measured against it.
   */
  inFrame?: () => { svg: SVGSVGElement; top: number }
  /** Handed the way to take this layer off the panel again (a popup's own layer, on its close). */
  detach?: (off: () => void) => void
}): boolean {
  const owner = opts.owner
  // Any panel SVG can hold one (the trade panel, the inventory dock).
  if (owner.openPopup) layerHostable(opts.svg)
  const panelEl = opts.svg as unknown as LayerHostTarget
  if (typeof panelEl.addLayerHost !== 'function' || !owner.openPopup) {
    return false
  }
  const { planeW: width, planeH } = opts
  const openerOf = (): unknown =>
    typeof opts.openerMesh === 'function'
      ? (opts.openerMesh as () => unknown)()
      : opts.openerMesh
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
      side?: 'below' | 'above' | 'right' | 'left'
      handleClosed?: () => void
      handleGone?: () => void
      chromeBand?: number
      dismissOutside?: boolean
      /** A tip, under or beside the anchor (see `showTipSurface`). */
      tip?: TipSide
      /** Centred on the anchor, in front (see `showOverSurface`). */
      over?: OverOptions
    }
  ) => {
    if (config.tip != null) return tip(sheet, config.anchor, config.tip)
    if (config.over != null) return over(sheet, config.anchor, config.over)
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
    // Hoisted above its first use — the panel's viewBox is read by BOTH the
    // scale below and the anchor projection further down.
    const frame = opts.inFrame?.()
    const vb = (frame?.svg ?? opts.svg).viewBox?.baseVal
    const frameTop = frame?.top ?? 0
    const popW = Number(sheet.getAttribute('width')) || 360
    const popH = Number(sheet.getAttribute('height')) || 200
    /*
      ONE viewBox UNIT IS THE SAME SIZE ON THE PANEL AND ON ITS POPUP.

      This was `width * 0.95` — the popup took nearly the panel's whole width
      whatever it contained. Right for a keyboard, which is about as wide as a
      panel; grotesque for a 163-unit select menu, which came out drawn at twice
      the text size of the thing that opened it. Tonio: "The popup in VR is a
      completely different scale."

      Deriving it from the panel's own scale means a menu looks like part of the
      same UI, and a keyboard still comes out full width because it genuinely is
      that wide. Capped at 95%, so a sheet wider than its panel is contained
      rather than dwarfing it.
      */
    const panelVbW = vb && vb.width > 0 ? vb.width : popW
    /*
    BESIDE THE PANEL (`side: 'right'` or `'left'`), a popup hangs off its edge
    instead of over it, so it may be wider than the panel: a drawing surface
    wants the room. Still one viewBox unit to one, capped at twice the panel.
    */
    const beside = config.side === 'right' || config.side === 'left'
    const worldW = Math.min(
      width * (beside ? 2 : 0.95),
      width * (popW / panelVbW)
    )
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
    // Only the vertical mapping is needed: the popup is centred in x.
    const panelH = vb && vb.height > 0 ? vb.height : popH
    const a = config.anchor
    // The field's BOTTOM edge, in plane-local world units.
    /*
    ON SCREEN, when there is a screen. Below the field if it fits; otherwise
    as low as it can go and still be seen. (The sheet was already built no
    taller than the room: see `roomFor`.)
    */
    const MARGIN = 8
    const room = opts.screenRoom?.() ?? null
    // Beside the panel its top is level with the anchor's; else it hangs below.
    let topVb = frameTop + (beside ? a.y : a.y + a.height)
    if (room != null) {
      topVb = Math.max(
        room.top + MARGIN,
        Math.min(topVb, room.bottom - MARGIN - popH)
      )
    }
    const anchorBottomY = (0.5 - topVb / panelH) * planeH
    const pop = owner.openPopup!({
      // Tell the layer when the popup's OWN × closes it, so every other
      // presentation goes with it and the opener is not left believing it
      // still has one open. See `LayerHost.handleClosed`.
      handleClosed: config.handleClosed,
      handleGone: config.handleGone,
      // A press outside it and outside its panel closes it (a menu).
      dismissOutside: config.dismissOutside,
      /*
      The title bar is the BAND THE SHEET RESERVED, not a share of its height.
      Left at the default fifth, a tall sheet (Perf Stats with a sweep listed)
      got a bar, and glyphs, several times the size of a short one's, drawn
      over its first rows.
      */
      ...(config.chromeBand != null && config.chromeBand > 0
        ? { gripHeight: config.chromeBand / Math.max(1, popH) }
        : {}),
      svg: sheet,
      opener: openerOf(),
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
        x: beside
          ? (config.side === 'right' ? 1 : -1) *
            (width / 2 + worldW / 2 + width * 0.03)
          : 0,
        y: anchorBottomY - worldH / 2,
        // NEARER the viewer — the z-separation is the point, not a nicety:
        // coplanar panels re-sort as you orbit.
        // On a screen a smaller step: nearer is BIGGER in perspective, and
        // a popup depth-writes now, so it need not be far in front to win.
        z: room != null ? -0.01 : -0.08,
      },
    })
    /*
    A POPUP'S OWN POPUPS ARE SURFACES TOO: its sheet gets a layer of its
    own, so a widget in it (the keyboard's rings, a select) opens in front
    of it rather than cropped inside it. Taken off when it closes, since a
    sheet can be shown again.
    */
    let offInner: (() => void) | null = null
    attachSceneLayer({
      svg: sheet,
      owner,
      openerMesh: () => (pop as { plane?: { mesh?: unknown } }).plane?.mesh,
      planeW: worldW,
      planeH: worldH,
      detach: (off) => (offInner = off),
    })
    return {
      close: () => {
        offInner?.()
        offInner = null
        pop.close()
      },
    }
  }
  /*
  A TIP: one viewBox unit to one, like a popup, but placed against the
  anchor itself rather than the panel's edge, nearer than any popup, and
  kept on the screen when there is one.
  */
  const tip = (
    sheet: SVGSVGElement,
    a: { x: number; y: number; width: number; height: number },
    side: TipSide
  ) => {
    const frame = opts.inFrame?.()
    const vb = (frame?.svg ?? opts.svg).viewBox?.baseVal
    const frameTop = frame?.top ?? 0
    const popW = Number(sheet.getAttribute('width')) || 120
    const popH = Number(sheet.getAttribute('height')) || 24
    const panelW = vb && vb.width > 0 ? vb.width : popW
    const panelH = vb && vb.height > 0 ? vb.height : popH
    const worldW = width * (popW / panelW)
    const worldH = worldW * (popH / popW)
    const GAP = side === 'right' ? 8 : 3
    let left =
      side === 'right' ? a.x + a.width + GAP : a.x + a.width / 2 - popW / 2
    let top = frameTop + (side === 'right' ? a.y : a.y + a.height + GAP)
    const room = opts.screenRoom?.() ?? null
    if (room != null) {
      // Under it unless that runs off the screen: then above it.
      if (side === 'below' && top + popH > room.bottom - 4)
        top = frameTop + a.y - GAP - popH
      top = Math.max(room.top + 4, Math.min(top, room.bottom - 4 - popH))
    }
    left = Math.max(-popW, left)
    const pop = owner.openPopup!({
      tip: true,
      svg: sheet,
      opener: openerOf(),
      width: worldW,
      offset: {
        x: ((left + popW / 2) / panelW - 0.5) * width,
        y: (0.5 - top / panelH) * planeH - worldH / 2,
        z: room != null ? -0.02 : -0.1,
      },
    })
    return { close: () => pop.close() }
  }
  /*
  OVER: centred on the anchor and in front, one viewBox unit to one, no
  chrome, no drag (see `showOverSurface`).
  */
  const over = (
    sheet: SVGSVGElement,
    a: { x: number; y: number; width: number; height: number },
    o: OverOptions
  ) => {
    const frame = opts.inFrame?.()
    const vb = (frame?.svg ?? opts.svg).viewBox?.baseVal
    const frameTop = frame?.top ?? 0
    const popW = Number(sheet.getAttribute('width')) || 100
    const popH = Number(sheet.getAttribute('height')) || 100
    const panelW = vb && vb.width > 0 ? vb.width : popW
    const panelH = vb && vb.height > 0 ? vb.height : popH
    const worldW = width * (popW / panelW)
    const cx = a.x + a.width / 2
    const cy = frameTop + a.y + a.height / 2
    const room = opts.screenRoom?.() ?? null
    const pop = owner.openPopup!({
      svg: sheet,
      opener: openerOf(),
      width: worldW,
      tip: !o.pickable,
      chrome: false,
      draggable: false,
      dismissOutside: o.dismissOutside,
      handleClosed: o.handleClosed,
      offset: {
        x: (cx / panelW - 0.5) * width,
        y: (0.5 - cy / panelH) * planeH,
        z: room != null ? -0.02 : -0.05,
      },
    })
    return { close: () => pop.close() }
  }
  ;(host as unknown as { tips?: boolean }).tips = true
  ;(host as unknown as { over?: boolean }).over = true
  ;(host as unknown as { drawsChrome?: boolean }).drawsChrome = true
  // How tall a popup can be here: the screen's height, less margins.
  if (opts.screenRoom != null) {
    ;(host as unknown as { roomFor: () => number | undefined }).roomFor =
      () => {
        const r = opts.screenRoom!()
        return r == null ? undefined : Math.max(80, r.bottom - r.top - 16)
      }
  }
  const off = panelEl.addLayerHost(host)
  opts.detach?.(off)
  return true
}
