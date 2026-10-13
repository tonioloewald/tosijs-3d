# Light editor

**`lightEditor3d` — the whole lamp, not just its curves.** A `Widget3d` that
edits what a light *is* (type, colour, intensity, range, shadows) alongside what
it *does over time* ([[curve-program|curveProgram3d]]), with a power switch so
you can watch the attack and decay play out.

## Demo

See [[curve-program]], which uses this to drive a real lamp.
## Why the two halves belong together

A program editor on its own is half a job: you can draw a beautiful strike-and-
decay and have no way to say the lamp is a warm 40 W spot that casts shadows.
Tonio, on the program editor by itself: _"presumably we need to be able to
configure the light's basic properties (like its basic color, intensity, whether
it casts shadows, the type of light, and so on, or we've only done half the
job."_

So this is one field, for the same reason a program is one field: what you get
back is a complete lamp description that can be handed straight to
[[b3d-lamp|b3dPointLight]] / `b3dSpotLight` / `b3dAreaLight`.

## Colour is HSV, not RGB

Two sliders — hue and saturation — and **no value slider**, because value *is*
`intensity` and having both would give you two ways to dim a lamp that disagree.

RGB would need three sliders to express "the same colour, a bit warmer", which
is the edit you actually make on a light. It also matches how the program's
`hue` and `saturation` channels modulate it, so the static colour and the
animated one are described in the same terms.

## A power SWITCH, not a button

It is state — the lamp is on or it is off — and a button reads as "do something
once". The first version of this was a button and Tonio did not recognise it as
the switch it was.
