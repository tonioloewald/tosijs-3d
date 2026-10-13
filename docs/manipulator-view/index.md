# manipulator-view

**The visible half of the manipulator: a universal widget, in the sense
Cheetah 3D means it.** Every enabled affordance is on screen at once and the
part you grab says what the drag means — drag a shaft to move along an axis, a
pad to move in a plane, a ring to turn, a cube to scale. The maths is in
[[manipulator]]; the element you actually place in a scene is
[[b3d-manipulator]].

Babylon has a `GizmoManager`, and it is mouse-shaped. This is built so a **hand**
can grab it, not only a ray.

## Why one widget instead of a mode

A mode switch makes you say what you want twice: once to the toolbar and again
to the handle. It also costs a round trip for the commonest edit there is —
nudge it over, then turn it a bit. The cost is crowding, and the answer to that
is the transform set: turn off what you are not using and its grips are simply
not built.

## Sized for hands, not only for pixels

Handles carry a `nearRadius` and are picked two ways: a hand inside that radius
grabs directly, anything further grabs by pointing. A gizmo designed for a mouse
gets this wrong by being visually thin — fine for a pixel-accurate cursor,
impossible to grab with a controller you are holding at arm's length, and
reported from a phone as *"I couldn't move a selection"*. So every drawn handle
carries a second, invisible, fatter mesh that exists only to be picked.

## Two-pass picking, and why one pass was the bug

`gripAt` picks the DRAWN handles first, then falls back to the fat targets. One
pass over both meant the fat targets — which overlap by design — decided
everything by ray depth, so the nearest surface was regularly a ring's tube
passing in front of the arrowhead squarely under the cursor. *"I rotated when I
tried to translate."*

## `renderingGroupId` draws it on top and does NOT make it pickable

Handles draw in group 1, because a handle buried inside the mesh it manipulates
cannot be seen — and the object an author most wants to move is usually the one
embedded in something else. That is a LOOK fix only: rendering group has no
bearing on picking, and this library has already shipped that mistake once
(see the camera-relative panel note in `b3d-svg-plane`, where a panel painted
in front and could not be touched).

It is safe here for a reason that does not generalise: `gripAt` picks with a
PREDICATE that admits nothing but handle meshes, so an occluder is never a
candidate and the depth question never arises. Pick handles any other way and
the terrain in front of them wins.

## Where this came from

Ported from `tosijs-3d-ensemble`, where every proportion below was measured
against the owner's reference model rather than eyeballed, and every sizing
decision was won against a real complaint. The geometry is unchanged; the API
is smaller — `gripAt` folds in the two-pass pick the consumer used to write
itself, and `composeRotation` folds in the euler composition it used to inject.
