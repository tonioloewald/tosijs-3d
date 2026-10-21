# 0.8.1

<!--{ "parent": "CHANGELOG", "order": 9991999 }-->

## ⚠️ Breaking

Nothing breaks at compile time. Two behaviours change, and
[Migration.md](https://3d.tosijs.net/Migration/) has the before/after for each.

- **Aircraft guns are direct-hit, not area-effect.** `gun-mode="blast"`
  restores the old behaviour; `gunBlastRadius`/`gunFullRadius` are attributes
  now rather than hardcoded.
- **`activationVeto` takes an optional second parameter.** Existing callers
  compile unchanged, and a veto that ignores its argument behaves identically.
  When the info is omitted a reach veto now **refuses** rather than passing —
  see Migration.md for why that direction, and how to say otherwise.
- **`select3d` no longer draws ‹ › stepper arrows.** The popup it always had is
  now the only way in, and is discoverable.

## Changed

- **Aircraft guns damage what they pass through, instead of firing an area
  effect** (#23). Blast damage resolves by distance to a destroyable's
  registered point — ONE point, at the model's origin — so scaling a fighter 4×
  puts its wing outside a 1.5 m blast and point-blank fire does nothing, with
  no error. Direct-hit damage has no length scale in it and is immune to that
  whole class. `gunMode="blast"` restores the previous behaviour, and
  `gunFullRadius`/`gunBlastRadius` are attributes now rather than hardcoded.
- **A disposed mesh now takes its own materials and textures with it.**
  `mesh.dispose()` leaves them behind, so every scene child that built one
  leaked it on every teardown — including every RE-PARENT, since a move
  disconnects the child while the scene deliberately survives. Measured:
  re-parenting one scene six times took materials 3 → 15 and textures 3 → 21,
  unbounded, meshes correctly flat. `disposeMeshTree` CHECKS before disposing —
  a glTF file shares one material across many meshes and a disposed material
  still answers `isReady()`, so a wrong sharing rule turns siblings black
  silently. Textures held by the scene environment, a render target or a
  light's gel are exempt, because nothing references those from a material.
- **A blast finds every destroyable, not every `<tosi-b3d-destroyable>`.**
  `detonateWarhead` queried one tag name, so `b3d-loader` models — which attach
  the same behaviour — were invisible to every explosion in the scene. The
  registry now lives on `DestroyableBehavior`, so anything attaching one is a
  target by construction.

## Fixed

A second headset pass found the rest of these. Between the two, every one was
invisible to a green suite — and the ones on panels were all reproducible flat,
which is now written down rather than re-learned (CLAUDE.md, "A PANEL IS NOT A
HEADSET-ONLY SURFACE").

- **We were eating other people's keystrokes.** `KeyboardGamepad` listens on
  `window` so you can steer without clicking the canvas first, and the on-screen
  keyboard listens there so an in-scene field types with no DOM focus — the only
  way that works in a headset. Both then `preventDefault` what they claim, with
  no notion of where the event came from. `a` is a strafe key, so typing "lamp"
  into a search box lost the character AND strafed the demo, on any page
  carrying a scene. `isTextEntry(event)` is the one predicate all three
  listeners consult. An input you PRESS is not typing — space on a checkbox
  stays a press — and key RELEASE is deliberately unguarded, or a key pressed on
  the canvas and released in a field would stay down forever.
- **A popup is a popup, not something its panel crops.** `select3d`'s menu and
  `openMenu3d` went to the panel-bounded path, so a menu was squeezed into
  whatever room was left under its own row. Only the keyboard called
  `showLayer`, because someone knew it existed. `showPopup` now prefers a layer
  and keeps the bounded path as its fallback, so the fix reaches every caller;
  `boundedPopup` remains for a popup that must not escape. **Picking an option
  dismisses it** — `closePopup()` is the panel's own tracking and knows nothing
  about layers, so a menu set the value and stayed standing.
- **An in-scene panel's popups open on their own plane.** A panel rasterised
  onto a plane is not in the document, so the DOM layer cannot auto-install and
  every popup took the cropped path. `panelScene` had registered a scene layer
  since the keyboard needed one; the `<tosi-b3d>` settings panel never did. The
  placement maths is extracted to `panel-layer` rather than copied — a formula
  at three sites, fixed at one, is a mistake this repo has already paid for.
- **A popup is drawn at its panel's scale.** It took `width * 0.95` whatever it
  contained: right for a keyboard, grotesque for a 160-unit menu at twice the
  text size of the thing that opened it. One viewBox unit is now the same
  physical size on a panel and its popup.
- **A press aimed at a popup reaches the popup.** The XR panel's re-pick ignored
  what the ray actually hit and forced a pick against itself, so a press on a
  popup in FRONT of it was routed to the panel behind — close and move never saw
  a thing. An occluder that is itself UI now wins.
- **No empty band above a flat popup.** 30px was reserved for the move/close
  glyphs an in-scene popup draws; a DOM layer draws none. Reserved only when a
  mounting host actually draws chrome.
- **The keyboard's × means "put it away".** It closed only the presentation you
  pressed, leaving the other up and the field still believing it had a keyboard
  open — and left the mode on, so the glyph stayed lit over nothing and the next
  press flipped the preference instead of reopening. A takeover is still not a
  dismissal: swapping layouts between fields must not darken the glyph.
- **`Migration.md`'s first block ran as a live example.** The doc system executes
  `html` fences, which is the natural fence for illustrative markup. Now `xml`,
  and `doc-examples.test.ts` — which scanned only `src/*.ts` — fails on any live
  fence in a published markdown doc.

Five of these came from one headset pass on the terrain editor, which is the
argument for `RELEASING.md` step 5a in one paragraph: every one of them was
invisible to 2300 passing tests, and the first was invisible to a day of
reading the source.

- **A pinned panel header was clipped away — invisible, but still hittable.**
  The header was appended inside the clipped body group, whose clip rect
  necessarily starts below it, so it was clipped in full while its band stayed
  reserved and the pointer router kept routing to it. Three symptoms, one cause:
  the Exit VR / Re-seat / Pause buttons vanished, the panel grew a tall empty
  band, and pressing where they _should_ be worked. ⚠️ It only bit a panel that
  SCROLLS, because `clip-path` is only applied then — so every small panel in
  the demos and tests was fine and the terrain editor was not.
- **An icon bar ran off the edge of its panel.** `layout()` ignored the width it
  was handed. A scene's bar is Exit VR + Re-seat + Perf Stats + one per
  registered debug source + the gadgets — ten items, 380px, in a 296px panel. It
  wraps now, and the hit test reads `y` as well as `x`.
- **Noise `scale` sliders are LOGARITHMIC.** They are frequencies: on the old
  linear 0.005–0.3 track the whole usable band was the first 15% and the default
  sat at 3%, so every value you actually want was crushed against the left stop.
  The schema has said `x-scale: 'log'` all along and `terrainEditor3d` honours
  it — the hand-rolled demo panels did not, which is how it shipped.
- **A scrolling panel has a scroll RAIL.** Scrolling began on empty space, and a
  panel full of controls has none, so in a headset there was no gesture that
  scrolled it at all. The rail is also the only visible sign that there IS more
  below — a texture on a plane has no scrollbar, no overflow shadow and no
  momentum. Rows are measured twice so it never overlaps a control.
- **A slider keeps a usable track however narrow its row.** The label took a
  flat 45% and the readout took whatever it needed, leaving a 53px track at
  282px wide with a unit in the format. The track reserves a minimum now and the
  label yields, clipped so it cannot paint over the control it gave way to.

- **`operable` contradicted `useNearest` on the same door.** With no pointer on
  it the getter knows no distance, so a reach veto blocks — while `useNearest`,
  which measures the distance itself, opens that same door 1 m away. Nothing in
  the behaviour knows where your actor is standing, so `operableFor(info)` is
  the question to ask for a "press E" prompt; it runs the same veto pass as
  `activate()`, so a check and the act cannot disagree.

- **A terrain attribute change no longer rebuilds the whole world every frame,
  and a retained tile is the cell it claims to be.**
  tosijs queues one render per animation frame and `slider3d` writes on every
  pointer move, so an attribute-driven rebuild that cleared the tile pool and
  refilled it unbounded cost a FULL rebuild per frame for as long as you dragged
  — ~50 ms of noise alone at the high tier, ~6.3 ms at the quest tier inside a
  13.9 ms VR frame, before skirts, normals and the vertex uploads. It now marks
  the pool stale and re-cuts under the ordinary `fillBudget`/`tileBuildMs` cap,
  so the world morphs instead of blinking out. `regenerate()` keeps its
  documented unbounded behaviour, and now adopts the generation key so "set the
  attributes, then call `regenerate()`" stops paying for two rebuilds.

  Retaining tiles rather than clearing them exposed a second thing: a tile's
  key is `(level, gx, gz)` and says nothing about SIZE or PLACE, so after a
  `tileSize`/`horizScale` change an old tile key-matched a desired cell that was
  a different size somewhere else — and the world came out gapped and
  wrong-scale while the streamer reported itself finished. A retained tile now
  adopts the whole desired cell and marks itself stale when its geometry moved,
  so the two rebuild paths agree about what the world is.

- **`disposeMeshTree` could dispose a texture a library model was still
  drawing.** The material guard asks `scene.meshes` and was right; the texture
  guard asked `scene.materials`, which cannot see a library-instantiated model's
  materials — those belong to the `AssetContainer` while their meshes are in the
  scene. A texture shared with a hand-made material was disposed under the
  library model, which went black, silently. The in-use set is now derived from
  the meshes that remain.
- **The attribute index lost three elements' documentation to one legend
  table.** The generator rejects a table whose header names an identifier
  (`touch-gamepad` maps `data-part` values to gamepad fields — its rows are
  values, not attributes), but applied the rejection to the whole DOCUMENT on
  the strength of the first table it found. `b3d-lamp` opens with a capability
  matrix, so the point, spot and area lights all shipped bare attribute names
  with no default and no prose. Each table is judged on its own header now.
- **`operable` and `debugState` contradicted what a pointer press actually
  did.** Both were routed through the same helper as a scripted `activate()`,
  which reports an unknown distance as `Infinity` so a reach veto fails closed.
  That is right for an activation and wrong for an inspection: a hovered door
  reported `operable: false` and `out-of-reach:blocks` at the moment a press
  opened it. While the pointer is on it they now judge with the real hover, and
  `debugState` prints the info it judged with — it is the only debug readout
  that exists in a headset.
- **The attribute index ships inside the package.** `static/attributes.txt` and
  `attributes.json` are in `files` now, so an agent already in a consumer
  project reads `node_modules/tosijs-3d/static/attributes.txt` with no network
  and no proxy. It was published to the doc site only, which is the one place
  the actor it was built for cannot reach.

- **`b3d-destroyable` could not place a library piece properly** — three
  reports from `tosijs-3d-ensemble` against one function, and one bug family:
  the async load treated its callback as if nothing could change underneath it.
  - **Rotation was dropped** (#48). Only x/y/z reached `instantiate`. It looks
    like it should not matter, since `AbstractMesh.render()` syncs `rx/ry/rz` —
    but that is a COMPONENT render, and it had already run by the time the
    async callback assigned `this.mesh`. Position applied, rotation did not.
    Now forwarded, and the transform is re-synced once the node exists.
  - **No scale** (#47). `size` is the placeholder cube's edge length and does
    nothing once `library` is set, so a placed model could not be resized at
    all — ensemble measured a piece at 5.273 units for `scale` 1, 2 and 4
    alike. New `scale` attribute, uniform, applied to the instance root.
  - **A removed element orphaned its node permanently** (#49). Remove it inside
    the load window and the disconnect handler found nothing to dispose, then
    the pending callback built a node owned by no element — a ghost nothing
    would ever move or free. Guarded with `loadGeneration`, the mechanism
    `b3d-aircraft` already used; the retry poll stops on a stale generation too.
- **Two engines on one canvas are now impossible, and a lost context says so**
  (#56). Building an engine over a live one disposed nothing and failed
  silently — the first context's shader programs go invalid while every uniform
  still reads back correctly, which is why it presented as four different bugs
  (white meshes, dark sky, empty scene, half-loaded scene). It now disposes the
  old engine and warns. Separately, `webglcontextlost` is reported to the
  console and the debug ring instead of just rendering wrong.
- **The flat scene panel now closes on a background press**, like every other
  transient overlay here. A press inside it, or on the gear, still does not —
  the gear toggles, so closing first would make it look inert.
- **A still sky never found a late sun** (#55). `updateSky` writes
  `sunPosition`, `rayleigh` and `turbidity` only when a sun element's light
  exists, and the frame gate re-ran it only when `timeOfDay` moved — so
  `realtimeScale: 0`, which is what a reproducible authored scene wants, ran it
  once and came up dark about four loads in five. The default `realtimeScale:
10` hid it, because a drifting clock reopens the gate until some pass catches
  the sun. The retry is now gated on the OUTCOME rather than the clock, and
  bounded so a scene with no sun does not retry forever.
- **A flat popup could open off-screen with no way back** (#57). The DOM layer
  set `left`/`top` straight from the anchor with no bounds check, so a field in
  a right-hand panel opened a keyboard 112px past the right edge — rightmost
  column of keys unreachable, and unrecoverable, because the move/close chrome
  is drawn by picking and picking exists only in the scene. It now places
  through `placePopup`, the same pure flip/clamp the in-scene presentation
  uses, **and the holder can be dragged** — which is the better fix, since only
  the person typing knows what the popup is covering. A press that lands on a
  widget still belongs to the widget, or you could never type.
- **`chaseDistance` / `chaseHeight` / `chaseMinHeight` / `hudSize` accepted a
  write and did nothing** (#43). All four were consumed when the rig and HUD
  plane were built and never read again, so a settings slider bound to any of
  them read back correctly and moved nothing — ensemble measured bit-identical
  framing across a 3× change. Worse than an ordinary no-op because
  `chasePitchFollow` on the same element IS live, so the element looked
  responsive and only some of it was. The chase geometry now comes from one
  path used at build AND every frame; the HUD remounts when its geometry
  changes, instead of latching on a boolean.
- **`select3d` looked like a cycler** (#37). It has opened a popup list all
  along — nothing said so, so a consumer counted 23 taps to reach the 24th
  option. It now draws a downward chevron, the whole control opens the list,
  and the arrows are gone. Stepping survives only where a panel gives no host
  and a menu is impossible.
- **An icon name colliding with `Object.prototype` threw** rather than falling
  back — `iconGlyph('constructor')` and friends. 0.8.0 was the first release
  where table DATA becomes an icon name, with no `catch` in the repaint path.
  Fixed at all three unsafe sites, including `registerIcons`, where `__proto__`
  was an assignment that would have corrupted the map rather than failing.
- **`spinner3d` leaked into a module-global ticker.** `Widget3d` gained
  `dispose?()`, and `B3d` releases the widget set it replaces on each repaint.
  Reaping by `el.isConnected` would have been wrong: an in-scene panel's SVG is
  never attached, so a visible VR spinner would have been culled.
- Panels size to their content, the in-scene icon bar is pinned, and the theme
  editor no longer follows you between demos (from the 0.8.0 headset pass).

## Added

- **A spatial panel can be dragged, and the drag is aimed at where you POINT.**
  `orbitFromAim` walks the controller ray to the sphere's radius and asks which
  way that point lies from the anchor. Using the ray's DIRECTION instead treats
  your hand as if it were at your eyes: the panel sat where the arithmetic said
  rather than where you pointed, and hand wobble swung it by the whole
  head-to-hand offset.

  The seat lives on the element, so a structural refresh — pressing Pause, say —
  no longer snaps the panel back to its default. A seat names an EDGE and the
  pin BLENDS across the horizon: a hard switch moved the panel by its entire
  height in one frame as you dragged through eye level. The grip is
  `iconGlyph('move')`, the same mark a torn-off popup already uses.

- **A spatial panel can be dragged, on the sphere around its rig anchor.** Two
  properties fall out rather than being built: the distance cannot drift (so it
  can never be shoved into your face or out of reach) and the facing comes free.
  `panel-orbit` is the pure half — no Babylon, no DOM — so the placement rule is
  testable without a headset.

  A drag past a limit **follows you and stiffens**, and letting go springs back:
  a hard stop is the right resting behaviour and the wrong live one, because a
  panel that simply stops following your hand reads as a dropped drag rather
  than a limit. The band and the clamp deliberately disagree — the panel may
  PASS a limit and may never come to REST past one, since out there its own Exit
  VR and Re-seat buttons are hard to reach.

  A seat names an EDGE, not a centre: below the equator it is bottom-relative
  and above it top-relative, so a tall panel's extra height always grows back
  toward eye level instead of trailing into the floor or pushing past the
  ceiling it was just clamped to. The ceiling is 60°, which is the default seat
  exactly, so the panel can only ever be dragged somewhere more comfortable than
  where it started.

- **`budgetedReach(reach, tileSize)` and `MAX_TILES_ACROSS` are exported from
  `tosijs-3d/terrain-grid`**, so a UI can clamp its own slider against the same
  limit `<tosi-b3d-terrain>` enforces rather than guessing. `reach` × `tileSize`
  is the footgun and neither looks dangerous alone: reach 5000 at tileSize 10 is
  a million finest tiles, which is the slider that killed a tab (#66) and got
  capped at "400 m" as a guess. Pure, no scene needed. The element's own
  `_budgetedReach` is now a call to it, so they cannot drift.

- **A manipulator — translate, rotate and scale handles you can grab** (#38),
  ported from `tosijs-3d-ensemble` where it was shaken out against real
  authoring, including on a phone. Three files on the usual split:
  `manipulator.ts` (pure — the five grip readings, snapping, the drag reducer),
  `manipulator-view.ts` (the Babylon handles, with the two-pass pick and the
  euler composition folded in so a consumer no longer writes either), and
  `<tosi-b3d-manipulator>`. The flat pointer is wired; `grab`/`grabNear`/
  `drag`/`release` take world rays so a controller or a hand drives the same
  code. Note `move`/`turn` rather than `translate`/`rotate`: `translate` is a
  real `HTMLElement` property and declaring it gives one word two owners.
- **`<tosi-b3d-beacon>`** — a clickable hull for anything with a position and
  no geometry: a lamp, a positional sound, a spawn point (#70). Invisible via
  `visibility = 0` rather than `isVisible = false`, which is the whole trick —
  Babylon's default pick test is `isEnabled && isVisible && isPickable`, so the
  obvious way to hide a hull makes it unpickable, and the failure returns
  _whatever is behind it_ rather than nothing. `beaconOwner(mesh)` is the entire
  reading-side API.
- **`angle3d` and `arc3d`** — dial a bearing, dial a firing arc (#71). An angle
  on a linear track has ends where the quantity does not, so 359° and 1° sit at
  opposite ends of the slider. `arc.ts` is the pure model, and an arc is a
  CENTRE and a WIDTH rather than a start and an end — which makes "is this
  bearing inside" and "does that arc contain this one" one line each, and makes
  straddling north unrepresentable rather than special-cased. An envelope is
  drawn, not merely clamped against, so a turret's restricted arc explains the
  ship instead of silently snapping.
- **`picker3d`** — choosing one of five hundred (#37). A `table` for the
  virtualized filterable list, an `inputField` for the query, a `select3d` for
  the family: two levels without a tree, because a tree needs a pointer to
  expand and two flat controls work from a D-pad. Filtering is AND across terms
  over the whole name, so word order cannot matter.
- **`terrainEditor3d`** — a terrain editor built FROM `sceneSchemas.terrain()`
  (#66), so a range cannot disagree with the element it edits. Curated, not
  generated: most of the schema's thirty properties are performance internals,
  and a panel showing all of them is a settings dump.
- **`FieldType: 'color'` and a swatch on `inputField`** (#72). Tolerant in,
  canonical out — `#abc`, `red` and `rgb(255,128,0)` all commit as `#rrggbb`,
  and a five-digit hex is valid WHILE TYPING and refused at commit rather than
  silently accepted. The swatch holds the last good colour while the text does
  not parse, so a half-typed value does not read as a lost one.
- **One wind for the scene** (#73) — `windSpeed`, `windBearingDeg`, `windGust`
  on `<tosi-b3d>`, with `wind="scene|own"` on clouds, water and ambient.
  Clouds, water and leaves each carried their own wind in three spellings and
  could silently disagree. `wind.ts` is pure: Cartesian inside, degrees at the
  edge, and that IS the composition rule — a valley funnelling, a lee
  sheltering and a headland curling are all just contributions that add.
- **Combat attribution** (#8) — `Cause {by, kind, via, hops}` on `damaged` and
  `destroyed`, threaded through chain links, `tick` and `deathBlast`, and
  stored on the `Destroyable` so a reaction a frame later can still ask. `by`
  is the ORIGINATOR however many hops back, because re-attributing each hop to
  the thing next to it launders the credit away. Measured on the 48-drum
  cascade: one hit, 48 kills, all credited, hop counts 1/3/5/7/9/11/6/6.
- **`b3d-aircraft` can be damaged and locked** (#23) — `destroyable="on"`
  attaches the same behaviour `b3d-loader` uses, and `blip="on"` mounts a radar
  blip, without which an enemy cannot be missile-locked and a player reports
  that "missiles don't work".
- **A veto is told about the activation** (#36) — `blocks(info)` receives
  `{actor, source, distance, …}`, so one door can answer differently for an NPC
  holding the key and a player who is not, and can tell a hand within reach
  from a ray across the room. A veto that ignores its argument is unaffected.
- **A configured terrain now draws itself** (#66). `<tosi-b3d-terrain>` built a
  tile pool and filled it only when told, so a terrain with its attributes set
  rendered nothing until someone called `regenerate()` — a silent failure that
  every consumer worked around with their own bounded retry. Ordinary attribute
  changes now regenerate on the next frame, like every other element. Keyed on
  the GENERATION attributes only, so a `wireframe` toggle stays a material tweak,
  and relying on tosijs's own render batching for bursts rather than
  reimplementing it — five writes in a task are already one `render()`.
- **`b3d-turret` and `b3d-launcher` take a `library`** (#34), so a piece that
  IS a turret no longer renders as a cylinder and a box. Which node aims is
  declared by the MODEL — a `_barrel` suffix, resolved like `_centerOfGravity`
  and the collider suffixes — because a rigger declares moving parts in Blender,
  not in scene markup. `_muzzle` is separate and says where rounds leave: the
  same node on a simple gun, a different one on a multi-barrel mount. A model
  with neither still works — it yaws as a unit and the muzzle falls back to the
  existing forward offset.
- **`b3d-spawner` can spawn at an authored PLACE**, not only on a ring around
  the player (#40). `anchor="place"` plus `x`/`y`/`z` and `facingDeg` — a
  carrier deck, a hangar door, a dungeon entrance. Mutually exclusive with the
  distances by construction rather than by warning, and a placed spawn does not
  consume the RNG, so adding a launchpad cannot shift the encounters in a scene
  that promises "same seed, same battles".
- **`<tosi-b3d-prop>`** — a library model in the scene and nothing else (#68).
  Every existing route to a library-backed mesh brought behaviour with it: a
  plain prop had to be a `<tosi-b3d-destroyable>` carrying `capacity`, `armor`,
  `explode` and a combat id for something nothing will ever shoot.

  It matters more than a convenience element, because it is the difference
  between the CDN's 5,108 models being reachable or not **from a page that
  cannot run JavaScript**. Every model in those kit libraries sits at the origin
  with no translation (the format is built for `clone()`), so a consumer with a
  JS build reaches all of them and a consumer writing declarative HTML reached
  none. `library-url` covers the one-model case without a separate
  `<tosi-b3d-library>` and a `type` handshake, sharing one library element per
  URL so ten props do not fetch the kit ten times.

- **Collision GROUPS** — `markCollisionGroup(mesh, 'water')` plus
  `collidable(reject, { ignoreGroups: ['water'] })` (#44). The single
  `b3dNoCollide` boolean answered "does anything hit this", which is one answer
  for every asker — and a sea needs two, since _"the aircraft should not treat
  water as ground"_ and _"shells should splash on water"_ were the same switch.
  Groups move the answer to the ASKER: the mesh says what it is, each mover says
  what it treats as solid, so one sea answers differently for a seaplane and a
  submarine on the same frame. Additive, and composes with the existing UI
  exclusion and reject hook rather than replacing either. `b3d-water` now tags
  itself `'water'`.
- **`color3d` — a colour picker that exists in a headset**, and `color.ts`, the
  pure model under it (parse/format, RGB↔HSV, `contrastInk`; no DOM, so a
  consumer can validate a document's colours headlessly). This was the one
  control the SVG UI did not have: the only two ways to pick a colour were
  `<input type="color">` (which cannot express alpha) or a consumer injecting
  one, and **neither exists in an immersive session** — so the theme editor, of
  all things, had no colour control in the presentation this library is for.
- **Colour icons for scene concepts** — `sky`, `sun`, `water`, `terrain`,
  `fog`, `mesh`, `decor` (#64). Unlike the stroked/filled sets these carry
  literal colours and no `currentColor`, so they do not follow the theme.
