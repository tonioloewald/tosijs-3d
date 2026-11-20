# xr-grab

Grabbing the world in a headset, the AR way: hold a grip and drag, and the
scene comes with your hand; hold both and pull apart, and it grows, twist and
it turns. Nothing in the scene moves: the VIEWER does (its position, its turn
about the vertical, and its scale, WebXR's `worldScalingFactor`), so every
model, shader and simulation keeps its own units.

The rule is that what you grabbed stays in your hand. At the grab, each hand's
WORLD point is kept; every frame after, the viewer is placed so those world
points are where the hands are now. One hand moves you; two hands also set
your scale (their spread then, against their spread now) and your turn (the
line between them, seen from above).

`<tosi-b3d>`'s default AR session uses it on the grips (`xr-passthrough`).
Pure: plain `{x, y, z}`, no Babylon.
