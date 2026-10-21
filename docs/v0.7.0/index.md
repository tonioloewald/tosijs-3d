# 0.7.0

<!--{ "parent": "CHANGELOG", "order": 9993000 }-->

> **Prereleases, and why the numbering looks backwards.** `0.7.0-rc.1` was cut
> first, then work continued as `-beta.1…beta.6`. Semver sorts beta BELOW rc, so
> `bun add tosijs-3d@next` wrote `^0.7.0-beta.6` and RESOLVED BACKWARDS to the
> older rc.1 — silently, and `bun update` even reported the downgrade as an
> upgrade. **Publishing 0.7.0 is what un-inverts the channel**, since it sorts
> above every prerelease.
>
> The rule taken from it: **a prerelease channel never moves backwards** — the
> successor to `-rc.N` is `-rc.N+1`, never a beta. If you pinned any
> `^0.7.0-beta.*` or `0.7.0-rc.1`, move to `0.7.0`.
>
> - **0.7.0-beta.6** (2026-08-17) — carved landforms (the sdf-lattice page, the
>   volcano cutaway, strata, 3D volcanic veins), portal math, and four
>   manta-reported fixes: the explode+library crash that seized the scene (#24),
>   mutual death eating the panel (#25), blasts blind to library destroyables
>   (#28), and pitch authority becoming configurable and asymmetric (#26).
> - **0.7.0-beta.5** (2026-08-15) — `MediumOptics` + `fogLayerFor`
>   (⚠️ experimental, not load-bearing: water publishes its optics but still
>   computes its own fog layer). Otherwise identical to beta.4 — the rest is
>   design notes.
> - **0.7.0-beta.4** (2026-08-15) — the `medium` primitive (space/air/water/
>   mercury, plane or sphere), medium-aware projectiles closing #13, and pause
>   marked EXPERIMENTAL pending a headset.
> - **0.7.0-beta.3** (2026-08-15) — pause (backgrounding, start-paused, the VR
>   entry gesture, a centred panel), the stick-sign contract test + `kind`, and
>   four more manta reports: #17/#18 ambient spawn bias, #19 authored projectile
>   meshes, #22 destroyable library models. Plus the HUD circle's portrait
>   sizing and both panels' camera/viewport fixes.
> - **0.7.0-beta.2** (2026-08-15) — adds #13's missile-guide composition, the
>   gear gadget for the glass gamepad, and the live `fade`. #14 investigated and
>   NOT changed: the glass source measures correct on desktop from four
>   independent angles, so no sign was flipped (see the issue).
> - **0.7.0-beta.1** (2026-08-14) — everything below, including the four
>   manta-recon issues fixed that day: #9 (crashed aircraft eats input) and the
>   `b3d-death` latching bug behind it, #10 (`aircraftMapping` ignored its
>   config), #11 (probe and ambient watchdog measuring during load), #12 (the sky
>   ignored the water you were under).

**Aircraft that fly like aircraft, and the substrate for volumetric terrain.**
No peer-dependency changes, but this is a **behaviour** release: the throttle,
the right stick and the on-screen gamepad all work differently, and one
attribute was renamed. Read the ⚠️ Breaking block before upgrading a scene that
was tuned around the old feel.

## ⚠️ Breaking

- **`canonicalize` now drops the CONTENT node's scene transform, so a model
  placed away from the origin in its source file lands differently.** The
  contract always said it "drops the node's SCENE transform" and it only ever
  zeroed the node it was handed — on the glTF path that is `__root__`, the
  loader's own wrapper — while the authored object underneath kept its scene
  placement.

  **Who is affected:** anyone whose model sits somewhere other than the origin
  inside its `.glb` AND who compensated for the resulting offset. The
  compensation is now doubled.

  **How it shows up:** the control node used to sit a fixed distance from the
  airframe it steers (1.7 m for our own scout), so collision rays started beside
  the model and a `_centerOfGravity` marker measured against the control node
  folded that offset into the PIVOT. The perverse consequence: a marker authored
  dead on the centreline — the documented way — installed a pivot 1.75 m out,
  while an odd-looking hand-tuned marker silently netted out correct. Our scout
  was re-exported "properly" and started crashing on every bank.

  **Migration:** author content in the model's LOCAL frame, as
  `CLAUDE.md` has always said, and delete compensating offsets. If a vehicle
  now flies or pivots oddly, look for a marker or a placement that was tuned
  against the old behaviour before assuming a regression. Models authored at the
  origin (the common case) are unaffected.

- **Angles in the AUTHORING surface are DEGREES.** "We should use degrees
  everywhere. Not even mathematicians visualize radians." Two APIs took radians
  and now take degrees: `landform`'s `gulley`/`cover` `heading`, and the library
  rotation below. **Migration:** multiply by `180 / Math.PI`.
  Pure math modules (`spatial-transform`, `guidance`, `portal-transform`,
  `fly-by-wire`'s internals) keep radians deliberately — that is mathematics,
  not a dial an author turns. And `b3d-skybox`'s `azimuth` is neither: it is
  Babylon's 0–1 fraction of a turn, passed straight through, now documented as
  such rather than left to be guessed at.
- **⚠️ `library.instantiate()` / `library.make.*` rotation: WAS IGNORED, now
  works — and is DEGREES.** The single most disruptive change in this release,
  because it is the only one that can move a scene which previously looked
  **correct**. Everything else here either errors or looks obviously wrong.

  Two things happened to one option:

  1. **It never applied on the default path.** `instantiate()` wrote
     `result.rotation`, but Babylon's glTF loader always assigns a
     `rotationQuaternion`, and a `TransformNode` ignores `.rotation` while one is
     present. Measured on a real model: `ry: 0`, `ry: 140` and `ry: -90` gave
     **bit-identical** orientations — you got the GLB's own baked rotation
     whatever you asked for. `position` worked, which is precisely what made it
     look wired up. (`canonical: true` was unaffected throughout.)
  2. **It is now degrees**, matching `AbstractMesh`'s `rx`/`ry`/`rz` and
     `el.make.*`. The library was the only surface in the framework that
     disagreed, and a bare number is valid in either unit — so it failed by
     producing a different orientation rather than an error. It got past us in
     this repo's own collision demo, where `ry: 140` meant 140 radians.

  **Migration.** If you passed rotation and it _appeared_ to work, it was not
  your value doing it — something else was (baked rotation in the model, a parent
  transform, a compensating tweak downstream), and that compensation is now
  **doubled up**. Check every placement before calling it a regression. If you
  passed rotation and gave up because nothing happened, it works now: your values
  are radians, so multiply by `180 / Math.PI`. If you never passed rotation,
  nothing changes. Quickest triage: grep for `instantiate(` and `make.` with an
  `r[xyz]` key — no hits means this does not apply to you.

  See `Migration.md`, which ships inside the package.

- **`b3dPatch` / `B3dPatch` are removed.** The volumetric-patch element stitched
  an SDF extraction into the heightfield and never worked: two surfaces meeting
  at a grazing angle have no well-defined boundary, so every fix aimed at one
  crossing created another elsewhere. It shipped EXPERIMENTAL and undemoed, and
  the design that replaces it (TUNNEL-DESIGN.md) removes the boundary rather
  than reconciling it. The pure modules it was built on — `carve.*`,
  `sdf-lattice`, `patch-field` — are **kept**: they are the substrate the
  replacement uses.

- **`hudChase` → `hudChaseOff`, with the polarity inverted.** The old attribute
  is gone (no alias — HTML boolean semantics can't express a default-true flag,
  which is why the negative name exists). It shipped in 0.6.2's `dist`, and
  because tosijs props end in an index signature a stale `hudChase` **compiles
  and is silently ignored**, so this will not error for you.
  - `hudChase: true` → delete it; the chase HUD is now the default.
  - `hudChase: false` → `hudChaseOff: true`.
  - Chase view now shows the HUD **without the artificial horizon** (which
    only tells the truth from inside the cockpit).
- **The glass gamepad hides itself** once a **keyboard or hardware gamepad** is
  used, returning after `idleSeconds` (10) of silence. The POINTER never fades
  it — not touch, not mouse, not trackpad: the pad is operable by pointer, so
  fading on pointer movement made it vanish exactly as you reached for it.
  Set `fade="off"` to pin it — worth knowing if you screenshot or demo.
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

## Added

- **Re-seat is now a two-step, confirmed gesture — and it finally works.**
  Re-seating takes your CURRENT head yaw as forward, but you had to LOOK AT the
  button to press it, so a panel that had drifted left re-seated you facing
  left: the gesture defeated itself exactly when you needed it. Pressing
  **Re-seat** now raises a prompt pinned to the **face frame** (head-locked, so
  it stays readable WHILE you turn your head — the one case that earns
  face-locking): _1. Look comfortably ahead. 2. Pull right trigger to reseat.
  Or, pull left trigger to cancel._ The yaw is captured on the trigger, from
  wherever you are looking THEN.
  - **`reseatFreeze`** (new `<tosi-b3d>` attribute, `'on' | 'off'`, default
    `'on'`) freezes the clock while the prompt is up, so you are not shot mid
    re-seat. **Set `'off'` for multiplayer** — freezing is a decision a local
    world can make and a networked one cannot honour. The dialog always gates
    YOUR input (`b3d.suppressInput`), which is the half that works in any
    topology, so the trigger that confirms never also fires your gun.
  - `b3d.freeze(on)` and `b3d.suppressInput(on)` are public: a modal that
    borrows a control you also play with can use them. `freeze()` stops the
    clock without raising the pause panel and without pause's resume semantics
    — a scene paused underneath stays paused.
- **The package is licensed** — **Apache-2.0**, with a LICENSE file, plus
  `description`, `homepage` and `bugs`. Every release since 0.2.1 shipped with
  no licence at all, which legally means all-rights-reserved: SCA tooling flags
  an unknown-licence dependency, and adopters consuming this as a `file:` dep
  had nothing to point at. Apache-2.0 rather than MIT/BSD for the explicit
  patent grant and retaliation clause.
- **A `startPaused` scene renders its own fog, not Babylon's default** (#31). A
  paused frame still RENDERS — that is the point, the panel has to be visible —
  so everything the render reads has to be correct. `_updateFog` sat past the
  paused branch's early return and `startPaused` pauses in the same synchronous
  setup block, so a scene that booted paused had never run it once.
- **Entering VR unpauses a paused scene.** Putting the headset on is the resume
  — and a world you deliberately stepped into has no reason to be frozen. It
  also removed a broken state: entering while paused showed no pause panel
  in-session, so you arrived in a stopped world with no visible way out. You can
  still pause in VR from the scene panel's transport toggle.
- **Camera-relative dialogs are no longer buried by the world.** The respawn and
  pause panels could end up inside terrain — you die on a hillside and the panel
  offering you a way out is in the hill. They now render in group 1 (drawn after
  the scene, depth auto-cleared between groups), so a modal is always readable.
  World-anchored panels and popups keep normal depth sorting.
- **VR altitude on the BUMPERS** — left down, right up, analog (squeeze
  pressure, so you can ease onto a height). Same hand logic as brake/accelerate
  on the triggers. The right stick's vertical still flies, but it doubles as
  panel scroll, so in any scene with a scrollable panel open — most demos — the
  stick scrolled and the rig did not move, and altitude appeared to be missing
  entirely. Two dedicated buttons cannot be stolen by a panel.
- **Pause/resume in the standard scene panel.** Pause was a one-way door: the
  pause panel offers _Continue_, so it was a state you could LEAVE and never
  ENTER — nothing in the panel stopped a running scene, and `startPaused` is an
  initial condition, not a control. The icon bar now carries a transport toggle
  (`play` when paused, `pause` when running — it shows what pressing it DOES,
  not what the scene currently is). It is a panel GADGET, so it appears in the
  flat overlay **and** the in-VR panel from one definition, and in a headset it
  is the only way to stop the world at all.
- **Status surfaces in the theme** — `--w3d-info`, `--w3d-warning`,
  `--w3d-error` (`w3dTheme.info` / `.warning` / `.error`). Backgrounds, not text
  colours: a status panel in a dark theme is a tinted SURFACE that `text` still
  reads on, and the bright hue you would put on a label is unreadable behind
  one. Opaque on purpose, so the panel underneath cannot show through the
  message interrupting you.
- **`markUiMesh()` / `isNoCollide()`** (`b3d-utils`) — mark a mesh as UI:
  pointer-pickable, but invisible to COLLISION. See the phantom-collision fix
  below for why those are different questions. The first of the collision
  GROUPS described in the new `COLLISION-DESIGN.md`.
- **`xrFrame`** on `<tosi-b3d-svg-plane>` — when `cameraRelative` and in a
  headset, ride an XR reference frame instead of the head camera. `'body'`
  (damped yaw) keeps a panel in front of you without jittering on every head
  movement; leave it unset for a HUD that should stay head-locked.
- **A diagnostic ring buffer** — `b3d.logDebug(tag, event)`,
  `b3d.debugCapture(tag)`, `b3d.debugLog`. There is no console in a headset and
  `window.rAF` is suspended in-session, so this records structured events IN the
  page for readback afterwards. Plus always-on Perf-panel rows: **aircraft
  ground** (what the ground ray is calling ground, and a full crash report) and
  **xr input** (per-hand thumbstick axes, rig pose, movement scale).

- **Popups are their own SURFACES — `el.openPopup()`** (`popup-surface`). A menu,
  a dropdown's list or a debug readout spawns a second plane above its opener
  rather than being laid out inside its SVG. Owned popups travel and die with
  their opener; `tearOff()` promotes one to world space preserving pose, after
  which it stays where you put it — and **dragging an owned popup tears it off**,
  like pulling a tab out of a window. Click-to-front, `modal` (blocks pointer
  access to what's behind it, never the camera), a title-bar grip so the rest of
  the panel can stay interactive, and injected move/close glyphs.

  This retired a constraint we had recorded as absolute: a dropdown "MUST grow
  the panel's layout … because a popover won't rasterize into the VR texture".
  True of a popover inside ONE texture; the escape is another texture on another
  plane. See `UI-DESIGN-NOTES.md`.

- **`rounded-rect` + `cornerRadius` / `transparent` on `b3d-svg-plane`** — rounded
  corners as GEOMETRY so a UI panel can be **opaque**. A transparent mesh is not
  depth-written, so Babylon re-sorts it per frame by camera distance and
  near-coplanar panels flip order as you orbit: it looks exactly like z-fighting
  and no amount of correct depth ordering fixes it. Three quads plus four
  quarter-disc fans, 22 triangles at 4 segments. **The general rule: in 3D,
  express shape as geometry and reserve alpha for things that are genuinely
  see-through.**

- **`el.make.*`** (`make-mesh`) — Babylon primitives with the forgettable parts
  done: material from `color`/`glow`, `register()` so the sun and reflection
  probes see it, and `computeWorldMatrix` (a mesh positioned but never rendered
  has no world matrix, so a ray cast this frame finds it AT THE ORIGIN and
  answers confidently and wrongly). A Proxy forwarding to `MeshBuilder`, so all
  26 shapes are reachable plus whatever Babylon adds later.

- **`library.make.<name>()`** — a library's contents as callable names,
  `lib.make.scout({ y: 1 })`. Same option vocabulary as `el.make.*`.

- **`glow` / `glowColor` on `b3dBox` / `b3dSphere`** — self-illumination as a
  fraction of `color`. Both primitives now share one `primitiveMaterial`, which
  is how the sphere came to be missing `glow` ninety seconds after the box got
  it.

- **`B3d.BABYLON` (static) and `BABYLON` re-exported from the barrel.** Babylon
  is a PEER dependency, so a consumer importing `@babylonjs/core` separately can
  end up with a second copy — two `Vector3` classes that fail `instanceof`
  against each other. Taking it from the library that already holds one is the
  guarantee.

- **`shadowNormalBias` / `shadowBias` on `b3dSun`**, defaulting to `0.05`.
  Babylon's CSM ships `normalBias: 0`, which is not a tuned value for a large
  receiver: a 40×40 ground self-shadowed into a dense stipple across its whole
  surface. Measured at 0 / 0.02 / 0.05 on a live scene.

- **`b3d-collisions` gains its first live demo** — hail on the scout, impacts
  found by a SWEPT ray, each marked with a disc lying on the surface plus a
  stalk along the normal. Ground hits count too, in a cooler colour.

- **`b3d-aircraft` gains `chasePitchFollow` / `chasePitchLag`** — how much of the
  nose's pitch the chase camera inherits. `0` (default) keeps the level pivot;
  `1` is as if the camera were bolted to the airframe. A dial rather than a
  reparent, because the flat pivot is what fixed the jittery chase, and the lag
  term is what passes the intention while dropping the per-frame wobble.

- **`b3d-aircraft` gains `maxPitch` / `maxDive`** (#26). Pitch authority was a
  module constant at a symmetric 35° — a gentle airliner descent, unreachable by
  any adopter, and unable to express a craft that should fall out of the sky
  readily and climb reluctantly. `maxDive` defaults to `maxPitch`, so nothing
  changes unless asked.

- **⚠️ EXPERIMENTAL — `portalTransform`**: see-through portal math (virtual
  camera pose, the oblique clip plane, a step-test crossing, and recursion
  budgeted by a falloff CURVE rather than a hard depth limit — linear, geometric
  or accelerating, so first-bounce quality and pass count stop being welded
  together).
- **Sedimentary strata** in the volcanic rock (`strata`, `strataScale`,
  `strataTilt`), visible on any cut face — only possible because the plate noise
  is now sampled in 3D, since bedding means nothing to a shader that knows only
  x/z.
- **Carved landforms** — the `sdf-lattice` page is now a real doc page with the
  theory (SDF composition, marching cubes vs dual contouring vs surface nets, and
  why this uses surface nets), a **volcano in cross-section** with lava tubes and
  a sweeping cutaway, and a **volumetric-vs-heightfield comparison** with a bore
  punched through an authored ridge. `demo-utils.volumetricDemo` is the shared
  fixture behind both.

- **⚠️ EXPERIMENTAL — `portalTransform`**, the pure math for see-through
  portals: `portalCamera` (where the render-target camera goes so a doorway
  shows another place), `clipPlaneFor` (the oblique near plane, without which
  the far room leaks into the doorway), `crossedPortal` (a _step_ test — a jeep
  is past a doorway within one frame, and a context swap one frame late is one
  frame of the wrong world), and `depthLimit`/`attenuationAt` for recursion.

  Recursion terminates the way real mirrors do — each traversal is slightly
  lossy, so the tunnel darkens instead of hitting a hard cutoff that pops.
  Calibration worth knowing: **real glass is ~95% transmissive**, which is why
  mirror corridors look infinite — at 0.95 it takes 77 bounces to fall below 2%.
  So the physics gives the right look and a useless budget; the device cap is
  load-bearing, and a portal that should visibly fade out has to be markedly
  dirtier than glass (~0.5–0.7). That trade is documented rather than hidden
  behind a physical-sounding parameter.

  The falloff is a **curve, not a ratio** — `geometricFalloff`, `linearFalloff`
  (state the level count instead of solving for it: `0.1` means exactly ten) and
  `acceleratingFalloff` (the loss grows with depth — dirtier where nobody
  looks). That decoupling is the point: geometric-at-0.95 and
  accelerating-from-0.05 keep an identical 95% at the first bounce, the one
  anyone actually inspects, but cost **77 levels versus 5**.

  No renderer yet: applying the clip plane, the passes and stencil framing are
  deliberately out of scope for a pure module.

- **⚠️ EXPERIMENTAL — `MediumOptics` + `fogLayerFor`** (MEDIUM-DESIGN.md §3).
  A medium can describe how it LOOKS (colour, density, murk-with-depth,
  visibility floor), and one derivation turns that into a fog layer for the
  compositor that already exists. Weight is `submergence`, so the fog and
  anything else keyed off the same medium cannot disagree about where the
  surface is — that disagreement is what produced the fogged-sky vs
  transparent-window conflict.

  **Not load-bearing yet, on purpose.** `b3d-water` publishes its optics but
  still computes its own fog layer, because that path is verified and swapping
  it is a visual change that wants an eye on it. What's proven so far is the
  falsifier from the design doc: one derivation reproduces water's numbers
  (including thickening with depth), a cloud bank's soft edge, and vacuum
  contributing nothing. Three hand-rolled contributions collapse onto it _in
  the tests_; collapsing them in the code is the next step.

- **Projectiles understand medium** (#13 — ⚠️ EXPERIMENTAL, unflown). A round
  now picks up drag from whatever it is passing through (`dragAt`, blended
  across the band so entry is a ramp), and gains three options that turn the
  same round into four weapons:

  - `whenCrossing(kind, medium, at)` — the entry splash, the breakout plume,
    the audio. Yours to dress; the engine only tells you it happened.
  - `detonateDepth` — a **depth charge**: a fuse on depth rather than impact.
  - `stayIn: 'water'` — a **torpedo**, for which the surface is a ceiling. Held
    just inside rather than reflected: a round that bounces off water reads as a
    skipping stone, which is a different weapon.

  A **sub-launched missile** needs no option at all — it is a `whenCrossing`
  handler that swaps its own behaviour on `'exited'`. That the four fall out of
  three small options is the argument for the primitive being shared rather than
  per-weapon.

- **[medium](https://3d.tosijs.net/medium/) — the substance you're moving
  through**, pure and Babylon-free (#13, and the seam #3/#15/#16 were all
  converging on). It answers three questions and owns nothing else: how deep am
  I (`depthIn`, signed — depth and altitude are one measurement), how much of me
  is in it (`submergence`, smoothed across a band), and did I just cross the
  surface (`crossing`, a _step_ test, because at 200 m/s a round is above the
  water one frame and 3 m under it the next).

  - **Two geometries**: `plane` (a sea, a fog bank, the top of a mercury vat)
    and `sphere` (a planet's ocean or atmosphere, the edge of space). A plane is
    NOT a very large sphere — at a 6371 km radius the arithmetic loses the
    centimetres that decide whether you're above or below a wave.
  - `innermost` resolves space → air → water the way you'd say it aloud, and
    vacuum is simply the absence of a match. `dragAt` blends a projectile's drag
    coefficient across the band, which is why depth charges and torpedoes need
    no new integrator.
  - **`b3d.media` / `b3d.addMedium()`**, and `b3d-water` registers itself — so
    nothing has to re-derive where the surface is. Two subsystems deriving that
    separately is exactly how the fogged sky and the transparent window ended up
    disagreeing (#12/#15).

- **`b3d-ambient` spawns where you're LOOKING and where you're GOING** (#17,
  #18): `lookAhead` (0.35 of `radius`, along the view) and `lead` (0.25s of
  travel, along motion), capped by `speedCap`. A camera sees a frustum, not a
  sphere, so a box centred on the eye births most of its particles behind and
  beside you — they live and are culled unseen, paying full budget for a
  fraction of the result — and at speed you outrun the box entirely, emptying
  the view ahead exactly when you want it fullest. Velocity is measured from the
  camera's own displacement, so nothing has to be plumbed in; in a chase view
  that's the right signal anyway. Set either to 0 for the old centred box.

- **`b3d-destroyable` takes `library` + `meshName`** (#22) — a static,
  destroyable thing that uses a library mesh is most of what populates a level,
  and there was no route to it: `b3d-loader` takes a `url` (which also loses the
  canonical frame), `b3d-aircraft` gets the frame right but flies. Absent
  `library`, you still get the placeholder cube, so nothing existing changes.
  The model is left **pickable** on purpose — damage resolves from the warhead
  gathering destroyables near the detonation, not from which mesh the ray hit,
  so the model can simply be the target and the hidden-cube-plus-skin dance
  isn't needed.
- **`spawnProjectile`/`spawnMissile` take a `mesh`** (#19) — draw the round as
  an authored model, with the engine still owning motion, collision, lifetime
  and disposal. It is also **oriented along velocity**, which a sphere never
  needed: the engine moved a sphere, a sphere has no facing, so a modelled
  missile flew sideways. Yaw and pitch only — a round has no reason to bank.
  Supplied meshes and their children are made non-pickable, like the default.

- **`panelFitWidth(fov, aspect, z, want, fill)`** — how wide a camera-relative
  panel may be and stay on screen. Shared because there are two such panels and
  a constant copied into both is a constant that will disagree with itself.

- **PAUSE — ⚠️ EXPERIMENTAL.** The flat path is confirmed on a real browser
  (start paused, continue, background, return, repeat) but the VR path — the
  Continue tap carrying the user gesture into `enterXRAsync`, and removing the
  headset pausing — is **unvalidated**, and it is the reason the feature exists.
  Treat the API as unsettled until it's been through a headset; nothing else
  depends on it.

  `b3d.pause(reason)` / `.resume()` / `.togglePause()` / `.paused`,
  a centred in-scene pause panel, and the attributes around them:

  - `pauseWhenHidden` (default **on**) — backgrounding the tab holds the scene,
    so a player returns to a held frame and a panel rather than to a world that
    carried on without them. Suppressed while immersive, since some browsers
    report the page hidden during an XR session.
  - `startPaused` — come up paused: the "press Start" shape.
  - `enterXrOnResume` — resume enters VR, and leaving VR pauses. **This is why
    starting paused matters**: `enterXRAsync` requires a user gesture, so a
    scene that tried to enter XR on load would simply be refused. The Continue
    tap is the gesture, which makes "leave it paused, put the headset on, press
    Continue" the only shape that reliably works.
  - `pausePanel(host, resume)` — replace the default rows (a title and Continue)
    with your own: a title screen, settings, a "you were away" summary. `resume`
    is handed in, because a pause panel with no way out is the failure this
    feature exists to prevent.
  - `pause` / `resume` / `orientation` events. `pause` carries a `reason`
    (`'user' | 'hidden' | 'xr' | 'start'`) so a game can tell "the player asked"
    from "the tab went away". `orientation` is derived from the **viewport**
    (`innerWidth`/`innerHeight` swapping), not from `screen.orientation` — that
    API is patchy on iOS, so a scene depending on it hears nothing on the
    devices that rotate most; it's still read for `type`/`angle` when present,
    as detail rather than trigger. Fires only when the classification actually
    flips, so dragging a desktop window edge isn't a rotation.

  Rendering continues while paused — the panel has to be drawn and picked —
  but nothing advances: no combat tick, no fog, no `update` hook, and
  controllables read empty input, so a held stick can't steer a stopped world.
  Orientation changes are **reported, not acted on**: a rotating phone is
  sometimes a pause and sometimes nothing, and only the game knows which. (Tilt
  is a separate, permissioned API on iOS and deliberately untouched.)

- **The stick sign contract is now a test** (`stick-sign.test.ts`) — every
  source must report **up/forward as positive**, and all of them must agree.
  This was documented in three places and enforced in none, which is what let
  #14 run for a day: a source that disagrees is internally consistent, so only
  a player with two devices notices, and what they report is "the framework is
  broken". Verified by deliberately flipping the touch and hardware signs in
  turn and watching it fail. `STICK_UP_IS_POSITIVE` names the convention.
- **`GamepadSource.kind`** — a stable `'keyboard' | 'hardware' | 'touch' | 'xr'
| 'glass'` marker, because the obvious alternative fails silently: an adopter
  matched our glass pad with `constructor.name`, their bundler mangled it, the
  lookup never matched, and every experiment built on it was a no-op that
  looked like a result. Class names are not API.

- **A gamepad gadget in the gear panel** — one tap to pin the glass pad visible
  or hand it back to the auto-hide. The fade is production-correct and
  development-hostile: once a mouse or trackpad is present the pad goes away and
  doesn't come back, so checking it on a laptop meant switching Chrome into
  responsive mode. It sits in the same icon bar as the debug tools, so it works
  in a headset too. `B3dGamepad.setFade()` / `.hidden` are the API behind it.

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

## Changed

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

## Fixed

- **Phantom collisions: an aircraft "collided with something it was nowhere
  near".** Flying high, banking in cockpit view, you died instantly — in any
  scene, terrain or not. The impact sweep was hitting the **spatial UI panel**
  floating in front of the cockpit and treating it as terrain, and that sweep
  crashes on ANY hit above `crashSpeed` with no slope test. It only bit in
  cockpit view (that is where the camera, and the panels riding its reference
  frames, sit inside a ~2m sweep) and fired on bank (which swings the velocity
  vector into the panel). A panel must stay `isPickable` — that is how a
  controller ray targets it — so the fix separates the two questions:
  `markUiMesh` marks it collision-invisible, and both aircraft predicates filter
  it.
- **Collision rays fired from `node.position`.** Under a `_centerOfGravity`
  pivot that is the STANCE ORIGIN, not where the airframe is — the model swings
  about the CoG under attitude, so banking moved the aircraft out from under its
  own rays. Both rays now go through the world matrix, which is bit-identical to
  `node.position` when there is no pivot.
- **`canonicalize` did not drop the CONTENT node's scene transform** — see
  ⚠️ Breaking above. This is also why the scout's centre of gravity appeared
  wrong.
- **Ambient effects could never recover from a pool of zero.** The watchdog
  bailed one line before the recovery path written for exactly that state, so a
  scene that shed its garnish to nothing stayed dead for the session — no
  leaves, bubbles or motes on hardware that had been drawing them a second
  earlier.
- **VR: exiting dropped the flat camera's altitude.** Babylon carries the walked
  headset pose back into the non-XR camera, which for an orbit camera recomputes
  a low angle — you left VR looking at the scene from the floor. The orbit state
  is now snapshotted on entry and restored on exit; free/walkable cameras keep
  the carry-back.
- **VR: orbit demos dropped you in facing a random direction.** Both piloted
  paths seeded the rig's yaw against your head; free locomotion never did, so a
  demo with no piloted entity left the panel behind you and the subject out of
  sight. Now seeded on the first frame with a real viewer pose, facing what the
  flat camera was looking at.
- **VR: re-seat did nothing in an aircraft's chase view.** Three camera paths
  capture yaw separately and re-seat only re-armed two; toggling cockpit↔chase
  appeared to "fix" it because the view-change path re-armed the third.
- **VR: locomotion was scale-blind.** Free-fly walked at a fixed 2.5 m/s, which
  in a 512-unit landscape is ~0.5% of the scene per second — indistinguishable
  from a broken stick, while turning (angular, therefore scale-free) felt fine.
  Speed now scales with the orbit camera's radius; small demos are unchanged.
- **VR: the grid floor sat at the world origin**, so in any scene whose subject
  is elsewhere it read as a mystery grid off in the distance, visible only in
  VR. It now sits under the subject.
- **VR: the respawn panel was pinned to your face and jittered** with every head
  movement. It rides the `body` frame now.
- **`bun run typecheck` was red at the release commit** — a one-argument call to
  a three-argument `canonicalize` in a test, invisible to `bun test` (which
  strips types) and to the build tsconfig (which excludes test files).

- **Shadow acne on large receivers** — see `shadowNormalBias` above. It was also
  why scenes looked dull: the stipple darkened roughly half the ground.

- **`b3d-svg-plane` cleared a parent it never set.** Its `cameraRelative` sync ran
  `mesh.parent = null` unconditionally whenever the flag was off, so anything
  parented to a plane was silently torn off a frame later, with no error. Same
  shape as the pause bug below: **a guard must record what you DID, not observe
  what state the object is in.**

- **The glass gamepad no longer fades when you move the mouse.** It is operable
  by pointer — `pointerdown` drives the sticks — so it vanished exactly as you
  reached for it. Only a keypress or a physical gamepad fades it now.

- **`publicName` leaked loader and Blender artifacts.** The library picker showed
  `building_collideCylinder_primitive0`; `_primitiveN` is the glTF loader
  splitting a multi-material mesh, and Blender's `.001` sat AFTER the behaviour
  suffix so no `endsWith` matched it. `.001` is preserved (it is a different
  object) while the annotation is removed.

- **`ry` is DEGREES, and now says so.** `AbstractMesh.render()` multiplies
  rx/ry/rz by `DEG_TO_RAD`; nothing documented it, and the b3d pause demo had
  been adding radians per second for its whole life — about one revolution per
  ten minutes, which read as "the cube doesn't spin".

- **Impacts now report the surface NORMAL, not just the point** (#29) —
  `spawnProjectile`/`spawnMissile` take `whenImpact({ point, normal, mesh })`.
  The swept ray already computed the normal and the launcher was throwing it
  away, so anything that wanted an oriented effect (a scorch mark, a dent, a
  ricochet) had to re-cast the same ray to get it back. `normal`/`mesh` are
  `null` when there is genuinely no surface — a depth fuse in open water, a
  timed round in mid-air. The old `onImpact(point)` still fires with a one-shot
  deprecation warning; it was renamed off the `on*` prefix because such a key
  becomes an `addEventListener` call the moment the shape is lifted onto an
  element, and then silently never runs.
- **Pause didn't pause** (#30) — an adopter measured a player travelling 66.58 m
  during a 3-second pause with `paused === true` throughout. Two clocks leaked,
  not one. `sceneDelta` accepted a published frame delta only when `> 0`, so the
  one value meaning "stopped" was the one value it discarded, falling back to
  the live engine clock — everything on the render observable (projectiles,
  water, ambient) kept running. And `B3dControllable` runs its own `Date.now`
  clock that a stopped scene delta cannot reach: it was fed empty input, but
  with no input an aircraft COASTS, which is indistinguishable from cruising. A
  paused scene now publishes a delta of zero and controllables halt outright.
- **Blasts could not see library-backed destroyables** (#28) — a third
  consequence of `library`. `detonateWarhead` resolved targets with
  `scene.getMeshByName`, which searches meshes only, so a `library`
  destroyable's TransformNode root was filtered out of every AOE. manta measured
  it at 4 of 4 targets. It now uses the element's own node, which was always
  right there.

- **`library` + `explode` on a destroyable was a guaranteed crash** (#24) — and a
  nasty one. The exploder read vertex buffers off whatever it was handed, and a
  library instance's root is a geometry-less transform node. Worse than a throw:
  it happened inside a render observer, so every observer after it was skipped —
  camera follow, flight integration, all of it — and the scene stopped advancing
  while input kept responding. It presents as "the game seized but the controls
  still work". `explodeMesh` now takes a `TransformNode` and shatters the
  descendants that have geometry (a multi-part model comes apart properly instead
  of one piece shattering while the rest hangs in the air), warns once rather than
  throwing when there is nothing to shatter, and the death path wraps the call
  because a cosmetic must never be able to stop the frame loop.
- **Mutual death produced no death panel** (#25). The already-dying _recovery_
  added in 0.7.0 ran before the "only OUR death matters" filter, so any other
  entity dying while the player was dead tore the panel down — ram an enemy and
  you both die, and you got nothing. Relevance is checked first now.

- **Volcanic veins were absent from every vertical surface** (3D Worley), the
  **rock stopped warming** at dark brown so a fully volcanic face read as black,
  **verticals could never exceed stage 2** so the top of the ladder was
  unreachable on a cliff or cut face, and the **glow pulse touched only the
  molten channel** — a fraction of a fraction, which is invisible in practice.

- **Volcanic veins were missing from every vertical surface.** The plate pattern
  was sampled from world **XZ only**, so a cliff or a cut face barely moves
  through the noise — its xz coordinate is near-constant across the surface —
  and you got vertical streaks instead of a vein web. Now sampled with a true
  **3D Worley**, which costs the same neighbourhood as blending three 2D
  projections (27 cells either way, a 3-wide hash instead of 2-wide) and is
  strictly better: no projection seams, no ghosting where planes blend, and a
  cut face shows the veins' real cross-sections because the veins are genuinely
  three-dimensional. Only the volcanism branch reaches it, so non-volcanic
  surfaces pay nothing.

- **The HUD circle dominated a portrait viewport.** It was already sized off the
  _smaller_ dimension — that part was right — but a single percentage of the
  small side means 36% of the width in landscape and **70% of it in portrait**,
  the same rule with twice the visual weight. It's now capped at half that
  fraction of the long side as well, so turning the device doesn't change how
  much of the screen the circle eats: measured 490px (was 499) at 1400x713, and
  265px (was 350) at 500x757. `hudSizePx` in `hud-math.ts`, unit-tested.

- **`b3d-death`'s Respawn panel had both of the pause panel's problems**, and at
  a worse moment. Its spectator camera was attached to the canvas, so a tap
  meant for Respawn also drove the camera (Tonio, on a phone: _"the view
  pivots"_), and it used the same fixed 1.1-unit width that overflows a portrait
  viewport. The camera is now set with `{ attach: false }` — the orbit still
  runs, it's driven by an observable, you just can't wrestle it — and the width
  comes from the camera's FOV and aspect via the shared `panelFitWidth`.

- **The pause panel fought the camera for your tap.** It lives in the scene, so
  a press on it is also a press on the canvas, and the camera's input got it
  too: on a phone the first attempt to press Continue read as a pinch-zoom,
  which moved the camera through the panel and hid it, so the button had to be
  un-zoomed back into reach. The camera is now detached while the panel is up
  (which is also what "paused" ought to mean) and restored on resume.
- **The pause panel was wider than a phone's viewport.** Sized at a fixed 1.1
  world units, it fits a 16:9 monitor and overflows a portrait phone — at the
  default FOV only ~0.86 units are visible across, so the edges and the button
  sat off-screen. It now derives its width from the camera's real FOV and
  aspect. `panel-fit.test.ts` pins it, including the portrait case that broke.

- **`B3dGamepad.fade` was read once at connect**, so toggling it at runtime did
  nothing in either direction — including from a `scenePanel` toggle, which is
  this repo's own recommended way to expose a tweakable. A settings control that
  silently does nothing is worse than no control. Now evaluated live, and
  `setFade()` reconciles on the tap rather than on the next pointer move.

- **A guided missile consumed the caller's `guide` hook** (#13), so a game could
  give medium behaviour — water drag, a depth floor — to a dumb shell but not to
  a missile. The seeker is now a named function the caller's hook composes with,
  and the caller runs **last** so it can constrain what homing asked for: the
  seeker wants to go fast, the water says no. `MissileOpts.guide` is new.

- **The sky ignored the water you were under** (#12, manta-recon: _"can't see
  anything underwater except for the skybox"_). A skybox is built
  `applyFog = false` with `infiniteDistance = true` — right in air, where a long
  fog layer would swallow it — so submerged, the fog worked on everything except
  the thing filling most of the screen. `b3d-water` now turns the sky's fog on
  while the camera is under it, keyed off the same band weight as the fog layer
  so the two can't disagree about where the surface is, and hands it back on the
  way out. Note the trap it set: turning `underwaterFog` DOWN made it worse,
  because the murk had been the only thing disguising an unfogged sky.

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
