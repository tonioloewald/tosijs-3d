# theme-editor

**A live editor for the `--w3d-*` palette.** Every token that a widget actually
consumes, as a grid of controls: colours, metrics with a slider *and* a number
field, and a font menu. Change one and your rebuild callback fires.

## Why it is a component rather than a demo

An adopter theming an app wants exactly this UI, and copying it out of a doc
comment is how it drifts from the palette it edits. `w3dTheme` is the one place
the tokens are declared; this is the one place they are edited. The live demo
is on [w3d-theme](/w3d-theme/).

It is a plain DOM component in its own module, so it tree-shakes out of a build
that never imports it. Nothing else in the library depends on it.

## Rebuilding is the caller's job

The theme is read when a widget is **built** (why is on
[w3d-theme](/w3d-theme/)). So this cannot repaint your UI, and does not
pretend to: it applies the change and calls `handleChange`, and you rebuild
whatever you are showing.

## The colour input is injected

Alpha matters here — `panelBg`, `rowHover` and `selectedBg` are all `rgba()` —
and the native `<input type="color">` **cannot express it**, silently dropping
the channel so a translucent token looks broken rather than untouched.

This is a DOM component, and tosijs-ui is deliberately not a dependency of this
library. So the control is a parameter: pass `colorInput` (tosijs-ui's does
alpha), or accept the native fallback and know what it costs.
