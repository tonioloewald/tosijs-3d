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
