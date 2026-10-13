# theme-editor

**A live editor for the `--w3d-*` palette.** Every token that a widget actually
consumes, as a grid of controls: colours, metrics with a slider *and* a number
field, and a font menu. Change one and your rebuild callback fires.

## Why it is a component rather than a demo

It started as the demo on [[w3d-theme]], and a demo is the wrong home for it —
an adopter theming an app wants exactly this UI, and copying it out of a doc
comment is how it drifts from the palette it edits. `w3dTheme` is the one place
the tokens are declared; this is the one place they are edited.

It is a plain DOM component in its own module, so it tree-shakes out of a build
that never imports it. Nothing else in the library depends on it.

## Rebuilding is the caller's job, deliberately

The theme is read when a widget is **built** — see `setW3dTheme` for why that is
not an oversight (an SVG bound for a texture is serialised away from the
document, so `var(--w3d-text)` resolves against nothing and paints black). So
this cannot repaint your UI, and does not pretend to: it applies the change and
calls `handleChange`, and you rebuild whatever you are showing.

## The colour input is injected

Alpha matters here — `panelBg`, `rowHover` and `selectedBg` are all `rgba()` —
and the native `<input type="color">` **cannot express it**, silently dropping
the channel so a translucent token looks broken rather than untouched.

But tosijs-ui is deliberately not a dependency of this library, and the SVG UI
has no colour picker of its own yet. So the control is a parameter: pass
`colorInput` (tosijs-ui's does alpha), or accept the native fallback and know
what it costs. When the SVG UI grows its own picker this defaults to that
instead.
