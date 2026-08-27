# Changelog

<!--{ "order": 3 }-->

All notable changes to **tosijs-3d**. This project is pre-1.0 (`0.x`), so minor
versions may carry breaking peer-dependency changes — each is called out in a
**⚠️ Breaking** block in its version section below, with what a consumer must do.

## 0.7.3

### Added

- **⚠️ The biped uses the GTA V control layout.** Left stick moves and
  **strafes**; right stick **turns the body** and pitches. It was tank-controlled
  (left stick X turned), which nobody has muscle memory for any more and which
  left the right stick doing camera work that could not steer. Turning the body
  with the right stick makes **swim direction and body facing one thing** rather
  than two that can disagree — the thing that made look-directed swimming fiddly.
  The camera now sits straight behind the body and has no yaw of its own, so it
  cannot end up pointing somewhere the character is not. Measured: strafe moves
  4.65 m sideways with the yaw unchanged; turn rotates 34° with zero translation.
- **The biped's right stick is a LOOK control**, and jump and sneak exist.
  Tonio spotted that look-directed swimming had nothing to aim with on a flat
  screen: the right stick was bound to `cameraZoom` (Y) and a snap-back peek (X),
  so a character had no aim at all. Now `lookX`/`lookY`, **persistent rather than
  sprung** — a character's camera is how you look _around_, where the aircraft's
  springs back because there it is a glance off the flight path. A `FollowCamera`
  has no pitch of its own, so pitch is height: raise the camera and it looks down
  at its locked target. Zoom moves to the d-pad, which sneak vacated.
  - **Swim aim now reads that look** rather than integrating the stick
    separately, so "swim where you are looking" is literally true flat and is the
    same rule the headset already followed with your head.
  - **Jump** — right bumper only. `A` briefly aliased it, and Tonio removed the
    alias: the face buttons are **reserved for actions** (they are primary and
    secondary fire on the aircraft), and a control vocabulary that changes
    meaning per vehicle is one you have to relearn. The ground snap swallowed the
    first version whole — the impulse lifted the body ~7 cm, the probe still saw
    ground 0.6 m below, and the snap put it straight back, a jump that rose
    exactly 0.00 m. The snap now yields while you are rising.
  - **Standing jumps brace; running jumps fire on the press.** A running jump's
    anticipation _is the run_ — the character is already loaded and moving, so a
    wind-up can only read as a stumble. A standing jump has no run-up to borrow
    from, so holding scrubs the clip into the braced pose and **parks there**,
    and releasing launches. The hold is not a delay tax: it **scales the jump**
    (`jumpMinScale` 0.45 → full), so it is a choice rather than a wait. Measured:
    full brace 1.13 m, short hold 0.45 m, nothing at all while held.
  - **The animation is retimed to the jump, not the jump to the animation.**
    Physics stays fixed at `jumpSpeed`, and the clip's `speedRatio` is set so it
    lasts exactly the flight time. Measured: `running-jump` plays at **1.02×**
    (0.93 s clip over 0.92 s of flight). The first attempt had this backwards —
    sizing the launch from the clip length — which made the jump a consequence of
    whatever the animator exported.
  - The jump clip holds for the **whole airborne period**, and the clip is chosen
    at the press and never re-picked, so a standing jump cannot switch to the
    running clip in mid-air.
  - **Sneak** — left bumper, a **toggle on land and a held control in water**: a
    stance you adopt for a while versus a thing you do continuously, and a toggle
    whose state you must remember with your head underwater is worse than useless.
- **`ualAnimationStates()`** — the clip-name map for Quaternius UAL rigs, so
  adopting that library is one line rather than twelve hand-written states. It
  retires two fakes: `walkBackwards` becomes a real `Jog_Bwd_Loop` instead of
  the walk cycle played in reverse, and `sneak` gets a `Crouch_Idle_Loop` that
  holds at rest. `Jump_Start` / `Jump_Loop` / `Jump_Land` are mapped separately,
  which is what will let the jump's brace genuinely hold rather than scrubbing a
  one-shot — addressable now, not yet wired.
