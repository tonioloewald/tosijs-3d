# 0.7.3

<!--{ "parent": "CHANGELOG", "order": 9992997 }-->

## Added

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
- **⚠️ Jumping is instantaneous again, and animated in three phases.** The
  crouch-on-press/launch-on-release model was an adaptation to the stock rig's
  single one-shot clip that happened to open with a crouch. Quaternius ships
  `Jump_Start` / `Jump_Loop` / `Jump_Land`, where **start is a takeoff, not a
  wind-up** — Tonio: _"it's basically designed for instantaneous jumps where
  once you jump you enter the jump state and that's it."_ That is also the
  platform-jumper contract in `MOBILITY-DESIGN.md`: the character does exactly
  what you pressed, now; anticipation belongs to the intent model, where the
  character decides before you ask. `jumpWindup` and `jumpMinScale` are gone, and
  so is the `speedRatio` retiming — each clip now plays for as long as it is
  actually true instead of being stretched to fit a flight it could not know.
- **`b3d-library` surfaces the glb's own catalogue** (#45). `getManifest()`
  returns `{count, categories, items:[{name, category, tags, size}]}` built from
  the loaded nodes; `getInfo(name)` answers `{category, tags, clips}` **without
  instantiating**, which is what a clip picker needs (`metadata.animationGroups`
  requires an instance to exist first). `getNames()` now narrows to the declared
  items when a catalogue is present — the data-driven twin of the `.model`
  convention, and a packed kit badly over-reports without it (measured: 559 raw
  nodes vs 131 declared items). `getRootNames()`/`getHierarchy()` still expose
  everything, so sub-part targets keep working, and `instantiate()` carries the
  extras onto what it returns — including the `canonical: true` wrapper, which
  was the actual reason the data looked unreachable.
- **`glb-manifest`** — the pure half: category/tag/size queries over a library
  catalogue, plus GLB JSON-chunk parsing for the case where you want a
  library's contents _without_ loading it into a scene. Note Babylon surfaces
  per-**node** extras and drops per-**scene** ones, so `manifestFromNodes` is
  the path that needs no parsing at all.
- **Mantling — the biped climbs onto a ledge too high to step onto.** No button:
  push into it and the character solves it, which is the intent model rather
  than the platform jumper. `mantle.ts` is the pure half (Babylon-free, 13
  tests): `canMantle` (every clause a way of NOT being a ledge — too low is a
  step, too high a wall, no landing is a fence you would be stranded on),
  `mantlePath` (an ARC — rise leads translation, because a straight line drives
  the body through the lip) and `mantleClip` (picks `ClimbUp_1m`/`_2m` by
  MEASURING the ledge, since Quaternius indexes those clips by height).

  It arrived as _"when you swim to the water's edge, you just pop instantly to
  the surface onto the land"_, but it is not a water feature — climbing out of a
  pond is mantling a lip of height h, so the bank, the low wall and the crate
  are one verb. A swimmer's reach is measured from the **waterline**, not the
  dangling feet: your hands are at the surface, and the feet reading made every
  bank in the demo 3 m tall.

  New attribute `climbReach` (2.2 m). The probe is throttled to 12 Hz — see
  MOBILITY-DESIGN → "Probes: one budgeted read of the surroundings".

- **The wade↔swim transition is verified** — it had been the one untestable
  case, because no water in the 0.2–0.9 m band existed anywhere in the demo.
  With the canal's variable depth it now does: walking deep → shelf → deep
  across a HARD step (4.24 m → 0.37 m → 4.56 m, the worst case for flicker)
  produces exactly two state changes over 304 samples, one at each edge.
- **`wadeDepth` is a biped attribute** (`0.45` = fraction of standing height,
  ~0.8 m on a 1.83 m rig). Below it you wade; above it buoyancy takes over.
  Tonio set the band — _"about 0.4-0.5 (it's hard to swim in water less than
  waist deep)"_ — which is the real constraint: swimming shallower than that
  is not a choice a person gets to make, the bottom is in the way. A fraction
  rather than metres because it is a fact about the **body**, so a smaller
  character starts swimming sooner in the same pond for free.
- **Camera zoom-IN works.** `cameraZoom` was `Math.max(0, dpadUp - dpadDown)`,
  which discarded the whole zoom-in half — down produced `0`, not `−1`, so the
  camera could only retreat. The unit test asserted the broken value, having
  been written beside the broken line.
- **Vertical look moves the chase rig in XR.** Flat, `lookY` tilts the
  `FollowCamera` via `heightOffset`; in a headset there is no `FollowCamera`, so
  it did nothing. A regression from moving camera zoom onto the D-pad — XR
  controllers have no D-pad, so the headset lost both the zoom and the tilt in
  one move. Same formula as flat, clamped, so the two feel alike.

  **Known gap:** camera zoom is now unreachable in VR. It needs a home that
  exists on an XR controller — most likely a slider on the in-headset scene
  panel.

- **Strafing is a toggle, `strafing="off"` by default.** Both sticks then turn
  you — the left while moving or not, the right without moving — and the
  sidestep clips never play. Off on principle: sidestepping is a shooter idiom
  that reads oddly on a character meant to move like a person. That it also
  avoids the weakest clips in the Quaternius set is a bonus, not the reason.
