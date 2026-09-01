# TODO

- **Camera zoom is unreachable in VR.** `cameraZoom` moved to the D-pad and XR
  controllers have no D-pad; the right stick's vertical axis is now the view
  tilt. Wants a slider on the in-headset scene panel, which is the established
  place for settings you cannot bind to a button.

- **Replace `test-3.glb` with real terrain + provinces as the test scene.** The
  authored GLB has carried the demo a long way and is now the limiting factor:
  every depth, slope and shelf we want to test has to be modelled by hand and
  re-exported, and the scene cannot express the things the engine is actually
  for. Tonio: _"eventually we just switch to an actual piece of terrain and
  start using mesh placement and provinces to make a more interesting and
  useful landscape to test in."_ This is the first real consumer of
  PROVINCE-DESIGN.md — and it pays twice, since a procedural landscape can be
  asked for a 0.5 m shelf rather than having one sculpted into it.

- **Wrist panels as the standard escape for inputs an XR controller lacks.**
  **Queued for a headset session — do not build blind.** Tonio's design; agreed
  as the right general course.

  The facts, checked rather than recalled (2026-08-28):

  | input     | XR status                                             |
  | --------- | ----------------------------------------------------- |
  | `menu`    | present — LEFT thumbstick **click**                   |
  | `view`    | present — RIGHT thumbstick **click**                  |
  | d-pad ×4  | **genuinely missing**, nothing maps to it             |
  | `buttonY` | aliased to `view` (`Math.max(pad.view, pad.buttonY)`) |

  So view/menu are not missing — they are on thumbstick clicks, which is
  arguably _worse_ than missing: you fire them by accident, because clicking a
  stick while pushing a direction is what moving feels like. That makes the
  proposal a gain rather than a fill-in — moving them to a panel **frees both
  thumbstick clicks** for something deliberate. The only truly absent input is
  the d-pad, which today carries camera zoom, so zoom is unreachable in VR (the
  separate entry above).

  Plan: virtual view/menu and a virtual d-pad on wrist panels, mounted to the
  `leftHand`/`rightHand` frames.

  **Settled: Tonio's split (d-pad left, view/menu right) stands.** I argued for
  the inverse on the grounds that the d-pad drives zoom and so wants to be
  glanceable mid-action — but the premise was our own binding, not convention.
  Tonio: _"GTA and similar are using d-pad for things like changing radio
  stations and inventory navigation."_ Infrequent, deliberate, non-urgent — a
  wrist panel is a perfectly good home for that, and the objection dissolves.

  It leaves a better question behind, though: **camera zoom probably should not
  be on the d-pad at all.** Zoom is a mid-action control and the d-pad is
  conventionally where menu-ish things live, so the awkwardness in VR was not
  only the missing d-pad — it was a binding fighting its own idiom. Worth
  revisiting when this is built (zoom moved there on 2026-08-27 to free the
  right stick for LOOK, which was itself the right call).

  Most of the parts exist: `xr-frames` already senses `leftHand`/`rightHand`,
  `frame-panel` pins a gaze-revealed SVG panel to a frame, and `touch-gamepad`
  already maps `dpadUp/Down/Left/Right` off SVG `data-part` elements that
  `gamepad-svg` draws.

  **Build it as one UI with two mounts, not an XR branch** — same widget list as
  the flat glass gamepad, mounted differently. UI-DESIGN-NOTES → "One UI, two
  presentations": last time those diverged the XR panel grew its own refresh
  path and became untargetable, because swapping an element's children detaches
  the `handlePointer` closures.

  Refinement (Tonio, and worth designing toward rather than bolting on): the
  wrist panel could carry a **toggle that reassigns the left stick between
  d-pad and stick semantics**, so it is not only extra buttons but a way to
  re-purpose an axis the device already has. That generalises well — the scarce
  resource on an XR controller is distinct GESTURES more than buttons, and a
  mode toggle buys a second set of them for one tap.

  **The general principle, which is the part with leverage:** key the escape off
  what the active device LACKS, not off "is this XR". Surface a virtual control
  for what is missing, hide it otherwise. That makes it an answer to a class
  rather than to Quest controllers — and the extreme case is already on the
  roadmap, since PLATFORM.md names visionOS (eyes and hands, **no controllers at
  all**) as the real strategic risk. A capability-driven escape is what stops
  that arriving as a rewrite.

  Scope note: this is XR-specific, not a new lowest common denominator. A Steam
  Deck has ABXY _and_ a d-pad, so it comes through the Gamepad API complete and
  needs none of it.

- **`library-glb` should write `size` into each item's NODE extras.** One-line
  change in `static-assets/bin/library-glb.ts`, not made here because ensemble
  is mid-edit in that file.

  The builder already writes `{category, tags}` per node and a fuller index —
  including `size` — into `scenes[0].extras.library`. Babylon surfaces the
  first and **drops the second**: its `ExtrasAsMetadata` extension covers nodes,
  cameras, materials and animations, and scenes are not on that list. Verified
  by loading a real library headlessly (`node "grass" → metadata.gltf.extras`
  arrives; nothing carries `scenes[0].extras.library`).

  So `size` — the one field placement code most wants, since it answers "what
  fits in this gap" without instantiating anything — is the only part of the
  index Babylon cannot see. Copying it alongside `category`/`tags` closes the
  gap and makes `glb-manifest`'s parsing path unnecessary for scene consumers.

  Keep writing the scene index too: three.js DOES hand it back as
  `gltf.scene.userData`, so it is not dead weight, just invisible to us.

