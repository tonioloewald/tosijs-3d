# Changelog

All notable changes to **tosijs-3d**. This project is pre-1.0 (`0.x`), so minor
versions may carry breaking peer-dependency changes — each is called out in a
**⚠️ Breaking** block in its version section below, with what a consumer must do.

## 0.7.0

**Aircraft that fly like aircraft, and the substrate for volumetric terrain.**
No peer-dependency changes, but this is a **behaviour** release: the throttle,
the right stick and the on-screen gamepad all work differently, and one
attribute was renamed. Read the ⚠️ Breaking block before upgrading a scene
that was tuned around the old feel.

### ⚠️ Breaking

- **`hudChase` → `hudChaseOff`, with the polarity inverted.** The old attribute
  is gone (no alias — HTML boolean semantics can't express a default-true flag,
  which is why the negative name exists). It shipped in 0.6.2's `dist`, and
  because tosijs props end in an index signature a stale `hudChase` **compiles
  and is silently ignored**, so this will not error for you.
  - `hudChase: true` → delete it; the chase HUD is now the default.
  - `hudChase: false` → `hudChaseOff: true`.
  - Chase view now shows the HUD **without the artificial horizon** (which
    only tells the truth from inside the cockpit).
- **The glass gamepad hides itself** once a mouse, keyboard or hardware pad is
  used, returning after `idleSeconds` (10) of silence. Touch doesn't count.
  Set `fade="off"` to keep it visible — worth knowing if you screenshot or
  demo on a desktop.
- **The right stick is the camera**, not aux roll. `strafe` still sums into
  roll, so a custom mapping can restore a dedicated roll axis.
- **`carve` is a NAMESPACE, not 13 bare exports.** New in this cycle, so this
  affects only the handful of people who took `0.7.0-rc.1` off the `next` tag:
  that tarball exported `applyCarve`, `sphere`, `capsule`, `tube`, `box`,
  `union`, `smoothUnion`, `flange`, `subtract`, `intersect`, `roughen`, `warp`
  and `shaft` at top level; they now live on `carve.*`. Coming from the rc you
  get a link error, which is the intended loud failure — `box` in particular
  shadowed the UI container of the same name.
  - `import { sphere, tube } from 'tosijs-3d'` → `import { carve } from
'tosijs-3d'`, then `carve.sphere(…)`, `carve.tube(…)`.
  - Types stay top-level: `Carve`, `NoiseOptions`, `Vec3Like`.
