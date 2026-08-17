/*#
# portal-transform

**Where does the camera go to see through a portal?** Pure, Babylon-free math for
see-through portals: a doorway that shows another place, and shows it *while you
can also see the doorway's surroundings* — the visible impossibility that a
transition corridor deliberately avoids and which is the whole point of a TARDIS.

Two portals, `a` and `b`, are two frames pinned in the world. Looking into `a`
shows what a camera at the equivalent pose relative to `b` would see. That
equivalence is the only hard part, and it is here.

```js
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
*/
/*{ "parent": "utilities" }*/
import { add, sub, quatMul, quatConjugate, rotateVector, } from './spatial-transform';
/**
 * The pose a render-target camera should take so that portal `a`, seen from
 * `camera`, shows what lies beyond portal `b`.
 *
 * Reads as: express the camera in `a`'s frame, plant it in `b`'s. No flip —
 * see the convention note above for why, and for what it cost to get wrong.
 */
export function portalCamera(camera, a, b) {
    const invA = quatConjugate(a.rotation);
    const localPos = rotateVector(invA, sub(camera.position, a.position));
    const localRot = quatMul(invA, camera.rotation);
    return {
        position: add(b.position, rotateVector(b.rotation, localPos)),
        rotation: quatMul(b.rotation, localRot),
    };
}
/**
 * The plane to clip the virtual camera against: portal `b`'s plane, facing into
 * the destination.
 *
 * Returned as `{ normal, d }` with the plane `normal · x + d = 0`. Without this,
 * anything standing between the exit portal and the virtual camera is drawn over
 * the view — a chair on the far side of the hall appearing in your doorway.
 */
export function clipPlaneFor(b) {
    // A portal's local forward is +Z; the destination lies in front of it.
    const normal = rotateVector(b.rotation, { x: 0, y: 0, z: 1 });
    return {
        normal,
        d: -(normal.x * b.position.x +
            normal.y * b.position.y +
            normal.z * b.position.z),
    };
}
/**
 * Signed distance along the portal's travel axis: **negative approaching,
 * positive once through**.
 */
export function sideOf(p, portal) {
    const fwd = rotateVector(portal.rotation, { x: 0, y: 0, z: 1 });
    const rel = sub(p, portal.position);
    return fwd.x * rel.x + fwd.y * rel.y + fwd.z * rel.z;
}
/**
 * Did this step pass through the portal's plane, approaching to through?
 *
 * A **step** test, for the same reason `medium.crossing` is one: a sprinting
 * player or a vehicle can be in front of the doorway on one frame and well past
 * it on the next, and a handover that waits to observe the camera *inside* a
 * threshold volume simply misses. The context swap must happen on the frame the
 * plane is crossed — one frame late is one frame of the wrong world.
 *
 * Note this only tests the PLANE. Whether the crossing was inside the doorway's
 * frame (rather than through the wall beside it) is a bounds check the caller
 * owns, because the portal's shape is the renderer's business.
 */
