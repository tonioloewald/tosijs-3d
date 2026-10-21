# 0.7.4

<!--{ "parent": "CHANGELOG", "order": 9992996 }-->

## Added

- **`curve3d` + `footprint3d` — author a terrain province instead of coding
  one.** A province is a **footprint** (extent by direction) plus **one curve
  per layer**: a `shape` that remaps the height sample, and a `falloff` that
  says how far its say extends. The pure model is `curve.ts` (Babylon-free,
  55 tests); the province editor demo lives on `/curve-field/`.

  **The range is closed on purpose.** A curve maps `[0,1]` to `[0,1]` and a drag
  clamps rather than pushing the range, because a profile that can return 1.4
  silently changes the height a province occupies — which is exactly what
  `carve`/`patch-field` must agree about, and it fails as _geometry_ while
  reporting nothing. Amplitude belongs to the block; shape belongs to the curve.
  `blendSample` composes them convexly, so a tile's bounds are known before
  anything is evaluated, however many provinces overlap.

  **A falloff is pinned to 0 at its edge; a profile is not.** A province still
  carrying weight at its boundary does not blend into the terrain around it —
  another silent step. Not monotonic, though: a crater rim and a volcano cone
  are non-monotonic falloffs, so the edge is pinned and the middle left alone.

  **A footprint is a polygon, not a sampled curve.** `ngon(6)` is six vertices,
  and `polygonExtent` casts a real ray at the straight edge — interpolating
  radius against angle bows every edge inward, which is why an earlier draft
  carried twelve samples per edge to avoid doing one intersection. A circle is
  therefore the expensive shape: a 16-gon, indistinguishable at province scale.
  Vertices cannot pass their neighbours or reach the centre, which keeps the
  polygon star-shaped — the property that makes "extent in this direction" have
  an answer.

  Presets are named for what they **are**: `shelf + mountains`, `desert
terraces`, `plateau`, `smooth edge`, `abrupt edge`, `messy circle`. "ease
  in-out" describes a graph; "smooth edge" describes a province.

- **`vector3d` / `euler3d` — a coordinate on ONE row.** Three stacked labelled
  fields is why an inspector panel ends up three times taller than it needs to
  be. `euler3d` is not a styling variant: it **wraps** into `(-180, 180]` where
  `vector3d` clamps, because a clamp fights you at exactly the angles you most
  want to scrub through. Degrees, per the angle rule.

  A row is **three tab stops**, not one: the host tracks focus per widget, so
  the row keeps its own axis index and lights exactly one caret — all three at
  once says focus is everywhere, which says nothing.

## Fixed

- **A yielded camera is always given back.** Dragging a popup detaches the
  camera so it does not orbit inside the same gesture, but the restore sat
  behind an empty-popup-list early return — so anything that emptied the list
  mid-gesture stranded the camera detached, with no way back. A detached camera
  is a dead scene, not a glitch. Also added a `window` pointerup/pointercancel
  backstop, because a pointer released outside the canvas produces no scene
  event at all, and dragging toward the edge is how you leave the canvas.

- **`openPopup` threw when opened by a click.** It called `attachDrag()` from a
  `whenMesh` callback declared above it — fine while that callback defers, which
  is what happens at mount. But `whenReady` fires immediately when the scene is
  already up, and appending a plane to a live scene runs its `sceneReady`
  synchronously too, so opening a popup from a click completed the whole chain
  inside `openPopup` and hit `attachDrag` in its temporal dead zone. Minified,
  that reads `Cannot access 'E' before initialization`. The throw escaped before
  the function returned, so the caller got no popup **and** no drag — one
  exception, two symptoms, neither pointing at declaration order.

- **Dragging a popup no longer re-centres it under the pointer.** Babylon's
  `_startDrag` falls back to a ray from the camera position when `fromRay` is
  omitted, so passing only `startPickedPoint` was not enough: it still
  recomputed the drag plane from a default. Both are needed — the ray says where
  the gesture points, the point says where on the panel it took hold.