- **`getNames()` returns different strings.** Behaviour suffixes no longer
  leak into the public name, so `Hull_collideMesh.model` lists as `Hull` and
  `instantiate('Hull')` resolves it (fixes #7, reported by manta-recon).
  Exact and `.model` matches still win first, so existing calls that used the
  raw name keep working — but code that PARSED the returned string, or
  compared it to an authored name with its suffix, needs updating.

### Added

- **`b3d.sceneBusy`** and **`terrain.busy`** — is the world still building? Any
  frame-rate judgement taken while these are true is a measurement of the loading,
  not of the device.
- **`b3d.ambientPoolScale` is now readable AND settable**, so a game can say "that
  was the loading screen, try again" instead of reaching into two privates (#11).
- **`aircraftMapping` honours its config** — it accepted one and had zero
  references to it. `AircraftMappingConfig` adds `invertPitch` (the arcade pitch
  convention), `invertRoll` and `invertCameraY`. Meaning belongs in the mapping:
  every source passes through it, so one setting can't leave the keyboard inverted
  and the glass gamepad not (#10, manta-recon).

- **The pure flight model is exported**: `flyByWireStep`, `regime`,
  `targetVelocity`, `chaseVelocity`, **`equilibriumSpeed`** and the
  `FlyByWireConfig`/`Command`/`State` types. `equilibriumSpeed` is what the
  HUD's new set-point mark is drawn from — a mission planner wants the same
  number, and until now it was unreachable from the package.
- **`isIgnored(name)`** — one matcher for the `-ignore` convention, used by the
  loader, the library and `publicName`.

- **[carve](https://3d.tosijs.net/carve/)** — the cave vocabulary, exported as
  the **`carve.*`** namespace (see ⚠️ Breaking): `carve.sphere`,
  `carve.capsule`, `carve.tube`, `carve.box`, `carve.smoothUnion` (fillets a
  junction so a passage flares into a chamber), `carve.subtract`,
  `carve.intersect`, plus the two perturbations that stop a carve looking
  carved: `carve.roughen` (texture the wall, silhouette stays) and
  `carve.warp` (bend the space so nothing reads as a primitive).
- **[sdf-lattice](https://3d.tosijs.net/sdf-lattice/)** — surface-nets
  extraction over ONE global hash-jittered lattice, so chunks weld
  bit-identically and cross-tile/cross-LOD seams are unrepresentable rather
  than stitched. Includes the chunk-weld proof as a test.
- **[patch-field](https://3d.tosijs.net/patch-field/)** — `landform`'s
  volumetric sibling: `(x, y, z, d) => d'` carving composed against the
  terrain's own hooked height sampler.
- **[b3d-patch](https://3d.tosijs.net/b3d-patch/)** ⚠️ **experimental** —
  streams extracted cave geometry with residency, a budget and a cavity
  predicate. Interiors work; ENTRANCES do not yet (see the component's note).
- **`landform`** gains `gulley` (a height FORCING function ending in a
  predictable cliff), `cover` (forced ground over a tunnel so it stays
  buried), and `pad` from 0.6.2's family.
- **`b3d-terrain`**: `patchMask`/`patches` hooks, `biomeLapseRate` (the lapse
  is coupled to vertical scale — a 340m world on the small-world default
  renders entirely as snow), and a public `heightSampler()`.
- **Landing gear, found by NAME** — AnimationGroups mentioning "gear" and
  "retract" are cycled from height above ground, with hysteresis and an
  optional `gearSound`. The animation is SCRUBBED, not played, because glTF
  animations arrive with a cyclic loop mode and a played group can snap back
  to frame 0.
- **`arcDashArray`** + `hud.setMeterMarks` — reference marks on any meter,
  drawn on the meter's own arc. Used for the throttle set point, sea level,
  and the ground beneath you.
- **`equilibriumSpeed(cfg, throttle, afterburner)`** — where a lever will
  settle.
- **`sceneDelta(scene)` is now actually exported.** 0.6.2 announced it and
  shipped it unreachable — `dist/index.d.ts` had no such symbol — so anyone
  following those notes hit a link error. It's the correct frame delta for
  anything ticking inside a scene observer (see 0.6.2's note on
  `getDeltaTime`), and the six doc demos that still taught the broken idiom
  now use it.

### Changed

- **tosijs-ui devDependency → ^1.9.8**, for serve-time gzip on the dev server:
  it was sending the 10.7 MB bundle uncompressed even to clients asking for
  gzip, so over a thin link a doc page showed its pre-rendered HTML and then
  never hydrated — the bundle never finished arriving. 2.56 MB now. Doc-site
  tooling only; nothing in the published library changes.

- **⚠️ The aircraft throttle is a LEVER, not a speed setpoint.** It commands
  an equilibrium: a climb settles at a new lower speed instead of stalling,
  and lowering the nose returns you to the speed you had, untouched. Full
  lever is MILITARY thrust; afterburner lights only while the trigger is held
  past a detent and drops back when released. Releasing the trigger holds the
  setting, so speed no longer self-sustains at idle — set the lever where you
  want to cruise.
- **⚠️ The right stick is the CAMERA**, not aux roll: it orbits the chase
  camera around the aircraft and turns the pilot's head in the cockpit,
  springing back on release. (`strafe` still sums into roll for anyone who
  maps a dedicated axis.)
- Hover gained a brake (the trigger's negative half sheds speed to a stop)
  and slow reverse (nose-up lean), with the trigger staying purely vertical
  so stopping never fights altitude. `hoverCeiling` 50 → 140.
- Speed gauges read 0..100% of the FULL envelope, afterburner included.
- Terrain defaults: bigger gross features carrying less gross amplitude, with
  the detail layer doing real work — the old defaults read as pudding.
- `worldV` defaults to 0.25: `CylinderSampler` reflects v, so `worldV = 0`
  put every scene ON a mirror plane with a seam running to the horizon.

### Fixed

- **The device probe measured the machine while it was still loading, then cached
  the verdict for 30 days** (#11, manta-recon). It went out on `setTimeout(…, 0)`
  — one task, not one idle moment — so the benchmark ran during terrain build and
  shader compile. It times work against a fixed reference and calls anything under
  ~1.67× the medium baseline **low**, so the machine that loads the biggest scene
  contends the most and tiers worst: an M5 Max holding 120fps was being given
  low-tier budgets for terrain, shadows, reflections and ambient at once. It now
  waits for ~1s of settled frames (`sceneBusy`), gives up after 30s, and caches a
  measurement it had to take under load with a short life so the next visit
  re-measures.
- **Ambient was shed during the loading screen and never came back** (#11). The
  watchdog's 10s warmup was a fixed timer where the question is "has the scene
  settled" — a streaming world loads for longer, so the one-way ratchet fired on
  frames that said nothing about the hardware and ambient stayed at zero for the
  session. The warmup clock now runs only while the scene is quiet.

- **`b3d-death` latched after the first death if the game respawned by its own
  route.** `_dying` is cleared only by `resume()`, which only the panel's
  Respawn button calls — and that button doesn't exist without a `respawn`
  callback. So a scene that respawns from its own `crash` listener (a
  documented pattern) left the component stuck, and it then swallowed every
  later death: no panel, no focus release, welded to the wreck. That is the
  exact failure this component exists to prevent, one level up. A death from an
  entity that isn't the wreck it's holding now tears down and handles the new
  one, and a panel built with no way out says so in the console. (Found by
  manta-recon crashing a respawned aircraft.)

- **`Foo_ignore` was half-honoured**: the loader disposed only the hyphen form
  while `publicName` stripped only the underscore one, so an underscore-form
  node survived the load AND collapsed to `Foo` — colliding with a real `Foo`,
  which made `instantiate('Foo')` resolve to whichever came first. Both
  separators now go through `isIgnored`.
- **`spinner()` in the demo helpers** still used `engine.getDeltaTime()`, so on
  any page importing it (the water demo among them) crates spun ~4× slow at the
  default `frameRate: 30` — the one call site the `sceneDelta` sweep missed.

- **A crashed aircraft releases input focus so a respawn can take over** (#9). A wreck keeps input
  focus and ignores it, so with no `<tosi-b3d-death>` in the scene the player
  held a dead controller — which reads as broken controls rather than as
  dying. The crash now releases focus if nothing else handled the event.
- **`recenter()` reset `worldV` to 0**, which is the `CylinderSampler` mirror
  plane — undoing the new default and putting a seam through the world, hours
  into a session where nobody would connect the two.

- **Tile skirts hung 344m through tunnels** — depth came from world amplitude
  rather than the tile's own relief.
- `_centerOfGravity` markers, cave shading (`interior` as a depth ramp,
  flooding by `waterTable`, `noWater`), volcanism confined to its caldera.

## 0.7.0-rc.1

Published to npm under the `next` tag on 2026-08-13, superseded by 0.7.0.
Everything in 0.7.0 above applies, with two differences that matter if you
installed it:

- It exported the 13 `carve` functions as **bare top-level names**; 0.7.0 moves
  them to `carve.*` (see ⚠️ Breaking).
- It did **not** export `sceneDelta`, despite the notes promising it — the
  `getDeltaTime`-in-a-scene-observer fix was unusable from the package.

It was tagged **before** the pre-release review ran, deliberately, to get it
into an adopter's hands sooner. The review found no blocker in the shipped
behaviour; what it found were the two release-artifact gaps above.

## 0.6.2

Terrain gets **volcanism** and **authored landforms**, clouds get real shapes, and a
systemic timing bug that made half the engine run in slow motion is fixed. Additive
only — no API removals, no peer-dependency changes. (The full terrain-system upgrade
lands as 0.7.0 once its remaining pieces are in.)

### Added

- **Volcanism intensity ladder** ([biome-plugin](https://3d.tosijs.net/biome-plugin/)) —
  the `volcanism` dial now climbs stages rather than scaling one look: near-black basalt
  with dark-brown voronoi seams → dark-brown rock with glowing seams → patchy open lava.
  Verticals lag one stage behind horizontals (lava pools flat; cliff faces drain and
  crust over), veins widen as the ladder climbs so pools form by veins merging, and the
  glow is subtly animated (spatially-phased pulse + drifting 3D-noise churn — never a
  global blink). Water pushes the ladder down half a stage and mutes the glow with depth
  instead of cancelling it: smouldering veins under shallow water.
- **`volcanicPalette`** + `LAVA_PALETTE` / `CRYOVOLCANIC_PALETTE` — the seven ladder
  colours are data, so a frozen world venting molten _water_ (pale ice rock, teal veins,
  glowing blue-white melt) is a palette swap, not a new shader.
- **Local volcanic provinces** — `b3dTerrain.provinceField = (x, z) => 0..1` marks
  _this_ island volcanic independently of the global dial. Sampled per tile vertex in
  origin-stable coordinates and carried to the shader in the colour buffer's (visually
  inert) alpha channel.
- **[landform](https://3d.tosijs.net/landform/)** — authored landforms FORCED through
  the terrain noise via the new `b3dTerrain.landform` hook, where
  [slope-profile](https://3d.tosijs.net/slope-profile/)s only _remap_ it. `volcano()`
  and `impactCrater()` each return a matched pair — the height shape **and** the
  volcanism province that makes it glow — so a volcano goes anywhere and an explosion
  leaves a glowing crater. `pad()` claims flat ground for cities and bases;
  `composeLandforms` / `mergeProvinces` chain them. Pure, deterministic, unit-tested.
- **`_centerOfGravity` model convention** — a child node with that suffix declares where
  a vehicle pivots in flight, while the root origin stays its on-ground stance point, so
  one model conveys both how it flies and how it plants.
  `findCenterOfGravity`/`applyCenterOfGravity` are exported; `b3d-aircraft` applies it
  on both load paths.
- **`b3dClouds({ model })`** — an authored GLB mesh becomes the cloud lobe (normalized
  on load, bottom-aligned), and clouds are now built as **clusters** of 2–4 overlapping
  lobes laid out by size rank (biggest low, smallest on top straddling the pair) with
  aligned bases, since cumulus condense at a level.
- **`B3d.frameDelta`** + **`sceneDelta(scene)`** — the authoritative inter-render delta
  (see Fixed).

### Fixed

- **Everything ticking in a scene observer ran in slow motion.** Babylon's
  `getDeltaTime()` measures the engine's rAF tick, but scene observers only fire when
  `scene.render()` runs — and `<tosi-b3d>` throttles rendering to `frameRate`. At
  `frameRate: 60` on a 120Hz display that's **half speed**; at the default 30, a
  **quarter**. Measured live: a dropped bomb inherited exactly 50% of the aircraft's
  velocity. B3d now publishes the real delta and 14 call sites use it — projectiles,
  missiles, turret, radar, warhead FX, spawner, clouds, ambient, death orbit, exploder,
  star / star-system / planet / black-hole.
- **`canonicalize` applied a spurious 180° yaw**, flying correctly-authored (Blender
  −Y-forward) models backwards. Babylon reads node-local data raw — the handedness flip
  lives only on the discarded `__root__` — so the collapse now applies **no rotation**,
  it only cleans. Pinned against real content in `model-frame.test.ts`.
- **Weapons inherited a phantom velocity.** `this.velocity` is only the aircraft's
  hover/ground integrator and reads zero in wing-borne flight; weapons now inherit the
  true world velocity, so bombs fall with you and cannon rounds lead correctly.
- **Weapon muzzles are computed through the world matrix**, so shots leave the visible
  airframe under any attitude or centre-of-gravity pivot.
- **Flying into a cliff face passed through it** — the ground check was a single
  downward ray, which reports the valley floor while a wall fills the windscreen.
  Airborne frames now also sweep along the velocity; steep contacts crash.
- **Death could strand you in the wreck.** Charring the wreck cloned a material carrying
  an unregistered plugin, Babylon threw, and the sequence aborted _after_ the explosion
  but _before_ releasing input focus — no spectate camera, no respawn panel. Material
  plugins are now registered for cloning, and death's exit is shielded so cosmetics can
  never block it again.
- Volcano calderas are flat-floored basins with the melt confined to the floor and a
  crusted rim (a smoothed shading normal can't make the rim read as open lava).
- Library instances carry their animations, retargeted onto the instance.

## 0.6.1

First consumer-reported fixes — both filed by **manta-recon** (tosijs-3d's first
external adopter) with root-cause analyses read from the 0.6.0 dist. No API changes.

### Fixed

- **Aircraft chase camera never created when focus adoption lands after a fast
  mesh load** ([#1](https://github.com/tonioloewald/tosijs-3d/issues/1)). Both
  sides deferred to the other: `setupMesh` skipped the camera when
  `inputProvider` wasn't set yet, and `inputFocus` early-returned for any
  self-managed entity — an ordering hole between them left the player flying
  blind on `default-camera`. The focus side now nudges entities using the
  deferral pattern (idempotent `setupFollowCamera`), so whichever side runs
  last completes the setup.
- **fly-by-wire: zero-speed deadlock above `hoverCeiling`**
  ([#2](https://github.com/tonioloewald/tosijs-3d/issues/2)). At full nose-up,
  pitch decay (`diveBoost·sin(pitch)`) could exceed thrust, pinning speed at
  the 0 clamp with the throttle held — a craft frozen mid-air. Held thrust is
  now floored to make progress below `vtolSpeed` (a nose-high climb-out labors
  instead of freezing); the throttle-released zoom-climb stall — the deliberate
  "hard way into high-altitude hover" — is untouched.

## 0.6.0

Cut as rc.1 → rc.3 (each reviewed; rc consumers see the per-rc sections in git
history), finalized after the nine-lens review's follow-up fixes landed.

The **SVG UI surface** release: a first-class, VR-ready UI substrate — container,
overlay, widgets seam, table, keyboard — plus the interaction contracts that make
the same surface work identically in the DOM, on a 3D plane, and under an XR
controller ray. No peer-dependency changes.

### Added

- **`box`** — the flow container: blocks + inline items + wrapped text, background/
  border/radius, resize-with-reflow, scroll regions, a coordinate-based event model
  (press/activate, raw capturing `handlePointer` for drags), and D-pad focus
  traversal with a visible ring.
- **`surface`** — content box + overlay layer: cascade **menus** and persistent
  draggable/closable **panels**, `placePopup` flip/clamp positioning.
- **`widget-box`** — the seam that lets `widgets3d` controls (sliders, toggles…)
  live inside a `box`/`surface` unchanged.
- **`table` / `table-layout`** — sticky header, virtualized body, drag-to-scroll,
  icon **selection** (see `selection`), D-pad row traversal with the escape
  contract.
- **`keyboard` / `key-layout` / `text-edit`** — the on-screen typing surface for a
  headset: long-press accent strips (sticky on lift, generous ray-tolerant taps),
  spacebar caret-trackpad (slow taps still type), pressed-key tint, hold-signifier
  glyphs (▾ accents, ↔ caret drag), per-key D-pad focus; `inputField` with
  code-point-correct editing and the **receiver-caret** model (lit = where text
  lands, dim = not; `setActive`/`onFocus` for host exclusivity). `key-layout` grew
  `numpad`/`dial`/`email`/`url` modes, gap-absorbing multi-unit keys (equal units ⇒
  equal width), and vertical key spans (the numpad's tall enter).
- **`gamepad-focus`** — the D-pad → focus wire: edge-triggered with typematic
  repeat (pure, testable `createFocusPulse`), menu/A activates, and `claim` scopes
  one physical pad to the last-touched UI when several live on a page.
- **Inner-focus protocol** on `BoxChild`/`Widget3d` — `focusMove(dx, dy) → boolean`
  (false = focus escaped, host moves on), `focusActivate`, `focusClear`, `setState`
  reflection — so a composite widget (the keyboard) is one child but many focus
  stops.
- **`panelScene`** — dual-presentation in two lines: textured plane + orbit camera
  - pick routing (mouse AND XR-controller ray) → `handlePointer`, with one gesture
    contract: a `claim(x, y)` policy for orbit-vs-UI, gestures collected on a stable
    catcher quad via the **pick ray** (screen coordinates don't exist in a headset),
    mapped through the gesture-start frame so a target that rescales its own plane
    stays stable, camera-yield during claimed presses, off-plane release ends the
    gesture.
- **`svgIcons.resize`** glyph (from tosijs-ui), used by the resizable-box demo's
  in-corner grip.

### Changed

- **`b3dSvgPlane`** routes the texture's alpha to the mesh (`opacityTexture`) —
  transparent svg regions (outside rounded corners) are transparent on the plane,
  not an opaque black substrate.
- Pick-forwarded events (`pointerEvents: 'on'`) carry a **synthetic pointerId**,
  never the physical pointer's — a listener's `setPointerCapture` on a forwarded
  event can no longer hijack the real mouse/ray stream.
- Panel demos are side-by-side DOM + 3D (50/50) throughout, built on `panelScene`.

### Fixed

- **The lost-pointerup chain**: demos passing `pointerEvents: false` were silently
  running with forwarding ON (tosijs discards wrong-typed prop writes — filed as
  tosijs#24); the forwarded events carried the real pointerId, so the flat mirror
  captured the physical mouse and the canvas stopped receiving pointerups. Fixed at
  every layer, and routing is now **self-healing**: a fresh down while a gesture is
  outstanding flushes the stale gesture (keyboard/box/surface), so a lost up costs
  nothing instead of wedging the session.
- **`SvgTexture`**: a failed rasterize no longer freezes the plane for the session
  — the busy latch always releases and the frame retries on the next tick.
- Keyboard: accent strips stay inside the keyboard's rect (top row opens below the
  key); a strip tap can't fall through to the key behind it; releasing on the held
  key with jitter goes sticky instead of inserting a random accent; focus follows
  the click (ring on the tapped key); Space presses the focused key.
- Arrow keys no longer orbit demo cameras (`ArcRotateCameraKeyboardMoveInput`
  removed — arrows drive the UI).

### Added (post-rc, from the review follow-ups)

- **`ui.*` namespace** — the SVG UI family's value exports live on one
  container (`ui.box`, `ui.table`, `ui.keyboard`, …): common nouns don't leak
  from the barrel. Types stay top-level. Migration from any rc:
  `import { ui } from 'tosijs-3d'` and destructure.
- `Box.interactiveAt` / `Surface.interactiveAt`, and `panelScene`'s **default
  claim policy** asks them — pressing a button/panel claims the gesture,
  pressing static prose orbits the camera, consistently across every demo.
- `panelGesture` + `uvToViewBox` + `planeLocalToViewBox` exported pure (the
  gesture contract is unit-pinned); named option types (`TableOptions`,
  `KeyboardOptions`, `InputFieldOptions`, `PanelSceneOptions`,
  `GamepadFocusOptions`); `panelScene` takes `updateInterval`; `w3dTheme`
  (one place reads the `--w3d-*` variables).

### Fixed (post-rc)

- `table.focusMove` speaks the protocol's `(dx, dy)` (rc.1 trapped D-pad focus
  in a hosted table); menu leaf-select no longer destroys persistent panels
  (`Surface.closeMenus`).
- box hover no longer sticks on raw children; a claimless `gamepadFocus`
  instance is no longer starved (click-away releases the claim).
- Table scrolling within the window is transform-only and hover restyles
  surgically (the virtualized body no longer rebuilds per drag-move);
  `textBlock` caches its wrap per width.
- `SvgTexture` warns once per instance when rasterizes fail (self-healing had
  made it silent); deploy/tunnel host reads `TOSIJS_DEPLOY_HOST` instead of a
  committed address.

### ⚠️ Changed

- **`B3d.onResize()` / `B3dHud.onResize()` → `handleResize()`** (the `on*`
  prefix is reserved by the element-creator's listener sugar). A 0.5.x
  consumer calling `onResize()` must call `handleResize()`.

## 0.5.2

### ⚠️ Breaking — peer dependency (`tosijs` ≥ 1.7.8)

- **`tosijs` peer range `^1.6.9` → `^1.7.8`.** Consumers must be on `tosijs`
  **≥ 1.7.8**; a project on `1.6.x` will hit `ERESOLVE`. (1.7.6/1.7.7 are
  **deprecated on npm** — a `parts`-resolution regression; 1.7.8 fixes it, and
  tosijs-ui 1.7.4 requires it.) As with 0.5.1, this ships under a **patch**
  deliberately — `0.x` narrative versioning, with `0.5.0` reserved for the
  playable-game cut — so it's flagged here rather than forced to a minor.
- _Dev/build only, no consumer action:_ `tosijs-ui` `1.6.23` → `1.7.4`, and
  `chokidar` added to `devDependencies` (tosijs-ui 1.7.x's shipped doc-site
  pipeline imports it at runtime but declares it dev-only — filed upstream).

### Added

- **`svgIcons`** (`svg-icons.ts`) — an SVG **icon proxy** (`svgIcons.<name>()` →
  an SVG `ElementCreator`) over a focused, **generated** icon set
  (`icons/{color,stroked,filled}/*.svg` → `icon-data.ts` via tosijs-ui's
  `tosijs-make-icons`; `bun run icons`). A composition-suffix subset
  (rotate/flip/scale/translate/opacity/stroke-width/colour) + the generator's
  directional redirects + hand-authored aliases (`iconAliases`, e.g.
  `moreHorizontal`). ~30 icons incl. `tosijs3d`, `xrColor`, `tosiXr`, keyboard,
  checkbox/stats/status marks.
- **`iconGlyph`** — a **texture-safe** icon primitive (explicit-colour SVG `<g>`)
  for embedding icons in in-scene `widgets3d` / `SvgTexture` UI, where
  `currentColor` and CSS vars don't resolve in the raster.
- **`flowLayout`** (`flow-layout.ts`) — a pure **CSS block/inline-block flow**
  layout core: the substrate for a first-class SVG UI surface that lives in the
  DOM and on a 3D texture. Babylon/DOM-free, unit-tested.
- **`b3d.snapshot()`** — capture the current view as a PNG **data URL**
  (resolution-independent, via Babylon's render-target screenshot; works flat,
  including in-scene panels).
- **`icon-name.ts`** — the pure composition-suffix parser behind `svgIcons`.

### Changed

- **Scene chrome → icon lozenge.** The top-left toolbar is now one rounded pill
  with two `svgIcons` buttons (settings + `xrColor` Enter-VR); the scene-panel `×`
  close is a `close` icon. The doc-browser **header logo** = `tosiXr` and the
  **favicon** = the teal cube, both via tosijs-ui 1.7.4's new `logo` option.
- **README** gained a 280px logo and its stale `xinjs-3d` links were fixed.

### Fixed

- **keyboard icon** rendering — the generator strips `fill-rule` from non-`color`
  icons, so its evenodd key-holes broke; moved to `color/` with `currentColor`
  (filed upstream). `iconGlyph` bakes `currentColor` to an explicit colour so it
  renders in the texture raster too.
- **Lozenge visible without `:has()`** — it defaulted to `display:none` and
  revealed via `:has()`, so a browser lacking `:has()` (older Firefox) never
  showed the toolbar. Now default-visible; `:has()` only suppresses the empty-pill
  flash.
- The svg-icons "composition suffixes" snippet is a **static** code block (was an
  erroring live example).

## 0.5.1

### ⚠️ Breaking — renamed public methods (`on*` → `add*Listener` / `handle*`)

No peer-dependency changes this release. The break is a **method rename**: tosijs's
`elementCreator` treats any `on<Event>`-named member as `addEventListener` sugar and
**shadows** a component method of the same name (it now fires a live warning, and it was a
latent bug — the handler silently never ran). So the multi-listener subscribe methods and the
lifecycle hooks moved off the `on*` prefix. The new names are also more honest: the subscribe
methods **push to a listener list** (add/remove semantics), not a single-handler setter.

| Old (0.5.0)                            | New (0.5.1)                                  | On                                 |
| -------------------------------------- | -------------------------------------------- | ---------------------------------- |
| `onSceneAddition` / `offSceneAddition` | `addSceneListener` / `removeSceneListener`   | `B3d` (scene owner)                |
| `onOriginShift` / `offOriginShift`     | `addOriginListener` / `removeOriginListener` | `B3d` (scene owner)                |
| `onGainFocus` / `onLoseFocus`          | `handleGainFocus` / `handleLoseFocus`        | `B3dControllable`                  |
| `onButton`                             | `handleButton`                               | `TouchGamepadSource`, `B3dGamepad` |

**What a consumer must do:** if you wrote a custom scene child that called
`owner.onSceneAddition(cb)` / `owner.onOriginShift(cb)`, or subclassed `B3dControllable` and
overrode `onGainFocus`/`onLoseFocus`, or a gamepad source with an `onButton` callback, rename to
the new members. It's a pure rename — signatures are unchanged. Built-in components are all
migrated; this only affects code you wrote against these surfaces.

### Added

- **Coordinate-free `MinSimApi`** (`world-contract.ts` §8) — a world-simulation boundary where
  **coordinates never cross the membrane**: a driver (an AI narrative engine, a scripted demo)
  sees _topology + a qualitative distance ladder_, never `x/y/z`. Places, portals, a 7-rung
  proximity ladder (`same-spot`…`present`, `elsewhere` for a different place), a `SchematicView`
  ("where am I", exits, contents-with-rung), and `route()`. `WorldStore` now implements it
  alongside its existing surface — the sim keeps real geometry sim-private and answers only in
  qualities.
- **`world-topology.ts`** — the pure, Babylon-free, deterministic spatial math behind the
  surface: `proximityRung(distance, extent)` (a distance in, an adjective out; bands scale with
  a place's `extent`), `rungNominal` (the inverse, for placement), `routePortals` (cheapest
  portal path, bidirectional, locked portals impassable — Dijkstra, deterministic tie-break),
  `containmentPath` (root→here breadcrumb). Unit-tested without a store or an engine.
- **`min-sim-conformance.ts`** — a **framework-agnostic shared conformance kit**
  (`runMinSimConformance(makeApi, harness)`) that pins the contract behaviour identically for
  any `MinSimApi` implementation. It imports no test runner (so it ships in the library) and
  takes the `describe`/`test`/`expect` harness as an argument — the same kit runs in this repo
  and in a driver's repo (the Ariosto use case), proving both stores behave the same at the seam.
- **Clouds drift with wind** — the cloud layer now moves with the wind vector, so the sky is
  alive rather than a still image.

### Changed

- **Demo cameras** migrated to a shared `demo-utils` `orbitCam` helper (tilt-clamped so an orbit
  can't dip below the horizon) instead of 24 hand-rolled per-demo cameras. Authoring-only — no
  library-API impact.

### Fixed

- **Cloud whiteout** now behaves correctly: it ramps to full **earlier** (less "snaps on at the
  moment of entry", denser once inside), **blots out the sky** (not just scene geometry), and
  **mutes projected cloud shadows** under the whiteout (fogged fragments no longer darken through
  the fog).
- **`b3d-controller`** `player` now defaults to `false`. tosijs began **throwing** on an
  `initAttributes` boolean that defaults to `true` (an absent HTML boolean attribute is `false`,
  so a `true` default can never turn on) — the old `player: true` default made the controller
  throw at construction and silently never wire input.

## 0.5.0

### ⚠️ Breaking — peer dependencies

- **Babylon.js 8 → 9.** Peer range for `@babylonjs/core`, `@babylonjs/gui`,
  `@babylonjs/loaders`, `@babylonjs/materials` moved `^8` → `^9`. **Consumers must
  upgrade their Babylon to `9.x`.** A project still on Babylon 8 will hit an
  `ERESOLVE` on install.
- **Jolt physics `^1.0` → `^1.1`** (Jolt 5.6.0 — the friction model moved). Only
  relevant if you use `<tosi-b3d-physics>`; retune friction if grip/slide changed.
- **Packaging fix:** `@babylonjs/*` and `jolt-physics` are now **peer-only** (they
  were previously declared in both `dependencies` and `peerDependencies`). A hard
  Babylon dependency would nest a _second_ engine copy in a consumer holding a
  direct Babylon dep — silently breaking `instanceof`, engine singletons, and
  plugin registration. No action needed by consumers; this just makes install
  resolution correct.

### Added

- **Clouds** (`<tosi-b3d-clouds>`) — an opaque blob cloud layer you can _fly into_
  and lose the world inside (a fog whiteout, not a texture). A `coverage` weather
  dial from wisps to thunderheads, and `insideCloud` so a cloud is a _tactic_
  (break a radar lock, shake a pursuer).
- **Projected cloud shadows** (`cloud-shadows.ts`) — the field painted top-down
  into one texture, sampled by world position in a material plugin, so shadows
  conform to terrain and fall on elevated receivers (the aircraft) too. Reusable.
- **Shadow decals** (`shadow-decal.ts`) — a reusable soft blob-shadow for a single
  caster (character, vehicle, dropped item).
- **Death** (`<tosi-b3d-death>`) — death's exit: explode + burning wreckage,
  release input, a third-person spectate shot, then a respawn panel. Flat and VR.
- **Encounters** — `<tosi-b3d-spawner>` (seeded, "same seed, same battles"),
  `formations.ts` (pure placement math), and a named `prefab` registry with
  `spawnPrefab` for the set-dressing a death or spawn drops.
- **Ambient effects** (`<tosi-b3d-ambient>`) — device-budgeted garnish (motes,
  bubbles, tumbling leaves) that competes for one pool and switches **off** rather
  than thinning into a lie. Pure budget allocator in `ambient-budget.ts`.
- **Atmosphere** (`atmosphere.ts`) — pure fog compositing so underwater / cloud /
  space whiteouts layer over the base fog instead of fighting it.
- **`setGameplayCamera`** — an XR-safe viewpoint affordance (move the rig in a
  headset, swap the camera when flat), so chase/death/vehicle transitions stop
  breaking in VR.
- **`PLATFORM.md`** — the platform bet (stay on the web, don't abstract the
  renderer; the real risk of the Android XR / Vision Pro shift is _input_).

### Changed

- **Aircraft** — the stick is dead on the ground (only the throttle lifts off);
  you can't crash-land until you've actually cleared the pad; chase camera banks
  smoothly and no longer jitters on throttle.
- **Water** follows the camera as an endless sea; **terrain** auto-centers so a sea
  at `y=0` floods the valleys.
- **HUD** survives respawn.
- Babylon `8.56 → 9.16`, Jolt `1.0 → 1.1`, tosijs-ui `1.6.22 → 1.6.23`, tosijs
  `1.6.8 → 1.6.9` (dev-server/haltija reliability), haltija `→ 1.4.0`.

### Fixed

- Death explosion/wreck FX land at the real wreck; a respawn is no longer charred
  (char a cloned material, not the shared library one).
- The aircraft ground-ray no longer picks a cloud blob as "ground" (mid-air
  "crash"); cloud whiteout is opaque under LINEAR fog and builds from every
  direction; the live-debug timer is cleared on scene disconnect (no leak).
