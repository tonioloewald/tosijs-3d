# popup-surface

**A popup is another SURFACE, not more rows in the one you have.**

```js
import { b3d } from 'tosijs-3d'
import { demoStage, orbitCam } from 'tosijs-3d/demo-utils'
import { svgElements, elements } from 'tosijs'
const { svg, rect, text } = svgElements

// A little SVG panel, used for both the opener and its popups.
// No `rx` on the background: the MESH is rounded now, so rounding the svg too
// would only round the texture inside an already-rounded silhouette — a darker
// fringe, and fill nobody asked for. (Tonio: "we can slightly simplify our svg
// outer rect as well for a few ns of savings lol")
const card = (title, lines, w = 220, h = 130) =>
  svg(
    { viewBox: `0 0 ${w} ${h}`, width: w, height: h },
    rect({ x: 0, y: 0, width: w, height: h, fill: '#1b2430' }),
    rect({ x: 0, y: 0, width: w, height: 26, fill: '#2c3b4e' }),
    text({ x: 12, y: 18, fill: '#e6edf5', 'font-size': 13, 'font-family': 'sans-serif' }, title),
    ...lines.map((l, i) =>
      text({ x: 12, y: 48 + i * 18, fill: '#9fb0c3', 'font-size': 12, 'font-family': 'sans-serif' }, l)
    )
  )

let opened = []
const scene = b3d(
  {
    sceneCreated(el) {
      orbitCam(el, { radius: 4.2, beta: Math.PI / 2.6, target: [0, 1.2, 0] })

      // The opener: one ordinary in-scene panel.
      const base = el.make.plane({ width: 1.6, height: 0.95, y: 1.2, color: '#101820' })
      base.isPickable = true

      const spawn = (n) => {
        const pop = el.openPopup({
          svg: card(`popup ${n}`, ['spawned as its own surface', 'tear off, then drag me']),
          opener: base,
          width: 0.9,
          // Fan them out and step each one nearer the viewer, so depth does the
          // stacking that a z-index would do flat.
          offset: { x: 0.55 + n * 0.16, y: 0.3 - n * 0.22, z: -0.06 * (n + 1) },
        })
        opened.push(pop)
        return pop
      }

      // popup 0 stays OWNED — parented to the panel, so it travels with it.
      // Drag it and it moves ON the panel: it still travels with it.
      spawn(0)
      spawn(1).tearOff()
      // A MODAL blocks pointer access to everything behind it (the other
      // popups included) until it closes. The camera still moves.
      const m = el.openPopup({
        svg: card('modal', ['blocks the ones behind it', 'camera still moves']),
        width: 0.9,
        offset: { x: -0.8, y: 0.2, z: -0.3 },
        modal: true,
      })
      opened.push(m)
    },
  },
  ...demoStage({ size: 12, tiles: 8, texture: '/tosi-warhol-testgrid.svg', timeOfDay: 11 }),
)

preview.append(scene)
```

A menu cascade, a dropdown's open list, a debug readout — in a browser these are
absolutely positioned inside the one window you were given, and overlapping them
is a z-index problem. In a scene none of that scarcity is real: planes are cheap,
depth is an actual axis, and a panel can simply be *somewhere else*.

```javascript
import { openPopup } from 'tosijs-3d'

const pop = openPopup(el, { svg: mySvg, opener: panel.mesh, width: 1.1 })
pop.tearOff() // promote it: stays where you put it, and can be dragged
pop.close()
```

## Why not lay it out inside the opener

We had written the opposite down as a hard constraint — a dropdown "**MUST**
grow the panel's layout rather than a DOM-style absolute popover, because a
popover won't rasterize into the VR texture". Half of that is true: you cannot
draw outside the SVG that becomes the texture. The leap it hides is that the
popup must therefore live *in* that SVG. It doesn't. It can be **another texture
on another plane**, and then the constraint simply isn't binding.

What that buys, beyond the dropdown:

- **The opener stops reflowing.** Opening a debug tool currently shoves the
  author's controls down the panel — the thing you were reading moves because
  you asked about something else.
- **Tear-offs stop being a feature.** A popup that is already its own surface
  becomes "leave this open over there" by re-parenting, not by new machinery.
- **Depth replaces z-index.** `lift` pulls the popup toward the viewer, which is
  the effect flat UI fakes with shadows and scrims.

## Chrome: a title bar you can grab, and an x

A popup draws a **move** glyph and a **close** glyph into the top of its own
SVG, and the top `gripHeight` of the panel is the only place a drag starts.

That grip is not decoration. A popup with controls in it needs its own pointer
events — if a drag began anywhere on the surface, every button press inside it
would be a failed drag instead. Restricting the gesture to a title bar is what
lets the rest of the panel be interactive, and the icon is what makes that rule
visible rather than something you have to be told.

The glyphs are injected here rather than left to the caller so they cannot drift
out of line with the hit regions this module tests against — a move icon that
isn't where the grip is would be worse than no icon at all. They are drawn with
`iconGlyph`, not `svgIcons`, because this SVG becomes a TEXTURE and
`currentColor` resolves against nothing there.

## Ownership, and what tearing off changes

A popup is **owned**: parented to its opener, so it travels with it and is
disposed with it. `tearOff()` promotes it to world space **preserving its world
pose** (Babylon's `setParent(null)` does that arithmetic for us), after which it
is nobody's child, stays where it is, and — if `draggable` — can be grabbed and
moved. Ownership is a lifetime statement, not a position one; that split is the
same one `SPATIAL-DESIGN.md` draws for riding an elevator.

## Why parenting to the opener is fine here

The DOM habit is to portal a popup OUT to a positioned ancestor, and it is worth
being clear that the reason does not survive the trip. A DOM parent **crops**
(`overflow`) and traps you in its **stacking context**; you escape it to avoid
being clipped and to control what sits in front. A Babylon parent does neither —
it is a transform and nothing else — so there is nothing to escape, and
ownership costs nothing.

Tonio, arriving at it from the other side: _"parenting in 3d is merely
positional and not cropping."_

The cropping constraint is real, though; it just lives one level down. **The
TEXTURE is the crop.** An `openPanel` overlay is clipped by the surface's viewBox
exactly the way a child is clipped by `overflow: hidden`, and no amount of
re-parenting changes that, because it was never a scene-graph problem. That is
why the fix is a second PLANE rather than a different parent.

Inheriting the opener's scale and rotation is then a feature rather than a leak:
a panel scaled down onto a wrist should take its popups with it, at its size and
its angle. `tearOff()` remains the way to opt out, and it is a deliberate act.

## Budget

Every surface is a texture. Two or three floating panels are nothing; twenty is
a VRAM problem on a Quest, and VR is the tier with the least headroom. Callers
should treat concurrent surfaces as a budget — the ambient allocator's rule
applies, so something that cannot have its honest minimum should switch OFF
rather than degrade.