- **A panel owns its background.** It painted nothing of its own, so the seam
  between the title bar and the content box leaked two ways: `box` draws its
  background rounded, so its top corners curve away from the square-bottomed
  bar, and it insets by `borderWidth / 2`, giving a hairline down both sides.
  A panel is an opaque thing; the parts now sit on top of it. Panel chrome also
  reads the theme, which it never did — it was hardcoded.

- **Popups have a rim, since they cannot have a drop shadow.** The panel is
  emissive so it is unlit, and a cast shadow needs a receiver — a popup floating
  in front of a scene has nothing to fall on. Drawn at **double** stroke width
  so the clip discards the outer half of a stroke that straddles its path,
  leaving the intended width with no half-pixel arithmetic. `muted` is a mid
  grey deliberately: the backdrop is arbitrary 3D, so a light rim vanishes on a
  pale scene and a dark one on a dark scene.

- **Numeric fields scrub** — `inputField({type:'number', scrub, step, min, max})`
  drags to adjust and clicks to type (tosijs-3d#50). Scrubbing lives on the
  field rather than in a separate control because a typed field already knows it
  is numeric; otherwise every numeric widget needs its own copy of parse, format
  and commit.

  **Tap versus drag is a distance, not a mode** — a press that never travels
  places the caret, one that moves scrubs. No modifier and no separate hit zone,
  which matters most in XR where aiming is the expensive part.

- **`slider3d`'s `step` is documented** — it always quantised the drag _and_ the
  reported value, but nothing said so, so a consumer generating panels from JSON
  Schema concluded sliders were continuous and turned snap settings into
  cyclers. There is now a **widget reference table** covering every widget's
  options, plus the methods on a panel and a field.
- **⚠️ `b3dWater`'s normal map is now PROCEDURAL by default** (tosijs-3d#46).
  It defaulted to `/waterbump.png` — a file that ships in this repo's `static/`
  and **not in the published package** — so every consumer taking the default
  pointed at something they had never been told to serve. Babylon falls back
  when a texture will not decode, so the sea rendered as a **checkerboard**,
  which reads as a style rather than a fault; it was reported as _"is the water
  supposed to look like a checkerboard (it actually looks awesome…)"_.

  Shipping the PNG would have fixed the missing file and left the real problem:
  a default that depends on a fixed URL resolving in someone else's app. The
  built-in map is now generated from this library's own Perlin noise — no file,
  no network, no path, and it works offline and in a headset. It tiles by
  construction (sampled on a torus), so there is no seam to hide.

  An explicit `normalMap` that fails to load now **logs an error** instead of
  silently becoming a checkerboard. Pass `normalMap` to override.

- **`panel.openPopup()` — a popup is just another panel** (tosijs-3d#37, item
  4). This was the seam blocking a real `select`, the colour picker, and any
  in-panel menu: `panel3d` returned a bare `<svg>` while `openPopup`/`openMenu`
  wanted a `Surface`, so a control inside a panel had nowhere to put its list.

  Nothing new was needed to build one — it is a `panel3d` with `height: 'fit'`
  placed by `placePopup` (which already flips and clamps). It returns the panel
  plus **where** it goes; mounting stays the host's job, because that is the
  part that genuinely differs: flat it is a positioned sibling, in a scene it is
  another plane. A popup living inside its opener would be clipped by the
  opener's own viewBox, which is exactly why it has to be its own panel.

  The popup is capped at its bounds, so a long list scrolls rather than growing
  past the surface it must land on — flipping cannot rescue a popup that is
  taller than both sides.

- **Fixed: injected colour controls set tokens to `[object Event]`.** A tosijs
  `Component` binds any `on*` prop as a **DOM event listener**, so an injected
  `colorInput({onChange})` calls back with an `Event` rather than a colour.
  Setting a token to one throws nothing — it stringifies, fails to parse, and
  the widget paints **black**. `themeEditor` now accepts either and ignores
  anything it cannot read as a colour.
- **⚠️ Panels no longer cast shadows by default.** `register()` is the
  shadow-caster contract and a panel registers like any other mesh, so every
  in-scene panel threw a hard-edged rectangle across whatever it faced.

  It is the right default for what a panel _is_: UI is not scenery — a HUD or an
  inspector is something you look **through** the world at, and a shadow makes
  it furniture. It is also the worst case for the shadow map, being a large flat
  quad that (when camera-relative) never leaves `activeDistance` and so never
  culls. Set `castShadow` for a panel that really is scenery — a sign on a wall,
  a screen in a room.

- **The scene panel sits in the top-left corner**, inset equally from top and
  left, instead of hanging below the gear button. It sat clear of the button
  that opens it, which pushed its own content off the bottom on a short scene —
  and covering the gear is fine, because the panel carries its own close box.
- **The scene panel updates when pause state changes elsewhere.** The transport
  row picks its label and icon from `paused`, but nothing repainted the panel
  when that flipped — so resuming from the pause _dialog_ left the panel still
  offering **Play**. It only looked right before because the common path is
  pressing the panel's own button, which reopens the panel afterwards; a second
  route to the same state had no reason to.
- **The `surface` demo's debug readout is a real 3D popup**, not an overlay
  painted into the opener's own SVG — so in the scene it is a panel with depth
  that can sit in front of the surface and be dragged in world space, rather
  than a picture of one stuck to the plane. The flat view keeps the in-panel
  form, because in a document a popup _is_ a box drawn over another box.
- **`buttonActiveText`** — the label colour while a clickable is held or
  selected. Separate from `text` because the background under it has changed: a
  theme whose `buttonActive` is a strong accent needs a light label on it, and
  baking that into `text` would force every label in the panel to follow a
  decision that is only about buttons. A held `button3d` and a selected icon
  both take it.
- **"button" means any CLICKABLE**, and now says so in the source.
  `buttonBg`/`buttonHover`/`buttonActive`/`buttonActiveText` style every widget
  you can press — buttons, icon buttons, toggles, list rows, select cyclers.
  `widget*` would be vaguer (a label is a widget and has no press state) and
  `clickable*` is what they mean but longer than anyone will type.
- **`iconBar3d` colours like a button.** It used `buttonActive` — the _press_
  colour — for the selected item, so a selected icon looked permanently held and
  pressing one showed nothing new. Now three escalating states (`buttonBg` →
  `buttonHover` → `buttonActive` while held) plus **`selectedBg`** for "this one
  is on", which is a different axis and why the theme has a separate token for
  it. Release clears the pressed look _before_ the handler runs, so a handler
  that rebuilds the panel cannot leave a button stuck looking held; and a press
  that drifts off its button no longer fires it.
- **`strokeWidth` reaches icons.** `iconGlyph` hardcoded `2`, so the token
  affected nothing but the text caret — a themed panel could not make its icons
  match its own line weight. It now defaults to `w3dTheme.strokeWidth`, and an
  explicit option still wins (an icon used as a mark may want its own weight).
- **Web fonts now reach in-scene panels** — `registerSvgFont(family, url)`
  fetches the face, base64s it, and injects an `@font-face` **into the
  serialised SVG**, which is the only place a rasterised copy can find it.

  A serialised SVG is its own document: it inherits neither the page's font
  faces nor its custom properties (the second half is why `w3d-theme` bakes
  literals). The symptom was quiet — a scene panel in the fallback family while
  the identical flat panel rendered correctly.

  Only faces the markup actually mentions are injected, because the payload is
  re-parsed on every rasterisation; a woff2 is 20–100 KB and base64 adds a
  third, so carrying every registered font on every texture would be the real
  cost. Cached per URL, and a failed fetch is not cached as the answer.

- **`withTheme(partial, build)` — one default, per-panel overrides.**
  `setW3dTheme` sets the default; this builds something under an override and
  restores it afterwards (in a `finally`, so a throw cannot leave the palette
  changed — a theme that silently persists after an error makes the _next_
  widget look wrong for no visible reason).

  It works because of the property that makes a single global table safe: a
  widget reads the theme when it is **built**. So a scope is just set-build-
  restore — no plumbing, no second table, and a widget built inside keeps its
  colours forever, since they were baked into its attributes.

  **Why not `panel3d({ theme })`:** a panel's children are constructed as
  _arguments_, so they already exist by the time the panel function runs. An
  option on the panel could only recolour the panel's own background while its
  contents kept the default — worse than not offering it. Wrapping the
  construction puts the children inside the scope, because that is when they
  evaluate.

- **`themeEditor()` — the palette editor is a component**, not demo code. An
  adopter theming an app wants exactly this UI, and copying it out of a doc
  comment is how it drifts from the palette it edits. Its own module, so it
  tree-shakes out of a build that never imports it.

  Every metric has a **slider and a number field, kept in sync** — a slider
  alone hides the value you are setting, and you cannot drag an exact 0.05.
  The colour control is **injected**: alpha matters (`panelBg`, `rowHover` and
  `selectedBg` are `rgba()`) and `<input type="color">` silently drops it, but
  tosijs-ui is deliberately not a dependency — so pass its `colorInput`, or take
  the native fallback knowing what it costs.

- **⚠️ The theme now actually reaches the widgets.** Every `--w3d-*` value was
  captured in a module-level `const` at **import** time, so `setW3dTheme` could
  never affect anything — colours, fonts and metrics alike. Only
  `roundedRadius` appeared to work, because it happened to be read inline.
  Reads are now live (getters), so a widget takes the theme in force when it is
  **built**, which is what the docs always claimed.
- **The SVG UI is themeable** — 21 tokens, up from 17. Added `focus`,
  `selectedBg`, `disabledBg`, `disabledText`, `strokeWidth`, `roundedRadius`,
  `spacing`, `lineHeight`, `codeFontFamily`, `codeFontWeight`, plus `overlay`,
  `divider`, `placeholder` and `caret`.

  **`setW3dTheme(partial)` overrides at runtime.** The `--w3d-*` variables are
  read once at load and deliberately so — an SVG destined for a texture is
  serialised away from the document, where `var(--w3d-text)` resolves against
  nothing and paints black. This is the way back in, and what a theme editor
  needs. Widgets read the theme when they are **built**, so rebuild them after
  calling it; a widget that re-read its colours would have to re-resolve them
  per rasterised texture, which is the cost this design exists to avoid.

  The four interaction states (`rowHover`, `focus`, `selectedBg`, `disabledBg`)
  are separate tokens because they must stay tellable apart — `focus` is a
  **stroke** rather than a fill, since a focus ring has to be visible on a
  hovered row _and_ a selected one. Live demo on the `w3d-theme` page.

- **20 more icons**, for the ensemble editor: `mousePointer`, `refreshCcw`/`Cw`,
  `move`, `copy`, `delete`, `trash`/`trash2`, `plus`/`plusCircle`,
  `rotateCw`/`Ccw`, and the complete `corner*` family (8). 61 total.
- **`fieldGroup.attach(target?)`** wires real `keydown` events to the focused
  field and returns a detacher. Opt-in — the library still never grabs the
  document by itself — but without it every flat host writes the same six lines,
  and a field you can click into that then refuses every character is a bad
  first impression. It was one: the theme demo shipped with an unusable field.

  It maps the event's modifier flags explicitly rather than passing the event,
  so `keyIntent` keeps taking a plain shape and stays testable without a DOM.

- **⚠️ `fieldGroup` moved under `ui.*`** (`ui.fieldGroup`), alongside
  `ui.inputField` and `ui.keyboard` — it is part of the same SVG UI surface and
  was inconsistently top-level. Unreleased, so nothing external moves.
- **`fieldGroup` — one keyboard, many fields.** Three chores that always travel
  together and were hand-rolled in every host (tosijs-3d#37, items 1 and 7):
  **exclusivity** (focusing one un-focuses the rest — two lit fields both
  claiming the keyboard is worse than none), **commit on leave** (so a
  half-typed `1.` never survives the move), and **layout** (the incoming field's
  `type` picks the keyboard mode, which is the point of having a type).

  `handleKey(key, mods)` takes a key NAME rather than an event, so the same
  routing serves a DOM listener, a synthetic source or a test — and it returns
  whether the key was consumed, so a host knows when to `preventDefault`.
  Attaching a real listener stays the host's choice; this library never grabs
  the document.

- **`keyIntent`** — pure DOM-key → field-intent mapping. Named keys (`Tab`,
  `Escape`, `F5`) and anything with Ctrl/Cmd/Alt are **not consumed**: swallowing
  a shortcut because a field happens to have focus is worse than handling no
  keys at all.
- **`inputField.onFocus` is settable on the object** (mirroring `onChange`), so
  a manager learns about focus it did not initiate. Without it a tap and a
  programmatic focus disagree about who is active, and keys go to the wrong
  field — silently, and only sometimes.
- **`inputField` has a `type`** — `'text' | 'number' | 'integer' | 'email' |
'url' | 'tel'`, HTML's `inputmode` idea. **One property, three jobs**: the
  host raises the matching keyboard layout on focus
  (`field.keyboardMode` → `keyboard.setMode`), `commit()` normalises or refuses
  the value, and `isValid()` answers without the host knowing the field's kind.
  This is why there is no separate `numberField` — a number field is this one,
  configured (tosijs-3d#37, item 2).

  The layouts already existed (`numpad`, `dial`, `email`, `url`) and nothing
  chose between them, so focusing a numeric field raised `alpha` and left you to
  find the numpad — two deliberate taps per field, and worse in a headset where
  there is no physical keyboard to fall back on.

  **Validity while typing and validity as an answer are different questions**,
  and conflating them is what makes typed fields either unusable or liars: `-`
  and `1.` are legitimate things to have typed and illegitimate things to have
  meant. So `isValid()` accepts them and `commit()` does not — and a refused
  commit restores the last good value rather than writing `NaN` into the
  document. Enter commits _before_ `onEnter` fires, so no handler has to re-do
  the parse.

- **`slider3d` can show its value permanently** — `showValue: 'peek' | 'always'
| 'never'` (default `'peek'`, the existing behaviour) plus a `format` hook for
  units. ensemble's coordinates were unreadable because a handle position is not
  a number (tosijs-3d#37, item 3).

  `'always'` reserves width for the **widest** value in the range (measured
  through `format`, so units and precision count) and shortens the track to
  clear it. Sizing to the _current_ value would make the track twitch mid-drag,
  which reads as the slider fighting you.

- **`row3d` — lay widgets side by side.** A panel only stacks, so a
  label-and-field pair cost two rows and eight fields became sixteen rows of
  mostly whitespace (tosijs-3d#37, item 5). `weights` give the usual label/field
  split; children are middle-aligned by default, since top-aligning a short
  label beside a taller control makes it look detached from what it names.

  Pointer routing is **by column**, delegating in each child's own coordinates —
  a widget cannot know it has been put in a row, so it must still receive
  `(0,0)` at its own top-left. Hit-testing follows the same path, which keeps
  "grab between the controls to scroll" working inside a row.

- **`panel3d` sizes itself: `height: 'fit'` is the new default**, with
  `maxHeight` to cap it (past the cap it scrolls rather than growing — fitting
  and scrolling are the same mechanism seen from either side of a limit).
- **`panel.measure()` → `{content, viewport, overflow, fits}`.** The panel has
  always known this (`stackLayout` returns the total) and simply never said, so
  every consumer sizing a panel was guessing at a number the panel could have
  told them.

  Both exist because **clipping is silent**: a panel too short for its content
  looks exactly like a panel missing its last control. The ensemble editor got
  three heights wrong in one sitting — a command hidden behind another panel, an
  option cut in half, a list showing five of eight rows — and noticed none of
  them at the time (tosijs-3d#37, item 6).

  The ordering is the whole trick: widgets measure against the inner WIDTH,
  which is known from `width` alone, so the stack can be measured before the
  panel has a height and the height derived from it. The previous code fixed the
  height first and had no way to discover it was wrong.

  **Behaviour change:** a `panel3d` with no explicit `height` used to be 480 and
  now fits its content. All nine call sites in this repo pass a height, so
  nothing here changed; an adopter relying on the old default should pass
  `height: 480`.