- **SVG UI form layer (#37), starting with `type` on `inputField`.** ensemble's
  seven-item bill from building one property panel. Agreed as the next push;
  all of it is flat-testable.

  **The keystone is that a field should declare its TYPE**, which turns out to
  be mostly wiring: `KeyboardMode` already has tested layouts for `alpha`,
  `alphanumeric`, `symbols`, `numpad`, `dial`, `email` and `url`, but
  `keyboard()` owns its own mode and only changes it when the user taps a mode
  key — so focusing a numeric field does **not** raise the numpad. Two
  deliberate taps per field, and worse in XR than flat because there is no
  physical keyboard to fall back to.

  A `type` (`'text' | 'number' | 'email' | 'url' | 'tel'`, i.e. HTML's
  `inputmode` idea) does triple duty: picks the layout on focus, drives
  parse/format/commit so a number field is a CONFIGURATION rather than a
  sibling widget (and `emailField`/`urlField` never need to exist), and gives
  the host something to validate against. Tonio: _"genuinely valuable and
  something we will definitely want."_

  Dates deliberately excluded for now — a date wants a segmented control or a
  masked numpad, which is a design decision rather than a missing layout.

  Rest of the order, cheapest-and-unblocking first: **content measurement**
  (its failures are SILENT — clipping looks exactly like a feature not being
  there, which cost ensemble three separate wrong panel heights), **row
  layout**, **slider value readout**, then the **popup-select-from-a-panel**
  seam — that last one is structural, not a widget: `panel3d` returns a bare
  `SVGSVGElement` while `openPopup`/`openMenu` need a `Surface`.

- **`iconGrid3d` — one control for segmented select, tool palette and mode
  picker.** Tonio's design; the goal is to collapse three widgets and a lot of
  panel clutter into one.

  A grid of icons with optional text hints above or below. **The consumer
  decides what it MEANS** — button bar (fire and forget), radio set (one of N),
  or checkboxes (any of N) — and can supply a callback that intercepts a change
  to impose something more particular (mutually-exclusive subgroups, a mode that
  refuses to turn off, a tool that arms rather than toggles). The control owns
  layout, hit-testing and focus; it does not own the semantics.

  Named targets: the standard panel's buttons, ensemble's tool palettes, and
  "many other cases where we have clutter".

  **Sizing.** Default 4 columns and as deep as needed; wider when the consumer
  opts out of captions, since the caption is what forces a narrow column. Cell
  size is the real dial — Tonio: _"maybe it's based on the cell size, and that
  might default to 48px (touch size) or 24px (decent click target) or even be
  automatic based on whether we know if the user is using touch or a pointing
  device."_

  **XR is NOT a third size.** My first note here said it was — that a
  controller ray is imprecise so in-scene targets should be bigger. Tonio
  overruled it, and the reasoning is better: _"we shouldn't make special size
  allowances for XR UI targets, we should scale XR so that pointer or touch
  targets make sense, since XR users also need to be able to read stuff."_

  Enlarging the targets in UI units makes the TEXT relatively smaller — the
  glyphs stay put while the buttons grow around them — so you buy hit accuracy
  by making the panel harder to read, which is the wrong trade for the medium
  with the lowest effective resolution. Scaling the whole panel in world space
  moves both together: a 48 px target subtends a comfortable angle and the text
  that goes with it is legible for the same reason.

  So the cell size stays a two-case decision (touch/pointer), and **XR is a
  transform on the panel, not a variant of it** — which also keeps one UI with
  two presentations rather than two layouts to keep in sync.

  Depends on `row3d` (shipped) for the row axis, and should report its height
  through the same `layout(width)` contract so `panel.measure()` keeps working.

- **More icons as ensemble grows** — the first batch is DONE (20 copied from
  tosijs-ui: `mousePointer`, `refreshCcw`/`Cw`, `move`, `copy`, `delete`,
  `trash`/`trash2`, `plus`/`plusCircle`, `rotateCw`/`Ccw`, and the whole
  `corner*` family). `resize` we already had. 61 icons total.

  Method for next time: they are all in `tosijs-ui`'s `icon-data` (314 marks) —
  extract the ones wanted into `icons/stroked/*.svg` and rerun `bun run icons`.
  Two minutes, no drawing. `feather-icons` is NOT installed, so that is not the
  source despite the folder name.

  **Settled: keep copying.** Tonio — _"we don't want tosijs-ui to be a
  dependency (for now)."_ A fallback would make its icon set load-bearing for a
  package that deliberately keeps it a peer, which is a worse trade than a
  little duplication. Copy what is needed, when it is needed.

- **`vector3d` / `euler3d` — one row for a coordinate, not three.** Tonio: so
  displaying a position or a rotation stops costing three rows. This is the
  densest single win left in the property panel, since almost everything an
  editor shows is a triple.

  Built from what now exists: `row3d` for the axis layout, `inputField` with
  `type: 'number'` per axis. What it adds on top is the part worth getting
  right:

  - **One shared label, three fields**, with x/y/z hinted rather than labelled
    — a full label per axis is what makes the three-row version wide as well as
    tall.
  - **Traversal across axes.** Right-arrow off the end of x should land in y,
    not stop. `inputField.focusMove` deliberately consumes horizontal at the
    ends (so a caret does not leap out of a field), so the vector has to own
    axis-to-axis movement itself — and `fieldGroup` is the place that already
    knows about focus moving between fields.
  - **Commit is per FIELD, not per vector.** Leaving x must settle x; the whole
    triple should not be rejected because y is mid-edit.
  - **Euler is DEGREES**, per CLAUDE.md's angle convention — and the `Deg`
    suffix rule means the display name carries no suffix precisely because it
    is already degrees. A radians-valued rotation field would be a bug.
  - Optional per-axis drag-to-scrub, which is how every 3D tool edits a
    coordinate. Cheap here because the pointer model is already coordinate-based.

- **Colour picker — HSV, with customisable swatches.** Tonio's ask; a popup is
  inherent to it.

  **The popup seam is now open** — `panel.openPopup()` builds a real panel and
  tells you where to put it (Tonio: _"popups need to just be actual panels"_).
  So the picker is unblocked; what remains is the picker itself.

  Shape: HSV by default — a saturation/value square plus a hue strip is
  straightforward in SVG and is what people expect from a picker, whereas HSL
  makes "same colour, brighter" harder to find. Swatches alongside, consumer
  supplied, defaulting to a decent set.

  **Alpha is required** (Tonio), and "proper" carries more than a fourth
  slider:

  - **A checkerboard behind the preview and the swatches.** Without it, 50%
    alpha over a dark panel is indistinguishable from an opaque dark colour —
    the picker would be lying about the one channel it was asked to support.
  - **The alpha track must show the colour ramping to transparent**, not a grey
    gradient, or you cannot see what you are choosing.
  - **The value has to carry alpha end to end** — `#rrggbbaa` or `rgba()`, and
    whichever we choose, round-tripping must not silently drop it. Dropping
    alpha on a save is the classic failure here.
  - Swatches carry alpha too, so a saved swatch means what it looked like.

  Worth flagging for the 3D case: an alpha below 1 on a MATERIAL is not just a
  colour, it changes how the thing renders — the loader already gives
  translucent materials a depth pre-pass, double-siding and shadow exclusion.
  So a picker wired to a material should expect the surface to change
  behaviour, not just hue, and `1.0` versus `0.999` is a real cliff.

  **An eyedropper is wanted** (Tonio: _"totally doable given we can render the
  viewport very easily"_), and he is right that the hard part is already built.
  `b3d.snapshot()` renders through an RTT, so sampling is `readPixels` on that
  target plus a pointer position — no new rendering path.

  Two things to get right, because an eyedropper that lies is worse than none:

  - **It samples the RENDERED pixel, not the material colour.** That is the
    point — you are picking what you can see, which includes lighting, fog and
    tone mapping. A picker that returned the albedo would disagree with the
    screen, and the screen is what the user is looking at.
  - **Which means the value is not the material's value.** Eyedropping a lit
    surface and assigning the result to that same material will not reproduce
    it. Worth being explicit in the UI about which one you are taking.

  Still open: whether the value round-trips as a string or a colour object.

- **Web fonts do not reach in-scene panels.** Confirmed on the theme demo,
  which shows one panel flat and as a texture: selecting Rosario (loaded from
  Google Fonts) changes the DOM panel and leaves the textured one on its
  fallback.

  `svg-texture` serialises the SVG to a standalone `Image`, which the browser
  treats as its own document — so it inherits neither the page's font faces nor
  its CSS custom properties. The second half is why `w3d-theme` bakes literals;
  the first half had not been noticed.

  So `w3dTheme.fontFamily` reaches a scene panel only for families **installed
  on the device**, which is why the shipped list is generics plus macOS/Windows
  faces.

  **Not impossible — the font has to ship WITH the SVG.** Tonio asked whether it
  is genuinely unsupportable or just wants more injected into the renderer, and
  it is the second. A serialised SVG can carry its own `@font-face` with the
  face as a data URI, at which point the standalone document has everything it
  needs — the same discipline the CSS literals already follow, for the same
  reason.

  Sketch: fetch the woff2, base64 it, prepend a `<style>` to the serialised copy
  so only the texture pays and the DOM element is untouched. Cache per family,
  since panels sharing a theme share the face.

  Costs to measure before paying: a woff2 is easily 20–100 KB, base64 adds a
  third, and it lands in every rasterisation unless cached. Subsetting to the
  glyphs actually drawn would cut it hard but needs a shaper. Until then the
  font menu labels Rosario as a web font, so the limitation is visible rather
  than surprising.

- **A `widgets3d` version of the theme editor — eventually the only version.**
  Tonio's call, and the right end state: the editor is currently plain DOM, so
  it cannot be used from inside a headset, which is the one place a theme most
  needs adjusting (colours that read on a screen do not necessarily read at
  arm's length on a lower-resolution display).

  Everything it needs now exists, which is the argument for doing it: `row3d`
  for the label/control rows, `slider3d` with `showValue: 'always'` for the
  metrics, `inputField` with `type: 'number'` and `scrub` for typed values,
  `select3d` (or the popup select, once built) for the font menu, and
  `panel.openPopup()` for the colour picker. The one genuinely missing piece is
  the **colour picker itself** — filed separately, and the SVG UI's biggest
  remaining gap.

  Two things it would prove, beyond being useful:

  - **It is the SVG UI's hardest customer, again.** Building the DOM editor
    found six real defects in a day (the theme reaching nothing, colours
    becoming Events, ragged control metrics, `lineHeight` and `padding` inert,
    web fonts dying in rasterisation, icons ignoring `strokeWidth`). A
    widgets3d version would exercise the same density against the SVG surface
    rather than against the DOM.
  - **A theme editor that renders in its own theme is self-demonstrating** —
    change a token and the editor changes with the panel, which no amount of
    documentation matches.

  Keep the DOM version until the SVG one is at least as good; replacing a
  working editor with a worse one to make a point is not progress.

- **A panel editor — layout you draw, not layout you fight.** Tonio's idea, and
  the natural next ambition after the theme editor.

  Two layout models, and it wants both because they answer different questions:

  - **Stacks and rows** — what `panel3d` and `row3d` already do. Composition:
    "these, in order, sharing the width." Right for a property panel, an
    inspector, a form.
  - **Pinned / constraint layout** — an element fixed to an edge, a corner, or
    stretched between two. Right for a HUD, a toolbar over a viewport, anything
    where position is meaningful rather than incidental.

  A drawing tool needs the second and most UI needs the first, which is why
  offering only one has always felt wrong.

  **Why this is more tractable for us than for an HTML tool**, which is the part
  worth writing down. Tonio: _"one of the obstacles to building really good UI
  drawing tools in HTML is that HTML's layout rules are almost diabolically
  weird."_ That is true and it is not incidental — margin collapsing, `%` height
  resolving against a parent that has none, flex-basis vs width, `min-width:
auto` on flex children, stacking contexts. A tool must either implement CSS
  faithfully (nobody does) or lie to you about what you drew.

  We are not in that position. The SVG UI has its **own** layout model, already
  pure and already tested: `flow-layout` (block/inline-block flow,
  `nearestInDirection`, `placePopup`), `stackLayout`, `rowColumns`,
  `panelFit`/`panelHeight`. A pinned model is a small addition to that rather
  than a fight with a browser — and because it is our model, **what the editor
  shows and what the runtime does are the same code**, which is the property
  that makes a drawing tool trustworthy.

  Prerequisites, mostly built: measurement (`panel.measure()`) so the editor can
  show overflow; `row3d` for the row axis; `withTheme` so a panel previews in
  its own theme. Missing: the pinned model itself, and a way to serialise a
  layout (an editor that cannot save is a toy).

  **Sequencing note.** `vector3d`/`euler3d` comes first regardless — ensemble's
  UI is "an utter mess right now because simple things like XYZ coords take up
  huge amounts of space", and a coordinate on one row is the single densest win
  available. A panel editor helps arrange panels; it does not help a panel that
  is three times too tall.

## The queue

[ ] **Animation sources: Quaternius has coverage, Mixamo has quality.** Tonio,
2026-08-27, after living with the UAL rig: _"I have bigger issues with the
quality of some of the quaternius animations — I think that Mixamo's are
generally better, but lack coverage. At some point we might try combining
mixamo and also Mocap's stuff (which is significantly more expensive)."_

Not scheduled. Recorded because the plumbing to act on it already exists and
is worth knowing about before anyone reaches for a re-export:

- `animationStates` maps state → clip name, so a rig's clips can come from
  anywhere; `ualAnimationStates()` is just the UAL table. A mixed set is a
  different table, not different code.
- `bin/subset-glb.ts` in `../static-assets` composes a GLB from a clip list.
  Combining sources is a manifest question if the rigs share a skeleton — UAL
  is the UE mannequin (65 joints, `root`/`pelvis`/`spine_01`), and Mixamo's
  default rig is NOT, so cross-source mixing needs retargeting rather than
  merging. That is the actual cost, and it is worth measuring before paying
  for Mocap data.
- Per-clip quality varies, so this need not be all-or-nothing: keep UAL for
  coverage and override the handful that read badly.

[ ] **Adopt 1.83 m as the human reference and scale small content UP** — see
CLAUDE.md → "Scale: a person is 1.8 m". Measured 2026-08-27: `omnidude.glb`
is **0.88 m**, half human scale and about the height of a Kenney table,
while the biped's own defaults (5 m/s run, 0.5 m step, a 1.13 m jump, a
1.5 m collision ellipsoid) are human numbers. The rig was the outlier, so
switching makes the existing tuning correct instead of needing new tuning.

Not a like-for-like swap: framing, camera offsets and anything expressed in
"about waist deep" all shift with it. Do it deliberately, demo by demo.

[ ] **The `tosi-b3d` demo has no shallow water, so wade→swim is untestable.**
Measured with the water at its default −0.2: the sea floor drops like a
step, shallowest point **1.37 m** and median **2.41 m**, and **zero**
sampled points are wadeable for a 1.83 m body. You go from dry land
straight to swimming.

Lowering the demo's default water level to about **−1.0** would give a
wading margin (shallowest ≈ 0.6 m) while keeping the deep part swimmable
(≈ 1.6 m, still past the half-body threshold). The slider's −1..4 range was
chosen for the 0.88 m rig and wants revisiting at the new scale too.

Worth having a beach in the test scene regardless — the transition is a
behaviour we now have code for and no way to watch.

[ ] **Quaternius animations: the whole library is on hand — see
`../static-assets/CONTENT-MAP.md` → "Quaternius — Universal Animation
Library".** UAL1 has **120** clips and UAL2 **134**, and a curated
`UAL1_core.glb` (27 clips, 20.4 MB → 5.00 MB) is produced by
`bin/subset-glb.ts` there, with no Blender involved. **If a clip we need is
missing from the subset, add it to the list and regenerate** — nothing has to
be re-downloaded or re-exported.

What that unblocks, all of which is faked or broken today against the stock
rig: **strafe** (`Jog_Left/Right_Loop` — currently a slide), **backwards**
(`Jog_Bwd_Loop` — currently the walk cycle reversed), **the split jump**
(`Jump_Start` / `Jump_Loop` / `Jump_Land` — so the brace can actually hold, the
airborne loop can last the flight, and landings exist), and **sneak holding a
crouch at rest** (`Crouch_Idle_Loop`).

And for MOBILITY-DESIGN.md: `ClimbLedge`, `Climb_Up/Down/Left/Right_Loop`,
`Roll`, `Dodge_Left/Right`, `Crawl_*`, `Turn90_L/R` are all authored already —
the intent model's vocabulary exists before the intent model does.

[ ] `_RM` (root-motion) variants are on the CDN and deliberately unused: the
clip translates the root and `b3d-biped` also translates it, so they fight.
They are what the intent model will want, where movement comes FROM the
animation rather than being painted over it.

## LOCOMOTION: two models, and cover you discover — see MOBILITY-DESIGN.md

Promoted out of this file on 2026-08-27: the design outgrew a TODO section the
moment Tonio named the actual north star, which is not jumping at all.

The short version. `b3d-biped` should bifurcate into a **platform jumper**
(instant jumps, core gameplay verbs) and an **intent model** (you steer, the
character solves the terrain — baulking at cliffs, prepping run-ups, parkour if
capable). And the thing worth building toward is **cover you DISCOVER**: push
into a nook while crouched and you are in cover, walk out and you are not, with
no mode to be stuck in. GTA V and Watch Dogs, plus Mirror's Edge and Tomb
Raider.

The architectural note that makes it tractable: **cover must be derived, never
entered** — the same shape as `isSwimming(submerged, restingOnFloor)`, which is
a function of the world rather than a state machine, and is exactly why entering
and leaving water needs no transitions and cannot desync. And "is this geometry
cover?" is `b3d-interactive`'s "can I use this?" one layer up — an affordance
found in the world rather than declared on a tagged object.

[ ] Not scheduled, deliberately. Animation-led: it wants a real set first
(Quaternius, which also brings props and customisation), because without
vault/mantle/slide clips the intent model has nothing to express and would
degrade to the platform jumper with extra latency.

## OPEN: guided-missile demo crashes on a hit (0.7.0 validation, UNRESOLVED)

Tonio: crashes on roughly the 2nd–3rd missile hit, and it is bad — "I can
navigate to another page but the demo doesn't load until I refresh" (the demo
that then failed to load was **warhead**, i.e. a DIFFERENT page). That
cross-page symptom says the page is wedged, not just this scene: most likely an
exception escaping a render observable, or the live-example runner left broken.

**Not reproduced, and not explained.** Four plausible mechanisms were checked
and every one is already guarded — recorded so nobody re-walks them:

- `spawnMissile`'s `dispose()` is idempotent (`alive` flag).
- `_die()` runs once (`if (this._dead) return` in its observer).
- `damage()` on a disposed destroyable is a null-safe no-op.
- Missile guidance handles a dead target: `if (target.isDisposed()) return //
lost lock — coast straight`.

**Fixed alongside, but NOT claimed as the cause:** the demo's `destroyed`
handler reacted to ANY destroyed event and scheduled a respawn each time, so a
second event queued an extra spawn while the target was already null — orphan
drones that nothing moves or clears. Real bug, same shape as issue #25; may or
may not be related to the crash.

[ ] **Get the console error.** This is the decisive datum and it costs one
reproduction: open DevTools on the flat page, fire until it goes, and capture
the first red error + stack. The pattern this cycle has been that one printed
line ends a hypothesis chain immediately (`hit=frame-panel`, `L:0.00,0.00`,
`seed done`) while reasoning about it does not. Until then this stays OPEN and
**is a release consideration** — a demo that wedges the page is worse than one
that looks wrong.

## Modal dialogs: WORLD-PLACED, with gaze recovery (Tonio's design — 0.7.1)

This supersedes both the face-pinning argument and the per-panel depth guard,
and it is a better answer than either.

Tonio: _"place them in world space in a 'good spot' and then if the user looks
away for more than say 2s, move them to a newly picked face-relative
position."_

Why it beats what we have:

- **World-placed means honest depth.** It sits somewhere real, so it occludes
  and is occluded consistently, stacks with other UI by ordinary z, and does
  not jitter with your head. The whole "band vs race to the front" problem
  stops being a special case — panels are just things in the world.
- **Gaze recovery removes the failure mode that made face-pinning tempting.**
  The reason to head-lock a dialog was "what if you cannot find it". Answer:
  if you look away for ~2s, it comes to you. You get findability WITHOUT the
  thing chasing your eyes, which is what made the pause panel unpleasant.
- **It fixes the case the depth guard cannot.** If the CAMERA is inside
  geometry — cockpit view, nose in a hillside — there is no "just in front"
  that helps, because everything in front of you is rock. A world placement
  picked for clear line of sight is not affected by where the wreck ended up.

Shape: on show, pick a spot with clear LOS from the viewer (raycast a few
candidate directions, prefer near the thing you died to / the scene subject);
place it in WORLD space facing the viewer; run a gaze test each frame, and if
the panel has been outside a generous cone for > ~2s, re-pick and move (an
eased move, not a snap — a dialog that teleports reads as a glitch).

[ ] Build it. Retire `xrFrame: 'body'` on the pause and respawn panels and the
per-panel `_installDepthGuard` at the same time — all three are compensating
for the absence of this.

## Dialog ROLL should follow your head — when we go hard into first person

Deferred deliberately (Tonio, 2026-08-26, after verifying the panel-facing
unification in a headset — including a crash with his head tilted, which is
how this came up): _"more likely when we go hard into first person
locomotion."_ Current behaviour is yaw-only and he is happy with it.

**The question.** Lying sideways on the ground — very often DEAD, which is
exactly when the respawn dialog appears — should the dialog be sideways with
the world, or aligned with your head?

**The answer, when we get to it: aligned with your head, but only once you
really mean it.** Roll is a different KIND of thing from position and
yaw/pitch. Those carry information about where the dialog IS — the whole "a
thing at a place" argument, and why it occludes and why you can touch it. Roll
carries no positional information: rotating a panel about its own view axis
moves it nowhere, so matching your head costs nothing from the world-object
contract and buys the thing the panel exists for. Reading is a RETINAL task;
your vestibular system does not rotate your text recogniser, and 90°-rotated
text is genuinely slow to read. Nobody thanks you for a physically honest
unreadable label.

Consistency argument sitting right there: face-frame panels already roll with
your head, free, because they are parented to it. So today the panels people
like roll with you and the world dialogs do not — this makes them agree.

**Not continuously coupled** — that swims, and it is the same mistake
head-locking the position was. It wants the shape `gazeStep` already has:

[ ] dead zone ~20–25° of head roll (lean your head, nothing happens)
[ ] ~1s sustained beyond it, so a glance-and-tilt costs nothing
[ ] ease to head-up, never snap; shortest-angle, and a lean past 90° must not
flip it end-over-end
[ ] `rollStep` beside `gazeStep` in `dialog-placement`, pure and tested the
same way

**Where NOT to do it:** anything diegetic — a sign on a wall, a console
readout, a label on a crate. Those belong to the world and stay world-up even
when you are on your side. The rule: **the more the surface belongs to the
world, the more world-referenced its roll; the more it is addressed to the
player, the more retinal.** Modal dialogs are the far end of "addressed to the
player", and `roll` on `<tosi-b3d-panel>` is the escape hatch for the other end.

## ENSEMBLE'S STANDING OFFER: world behaviour, prototyped there FOR promotion

`tosijs-3d-ensemble/UPSTREAM.md` §0 is not a request, it is an offer — and the
framing is the useful part:

> **tosijs-3d has almost nothing for building a PLACE, as opposed to a battle.**

That is fair and worth sitting with. We have destroyables, warheads, launchers,
turrets, radar, death — and for a place: a spherical trigger, a point light,
positional audio, and a floating GUI button. They are building the rest against
real content in `src/presets/world/`, with the rules as pure functions in
`world/logic.ts` specifically so the maths ports upstream and only the bindings
get rewritten.

What they have that we lack, their ordering, and the first one carries the rest:

- **A way to TOUCH a mesh.** `b3d-button` is a floating Babylon GUI widget, not
  world geometry you can reach for — so there is no substrate for doors, knobs,
  switches, levers or consoles. Everything below stands on this.
- **Doors** (swing, slide, iris) — and a knob you touch rather than the door.
- **Locks and keys.**
- **Lamps** as authorable objects: type, colour, switching, flicker, shadows.
- **Mirrors** — `b3d-reflections` is a probe, not a reflective surface.
- **Detection volumes** — a camera's cone, not a sphere.
- **Spin in place**, "trivial and conspicuously missing".

[x] **A way to TOUCH a mesh — shipped in 0.7.3** as `<tosi-b3d-interactive>` +
`InteractiveBehavior` over the pure `interaction.ts`. The `vetoes` seam is
their composition finding, taken as designed. What is NOT built, and is the
obvious next layer on top of it: doors (swing/slide/iris), locks and keys as
authorable pieces, lamps, mirrors, cone detection volumes, spin-in-place.
Their `presets/world` rules port onto this substrate as-is.

[x] **Accept the promotion, and take the contract change with it.** Their one
architectural finding is the part I would not have got right alone:
**features must compose on other features ON THE SAME PIECE.** A door
consults `interactive` to know it was used; `interactive` consults
`lockable` to know whether it may open. Without that seam (`ctx.feature()`
there) either every behaviour reimplements the others, or one god-feature
knows about all of them. Whatever lands here needs that seam from the start
— retrofitting composition is how you get the god-feature.

[ ] **§1: no manipulator, flat or XR — their single most important
interaction and their schedule risk.** Babylon's `GizmoManager` is
mouse-shaped, so it only serves an editor that stays flat, and theirs is SVG
UI precisely so it runs in a headset. Their warning is one we have already
paid for elsewhere: **an element that manages a node OWNS its transform**,
rewriting `mesh.position` from `x`/`y`/`z` every frame — so a drag that moves
the MESH is silently undone next frame, and a gizmo's writes must land on the
ELEMENT.

[x] **§2: `destroyable="off"`** — shipped. Their `armor: 100_000` stopgap in
`place-mesh.ts` can be deleted.
[ ] **§3: `library` on `b3d-turret` / `b3d-launcher`** — filed as #34, with the
open design question (which node is the barrel; I lean on a `_barrel` naming
suffix, consistent with `_centerOfGravity` declaring a model's moving parts).

## b3d-water grows the UNDERSIDE (Snell's window) — adopter #15

manta-recon has iterated this on a deployed build with a human judging by eye at
depth, so the numbers below are measured preferences, not guesses. Replied on
the issue. Ships in a PATCH when it is ready — it is additive, and the only
thing gating it is that it wants visual iteration rather than a blind
implementation.

**The defect:** with `twoSided: true` the water plane draws an opaque flat-colour
backface from below — and that backface sits BETWEEN the camera and anything the
game puts under the surface. The general form of the argument, which is the part
worth keeping: **a component that occupies a surface owes that surface a
treatment.** Claiming the space without paying for it is worse than not drawing.

**Definition of done (their tuned values):**

| parameter        | value  | controls                                                        |
| ---------------- | ------ | --------------------------------------------------------------- |
| `windowClarity`  | 0.6    | how much sky comes through; 0 = opaque mirror, 1 = open ceiling |
| tint             | 1.0    | how strongly the water colours what comes through               |
| `underwaterMurk` | 0.002  | murk with depth — reads right at 30–150 m                       |
| `underwaterFog`  | 0.0007 | base density; ~1 terrain tile (1024 u) of visibility            |

**Two notes learned the hard way there, both taken:**

1. **Clarity must move the ALPHA, not just the Fresnel.** Their first version
   varied only `opacityFresnelParameters` and captures at clarity 0 and 1 were
   indistinguishable — in level flight the surface is only seen through a narrow
   band of angles, so a Fresnel-only knob moves off-screen pixels. A control that
   cannot be seen to work is worse than no control.
2. **Cull our own backface** when we draw an underside, or the new surface
   renders behind the old flat one and nothing appears to change.

**Sequencing — this is a MEDIUM item, not a water item.** `MEDIUM-DESIGN.md` §3
already names "the underside shader" as a consumer of the shared optics layer
and cites this exact #12/#15 collision. Optics on `Medium` FIRST (fogColor,
fogDensity, murk-per-metre), then the underside reads depth and murk from it
instead of re-deriving them — otherwise the fogged sky and the window disagree
about where the surface is, which is the bug that produced the collision.

[ ] **Scale-independent defaults.** Their `underwaterFog` 0.0007 vs our 0.12 is
~170×, and it is not a disagreement — ours was set against a pond, theirs
against 1024-unit terrain tiles. Whatever ships should express density in a
way that does not assume one scale (deriving from water extent?), or every
large-world adopter retunes the same two numbers.

## TWO CLOCKS: a fixed simulation step, separate from the render delta

Tonio: _"Unity had a deltaTime value specifically for dealing with per frame
updates vs physics time updates."_ `Time.deltaTime` for rendering and input,
`Time.fixedDeltaTime` for physics, with the render pose interpolated between
fixed steps.

**We have one clock.** `sceneDelta()` is the real inter-render delta and **20
modules consume it** — fly-by-wire, ballistics, guidance, combat, terrain,
ambient, the XR rig. Nothing is fixed-stepped.

Why it matters here specifically, in order of how much:

- **Determinism.** `world-contract` promises a simulation that is reproducible
  and advances only via `tick()` — and `world-store` honours that. Anything
  driven off the render delta does not: the same inputs on a 60Hz monitor and a
  72Hz headset produce different trajectories. That is a problem for a narrative
  driver (Ariosto), for replay, and for any "same seed, same battles" claim.
- **Stability at low frame rates.** A Quest dropping to 20fps hands the
  integrator 50ms steps. Attitude chase and quadratic drag degrade smoothly for
  a while and then do not.
- **Tunnelling.** The aircraft's impact SWEEP exists precisely because a point
  test at speed misses thin geometry. A bounded step attacks that at the source
  rather than per-consumer.
- **Multiplayer**, when it comes: lockstep needs a fixed tick, and the freeze
  conversation already showed which decisions are local-only.

**THE RULE (Tonio): variable time is strictly for COSMETIC things.** Anything
that changes simulation state takes the fixed step. The line is whether two
machines are allowed to disagree about it: nobody can tell if your cloud drifted
a millimetre further than mine, and everybody can tell if your missile hit and
mine missed.

Classifying the 20 consumers now, because this IS the migration list:

| Fixed step (simulation)                                | Variable is fine (cosmetic)                                                 |
| ------------------------------------------------------ | --------------------------------------------------------------------------- |
| `b3d-aircraft` — flight integration                    | `b3d-ambient` — motes, bubbles, leaves                                      |
| `b3d-launcher` — ballistics, ammo regen                | `b3d-clouds` — drift                                                        |
| `b3d-turret` — slew, lead, firing                      | `b3d-water` — wave animation                                                |
| `b3d-warhead` — staggered shockwave damage             | `b3d-planet` / `b3d-star` / `b3d-star-system` / `b3d-black-hole` — rotation |
| `b3d-radar` — lock acquire/decay                       | `b3d-svg-plane` — dialog easing, gaze clock                                 |
| `b3d-spawner` — seeded encounters                      | `b3d-death` — spectator orbit                                               |
| `world-store` / `world-view` — the deterministic store | `b3d-exploder` — debris                                                     |
|                                                        | `tosi-b3d` — fog transitions, ambient watchdog                              |

Roughly an even split, and the cosmetic half is genuinely fine as it is — this
is not a rewrite, it is moving eight modules onto a different clock.

[ ] **Make the wrong choice hard to make silently.** Today every call site
writes `sceneDelta(scene)` and the distinction lives in the author's head. Add
`simDelta(scene)` beside it so picking is explicit, and say on each which one
you want — a name is the cheapest enforcement there is, and this codebase has
already paid twice for a rule that lived only in a comment (the world-matrix
ray origins, the UI collision exclusion).

**What we already got right, which makes this cheap:** every pure model takes
`dt` as a PARAMETER (`fly-by-wire`, `ballistics`, `guidance`, `world-store`), so
none of them needs rewriting — only the driver changes. And `sceneDelta` is a
single choke point, so there is one place to introduce the split.

[ ] **Add an accumulator to `<tosi-b3d>`.** Consume real elapsed time into
fixed steps (1/60 is the obvious default), run the simulation N times per
frame, keep the remainder. Expose BOTH: `frameDelta` (variable, for
rendering, camera easing, UI) and the fixed step (for anything that
integrates). Clamp steps-per-frame — an unbounded accumulator on a slow
frame spirals, and we already clamp `dt` to 0.1s for the same reason.
Composes with pause/freeze for free: a stopped clock simply feeds zero
steps.
[ ] **Then decide about interpolation.** Rendering at the last fixed step
judders at rates that are not a multiple of the step; interpolating the
render pose between steps is the standard fix and is what makes Unity's
split invisible. Worth doing only after the split exists — and it interacts
with the chase-rig jitter already on the list, which may turn out to be the
same phenomenon.

Promote to its own design doc if it grows past this. Cross-refs:
`PERF-DESIGN.md` (where the frame budget is spent), `world-contract.ts` (the
determinism promise this would let us actually keep).

## WATCH LIST — non-fatal, seen once, keep an eye out (Tonio, final pass)

Neither is a blocker; both were explicitly "not fatal, just keep an eye out".
Recorded so a second sighting is recognised as a pattern instead of re-derived.

[x] **A paused scene entered in VR shows no pause panel** — RESOLVED by
removing the state: **entering VR now unpauses** (Tonio: "arguably entering
VR should unpause a paused scene"). Putting the headset on IS the resume,
and it is symmetric with `enterXrOnResume`. The presentation bug is still
real underneath — a `cameraRelative` plane created before entry is never
re-parented onto the XR camera, because that happens in `render()` and a
paused scene may not re-render the element — so **if any other pre-existing
camera-relative panel goes missing on entry, that is the cause.** Not
chased further: no other panel is created while paused.
[ ] **Exiting VR resets the camera position** (with the converted orbit rig).
Distinct from the re-seat issue already queued: the re-seat is fixed, but
the position still snaps rather than carrying back. Same root as the 0.7.1
carry-back item — verify both together when that lands.

## THE CHASE RIG — MEASURED 2026-08-26. Flat is rigid; VR is not parented at all

Tonio: _"if things are parented correctly that should just never happen."_ Right —
and the measurement says **flat IS parented correctly and VR is not.** The old
hypothesis in this slot (the CoG pivot; "two things deriving from each other at
slightly different times") is **disproved** — recorded here rather than deleted,
because it was plausible for months and cost nothing only because it was finally
measured.

**Method.** Instrumented the live `/b3d-aircraft/` demo: walked the parent chain,
then recorded 400 frames of a sustained banked turn at ~61 m/s, logging the
aircraft's position **in camera space** — the quantity that is constant if and
only if the rig is rigid.

### Flat chase: rigid. Not the bug.

```
chase FreeCamera → aircraft-chase-pivot <TransformNode>   (scene root)
scout_instance_0 <TransformNode>                          (scene root)
```

The camera is a real child of the pivot at a fixed local offset, and the pivot
copies `node.absolutePosition` in the same tick the airframe moved.

| measured over 350 frames, 61 m/s banked turn |                                        |
| -------------------------------------------- | -------------------------------------- |
| aircraft position in camera space            | **sd 0.0000 m, total spread 0.0002 m** |
| updates per rendered frame                   | exactly 1 (no double-update)           |

**0.2 mm of spread over a banked turn is rigid.** The aircraft cannot visibly
jitter against the flat chase camera. Whatever is seen flat is the WORLD moving
unevenly, not the rig.

### What does move flat: the world, at wall-clock dt

|                              | mean     | sd               | spread  |
| ---------------------------- | -------- | ---------------- | ------- |
| frame gap                    | 38.1 ms  | 4.0 ms           | 9.3 ms  |
| `dt` fed to the flight model | 38.2 ms  | 4.2 ms (**11%**) | 9.0 ms  |
| world travel per frame       | 2.36 m   | 0.28 m (**12%**) | 0.92 m  |
| fbw speed                    | 61.3 m/s | 2.3 m/s (3.7%)   | 7.9 m/s |

Per-frame travel varies by 12% while the speed varies by 3.7%: **the travel
variance IS the dt variance.** `B3dControllable._update` integrates by `Date.now()`
elapsed sampled when the update runs, which is not when the frame is presented, so
the pose shown at presentation time is integrated to a moment that drifts around it.
At 61 m/s a 4 ms timing error is 24 cm of world shift. That is the \*\*fixed-timestep

- interpolation\*\* item above, not a parenting fault — and it is the same phenomenon
  that section predicted these would turn out to share.

(Measured in a private Electron window running ~26 fps, so the absolute numbers are
that host's. The RATIO — travel variance tracking dt variance — is the robust part.)

### VR chase: not parented, and eased with a frame-rate-dependent lerp

`tosi-b3d.ts` ~3380–3440. The XR rig is **explicitly un-parented** (`rig.parent =
null`) and its position is chased in world space every frame:

```js
const posT = Math.min(1, (isChase ? 9 : 16) * dt)
chasePos.x += (targetX - chasePos.x) * posT
```

Three problems, all of which the flat pivot does not have:

1. **`lerp(a, b, k·dt)` is not frame-rate independent.** The correct form is
   `1 - Math.exp(-k·dt)`, which this file's own neighbour uses
   (`b3d-aircraft`'s look-spring: `Math.exp(-lookReturn * dt)`).
2. **A first-order tracker lags by `v/k`.** At `k = 9` and 61 m/s that is **~6.8 m**
   — and it is proportional to SPEED, so the aircraft drifts forward in the frame
   as you accelerate and back as you decelerate. That alone reads as swimming.
3. **Head-pose compensation is applied a frame stale.** The rig subtracts
   `cam.position` (the tracked head offset) to land the head at `chasePos`, but the
   compositor **late-latches** the real head pose after JS has run. Parenting is
   exactly what makes late-latching correct: the head is resolved WITHIN the rig.

**Confirmed in a headset before building** (Tonio): _"Throttle up the aircraft gets
further away. Throttle down it gets closer."_ That is the `v/k` lag exactly — a
prediction the generic-judder explanation does not make.

[x] **Built: the rig is PARENTED.** `B3dControllable.getChaseAnchor()` is the new
seam — a level position+heading node the entity updates in the same tick it
moves (`b3d-aircraft` maintains one, lazily, so a flat scene carries no node
per craft). The XR chase branch parents the rig to it at a fixed local offset
and no longer eases anything. Head compensation stays: `cam.position` is your
whole standing height in a floor-level reference space, and the residual
staleness is a frame of HEAD motion (millimetres), not aircraft motion (metres).
[x] **Remaining easing converted to `1 - Math.exp(-k*dt)`** — only entities with
no anchor (a biped, a car) still take that path.
[ ] **Needs a headset run.** Flat is proven unregressed by measurement (aircraft
in camera space still z = 9.36, sd 0.00004 m) and the anchor tracks the
aircraft with ZERO error — but the parented VR path itself cannot be
exercised flat.
[ ] Give `b3d-biped` and `b3d-car` anchors too, and the fallback path can go.

### Latent, found while reading: `AbstractMesh.render()` can fight the flight model

`B3dControllable extends AbstractMesh`, whose `render()` rewrites
`mesh.position` from the element's `x`/`y`/`z` and `rotationQuaternion` from
`rx`/`ry`/`rz`. `b3d-aircraft` sets `this.mesh = root` **only when the loaded root
is a `Mesh`** — for the scout it is a `TransformNode`, so `render()` is inert and
this has never bitten. Load a **single-mesh** aircraft and any element render
(setting `chasePitchFollow` from the scene panel is enough) teleports it back to
its spawn `x/y/z` and levels its attitude. Same family as #35.

[ ] Either stop `AbstractMesh.render()` owning the transform once a controllable
has taken control, or sync `x/y/z`/`rx/ry/rz` back each frame. The first is
safer — writing six attributes per frame re-triggers render.

## Wreck fall — DONE 2026-08-26, and what it did NOT fix

A wreck now tumbles to the ground (`wreck-fall.ts`, pure + tested; driven from
`b3d-death._startFall`). Verified live: died at 66 m, landed at exactly y = 0,
108 m downrange, tumbling, then sat still for 460 frames — no drift, no
micro-bouncing.

Two things the measurement caught that reading would not have:

- **Drag was 10× too high** at first (`0.02`). `a_drag = k·|v|·v` is 162 m/s² at
  90 m/s, so a wreck shed its speed in half a second and fell almost
  vertically out of a fast dive — 97 m downrange from 90 m/s. Terminal
  velocity is `sqrt(-g/k)`, so `0.002` (≈70 m/s) is the right order. It looked
  entirely plausible until it met a real crash.
- **Nothing under it is a real case.** Killed at z ≈ 1690 in a demo whose ground
  is 600 m across, the wreck reached y = −25 and kept going, with the spectate
  camera chasing it down and the observer never coming off. Now abandoned
  1500 m below the death point.

[ ] Still open: a wreck rests with its ORIGIN on the surface, so a model whose
origin is not at its belly will sit slightly proud or slightly sunk. Reads
as "dug in" at the shallow angles a tumble ends at, so it is not obviously
wrong — but `groundClearance` exists on the aircraft and could be used.
[ ] Not addressed: respawn puts you back at the authored spawn while the wreck
stays where it fell, so it is "off in the distance" by design (the demo's
`respawn()` appends a FRESH aircraft — the sim really emits a death and a
spawn). If respawn-near-death is wanted it is a scene-level choice, and it
wants #40 (spawn at an authored place) first.

## COCKPIT DEATH — the "moved way away from me" half is SOLVED (2026-08-26)

The wreck-far-away half of this was never the wreck moving. `releaseFocus()`
nulls the focused entity, the next XR frame finds nothing piloted and falls
through to free locomotion, which did **`rig.parent = null`** — and that keeps
the LOCAL pose and reinterprets it as world, so a rig sitting at local
`(0, 2, −5)` behind its parent lands at `(0, 2, −5)` in the WORLD. You are
teleported to the origin; the wreck stays where you died. Measured: a corpse
drifts 0.05 m in 10 s.

Only the COCKPIT branch parented the rig, which is why this sat here for five
months as a cockpit-only oddity. Parenting the CHASE rig (the jitter fix) made
it reachable from the view people actually fly in, and Tonio hit it on the first
run: _"respawned at the origin or starting point with the wrecked plane hanging
in mid-air off in the distance."_

Fixed with `rig.setParent(null)` at both unparent sites, and both spellings
pinned in `babylon-orientation.test.ts` — they look interchangeable and the
wrong one is shorter.

**The lesson worth keeping:** a latent bug reachable from one rarely-used path
is not a small bug, it is an undiagnosed one. This was written off as "cockpit
is weird" precisely because nobody flew cockpit enough to characterise it.

[ ] STILL OPEN, the other half: dying in cockpit view put the respawn dialog
under the ground (only its top edge showing). World-placed dialogs with gaze
recovery landed since, and the panel now casts for clear line of sight — so
this may already be gone. Re-check on a cockpit death before spending
anything on it.

## UI depth: a BAND, not a race to the front — QUEUED FOR 0.7.1

Camera-relative dialogs were being swallowed by terrain. First attempt set
`renderingGroupId = 1`, which fixed only the LOOK: rendering group does not
affect PICKING, so the panel stayed geometrically behind the hill, XR rays hit
the hill first, and the dialog became visible-but-dead — worse than being
honestly buried, because it invites a press that cannot land. Now each
camera-relative panel measures what is between you and it and sits just inside,
scaling to hold apparent size, so **what you see is what you can touch**.

[ ] **Generalise to a depth BAND before two panels can be open at once.**
Tonio: _"we need to be careful about 'genuinely in front' when it comes time
to stack UI elements. We may need to push stuff backwards vs. forwards."_
Exactly — each panel currently races forward independently, so several would
clamp to the same distance and fight, and the pull-forward would destroy the
relative ordering it exists to preserve.

The shape: the SCENE (not the panel) measures the nearest occluder once per
frame, seats the front-most element just inside it, and stacks the rest
BACKWARDS in `DEPTH_STEP` increments — `popup-surface`'s `stackLift`
ordering, but with a moving front edge. It also wants the `bringToFront`
invariant fix already filed, since both are about one owner of depth rather
than several.

Today only one camera-relative dialog is ever up (pause OR respawn), which is
why the per-panel version is correct and shippable now.

## Exiting VR re-seats you — QUEUED FOR 0.7.1 (a tradeoff I chose)

Tonio: "when you exit VR you get reseated automatically. It's actually not bad
but it isn't normal behavior." Correct, and it is mine — not a bug so much as
the wrong horn of a dilemma.

Fixing "exiting VR drops the flat camera to the floor" (`3847b88b`) made entry
SNAPSHOT the orbit camera's alpha/beta/radius/target and exit RESTORE it. That
kills the altitude collapse, but it also discards wherever you moved to in VR —
which is what reads as an automatic re-seat. And it contradicts what Tonio
asked for in the 08-21 pass: _"exiting VR DOES carry the VR pose back… it'd be
kind of nice if that was symmetric."_ He liked the carry-back; the only problem
was that Babylon dumps a raw walked POSITION into an `ArcRotateCamera`, which
then recomputes a floor-level orbit.

[ ] **Carry the pose back properly instead of restoring.** Derive orbit
parameters from the headset pose rather than letting Babylon assign a
position: keep the target, set `radius = distance(headPos, target)` (clamped
to `lowerRadiusLimit`/`upperRadiusLimit`), and compute `alpha`/`beta` from
the head→target vector (clamped to the existing beta limits). You then exit
looking at the scene from where you were standing, which is the symmetric
behaviour asked for, with no floor collapse.

Falls back to the current snapshot-restore when there is no XR camera pose,
so nothing regresses if the pose is unavailable at exit.

**Queued for 0.7.1** (Tonio): not bad today, and the fix — if it is one — is
non-breaking, so it does not justify holding a tag. It is also VR-only and
unverifiable by me, and landing that blind late in a release is how the
panel-behind-you bug took three attempts.

## When haltija reaches a headset (the remote bridge)

tosijs-ui is cutting a release, and haltija-over-the-bridge is next — which
removes the biggest pain point this project has. Right now the only channel out
of a headset is a human reading a panel aloud.

[ ] **Stream `debugLog` over the bridge when it lands.** The plumbing is already
the right shape and was built this way deliberately: `logDebug(tag, event)`
writes frame-stamped structured events into a ring, and the Perf rows
(`aircraft ground`, `xr input`, `errors`) are just human-readable VIEWS over
it. So this is wiring, not a redesign — point the ring at the channel and the
same data an agent currently gets by asking becomes something it can read.
[ ] **Revisit tosijs-ui#99 (the `/__debug-sink` endpoint) once the bridge
exists.** #99 asked for a POST endpoint precisely because the dev channel is
loopback-gated and cannot reach a headset. If the bridge solves that
properly, #99 may be redundant — or may still be worth having as the
no-haltija path (CI, a phone, a colleague's device). Decide rather than
leave both half-built.
[ ] **Retire the read-it-aloud workflow from the checklist** once streaming
works: `reviews/0.7.0-headset-checklist.md` currently tells Tonio to read
specific Perf rows back. That instruction should become "reproduce it and I
will read the stream".

## Turret firing arcs (Tonio, 0.7.0 validation pass)

Observed: the turret works, but "only hits if smarter or higher muzzle
velocity". That part is **by design** — `smart` gates drop compensation, so a
low-smart turret leads but shoots FLAT and misses anything far or high. The
artificial-stupidity dial doing its job.

[ ] **Support firing arcs.** Two readings, and they are different features —
settle which (or both) before building:

- **High-angle fire (lobbing).** `ballisticAim` returns ONE solution, the
  flat/low one. A ballistic problem has two, and the HIGH arc reaches targets
  beyond flat range at the same muzzle velocity — a mortar rather than a
  rifle. Would let a dumb-but-lobbing turret be effective without raising
  `smart` or `muzzleSpeed`, which is a much better dial for "emplaced
  artillery" than either. Probably `arc: 'low' | 'high' | 'auto'` on the
  turret, with `ballisticAim` gaining the second root.
- **Traversal / elevation LIMITS** — the gunnery sense of "firing arc": a
  turret that can only bear on a sector (hull-mounted, casemate, a gun that
  cannot depress below the parapet). `can-bear` already exists as a flag but
  the arc itself is not authorable. This makes emplacements tactical: you
  flank the arc rather than out-ranging it.

Both are cheap on top of what exists (`ballistics.ts` is pure and tested), and
the second composes with the first. Neither blocks 0.7.0.

[ ] **Warhead demo: steer the reticle CAMERA-RELATIVE, not world-axis.** Tonio:
_"it's quite weird to use it with the view rotated, and you really need to
rotate the view to see the way the cover works."_ Those two halves are the
whole argument — the demo's own subject (a wall casting a blast shadow) is
only legible if you orbit, and orbiting is exactly what breaks the controls.
Today `drive()` adds `input.turn` to world **x** and `input.forward` to world
**z**, so once the camera has swung 90° "forward" pushes the reticle sideways.

Fix: project the stick through the camera's yaw before applying, the same
thing free-fly locomotion already does (`cam.getDirectionToRef` flattened to
the floor). Roughly:

```js
const yaw = el.camera.alpha // ArcRotate: camera yaw about the target
const c = Math.cos(yaw),
  s = Math.sin(yaw)
state.rx += (input.turn * c - input.forward * s) * SPEED * dt
state.rz += (input.turn * s + input.forward * c) * SPEED * dt
```

**Checked, and it does NOT recur — the fix is local.** I expected a sweep and
grepped for the same shape: `b3d-car` turns the car's own heading, the
`b3d-controller` rover is tank-style (rotate then advance along its facing),
and `b3d-launcher` steers its own azimuth via `ry`. All three are
entity-relative and correct. The warhead reticle is the only place a stick
drives WORLD axes directly, which is exactly why it is the only one that
feels wrong when the camera moves. Screen-relative is what every RTS and
cursor does, and it is the reason nobody notices until they orbit.

## 0.7.0 pre-tag gate — follow-ups NOT fixed (2026-08-23)

Full report: `reviews/0.7.0-pre-tag-gate.md`. Blockers and verified majors were
cleared in-session; everything below was **deliberately deferred**, which is a
different outcome from "reviewed and fine".

### Decide before the next release

[ ] **0.7.1 — decide which half of an angle pair is STORED.** `turnRateDeg` is
a JS accessor and `turn-rate-deg` is therefore not a valid attribute, because
`turnRate` holds the stored `initAttributes` slot and both cannot (they would
diverge on the first write). Inverting it — degrees stored, radians as the
accessor — is the right end state given "the authoring surface is degrees",
but it is a real migration for anyone using `turn-rate`, so it is a patch-cycle
decision, not a mid-release one. CLAUDE.md now states the constraint and
requires the attribute row to say which form is available; this item is the
inversion itself. Audit the other pairs at the same time.

[ ] **0.7.1, FIRST ITEM — publish a VETTED `tosijs-3d/demo-utils` subpath.**
Decided 2026-08-23: DX and non-breaking, so it lands as a patch rather than
holding 0.7.0. Tree-shaken, so the only real cost is the API commitment —
and the vet found the current module is NOT publishable as-is:

| Export                        | Verdict                                                                                                                                                                       |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TEST_PATTERN` / `TEST_GRID`  | ❌ root-absolute paths (`/tosi-test-pattern.svg`) that exist only in OUR `static/` — a broken promise in any consumer project                                                 |
| `demoSun`                     | ⚠️ `opts: Record<string, unknown>`; also hard-wires `shadowTextureSize: 2048` over the device-tier budget                                                                     |
| `patternGround` / `demoStage` | ⚠️ asset-dependent, and `sun?: Record<string, unknown>`                                                                                                                       |
| `orbitCam`                    | ⚠️ `alpha`/`beta` are RADIANS with no `Deg` sibling — violates the convention settled the same day, in an options object that already has `minElevationDeg`/`maxElevationDeg` |
| `spinner`                     | ✅ typed, but depends on `TEST_PATTERN`                                                                                                                                       |
| `volumetricDemo` (180 lines)  | ❌ an SDF-lattice x-ray for one page                                                                                                                                          |
| `impactMarker`                | ❌ demo effect; allocates per impact, skips `computeWorldMatrix`                                                                                                              |

**Ship it with an explicit STABILITY DISCLAIMER** (Tonio): dev helpers are
intrinsically not going to get the support level the main API gets, so say
so where a consumer will actually read it — the module's own doc page, the
`## Attributes`-adjacent intro, and a line in the README. Wording to the
effect of: _these exist so the examples run; they may change or vanish in a
patch, they are not covered by the deprecation courtesy the main API gets,
and production code should not depend on them._ Publishing without that is
how a convenience becomes a support obligation by accident — and it is the
whole reason the vet below matters less than the promise we attach to it.

**Publish only after:** `orbitCam` takes `alphaDeg`/`betaDeg` (radians
dropped); both `Record<string, unknown>` typed; the asset dependency
resolved (`texture?: string` or `assetUrl()`) rather than exporting paths;
`shadowTextureSize` dropped to the `0` auto sentinel. `volumetricDemo`,
`impactMarker` and the constants stay PRIVATE and their four examples get
inlined. `orbitCam` alone is **30 of the 38 imports**, so the vetted subset
closes almost the whole gap. Do it early in 0.7.1, while `orbitCam`'s
signature can still change without a same-day breaking note.

[ ] ~~`demo-utils`: 38 examples import an unresolvable specifier~~ — superseded
by the item above; the ratchet test holds the count at 38 meanwhile. CLAUDE.md puts the demo FIRST on every page, so it is the first
code an adopter or agent copies off the doc site, and it fails with "Failed to
resolve module specifier". Deferred because both fixes are large or
commitments, hours before a tag: **(a)** inline the two or three lines
`orbitCam`/`demoStage` actually do — 33 files of churn, or **(b)** publish
`demo-utils` as an `exports` subpath and rewrite the specifier to
`tosijs-3d/demo-utils` — one sed, but it makes demo helpers public API we then
maintain. A RATCHET test now caps the count at 38 so it cannot grow unobserved
the way it went 32 → 38 this cycle. **Tonio's call: (a) or (b).**
[ ] **`turnRateDeg` is documented in the attributes table but is a plain
accessor**, not in `initAttributes` — so `turn-rate-deg="90"` is silently inert
while the JS prop works. Settle the `<name>Deg` convention now; every future
alias inherits whatever we do here.
[ ] **Shipped sourcemaps dangle** — they point at `../src/*.ts`, which `files`
excludes, so every consumer gets broken go-to-definition against the stated
"browseable source" promise. Add `src` to `files`, or `inlineSources`, or stop
emitting maps. `files` was edited this cycle, so it wants settling.

### Correctness / robustness

[ ] `bringToFront` mixes a frame-stale `mesh.position` with an already-updated
`stackLift`, so two restacks in one frame leave a popup a `DEPTH_STEP` short
and permanently break the `position − lift === base` invariant; the `tearOff`
path gets no lift at all. Fix: track an un-lifted `basePos`.
[ ] `B3dInputFocus._checkInteract` polls input every render with no
paused/frozen/suppressed/focus gate — press interact behind the pause panel and
you enter a vehicle in a stopped world. **Now cheap:** route it through the new
`controlsLive()`.
[ ] An integration test for the popup modal ORDERING bug (open a modal against
an already-ready owner). `modalPickable` is pinned pure, but the bug was in
call order, which pure tests cannot see.

### Efficiency

[ ] `openPopup` has no `updateInterval` escape hatch — every popup
re-serializes its whole SVG ~33×/s (deep `cloneNode` + `XMLSerializer` before
the dirty-check early-out), measured 0.5 ms per serialize at 300 nodes on an
M-series Mac and several× that on a Quest. Add `updateInterval?` to
`PopupSurfaceOptions`, default 200–400 ms to match the scene panel.
[ ] `demoSun` hard-wires `shadowTextureSize: 2048`, overriding the device-tier
budget for all 14 demos including on a headset (4× the shadow VRAM on the
lowest tier). Drop to the `0` auto sentinel.
[ ] `originWorld()` allocates a Vector3 and forces a world-matrix recompute
twice per frame on a path documented as allocation-free — use a scratch +
`TransformCoordinatesToRef`.
[ ] `impactMarker` builds two meshes + a material + an observable per impact
(~30/s in the collisions demo); pool the geometry.
[ ] `el.make.*` feeds `B3d.pastAdditions`, which is never pruned — a
spawner-facing API holding strong refs to disposed meshes forever.
[ ] `B3dLibrary.make` mints a fresh Proxy per property access, unlike
`B3d.make` which caches.

### DRYness

[ ] `roundedRectGeometry` → mesh is written twice (`make-mesh`,
`b3d-svg-plane`) and has already drifted on radius default and side
orientation; `rounded-rect.ts` names a `createRoundedPlane` bridge that was
never written.
[ ] "Place a node from x/y/z + rx/ry/rz degrees" exists twice, each with its
own `const DEG` — in the release that just paid for a units divergence in
exactly this code.
[ ] Two incompatible `uvToViewBox` functions now exist, one exported from the
barrel.
[ ] Camera yield-and-restore is written a third time in `popup-surface`, and
the `cameraIsAttached` guard learned from the pause bug is in only two of the
three copies.
[ ] The happy-dom prologue is copy-pasted into **23** test files (3 added this
session). Collapse into `src/test-dom.ts` + a `bunfig.toml` preload — not done
mid-release because it changes global test config.
[ ] `demo-utils` still hand-rolls the MeshBuilder + material + register +
`computeWorldMatrix` sequence `el.make` exists to replace, and `impactMarker`
skips `computeWorldMatrix` — the one trap make-mesh calls out.

### Coverage

[ ] `make-mesh.ts` — 329 lines of public API with **zero tests**, including the
`worldMatrix:false` failure it was written to prevent (reproduced: a box at
z=6 ray-hits at z=0.1) and the degrees contract whose sibling path earned a
⚠️ Breaking entry this cycle.
[ ] `popup-surface.ts` — 697 lines, the release's headline UI feature, has no
state-machine tests beyond the pure pieces now extracted.
[ ] The `B3dControllable` halt is now pure and tested (`sim-gate.test.ts`), but
the element-level path around it still is not.
[ ] `_camParented` and the glass-gamepad fade fix have no regression tests; the
fade fix is a DELETION, which is exactly what a future edit re-adds by accident.
[ ] Both doc-scanning tests can pass vacuously — assert a non-empty corpus.
[ ] **No `test` script in `package.json` and no CI.** Nothing runs `bun test`
or `bun run typecheck` on any commit or tag; B1 is the cost, twice. The suite
is 1.5 s, so cost is not the obstacle.

### Docs

[ ] `rounded-rect.ts` JSDoc points at a nonexistent `createRoundedPlane` and
says "Default 6" where the code is `?? 4` — both ship in the `.d.ts` and are
what a consumer's IDE hover shows.
[ ] `popup-chrome` is a published doc page for a module no consumer can import.
Export it or mark it internal; either way add its Key Files row.
[ ] Stale radians JSDoc sits directly above the new degrees JSDoc on
`GulleyOptions.heading`, and `MissileOpts.turnRate` has the same doubled shape.
[ ] CLAUDE.md is now inaccurate on three points introduced this cycle: the
blanket "do not re-export" rule vs `export * as BABYLON` (say why Babylon is
the exception — single-instance `instanceof`), the demo-authoring note that
warns against aliasing BABYLON without saying where it comes from, and
`popup-chrome.ts` missing from Key Files.

### Process

[ ] The lens-8 write-back loop has failed **twice** — none of the rc.1 or final
gate items landed in `tosijs-coding-practices`, and the final gate re-derived
two from scratch. Two landed this session (`fe03680`: report path, prerelease
monotonicity); the rest of the queue has not.
[ ] `RELEASING.md` renumbers the shared flow (local 8/9 = publish/push vs
canonical 7/8/8b/8c/9), so "completed step 9" skips both post-publish
verifications and the scoreboard. Cut it down to the divergences it owns.

## 0.7.0 VR pass 2 — Tonio, 2026-08-22

Second goggle pass after the CoG re-export + cert fix. Most of the 08-21 list
still stands (cross-referenced, not duplicated); this pass adds one **new and
serious** class of bug and two concrete feature asks. The reload-fast load is
confirmed and the stick clipping is confirmed FIXED on this machine.

### SOLVED — the phantom collision was the UI

**`crashReport` named it: `hit=frame-panel`.** The aircraft's impact sweep was
hitting the **spatial UI panel** floating in front of the cockpit and calling it
terrain. The sweep crashes on ANY hit above `crashSpeed` (no slope test), so it
was an instant kill.

Everything now fits, including what refuted the earlier theories: it needs no
terrain (the panel rides a head/body frame), it only bites in **cockpit view**
(that is where the camera — and its frame panels — sit close enough to the
airframe to fall inside a ~2m sweep), and it fires on **bank** because banking
swings the velocity vector into the panel.

FIXED by separating two questions that had shared one answer: a panel must stay
`isPickable` (that is how a controller ray targets it) but must be invisible to
COLLISION. `markUiMesh`/`isNoCollide` (b3d-utils) is the first of the collision
GROUPS in `COLLISION-DESIGN.md`; applied to `frame-panel`, `b3d-svg-plane` and
the XR settings panel, and filtered in both aircraft predicates. Pinned in
`no-collide.test.ts`.

[ ] **Sweep the other collision predicates** — the launcher's swept projectile,
turret LOS, warhead gather and `b3d-collisions` all build their own
predicate, and none excludes UI yet. Same bug is latent in each: shoot
through your own settings panel, or have it block a turret's line of sight.
This is the "one shared `probe()`" argument in COLLISION-DESIGN.md, now with
a scar to point at.
[ ] **Make UI exclusion the DEFAULT, not opt-out** (Tonio: Unity ships a few
groups by default and UI is the obvious one to exclude from all non-UI
physics). The shipped `isNoCollide` is opt-out — every predicate must
remember `&& !isNoCollide(m)` — and a rule each call site must remember is
precisely what produced this bug in the first place. The reusable probe
should skip `ui` and `sensor` with NO group argument, so the four predicates
above become correct by construction rather than by diligence, and "I want
to hit UI" becomes the loud, rare, explicit case. See COLLISION-DESIGN.md →
"Default groups".

### Re-seat (fixed, with one known rough edge)

[x] **Re-seat defeated itself** — it takes your current head yaw as forward, but
you had to LOOK AT the button to press it, so a panel that had drifted left
re-seated you facing left. Now the button raises a **face-locked prompt**
("look comfortably ahead, then pull the trigger") and captures the yaw on the
trigger instead. Face-locking is normally something we avoid; this is the one
case that earns it, because the instruction must stay readable WHILE you turn
your head. Pressing Re-seat again cancels. The SYSTEM recentre (Meta button)
still acts immediately — you were already looking where you meant.
[ ] **Adopt the new status surfaces** (`w3dTheme.info`/`warning`/`error`,
added with the re-seat prompt at Tonio's suggestion — "we might want standard
warning, info, and error colors and this would be info"). Nothing else
hand-rolls one today, so there is no migration debt, but two obvious
candidates exist: `b3d-death`'s panel reads as `error`, and a PULL UP / stall
warning reads as `warning`. Do it when touching those, not as a sweep.
[x] **The confirming trigger also fired the gun** — FIXED with a MODAL input
gate (`b3d.suppressInput`), not a pause: a `pause()` raises the pause panel,
can enter XR on resume, and would clobber an existing pause when it lifts.
The controls go dead while the prompt is up; the world keeps running.
Answers Tonio's "can reseat also automatically pause to avoid the shooting
issue" — the intent, without the side effects. Prompt is now numbered, with
RIGHT trigger = reseat and LEFT trigger = cancel. Time ALSO freezes by
default (`reseatFreeze="on"`), via a `freeze()` that stops the clock without
the pause panel or pause's resume semantics — a scene paused underneath
stays paused. Tonio flagged the constraint that shaped the split:
**freezing is local and a networked world cannot honour it**, so the input
gate is the floor and the freeze is policy, `reseatFreeze="off"` for
multiplayer.
[ ] **Multiplayer will need this split everywhere, not just here.** Any modal
that stops the world (inventory, map, dialogue) has the same shape: gate
input locally, freeze only if the world is yours to freeze. Worth a
`localOnly`-style convention before the second one is written, rather than
after the fifth. See MEDIUM/SPATIAL-style design note if it grows.

[x] **Re-seat did nothing in an aircraft's CHASE view** — FIXED. Three camera
paths capture yaw separately (cockpit `yawCaptureNeeded`, free
`freeYawNeeded`, chase/FPV `chaseFirstFrame`) and `rearmYaw` only re-armed
the first two. Toggling cockpit↔chase "fixed" it because the view-change
path sets `chaseFirstFrame` — the toggle was the repair, not the button.
**Any yaw capture added later must be re-armed in `rearmYaw`**, or it
inherits this exact bug; the comment there says so.

### VR ENTRY ORDERING (new, pass 2 follow-up)

[ ] **On first XR entry the rig is wrong; toggling views fixes it.** Tonio: the
panel was behind him and "the aircraft was nowhere in sight", then
_"when I toggled views things corrected themselves including rig
positioning"_. So the seed is computed too early — before the piloted entity
/ focus is settled — and the view toggle recomputes it correctly. That the
toggle is a reliable repair is the strongest clue we have: **compare what
`setCameraView` does on toggle with what `_startDefaultXrExperience` does at
entry, and make entry run the same path.** Likely suspects: `focusEl.focused`
still null when the rig seeds (so it takes the free-fly branch and seeds from
the flat camera), and the one-shot `playerDriven`/grid decision made at setup.

### Superseded — the terrain hypothesis (kept: it is how the above was found)

[ ] **Flying high, nowhere near terrain, you suddenly "collide with a skirt" at
the wrong altitude — a real death, respawn fires.** Reproduced repeatedly:
chase view is fine, switch to cockpit/first-person, roll left, and you're
instantly in the ground while the plane is visibly still up in the air. Hit
in **b3d-terrain, b3d-clouds, and the aircraft demo** — i.e. every scene with
`b3d-terrain` under it. NOT present in warhead (flat ground plane).
[ ] **A phantom grid appears "off in the distance, at the wrong location
relative to the volcano, makes no sense" — visible only in VR, not flat**
(carved-landforms / volcano demo). Almost certainly the SAME bug wearing a
different hat.

**REFUTED: floating origin.** Tonio: it happens in the **aircraft demo, which
has no terrain** (flat `b3dGround`, no `resetOrigin`, no origin panel) and
**"really soon after flying"** — a rebase needs a coarsest-tile of travel. Dead.

**Also ruled out, by measurement not argument (2026-08-22):**

- **Own-mesh exclusion is complete** — `getChildMeshes()` captures 36/36 pickable
  descendants of the scout, 0 missed. The rays are not hitting the airframe.
- **The HUD is not it** — `b3d-hud` sets `isPickable = false` and BOTH ray
  predicates re-check it.
- **CoG pivot drift is real but too small** — measured 0.11 m at 30° bank,
  0.43 m inverted. A genuine bug (fixed, below); cannot move you from 80 m to
  the ground.

**FIXED — collision rays fired from `node.position`.** Both `raycastGround` and
the impact sweep used `node.position`, which under a `_centerOfGravity` pivot is
the STANCE ORIGIN, not where the airframe is: the model swings about the CoG
under attitude. The file already had this rule written down for `muzzle()`
("Computed through the WORLD matrix, never node.position … shots would spawn
beside/behind the visible plane in a turn") — the collision rays simply never got
it. Now both go through `originWorld(node)` (local origin through the world
matrix), which is **bit-identical to `node.position` when there is no pivot**, so
`groundClearance` semantics are unchanged. Pinned in `aircraft-rig.test.ts`.
Matches "we could bank without crashing before" — but see the caveat above: this
is almost certainly NOT the whole phantom collision.

[ ] **STILL OPEN: what does the ray actually hit?** The instrument now answers
it. Both crash paths (ground contact AND the impact sweep — the sweep had NO
report, which would have made the panel lie) record `crashReport`: the hit
mesh NAME, distance, altitude, normal, bank, speed, and which of the three
conditions fired. Shown on an always-registered **"aircraft ground"** Perf row
— no terrain, no arming, works in the aircraft demo. `agl ∞ · hit —` live;
on a crash, `CRASH <reason> @<alt>m d=<dist> hit=<mesh>`. **A high altitude
with a tiny distance and a named mesh is the answer.** Note the sweep crashes
on ANY hit above `crashSpeed` — no slope test — so it is the more likely of
the two.

[ ] **Design the reusable hit test around a POSE SOURCE, not a position** —
see the new `COLLISION-DESIGN.md`. Tonio: the skeletal case (a sword tip
parented to a bone, a limb noticing the environment) is _"something to
consider when designing a reusable is-this-thing-hitting-that-thing test"_,
i.e. a constraint at design time, not a later subsystem. A signature taking
`Vector3` cannot express a bone-attached tip without bone math at every call
site — which is exactly how this file's own world-matrix rule got ignored by
its own rays. Taking something that yields a world matrix makes the animated,
pivoted and floating-origin cases the SAME case. Also: never collide against
skinned geometry (Babylon's `applySkeleton` is opt-in, so picking sees the
BIND POSE — verified in 9.16.2); collide against bone-attached proxy volumes.
[ ] **Generalize the collision probe to all entities** (Tonio): jeeps, ships,
submarines, bipeds, animals will each need "where am I really, and what may I
collide with". Two pieces worth sharing rather than re-deriving per vehicle:
the **world-matrix ray origin** (this bug — the rule existed and was still
missed, because nothing shared it), and a **collision-exclusion convention**
so a family of meshes can be skipped declaratively. Tonio: _"in Unity you can
exclude certain mesh families from a ray collision test."_ We do it with an
ad-hoc predicate per call site, and the predicate ALSO has to re-check
`isPickable`/`isEnabled` (Babylon skips its built-in filter when a predicate
is passed) — a footgun already paid for once with the clouds. A
metadata/naming convention (the project already has one: `_nocast`,
`-ignore`) plus one shared `probe()` helper would retire both.

**Superseded hypothesis (kept for the record) — floating-origin desync.** The chain fits: fly far enough → `b3d-terrain.resetOrigin` fires →
it shifts its tiles by `(shiftX,shiftZ)` and calls `owner.shiftOrigin` to move
"everything else that carries a world position" by the same amount. If the
piloted aircraft's NODE isn't the thing `shiftOrigin` actually moves (it moves
`focused?.getCameraTarget()` ?? `camera.parent` ?? `camera` — and in **chase
view the camera's parent is the chase rig, not the aircraft**), the aircraft is
left at pre-shift world coords while the tiles jump → its downward ground-raycast
(`raycastGround`) now hits a tile that is suddenly in the wrong place → phantom
collision at the wrong altitude; a tile left un-shifted → phantom distant grid.

Ruled OUT this pass by code reading: the stale-`_prevPos` world-velocity spike on
a reset frame — `applyInput` already caps it (`hypot(wx,wy,wz) <= maxSpeed*3`,
b3d-aircraft.ts:617), so `_worldVel` is not corrupted. Search is narrowed to
node-vs-tile alignment, not derived velocity.

**Next step is INSTRUMENTATION, per our own rule.** Add a debug source that logs
each `resetOrigin` (shiftX/shiftZ) and the live delta between the aircraft node
and the nearest tile centre, so the next pass CAPTURES the desync instead of us
guessing at it. See [[floating-origin-multi-entity]] and the "instrument the rig,
don't theorise" lesson from the CoG detour. Do this before touching the shift
logic.

### Confirms / extends the 08-21 list

[x] **Exiting VR corrupts the DEFAULT camera's altitude** — FIXED (`3847b88b`):
entry snapshots the orbit camera's alpha/beta/radius/target, exit restores it
after Babylon carries the walked pose back. Free cameras keep the carry-back.
[x] **Respawn/death panel pinned to your FACE and jiggling** — FIXED
(`3847b88b`): `b3d-svg-plane` gained an opt-in `xrFrame`; death rides the
`body` frame (damped yaw). Facing/offset still wants a headset check.
[x] **Ambient could never recover from a pool of ZERO** — FIXED (this pass):
`_ambientWatchdog` bailed on `_ambientPoolScale <= 0`, one line before the
recovery it was written for. `recoverPool(0) → 0.25` is documented AND unit
-tested ("a pool shed to ZERO comes back — the reported bug") — the model was
right, the test green, and the caller made it unreachable, so a scene shed to
nothing stayed dead for the session. **Note:** this is NOT the pass-2 "pool
0.6, bad=3,4,5" report — that was the watchdog correctly responding to
genuinely bad frames, and at 0.6 the leaf effect switching OFF (rather than
thinning) is by design. The "reverse trigger" Tonio asked for already exists
(20 sustained good seconds → `recoverPool`); it just couldn't fire from zero.
[ ] (superseded) **Exiting VR corrupts the DEFAULT camera's altitude** — "when I left, it reset
the camera down to the usual place, way down and off." Seen on b3d-loader and
others. This is the INVERSE of 08-21's "entering VR ignores the flat camera":
now the exit path specifically drops the flat camera's Y. Narrower, more
actionable than the 08-21 note — the exit restore is losing altitude.
[ ] **Volcano/orbit demos in VR: left stick dead, rig planted BEHIND you, and
BOTH recenter (our button) and the headset's own view-recenter fail to fix
it.** Sharpens 08-21's "you cannot move the view in VR" with a concrete repro
and the detail that the OS recenter can't rescue it either → the rig is
mis-seeded at setup, not just un-driven.
[ ] **Respawn/death camera is pinned to your FACE and jiggles** — should be
rig-relative. New detail on the death-cam.
[ ] Confirmed still open from 08-21: no HUD in VR chase; jerky aircraft motion
(rig parenting); reseat button does nothing; terrain "out of VRAM" flakiness
(brings the whole browser down, survives a drop back to flat); ambient leaves
never fall (pool stuck ~0.6, warmup 0 — the recovery is STALLING, not absent:
`recoverPool`/`_ambientWatchdog` exist, so the bug is why the watchdog never
re-grants).

### Feature asks from this pass

[ ] **Orbit/loader demos need a VR locomotion mapping** (the concrete answer to
08-21's "give an orbit demo a way to move"): **right stick = look L/R, left
stick = forward/back, left bumper / right bumper = altitude down/up.** NOT the
triggers — reserve those for actions (climb/brake, shoot). Wire it once,
centrally, so every orbit demo inherits it.
[ ] **Ambient "reverse trigger" — re-probe to bring effects BACK.** After a run
of cheap frames, reassess and restore shed effects rather than losing the
weather for the whole session over one transient. `recoverPool` is the step
size; what's missing is the demand-side re-probe that actually fires it. Tie
into the stall above — the leaves-never-return report IS this gap.

### Tech debt spotted this pass

[x] **`bun run typecheck` was RED** (`model-transform.test.ts:449`, canonicalize
arity) — **green as of the 2026-08-26 toolchain upgrade**, and so is
`tsconfig.build.json`. Verified: both emit zero lines. Kept as an [x] rather
than deleted because this was a standing "known red" that a gate had to route
around twice; the point is that it is no longer a reason to skip the check.
[ ] **You cannot move the view in VR.** "I have a locked camera", "stuck looking
at this from a fixed angle". These demos have NO locomotion by design — flat,
you orbit with the mouse; in VR there is no orbit and nothing maps to one, so
you are planted wherever the rig lands. Whatever the fix is, it has to give
an orbit-style demo a way to move.
[ ] **Entering VR ignores the flat camera.** You are looking at the scene from
one angle, enter VR, and are somewhere else entirely — sometimes facing away
("the panel rig is off to my left", in make-mesh). Exiting VR, by contrast,
DOES carry the VR pose back. "It'd be kind of nice if that was symmetric."
[ ] **Re-seat does not work.** Pressing it "did nothing"; the right-hand button
"seems to reseat it but the rig is still offset."

### The aircraft rig in VR (b3d-terrain, b3d-clouds — not terrain-specific)

[ ] **Chase camera is offset sideways from the aircraft**, and the offset TRACKS
your flying: "fly to the right and the camera is offset right, and so is the
crosshair… fly left and I end up offset left." It does not return to zero.
Cockpit view is correct; leaving cockpit breaks it again. Once, after a
respawn, it was briefly correct — so something is misaligned at rig SETUP,
not continuously.
[ ] **No HUD at all in VR chase.** ("First of all, no HUD showing.")
[ ] **Jerky aircraft motion returned** — "so the parenting is messed up again."

### Performance

[ ] **b3d-terrain leaks** — "brought the Oculus to its knees", jerky even after
dropping to flat, fixed by a reload. Suspect the terrain system; it also made
the aircraft sim visibly worse, and b3d-clouds showed the same rig faults
WITHOUT the jerkiness, which points at terrain rather than the aircraft.
[ ] **The pause demo spins FASTER in flat than in VR** — a frame-delta problem in
the XR loop, and a good small reproduction of the same class.

### Regression I introduced

[x] **b3d-library lost its hierarchy** — FIXED by hiding the glTF loader's
primitive splits from `getHierarchy`. A multi-material mesh imports as a
TransformNode with the authored name plus one child per material
(`_primitive0`, `_primitive1`), and once `publicName` stripped the suffix all
three levels read "building". The tree was never gone; every level had the same
name.

[ ] **The library picker wants a HIERARCHICAL POPUP MENU**, not an indented flat
list — indenting is the quick fix, the menu is the better one. Now buildable:
`popup-surface` gives owned popups that die with their opener, and `surface`
already has cascade menus. It would be the popup system's first real consumer,
which is precisely the battle-testing argument from the ensemble spec.

### Broken or missing

[ ] **b3d-ambient bubbles never spawn** (omnidude demo, flat AND VR). Debug panel
reads pool 0, warmup 0, everything 0 — "we've eaten the budget somehow."
[ ] **b3d-ambient's own dive demo still fails** — "you just crash into the water
and the demo's up." Either the `submersible` fix did not land in what was
tested or it is not sufficient. **Re-check before assuming fixed.**
Tonio: the demo does not need an aircraft at all — moving the camera up and
down through the surface would show it better.
[ ] **Cloud shadows do not render in VR** (they work flat).
[ ] **The radar demo is unusable in VR** — its readout is DOM, below the canvas,
so in a headset there is no radar at all. Needs an in-scene readout.
[ ] **Live examples stopped maximising** in flat, mid-session, having worked
earlier; fine on desktop. Possibly the overlay stealing clicks, possibly
browser flakiness. Needs reproducing before chasing.

### Smaller

[ ] Ambient leaves fall from far above the trees — spawn height should be bound
to the ground/canopy, "some kind of vertex mapping on the ground".
[ ] The scene-panel button row is top-right flat but a left-pinned row in VR —
no reason for them to differ.
[ ] Terrain's top button bar scrolls out of view; pin it. "Quite disconcerting
having to go hunt down the exit button."
[ ] The glowing yellow moon does not read against the muted ground — try blue.
[ ] Exploder: click the object to explode it. In VR you must currently look AWAY
from the thing to press its button.
[ ] Missiles never expire — wants lifespan / delta-v (see the `burnTime` note).
[ ] Seen once: a missile hit that did not destroy the target.
[ ] `b3d-loader`'s demo should be above the attributes table.
[ ] The index page has no demo.
[ ] Content: UV errors on the big staircase; physics jiggle walking DOWN the ramp.
[ ] **`flightStage` — the aircraft equivalent of `demoStage`.** Third demo to
hit this, so it is a missing helper rather than three oversights. What it must
include, learned from what each demo forgot:

- **A `b3dDeath` with a working respawn.** Without one, `crash()` releases
  input focus (issue #9's fix) and leaves you holding NOTHING — no wreck to
  fly, no panel, no way back. Tonio, on the clouds demo: _"landing the
  aircraft hard just seized up the demo… I think it's just death with no
  respawn."_ Exactly right, and it is not a hang: it is death with no exit.
  The helper must therefore take a plane FACTORY, not an instance, because
  respawn needs to build a fresh one.
- **A sun configured for the ground it lights.** A 4000-unit ground with the
  default single shadow map puts the aircraft's shadow in a far, coarse
  cascade where it is effectively invisible — the clouds demo had no aircraft
  shadow at all. Cascades, sized to the stage.
- **Ground, sky, fog and a library** at scales an aircraft can actually
  operate in — the parts every flight demo currently retypes slightly
  differently.

Same argument as `demoStage`: the helper is not sugar, it is where the
easy-to-forget parts live. Note `demoSun`'s hard-wired `shadowTextureSize`
is a filed efficiency finding — resolve that at the same time rather than
copying it in.

### Confirmed good in VR

Glass trackpad via VR pointers, entering/leaving VR, state retained across
entries, skybox ("continues to look fabulous"), make-mesh, collisions, gun demo,
turret (smart dial visibly works), warhead controls, cockpit view.

## 0.7.0 flat-3D validation pass (Tonio, 2026-08-19)

One human, every demo, flat. VR pass still to come. Bugs first, then the theme
that ran through the whole pass.

### Bugs — release-relevant

**ALL CLOSED as of 2026-08-22** (reconciled against git; the boxes were stale).

[x] **popup-surface: the popups cannot be moved.** "I can drag the window around.
I cannot move the pop-ups, none of them. They just cause me to drag the
windows." The B1 gate fix did NOT work — the grip drag still never engages,
and the press falls through to the camera. THE ONE THAT BLOCKS THE TAG.
✅ fixed — eb841924 + a63d12a5
[x] **b3d-launcher guided-missile demo renders a black rectangle** — "used to be
fine". A regression, not a wish.
✅ fixed — 413f871f
[x] **b3d-star-system: white text on a white background** in its overlay.
✅ fixed — e3fb7d2d
[x] **b3d-ambient: the headline "fly down into the sea" doesn't work** — you
crash into the water instead of entering it. The demo cannot show its point.
✅ fixed — e6e05721 — RE-CHECK in VR (pass 2 says it may still fail)
[x] **shadow-decal still stipples** — the acne fix landed on `b3dSun`'s default,
so a demo building its own generator misses it. Find the other paths.
✅ fixed — c8521454
[x] **cloud-shadows: the fog greys everything out** — "most of the time I'm not
seeing the objects at all, I'm just seeing the fog."
✅ fixed — 10bf87e5
[x] **b3d-panel's manipulator doesn't move the panel** — bug, or never wired?
✅ fixed — d08ca67a — NOT a bug: the axes are a readout; a real GizmoManager is a future feature
[x] **table-layout: can't scroll with the mouse** (scrollbar works).
✅ fixed — d08ca67a — NOT a bug: the demo is an x-ray of the maths, no scroll container
[x] **glass gamepad: the stick thumb CLIPS at the travel edge** — right side of
the left stick, left side of the right stick. Bounding rect too tight.
✅ fixed — 2c9cc889 (Tonio confirmed)
[x] **radar and radar-blip have no demo at all** — two combat components
undemoed, and the combat section has no working radar anywhere.

✅ fixed — caadf6b2### The theme: demos need the helper treatment

Said about roughly twenty pages, so it is one job, not twenty: **sweep the demos
onto `demoStage`** (fill light + test-pattern ground + shadows) and stop using
spheres and cubes as subjects. Tonio: "when in doubt, put something other than a
sphere in a demo" — spheres are rotationally symmetric, so they show neither
orientation nor shading changes. The scout is the hero object and is already
loadable from the library.

[ ] Sweep: exploder, reflections, cloud-shadows, shadow-decal, combat (all),
ambient, fog, b3d-light, particles, shadows, skybox, water, biped, b3d-death,
formations.
[ ] **A demo-overlay helper.** Every demo hand-rolls its little explanatory
overlay; they are styled differently, positioned differently, and eat real
estate. One helper: consistent style, pinned bottom-right (top-left is the
scene button), and COLLAPSIBLE.

### Improvements and future work

[ ] **Use popups for the debug panel** — "it's crying out for popups". The
clipped-to-parent-rect overlay with drop shadows on a flat surface is
exactly what a 3D world should not be doing. Post-0.7.
[ ] **Build the on-screen keyboard as a popup.**
[ ] **`select` widgets instead of left/right steppers** — library demo, and the
b3d spin picker. (This is TODO's existing `select3d` entry; the popup
mechanism is now the way to build it.)
[ ] **Exploder: click the object to explode it**, and explode the SCOUT — a
hierarchy, which is the interesting case. Bigger ground.
[ ] **Reflections: put a mirrored platform on the ground** so planar reflection
is visible.
[ ] **Combat: explain how to make things blow up**; show destruction that does
more than disappear; a chain-reaction example (the fuel drums are close).
[ ] **Turret presets** — "a smart turret with lead" vs "a really dumb one".
[ ] **destroyable-behavior: a shield destroyed by an external object, exposing
what it protected.**
[ ] **Particles: click an object to trigger the burst.**
[ ] **Sound: click the sphere to toggle**, and more volume.
[ ] **Water — three separate asks:** - query water height at a point, so an object can BOB (physics is the
caller's; the surface just answers "how deep here") - expose wavelength etc. so it can be made choppier - a vertex/mesh channel marking where geometry breaks the surface, so the
shader can render surf; and more turbulence where the surface is steep,
which is the road to waterfalls and rapids
[ ] **Lights: more than hemispheric** — point, spot, and area if Babylon has it.
And **attach geometry to a light automatically**: an area light gets a
glowing panel, a point light a bulb. "That's an eternal pain in the ass when
setting up scenes with dynamic lighting." Also allow attaching your own mesh.
[ ] **A deep-space skybox** — and eventually project yourself to a position
inside the galaxy and render the night sky from there, consistently. Needs
more stars than the galaxy currently generates. Also what the space medium
fades through to on leaving atmosphere.
[ ] **b3d-ambient's doc leads with the wrong claim** — it "affords a TACTIC, not
a texture", and the demo should come above that argument.
[ ] **Radar: make the dynamic SVG radar display agnostic about its source**, so
the combat radar could drive a display like the b3d-panel one. Note in the
panel demo that it is currently just a demo, unrelated to combat radar.
[ ] **b3d-panel: consider Babylon's built-in manipulator/gizmo** instead of our
own placement helper.
[ ] **Improve the volcano province** used by the biome chart (low priority).
[ ] **formations: use scoutships, in midair.**
[ ] **table-layout demo: state what it is for** — it reads as internal structure.
[ ] **widget-box vs widgets3d: say why they are separate demos.**

### Verified good in this pass

b3d-loader, b3d-trigger ("works really well"), carved landforms ("fantastic"),
biome chart, all the astronomy, b3d-warhead ("really cool"), launcher, turret,
HUD, keyboard, selection, icons, svg-texture, the scrolling table ("fabulous"),
text-edit, widgets3d, spawner.

## v0.7.0 review follow-ups (nine-lens, 2026-08-14)

Folded in from `RELEASE-REVIEW-0.7.0-rc.1.md` and the 0.7.0 re-review — a review
report is an artifact of the gate, not a worklist, and items were already being
lost between the two. Verdict was GO_WITH_FOLLOWUPS; the three must-clears
(barrel `equilibriumSpeed`, CHANGELOG section identity, untracking
`dist/iife.js*`) are **done**, as are the verified docs/DRY items. What's left:

### Correctness / DRY

- [ ] **One `findInputFocus(el)` in `b3d-input-focus.ts`**, routed through by all
      10 sites (`b3d-controllable:64`, `b3d-controller:130`, `b3d-biped:647,777`,
      `b3d-death:206`, `tosi-b3d:807,1724,1837,1875`, `b3d-aircraft`). The
      traversal rule has already split two ways inside one class hierarchy
      (`closest` vs `querySelector`), with 6 inline casts. The crash fix added
      the 10th; that's the point at which it's a seam, not a repetition.
- [ ] **`b3d-terrain.ts:1486` `recenter()` discards an author-set `worldU`/`worldV`**,
      hard-resetting to module constants — including the sampling window this
      release newly documented as public. Capture `_baseU`/`_baseV` in
      `sceneReady` and restore those, falling back to `0`/`MIRROR_SAFE_V`.
- [ ] **`CylinderSampler` has no unit tests** — and its `if (vr > 0.5) vr = 1 - vr`
      reflection is exactly what made `worldV = 0` a bug. Pin the v-reflection in
      `surface-sampler.test.ts` + assert `recenter()` leaves `worldV` off both
      mirror planes (0 and 0.5).

### Efficiency (measured at the rc gate, tracked nowhere until now)

- [ ] **`b3d-patch.ts:448` `patchResident()` is an unhysteretic step function.**
      Each boundary crossing costs ~306 synchronous `Mesh.dispose()` in one frame
      plus ~612 ms of budgeted re-extraction (2112 chunks × 0.69 ms, ~150 frames
      at `buildMs: 4`) — and the demo invites circling the radius. Add the
      enter/exit hysteresis band (the convention `b3d-aircraft` gear and
      `b3d-clouds` already use), keep the miss-memo across a release, and budget
      `_releaseChunks` the way `_extractSome` is. b3d-patch is EXPERIMENTAL, so
      shipping the cost is defensible — but only written down, which this is.
- [ ] **Terrain and b3d-patch compute residency separately and disagree**
      (`maxReach` 560 vs 640 at stock defaults), and terrain's copy
      (`b3d-terrain.ts:1000`) compares LOGICAL patch coords against a
      RENDER-SPACE camera — the error is the accumulated origin offset, which
      grows without bound. One public `isPatchResident(cx, cz, level)` on
      `B3dTerrain` that rebases in one place fixes both.

### Coverage / DX

- [ ] **`publicName` has no test at all** — add `model-name.test.ts` cases
      (`Hull-ignore`, `Hull_ignore`, `Hull_collideMesh.model`). This is the
      `getNames()` surface issue #7 was filed about, so an inaccuracy lands on
      the same adopter. (The `_ignore`/`-ignore` matcher split is fixed in
      0.7.0 via `isIgnored`; the tests are what stop it re-splitting.)
- [ ] **`hudChase` → `hudChaseOff` has no runtime signal.** ~3 lines in
      `sceneReady`: warn once if the element carries a `hudChase` expando or
      `hud-chase` attribute, naming the replacement AND the inverted polarity.
      Turns the worst break shape available — correct-looking code that quietly
      does the opposite — into a self-documenting one. (Upstream: tosijs#26.)
- [ ] **The aircraft attribute table is missing `reverseSpeed` (`:399`) and
      `throttleRate` (`:401`)**, both named in the rewritten prose, and carries a
      duplicate `afterburnerSpeed (behaviour)` row six lines below the real one.
- [ ] **The glass gamepad's auto-hide is documented only in the CHANGELOG**, which
      names `fade="off"` — the wrong knob for the usual `<tosi-b3d gamepad>` path
      (there it's `gamepadFade`, `tosi-b3d.ts:342`). Name both, and describe the
      fade / `idleSeconds` behaviour on the glass-gamepad doc page.
- [x] **DONE (0.7.0-beta.2)** — `B3dGamepad.fade` was read once in `connectedCallback` (`glass-gamepad.ts:378`),
      so toggling it at runtime is inert — including from a `scenePanel`
      `toggle3d`, this repo's own recommended way to expose a tweakable.
      Evaluate `isOff(this.fade)` inside `wake`, or install/tear down in `render()`.
- [ ] **Same function: `wake()` runs on every unthrottled window `pointermove`**
      (~240 timer ops/s at 120 Hz) and `setInterval(getGamepads, 500)` runs
      forever per mounted pad regardless of `document.hidden` or faded state.
      Rate-limit `wake()` to ~1 s (the idle window is 10 s); skip the poll while
      hidden or faded.
- [ ] **Publish a migration doc** — `site.config.ts:58` sets
      `docPaths: ['src', 'README.md']`, so 0.7.0's five breaking items live only
      in a changelog anchor. Add `Migration.md` to `docPaths`.
- [ ] **Two tosijs deprecations ship in 0.7.0**: ~45 `elementCreator({ tag })`
      call sites and 10+ `static styleSpec`. The consumer-facing recipe at
      `b3d-utils.ts:341` teaches the deprecated form, so an agent following our
      docs writes deprecated code. Fix that snippet first; row the sweep.
- [ ] **Encode the barrel-hygiene rule as a test** — "no bare common nouns" was
      recorded as prose beside `ui` at 0.6.0 and violated one release later by 13
      `carve` nouns including a second `box`. Assert every value export of
      `index.ts` is a component creator/class, a namespace object, or on an
      explicit allowlist, failing with the offender's name.
- [ ] **`CombatEvent` carries no attribution** (incoming #8) — "who killed this,
      through what chain" is the load-bearing datum for a consequence layer.
      Tracked only on GitHub until now; deferred, not dropped.
- [ ] **Point-in-time review artifacts have no home.** `RELEASE-REVIEW-0.7.0-rc.1.md`
      sits at the repo root, is referenced by nothing, is absent from CLAUDE.md's
      root-doc map, and still opens "Verdict: BLOCK" with no record of what was
      addressed. Move them under `reviews/` and describe the class once.

### → shared `tosijs-coding-practices` (compounding; none blocks a tag)

- [ ] **The eight lens-8 write-backs from the rc gate never landed** — that repo is
      clean and its last `releasing.md`/`review.md` commit predates this release.
      Land them attributed to tosijs-3d v0.7.0, update the README scoreboard
      (still `0.6.0 | 2026-08-10`), and add to §8's Done-when: _a lens-8 finding
      written into the reviewed repo's own report has NOT been filed — it lands
      as a commit in tosijs-coding-practices or it did not happen._
- [ ] **`practices/deployment.md:117-124` prescribes a `preview:` block that
      doesn't typecheck** (`preview: { url }` while `host` is required upstream) —
      exactly how this repo's root typecheck went red and stayed red across a
      tagged rc, hiding four real errors. Correct to
      `{ host: process.env.PREVIEW_HOST ?? '', url }` with one line of why; keep
      the never-commit-the-host rule verbatim. (Upstream: tosijs-ui#72.)
- [ ] **Freeze published changelog sections** — _once a version is published under
      ANY dist-tag its section is frozen; remediating a gate on a published rc
      bumps the rc number._ Editing the published version's notes makes the notes
      describe an artifact nobody can install. (0.7.0 must-clear #2, generalized.)
- [ ] **A review report is an artifact of the gate, not a worklist** — add to
      `practices/review.md` triage: _findings are filed only once they are in the
      file the project's own agent docs name as the worklist._
- [ ] **The "an rc may be tagged before the gate" carve-out** (`RELEASING.md:95-101`)
      is a good rule living in one repo. Write it into `practices/releasing.md`,
      and restore the clause the local copy dropped: an rc tagged ahead of the
      gate must state the gate has not run **and name the unreviewed subsystems**.
- [ ] **An `upstream:check` script in the shared repo** — parse the UPSTREAM.md
      tables, `gh issue view` every URL, report Open rows whose issue is CLOSED,
      Resolved rows whose issue is OPEN, and **rows whose Issue cell is not a URL
      at all**. Four repos each write the same manual checklist line while their
      tables drift anyway. Reduces RELEASING step 5a0 to running it.

## v0.6.0-rc.1 review follow-ups (nine-lens, 2026-08-06)

**STATUS (0.6.0 final):** the three rc.2 gating items AND nearly this whole list shipped —
confirmed majors (panelScene contract coverage via the pure panelGesture extraction,
SvgTexture latch tests, w3d-theme), the verified correctness/efficiency leads
(interactiveAt claim default, raw-child hover, gamepadFocus claim release, transform-only
table scroll + surgical hover, textBlock cache, updateInterval), docs/dx (flow-layout page,
onResize ⚠️, on\* scoping, option types, rasterize warn, provenance), blast radius
(TOSIJS_DEPLOY_HOST, bun.lockb), upstream (#52/#53 filed; #34/#36 verified + closed), and
the practices-repo entries. **Still open:** `wireSvgPointer` (flat-side wiring still
copy-pasted across ~7 demos); a full NullEngine integration test of panelScene's Babylon
shell (the policy + math are pure-tested); synthetic-pointerId + iconBar3d direct tests;
table paintHeader cell() nit; the ui-surface extraction seam decision.

**From the 0.6.0 FINAL gate (fast depth, GO_WITH_FOLLOWUPS — leads unless marked):**
[ ] [correctness] gamepad-focus click-away release re-enables one-press-drives-all when
TWO claimed UIs coexist and the user clicks the background — keep a registry of live
claim roots; release only when the press is inside none; pin claim/release in tests
(new tests only cover createFocusPulse).
[ ] [correctness] surface.interactiveAt should return true while a menu cascade is open
anywhere (dismissing IS a UI interaction; currently the camera orbits during dismissal).
[ ] [efficiency] SvgTexture idle poll clones+serializes every 30ms per panel — push a
dirty flag from box/surface/table (interim: back off to 250ms after N no-change ticks);
also cap/back off the failed-rasterize retry loop.
[ ] [dryness] finish NO_SELECT_STYLE (widgets3d/gamepad-svg/glass-gamepad still inline
it — and glass-gamepad dropped tap-highlight; consolidation fixes that free); extract a
shared happy-dom shim (src/test-dom.ts — the beforeAll block is copied in 11 test files
and has drifted); move panelGesture + mappings into src/panel-gesture.ts (the name the
test already uses).
[ ] [docs] /b3d-svg-plane/'s panelScene section still describes the pre-interactiveAt
claim default; document the claim policy, pure gesture API, updateInterval.
[ ] [coverage] w3d-theme variable-PRESENT path (all tests read fallbacks); the shell's
claim-resolution line + updateInterval passthrough; assert \_warnedFailure fires once
(also silences the warn noise in test output).
[ ] [dx] w3d-theme "at startup is fine" is defeated by ESM hoisting — make the snapshot
lazy or fix the doc to "before tosijs-3d is imported"; w3dTheme has a doc page but no
export (export as ui.theme or mark internal); decide onResize alias vs accepted hard
break (changelog entry exists).
[ ] [ops] root@ip remains in git history through the rc tags — verify the box doesn't
depend on address secrecy (key-only auth, non-root deploy user); record the decision.
[ ] [upstream to file] tunnel.ts no-host error should name PREVIEW_HOST (deploy-preview
already does) and stop recommending a committed host first; SiteConfig.checkExamples
should accept contextKeys (then re-enable example checking here — currently OFF for the
whole site); tosijs-make-icons could source glyphs from tosijs-ui's set (ends the
resize.svg hand-copy). Record getCssVar-fallback-gap in UPSTREAM.md "Not filed".
[ ] [practices repo] deployment.md still prescribes committing preview.host — replace
with the PREVIEW_HOST pattern (done in THIS repo; the shared doc still teaches the leak);
reconcile review.md's "before the version bump" phrasing with the practiced
bump-awaiting-gate flow.

**Confirmed (priority):**

[ ] **[coverage]** `panelScene`'s gesture contract (claim / catcher quad / frozen-frame
math) has zero automated coverage despite four fix-commits. NullEngine test (pattern:
world-view / aircraft-rig tests): full claimed gesture — down → frozen-frame move →
off-plane up ⇒ `leave`, camera re-attached. Extract uv→viewBox + frozen-frame→viewBox
into pure tested functions.
[ ] **[coverage]** SvgTexture busy-latch regression test: after a failed rasterize,
`_rendering` false, `_lastXml` NOT committed, next tick retries and commits on success
(drive `_img` onload/onerror under happy-dom).
[ ] **[dryness]** w3d theme block (cssVar + `--w3d-*` reads with re-typed fallbacks)
triplicated across widgets3d/keyboard/table — extract `src/w3d-theme.ts`. Keep the
load-time JS-resolve approach (`varDefault` would break the rasterize path).

**Unverified leads:**

[ ] [correctness] box raw-child routing may leave a stale hover highlight (box.ts
handlePointer raw path skips hover bookkeeping) — in VR the highlight is the feedback.
[ ] [correctness] `gamepadFocus` without `claim` is starved forever once any instance
claims — add a mixed two-instance test; maybe unclaimed should mean "background share".
[ ] [efficiency] table paintBody rebuilds visible-row DOM per drag-scroll move + hover
change, contradicting its transform-only-scroll comment — make surgical or fix comment.
[ ] [efficiency] panelScene hardwires the 30ms SvgTexture poll — pass `updateInterval`
through; longer-term a MutationObserver dirty flag.
[ ] [efficiency] textBlock wraps twice per relayout (measure + paint, same width) —
one-entry cache keyed by width.
[ ] [dryness] keyboard key-fill helpers (keyTint/pressVis/spaceHint) → one setKeyFill;
accent-strip hit mapping duplicated between trackPopup and sticky-tap (SLACK already
drifted 8 vs 10) → one pure accentIndexAt.
[ ] [dryness] Flat-side pointer wiring copy-pasted across ~7 demos with drift — export a
`wireSvgPointer` sibling of panelScene.
[ ] [dryness, nits] table paintHeader re-does cell() arithmetic; svgPoint lives in box.ts
(generic — move; fix the orphaned inlineIcon JSDoc above it); user-select style string
duplicated box/surface.
[ ] [docs] /flow-layout/ page doesn't mention `nearestInDirection` / `placePopup`.
[ ] [coverage] synthetic-pointerId fix untested (forwarded events carry
SYNTHETIC_POINTER_ID); `isOff` untested; Widget3d protocol additions + iconBar3d untested.
[ ] [dx] SvgTexture failed-rasterize recovery is silent — one console.warn per instance
on first failure.
[ ] [dx] onResize→handleResize rename (public on B3d/B3dHud in 0.5.2 dist) has no
CHANGELOG ⚠️ entry — add one; consider a one-release deprecated alias.
[ ] [dx] CLAUDE.md's on\*-callback warning is unscoped now that plain factories use
onFoo freely — add a scoping sentence (components: never; factories: fine).
[x] [dx] **Bare generic exports → the `ui.*` namespace** (Tonio's call at the rc gate):
`ui.box`, `ui.table`, `ui.keyboard`, … — names stay simple, top level stays clean.
Types remain top-level (PascalCase). Done in rc.3. Still open from the same finding:
record the extraction seam (own package / tosijs-ui home; b3d bridges stay) here +
UI-DESIGN-NOTES when it's decided.
[ ] [dx, nit] Export option types (TableConfig, KeyboardOptions, InputFieldOptions,
PanelSceneOptions, GamepadFocusOptions).
[ ] [blast-radius] site.config.ts commits `root@<ip>` as tunnel/deploy host in a public
repo — resolve from env (TOSIJS_DEPLOY_HOST) with a clear absent-var error; non-root
user. If the tosijs-ui schema can't express it, file that upstream.
[ ] [blast-radius, nit] icons/stroked/resize.svg copied from tosijs-ui — note provenance.
[ ] [practices] delete stale `bun.lockb` (canonical bun.lock exists).
[ ] [ecosystem, to FILE upstream after sanity-check, then mirror in UPSTREAM.md]:
tosi-example full-bleed option (we pay a specificity hack + per-demo css fences);
live-example loose scope lets `const name` shadow window.name (keyboard.ts renamed
around it); UPSTREAM.md ledger drift (#34/#36 recorded Resolved but open on GitHub —
verify against 1.9.4, close or move back); env-sourced deploy host (see above).
[ ] [practices, shared KB → ../tosijs-coding-practices]: web-components.md entry for the
tosijs#24 silent-discard trap (the 'on'|'off' migration corollary); releasing.md already
covers rc tagging (project RELEASING.md now restates it); never silence format/lint in
verification pipelines (a silenced failure shipped, commit 81328438); promote the
no-broad-pkill rule from this repo's CLAUDE.md to shared development.md.

## Underwater/submarine regime (manta-recon is the named adopter — issue #3)

Manta prototypes in-game first, then we upstream the proven shape
(adopters-before-abstraction). What already works at 0.6.0: b3dWater's underwater fog +
sun dimming + bubbles preset read convincingly at y = -15; the aircraft flies fine below
the plane. The gaps, per the issue:

[ ] Water is a FLOOR, not a boundary — the ground raycast sees the water mesh, so a
descending aircraft aquaplanes at groundClearance instead of submerging. Likely: exclude
water meshes from the raycast behind a `submarine`/`waterY` attr; seabed stays the floor.
[ ] Medium-aware drag/speed-cap in fly-by-wire (original Manta: thrust identical, drag
0.1 vs 1.0) — two configs lerped on a y-band, like b3dWater's fogTransition.
[ ] Surface-crossing event (aircraft or water) for splash/wake VFX, audio, camera cues.

## Portals — the sim's word and the geometry's word are the same object

Worth stating because the codebase uses "portal" in two places and they are one
thing, which is the useful part:

- **`world-topology.routePortals`** already treats a portal as a declared
  connection between places, with `locked` making it impassable — the narrative
  layer's vocabulary, shipped and unit-tested.
- **The story→geometry compiler** (TUNNEL-DESIGN) turns a graph EDGE into a
  volumetric stroke. That edge _is_ a portal.

So the same declaration drives routing and geometry, which is exactly the
property TUNNEL-DESIGN's verification rule needs: _the cave the sim believes in
and the cave you can fly through must not diverge._ One object, two consumers,
nothing to keep in sync.

What follows from that, all already implied by the notes further down this file:

- [ ] **A locked portal is a deliberately REGULAR neck** where a door mounts —
      the one place in a cave system that should read as built rather than
      excavated, because it is.
- [ ] **Portals carry a clearance**, so Ariosto can route per agent profile
      (foot ~0.4 m, scout ~4 m). "Walkable but unflyable" is gameplay, not a
      bug. Verification is clearance-based flood fill, not connectivity alone.
- [ ] **Interiors are not a separate system.** A building is a `pad` landform
      minus some boxes — the same province vocabulary as a cave, with a door as
      its surface-breaking node. Which means the everything-demo's "portal into
      a building" needs no new machinery beyond what caves need.
- [ ] **A door is a surface-breaking node pinned at depth 0**, so it is authored
      rather than discovered — the same rule that makes entrances tractable.

### …and the OTHER sense: a portal as a context transition

Tonio: walk from a city exterior into a building interior **with no graphic
transition**. A hell of a primitive to have for free, and it looks like we nearly
do.

**A portal is a reflection probe pointed somewhere else.** `b3d-reflections`
already renders a scene to a texture from a virtual camera, with a render list, a
`refreshRate`, a distance ramp, a tier-driven `reflectionSize`, and
`reflections: false` on the weakest tier. A doorway that shows another space is
the same machinery with the virtual camera placed at the portal's twin instead of
mirrored about a plane. The budget conversation is one we have already had and
already won.

**Two different things live under this word, and only one needs the render pass:**

- **Co-located interiors** — the building is really there, a `pad` landform minus
  some boxes. You walk in. No portal rendering at all, and it falls out of the
  province vocabulary for nothing. This covers most of what a game wants.
- **Portal-rendered contexts** — the doorway is a window into a separately
  managed space. Earns its cost when the interior is bigger inside than out, when
  200 buildings must not each occupy world space, or when inside genuinely
  differs (its own lighting, media, physics, time of day).

**And the third option, which is probably the DEFAULT: a transition zone.** Tonio:
go through a bent corridor and voila. If the geometry guarantees you can never see
both spaces at once, nothing has to render both — so the swap happens inside the
corridor with nothing visible to contradict it. That is not a compromise version
of portal rendering, it is a **cheaper primitive that solves the same problem**:
no render pass, no stencil, no recursion limit, and nothing to double in VR.

It also happens to be the most robust option in a headset, because it relies on
_occlusion_ rather than on where the player is looking — and you cannot direct a
player's gaze in VR. A fade can be looked past; a wall cannot.

The corridor is a `carve.tube` with a bend, so it is the vocabulary we already
have, and an airlock, a porch, a stairwell and a jetway are all the same object
dressed differently.

**Two things must be CHECKED rather than assumed** — both cheap, both the same
discipline as clearance verification:

- **The bend actually occludes.** A corridor that looks bent can still hold a
  grazing sight line, or a gap at the ceiling. This is verifiable the same way
  clearance is: sample points either side, raycast, fail loudly naming the pair
  that can see each other. A transition zone that _nearly_ occludes is worse than
  none, because the failure is a one-frame flash of the wrong world.
- **Length is a TIME budget, not a distance.** The corridor must take longer to
  traverse than the far side takes to load, at the fastest speed anything can go
  through it. A sprinting biped and a driven jeep need different corridors, so
  the requirement is `length ≥ maxSpeed × loadTime` and it should be stated per
  portal, not guessed. Better still, start loading on APPROACH (`b3d-trigger`
  already does proximity), so the corridor only has to cover the tail.

**Order of preference: co-located → transition zone → portal rendering.** Free,
nearly free, then a render pass — and reach for the next one only when the
previous stops paying.

### The TARDIS: the right first demo, and it splits across both mechanisms

Tonio: put a TARDIS in the base demo, walk in, it's bigger on the inside. A small
extra scene for the visual trick, as distinct from hiding a planet in a snow
globe.

The useful thing is that "bigger on the inside" comes in two versions with very
different price tags, and the demo can do the cheap one first:

- **Never seen at once** — walk through the door, a threshold occludes, you are
  in a hall. That is a **transition zone**, costs nothing, and it is what Doctor
  Who actually does: the show almost never frames both spaces in one shot.
- **Seen at once** — stand outside and look _through_ the door at the vast
  interior. That is the actual trick, and it needs **portal rendering**, because
  the impossibility has to be visible to land.

Which makes it a good first portal implementation rather than a stunt: the
interior is a tiny self-contained scene (cheap to load, nothing streamed), the
portal surface is a single flat quad (the simplest case there is), and you can
build the transition-zone version first and upgrade the _same demo_ to
see-through — so the two mechanisms can be compared side by side on identical
content. It also sells the engine in about five seconds, which the current demo
suite does not do (see #20).

**The snow globe is the deep end, and worth naming as separate.** A planet inside
a held object is not a harder TARDIS: the portal surface is curved, it moves and
rotates with the object, and you look into it from arbitrary angles rather than
through a doorway — so the virtual camera transform stops being "the twin of a
fixed frame" and the near-plane clipping gets genuinely hard. File it as its own
thing; do not let it set the requirements for the doorway case.

**What it would actually cost, stated before anyone calls it free:**

- One render pass per _visible_ portal — the reflection budget, again. Culls the
  same way: not facing it, not near it, not rendering it.
- **Recursion needs a hard depth limit** (a portal visible through a portal), and
  the limit is a quality knob, not a constant.
- **The seam wants a stencil or a clip plane**, or geometry on the far side pokes
  through the doorway's frame — the classic portal artefact.
- **Crossing must be atomic**: the frame you swap contexts, the camera, the
  player's parent, the active media and the physics world all move together, or
  you get one frame of the wrong world. `shiftOrigin` and the media registry are
  the right seams; this is the same discipline as death's aftermath.
- **VR doubles it**, and stereo is where fill is scarcest. A portal that reads
  beautifully flat can be the thing that breaks a headset's budget — so it needs
  a per-tier cap from day one, not after someone complains.

**The prize, and why it is worth doing properly:** with contexts, an interior can
have its own medium (§medium), its own gravity, its own time of day, and its own
LOD budget — and the exterior can stop existing while you are inside it. That is
the mechanism behind "portal into a building, get out of the ship, walk to a
jeep" in the everything demo, and it is also how a 200-building city stays
affordable on a phone.

## Volumetric terrain — DECIDED 2026-08-16

**Heightfield to max detail, then volume, and configurable** (all-volume is fine
at low travel speed, which is also where the discrepancies show clearest). The
benchmark that settled it: same tile, same 5.33 m surface resolution —
heightfield 0.18 ms / 625 field calls, volumetric 2.4–2.9 ms / 10–13 k. Accuracy
is a wash and the terrain shader works on both, so it is a throughput decision:
~15 tiles per frame budget versus one. Workers are the route to all-volumetric,
since extraction is pure over transferable arrays.

Unlocked and worth their own entries when the time comes: **erosion** that can
undercut (a heightfield cannot express an overhang), **roads** where cuttings,
embankments, tunnels and bridges are one mechanism instead of four that must
agree at junctions, and **stacked tiles for deep shafts** — which needs nothing:
`ChunkSpec` already has `iy`/`ny` and the lattice is global, so stacked chunks
weld bit-identically.

## Volumetric fine tiles — measure before building (2026-08-15)

Tonio's idea, and its conclusion: if the finest terrain LOD is volumetric and
coarser LODs stay a top surface, **tunnels stop being a concept** — we'd be
shrink-wrapping volumes, and a cave is just where the density says air. See
TUNNEL-DESIGN.md for what that deletes (most of `b3d-patch`'s residency
machinery, every boundary reconciliation, the entrance-conditioning rule).

**Two measurements first, both cheap, both decisive:**

**Refined 2026-08-15** (see TUNNEL-DESIGN): the finest LOD stops refining the
surface and adds VOLUME instead, and the volume is _surface minus cavities_ — so
the ground is the heightfield by construction where nothing is carved, lower
LODs cost nothing extra, and the surface transition stays seamless out to the
third-highest LOD. Which retires the deviation risk except where a cavity
actually cuts the surface.

**Cavities come from PROVINCES** — none by default, so a stock world pays
nothing and the feature is opt-in per region. Same authoring gesture as
volcanism, same seed reproducibility, and it gives the precomputation a footprint
and residency a unit ("am I in the province") instead of a radius.

A province = **a height forcing function (`landform.*`) minus a list of volumes
(`carve.*`)**. Volcano = mount minus lava tubes; arch = mound minus a cylinder;
sea cave = headland minus a capsule. Both halves already exist and are
unit-tested — the tunnel work survives as the subtractive half.

**Story → geometry** (TUNNEL-DESIGN): a small graph, nodes pinned as OFFSETS
BELOW THE SURFACE, then strokes (`carve.tube`) along edges and fills
(`carve.sphere`/`box`) at nodes. The offset is the trick — a node pinned 40m down
cannot break the surface, so "which cavities surface" becomes a property rather
than a check, and entrances happen only where an author pins depth 0. Two things
to verify rather than hope: an edge between two deep nodes can still pop out of a
ridge between them (pin per sample, don't interpolate), and crossing edges create
connectivity nobody declared.

- [ ] **Build the ARCH first** once the measurements pass: it breaks the surface
      twice at close to the best-conditioned angle available, so it exercises the
      whole path in the geometry most likely to work. If an arch can't be made to
      work, nothing harder will.
- [ ] **Precompute cavity-reaches-surface.** A cavity whose top is below the
      terrain over its footprint cannot affect the visible surface, so it is
      free until someone is inside it. Cheap (bounds vs the height sampler) and
      it turns residency from a radius — with `b3d-patch`'s hysteresis problem —
      into "am I inside, or can I see in".
- [x] **CORRECTED 2026-08-16 — both measurements PASS at the specified
      resolution.** My cost test used 2–4 m cells against a heightfield whose
      finest spacing is 128/24 = **5.33 m**, so it measured "denser mesh AND
      cavities" — a proposal nobody made. And it compared deviation against
      ZERO, when the baseline is the heightfield mesh's own interpolation error.
      Measured properly: at 5.33 m the volumetric surface errs **0.243 max /
      0.063 mean versus the heightfield's 0.266 / 0.068** — marginally _better_ —
      and extraction costs **2.3–2.7 ms against a 2–4 ms budget**. At the
      second-finest resolution it is 0.7–0.8 ms. So the LOD swap is invisible and
      affordable, and surface-minus-cavities is now an optimisation rather than a
      rescue.
- [x] ~~extraction cost RULES OUT the naive version~~ — wrong, see above
      (2026-08-15). One 128 m tile, fBm terrain, against a 2–4 ms `tileBuildMs`:
      8 m cells 1.5 ms, 4 m 3.4–4.4 ms, 2 m 9.4–14.1 ms. Beside the deviation
      table that is a straight tension — **2 m buys sub-centimetre and costs 3–5×
      the budget; 4 m fits and deviates 5 cm**, on ground you are standing next
      to. So "make the finest tiles volumetric" is dead by its own numbers, and
      what survives is **surface minus cavities**, where cost scales with cavity
      volume rather than tile area and the deviation question does not arise at
      all. The two measurements killed the expensive version and left the cheap
      one standing, before anything was built on either.
- [ ] **The number that now matters: what fraction of a tile a REAL cavity
      touches**, and therefore what extraction actually costs in a province.
      Needs a real province, not a synthetic one.
- [ ] **Escape hatch if it is close:** extraction is a pure function over
      transferable typed arrays — exactly the shape PERF-DESIGN says belongs in a
      worker. Nothing about it needs the frame thread.
- [x] **DONE — deviation measured, and it PASSES** (`volumetric-surface.test.ts`,
      2026-08-15). Against 6 m sine hills: 8 m cell → 0.189 m max, 4 m → 0.049,
      2 m → 0.0096, 1 m → 0.0011. Flat ground is machine epsilon; a plane is
      6.7e-7. The error is **quadratic in cell size**, i.e. ordinary
      discretisation (curvature inside a cell), not drift — so at the finest LOD,
      where this would actually be used, 2 m is already inside the
      sub-centimetre bar. The ground does not shift when a tile changes
      representation. Caveat recorded in the test: smooth sine hills flatter the
      result versus real fBm; the quadratic convergence is the durable finding.
- [ ] **Deviation at a BREAKING cavity** — the surface is untouched elsewhere, so
      what remains is the entrance case alone.

Do NOT start building on this before both numbers exist. The last attempt at
tunnels spent a fortnight discovering a conditioning problem that a morning's
measurement would have exposed.

## The everything demo — flat world → planet → system (idea, 2026-08-15)

Tonio's: a scene you can fly a craft around a flat terrain-and-water world, climb
through the air into space, and have it become a **spherical planet with air,
water and space as shells** — eventually inside a star system, inside a galaxy.
Later: portal into buildings, get out of the ship, walk to a jeep, drive to the
beach, swim.

**The trick that makes it possible is the whiteout.** The plasma sheath of
atmospheric entry/exit is not decoration here — it is _cover for a
representation swap_. A flat heightfield world and a spherical planet are
different parameterisations, and the honest way to get from one to the other is
to stop showing the player the world for a second. A loading curtain that the
fiction asks for anyway. Same trick as the splash: the moment you cannot see is
the moment you can rebuild.

That reframes the whole thing from "a huge feature" to "one hard seam plus a lot
of existing parts", which is why it's worth writing down.

**Why it's worth building beyond the spectacle:** it exercises nearly every
subsystem at once, in combination, which is where the bugs actually live —
terrain LOD, water, media, the medium transitions, skybox, floating origin,
vehicles, the biped, input focus, pause, and the perf budget under real load.
Most of manta's issues this cycle were _combination_ failures (ambient tuned for
a walker breaking on a vehicle; a panel sized for a monitor breaking on a phone).
It also answers #20 directly — the demo suite representing one kind of game.

**Staging, cheapest first:**

1. **Air → space on a FLAT world.** An atmosphere `sphere` medium centred far
   below, so "climbing out" is just `submergence` falling to 0; skybox
   cross-fades to stars on that same weight (MEDIUM-DESIGN §5); whiteout on
   `crossing` (§6). No planet yet — this tests the medium/sky/transition trio
   with nothing new underneath, and it's a good demo on its own.
2. **Crossing speed** (§6) — one field on the crossing result. Do it before
   anything dresses a transition, or splash and plasma each invent an intensity.
3. **The swap.** Flat terrain ↔ spherical planet behind the whiteout. The hard
   part is not the visual: it's that entity world positions are in a different
   frame afterwards, and precision at planetary radius needs a nested frame
   rather than the floating origin we have. Prototype with a SMALL planet
   (single-digit km) where the maths is honest and the seams show.
4. **Star system / galaxy.** `b3d-star-system` and `b3d-galaxy` exist; this is
   mostly a scale-and-hand-off problem, i.e. step 3 again at another magnitude.
5. **Get out and walk.** Ship → biped → jeep is `b3d-input-focus`'s existing
   enter/exit; the new part is **interiors**, which is a cavity province like
   any cave — a building is a `pad` landform minus some boxes. (`b3d-patch` was
   yanked; see below.)

**THE 2-SECOND BUDGET IS THE FEATURE.** Manta already loads fast on a phone,
and a mini-No-Man's-Sky that opens from a URL in ~2s on an iPhone — no install,
no store, no download screen — is a far stronger claim than the same thing
looking prettier. It is also the whole PLATFORM.md bet, demonstrated instead of
argued.

What protects it, and what will quietly destroy it:

- **Procedural is why it's fast.** Terrain, planet, star system and galaxy are
  all generated, so there is nothing to stream — the payload is the 2.5 MB
  gzipped bundle and almost nothing else. That is a property of this particular
  demo, not of the engine.
- **Assets are the enemy, and they arrive one reasonable decision at a time.**
  A ship, then a jeep, then a building, then a character — each defensible, and
  together they turn 2s into 20s. Stage 5 (get out and walk) is exactly where
  this pressure lands.
- **So state the budget up front and check it**: cold load to first interactive
  frame on a mid phone, over LTE, with an empty cache. If a stage cannot hold
  it, that stage ships as a SEPARATE page rather than being folded in — the
  series structure below is what makes that possible without losing the arc.
- The spin-up sequence (below) covers whatever load remains, and measures the
  device while it does it.

**Do not** build it as one demo page. It should be a series that share a scene
setup, so each stage is independently checkable — and so a stage that breaks
doesn't take the others down with it.

## Spin-up sequence — the loading screen that MEASURES (idea, 2026-08-14)

An optional, lightweight, snazzy intro that plays while content streams in. Three
jobs from one thing, which is why it's worth building rather than bolting a
spinner on:

1. **A controlled workload to benchmark against.** The device probe's whole
   problem (#11) is that it measures whatever the machine happens to be doing —
   it fires at `setTimeout(0)` and lands inside terrain build + shader compile,
   so a fast machine measures slow and the verdict caches for 30 days. A spin-up
   sequence is a **known, fixed-cost scene we author**: the contention is ours
   and it's the same on every device, so the numbers mean something. Measuring
   _during_ load stops being a mistake and becomes the design.
2. **Branding.** The first thing anyone sees, and right now it's a black canvas.
3. **Progress.** `getWaitingItemsCount()` and the terrain's own settle state are
   already there — the sequence is the natural place to show them, and a scene
   that says what it's waiting for is a scene that doesn't read as broken.

Design notes to keep in mind when it's built:

- **Optional and skippable** — never a gate on a scene that loads fast, and
  never a fixed minimum duration that makes a quick load feel slow.
- The measurement only means something if the sequence's cost is **identical
  across devices** — no adaptive detail in the spin-up itself, or the benchmark
  measures the adaptation.
- It should scale its own workload deliberately (a few known-cost passes) so one
  sequence can separate a Quest from a workstation without a separate probe
  engine at all.
- Ties into the tier-recovery question: a device that loads a second scene has a
  second spin-up, which is a natural re-measurement point.

## Needs validation (built without a headset — spot-check next session)

Changes made from source-only (tsc + unit tests green) that still need a human/headset
look. **Flat** = check in the browser; **VR** = check in the headset.

- [x] **Flat — pause** (0.7.0) — CONFIRMED by Tonio 2026-08-15 on the tunnel:
      unpause works, the camera is frozen while paused (the zoom-gesture fix),
      backgrounding repauses, returning and continuing works, repeatedly.
- [ ] **VR — `enterXrOnResume`** — the motivating path and the one still
      unproven: Continue must be the user gesture that enters immersive VR, and
      taking the headset off must pause. Needs a headset; nothing in the flat
      check exercises it.
- [ ] **Flat — `b3d-death`'s panel likely has the same two bugs the pause panel
      had** (camera fights the tap; fixed 1.1-unit width overflows a portrait
      phone). Untouched because death runs its own spectator camera. Crash on a
      phone and try Respawn — if it fights you, it's the same fix ported.

- [x] **Flat — crashed aircraft releases input** (issue #9, fixed 0.7.0) — CONFIRMED
      by manta-recon 2026-08-14 on https://3d.tosijs.net/crash-test.html: case A
      halts with the no-death-element message, case B explodes → panel → a
      controllable respawn, and a SECOND crash of the respawned aircraft now
      behaves like the first (that third crash found the b3d-death latching bug,
      fixed the same day).

- [ ] **Header logo size** (blocked on tosijs-ui): the `tosiXr` header mark is correct, but
      tosijs-ui hardwires the doc-browser logo to `LOGO_SIZE = 40` (inline height). Once tosijs-ui
      ships a logo-size option / CSS var (Tonio is adding it — "a doozy"), bump tosijs-ui and set the
      size in `site.config.ts`. Until then the size is whatever tosijs-ui picks.
- [ ] **Trigger** (flat): reload `/b3d-trigger/`; readout should show `target=walker · resolved=true` and `inside=true` on arrival → marker relocates. (Was the razor-thin geometry + target-name/reactive-set; belt-and-suspenders `setAttribute` applied.)
- [ ] **b3d-panel demo** (flat + VR): the world-anchored `b3d-svg-plane` panel shows in the flat view; the VR-only `<tosi-b3d-panel>` shows only in-session; dual-presence gear panel opens (starts open via `scenePanelOpen`).
- [ ] **Scene panel** (flat + VR): `scene-panel-open` starts it open; × close button works (😳 in VR); Enter VR button shows 😎.
- [~] **xr-grid auto** (VR): main b3d demo CONFIRMED grid removed (2026-07-05); still verify biped demo + that it SHOWS in a free-fly demo. Orig: floor grid hidden in the main/biped demos (player-driven rig), shown in free-fly demos; `off`/`on` honored.
- [ ] **Nameplates** (flat + VR): 2× size, compact card, sit just above the head.
- [ ] **Skybox demo** (flat): checkered ground receives shadows; box/box/sphere cast; shadows swing with the time-of-day slider.
- [ ] **Axes gizmo** (flat): `axes: true` on the b3d-panel cube shows the glowing R/G/B gizmo through a translucent cube.
- [ ] **Demo cameras** (flat): the 8 tuned demos no longer zoom-through / tilt under the horizon; library uses the default camera.
- [ ] **Gear/Enter-VR gating** (flat): both disabled (dimmed) until the scene finishes loading.
- [ ] **Spatial-transform Babylon bridge** — NOT built yet (pure math done + tested). Needs headset once built (attach/transition, floating-origin flip, declarative elements).
- [ ] **Vehicle enter/exit** (Tonio) — the parked plane in the b3d test scene is waiting for this. Reuse the viewpoint affordance (see UI-DESIGN-NOTES → "Changing the viewpoint"): flat = `setGameplayCamera(vehicleCam)` / `setGameplayCamera(bipedCam)` (no-op-in-XR is automatic); XR = re-seat the rig on the cockpit node / back on the biped. Extract `B3d.seatRig(node, offset)` as the rig counterpart to `setGameplayCamera`, shared by cockpit/death/vehicle-enter. `b3d-input-focus` already has the enter/exit hook points.
- [ ] **Death panel pins to the head in VR** (flag) — it's a `b3d-svg-plane` with `cameraRelative` (parents to `scene.activeCamera` = the head), so it swims with your gaze and sits behind the global panels. Pin it to the `rig` frame, front-and-centre. Needs `b3d-svg-plane` to accept a frame to parent to (or the death panel to reparent once the plane mounts). Also: wreckage/explosion + orbit reported not visible in VR — diagnose on-device.
- [x] **Clouds cast shadows** — SHIPPED (0.5.0) as a **projected shadow texture** (`cloud-shadows.ts`), NOT the CSM (a cloud at altitude is out of cascade range). The field is painted top-down into one texture and sampled by world position in a material plugin, so it conforms to terrain AND falls on elevated receivers (the aircraft, via sun-projection). `castShadows` + `shadowStrength` on `<tosi-b3d-clouds>`. `shadow-decal.ts` is the sibling for single casters.
- [ ] **HUD in the aircraft demo** (Tonio, decide) — HUD is cockpit-only now (as requested) and the demo defaults to CHASE, so there's no HUD in the default view (reads as "HUD disappeared"). Options: default the combat demo to cockpit view (add a `cameraView` attr to b3d-aircraft so a demo can set it), or show a slim HUD in chase too. Pick one.
- [ ] **🚨 visionOS: we are controller-first and Vision Pro has NO controllers** (see `PLATFORM.md` §7). On visionOS Safari, `session.inputSources` is **EMPTY except during a pinch** — no sticks, no buttons, no persistent ray (PSVR2 Sense show up in `getGamepads()` but NOT as `XRInputSource`). A stick-driven biped/aircraft gets **zero input forever**: the app doesn't degrade, it looks BROKEN. The plumbing is fine (`ControlInput`/`InputProvider`), the _interaction design_ is inverted. Work, in order:
  - [ ] `TransientPointerProvider` — gaze ray + pinch (`select`/`selectstart`/`selectend`) → `ControlInput`, beside `XrInputProvider`. `CompositeInputProvider` must treat "no persistent source" as a FIRST-CLASS state, not an error path.
  - [ ] **Locomotion inversion** — make gaze/point + commit (teleport arc, waypoint move, look-to-steer + pinch-to-throttle) the CANONICAL path and continuous stick locomotion the _enhancement_ when a `tracked-pointer` with axes exists. Currently backwards. **Hands + gaze-commit is the only universal model** (all 3 platforms have hand tracking); controllers are the platform-specific extra.
  - [ ] **No hover on visionOS — by design (privacy).** Apple only reveals gaze AT THE PINCH. So `frame-panel`'s gaze-reveal is dead there, as is any "look at it to arm it" affordance or persistent ray cursor. `_attachXrPanel`'s ray→UV pick must work from a transient ray fired once at pinch-start.
  - [ ] Discrete actions only — hold-duration, combos, and B/X/Y have no visionOS mapping. Overflow to the `scenePanel` spatial UI (already coordinate-picked). The "VR-reachable fallback" in [[control-conventions-gtav]] just became load-bearing.
  - [ ] ⚠️ **Index-shift footgun**: with hand tracking on, transient pointers are at `inputSources[2]`/`[3]`, NOT `[0]`/`[1]`. WebKit explicitly warns this breaks frameworks assuming 0–1.
  - [ ] ⚠️ `immersive-ar` is NOT supported on visionOS (no Apple timeline) — keep passthrough OFF any cross-platform critical path.
  - [ ] Babylon visionOS quirks are real: `enabledFeatures.indexOf` crash on hand-tracking enable, cursor instability after the 7.26.3 pointer-mode rework (forum 47849, still open). Expect workarounds.
- [ ] **Babylon 9.16.2 — the pixels** (flat): types + 402 tests are green and 9.x has ZERO breaking-change entries, but headless can't see rendering, and Babylon ships silent visual fixes without a breaking tag. Eyeball water, reflections, CSM shadows, particles, and a real GLB scene.
- [ ] **Babylon 9.16.2 — XR VRAM** (VR): 9.x fixes a `WebXRSessionManager` disposal-ORDER bug. That lands squarely on our repeated-session VRAM exhaustion (reticle → checkerboard), which we'd written off as a Quest-browser problem. Re-test enter/exit cycles — some of it may have been ours.
- [ ] **Jolt 1.1.0 — physics FEEL** (flat): the JS/TS API is purely additive, but it pulls Jolt 5.6.0, which **changed the friction model** ("the simulation changed slightly… effects accumulate over time"). Our plugin defaults are `friction: 0.5, staticFriction: 0.5`. Nothing breaks; things settle and slide differently. Re-drive the physics demos and re-tune if needed.

See the **Bugs** and **Icons / spatial UI** sections below for the known-broken items still needing a headset (galaxy billboard, terrain recenter, VRAM, XR rig misalignment, VR-only panel, library Exit-VR clip).

## Default-true boolean attrs — DONE (tosijs now THROWS at construction on a true default)

tosijs correctly treats an absent boolean attribute as false, so `initAttributes({foo:
true})` never turns on. This is **no longer silent** — tosijs now **throws at construction**,
so a component with a true-default boolean is dead on arrival (its ctor throws before it wires
anything). Fixed everywhere (string `'on'|'off'` enum, or a negative boolean):

- [x] b3d-trigger `active` → `disabled` (default false = active)
- [x] b3d-black-hole `lensing`, `photonRing` → `'on'|'off'`
- [x] b3d-shadows `stabilizeCascades` → `'on'|'off'`
- [x] b3d-star-system `animate`, `showOrbits` → `'on'|'off'`
- [x] b3d-svg-plane `pointerEvents`, `doubleSided` → `'on'|'off'`
- [x] **b3d-controller `player` → `player: false`** — the one that slipped through; because
      tosijs now throws, its ctor died and `<tosi-b3d-controller>` wired NO input in any demo
      (the "controller does nothing" bug). Fixed 2026-07-23. No default-true booleans remain.

[x] HUD warning block — DONE. `setWarnings([{text, side?}])` on the HUD driver + b3d-hud: shows stacked warning text (#warning) and flashes the threatened-side gauge BORDER red (bottom = PULL UP/ground, etc.). Wired into b3d-aircraft (pullUp → bottom, stall → text). Code HUD (buildFallbackHud) is now the default (fully wired); designer-asset `normalizeHud`/horizon adaptation deferred. Next: weapons exist now (v0.4.0) — drive threat warnings from combat (incoming missile → bearing side); and the radar traces (`setTraces`) still need wiring to live scene targets.

## Acceleration (workers / wasm) — see PERF-DESIGN.md

[x] Terrain tile profiler — `profile` attr → `debugState`, split MOVABLE (noise/normals) vs
IMMOVABLE (GPU upload), plus worst-frame. `movableShare` is the ceiling on any worker/wasm win.
[x] Padded-grid normals — the ±e gradient samples ARE the neighbouring vertices, so we were
evaluating the noise 5× per vertex for no reason. `terrain-grid.buildTileField` samples one
ring wider and differences it: identical output (differential test), ~4.3× fewer evals,
2.54ms → 0.68ms per tile, worst frame ~61ms → ~16ms. **Algorithmic win before technology win.**
[x] **RE-MEASURED — the worker is NOT justified. Decision: don't build it.** Quest: **worst frame
3ms / 4 tiles, movableShare 50-70%**. Against ~11ms at 90Hz that's a rounding error on the weakest
device — and only half to two-thirds of the cost can leave the main thread AT ALL there (the GPU
upload is a far bigger share on mobile than on a workstation, where it read 93-97%). A perfect
worker could take ~2ms off a 3ms frame. Not worth a thread + blob spawn + pending-tile state
machine + floating-origin rebasing of stale results. `movableShare` told us not to build the thing
before we built it — the metric earned its keep.
[x] Three pure-JS wins got us there, no new technology: padded-grid normals (4.3x fewer samples),
hoisted height-fn constants (~2x — nine attribute reads per sample in the innermost loop), flattened
Perlin gradient table (3.1x — grad() destructured a boxed tuple 8x per noise eval). Chrome: ~61ms
projected saturated frame → ~3ms of tile work.
[x] **Time budget** (`tileBuildMs`, auto per tier) — build in priority order until the ms budget is
spent, then continue next frame (always ≥1 tile). A tile COUNT bounds the frame only by accident;
TIME bounds it by construction on every device, and self-corrects when detail rises. Same idiom
tosijs uses for big virtual-list bindings.

### ⏸ PARKED — exploratory, NOT the priority (2026-07-14)

Terrain is fast (3ms worst on Quest) and smoothness is now GUARANTEED (`tileBuildMs`). That was
worth doing, but it's infrastructure, and infrastructure is exactly the thing that quietly becomes
the project. **Off-track for the local goal (a playable aircraft combat game) and the north star (an
immersive sandbox sim paired with a dynamic GM).** Pick these up only when they're on the path:

[ ] Spend the headroom on DETAIL: raise `hiResSubdivisions` in the tier table (cost scales as
`(subs+3)²`, so ~2x the linear vertex density is available), re-measure worst frame + movableShare.
NB detail inflates the UPLOAD too, and no thread can move that.
[ ] **Opportunistic / closed-loop quality** — the time budget affords this for free: if frames land
comfortably under budget, raise detail; if the budget keeps biting, lower it. A quality GOVERNOR
rather than a static device tier. (The tier table becomes the starting guess, not the answer.)
Attractive, and still not the priority.
[~] Terrain worker — NOT JUSTIFIED (see above); kept only as a record of the design. Send the RECIPE (`{cx,cz,subs,tileSize}` +
seed/scales — determinism is what makes this tiny), TRANSFER the result buffers back. Wrinkles:
async tiles × floating origin (a tile computed pre-shift must rebase or be discarded), a
`pending` tile state so the pool can't steal an in-flight tile, no SharedArrayBuffer on GH Pages.
**And the one that decides the design: `new Worker()` needs a SAME-ORIGIN script, so a consumer
importing us unbundled from a CDN can't spawn one at all** — needs a blob-URL shim that
dynamic-imports the real worker by absolute URL (see PERF-DESIGN.md). That ceremony is exactly
what Tonio's unpublished **wobbly** already solves; check whether it does web workers (blob-
spawnable) vs service workers (NOT — registration rejects blob: and demands same-origin).
[ ] **GM / narrative driver in a worker — the one worker we've APPROVED** (see PERF-DESIGN.md +
world-contract.ts). Split on LATENCY TOLERANCE, not CPU: a planner/LLM round-trip is 100ms-2s,
which inline is 20-200 dropped frames. `world-contract.ts` is already the membrane spec — its
decoupling rules turn out to be exactly what makes a worker correct (advisory intents ⇒ late-or-
never is safe; best-effort events ⇒ SHED under backpressure, never queue stale advice; query-is-
truth ⇒ the round-trip gap is survivable; serializable state + stable ids ⇒ small parcels).
Shape: an ACTOR (long-lived, persistent memory, initiates, does network I/O) — not a task pool.
Engine: the AJS **VM** (capabilities + gas limit = its worst-case guarantee; sidesteps unsafe-eval),
NOT wasm — it's decisions, not arithmetic. This is the wobbly use case that's genuinely ironclad.
[ ] Batch noise API (`sampleGrid`) — pays in plain JS, serves terrain + planet + star-system,
and is the seam a wasm kernel drops into. Design it before the kernel.
[ ] Steering/crowd kernel — NOT yet justified (a handful of agents is free). **The AI scenario
harness is the forcing function**: 50–200 agents doing avoidance is the frame budget. Design the
steering API to take ARRAYS now so the kernel can drop in later without an API break.
[ ] tjs-lang as a pinpoint wasm accelerator (NOT a whole-codebase migration — see PERF-DESIGN.md
for why): pure JS stays canonical, wasm is optional behind the same batch interface, differential
test asserts they agree. Jolt stays — it's already wasm and already mature.

## GM / narrative driver — the off-thread actor (see world-contract.ts + PERF-DESIGN.md)

The GM is a separate project built on AJS, running in a worker, driving this sim through
`world-contract`. Distributable tasks once it's refocused:

[ ] **Extract the contract as its own tiny package.** `world-contract.ts` is pure types with
ZERO dependencies. The GM repo must depend on _that_, never on tosijs-3d — otherwise a narrative
engine transitively depends on a 3D renderer, which is the exact coupling the contract exists to
prevent. Ship the doubles + conformance kit with it.
[ ] **The driver test rig — THREE parts** (the middle one is the job):

1. the REAL `world-store` (pure, deterministic, headless — don't fake the mechanics, a fake
   drifts and then lies to you);
2. **synthetic PLAYER PERSONAS** — the store emits nothing on its own; what a GM consumes is a
   stream produced by somebody BLUNDERING. Seeded, reproducible; knobs for engagement,
   attention, persistence, goal-directedness. **These personas ARE the artificial-stupidity work
   (AI-DESIGN) pointed at testing** — a GM that only copes with a competent player is pointless;
3. a **HOSTILE transport** — drop/delay/reorder events, answer getState from a stale snapshot.
   Conformance, not stress: the membrane is lossy and async BY CONTRACT, and a friendly mock
   would hide a driver that can't survive being in a worker.
   [ ] **Dead air is a first-class test case.** Events are commitments, not proximity — so a player
   who walks past the clue a dozen times generates NO EVENTS. The GM must infer stuckness from
   silence + state queries (which is why `WorldState.now` crosses the boundary). A canned event log
   can never test this; only a persona that NEARLY engages produces it.
   [ ] Assert in BOTH directions or it's a demo, not a test: under-intervention (stuck ten minutes,
   GM never escalated) AND over-intervention (GM railroaded someone who was happily exploring).
   [ ] Reverse rig, on our side: a **scripted adversarial driver** pushing stale/impossible/
   contradictory/dead-entity/flooding intents — none of which may corrupt anything, since intents
   are advisory. This is what proves the sim is the complete sandbox the contract claims.
   [ ] **Golden replays for free:** the store is deterministic and clock-free, so (seed + event log)
   reproduces a session exactly. Regression = replay this stream, assert the intents. Seeded ⇒ you
   can FUZZ the guarantees reproducibly ("drop 30% of events; assert the GM still converges").
   [ ] **NB the rig is the AI scenario harness with a different observer** — seeded scene, seeded
   RNG, drivers as input providers, debugState overlays. Swap the NPC-AI-under-test for a player
   PERSONA and make the GM the thing observed. One harness, two consumers: build it once, properly.

## THE GAME: integrated aircraft combat demo (the local goal → v0.5.0)

Fly, shoot stuff down, get shot down, crash, RESPAWN. Dynamic terrain + water (≈30% land),
enemies spawned in SETS, waypoints that die with their target, weather + day/night + shadows.
"Rich enough for a GM to spawn content into and evaluate player actions" (find and destroy the
mothership) — so every piece below is systemic, narrative-blind, and driver-ready.

[x] Death loop — `b3d-death` (wreck, orbit camera, panel), `releaseFocus`, pull-model respawn.
[x] Prefabs — a named factory that instantiates a package of stuff at a pose.
[ ] **Spawner + ENCOUNTERS** ⟵ the keystone. "Mothership + escorts", "base with ground defences
and air cover" are not spawns, they're COMPOSED GROUPS WITH A LAYOUT — i.e. a prefab whose members
are placed in a formation. Spawner rules: what, max-alive (capacity + eviction), interval, min/max
distance from the player, SEEDED (so scenarios reproduce). Formation helpers (ring/vee/escort).
**The encounter prefab NAMES become the GM's spawn vocabulary** — `spawn('mothership-group', at)`
is a string that crosses the worker membrane; a closure could not. That's why prefabs are a
registry, and it's how "find and destroy the mothership" is a GM composing systemic pieces with no
narrative vocabulary in the sim.
[ ] **Waypoints that die with their target** (PRIORITY). Should already work: a `b3dRadarBlip`
nested in a destroyable follows that mesh via semanticParent, and a dead destroyable sets
`mesh = undefined` → the blip reports null → the radar drops the track → the HUD marker vanishes
because the thing it marked stopped existing. VERIFY in the scene rather than assume.
[ ] **The assembly scene** — terrain + water + aircraft + death/respawn + spawner + HUD. This IS
the game, and the integration test. Sea level at the **70th percentile of a sampled heightfield**
(deterministic) rather than a hand-tuned constant — otherwise every reseed re-breaks the coastline.
[x] **Clouds** — SHIPPED (`b3d-clouds`). Cheap soft blobs at a layer altitude; the whiteout is
driven by FOG (colour → white, density → up as you penetrate) via the always-on atmosphere's
`band()`, NOT a post-process (those are expensive in XR and awkward in stereo; fog is per-pixel and
~free). `isPickable = false` set on every blob (the picking/swept-collision trap is handled).
`insideCloud` (0…1) exposed so a cloud is a TACTIC — break a radar lock, hide a mothership — not
just a texture. Own doc-page demo (fly in, world dissolves). REMAINING (future, line ~537): multiple
cloud LAYERS, and god-rays through clouds (= the sun-shafts-as-additive-panels item, not a
post-process). Still wants a VR eyeball (whiteout in stereo, blobs read as volume not cards).
[x] **Ambient particles** — `b3d-ambient` (motes/bubbles/rain/snow/dust). Emitter box rides the
CAMERA, particles live in WORLD space (rain falls PAST you). `where: underwater` ramps with depth
via the fog's own `band()` — it arrives with the water, no thunk. Capacity is not a number you set:
each effect ASKS, and `ambient-budget.ts` divides one shared, device-tier-sized pool between all
comers, charging modelled fill cost (area × blend — measuring is impossible: Babylon has no
per-system counter and the cost is GPU fill, so `EXT_disjoint_timer_query` you won't get on a
Quest). **An effect that can't be given its honest minimum switches OFF rather than thinning** —
40 raindrops is a rendering bug, not light rain. Shed lowest-priority-first; freed budget goes to
the survivors. Sustained under-target frame rate ratchets the pool down, ONE-WAY.
[ ] **Ambient wind + turbulence — ONE sampleable vector field** (Tonio). The headline isn't
weather, it's this: **a shared field is how you get motion that looks Brownian but stays coherent,
without tracking an insane number of per-thing movement vectors.** Don't give every particle, leaf,
smoke puff and aircraft its own random walk — give them all one pure function
`wind(x, y, z, t) → {x,y,z}` and let them SAMPLE it. Two things that sample the same point at the
same instant agree, for free: the rain streaks slant the way the smoke drifts the way the leaves
blow. Stateless, so nothing accumulates drift; deterministic, so a headless driver and the render
both see the same gust.

Shape (same discipline as `perlin-noise` / `fly-by-wire`): pure, Babylon-free, seeded, no
`Date.now`/`Math.random`, time passed in — unit-testable, and cheap because we already have a
fast flattened-gradient Perlin. Layer it: steady base wind (direction + speed) + slow large-scale
GUSTS + fast small-scale TURBULENCE.

Consumers, and why each one is a behavioural win rather than a visual one:

- **Aircraft jitter** — a plane that hangs in the air perfectly still is a lie about flying. Sample
  turbulence into the flight model so you must actively correct. Straight at the north star:
  behaviour, not vertices. NB `fly-by-wire.ts` is PURE — wind must be an INPUT to the step
  function, never a global it reaches out and reads, or it stops being testable.
- **Rain** — a streak particle whose direction is (gravity + wind), so it slants _consistently_
  with everything else, plus a **puddle splash** where it lands (splash ties into the decal TODO
  below — same ring-buffer, same shared pool).
- **Smoke / leaves / dust / flags** — all just samplers. Smoke especially: it's the one effect
  that's ALL about the medium it's in.
- Ambient particles today fake this with a per-system Babylon `noiseTexture`. That's the cheap
  approximation, and it's fine — but the strengths and directions should come FROM the field so
  the fake agrees with the real one. Honest tension to design around: Babylon's CPU particle
  update doesn't give us a cheap per-particle hook, so per-particle field sampling means a custom
  update function and a real cost. Measure before committing to it.

⚠️ **Floating origin**: the field is sampled by WORLD position, so a terrain rebase would slide the
whole weather system sideways relative to the world unless sampling adds the accumulated origin
offset back. Same class of bug as anything else holding world coordinates — see `addOriginListener`.

[ ] **Ambient art direction: authorable textures / SVGs** (Tonio) — the presets currently draw a
generated soft dot and pick blend/opacity themselves; that's a placeholder, not a decision. Expose
the sprite (`texture` attr, and an SVG path through `svg-texture.ts` — a designer-authored snowflake
/ raindrop streak / bubble rim, same pipeline the HUD and gamepad art use) plus `blend` and opacity
as authorable knobs, and let the preset supply only the DEFAULT. NB the two lessons already paid
for: additive is invisible against a bright background (it's why underwater bubbles vanished — you
can't add brightness to near-white fog), and the emitter box is camera-centred so sprites MUST have
a near-field exclusion or they're born on the lens as big soft blobs.
[ ] **Reclaim ambient budget in quiet moments** (Tonio) — the ratchet above is deliberately
one-way, so an effect shed during a heavy fight stays gone for the session. Find headroom when the
scene is genuinely calm and let switched-off garnish back in. The hard part is NOT detecting
headroom, it's not building an oscillator: ambient popping in and out as you fly is its own broken
promise. Wants a long observation window, hysteresis, and probably a cap on how many times a given
effect may return (a thing that has flickered twice has earned its retirement).
[ ] **Decals: footprints, blood drips, bullet holes** (Tonio) — the same garnish discipline, but a
DIFFERENT beast from ambient, and the differences are the whole design: they ACCUMULATE (ambient is
fixed-capacity because particles die), they're anchored in WORLD space (so they MUST opt into the
floating origin — `registerWorldRoot` / `addOriginListener`, or they'll drift off the wall they were
shot into), and they need a ring buffer with oldest-fades-first eviction rather than a lifetime.
Should claim from the SAME `ambient-budget` pool — a scene can't afford rain _and_ unbounded
bullet holes, and only a shared pool can know that. Strongly on the north star: a footprint is a
**trace of agency** — the world remembering what you did. Depth is systemic, not textural.
[ ] **Sun shafts = translucent ADDITIVE PANELS, judiciously placed** (Tonio) — NOT a real
post-process god-ray (VolumetricLightScatteringPostProcess is expensive and awkward in stereo).
Cheap, stereo-safe, costs ~nothing on a Quest. To read volumetrically: billboard each panel AROUND
THE LIGHT AXIS (holds up from any angle) and fade alpha by `dot(viewDir, lightDir)` so shafts bloom
when you look toward the sun and vanish when you look away. `isPickable=false`, no shadow cast —
same rule as clouds.
[ ] Day/night + shadows — mostly composing what exists (skybox `timeOfDay`/`realtimeScale`, b3dSun
CSM). Tune in the assembly scene.
[ ] AI beyond turrets — later, via the scenario harness. Turrets + spawned sets are enough for now.
[ ] **Multi-viewpoint / TV-guided weapons** (Carrier Command!) — unblocked by the per-instance
camera fix: "one player entity" was never the real model. Switching which entity you drive AND see
is close, and a TV-guided weapon is just an entity with a camera you temporarily drive.

## AI scenario harness (verification playgrounds)

[ ] Shared **scenario harness** for watching AIs (design: AI-DESIGN.md → "Scenario playgrounds"). Spawns a configured scene (entities/targets/obstacles/waypoints/roads/traffic), SEEDS RNG (presets = named seeds/configs, randomized runs reproducible), drives the AI(s) as InputProviders, overlays each AI's `debugState`. Beyond the trigger wander demo: AI aircraft (pick targets, avoid air/terrain collisions, fly waypoints, shoot, break off); AI ground vehicle (roads + traffic). The **AI-aircraft playground is how we verify the MVP aircraft-combat slice** — build it alongside the aircraft AI. Leans on the deterministic/seedable world-store.

## MVP: Aircraft combat vertical slice ⟵ mostly SHIPPED (v0.4.0)

A quick playable game on the **aircraft + dynamic terrain + water** models: fly
around, **shoot** (guns), **bomb**, and **fire missiles** at **cube targets**
(ground + air; inert for now — "make them do stuff" = later, via `AI-DESIGN.md`).
All projectiles are **cubes** for now. Combat atoms spec'd in `COMBAT-DESIGN.md`.

> **STATUS (v0.4.0):** the combat toolkit + weapons are DONE and interactively
> testable — destroyables/warheads/launcher/turret/guided missiles (each with a live
> demo), and **the aircraft is armed** (guns on held fire, bomb + guided missile with
> forward-cone lock, mapped through `aircraftMapping`). Combat verified live via Haltija.
> **Still open vs. the original plan:** (1) the **bomb-sight arc + impact marker**
> (`predictPath` exists, not drawn); (2) the loadout was built as aircraft-integrated
> weapons + a standalone auto-turret, not **2× view-slaved waist turrets** (view-slaved
> turret mode is TODO); (3) the **full assembly demo** (aircraft + streaming terrain +
> water + spawned targets in one scene) — there's a drifting-aerial-drone combat demo in
> the aircraft doc, but not the terrain/water assembly.

**Loadout:**

- **2× waist turrets** (poke out left & right of the fuselage) — \*\*limited traverse
  - elevation**, **slaved to the player's view direction** (flat: camera fwd; VR:
    head fwd). **Reticle color** shows whether a turret can bear there (green =
    at-least-one can, red = out of arc; amber = only one). Fire **ballistic\*\* gun
    rounds.
- **Wing-mounted bombs** — ballistic (gravity) drop, with the **bomb-sight arc +
  impact marker**.
- **Wing-mounted missiles** — guided (fire-and-forget); since targets are inert,
  lead is trivial but steering/acquire still exercised.

**Build order (foundation → weapons → assembly):**

1. `resource.ts` + `destroyable.ts` (pure) → `b3d-destroyable`; spawn cube targets
   (ground + air) that take damage and die.
2. `warhead.ts` (pure) → `b3d-warhead`; cubes explode (direct for guns/missiles,
   AOE for bombs), LOS-gated.
3. `ballistics.ts` (pure) → `b3d` ballistic projectile (cube) + swept collision.
4. `b3d-launcher` (timing/ammo) — used by all three weapons.
5. `guidance.ts` turret aim helper → `b3d-turret` view-slaved, 2× on the fuselage,
   - **reticle can-bear color** (UI). Wire guns to fire.
6. Bombs: wing launcher + ballistic bomb + **bomb-sight arc/marker** (`predictPath`).
7. `guidance.ts` steering → guided missile (cube) on a wing launcher.
8. Assemble the demo scene: aircraft + terrain + water + spawned targets + input
   wiring; tune.

**Known gaps this MVP will hit (address as they surface):**

- **Floating origin — DONE (2026-07-02).** Generalized: `B3d.shiftOrigin(dx,dz)`
  now moves all world-space roots on a terrain rebase. New entities must opt in:
  **`registerWorldRoot(node)`** (position lives on the node — inert targets/props)
  or **`addOriginListener((dx,dz)=>…)`** (also holds JS-side world coords — projectiles
  integrating position, remembered target positions; fixes node + JS itself, don't
  also registerWorldRoot). So: cube targets → `registerWorldRoot`; projectiles →
  `addOriginListener`.
- **Input wiring:** `ControlInput` has `shoot`; need distinct **bomb-release** and
  **missile-fire** actions (extend `ControlInput` / map buttons + a VR control).
- **View-direction source:** one accessor that returns camera-fwd (flat) or
  head-fwd (VR) for turret slaving + reticle.
- **Determinism:** seed the ~0.1° accuracy jitter (MersenneTwister).
- Targets need **no** Sensorium/AI/factions/shields for this slice.

## Game Engine Stuff

[ ] Tie down physics approach
[x] Aircraft Flight Model (pure force model with tests, VTOL, lateral drag, lift)
[ ] Aircraft physics: decompose airspeed into forward/lateral/vertical components and apply distinct lift+drag coefficients per axis. Forward airflow is what generates wing lift; lateral and vertical airflow are pure drag (with lateral drag much higher than vertical). The current model conflates these — single airspeed scalar for lift, single drag coeff for the velocity opposite. A diagonal-flight or sideslip case is approximated, not modeled.
[ ] Aircraft physics: angle-of-attack-aware lift curve (current model is linear in airspeed; real lift drops sharply past stall AoA). Once stall AoA is part of the model, `stallSpeed` can be derived from it instead of being a free parameter.
[ ] Aircraft physics: derive `vtolSpeed` default from `maxSpeed` (recommended is `maxSpeed * 0.5` = the speed at which lift sustains altitude in the current model). Currently the demo and consumers hardcode it.
[ ] Submarine Model
[ ] Spacecraft
[x] VTOL / Helicopter (integrated into aircraft flight model)
[ ] Car (code exists, needs car mesh asset and working demo)
[ ] Biped can aim, shoot, pick up things, gesture, talk
[ ] Biped grounding robustness (polish): the down-probe is only 0.15m and gravity is capped tiny, so a biped that rises >0.15m above the floor (steps, bumps, spawn offset) stops "seeing" ground. `groundY` is now a DEEP void-catch backstop (default -1000), not a walking floor — it no longer masks terrain (that was pinning the player at y=0, sealing water; fixed). For real stepping/slopes consider a longer probe + snap-to-surface. Also: GLB scenes only ground where the floor mesh is named `_collide*` — with the deep backstop, a scene with NO collidable floor now drops the biped to -1000 instead of catching it at 0, so consider a floor fallback / ensure scene GLBs tag their ground.
[x] Animation Blending / State Machine (animation attribute, animationSpeed, setAnimationState)
[x] Triggers (b3d-trigger, proximity-based)
[ ] Death Persona (floating view of dead body, wrecked aircraft, etc.)

## Combat

Full specs: **`COMBAT-DESIGN.md`** (all atoms locked v1 except flame thrower).
Principle: **pure, deterministic, Babylon-free models** (like `aircraft-physics`)
**bridged by thin `b3d-*` components**, and **compose simple atoms** rather than
add special cases. `[MVP]` = needed for the aircraft-combat vertical slice below.

### Shared pure modules (the foundation — build these first)

[x] `resource.ts` [MVP] — capacity + regen + regen-delay (0.5s). Powers BOTH
Destroyable health AND launcher energy pools. (13 tests)
[x] `destroyable.ts` [MVP] — `CombatWorld`: `applyDamage`/`tick`; flat armor + flat
protection (vanishes), cascading chain-link **list** (default 0.25s), delayed
regen, death → events. Refs by id (serializable). Damage = single scalar. (14 tests)
[x] `warhead.ts` [MVP] — `aoeFalloff` (linear `r_full`→`R`, floor 1, 0 beyond) +
`resolveAoe` (LOS-filtered via target `visible` flag). Direct = `spec.damage`.
(10 tests) — bridge `b3d-warhead` (arming, collision sphere, LOS raycast) NEXT.
[x] `ballistics.ts` [MVP] — `ballisticStep` (gravity + quadratic drag, mass-scaled) + `predictPath` (bomb sight; prediction == simulation, non-mutating). Live
flight + bomb sight + guided ballistic fallback. (6 tests)
[x] `guidance.ts` [MVP] — DONE (v0.4.0): `steerToward` (turn-rate-limited seeker),
`proNav` (proportional navigation), `interceptLead` (turret firing lead) + `ballisticAim`
(drop-compensated elevation, in `ballistics.ts`). The `smartness` 0..1 dial landed on
`b3d-turret` (`smart`: lead ramps to full by 0.5, then drop to 1) with the `can-bear`
flag → reticle color. (13 guidance tests + 4 ballisticAim.) Traverse-limit clamp/shortest
path is the turret's `steerToward` slew, not a separate aim helper.
[x] `radar.ts` + `b3d-radar` + `b3d-radar-blip` — SHIPPED. Pure radar model
(range·profile detection, cone, timed lock acquisition, maxLocks, faction opposition;
14 tests) bridged by a UI-less `<tosi-b3d-radar>` (dithered sub-frame cadence) and a
`<tosi-b3d-radar-blip>` (profile + faction; follows a nested target's mesh, or standalone
for waypoints). The aircraft surfaces its radar on the HUD (traces) and fires missiles at
the nearest lock. **This is the seed of `sensorium.ts`** ↓.
[ ] `sensorium.ts` — GENERALIZE `radar.ts` into multi-sense perception: vision/hearing/
scent as additional "senses" (each range/cone/falloff + sensitivity), **line-of-sight**
gating, and **last-known-position** memory when a track is lost. Becomes the shared
sensorium for ALL AIs (turrets, bipeds, vehicles), not just radar. Keep the pure/tested
discipline; `Radar` is the first sense. (LOS predicate from the bridge.)
[x] HUD radar traces — DONE, and blips land ON their targets: the HUD projects onto its
OWN geometry rather than re-deriving a projection. Cockpit/VR = ray from the eye through
the target intersected with the HUD quad (the combiner glass), done in the quad's local
space; chase = Babylon's own `Vector3.Project` mapped into the flat overlay's rect. Flat
path measured pixel-exact (errPx 0). Locked traces get a white stroke + translucent
faction fill. See `b3d-hud.projectWorldToHud`.
[ ] HUD radar POLISH (deferred, from the live pass):

- **Pin radius / cutover** needs tuning — where a contact stops being drawn on-glass
  and pins to the ring (`HUD_PIN_RADIUS`, and the |u|,|v| ≤ 1 test). Currently it pins
  the moment it leaves the glass, so contacts just off the HUD snap to the ring.
  Consider pinning at a conical angle that sits comfortably INSIDE the rendered view
  rather than at the glass edge.
- **Lock progress**: `locked` is drawn, but `lockProgress` (0..1 acquisition ramp) is
  not — worth a closing bracket / building-lock cue.
- Cockpit quad orientation (local +X/+Y → viewBox, DOUBLESIDE facing) confirmed good
  by eye; if a mirrored axis ever shows up, that's the suspect.
  [ ] `npc-ai.ts` — strategy selection + per-strategy `step → ControlInput`. [later,
  see `AI-DESIGN.md`]

### Components (bridges)

[x] `b3d-destroyable` [MVP] — bridges a `CombatWorld` entry to a placeholder cube;
`.damage(n)`, death outcome + `destroyed` event, floating-origin via addOriginListener.
`<tosi-b3d-destroyable>`. (CombatWorld lives on B3d, ticked each frame.)
[x] `b3d-warhead` [MVP] — DONE (v0.4.0): `detonateWarhead` gathers scene destroyables,
LOS raycast, AOE falloff, **outward-rippling shockwave** (damage staggered by distance in
step with the expanding boom), boom FX. `<tosi-b3d-warhead>`. Also fired on projectile
impact + on `deathBlast`. (Arming timer not needed — single-use payload.)
[x] `b3d` ballistic projectile [MVP] — DONE: `spawnProjectile` (drives the mesh via
`ballisticStep`, swept-collision ray, self-mesh `ignore`, floating-origin, detonates its
warhead on impact). Shared by launcher/turret/aircraft.
[x] `b3d` guided projectile [MVP] — DONE: `spawnMissile` (seeker: `interceptLead` +
`steerToward` at constant cruise, via a `guide` hook on spawnProjectile). Fire-and-forget.
(Range/cone + 3s dwell acquire not needed for the inert-target slice.)
[x] `b3d-launcher` [MVP] — DONE: fire-rate cadence + ammo `Resource`, muzzle offset,
`fire()` (ballistic) / `fireAt()` (guided). `<tosi-b3d-launcher>`. (Windup + burst
sequence + ~0.1° jitter still TODO.)
[x] `b3d-turret` [MVP] — DONE: auto-tracking aiming platform; traverse-rate limit, range +
aim-tolerance, `smart` dial (lead + drop), can-bear armed color. `<tosi-b3d-turret>`.
(Built SELF-ACQUIRE/auto rather than view-slaved — view-slaved mode still TODO.)
[x] Guided missile flight — DONE (works in flight): inherits the launcher's world
velocity, BOOSTS (`boostTime`, 0.45s of forced forward thrust) while the seeker's turn
authority RAMPS IN (`guidance.boostAuthority`, 0 → full across the window), then guides at
full agility. Cruise is relative to the launcher (`max(speed, launcherSpeed +
MIN_CLOSING_SPEED)`) so a round can never trail whatever fired it.
[x] Missile overshoot — DONE. Boost originally BLOCKED steering outright for 0.45s, which
cost the round its opening ~50 units: it's fired along the NOSE with a lock up to 35° off
it, so it flew the wrong way, and at a turn radius of v/turnRate (~50 units at cruise 150)
it couldn't recover — it overshot and never came back. Measured nose-launched at turnRate
3: a hard gate hit 3 of 6 test geometries (missing everything past 25° off-axis), the ramp
hits 6 of 6 while still leaving the rail at 0.1° off the nose and accelerating. The "guided
rounds sag" bug that motivated the gate was really THRUST being skipped by an early return
— fixed independently, so the gate was only ever costing range.
The envelope is now pinned by tests (`b3d-launcher.spawn.test.ts`): a fast platform makes a
fast round (cruise floor) and a fast round has a WIDE turn circle, so fast + close +
off-axis is a **forced miss** — physics, not a bug to tune away. Don't "fix" a miss by
inflating `turnRate` or dropping `MIN_CLOSING_SPEED`.
[ ] Missile POLISH (deferred): consider boost ending on a SPEED threshold rather than a
fixed time, and a proportional-nav midcourse (`proNav` is written + tested, still unused —
pure pursuit is what makes the endgame overshoot a hard-turning target). Also: the
turret/launcher demos still use the legacy instant-cruise path (no accel/boost).
[ ] `b3d-shield` — Destroyable + collider that spatially blocks; recharge; links. [later]
[ ] `b3d-melee` — active-window collider, cycle-time sequence (sustained vs
glancing), owner-friendly. [later]
[ ] Flame thrower — SHELVED.

## AI

Spec'd in **`AI-DESIGN.md`** (sensorium → alertness → skill; hierarchical
strategy selection; factions; "artificial stupidity" philosophy). **Deferred past
the MVP** — the vertical-slice targets are inert cubes.

[ ] Detectable (radar profile, visible profile, audio profile, smell profile)
[ ] Sensorium (generalized concept of senses and radar, has radar, vision, audio, and scent sense that have sensitivities, ranges, and these can vary by dot product with local direction vector)
[ ] AI Biped (pathfinding, awareness states, combat behavior)
[ ] AI vehicle controllers (aircraft, car, boat — follow waypoints, pursue/evade)
[ ] AI turret (acquires targets via Sensorium, leads shots)
[ ] Behavior trees or state machines for AI decision-making

## 0.7.0 — the terrain system (the minor this is being held for)

v0.6.2 shipped the _shading_ and _shaping_ halves (biome ladder, provinces,
`landform`). The three pieces below finish the system, and they share one
theme: they all want to act **per terrain tile**, not per fragment.

[ ] **Tunnel ENTRANCES — paused, experimental** (2026-08-13). Interiors work; the
mouth doesn't, and the reason is conditioning rather than tuning: an SDF tube meeting an
arbitrary heightfield has no well-defined boundary where the two run nearly parallel, so
every boundary-side fix (rim collar, flange, probe depth, carve-derived mask, footprint
mask) traded one bad crossing for another. Tonio called it: stop spiralling, mark it WIP.
Resume from the DIRECTION that was working — author the surface where a tunnel meets it:
`landform.gulley` (forced channel + predictable cliff) and `landform.cover` (forced ground
over the run so the tube surfaces exactly once). Both are built and tested; what's left is
making the mouth read cleanly, ideally with the mouth cut as part of the LANDFORM rather
than discovered from the carve.
[ ] **Voxel map + topology compiler** (TUNNEL-DESIGN.md — the decided architecture).
Build from a voxel map; render topology INTO it. Order: (1) sparse chunked voxel store
keyed on sdf-lattice's global lattice, occupancy as a scalar not a boolean; (2) a
PatchField that trilinearly interpolates + low-passes it (voxel resolution and lattice
spacing stay independent — coarse voxels, fine extraction); (3) the topology→voxel
renderer: places as noise-displaced blobs, portals as grade-budgeted routed spines with
breathing radii, a locked portal as a deliberately REGULAR neck where a door mounts;
(4) CLEARANCE-BASED verification: distance-transform the voxels, flood-fill only cells
whose clearance >= the agent's radius, per agent profile (foot ~0.4m, scout ~4m) — "not
every hole serves a flyer" (Tonio). Voxel edge must be <= HALF the smallest clearance
being certified or the fill is a guess in a test's clothing. Portals then carry a
clearance beside `locked`, so Ariosto routes per agent (walkable-but-unflyable is
gameplay, not a bug), and the compiler can widen a route until a declared requirement
connects — or fail naming the narrowest point. Every declared portal traversable, every
place reachable — the cave the sim believes in and the cave you can fly through must not
diverge. Shafts are enormous or gently sloped, never narrow pipes; nothing regular
except the door necks.
[ ] **Locks must not gate simulation** (TUNNEL-DESIGN.md → "Locks, and why bypassing one
must not break the story"). Concretely, once the voxel/topology work lands: (a) live
connectivity DERIVED from the voxel map, so a player-drilled hole is just a new edge —
not a special case; (b) the event stream records the MEANS of entry (through the portal
/ around it / through a wall), because a driver reacting to a breach beats refusing it;
(c) audit that nothing anywhere gates updates on `Portal.locked` — locked is a routing
and cost fact only. Tonio calls the usual game handling "narrative vandalism" and he's
right: it makes the sim depend on the story, which is the dependency world-contract
exists to forbid.
[ ] **Tunnel patches** — a province-like field (authored the way `volcano()` is)
that punches HOLES in the terrain. The hard part: `landform` is a
heightfield hook (`y = f(x, z)`), so it cannot express an overhang or a
bore — this needs real geometry surgery on the affected tiles.
Load-bearing details to design around: - the tile pool shares ONE index buffer (`tileTemplate.allIndices`) across
every tile; a holed tile needs its own indices, so the pool must allow
per-tile index buffers for the few tiles a bore crosses (and give them
back on recycle). - the bore walls are new geometry with their own normals/UVs — decide
whether they're part of the tile or a separate stitched mesh. - collision + the aircraft's ground ray both assume "terrain is a
heightfield below you"; a tunnel breaks that assumption for anything
that raycasts down. - LOD: what happens to a hole at a coarser tile level (fill it? force the
fine level near a portal?).

[ ] **Terrain decorators** — scatter meshes (rocks, trees, grass) over terrain
under a BUDGET. Precedents to reuse rather than reinvent:
[ambient-budget](src/ambient-budget.ts)'s allocator (competes for one pool,
switches OFF rather than thinning into a lie), [b3d-library](src/b3d-library.ts)
for the source meshes, [prefab](src/prefab.ts) for naming. Design notes: - placement from a density FIELD `(x, z) => 0..1` composed the same way
`provinceField` and slope profiles are — and it should read the biome
(no trees on the dead band, kelp only below the surf line). - thin instances for count; the budget decides how many, the device tier
decides the budget. - they live and die with their TILE (spawn on fill, release on recycle), so
the floating origin comes for free.

[ ] **Tile patches** — swap authored tiles into the terrain lattice: city
grids, building interiors. This is the "[unified tile substrate](memory)"
idea made real — heightfield terrain and modular authored content meeting
at the tile level. The composition Tonio described: `pad()` a plateau with
a landform, then lay a grid of city tiles on it, so a city is
(flat ground) + (tile set) rather than a bespoke mesh. - the patch owns those tile slots: the streamer must place authored tiles
instead of generating them, and blend the seam at the patch edge. - interiors imply the tile is a VOLUME, not a surface — same tension the
tunnels raise, so design the two together.

## Asset Management

[x] b3d-library: LoadAssetContainer-based parts catalog with type registry and hierarchical mesh picker
[ ] Tile map component consuming libraries by type
[ ] Decorator component (place library items on terrain)
[x] **Centre-of-gravity node convention — engine support** (2026-08-11). Root origin =
centred + grounded stance point; a `_centerOfGravity`-suffixed child declares the flight
pivot. `model-transform.findCenterOfGravity`/`applyCenterOfGravity`;
`b3d-aircraft.setupMesh` sets the control-node pivot (level attitude ⇒ inert, parking
unchanged; no marker ⇒ prior behaviour). Unit-tested. Follow-ups: chase camera could
anchor to the CoG marker; `b3d-car` could use it for weight-transfer feel someday.
Validate against the updated scout once its CoG empty lands in test-3.glb.
[ ] Aircraft: auto gear retract/extend using the model's gear AnimationGroups (scout has
them as of test-3.glb) — retract on takeoff past a height/speed gate, extend on approach.
[ ] **Terrain self-shadowing (Tonio, terrain demo 2026-08-11).** NARROWED live: the
aircraft DOES cast onto terrain (library meshes register as casters fine); what's
missing is terrain-on-terrain — tiles are receivers but apparently never join the
caster list (or activeDistance 80 excludes them). Check the sun's scene-registration
path for tile meshes; mind the CSM cost of 160 tiles as casters (maybe casters =
only the N nearest tiles).
[ ] **Aircraft stuck after a gentle slope contact.** A sub-crash-speed, roughly-level
first contact on a hillside registers as a LANDING (correct per predicate — Tonio's
crash probe showed crashed:false) but then feels like being welded there. Decide the
escape: verify VTOL throttle-up genuinely lifts off a slope (ground clamp may be
re-snapping), and/or steepen the landing gate so slopes > ~15 deg can't be "landed
on" at all. Ask: does full throttle free you when stuck?
[ ] Terrain self-shadowing — SHELVED (Tonio, 2026-08-11): the plane casts onto terrain
fine; terrain-on-terrain at kilometre extents likely needs screen-space shadows or
similar, not bigger CSM buffers. Revisit with the M5 Max budget in mind.
[ ] Aircraft stuck after gentle slope contact registers as a LANDING (probe showed
crashed:false) — verify VTOL throttle-up escapes a slope, else steepen the landing gate.
[ ] **Tile pop-in is too visible** (Tonio, 2026-08-12, flying the patch demo). Big tiles +
more LOD levels + a bigger pool push the rings out, but that's tuning, not a fix. The
real options, in order of honesty: (a) blend between levels over a band rather than
switching (needs the two heights, so sample the parent level too — the sampler is pure
and origin-stable, so this is affordable); (b) fade a new tile in over ~200ms
(cheap, hides the switch rather than removing it); (c) hysteresis on the split
distance so a hovering camera can't oscillate across a boundary. Measure first: a
constant pop while flying STRAIGHT is (a)/(b); a pop while circling is (c).
[ ] Waypoints beyond a radar blip: `faction: 'waypoint'` already puts a marker on the
HUD, which is how the patch demo makes its bore findable. A first-class waypoint would
add distance/altitude readout and an off-screen edge arrow — worth it once there's more
than one thing worth flying to.
[ ] **Cave lighting** (Tonio, 2026-08-13 — flying the bore): interiors are near-black, so
a tunnel is unnavigable rather than atmospheric. Three pieces, cheapest first:
(a) a togglable LANDING/SEARCH LIGHT on the aircraft (a spot parented to the airframe —
the obvious one, and it makes the cave readable from any angle);
(b) LUMINOUS materials — the biome shader already has an emissive path for lava, so a
`glow` term keyed to the interior flag would give bioluminescent/mineral walls without
new lights; (c) small local point lights placed by the patch (or later by the topology
compiler at places), budgeted like b3d-ambient — Babylon caps lights per material, so
this needs a nearest-N policy rather than "one per chamber".
[ ] **The mouth SEAM is ugly and abrupt** (same flight): the tile hole is quantised to
quads while the walls stop at the ground plane, so the lip is a stair-step. Options: let
walls extend slightly ABOVE the local surface to form a rock lip that covers the tile
edge; or blend the mask over a band instead of a hard cut; or force finer tiles right at
the mouth (the refine machinery is already there — this is a smaller `level` on a small
footprint around the opening).
[ ] **`grossScale`/`detailScale` are wavelengths in disguise** (Tonio, 2026-08-13): they're
1/metres, so every useful value is squashed against zero — he found 0.015 on a slider whose
MINIMUM was 0.005, i.e. the good range is the bottom 5% of the control, and 0.1 (the old
default) is already too fine to read as landscape. Proposal: add `featureSize`/`detailSize`
in METRES as the authoring front (scale = 1/size), keep the raw scales as advanced
overrides, and make the demo sliders logarithmic. Nobody thinks in reciprocal metres.
[ ] Procedural stalactites/stalagmites for cave interiors — the biome shader already
handles cave walls (interior=1 shades them as rock at any slope), so this is garnish, not
classification: instanced cones/spikes seeded from the SDF surface where the ceiling is
steep-enough-and-overhead, budgeted like b3d-ambient. Tonio raised it 2026-08-12.
[ ] Water table as a FIELD, not a constant: `waterTable` is currently one height per
world. Inland groundwater follows the land (roughly a smoothed, damped copy of the
terrain), so a per-region field would let one valley's caves flood while a highland
tunnel stays dry. Same idiom as provinceField/profileField.
[ ] Volcanism garnish: ambient STEAM over volcanic provinces (b3d-ambient family — budgeted
billboard wisps rising off live seams/pools, denser where water meets lava) and a subtle
heat-shimmer/refraction effect over open lava. Design note: query the same province +
stage math the shader uses so the garnish lands exactly on the glow.

## UI

### The first-class SVG UI surface — SHIPPED (2026-08-02), one piece provisional

A container stack that renders identically as a DOM overlay and rasterized onto a plane,
so one authored UI serves flat and VR. Built bottom-up, each layer pure-and-tested where
it can be:

[x] `flow-layout` — CSS block/inline flow, `nearestInDirection` (spatial focus nav),
`placePopup` (flip + clamp). Pure.
[x] `box` — resizable container: wraps text, becomes a scroll region, one `handlePointer`
plus focus traversal. `BoxChild.handlePointer` takes the pointer RAW and **captures**,
which is what lets a slider drag survive leaving its track.
[x] `surface` — content + overlay: cascade **menus**, and persistent **draggable/closable
panels**. (This is the "spawned sub-panels instead of cramming one panel" item below —
the mechanism now exists.)
[x] `widget-box` — the seam letting `widgets3d` controls live inside a `box`/`surface`.
They **compose rather than compete**: 94 `slider3d` uses across the doc pages made a
port a non-starter, and the protocols were already ~90% aligned.
[x] `keyboard` + `inputField` — the typing surface for a headset (no OS keyboard, no DOM
`<input>` in a session), with the **press-hold-drag accent picker**. Pure models beneath:
`key-layout` (layouts, accents, geometry) and `text-edit` (**code-point-correct** — a
naive slice splits emoji and the keyboard's own accented output).
[x] `table` + `table-layout` — sticky header, virtualized body (unseen rows cost twice on
a texture: SVG nodes AND the raster), fixed/flex columns, drag-to-scroll.
[x] `selection` — state as an **icon**, orthogonal to hover/focus. See UI-DESIGN-NOTES →
"Show selection with an icon, not with intensity".
[~] **D-pad traversal (table)** — logic pinned by 11 tests (focus escapes at both ends
rather than trapping; scrolls itself into view; pointer tap hands focus over). But
**"feels right on a stick" is UNVERIFIED** — repeat rate, one-row-per-press, and whether
the ring reads through headset optics are judgement calls needing real hardware.
[x] **`box` delegates focus INTO a child widget.** The escape contract
(`focusMove(dx, dy) → boolean`, false = "not consumed, pass it on") is now a first-class
`BoxChild`/`Widget3d` protocol: box hides its whole-child ring, seeds entry with the
direction of travel, and clears on exit. `keyboard` implements it (per-key ring,
escapes off the top onto the field) — see UI-DESIGN-NOTES → "Inner focus". Remaining:
a `table`-as-BoxChild adapter (its standalone `focusMove(dy)` needs the (dx,dy) shape),
and — as with the table — "feels right on a stick" is unverified on real hardware.
[ ] **Migrate the scene panel to `surface()`.** NOT started; `widget-box` was the
prerequisite and is done. Gated on a VR emulator because it touches the XR pick path
(`panel3d` hangs `handlePointer`/`scrollBy` off the SVG element as closures — the
documented untargetable-in-VR trap).
[ ] **Text suggestion seam — `suggest(prefix, context) => string[]`.** Pure and testable
like the other models, rendered as a strip above the keys, **tap to accept, never
auto-applied** (silent replacement of correctly-typed words is what makes phone
autocomplete infuriating — it's a product decision, not a limit). Sources, in the order
they're likely to earn their place:

1. **What the PLAYER typed before** (recency/frequency) — their character's name, save
   labels. Never in any dictionary, and the case that actually recurs.
2. Free text / chat, if it turns out to be a big share of real typing (unmeasured).
3. `world-store` entity names — deliberately LAST, and possibly never. Tonio's
   correction: a known, relevant word should be **clickable, not typed** (Ultima IV /
   Prince of Destruction keyword dialogue — see CONVERSATION-DESIGN.md), so completing
   the world's vocabulary helps least where it looked most obvious. Worse, completing
   over "keywords you've heard" converts a MEMORY mechanic into a menu.
   Swipe-to-type is the same machinery one layer on: path-matching against key centres, and
   `keyRects` already gives exact geometry. Open-domain English prediction is an explicit
   NON-goal until something demands it.

[ ] Wire `keyboard` to `inputField` focus so a panel can host a field the keyboard
targets (cross-surface focus — the `xr-frames` floating-keyboard case).

**Two lessons worth keeping** (both cost real time, both now guarded):
`svgPoint` — map client→SVG coords through `getScreenCTM()`, never
`getBoundingClientRect` arithmetic; the latter is exactly right at the authored size and
drifts as the aspect ratio diverges, so it breaks only once maximized. And a ` ```js `
block in a doc comment **is a live example that runs** — an illustrative snippet becomes
a broken page.

[x] Based on SVG texture (b3d-svg-plane + SvgTexture)
[x] Converts pointer actions on surface to SVG (supports hover, active states, enter, exit, and click events, uses rect hull for collision)
[x] Can be bound normally (live DOM SVG via selector, tosijs bindings update automatically)
[x] Has a specified update frequency, defaults to 30ms
[x] Small library of svgUiComponents — `widgets3d` (panel3d container + label/text/button/toggle/slider/list3d), coordinate-routed (panel.handlePointer, no DOM events), works as DOM overlay + in-scene/VR plane
[x] button (button3d)
[x] textInput — SHIPPED as `inputField` + `keyboard` (see the SVG UI surface section above), not as a `textInput3d` widget: it needs an on-screen keyboard to be usable in a headset, so the field and the keyboard shipped together
[x] toggle (toggle3d)
[x] slider (slider3d)
[ ] meter (meter3d) — deferred
[x] Hover/leave feedback + per-control hitTest (scroll-drag the dead space of switch/slider rows; important in VR)
[~] list3d select modes: (a) buttons [done], (b) single-select / radio, (c) multi-select / checks. **The convention is settled and implemented** — `selection.ts` (`circle`/`checkCircle` for single, `square`/`checkSquare` for multi) and `table` uses it. Still to do: apply it to `list3d` itself and bind `value` / an array. Note the rowBg highlight is NOT the selection channel — it's hover; see UI-DESIGN-NOTES
[ ] **Practices write-back: a review report must not live in `docs/`.** The pre-release-review skill says to file it at `docs/reviews/<version>.md`. In any repo where `docs/` is the GENERATED site root — this one, and every tosijs-ui doc site — the next `bun run build` wipes it. It ate the 0.7.0 report ~90s after it was written, in the same session that filed it. Ours now live in `reviews/`. Push this to `tosijs-coding-practices` (and the skill) as "file the report OUTSIDE any generated tree, and check what the build owns before choosing the path" — naming the commit range per the skill's own write-back rule.
[ ] **Four upstream issues closed — re-check our workarounds** (found by the 0.7.0 gate's 5a0 pass): `tosijs-ui#51` (dev server dies silently beside a standalone build), `#69` (site bundle written into the library `dist/`), `#70` (doc extractor silent on a truncated block), `#71` (`checkExamples` can't be told the import context). #71 is the one with a live workaround: `site.config.ts` sets `checkExamples: false` and `doc-examples.test.ts` says to delete its parse half when this lands. Deliberately NOT done during the 0.7.0 release — re-enabling the upstream guard changes build behaviour, and a release is the wrong time to find out how. Verify each fix is actually in our installed version first; a closed issue is not a shipped one.
[ ] **Popups as ADDITIONAL SURFACES, and tear-offs** (decided 2026-08-18 — see UI-DESIGN-NOTES). A popup spawns a second plane above the opener rather than being laid out inside its SVG; a tear-off promotes that plane to its own frame and stays where you put it. Supersedes the "must grow the panel's layout" constraint below: that was true of a popover inside ONE texture, and the escape is another texture on another plane. Open questions (placement, reach, per-tier surface budget, ray routing + drag capture across surfaces, flat parity) are listed in the note and want a headset, not a guess.
[ ] select3d — composite dropdown built on (b): a collapsed row showing the current value + chevron; tap discloses a single-select list3d, collapses on pick. ~~MUST grow the panel's layout (stackLayout re-flows) rather than a DOM-style absolute popover — a popover won't rasterize into the VR texture~~ — superseded: build it on the popup-surface mechanism above
[ ] Icons: consume tosijs-ui's `./icons` subpath (a clean leaf — only `tosijs` peer + pure icon-data) behind a thin local `icon(name, {fill,size})` wrapper = the single seam to later swap for a standalone icon lib with zero call-site churn. Replace the gear `⚙` glyph; chevron for select3d, check for multi-select, leading icons on buttons
[ ] SVG-native icon principle (minimise double-implementation): attributes-first (`fill`/`stroke`/`stroke-*`/`width`/`height`/`transform`) as the rasterizable baseline, CSS as a DOM-only override layer, `fill="currentColor"` for theming BUT resolved to an explicit fill before serialize (else icons render black in a texture), stacking via SVG `<g>`/`transform`/`<mask>`. Only animation + `:hover` are irreducibly DOM-vs-VR (handled by the texture re-render / pointer-routing layer, not the icon lib)

### XR spatial panels (placement / clipping)

[~] **Spawned sub-panels (popMenu-style) instead of cramming one panel.** The MECHANISM now exists — `surface.openPanel` / `openMenu` give exactly this (cascade menus, persistent panels near the trigger). What remains is adopting it: the scene panel still cannot use it until the `surface()` migration lands, and `select3d` still grows the stack in place. Disclosure
controls — `select3d` dropdowns, submenus, pickers, confirmations, and eventually the
perf-stats readout — should open a SEPARATE panel (a child panel spawned near the
trigger) rather than re-flow the parent panel's layout. This **revises the `select3d`
note above** (grow the stackLayout in place): growing works, but a fresh panel reads
better and scales. Rationale: **in XR we own the ENTIRE canvas** — unlike a web app
boxed into a viewport, a headset can float as many panels as the space affords, at
comfortable depths/angles, so spatial UI can be **first-class** (menus that live in the
world, not stacked in a scrollbox — something web apps can only dream of). Model it on a
`popMenu`-style API: a control requests a sub-panel; a panel MANAGER spawns it (anchored
to the trigger's frame/position, offset so it doesn't occlude the parent), routes
pointer/gaze to it, and disposes it on pick/dismiss. Works flat too (the sub-panel is
just another overlay). Ties to: the notification/toast panels (same spawn → gaze →
dispose lifecycle), `frame-panel` anchoring, `select3d`/`list3d`, and the reticle/gaze
work. Log the UX decisions in UI-DESIGN-NOTES.md as it firms up.

[ ] **Radial menu — a standard "spawn a wheel that takes over a stick" primitive.**
`spawnRadialMenu(items)` pops a ring of choices and temporarily **captures the left OR
right stick / d-pad** (the direction picks a wedge; release/confirm selects). First use
case: **weapon selection** (guns/missile/bomb/…), so we don't burn a face button per
weapon. Must work in BOTH modalities the same way: **glass overlay = press-and-drag**
(touch vector → wedge), **VR = press-and-stick** (thumbstick vector → wedge). Because it
temporarily commandeers an input axis, it belongs in the input/controller layer, not just
UI. Likely the general model for **select menus / disclosure** too (a select3d could open
as a radial in VR). Shares the spawn→pick→dispose lifecycle with the sub-panels item
above; log UX in UI-DESIGN-NOTES.md. (Surfaced wiring the aircraft weapons — 3 weapons
already strain the face-button budget; see [[control-conventions-gtav]].)

[x] Enter VR button GROUPED next to the gear in a top-left toolbar (not a panel row — a panel row scrolled/clipped in the library demo's long list, and a separate button makes VR availability obvious). Gear top-left so it clears demos' top-right text overlays. `panel3d.scrollBy`/`scrollable` enabler added.
[ ] `toolbar3d` widget: a widgets3d row that lays out a series of buttons in a SINGLE row, equally sized. (Emoji work as button glyphs in SVG text — rasterize in modern browsers — but can't be recolored/themed; use SVG paths for themeable icons.) First use case: the **sound demo** wants a play/stop toolbar (currently separate button rows).
[x] Thumbstick scroll on pointed-at VR panels — DONE: per XR frame, a controller ray-hit on the scrollable panel routes that stick's Y → `panel.scrollBy` and withholds that stick from locomotion. `_attachXrPanel` exposes plane/scrollBy/scrollable. (Needs headset verification; SCROLL_SPEED tunable.)
[x] NPC nameplates render in NON-VR too — DONE: `attachFramePanel` gaze-reveals off `scene.activeCamera`; a general `_setupNameplates` manager creates/updates them in flat AND XR (out of the XR-only path). (Other xr-frames spatial UI can follow the same pattern.)
[ ] Body-anchored panels clip into scenery — the quick-access (waist/holster) panel is often BELOW the ground. Move panels CLOSER and make them SMALLER so they sit within arm's reach where scenery is less likely to intrude (subtends the same visual angle, less prone to clipping). Tune the `body`-frame anchor presets (`waist`/`left-shoulder`/`right-shoulder`) and default panel width in frame-panel/b3d-panel.
[ ] Optional "strict overlay" mode for panels that must NEVER clip: draw on top via a higher `renderingGroupId` + per-group depth clear (cheap — a depth clear + redraw of just the panel meshes, NOT a full second render pass) or `material.depthFunction = ALWAYS`. Longer term `XRQuadLayer` (compositor layer) is the true-overlay path (no clip, no render-scale blur) — see UI-DESIGN-NOTES.md. Keep this opt-in; closer+smaller handles most panels for free.
[ ] Reticle is the EXCEPTION to fixed-distance panels: raycast forward from the eye/controller, place the reticle slightly NEARER than whatever it hits (or at the max raycast distance when it hits nothing), and scale it down with distance NON-proportionately — roughly HALF size at max range (so it stays legible up close and doesn't shrink to nothing far away). Lives on the `face` frame today; needs per-frame distance+scale driven by the pick. DECIDED: billboard toward the eye by default (reads as a flat disc). Configurable attributes: (a) align-to-surface-normal (tilt the reticle onto the hit surface for a laser-dot feel) and (b) distance-from-hit offset (how far short of the hit point to sit).

### Notification / toast system (panel-based)

[ ] In-scene notification system built on the spatial panels: push the user a short message that appears as a panel slightly BELOW center view (comfortable read-down, doesn't block the horizon), registers when the user LOOKS RIGHT AT IT (gaze DWELL — decided; must hold gaze briefly so a message isn't dismissed by an involuntary glance before it's read; experiment with the dwell duration to tune the annoyance factor), then FADES AWAY once acknowledged by that dwell (or times out if never looked at). API idea: `notify(message, opts)` → transient `frame-panel` on the `face`/`neck`/`body` frame at a below-center anchor; gaze-to-dismiss with fade; queue multiple so they don't overlap. Works flat too (below-center overlay). Note the driver-decoupling rule: the SIM emits events, a driver/UX layer decides to notify — the notifier is a UX concern, not narrative.
[ ] First test case for the notification system: on FIRST XR entry, show "Look up to exit VR and access options" — this both exercises the notify() path and teaches the look-up gesture (implies an ABOVE-center exit/options panel to pair with the below-center notification; ties to the existing Exit-VR affordance).

## Terrain

[ ] LOD Management
[ ] TILE-BASED terrain / levels (direction note: considered MORE PROMISING than the heightfield approach above). A discrete-lattice generator, distinct from the noise heightfield: - LATTICE: specify the cell type — CUBIC (square/cube cells) or TETRAGONAL (triangle/tetrahedral cells). The absolute-minimum tileset is a single "square" (cubic) or "triangle" (tetragonal) unit mesh. - TILESET: one or more unit meshes (unit-square or unit-triangle meshes). Each tile carries constraints/metadata: adjacency rules (which tiles may neighbor on which face/edge — this is where DOORWAYS / connectors are specified, so passages line up), and ORIENTATION BIASES (this tile prefers to face up / down / uppish / downish / sideways). Think modular kit / Wave-Function-Collapse-style adjacency, not noise. - GENERATION: procedurally fill a CONTIGUOUS VOLUME (a classic 2D maze, or a 3D maze/level) from the tileset using the MINIMUM number of mesh tiles that satisfies the constraints. Seeded / deterministic (MersenneTwister) like the rest of the world sim. - BUDGET: render a low-resolution volume as a level or landscape within a tile/instance budget. - LOD: provide low-LOD meshes per tile so distant regions are cheap (same streaming discipline as the heightfield tiles).
Ties to Asset Management: "Tile map component consuming libraries by type" and the seeded Decorator. A tile's local decoration + collisions come from its mesh.
[ ] UNIFY heightfield + tile systems AT THE TERRAIN-TILE LEVEL (the key architectural bet — the two systems share one streaming/LOD/budget substrate, `terrain-grid.ts` math stays common; only per-tile CONTENT differs). A given terrain tile can render as: (a) a heightfield patch, (b) a set of lattice tiles, or (c) a COMBINATION — e.g. a city that folds seamlessly into the surrounding landscape (tile blocks near the ground plane, heightfield further out, blended at the seam). - HEIGHTFIELD-DEFORMED TILES: offset a tile mesh's internal vertices by the heightfield (ideally a VERTEX SHADER so it's cheap and LOD-friendly) so tile content conforms to the terrain contour instead of sitting on a flat pad. - CONTENT PATCHES as a cheaper decorator: instead of scattering thousands of individual tree/shrub instances, author a "forest" as a single square tile whose mesh already contains many tree meshes; drop it in (substitute for, or lay on top of, the terrain polygon) with its vertices offset by the heightfield. GATE on slope — only place/level-conform where the polygon is reasonably LEVEL; steep tiles fall back to bare terrain or a different tile. This is much cheaper (one mesh/instance per patch vs. per-plant) and is the preferred bulk-vegetation path over the per-instance Decorator (keep the Decorator for sparse hero props).
[ ] Decorator (see Asset Management): given a COLLECTION of objects (e.g. from a b3d-library by type) and a BUDGET (count / density), sprinkle instances across the landscape SEEDED / DETERMINISTICALLY (MersenneTwister + the terrain seed) so the same seed always yields the same scatter — reproducible, and streamable per LOD tile (a tile can regenerate its own decorations on demand). Placement rides the height field (place-on-surface, align to normal or up), and should respect the height profile / slope (e.g. no trees on cliff faces, denser in valleys). Budget is spread across tiles, not global-at-once, so it works with the streaming terrain.
[ ] Local terrain deformers (e.g. blast craters or leveled areas for city placement)
[ ] Localized deformer / PROFILE applied to a region or path (the global height profile's local sibling): blend a local height override into the field within a footprint. Region form → PLATEAUS / leveled build pads (flatten to a target height with a falloff skirt). Radial form → CRATERS (a depressed bowl with a raised ejecta RIM, optional central peak for big impacts) — authored, and also DYNAMIC at runtime (an explosion/impact spawns a crater deformer; ties to Combat warheads). Path/spline form → ROADS (flatten a corridor of some width along a spline, banking on curves) and RIVERS (carve a channel below the surrounding height, following downhill). Each deformer supplies a mask/weight (0..1, with edge falloff so it blends seamlessly) and a target-height function; `heightAt` composites them over the base noise+profile. Must be deterministic and evaluable per-tile/per-vertex so it works with streaming LOD (a tile samples only the deformers overlapping it). Decorator + collisions should respect these (no trees in the river, road stays clear).
[ ] Height PROFILE concept: a generalized function mapping the normalized [0,1] height field → a shaped value. LINEAR is the default; other profiles carve canyon regions, mesas/plateaus, etc. Applicable to BOTH the gross noise layer AND the detail noise layer, independently. This formalizes + exposes what `grossFilter`/`detailFilter` (GradientFilter / PiecewiseLinearFilter, applied in `heightAt` before amplitude) already prototype — turn them into authorable/selectable profiles with named presets (linear, canyon, mesa), settable per layer via attributes.
[ ] Allow much SMALLER noise scale values on both layers: lower the min for `grossScale` (demo slider min is 0.005) and `detailScale` (min 0.02) so you can reach very low frequencies = very LARGE features (broad canyons, continent-scale mesas). Widen the attribute/slider ranges downward.
[ ] Increase VERTICAL scales: raise the range (and likely defaults) for `grossAmplitude` (default 8) and `detailAmplitude` (default 2) so terrain can be much taller/deeper — dramatic canyon depth and mesa height. Pairs with the profile work (a canyon profile with too little vertical scale reads flat).

## Effects

[ ] **Custom cloud meshes** (Tonio) — let `b3dClouds` use one or more MODELED meshes instead of
squashed spheres (`meshName: 'cumulus,cirrus'`, random pick per blob for variety). Mechanism:
resolve the template(s) from a loaded GLB/`b3dLibrary` by name, `createInstance` per blob (shared
geometry, cheap), keep the recycle/coverage/shadow logic. The one real wrinkle is ASYNC: the GLB
may not be loaded when clouds build, so it needs the same wait-for-mesh pattern the library
consumers use — deferred because that + no way for me to eyeball it = don't bolt it on blind.
[ ] **Clouds: verify the new pass in VR/flat** (Tonio) — lit (dark undersides), `selfIllum` floor,
`coverage` dial (wisps→thunderheads, live), `castShadows`. All shipped but UNSEEN by me. Also: soft
transparent shadows — a cast cloud shadow is currently an opaque-ish ellipse (Babylon needs
`transparencyShadow`/blur on the generator for a soft one); tune if it reads hard.
[ ] **HUD altitude bar — Manta-style, ground-referenced** (Tonio). The HUD altitude meter is
currently a 0..1 arc (`setMeter('altitude', level)`). Replace/augment with a BAR read against the
terrain, not against a fixed 0..ceiling: plane at 100 over ground at 30 ⇒ bar blank (or a distinct
colour) 0–30, filled 30–100, empty 100–ceiling. So the coloured band literally shows your clearance
above the ground below you. Needs ground height under the aircraft (sample terrain / raycast down)
fed to the HUD alongside altitude+ceiling. **Manta twist**: the vehicle is a flying SUBMARINE — when
altitude is sub-sea-level, FLIP the bar (it grows DOWN from the top = sea level, to max operating
depth). And consider allowing depth/altitude beyond max, where the bar goes RED. New meter render in
`hud.ts` (the arc → segmented bar), new inputs from `b3d-aircraft`/the platform. Visual + untestable
by me, so its own focused pass.
[ ] **Fog FLOOR to mask pop-in** (Tonio) — clouds "flicker like hell" as they recycle in at the
`spread` distance, because there's little fog out there to hide the pop. The fix is a scene-level
principle: **guarantee the base fog fully obscures at (or before) the camera's far clip / the recycle
distance**, so anything appearing that far out is already white and the pop is invisible. Same trick
masks terrain-tile LOD pop-in. Fog is EXP2 (density only — start/end are ignored), so this is a
minimum `fogDensity` derived from the far distance (e.g. density ≈ 2.2 / farDistance for ~99% at that
range). Probably belongs in `b3d-fog`/atmosphere as a `floor`/`maskDistance` option, or `b3d`
deriving it from the active camera's `maxZ`. Cheap; visual to tune.
[x] **Water + terrain** — DONE. The terrain mesh is a FLAT heightfield (the `cylinder` surfaceType
is only the noise SAMPLE space, not curved geometry), so a flat water plane fits fine. Added a
`baseHeight` offset to terrain (hoisted, ~free per sample); the demo sets `-100` to centre the
±-height field on 0, and a big `b3dWater({ y: 0, waterSize: 6000 })` floods the valleys. No follow
needed: the floating origin keeps the CAMERA near world-origin, so a plane centred there is always
under you — reads as a stationary endless ocean for free. (A truly unbounded world that outruns a
6000 plane would still want the [[follow]] water below, but the rebase keeps the demo covered.)
[ ] **Water that appears stationary (infinite ocean)** (Tonio). `b3d-water` is a finite plane with
no follow — fly far and it's left behind (which is why the terrain demo has NO water yet). Add a
`follow` mode: recenter the plane's x/z on the active camera each frame AND offset the wave/UV by
the camera's world position, so the mesh rides with you while the SURFACE detail stays put — it
reads as a stationary infinite sea. Floating-origin: recentre from the shifted camera each frame, so
a rebase is naturally absorbed. THEN add water to the terrain demo. Deferred: needs the b3d-water
feature + a visual check I can't do.
[ ] Cloud Layers
[ ] God Rays (through clouds and from water) — the sun-shafts-as-additive-panels item
[ ] Ambient (weather, bubbles, wind, snow, lightning) — bubbles/motes/leaves SHIPPED (b3d-ambient); remaining: weather tie-in via the wind field, lightning
[ ] Lava
[ ] Improved water
[x] Under Surface of Water (underwater tint/fog effects)
[x] Particle Effect (b3d-particles)
[ ] Explosion (particle effect)
[ ] Thruster (particle effect)
[ ] Smoke (particle effect)
[ ] Fire (particle effect)
[x] Model exploder (b3d-exploder)
[ ] Ragdolls (maybe never, just have death animations)

## Materials

[ ] Support for the materials examples
[ ] Terrain material (per Gemini biome discussion)
[x] SVG Materials (SvgTexture + b3d-svg-plane component)
[ ] Spacebox -- like skybox but with one or more stars and outer space look.

## UI Stuff

[x] Bound SVGs that are rendered to texture and then have events routed to them (b3d-svg-plane with pointer event pass-through)
[ ] SVG Radar (lemma of above)
[ ] Concept of lockon
[ ] Video texture / Mosaic player

## Audio Stuff

[x] Positional Sound (b3d-sound)
[ ] Music Manager
[ ] Speech synthesis

## Space Stuff

[ ] Gas giant material
[ ] Asteroid belts
[ ] Moons
[ ] Space Stations

## Utilities

[ ] Save / Load
[ ] Character Customization

## Network Multiplayer

[ ] basic state sync within contexts (e.g. same locale)

## Inventory

[ ] Inventory Management
[ ] Modify player appearance based on gear
[ ] Pick Stuff Up
[ ] Drop Stuff
[ ] Buy / Trade
[ ] Money

## Infrastructure (Done)

[x] sceneReady/sceneDispose lifecycle for all components
[x] Input abstraction (ControlInput, InputProvider, CompositeInputProvider, inputFocus)
[x] Collision detection system with convention-based collider shapes
[x] XR controller input via observable pattern
[x] Import-style demo code (rewritten at runtime by tosijs-ui)
[x] WebXR built into b3d: on by default when supported (templated Enter/Exit-VR button), `no-xr` opt-out, `setupXr` full-override hook, default orbit camera with elevation/zoom limits, default locomotion (left-stick walk, right-stick fly + head-pivot smooth turn), floor-anchored rig
[x] Dual-presence scene panel (`scenePanel` hook): gear-toggled DOM overlay on flat screen, head-anchored fade-in widgets3d panel (with Exit-VR button) in immersive VR — same widget definitions, same reactive bindings, both surfaces
[ ] XR camera additional modes: pin to a named transform / follow a controllable (beyond the default free-locomotion rig)
[ ] AR passthrough: an `ar` (aka `passthrough`) boolean attribute on b3d. When set, Enter XR requests session mode `immersive-ar` (not `immersive-vr`); on AR entry make the scene background transparent (scene.clearColor alpha 0 + canvas/engine alpha) and hide the skybox + the XR grid floor so the real world shows through; restore all on exit. Gate the gear button label ("Enter AR") + availability on `navigator.xr.isSessionSupported('immersive-ar')`. Add a simple AR demo on the b3d page (a few objects floating in your room). Approach is known/moderate; needs a passthrough-capable headset (Quest) to verify — hence deferred rather than built blind.

## Documentation, Examples & Tests

[ ] SCENE TORTURE TEST (demo + ideally an assertable test via the doc-system's
in-browser harness / haltija). Place a bunch of stuff in the scene initially,
THEN add more after sceneReady — at intervals, in DIFFERENT orders — and verify
each addition is fully wired: casts + receives shadows, appears in reflection
probes, collides, gets its `auto` quality budget, etc. Then REMOVE stuff and
verify teardown: shadow casters/receivers, reflection render lists, colliders,
observers, GPU resources all released — no leaks (spawn an enemy → it
shadows/collides → despawn → nothing left behind). This exercises the
scene-registration (`register`/`addSceneListener`) + dispose paths and the
attribute-drain/sceneReady timing that just bit the b3d/terrain demos. Would
have caught the "notify descendants before their attributes drained" bug.

[ ] As much test coverage as possible (fly-by-wire, perlin-noise, gradient-filter, surface-sampler, resource, destroyable, warhead; auto-run on build)
[ ] One SIMPLE (non-trivial) demo for EVERY component that makes sense — a `/*# */`
doc example that actually exercises the component, not a stub. AUDIT which
components lack a real demo and fill the gaps. (The combat components —
b3d-destroyable/warhead/launcher/turret + b3d-controller — now each have a real,
interactive demo; re-audit the rest.)
[ ] Documentation for each component

## Ariosto

[ ] Dynamic mission / quest system
[ ] Faction Support
[ ] World Graph Support
[ ] Story Atoms
[ ] Narrative State

## Jolt Phyics

[x] Minimal V2 compatible layer for Manta
[ ] Complete V2 compatibility and publish as separate library
[ ] Prestep and CCD support
[ ] Add ability to offload work to rust for tauri apps.

## Controllers

[x] Gamepad support for all controllers (VirtualGamepad abstraction)
[x] Gamepad control should work the same way in XR / mouse+keyboard / Gamepad / Touch (MappedInputProvider + GamepadSource)
[x] Map keyboard / mouse to standard gamepad (KeyboardGamepad)
[x] On-screen "glass" gamepad for touch contexts — `glass-gamepad.ts` (`<tosi-b3d-gamepad>`), mounted via the `gamepad` attr; a `controls` spec (`"left_stick,right_trigger"`) shows only the pieces a scene uses.
[x] `B3dController` (`<tosi-b3d-controller>`) — casual access to the unified controller (keyboard/glass/hardware/XR) via a `drive(input, dt)` callback, no `inputFocus` boilerplate. Plus **scene input focus**: with several live demos on a page, only the hovered/pressed one consumes shared input.
[ ] Offer standard way of displaying game controls and mappings, and editing mappings (glass gamepad shows the layout; live remapping/editing still TODO)

## Workflow

[ ] Blender addon that allows convenient editing of custom properties that we consume
[ ] This would automatically convert \_xxx into the corresponding custom properties when selected
[ ] We would need to make corresponding changes to our import code

## Bugs

[x] Particle demo does not load
[x] Sound demo needs hum.wav asset (fixed)
[x] BIPED demo falls through space — FIXED. Root cause: `B3dGround` never set `checkCollisions`, and the biped's grounding probe/`moveWithCollisions` only see collidable meshes → down-ray missed → perpetual fall. Fixes: B3dGround now sets `checkCollisions = true` (+ a `size` square shortcut; trigger demo's ignored `diameter:20` → `size:20`), and the biped has a `groundY` hard-floor safety net so it can't fall through the world even on GLB scenes whose floor isn't `_collide`-named.
[x] Trigger demo pov character falls through the world — FIXED (same root cause as the biped fall-through above). NOTE: the "clone left behind" part is a separate issue (see VR frozen-clone below) — re-verify.
[ ] In VR the b3d (main) demo often leaves a frozen clone behind when you start walking
[x] b3d demo: time-of-day slider does nothing in XR until you EXIT — FIXED (confirmed in headset). CONFIRMED via the user's data: in XR the slider WRITES demo.time (data current) but the sky VISUAL is frozen; on exit the stranded render fires and the change takes effect. The TOGGLE (showColliders) works in XR — so bindings DO flush via the pump; it's SKYBOX-specific. ROOT CAUSE: tosijs render is a per-element flag (`if(!this._renderQueued){...requestAnimationFrame(render)}`); the skybox's `realtimeScale` setInterval perpetually re-queues render(), so a render is always stranded when the session suspends window.rAF → `updateSky()` (gated behind render()) never runs in-session. (`await updates()` before entry can't help — the interval re-queues immediately.) REAL FIX: drive `updateSky()` from the skybox's per-frame `onBeforeRenderObservable` observer (fires in flat AND XR), gated on a timeOfDay change — bypassing the rAF-batched render() for the sky visual. (`await updates()` before enterXRAsync kept as general hygiene.) The stranded-render footgun is documented in CLAUDE.md + UI-DESIGN-NOTES.
[ ] Planet material seems pinched at one pole
[ ] Possible leaks in jolt plugin
[ ] Galaxy demo: star/nebula sprites don't orient to the XR camera (fine in flat). NEW CLUE (2026-07-05): changing galaxy settings WHILE IN VR rotates all billboards to face me — so setParticles(billboard=true) DOES face the XR camera when called; the per-frame update loop just isn't re-billboarding in-session. So the fix is to ensure setParticles runs/recomputes billboard every XR frame (not a globalPosition rewrite). Investigate why the registerBeforeRender update doesn't re-orient in VR. Sprites are a `SolidParticleSystem` with `billboard = true` (`setParticles()` each frame via `scene.registerBeforeRender`) + a passthrough vertex shader. SPS billboard faces `scene.activeCamera`; in XR that's the `WebXRCamera` (rig camera) whose local `.position` ≠ world `.globalPosition`. Likely fix: drop `billboard=true` and use a custom `updateParticle` that faces `scene.activeCamera.globalPosition` (XR-safe). NEEDS HEADSET to verify (don't regress the flat view).
[ ] Terrain demo: after a floating-origin recenter (`resetOrigin` → `B3d.shiftOrigin`) the scene goes chaotic and never settles. Likely the multi-entity origin generalization interacting with the terrain tile grid — a root that's shifted twice, or the camera carrier vs chase rig re-derivation. Reproduce by flying far enough to trigger a reset. NEEDS investigation + headset/flat repro. See [[floating-origin-multi-entity]].
[ ] Library demo (VR): the scrollable panel pushes up and clips the top of the Exit-VR button — STILL happening after the toolbar grouping. The scene panel's top edge overruns the enter/exit-VR toolbar (the Exit-VR button is prepended into the panel column, so a tall list shoves it off the top). Fix: give the Exit-VR button a fixed reserved slot above the scrollable region rather than making it the first scrollable row. NEEDS HEADSET.
[ ] `list3d` should be actually HIERARCHICAL: disclose/collapse container items and let you choose a container (not just leaves). Currently the library picker flattens the hierarchy (`flattenInsertable`). Needs a tree widget with expand/collapse + indent.
[ ] Gear menu + Enter-VR button shouldn't be enabled until the scene has finished loading (currently active during the load/spinner). Gate their reveal on the same `reveal()` that hides the spinner.
[ ] Particles demo: (a) can't orbit the camera in flat mode — investigate pointer interception / whether the fire mesh eats drags (alpha rotation isn't limited by the new camera clamps, so it's something else); (b) the fire at default emit size is large and the ⚙ panel overlaps it — reframe (pull camera back / offset the fire) so the panel doesn't cover it.
[ ] Time-of-day (loader) demo: add a `b3dSun` for shadows + something to cast them, and a texture on the ground plane (currently flat/untextured).
[ ] Sound demo: intermittent failure to load/play — worked after a page reload. Likely an async audio-engine / asset timing race. Hard to repro; needs instrumentation.
[ ] b3d-panel demo should demonstrate BOTH: a panel present in flat 3D and VR, AND a VR-only panel that appears only in a session — with the difference explained in the doc.
[ ] (LOW PRIORITY — don't chase hard) VRAM across demos: watch for leak signs, but entering/exiting dozens of XR sessions in quick succession is a pathological case (the Quest browser itself doesn't reliably free WebXR GPU resources between sessions). Keep baseline XR VRAM low; note leaks, don't rabbit-hole.

## Icons / spatial UI (from the review passes)

[ ] Icons proxy for in-scene/XR UI. We're using bare emoji glyphs for buttons (× close, 😎 Enter VR, 😳 VR-close) but emoji CAN'T be recolored/themed and render inconsistently. Two options: (a) pull in tosijs-ui's icons proxy (tree-shakable now) — natural fit for gaming + space constraints + SVG workflow; (b) build our OWN icons proxy in the same style but focused on our constraints and our (very different) icon set — likely better long-term. Ties into the `toolbar3d` widget (wants themeable SVG-path icons, not emoji).
[ ] xr-frames: add a demo that attaches a panel to EACH reference frame (world/rig/body/neck/eye/face/hands), each labelled with its frame name — so you can see/feel what each frame is stable against.
[ ] Spatial attachment mechanics (design: SPATIAL-DESIGN.md). Three cases: (1) attach = live parent/follows; (2) place-relative = world-offset snapshot; (3) transition = re-parent preserving world pose (elevator/ship on/off, pick up/put down). Babylon `setParent` is the transition primitive; floating-origin world-root registration must flip on transition. First step: declarative `<tosi-b3d-attach frame|to=…>` + `<tosi-b3d-axes>` (gizmo as first payload) so wrist-panel/HUD tuning is in-headset; split the transform math out pure + unit-tested. Vehicle enter/exit is an existing specialized case #3 to generalize.
[x] An xyz axis "gizmo" for reference/debugging — DONE programmatically (no asset): `buildAxes(scene)` + an `axes` boolean on any AbstractMesh geometry pins a glowing R/G/B gizmo. Still TODO: attach it (or any mesh) to an XR frame declaratively (see above).
[ ] b3d-panel demo: the VR-only `<tosi-b3d-panel>` ("VR only") reportedly doesn't appear in a session — verify it mounts (reveal:'always', eye frame) in headset; may be a panel-detection or frame-attach issue.
[x] XR rig misaligned on entry — CONFIRMED FIXED/OK (2026-07-05): frame aligned + responds to resets correctly.

## Maybe one day

[ ] Loading spinner occasionally freezes for the first frame(s) of a b3d load — intermittent, hard to repro (loaded the b3d demo 10× with no hiccup). Cause: Babylon's initial spin-up (`new Engine`, scene build, synchronous shader compile) runs as one long main-thread + GPU-process task starting at element upgrade, before the spinner's CSS `transform` animation is ever handed to the compositor, so it sits at 0°. Can't be fixed by reordering init (tried an rAF-yield before the child-build storm — no visible help, because the GPU/shader-compile block stalls the compositor too, which JS can't touch). The ONLY real fix: the spinner must already exist and be compositing in the page _before_ `<tosi-b3d>` initializes — i.e. authored into light-DOM content (or injected by the doc pre-render) and merely _hidden_ by the component on ready, not born in its shadow DOM at upgrade time. Not worth the churn unless it starts happening often.

## 0.5.0 pre-release review follow-ups (2026-07-19)

Filed from the nine-lens review. Blocker (Babylon in `dependencies`+`peerDependencies`) and
all four confirmed majors (live-debug timer leak, `prefab.ts` tests, changelog/migration note,
CLAUDE.md map) were **fixed in the release**. Two unverified-correctness findings (remains
rotation from the quaternion; underwater fog contributing start/end under LINEAR) were also
fixed. Remaining, deferred:

- [ ] **Efficiency — ambient runs `querySelector('tosi-b3d-water')` every frame** (`b3d-ambient.ts` ~681) for any non-`always` effect. Resolve/cache the water element once in `sceneReady`.
- [ ] **Dryness — `excludeFromGlow` re-implemented inline** in `ambient-leaves.ts` (~153); this release _extracted_ it as an exported helper in `frame-panel.ts`. Import and call it.
- [ ] **Dryness — soft-dot radial-gradient texture copy-pasted 3×**: `b3d-death.ts` `sootDot`, `b3d-ambient.ts` `dotTexture`, `b3d-particles.ts` `getDefaultFlare`. Extract one `softDotTexture(scene, {name, midAlpha?, size?})` — natural home `shadow-decal.ts` (already owns the black variant).
- [ ] **Coverage — spawner determinism untested & not extractable** (`b3d-spawner.ts` ~213). Extract seeded ring placement + `_prune` predicate into a pure helper and test identical-seed → identical sequence. (Also: `_prune` allocates fresh arrays every frame — prune on the spawn cadence or early-out when nothing died.)
- [ ] **Blast-radius — Jolt 1.0 → 1.1 (Jolt 5.6.0, friction model moved) not revalidated.** `jolt-plugin.ts` sets `friction/staticFriction` directly and was untouched. Run a ramp/slide/stack smoke check; retune defaults or note in the changelog.
- [x] **Efficiency — cloud-shadows per-frame full-mesh sweep** — FIXED in 0.5.0 (gated on `scene.meshes.length` change; steady state is one length compare).

### 0.5.0 fast re-run — additional follow-ups (2026-07-19)

Second (fast) review after remediation returned **GO_WITH_FOLLOWUPS, 0 blockers**. Fixed in the
release: the **42MB doc-site iife bundle no longer ships in the npm tarball** (`files` negation →
585kB), plus the fog-dispose re-enable bug (clear `_fogBase`/`_fogNow` when `<tosi-b3d-fog>` is
removed) and two dead `_savedFog*` fields. Deferred:

- [ ] **(verified major, coverage) Test the aircraft ground/crash gating.** The two in-window fixes — `pitch/roll = grounded ? 0 : input` (4ebff41) and `_hasFlown` crash-arming on `groundDist > groundClearance + TAKEOFF_MARGIN` (a49eb89) — live untested in the Babylon bridge (`fly-by-wire.test.ts` covers a _different_ pure mechanism). Extract the gating into a pure `({grounded, groundDist, groundClearance, wasGrounded, verticalSpeed}) → {stickLive, armCrash}` and unit-test both boundaries. Non-blocking (bugs already fixed) but this is the regression guard.
- [ ] **(coverage) `widgets3d-layout` no-canvas fallback untested** (`widgets3d-layout.ts:140`) — the path that runs headless. Test `measureTextWidth` returns the widest line for multi-line input and the `size*0.56` fallback scales linearly.
- [ ] **(efficiency, nit) `_reallocAmbient` calls `budgetRequest()` twice per effect** (`tosi-b3d.ts:1013`) — reuse the mapped `AmbientRequest` array. Rare path.

**Shared `tosijs-coding-practices` (practices — to promote upstream, not edited from here):** add
the map-drift gate and the mandatory-peer-dep-changelog block (both invented here, held this
release) to `practices/releasing.md`; add a gate that no release ships with an `UPSTREAM.md` row
`(unfiled)` older than one release (drafting has substituted for filing two releases running).

## Speech / voice acting

**SHIPPED (test-tier):** `bin/bake-speech.ts` bakes a `{ voice, text, direction }` manifest via
Resemble (`model: "chatterbox"`, which honours the inline `<speak prompt="…">` **acting
direction**) → `static-assets/assets/speech/` → `cdn.tosijs.net/speech` → `assetUrl('speech/<id>.mp3')`.
Content-cached by `hash(text+voice+direction+model)`, so re-runs only re-synthesise changed lines
(don't burn credits). Key from `RESEMBLE_API_KEY` (env only, never committed).

Findings worth keeping:

- **Chatterbox is stochastic**, but the synth response **returns the `seed`** — capture it for
  reproducible re-bakes (a bad roll can be re-rolled; a good one can be pinned).
- **Write directions as ATTITUDE, not VOLUME.** `quietly` / `hush` / `voice dropping` get taken
  literally and whisper over the emotion ("quietly suspicious" → a whisper). Say "pressing and
  level at full voice, an edge of threat" instead.
- Only _some_ Resemble stock voices are enabled on the account (Grant/Fiona work; most 401).
- `chatterbox-turbo` OOMs server-side; use plain `chatterbox`.

**FUTURE DIRECTION — audio → animation hints (NOT MVP; gated on the animation pipeline).** The
data to drive lip-sync + gesture cues is already available; deferred until characters/animation are
ready to consume it:

- Resemble's synth response carries `audio_timestamps` = **`graph_chars`/`graph_times`**
  (per-character `[start,end]` — a full source-text→audio map). `phon_chars`/`phon_times` (phonemes,
  for visemes) exist but came back **empty** for chatterbox — verify a model/flag, or force-align.
- **SSML `<break>` works** (scripted pauses); the pause is a gap in the timeline to hang a gesture on.
- For real **lip-sync**: **Azure Speech** is the gold standard — first-class **viseme events** +
  **55 blendshape coefficients/frame** + `<bookmark>` cue events. **Polly** has viseme + `<mark>`
  speech marks. **Local** (Chatterbox/Piper) → **forced alignment** (whisperX / MFA) recovers timing.
- Landing shape: `bake-speech` also saves `<id>.timing.json` (+ seed) next to the mp3; runtime plays
  via `b3d-sound` and drives (a) lip-sync — viseme morph if the rig has mouth blendshapes, else an
  amplitude/vowel-openness jaw for placeholders — and (b) **gesture cues** — a `<break>`/`<bookmark>`
  (or computed char-offset) fires a `b3d-biped` animation clip at that moment. Gesture-at-mark is the
  tractable half (no morph targets needed); full facial lip-sync waits on rigs with visemes.

## Demo/doc review feedback — Tonio's manual pass (2026-07-23)

### Bugs (broken — fix first)

- [ ] **ambient demo crashes the plane on contact with the water surface** ("nice reflection lol") — real gameplay bug in the ambient demo scene.
- [ ] **b3d-controller demo doesn't work at all** (tested glass + hardware gamepad; the main b3d demo works fine) — the doc-page demo is broken.
- [ ] **glass-gamepad demo**: overlay styling is unreadable + nothing to actually control.
- [ ] **cloud-shadows demo: major flickering** (and the clouds don't move — see wind system).
- [ ] **shadow-decal: projection direction is inconsistent** with the scene light / the actual shadow.
- [ ] **b3d-water demo (just added): both crates are BELOW water level** — looks wrong; reposition on the shore.

### Global demo principles ("when in doubt", applies broadly)

- [ ] Default to a **shadow-casting light + a textured/test-pattern GROUND PLANE** (textured planes catch shadows better AND are more interesting technically than a flat colour).
- [ ] Prefer **nice CDN (Kenney) meshes + textured cubes** over primitives; **never spheres**. Pick a curated set of demo meshes from the CDN.
- [ ] When a texture is needed, use **svg-texture with the Warhol-esque SVG** (see the svg-texture demo) — for objects AND ground planes.
- [ ] **Demo goes ABOVE the attributes table** (the doc-ordering rule — enforce it everywhere; loader is one offender).
- [ ] Include a **non-static object** (moving/rotating) so the dynamics are visible.

### Infrastructure to build (unlocks many of the above)

- [ ] **"Requires XR" panel + an XR-only scene mode**: if XR is available, place an explicit **Enter XR** widget front-and-centre; otherwise show "Sorry, requires XR". For XR-only demos (frame-panel, xr-frames, passthrough).
- [ ] **Surface xr-frames in flat 3D** (e.g. accessible via the gear menu) so the frame concepts are inspectable without a headset.
- [ ] **Foldable diagnostics**: every diagnostic should fold like Perf Stats (`details`/`summary` — make it a **standard widget**, ideally a sub-widget pop-up). **Retire/toggle the nameplates diagnostic** (it's literally atop every demo panel now). Leverage the same widget to make the **library demo picker** less dreadful.
- [ ] **Global WIND system with turbulence**: non-zero default wind; it tosses aircraft around a little (esp. a hovering aircraft — "flying just like bricks don't" — a hover shouldn't look rock-steady); clouds move with it (feeds cloud-shadows).

### New demos

- [ ] **mersenne-twister** (worth doing): two side-by-side 256×256 canvases, draw randomly positioned+coloured dots with `Math.random()` vs the Mersenne twister — you quickly see why RNG quality matters even ignoring crypto.
- [ ] **XR passthrough demo.**

### New features (bigger)

- [ ] **Working car** (+ ship + submarine) — likely suitable Kenney assets exist.

### Per-demo notes

- [ ] **library**: interesting lighting + test-pattern ground.
- [ ] **loader**: demo above the attributes table.
- [ ] **b3d-light**: boring; textured cube (not a sphere), a nice CDN mesh.
- [ ] **particles**: textured plane (nice old demo otherwise).
- [ ] **b3d-shadows**: upgrade the caster (nice mesh > textured cube w/ random orientation > textured cube > cube > sphere); add a **moving/rotating** object so the shadow visibly changes.
- [ ] **skybox**: textures + no spheres; make the time change **really fast** (≈1 min = 1 day).
- [ ] **water**: fix cubes-below-water; textures; some motion.
- [ ] **b3d-fog**: add textures (otherwise nice).
- [ ] **cloud-shadows**: fix flicker; moving clouds (wind); textured ground; slightly less cover; bigger ground plane.
- [ ] **shadow-decal**: fix projection direction; textured ground.
- [ ] **atmosphere**: demo with a fog-thickness picker + hue/saturation sliders.
- [ ] **ambient-leaves**: demo or link; add a **spawn HEIGHT** attribute (in the main demo they spawn above the treetops).
- [ ] **b3d-utils / material conventions**: demo loading a cube with the standard (svg) texture, showing each name-suffix tag working, with **floating panels above them** explaining each tag's config; textured ground.
- [ ] **spatial-transform**: platform a biped can step on → it rises a level → they step off; plus a laterally-travelling platform (needs the Babylon attachment bridge — bigger).
- [ ] **frame-panel / xr-frames**: a demo showing **all the pins** (XR-only + the "requires XR" panel). xr-frames ≈ the same demo as frame-panel; the XR-only notes apply here more.
- [ ] **hud (driver) / b3d-hud**: HUD demo = an aircraft defaulted to **cockpit view**; make `b3d-hud` the destination link for the underlying HUD pieces.
- [ ] **radar / b3d-radar / b3d-radar-blip**: a demo, or **link to a page that has one** (the link-to-a-demo pattern is a good general fix for demo-less pages).
- [ ] **b3d-input-focus**: **two live scenes side-by-side** (or two `<tosi-b3d>` in one demo) with a simple biped in each, and you control one or the other.
- [ ] **gamepad/input demos** (keyboard/hardware/xr-gamepad): at least **link to a working demo** (b3d-controller once fixed, or the main b3d demo).

## Local-only asset browser (nice-to-have)

A filterable asset browser for the static-assets library (filter by path/filename, type, …),
**local-only** to respect the Kenney (and future) license: the browser is a discovery/bulk surface
the license cares about; a demo referencing one model via `assetUrl` is not. Design:

- **Local-only gating:** a component/page runtime-gated to localhost (`/^localhost$|^127\./.test(location.hostname)`);
  publicly it renders a "local-only" notice and touches no assets. Clean upgrade (so the page isn't
  even in the public build/nav/sitemap): a small tosijs-ui doc-metadata flag like `local: true` to
  exclude a page from the published output — file upstream, not required for v1.
- **Reads from** the local `../static-assets` tree / its `metadata.json` manifest (works offline).
- **The 3D grid — the scarce resource is the WebGL CONTEXT, not RAM.** Each `<tosi-b3d>` is its own
  Babylon Engine = its own WebGL context; browsers cap live contexts at ~8–16 and creating/destroying
  them is slow + triggers context-loss GC. So **NEVER spin up/discard a b3d-scene per grid cell**
  (virtual-list would exhaust contexts in a couple of scrolled rows). Two viable shapes:
  - **(recommended) Thumbnails + a single detail scene:** pre-bake a turntable/hero snapshot per asset
    (add it to the static-assets Blender pipeline alongside fbx→glb), grid = virtual-list of `<img>`
    (scales to Kenney's ~4,800 models, instant filter); ONE live `<tosi-b3d>` only on click-to-inspect,
    disposed on close.
  - **One shared engine, multiple views:** Babylon `engine.registerView(canvas, camera)` renders one
    scene to N canvases from a SINGLE context; add/remove views (cheap) + load/dispose meshes as cells
    scroll, cap simultaneous live views to a handful. Only if live hover-preview earns its keep.

## Camera-relative joystick locomotion (Tonio, 2026-07-23)

A convenient way to pull any joystick coordinate as **camera-relative** — transform stick x/y by
the active camera's yaw into a world direction, instead of raw stick axes. Then the classic
third-person locomotion falls out: **drag the stick in a screen direction → the biped (or
whatever) rotates to face that world direction, then moves forward along it.** ("Move where you
push, relative to where you're looking" — GTA/RDR2 default.)

- Where: the input/mapping layer. Likely a helper `cameraRelative(x, y, camera) → {x, z}` (pure,
  testable — just a yaw rotation) plus a `cameraRelative` option on the stick→ControlInput mapping,
  or a movement mode on the controllable. Keep the math pure/unit-tested (like fly-by-wire).
- Demo (watchable): a biped on a textured ground; stick/WASD turns-to-face + walks in the pushed
  direction relative to the orbit camera. Good showcase for `b3d-controller` now that it works.

## Live-examples: document the benefits + add haltija affordances (Tonio, 2026-07-23)

The literate + **live** + agent-drivable example system is a genuinely strong debugging surface —
it's how the `b3d-controller` ctor-throw bug got root-caused (edit source → live example
hot-rebuilds in place → haltija reads it, no reload, console intact).

- **Coding-practices note**: write up the benefits of live-examples as a development/debugging
  methodology (in `../tosijs-coding-practices`) — literate docs that are also the test harness AND
  an agent-drivable repro. Include the workflow (view/edit code → change → refresh) and the
  gotchas (Refresh re-runs the loaded module, so _source_ edits need a full reload; only
  _example-code_ edits take via Refresh).
- **Haltija affordances**: first-class `hj` verbs (or documented selectors) to toggle edit mode,
  refresh/re-run an example, and set example code programmatically — plus surfacing uncaught
  exceptions. Filed in UPSTREAM.md (two haltija rows). Until then, the manual recipe:
  `document.querySelector('button.source-menu').click()` then click the `.xin-menu-item` matching
  /refresh/.

## Water: help things float / bob on the surface (Tonio, 2026-07-23)

`b3d-water` should afford keeping things ON the surface — both a **physics** path (buoyancy: a
float force proportional to submerged depth, so a rigidbody settles at the waterline) and a
**brute-force** path (sample the wave height at an object's x/z and set its y + a little pitch/roll
to the local surface normal — no physics engine needed). Same sampling helps **boats move nicely**
(ride the swell, bank into turns). Exposes a `waterHeightAt(x, z)` / surface-normal query on the
water so bobbing, boats, and the ambient depth-ramp all read ONE source of truth. Related: the
demo-utils `spinner` bob is currently hand-rolled per demo — this would replace it.

## Clouds & demo camera (Tonio, 2026-07-23)

- [x] **Cloud flicker (z-fighting)** — overlapping opaque LIT blobs z-fight visibly (adjacent blobs
      shade differently at coincident depths, tie-break flips per frame → flickers like crazy on tilt).
      Fixed: FLAT shading default (disableLighting + backFaceCulling) so the z-fight is invisible.
- [ ] **Lit clouds WITHOUT flicker** — the flat default is robust but loses the raked-top look. To
      bring lighting back safely: either merge all blobs into ONE mesh (fixed triangle order →
      deterministic depth), or give the cloud layer its own renderingGroupId with a STABLE opaque sort
      (by uniqueId) so ties don't flip. Then re-enable lighting behind an attr.
- [ ] **Clouds should MOVE / be dynamic** — they currently just sit there. Drift the layer with the
      global WIND (ties to the wind-system TODO) + gentle per-blob wobble/scale breathing. Motion makes
      even flat clouds read as alive — and it's what makes the sky interesting.
- [ ] **Cloud SHADOWS churn** — the projected shadow window recentres on camera DRIFT (`drift >
worldSize*0.1`), so an orbiting demo camera constantly triggers throttled repaints and the shadow
      steps/churns even though the blobs are stationary. Investigate: bigger window / higher drift
      threshold / don't recentre for a static layer / smooth the recenter. Separate from the flicker.
- [ ] **Demo camera tilt limit — roll out** — `demo-utils.orbitCam` now clamps beta (default: ≥5°
      above horizontal, ≤89° so not dead top-down) so you can't orbit under the floor. But MANY demos
      still hand-roll their own ArcRotateCamera in sceneCreated and don't get it — migrate them to
      `orbitCam`, or (bigger call) apply a default beta clamp in B3d.setActiveCamera for any
      ArcRotateCamera without limits. "I can see the world from below in almost any demo scene."

## Clouds: fill the frame / frustum-aware spread (Tonio, 2026-07-23)

The blob field is a fixed ±`spread` box around the CAMERA, so pulling the camera back leaves the top
of the frame empty (the field doesn't reach where you're now looking). Base the cloud extent on the
camera FRUSTUM ∩ the cloud layer (the slab at `altitude ± thickness/2`): grow/reposition the active
field to cover the visible footprint, so clouds fill wherever you can see them regardless of zoom.
Quick stopgap = bigger `spread`/`count` (costs draws); the frustum-fit is the real answer, and it
pairs with the recycle wrap (wrap into the newly-revealed edge of the frustum footprint).

## Rename on[A-Z]\* component METHODS off the `on` prefix (Tonio, 2026-07-23)

The elementCreator treats `on<Event>` as event-handler sugar, so a component METHOD named `onXxxx` is
shadowed — the transpiler warns, and it can silently misbehave (`<tosi-b3d> defines 'onSceneAddition',
'onOriginShift'` fired live). Rename them (the `handle<Event>` convention for handler-style ones; a
non-`on`, non-`handle` verb for subscribe-style ones — `handleSceneAddition` reads wrong for a call
that REGISTERS a callback):

- [ ] `B3d.onSceneAddition` / `offSceneAddition`, `onOriginShift` / `offOriginShift` — **public API,
      ~30 call sites across 12 files** (b3d-shadows, b3d-reflections, b3d-water, b3d-terrain, b3d-clouds,
      b3d-collisions, b3d-destroyable, b3d-launcher, b3d-radar-blip, …). Coordinated rename + verify build.
      Naming: maybe `watchSceneAdditions`/`unwatch…`, `onSceneAddition`→`whenSceneAdds`? Decide first.
- [ ] `B3dControllable.onGainFocus` / `onLoseFocus` → `handleGainFocus` / `handleLoseFocus`
- [ ] `TouchGamepad.onButton` → `handleButton`
- [x] `B3d.onResize` / `B3dHud.onResize` — already deprecated for this reason
- Check `b3d-probe`'s `onProfile` (likely a demo config callback, not a shadowed method — verify).

## Virtual miniatures battle game — recreate (Tonio, 2026-07-23)

Recreate an old game Tonio built: a virtual tabletop-miniatures battle with really nice COMMAND
mechanics. Scale: a unit = 5–15 figures, 6–15 units/side → ~450/side, ~900 figures total. The
insight that makes it trivially feasible (and validates the north star): the figures DON'T need
rich rendering — simple BAKED animations / near-3D-sprites / Quake-style pure vertex animation, LOW
animation rates, and projected BLOB shadows (not CSM). That's the instanced/VAT regime, one draw
call for a whole crowd, hundreds–thousands of figures each doing a different thing — even on Quest.
The value is ALL in the command mechanics (AI/logic), which scale cheaply. Full-skeleton `b3dBiped`
would NOT scale here and isn't the tool; needed capabilities:

- **Instanced/VAT figure system** — bake a small clip set to a vertex-animation texture, GPU-instance
  the figures, per-instance clip/frame/phase so a unit reads as alive without unique skeletons. Low
  update rate. (New capability — the biped-scaling bench idea is the measurement half of this.)
- **Batched blob shadows** — one soft decal per figure (or an instanced quad), reusing
  `shadow-decal.ts`; no CSM.
- **Unit + command layer** — the actual game: formations (we have `formations.ts`), orders, morale,
  activation — the behavioural richness the whole framework is pointed at (AI-DESIGN.md).

This is arguably the ideal north-star showcase: spend nothing on vertices, everything on agents.
