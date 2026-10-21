# 0.7.8

<!--{ "parent": "CHANGELOG", "order": 9992992 }-->

Lights you can see, edit and animate — and the editor surface `tosijs-3d-ensemble`
asked for, built to their spec so they can adopt it without writing widgets.

## Added

- **Lamps.** `b3dPointLight`, `b3dSpotLight`, `b3dAreaLight` — a placed light
  that comes with its own fixture geometry (toggle it, scale it, bring a GLB, or
  parent your own to the lamp's `node`). Shadows where Babylon allows them
  (point/spot; `RectAreaLight` is not a `ShadowLight`) and **gels** where it does
  (spot only — `projectionTexture`, bitmap or SVG). The two gaps warn once rather
  than being faked.

  The fixture **tracks its light**: a fluorescent's bulb stutters as it strikes
  and dims to a red ember as it dies.

- **Light programs** (`light-modulation`). A lamp's whole life as ONE curve per
  channel — brightness, hue, saturation, range — divided into attack / sustain /
  decay by two markers. The seams cannot jump because there is only one curve, so
  **the curve's value at `attackEnd` IS the sustain level**.

  ⚠️ **Contract:** if `sustainEnd` precedes `attackEnd` the sustain collapses to
  zero width AT `attackEnd`, deterministically. Stated because a consumer's
  validator reports it as a warning rather than an error, which is only correct
  while the behaviour is specified. Changing it is a breaking change.

- **`curveProgram3d`** — several curves sharing one pair of draggable split
  markers, as a single field. **`lightEditor3d`** wraps it with the lamp's static
  properties (power switch, type, colour, intensity, range, shadows).

- **`light-settings`** — a lamp as DATA: schema, canonical form, validator. **No
  DOM and no Babylon**, so it works in a headless runner.

- **Curve interop**, to `tosijs-3d-ensemble`'s specification: `canonicalCurve`
  (4dp, stable bytes), `readCurve` (accepts the bare array or a `{kind, points}`
  wrapper), `validateCurve` / `validateProgram` / `validateLight` (never throw;
  `error`/`warning` only; relative JSON Pointer paths), and `curveSchema` /
  `lightProgramSchema` / `lightSettingsSchema` emitting `x-widget` +
  `x-curve-kind` for panels generated from JSON Schema.

- **`handleCommit`** alongside the live `onChange` on `curve3d`, `curveMarkers`,
  `curveProgram3d` and `lightEditor3d` — one commit per gesture, carrying
  canonical values and a bare verb phrase (`'move attack split'`), so a document
  records one undo step per edit instead of one per pointer-move.

- **Log sliders.** `slider3d({ scale: 'log' | 'log2' })` gives every decade or
  octave equal travel, plus `snap` to quantise the value. For intensity, noise
  scale, grid size — anything where a linear track puts everything you want in
  its first few percent.

- **Action menus.** `openMenu3d` / `menu3d`, `button3d({ menu })`, and a `menu`
  on an `iconGrid3d` cell. `disabled` takes a **predicate**, so a menu can be a
  module-level constant instead of being rebuilt whenever its state moves.
  `WidgetHost` is now exported — it was unnameable from outside.

## Fixed

- **Lamps never marked shadow RECEIVERS**, so a `shadows="on"` lamp rendered a
  shadow map nothing read — a full extra render pass that presented as lights
  shining through solid objects.
- **`shadows` accepted a write and did nothing.** It was set up once at scene
  ready and never re-read, so toggling it in an editor had no effect.
- **A pale lamp could not be reddened.** Rotating a hue preserves saturation and
  the saturation curve is `[0,1]`, so it could only desaturate — "pale tube dies
  as a red ember" was inexpressible. Added `saturationScale`.
- **The aircraft chase camera** sat too close after content moved to human
  scale; pulled back 30% with the framing angle preserved (0.13° drift).
- Log slider values no longer carry float noise (`0.010000000000000009`), which
  matters because they are serialised and diffed.

## Changed

- ⚠️ **`shadows="on"` is not free**, and the cost is worst where it is least
  visible: every such lamp is an extra render of the caster list, per frame, and
  large `range` sweeps more of the world into it. Prefer `off` for dynamically
  inserted content. See `TODO.md` → arbitration for inserted lights.