- **⚠️ The `tosi-b3d` demo uses a 1.83 m rig** from the CDN
  (`quaternius/UAL1_core.glb`) instead of `omnidude.glb`, which measured
  **0.88 m** — half human scale. **Camera framing roughly doubled** to match
  (`cameraHeightOffset`, `cameraTargetHeight`, follow distances): that is the one
  part of the tuning genuinely scale-bound, because it is in metres. Everything
  else — run speed, step height, jump, the collision ellipsoid — was already
  human-scale and is now _correct_ rather than needing adjustment. A project
  using its own small rig will want the camera numbers back down.
- **The biped swims.** Water was already a medium rather than a boundary line
  (underwater fog with a continuous crossing); the biped now treats it as one
  too. Tonio: _"can we change the rate at which the biped falls in water. And
  while we are at it the biped could learn to tread water and swim."_ Both
  animations were already in the standard set, so this is one equation plus
  wiring.
  - **`buoyancy.ts`** — pure, tested. A body is slightly less dense than water,
    so it is pushed up in proportion to how much of it is submerged and rests
    where that balances its weight. Everything readable falls out of that one
    equation instead of being special-cased: plunge-and-bob when you drop in, a
    head that ends up **above** the surface (equilibrium is partial submersion —
    nothing targets a head height), and wading that does nothing until the water
    is deep enough to lift you. Sinking is ~1.5 m/s against ~20 m/s in air, and
    drag blends by submersion rather than switching at the waterline, so
    crossing the surface does not read as bouncing off it.
  - **Swimming is deep enough AND not resting on the floor** — _resting on_,
    not _within reach of_. The first version asked "is there ground below me?"
    and left the character standing on the seabed under six metres of water.
    The floor stops you sinking; it does not hold you down.
  - `swim` while moving, `tread-water` while holding station.
  - **Fixed after report: swimming broke when you pitched and turned at once.**
    The body's yaw was read back out of the _pitched_ matrix, and
    `atan2(forward.x, forward.z)` is ill-conditioned there — at 70° the
    horizontal part is scaled by `cos 70° = 0.34`, so x and z collapse toward
    zero, the recovered yaw gets noisy, and writing it straight back compounds
    the noise into a body that wanders. The yaw is now **captured once from the
    level matrix** and integrated from the turn input thereafter, so the only
    reading happens while well conditioned. It hid because pitching _and_
    turning together is one stick on a controller and two hands on a keyboard.
  - Also fixed: the **mouse wheel** still fed `rightStickY`, which had become
    `lookY` — so a scroll tipped the swimmer, since the swim aim is the look
    pitch. It feeds the zoom axis now, so "the wheel zooms" survives remapping.
  - **Look-directed swimming** (`swim-aim.ts`, pure + tested): the BODY pitches,
    and the stroke follows for free — the biped already swims along its own
    forward vector, so there is no separate vertical term and no way for aim and
    motion to disagree. Aim comes from your **head** in a headset, and from the
    right stick flat, because the biped's `FollowCamera` has a fixed pitch and
    there is nothing to read. The stick **integrates** rather than mapping to an
    absolute angle, so releasing it holds the descent instead of springing back
    to level. Leaving the water unwinds the pitch on its own.
  - **You can dive.** `sneak` down, `jump` up — crouch-to-descend matches the
    GTA-V control vocabulary this project follows and leaves the triggers free.
    Thrust competes with buoyancy rather than replacing it, so letting go hands
    the vertical back to physics instead of pinning you.
  - **Released, you HOLD depth and drift up slowly** rather than corking to the
    surface (Tonio's call). Once your head is properly under, buoyancy blends
    toward neutral — but stays just above 1, so you surface if you stop paying
    attention. You also glide a little deeper after letting go: that is
    momentum, and letting go is not a brake. Measured live in 12 m of water:
    dive to the seabed, release, drift up at **0.2 m/s**; hold `jump` and it
    becomes **0.65 m/s**.
  - Verified live: released on a seabed under 6 m of water the biped rose and
    settled at **0.866** submersion against a predicted 0.870, and a walk
    downhill waded in and began swimming on its own.

### Changed

- **Toolchain bumped** — `tosijs` 1.7.8 → 1.8.0, `tosijs-ui` 1.9.8 → 1.12.3,
  `haltija` 1.11.2 → 1.12.5, and **`tjs-lang` 0.13.6 added explicitly**: it is a
  peer of tosijs-ui and was **not installed here at all**, which nothing warned
  about. The site built anyway, so "works" and "works properly" were
  indistinguishable — installing it changed the build output (`tjs-lang bundles
served same-origin at /tjs/` is new).

  `peerDependencies` is deliberately unchanged: `tosijs ^1.7.8` already admits
  1.8.0, so developing against the newer one costs consumers nothing and this
  stays a **patch**.

  Fallout, all fixed: an unused variable in `wreck-fall` failed lint, which
  `bun start` runs first — so the dev server would not start, and because
  `bun format` is `eslint && prettier`, **prettier had been silently skipped**
  on every file since. Also: `bun run typecheck` is **green again** (the
  standing `model-transform.test.ts:449` red is gone).

- **`.haltija.json` pins agent commands to this project's origin.** A shared
  haltija server holds tabs from several repos and commands followed browser
  FOCUS, so a command run from this directory could silently drive another
  project's page — which happened repeatedly. New in haltija 1.12.

### Fixed

- **`setAnimationState` could pick the wrong clip.** The lookup was
  `group.name.endsWith(animation)`, and a suffix match is ambiguous the moment
  one clip's name ends with another's. Asking a Quaternius rig for `Idle_Loop`
  played **`Crouch_Idle_Loop`** — but it was already latent in the stock set,
  where `running-jump` ends with `jump`, so `setAnimationState('jump')` could
  match the running jump depending on array order. Now an exact name match
  (after stripping Babylon's `Clone of ` prefix), with the suffix behaviour kept
  only as a fallback for rigs whose exporter adds some other prefix.

- **A `_collideCylinder` child of a `_collideMesh` parent built a cylinder around
  the PARENT's whole subtree.** Reported as _"I put a collideMesh on the hull and
  collideCylinders on each mast but the ship just seems to have a single giant
  squat cylinder"_ — and the effect was a **34.4 m wide, 26 m tall** invisible
  barrier you could not walk within twenty metres of. Two independent faults,
  both in how a collider's bounds are chosen:

  - The root-walk climbed while the parent had **any** collide annotation, so
    each mast climbed onto the hull. The shape came from the leaf and the bounds
    from the root, so it built the mast's _cylinder_ around the hull's _subtree_
    — and one `processed` entry then swallowed the other two masts, which is why
    there was exactly one. It now climbs only across the **same** annotation.
    (The tell was the generated mesh's name: `Hull_collideMesh_collider` should
    be impossible, because `_collideMesh` never builds a primitive.)
  - Bounds combined the annotated node's children even when the node had its own
    geometry. A mast is a Mesh 0.55 × 20.6 × 0.64 carrying the Crow's Nest, Flag,
    Spars and SquareSails, so combining gave a 10.2 m cylinder around each mast
    — the deck still walled off. Children are combined only when the annotated
    node has no geometry of its own, which is the GLB TransformNode case the
    behaviour was written for.

  Ship colliders now measure **0.58–0.64 m across** at mast height, and the hull
  keeps its mesh collider.

- **Ambient particles spawned on the wrong side of the water** — leaves below it,
  bubbles above, and a lot of them. Reported while swimming, which is what made
  it constant: third person parks the camera right at the surface. Intensity was
  never the problem; it already ramps correctly on the camera's depth. The
  **spawn box** was: a cube of side 2·radius centred on the eye, so with the eye
  near the surface half of it sits in the wrong medium. Intensity says how much
  to emit and cannot say where, so no amount of ramping could have fixed it. The
  box is now clipped at the waterline — measured with the camera on the surface,
  `leaves/above` spawns from −0.20 up and both `underwater` presets from −0.20
  down, against a surface at −0.20. Same lesson as the biped's plane-vs-volume
  submersion test, one layer along: a medium with a boundary needs a volume with
  one too.

- **World-placed dialogs rendered MIRRORED** — the death/respawn panel read
  "NWOD", and so did the pause panel in any scene using `placement="world"`.
  Reported from a headset, but not headset-specific: it was mirrored flat too,
  and had been since 0.7.2. A Babylon plane's visible face is local **−Z**, so
  aiming `atan2(dx, dz)` at the eye — which points local **+Z** at it — shows you
  the panel's **back**, and a `doubleSided` back reuses the front's UVs rather
  than vanishing. Hence a mirror instead of a missing dialog, which is why it
  survived a release. Now `dialog-placement.facingYawDeg`, tested on the property
  that matters: turn the plane's visible face by this yaw and it points at the
  eye. The same change fixes touch, which was mirrored with it — every
  right-aligned control on a world dialog was mapping to the left.

- **The pause/continue panel is DOM on a flat screen**, and stays an in-scene
  plane in VR — the scene panel's rule (one widget list, two presentations)
  applied to the modal that most needed it. Tonio: _"in flat 3d the continue
  should be presented in the dom like the scene panel."_ On a monitor the DOM
  overlay is better on every axis that has bitten this panel: it cannot be
  occluded, cannot be put somewhere odd by a line-of-sight cast, needs no raycast
  to be clicked, and is exactly where you are already looking. All that machinery
  exists because a headset has no DOM, which is the only place it earns its cost.
  The same `panel3d` SVG serves both — its widgets' listeners work natively in
  the DOM, and `handlePointer` serves the in-scene path.
- **Death and world-placed dialogs now survive a floating-origin rebase.**
  Neither had opted in, so in a terrain scene — the only kind big enough to
  rebase, which is why it hid — a shift mid-death slid the spectate camera, the
  fire emitters and the dialog away from the crash while the world moved out
  from under them. That reads exactly like the origin-teleport fixed above ("the
  wreck is way off, I am looking at nothing"), and two causes producing one
  description is how a fixed bug looks unfixed. Both use an origin LISTENER
  rather than `registerWorldRoot`, because both hold world coordinates in JS and
  the element owns the transform (shifting the node would be undone next render).
  The falling wreck needed nothing — it re-reads its position from the node every
  frame, so a shift is absorbed.
- **Leaving VR now pauses in EVERY scene**, not only those with
  `enterXrOnResume`. Taking the headset off is a departure, not a view change.
  The gate existed on the reasoning that a flat scene which merely visited XR
  shouldn't acquire a pause panel on the way out; superseded by the symmetry,
  which is the stronger argument (Tonio: _"just as entering VR should unpause,
  exiting VR should probably pause"_) — one gesture means resume, its inverse
  means stop, and a rule you opt into is not a pair. `enterXrOnResume` still owns
  resume → enter.
- **The biped got stuck on slopes** — the cost of the fix below, found and fixed
  in the same session. Snapping the feet onto the surface put the collision
  ellipsoid's bottom exactly ON it, so moving into rising ground embedded it and
  Babylon refused the move. The old 15 cm float had been acting as the clearance.
  The body now starts a step above the feet (`STEP_OFFSET`, which is Unity's Step
  Offset): anything lower than a step is walked over, the probe stands you on it
  afterwards, and a wall is still a wall.
- **The biped floated above or sank into slopes, and never corrected.** Tonio,
  on a long-standing one: _"you often end up a little offset from the ground …
  this never really corrects. It just gets randomly messed up again when you
  navigate another slope."_ Not random — the ground check was a **dead band with
  no corrective term**: it probed 0.15 m down from just above the feet and, if
  it found anything, did nothing. So the biped fell until the probe happened to
  see ground and then stopped wherever in that 0.15 m window it landed, and any
  error inside the band was permanent.

  Slopes made it worse both ways. Going up, `moveWithCollisions` slides the body
  up the ellipsoid and leaves it high in the band. Going down — "especially
  down" — gravity moved at most `min(0.1, 9.81·dt)`, a hard **0.1 m per frame**
  clamp, so a brisk descent outran it and it floated the whole way.

  Now it probes a step up and a step down and puts the feet **on** the surface,
  and a real fall accumulates velocity instead of moving a fixed amount per
  frame (with the probe extended by the frame's fall so it cannot step over the
  ground between frames). Measured on the b3d demo scene: **390 consecutive
  frames walking a slope at offset 0.00000**, where before the error wandered
  freely inside a 15 cm band. The probe also goes through `collidable()` now, so
  a UI panel is no longer something you can stand on.

- **Dying in VR teleported you to the world origin.** Tonio: _"I collided with
  wreckage high up and respawned at the origin or starting point with the wrecked
  plane hanging in mid-air off in the distance."_ He was not moved away from the
  wreck — the wreck stayed exactly where he died (measured: a corpse drifts 0.05 m
  in 10 s); **he** was moved. `releaseFocus()` nulls the focused entity, so the
  next XR frame finds nothing piloted and falls through to free locomotion, which
  did `rig.parent = null`. That KEEPS THE LOCAL POSE and reinterprets it as world,
  so a rig at local `(0, 2, −5)` behind its parent lands at `(0, 2, −5)` in the
  world. Now `rig.setParent(null)`, which preserves the world transform.

  It had been latent since 0.7.0 as the cockpit-only oddity in `TODO.md`
  ("the aircraft was moved way away from me"); parenting the chase rig — the
  jitter fix above — made it reachable from the view people actually fly in,
  which is how a five-month-old note finally got diagnosed. Both spellings are
  now pinned in `babylon-orientation.test.ts`, because they look interchangeable
  and the wrong one is shorter.

- **`B3dControllable.halt()`** — tell an entity it is dead, rather than relying on
  `releaseFocus()` nulling its input provider and `_update` short-circuiting on
  that. `b3d-death` calls it. Belt and braces for the focus-managed case; the only
  thing that stops a `die()` handed an entity the focus manager never held.
- **A wreck hung in the air where it died.** Tonio, from a headset: _"I collided
  with wreckage high up … the wrecked plane hanging in mid-air (it should really
  tumble to the ground)."_ Hanging wreckage is worse than untidy — it is a solid
  object in the sky, so the debris of one death becomes the cause of the next.
  A wreck now falls: a tumbling ballistic descent on the velocity it died with,
  one bad bounce, a skid, and a rest. The fires and the spectate camera go down
  with it (a smoke column left at the kill point with the wreck 100 m below it
  is worse than no fire at all). Rules are pure and tested in **`wreck-fall`**;
  the spin is DERIVED from the velocity, never random, so the same crash looks
  the same twice.
  - **How you died decides how far it goes.** Flying into something is an
    inelastic collision that eats most of the energy (`carry: 0.25`); being shot
    down leaves you with nearly all of it (`0.7`). At full carry a 90 m/s crash
    from 130 m travelled ~450 m before landing — a glide, not a crash, and it
    dragged the spectate camera across that much terrain. Tonio: _"The plane
    went flying off into the distance … pretty funny but not as expected."_
  - Drag settled at `0.005` (≈44 m/s terminal). `0.02` was ten times too much (a
    wreck shed its speed in half a second); `0.002` is the figure for a
    STREAMLINED body, and a broken airframe tumbles broadside. Each was
    plausible in isolation; only a real crash told them apart.
  - New seam **`B3dControllable.getWorldVelocity()`**. `b3d-aircraft`'s own
    `velocity` field reads ZERO in wing-borne flight — the fly-by-wire path
    moves the node directly — so a wreck launched from it dropped straight down
    out of a 60 m/s dive.
  - A wreck with **nothing under it** (the edge of a finite ground, a kill over
    open water) is abandoned after 1500 m rather than falling forever with the
    camera chasing it down. Found by killing outside a 600 m ground plane: it
    reached y = −25 and kept going.
- **The VR chase camera jittered and drifted with speed** — Tonio, in a headset:
  _"throttle up the aircraft gets further away, throttle down it gets closer",_
  and it jitters climbing, diving and turning. Three faults, all in the XR rig
  and none in the flat one (which measures rigid to 0.2 mm):

  - It was **not parented**. The XR rig runs in `onXRFrameObservable`, which
    fires BEFORE `scene.render()`, while an entity moves in
    `registerBeforeRender`, which fires inside it — so the rig was positioned
    from last frame's aircraft position, every frame, and a variable frame time
    turns that fixed lag into jitter.
  - It **eased toward a world-space target**, and a first-order tracker sits
    `v/k` behind — ~6.8 m at 61 m/s, proportional to speed. Hence the throttle
    symptom.
  - The easing used `lerp(a, b, k*dt)`, which is **not frame-rate independent**
    (`1 - exp(-k*dt)` is).

  The rig is now a CHILD of a level position+heading anchor the entity updates in
  the same tick it moves, at a fixed local offset, with no easing at all — rigid
  by construction rather than by good timing. New seam:
  **`B3dControllable.getChaseAnchor()`**, `null` by default; `b3d-aircraft`
  provides one. Entities without an anchor keep the eased path, now with the
  correct exponential form.

- **All three panel sites now aim themselves the same way**, through
  `dialog-placement.faceViewer`. `frame-panel` and the XR settings panel used to
  face you with their BACK and cancel the resulting mirror with
  `tex.uScale = -1` — the settings panel also flipping `1 - uv.x` on every pick,
  two compensations for one avoidable cause. Both are gone. No visible change
  (they were correct on screen and under the finger); it removes the trap that
  produced the world-dialog bug above, since the knowledge lived in a comment in
  two files and comments do not travel.
  - **`rollDeg` keeps its meaning**: turning a panel around reverses how a roll
    reads, so `faceViewer` negates it. Worth stating because reasoning said the
    flips cancelled and they do not — the only roll in the library is `180°`,
    which is symmetric and agrees with the wrong answer.

### Added

- **`<tosi-b3d-interactive>` — a mesh you can touch** (#36), the substrate doors,
  knobs, switches, levers, consoles and lamps all stand on. `b3d-button` is a
  floating Babylon GUI widget; this is the other thing — world geometry you reach
  out to. Requested by tosijs-3d-ensemble, whose framing was fair and lands:
  _tosijs-3d has almost nothing for building a PLACE, as opposed to a battle._
  Point at a mesh (or a named sub-mesh — the knob, not the door), reach it, use
  it; `hover` / `unhover` / `activate` / `refused` arrive as bubbling events or
  `whenX` callbacks.
  - **One implementation, flat and immersive.** Babylon routes XR controller rays
    through `scene.onPointerObservable`, the same observable a mouse feeds, so
    there is no XR branch and no second path to keep in step.
  - **Composition, not a god-feature.** `vetoes` is the seam ensemble asked for:
    a `lockable` pushes one, `interactive` never learns what a lock is, and the
    refusal NAMES the refuser — the difference between a locked door and a broken
    one. Vetoes run at activation, not at hover, so a locked door still highlights
    and still reports being tried; silence is a bug report.
  - **It never touches the transform.** An element that manages a node owns its
    transform (the rule #35 was a violation of), so this reads the scene and never
    writes to it. A door that opens moves its ELEMENT.
- **`interaction.ts`** — the pure, Babylon-free rules (`interactStep`,
  `activationVeto`, `withinReach`), unit tested, so what counts as "you used it"
  can be argued about without a scene. Activation is press-then-**release** on the
  thing, because a press you drag off and release elsewhere is how anyone recovers
  from touching the wrong thing — and aim wanders more in a headset, not less.
- **`InteractiveBehavior`** — the attachable form, for anything that already owns
  a mesh (a loader, a biped, a vehicle), plus `nearestInteractive` / `useNearest`
  for the "walk up and press E" control that wires to `ControlInput.interact`.

## 0.7.2

### Fixed

- **`placement="world"` left dialogs at the WORLD ORIGIN** (#35) — so the pause
  and respawn panels were unreachable in any scene not centred on `(0,0,0)`, and
  a `startPaused` scene opened with no visible way out. The panel is created
  parented to the camera and then un-parented, leaving the camera-LOCAL offset
  `(0, 0, 2.2)` behind as a world position. Worse, it was re-applied every
  render: **`AbstractMesh` rewrites `mesh.position` from the element's
  `x`/`y`/`z`** (and rotation from yaw/pitch/roll), so anything that moves the
  MESH is silently undone. Both the placement and the easing now write the
  ELEMENT, which is what owns the transform.

### Added

- **`destroyable="off"` on `<tosi-b3d-destroyable>`** — place a library mesh
  without enrolling it in combat. Same knob and spelling `b3d-loader` already
  had. This element is the only way to place a library mesh BY NAME, so scenery
  had no way out: an ensemble is mostly structure, and every wall and floor was
  getting a combat record whether or not anything could shoot it. Requested by
  tosijs-3d-ensemble, whose stopgap was `armor: 100_000` — buying "cannot be
  killed" by paying for a combatant.

## 0.7.1

### Fixed

- **Modal dialogs are WORLD-PLACED and follow you if you look away.** The
  respawn and pause panels sit at a spot with clear line of sight, face you, and
  ease to a fresh spot after ~2s outside a generous cone. `placement="world"` on
  `<tosi-b3d-svg-plane>`; the rules are pure and tested in `dialog-placement`.

  This replaces three compensations that were each fixing a symptom: head-locking
  (jittered with a jostling death-cam), riding the body frame (put it at knee
  height), and rendering on top (painted in front but became **untouchable**,
  because picking is geometric). It also fixes the case none of them could —
  dying in cockpit view with the camera inside a hillside, where nothing "just
  in front of you" helps.

- **`turnRateDeg` returns exactly what you set.** Converting through radians is
  lossy — `30` derived back as `29.999999999999996`, which is what a slider
  readout or a saved scene would show. It now remembers the value you supplied
  together with the radians it produced, so a later write to `turnRate` is
  detected exactly and the view derives fresh. Still one stored value.

### Added

- **`flightStage()`** — a setting an aircraft can actually operate in: ground,
  sky and fog at flight scale, a library, a sun configured for the ground it
  lights, and **a death panel that respawns you**. Takes a plane FACTORY, not an
  instance, because respawn has to build a new one — passing an instance is what
  made a crash unrecoverable. Returns `{ elements, aircraft }` rather than an
  array, since the current aircraft changes on respawn and a captured reference
  goes stale. The clouds demo lost 22 lines converting to it.
- **`tosijs-3d/demo-utils`** — the scene-setup helpers every live example uses
  are now published, so **code copied off a doc page resolves in your project**.
  Previously 38 examples across 33 files imported a bare `demo-utils` that no
  consumer could resolve, and since the demo goes first on every page it was the
  first thing anyone copied.

  They ship with an explicit stability disclaimer: **dev helpers, not API.** They
  can change or vanish in a patch, they are tuned to flatter a doc page rather
  than your game, and production code should compose `b3dSun`/`b3dSkybox`/
  `b3dGround` directly.

  Vetted rather than published wholesale — the module was not shippable as-is:

  - `orbitCam` takes **`alphaDeg`/`betaDeg`**; the radian `alpha`/`beta` still
    work and are converted, so existing snippets keep running.
  - Options are typed — the two `Record<string, unknown>` signatures are gone.
  - Ground helpers take a **`texture` URL** instead of exporting root-absolute
    asset paths that resolve only on this site.
  - `demoSun` uses the **auto shadow-size sentinel** rather than hard-wiring
    2048 over the device-tier budget.
  - `volumetricDemo`, `impactMarker` and the asset constants stay **private** —
    they are page-specific, not API.

## 0.7.0

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

### ⚠️ Breaking

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

### Added

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