export function crossedPortal(from, to, portal) {
    return sideOf(from, portal) <= 0 && sideOf(to, portal) > 0;
}
/*
RECURSION, THE WAY THE WORLD DOES IT.

Looking out through the door you came in is reachable in the first demo anyone
builds — a TARDIS interior can see its own exterior — so portals nest, and
something has to stop them.

A hard depth limit is the obvious answer and the wrong one: it pops. The level
you refuse to draw is as bright as the one before it, so the cutoff is visible
as a flat plate hanging in the middle of an otherwise convincing tunnel.

Tonio's answer, and it is the physical one: **no mirror is perfect.** Real
infinite mirrors terminate because each bounce absorbs a few percent, so the
tunnel of reflections simply darkens into nothing. Give each portal an
attenuation slightly under 1 and the same thing happens — and the level where you
give up is already almost invisible, so there is nothing to pop.

What that buys beyond looking right:

- **The depth limit stops being a magic number.** It is derived from how lossy
  the glass is and how dark a level has to get before nobody can tell.
- **Art direction becomes the perf budget.** A slightly dirtier portal costs
  fewer passes. On a weak device you can drop attenuation and get three levels
  instead of six, and it reads as atmosphere rather than as a downgrade — which
  is the opposite of how quality knobs usually feel.
- **A tint composes for free.** Attenuate per channel and deep recursion drifts
  toward the glass colour, exactly as a real mirror corridor goes green.

CALIBRATION, AND THE THING IT REVEALS.

Real glass is about **95% transmissive**, and you do not notice — which is
precisely why a real mirror corridor looks *infinite*. Run the numbers and that
is the whole story: at 0.95 it takes **77** bounces to fall below 2%, and at
0.97 it takes 129.

So the physical model gives the right LOOK and a useless BUDGET. The graceful
darkening is real, but at honest values it darkens far too slowly to terminate
anything — the `cap` does all the work, and pretending otherwise would just hide
a hard limit behind a physical-sounding parameter.

Which makes the trade explicit rather than accidental:

- Want it to **look infinite**? Use glass-like values and accept that the cap is
  what stops it, and that the cut level is still bright enough to see.
- Want the fade to **do the terminating**? The portal has to be markedly dirtier
  than glass — around 0.5–0.7, where the cut lands under 2% within 6–11 levels.
  That is an art direction decision, not physics, and it should be made on
  purpose.
- Either way, **render the level you stop at in the fade colour** rather than
  omitting it. A dim plate reads as depth; a missing one reads as a bug.
*/
/** Cumulative brightness after `depth` traversals of a portal of this quality. */
export function attenuationAt(attenuation, depth) {
    const a = Math.max(0, Math.min(0.999, attenuation));
    return Math.pow(a, Math.max(0, depth));
}
/**
 * How many recursion levels are worth drawing, given how lossy the portal is
 * and the brightness below which nobody can tell.
 *
 * `attenuation` is clamped under 1 deliberately: a perfect mirror would recurse
 * forever, and "the author typed 1.0" must not be a hang. `cap` is the hard
 * ceiling a device tier imposes — the answer is always the smaller of the two,
 * so a headset can insist on 2 no matter how clean the glass is.
 */
export function depthLimit(attenuation, epsilon = 0.02, cap = 8) {
    const a = Math.max(0, Math.min(0.999, attenuation));
    if (a <= 0)
        return 1; // opaque portal: draw the far side once, no recursion
    const e = Math.max(1e-6, Math.min(1, epsilon));
    // a^n < e  →  n > ln e / ln a
    const n = Math.ceil(Math.log(e) / Math.log(a));
    return Math.max(1, Math.min(cap, n));
}
/** Geometric: `a^depth`. Physical, and slow — see the 95% note above. */
export const geometricFalloff = (attenuation) => (depth) => attenuationAt(attenuation, depth);
/**
 * Linear: a fixed decline per level, so `step = 0.1` gives exactly ten levels.
 * The pass count becomes a number you state rather than one you solve for.
 */
export const linearFalloff = (step) => (depth) => Math.max(0, 1 - Math.max(1e-6, step) * Math.max(0, depth));
/**
 * Accelerating: the per-level loss grows by `growth` each time, so the first
 * bounce keeps almost everything and the tail falls off a cliff.
 *
 * `first = 0.05, growth = 2` loses 5%, then 10%, then 20% — dirt where nobody
 * is looking. This is the perceptually honest one: the first reflection is the
 * only one anyone inspects, and depth 4 exists to be atmosphere.
 */
export const acceleratingFalloff = (first = 0.05, growth = 2) => (depth) => {
    let remaining = 1;
    let loss = Math.max(1e-6, first);
    for (let d = 0; d < Math.max(0, depth); d++) {
        remaining -= loss;
        loss *= Math.max(1, growth);
        if (remaining <= 0)
            return 0;
    }
    return Math.max(0, remaining);
};
/**
 * How many levels are worth drawing under any falloff curve: the first depth
 * whose remaining brightness is below `epsilon`, capped by the device tier.
 *
 * The cap always wins, so a headset can insist on 2 however clean the glass is.
 */
export function depthLimitFor(falloff, epsilon = 0.02, cap = 8) {
    for (let d = 1; d <= cap; d++) {
        if (falloff(d) < epsilon)
            return d;
    }
    return cap;
}
//# sourceMappingURL=portal-transform.js.map