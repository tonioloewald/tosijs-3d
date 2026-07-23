# TODO

## Needs validation (built without a headset — spot-check next session)

Changes made from source-only (tsc + unit tests green) that still need a human/headset
look. **Flat** = check in the browser; **VR** = check in the headset.

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

## Asset Management

[x] b3d-library: LoadAssetContainer-based parts catalog with type registry and hierarchical mesh picker
[ ] Tile map component consuming libraries by type
[ ] Decorator component (place library items on terrain)

## UI

[x] Based on SVG texture (b3d-svg-plane + SvgTexture)
[x] Converts pointer actions on surface to SVG (supports hover, active states, enter, exit, and click events, uses rect hull for collision)
[x] Can be bound normally (live DOM SVG via selector, tosijs bindings update automatically)
[x] Has a specified update frequency, defaults to 30ms
[x] Small library of svgUiComponents — `widgets3d` (panel3d container + label/text/button/toggle/slider/list3d), coordinate-routed (panel.handlePointer, no DOM events), works as DOM overlay + in-scene/VR plane
[x] button (button3d)
[ ] textInput (textInput3d) — deferred
[x] toggle (toggle3d)
[x] slider (slider3d)
[ ] meter (meter3d) — deferred
[x] Hover/leave feedback + per-control hitTest (scroll-drag the dead space of switch/slider rows; important in VR)
[ ] list3d select modes: (a) buttons [done], (b) single-select / radio (binds `value`), (c) multi-select / checks (binds an array). Reuse the rowBg highlight; multi adds a check glyph (icon)
[ ] select3d — composite dropdown built on (b): a collapsed row showing the current value + chevron; tap discloses a single-select list3d, collapses on pick. MUST grow the panel's layout (stackLayout re-flows) rather than a DOM-style absolute popover — a popover won't rasterize into the VR texture
[ ] Icons: consume tosijs-ui's `./icons` subpath (a clean leaf — only `tosijs` peer + pure icon-data) behind a thin local `icon(name, {fill,size})` wrapper = the single seam to later swap for a standalone icon lib with zero call-site churn. Replace the gear `⚙` glyph; chevron for select3d, check for multi-select, leading icons on buttons
[ ] SVG-native icon principle (minimise double-implementation): attributes-first (`fill`/`stroke`/`stroke-*`/`width`/`height`/`transform`) as the rasterizable baseline, CSS as a DOM-only override layer, `fill="currentColor"` for theming BUT resolved to an explicit fill before serialize (else icons render black in a texture), stacking via SVG `<g>`/`transform`/`<mask>`. Only animation + `:hover` are irreducibly DOM-vs-VR (handled by the texture re-render / pointer-routing layer, not the icon lib)

### XR spatial panels (placement / clipping)

[ ] **Spawned sub-panels (popMenu-style) instead of cramming one panel.** Disclosure
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

## Rename on[A-Z]* component METHODS off the `on` prefix (Tonio, 2026-07-23)

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
