# portal-transform

**Where does the camera go to see through a portal?** Pure, Babylon-free math for
see-through portals: a doorway that shows another place, and shows it *while you
can also see the doorway's surroundings* — the visible impossibility that a
transition corridor deliberately avoids and which is the whole point of a TARDIS.

Two portals, `a` and `b`, are two frames pinned in the world. Looking into `a`
shows what a camera at the equivalent pose relative to `b` would see. That
equivalence is the only hard part, and it is here.

```javascript
import { portalTransform } from 'tosijs-3d'

// where to put the render-target camera to fill portal `a` with `b`'s view
const virtual = portalTransform.portalCamera(camera, doorFrame, hallFrame)
```

## The convention is the whole subtlety

**A portal's local +Z is the DIRECTION OF TRAVEL through it.** You approach from
−Z, you emerge from the far portal moving +Z. Pick that and the transform is
simply "express the camera in a's frame, plant it in b's" — no flip, no special
case, and co-located identical portals are the identity, as they should be.

Pick the other convention (both doors *face* the approaching player) and the
mapping needs a 180° turn about the up axis, which then has to cancel correctly
in every degenerate case. I wrote it that way first, and the tests caught it
contradicting this module's own `sideOf`. Worth recording, because nothing
crashes when this is wrong: the view is simply *of the wrong thing*, plausibly
enough to read as a content bug. That is exactly why it is a pure function with
tests rather than three lines inside a render loop.

## What this module deliberately does NOT do

- **Oblique near-plane clipping.** A see-through portal must clip its virtual
  camera at the destination portal's plane, or geometry standing between the exit
  and the camera renders in front of the view — the classic portal artefact, and
  the detail most likely to sink an implementation. `clipPlaneFor` gives the
  plane; applying it is the renderer's job.
- **The recursion PASSES.** How many to draw is answered here (`depthLimit`,
  `attenuationAt`); actually drawing them is the renderer's job.
- **Stencil / framing.** Keeping the view inside the doorway is a rendering
  concern.
