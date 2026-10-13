# manipulator

**The maths a translate/rotate/scale widget needs, as pure functions.** No
scene, no engine, no pointer — so the part most likely to be subtly wrong is the
part that can be tested without a browser. [[manipulator-view]] draws it and
[[b3d-manipulator]] is the element you actually use.

Each grip answers one question: *given where the pointer is aiming now, what
value should this handle have?*

| grip | reading |
| --- | --- |
| `translate` | the point on the axis closest to the pointer's ray |
| `planar` | where the ray crosses the plane the grip lies in, as a point |
| `rotate` | the angle around the axis where the ray crosses its plane |
| `scale` | the same projection as translate, read as a ratio |
| `uniform` | the ray's distance from the widget centre, read as a ratio |

## A grip, not a mode

The widget shows every enabled affordance AT ONCE and lets the grip you grab say
what the drag means — the shape Cheetah 3D's universal manipulator made its
reputation on. A mode switch asks the author to declare their intent twice: once
to the toolbar, and again to the handle. Here `Grip` is the whole vocabulary,
and it is what a pick returns.

## Snapping quantises the VALUE, not the movement

A drag that snaps by stepping the delta accumulates error: sixty frames of
`round(delta)` is not `round(sixty deltas)`, and a piece walks off the grid over
a long drag. Quantising the resulting absolute value instead means a snapped
object is always exactly on the grid, however it got there.

The one exception is ROTATION, which snaps its DELTA — a 15° step about the ring
you grabbed is what the setting promises, and it has to survive a start rotation
that is not itself on the grid.

## The drag measures against a FROZEN frame

`beginDrag` captures the object's axes and holds them for the whole gesture.
Reading them live is a feedback loop for rotation: measure the angle in the
object's current frame, apply it, and the frame has now turned by what you just
applied — so the next sample measures against a basis your own output moved.
That reads, from the outside, as *"a tiny movement spins the thing hundreds of
degrees"*.

## Where this came from

Ported from `tosijs-3d-ensemble`, where it was built and shaken out against real
authoring — including on a phone, which is where most of the sizing decisions in
[[manipulator-view]] were won. The maths is unchanged; the shape is not.
Ensemble's version speaks in `[x, y, z]` tuples and writes into an ensemble
document, so it is re-expressed here in this library's `{x, y, z}` and returns a
transform rather than editing anything.