- **The pose is averaged over the cycle, not sampled once** — the fix for
  _"I seem to porpoise out of the water"_. A swim cycle is not a fixed shape:
  over `Swim_Fwd_Loop`'s 1.33 s the body's lowest point swings from −1.26 to
  −0.28 as the legs kick. A single sample landed wherever the settle timer fell,
  and the shallow end of that swing drove the derived buoyancy to its clamp and
  fired the swimmer out of the water — intermittently, because it depended on
  the phase.
- **`buoyancy` is METRES, not a multiplier** (`0` default = waterline at the
  head; `0.1` floats ten centimetres higher). A multiplier is not authorable —
  its effect depends on how tall the pose happens to be, so the same number
  means different things for a tread and a crawl. Tonio: _"we can keep buoyancy
  as a strict z offset for a given figure in water."_
- **The waterline is anchored at the swimmer's HEAD.** Which is what swimming
  _is_ — you keep your head at the surface, and you do it by swimming rather
  than by floating — so it is a fact about the activity, not about a clip, and
  it holds for any humanoid rig without per-animation tuning. Treading now sits
  with the water just above the neck and the head clear; a front crawl breaks
  the surface. Both from one rule.
- **Swimmers float where the ANIMATION says, not where a constant says.** The
  swim clips are authored with the **root at the waterline** — measured on the
  Quaternius rig, `Swim_Idle_Loop` spans −1.37…+0.50 about the root and
  `Swim_Fwd_Loop` −0.60…+0.31, so floating the root on the surface gives a tread
  with head and shoulders out and a crawl with the head just breaking. The
  equilibrium is now READ from the pose rather than tuned, so any standard
  animation set floats correctly untouched.

  The root itself is **not** a usable anchor: it means different things in
  different clips — feet when standing, roughly waterline when swimming — and
  taking it literally floated this rig at armpit height, since its root sits 73%
  up the treading pose. It is still what tells us a pose _is_ a swim pose (the
  body hangs below it), just not where the water goes.

  Three bugs fell out of the old assumption that the root is at the feet, which
  is true only while standing: the real head sat ~1.2 m under while treading;
  the legs were buried in the seabed (the floor clamped the root, not the body's
  lowest point); and `buoyancy` appeared to do nothing, because clearing that
  head needed a submersion of 0.14 — `buoyancy ≈ 7`.

- **`buoyancy` is a biped attribute** — now a **trim** on the animation's
  waterline (`1` = as authored, higher rides higher), because the absolute is
  not ours to choose: the clip already encodes it, and a number here would be a
  second opinion that goes stale with the next animation set.
- **A clip change no longer briefly makes a swimmer stand.** A newly-started
  clip cannot be measured until its pose settles, and falling back to the
  standing assumption for those frames put the root back at the feet — so a
  swimmer floating at the waterline read as barely submerged and walked off
  across it. Moving is exactly what changes the clip, which is why it showed as
  _"when you move he tends to jump up to the surface and walk"_. An unmeasured
  clip now inherits the last swim pose, `height / -bottom` is clamped so a
  mid-blend reading cannot launch anyone, and **no floor under you means you
  cannot stand** — full stop, rather than a number derived from where the body
  drifted to.
- **The swim/stand test no longer feeds back on itself.** It asks how deep the
  water is **at your feet on the floor**, which is stable across the switch —
  the previous form measured the current pose, so raising buoyancy raised the
  body, flipped the pose upright, and the upright reading locked the flip in:
  at `buoyancy` 1.3 the character corked out and stood on the surface.
- **Neutral buoyancy starts at 1.5 m of head depth, not 0.5 m.** Holding depth
  is for DIVING; at half a metre a swimmer whose head dipped barely under went
  neutral and stayed there, with the up-thrust throttled near the surface too —
  Tonio: _"still treading water with head underwater and it's hard to swim up."_
- **Sidestepping uses the lateral clips** rather than the forward walk — the
  slide is gone. UAL ships a full eight-way set (Fwd, Fwd_L/R, Left, Right, Bwd,
  Bwd_L/R) for jog, crouch **and** crawl; the biped now picks the lateral one
  when sideways motion dominates, crouched or not, and falls back to walking on
  a rig that has no such clip. Sneaking at rest holds `Crouch_Idle_Loop`.
- **⚠️ The right stick's Y is inverted by default** (`invertLookY: 'off'` to
  restore) — pushing away tips the view down, the way a camera head works.
- **The follow camera can no longer go underground.** Pitch drives its HEIGHT,
  so looking up walked it downward until the world vanished; `cameraMinHeight`
  (0.5 m) floors it.
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

## Changed

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

## Fixed

- **Entering water flipped your heading 180°.** With a mirrored glTF root
  (`scaling.z = −1`) world forward is `−(R·ẑ)`, so reading yaw back gives
  `θ + π` and writing it produces `−F`. I had reasoned this round-tripped; it
  does not. On land nothing rewrites the quaternion, so it only showed the
  instant pitch engaged — which is the instant you start swimming.
- **You could wade on top of the water.** Holding surface-thrust lifted you
  until submersion fell under the swim threshold, at which point you were
  classed as standing and got a walk cycle while still afloat. Up-thrust is now
  gated by head depth, exactly as the upward aim is: you cannot push yourself
  out of water, and surfacing is buoyancy's job anyway.
- **The swim/stand switch twitched at the waterline.** Walking down a ramp,
  submersion hovers around the threshold and the mode flickered. `isSwimming`
  now enters at 0.5 and holds until 0.35.

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

## Added

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
