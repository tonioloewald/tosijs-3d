# CLAUDE.md

> **Shared engineering practices** live at
> **https://github.com/tonioloewald/tosijs-coding-practices** — and, when checked out beside
> this repo, at [`../tosijs-coding-practices`](../tosijs-coding-practices/README.md). Read that
> index first for the cross-project defaults (development, testing, code quality, performance,
> review, releasing, deployment, and the **observant** tosijs/tjs stack). This file records only
> what is **specific to or divergent from** those defaults — when they conflict, this file wins.
>
> Those docs are **living, not graven in stone.** Don't rewrite them unprompted, but do speak up:
> voice concerns, flag inconsistencies, and suggest improvements as you work. Continuous
> improvement is the goal — see the repo's `CONTRIBUTING.md`.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

tosijs-3d is a declarative 3D/XR framework built on Babylon.js and the tosijs web component framework. It provides composable custom elements for building 3D scenes — a parent `<tosi-b3d>` element manages the engine/scene, and child components (sun, skybox, water, reflections, character controllers, etc.) compose inside it to build scenes declaratively.

**North star: behavioural richness, not photorealism.** The uncanny valley isn't a rendering problem, it's a broken contract — _fidelity is a promise_, and every increment of visual realism raises the behavioural expectation it must then satisfy. So: choose a style that under-promises so behaviour can over-deliver; spend performance headroom on **agents and reactions, not vertices** (we banked ~27× on terrain and deliberately did NOT spend it on detail); depth is **systemic, not textural**; and the unit of progress is a _watchable behaviour_, not a screenshot. See AI-DESIGN.md → "North star".

### Where the design intent is written down

This file is the map; the reasoning lives in the root design docs. **Read the relevant one
before (re)designing in its area** — they hold the decisions and the rejected alternatives,
not just the current state:

| Doc                  | What it holds                                                                                                                                                              |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TODO.md`            | The live worklist — open bugs, "needs a headset to validate" items, in-flight designs. Check first.                                                                        |
| `COMBAT-DESIGN.md`   | Combat spec — composition-of-simple-atoms, the `smart` dial, damage/warhead/guidance model                                                                                 |
| `AI-DESIGN.md`       | NPC/AI design — "artificial stupidity" (invest in the LOW end of the skill dial), scenario playgrounds                                                                     |
| `SPATIAL-DESIGN.md`  | Spatial attachment — attach / place-relative / transition (riding an elevator), the pure transform math                                                                    |
| `PERF-DESIGN.md`     | Acceleration — measure the movable/immovable split first; batch-buffer kernels; workers (send the recipe, transfer the result); where wasm pays and where it's a pure loss |
| `UI-DESIGN-NOTES.md` | Running log of UI/XR UX decisions, tradeoffs, and lessons — append to it as you learn                                                                                      |
| `RELEASING.md`       | Release checklist (run steps 1–7; stop before `npm publish`)                                                                                                               |
| `llms.txt`           | Generated index of the published doc pages (agent-facing entry point to https://3d.tosijs.net)                                                                             |

## Build & Development Commands

Requires [Bun](https://bun.sh). Run `bun install` once after cloning.

- **Dev server**: `bun start` (formats code, then runs HTTPS dev server on port 8030 with file watching)
- **Build**: `bun build` (runs `bun bin/site.ts --build`: doc-site build + library `tsc -p tsconfig.build.json`, exits)
- **Format**: `bun format` (ESLint fix + Prettier)
- **Run tests**: `bun test` (Bun's native test runner, test files use `*.test.ts` pattern)
- **Run single test**: `bun test src/perlin-noise.test.ts`
- **TLS setup**: `bun tls` (required once for HTTPS dev server; runs `tosijs-dev-certs` from tosijs-ui to generate warning-free local certs)

`bin/site.ts` is a thin wrapper over `tosijs-ui/site`'s reusable doc-site pipeline (`buildSite()` + `devServer()`); declarative config lives in `site.config.ts`. On every change the dev server reruns `buildSite()`, which:

1. Runs `prebuild()` (copies `jolt-physics.wasm-compat.js` from `node_modules` into `static/`).
2. Wipes `docs/`, copies `static/` into it (favicon, GLBs, audio, the WASM loader).
3. Wipes `dist/`, bundles `demo/site.ts` → `docs/iife.js` (IIFE, `jolt-physics` external — loaded at runtime via a per-page importmap baked into `headExtra`).
4. Extracts `/*# */` doc comments → `demo/docs.json`.
5. Pre-renders **one `/{slug}/index.html` per doc** with full SEO `<head>` (title, description, canonical, OG, Twitter card, `schema.org` JSON-LD) and the rendered markdown — so crawlers/AI agents see complete content with zero JS. `<tosi-doc-system>` hydrates the page into the live doc browser once `iife.js` loads; `demo/site.ts` seeds its `context` with `{tosijs, 'tosijs-3d', 'tosijs-ui'}` so live examples resolve.
6. Burns the theme (`{accent, background, text}` from `site.config.ts`) into a static `docs/doc-system.css` (no FOUC).
7. Emits `sitemap.xml`, `robots.txt`, and `.nojekyll` + the existing `CNAME` (`3d.tosijs.net`) for GitHub Pages.

`bun build` also emits the library: `site.config.ts` sets `emitLibrary: true` + `libraryTsconfig: 'tsconfig.build.json'`, so `buildSite()` runs the library `tsc` step itself after the doc-site build (there is no separate `tsc` invocation in `bin/site.ts`). The published `dist/` ships **per-file, unminified JS + `.d.ts` + sourcemaps with doc comments preserved** (`removeComments: false`), so consumers and AI agents have browseable source plus types. The root `tsconfig.json` is `noEmit`; `tsconfig.build.json` overrides it.

## Architecture

### Declarative Scene Composition

Scenes are built by nesting child components inside `<tosi-b3d>`:

```js
b3d(
  { glowLayerIntensity: 1 },
  b3dSun({ shadowCascading: true, shadowTextureSize: 2048 }),
  b3dSkybox({ timeOfDay: 6, realtimeScale: 100 }),
  b3dLoader({ url: './scene.glb' }),
  inputFocus(
    b3dBiped({ url: './character.glb', player: true, cameraType: 'follow' }),
    b3dCar({ url: './car.glb', enterable: true })
  ),
  b3dWater({ y: -0.2, twoSided: true }),
  b3dReflections()
)
```

### Scene Registration Pattern

The core coordination mechanism. `B3d` maintains a listener list:

- Child components call `owner.register({meshes, lights})` when they add content
- Other components listen via `owner.onSceneAddition(callback)` to react (e.g., reflections adds new meshes to probe render lists, sun adds shadow casters)

### Floating origin

Large worlds drift into float imprecision far from `(0,0,0)`. `B3dTerrain` rebases
periodically (`resetOrigin`, when the camera passes ~a coarsest-tile distance):
it shifts its own tiles back toward the origin, then calls **`B3d.shiftOrigin(dx,
dz)`**, which moves **everything else that carries a world position** by the same
amount (visually seamless). Any entity that lives in world space MUST opt in or it
will drift on a reset:

- **`b3d.registerWorldRoot(node)`** / `unregisterWorldRoot` — the entity's world
  position lives entirely on the node (inert props, targets, parked vehicles); B3d
  moves the node.
- **`b3d.onOriginShift((dx,dz) => …)`** / `offOriginShift` — the entity also holds
  world coordinates in JS (a projectile integrating its own position, remembered
  target positions, AI memory). It fixes itself (node **and** JS) and must NOT also
  `registerWorldRoot`.

`shiftOrigin` shifts the camera carrier itself (the piloted entity when one is
driven — NOT the chase rig, which re-derives from it each frame). Skybox and water
are viewer/origin-centred and intentionally not shifted.

### Parent Discovery

Child components find their parent `B3d` via `findB3dOwner(el)` which walks up the DOM looking for an element with `.scene` and `.register` properties (duck typing, not hardcoded tag name). This works regardless of what tag name the consumer chose.

### Child Lifecycle — the `B3dChild` pull model

**Every element that lives inside a `<tosi-b3d>` scene extends `B3dChild`** (or `AbstractMesh`, which extends `B3dChild` and adds position/rotation syncing). `B3dChild` (in `b3d-utils.ts`) centralizes the scene-attach lifecycle in ONE place, and it's a **pull** model, not parent orchestration:

- On its own `connectedCallback` (by which point tosijs has drained the element's attributes, so they read correctly), the child finds its owner and calls **`owner.whenReady(cb)`** — which runs `cb` immediately if the scene is already up, else queues it until the scene is ready.
- `cb` sets `this.owner` and calls the subclass's **`sceneReady(owner, scene)`**. So `sceneReady` fires exactly once, only when the child is ready AND the scene exists.
- On disconnect, `B3dChild.disconnectedCallback` calls the subclass's **`sceneDispose()`** and releases.

Subclasses override **only** `sceneReady`/`sceneDispose` — never `connected`/`disconnectedCallback` (that plumbing is centralized so a lifecycle fix lands in one spot; if you must, `super` first and stay side-effect-free). `B3d` no longer pushes `sceneReady` at a guessed time or watches the subtree with a MutationObserver — that guessing was the source of races against tosijs's deferred attribute application. `B3dChild` is exported for consumers writing their own scene elements.

### Input Architecture

Input is abstracted through a layered system:

- **`ControlInput`** — universal control interface with fields like `forward`, `strafe`, `turn`, `pitch`, `throttle`, `jump`, `shoot`, `sprint`, `interact`, `cameraZoom`, etc.
- **`InputProvider`** — any input source (keyboard/mouse, gamepad, XR controllers, AI) implements this to produce `ControlInput`
- **`CompositeInputProvider`** — merges multiple providers (e.g., keyboard + XR sticks)
- **`B3dControllable`** — base class for any entity that accepts `ControlInput` (biped, car, etc.)
- **`B3dInputFocus`** (`inputFocus()`) — routes input to the active controllable entity and handles vehicle enter/exit via the `interact` action
- **`B3dController`** (`b3dController()`) — the **casual** path: a bodyless `B3dControllable` that self-wires the whole standard stack (keyboard/mouse + glass gamepad + hardware pad + XR controllers) and hands you the merged `ControlInput` each frame via an `onInput(input, dt)` callback. Use it instead of hand-rolling per-demo key/pointer listeners (that was the source of the launcher-demo "gun won't fire" churn). Put it inside an `inputFocus` only if you want that manager to drive it.

**Scene input focus (multi-demo scoping).** Keyboard/hardware gamepad sources listen on `window` (global), so a page with several live `<tosi-b3d>` demos would have one keypress drive them all. Fix: `B3d` tracks the **active scene** — the one the pointer last entered/pressed (`takeInputFocus()`, `hasInputFocus`) — and `B3dControllable._update` feeds an unfocused scene `emptyInput()` so it idles. A lone demo (nothing focused yet) still just works. This is a demo/authoring concern, not a runtime-world one.

### Gamepad Architecture

Input devices are abstracted through `VirtualGamepad` — a uniform interface with left/right sticks, face buttons (A/B/X/Y), bumpers, and triggers. Concrete implementations:

- **`KeyboardGamepad`** — maps WASD/arrow keys/mouse to virtual sticks and buttons
- **`HardwareGamepad`** — wraps physical gamepads via the Gamepad API
- XR controllers map through `XrInputProvider`

`B3dControllable` subclasses read from `VirtualGamepad` to drive their physics (biped movement, car steering, aircraft flight controls).

### Aircraft Physics

`fly-by-wire.ts` is the aircraft's **pure, dependency-free flight model** — it uses plain `{x, y, z}` objects (not Babylon Vector3) so it can be unit tested without a 3D engine. The companion `b3d-aircraft.ts` bridges it to Babylon. It's the forgiving "drone-that-becomes-a-plane" controller: the stick commands an _attitude_ (bank/pitch) and velocity chases the nose, with a drone/hover regime below `vtolSpeed` and a plane regime above (VTOL transitions, self-levelling, bank-to-turn). Unit-tested headless in `fly-by-wire.test.ts`.

### World Simulation Contract (store ↔ driver ↔ view)

A newer, deliberately-decoupled architecture layer that sits **above** the declarative scene components. It exists so an external driver (an AI narrative engine, a scripted demo — the "Ariosto" use case) can drive a world without the simulation ever knowing about narrative. Three files, three roles:

- **`world-contract.ts`** — the _boundary types only_ (no logic). Defines the serializable `WorldState`, the best-effort `SimulationEvent` stream, and the `WorldApi` surface. Hard rules are baked into the types: the simulation is **narrative-blind** (no `plot`/`quest`/`objective` vocabulary), the driver is **never load-bearing** (the sim runs as a complete sandbox with no driver attached; intents are advisory), and events are **commitments** (intentional acts — interacted/pickedup/chose/died — never proximity).
- **`world-store.ts`** — pure, **Babylon-free, deterministic** reference implementation. Holds `WorldState`, resolves systemic causality itself, emits events. Determinism is enforced: ids from a counter, time only via `tick()`, **no `Date.now`/`Math.random`** — so it's fully unit-testable and can host a headless driver. Splits methods into `WorldApi` (driver may call) vs. simulation methods (only the engine's own systems call).
- **`world-view.ts`** — the disposable Babylon **projection**. Watches the store and reconciles one mesh per entity each frame (appeared → create, moved → reposition, forgotten → dispose). Data flows one way, `store → meshes`; the render layer can never desync the sim. Imports Babylon; the store never does. Default factory draws primitives; pass your own `factory` to swap in `b3dBiped`/GLB per entity kind.

The store↔view split mirrors the "keep it pure so it's testable" discipline used for `fly-by-wire`/`perlin-noise`, applied to whole-world state.

### XR Reference Frames & Spatial UI

`xr-frames.ts` maintains a `TransformNode` per **reference frame** so spatial UI can parent to the one it wants: `world`, `rig` (locomotion/vehicle), `body` (torso — head x/z + _damped_ yaw), `neck`, `face` (head-locked), plus sensed hand frames. `body`/`neck` aren't sensed in a head+hands rig, so they're _inferred_ (low-passed yaw, etc.); the yaw-damping/gaze-reveal math is pure and unit-tested.

Panels build on this: `frame-panel.ts` (`attachFramePanel`) pins an SVG panel to a frame with gaze-reveal; `b3d-panel.ts` (`b3dPanel`) is the declarative `<tosi-b3d-panel>` wrapper (attributes for frame/azimuth/elevation/preset). If any `<tosi-b3d-panel>` children are present they replace the built-in default set. This is distinct from — and layered over — the `scenePanel` gear-overlay hook described in the WebXR section.

### Ignore these legacy files

`src/reflections.ts`, `src/dynamic-shadows.ts`, and `src/rippling-water.ts` are superseded standalone modules — **not exported from `index.ts` and not referenced anywhere**. Use `b3d-reflections.ts`, `b3d-shadows.ts`, and `b3d-water.ts` instead.

### Key Files

**Core & Scene:**
| File | Purpose |
| --- | --- |
| `src/tosi-b3d.ts` | Core `B3d` Component — engine, scene, render loop, scene registration, camera management |
| `src/b3d-utils.ts` | `B3dChild` + `AbstractMesh` base classes, `findB3dOwner()`, `enterXR()`, `placeOnSurface()`, shared types |
| `src/b3d-loader.ts` | Loads GLB/GLTF files, registers meshes/lights, applies naming conventions |
| `src/b3d-library.ts` | Parts catalog — preloaded mesh library for spawning instances |
| `src/b3d-collisions.ts` | Collision detection with convention-based collider shapes |
| `src/b3d-trigger.ts` | Proximity-based trigger zones |

**Input & Control:**
| File | Purpose |
| --- | --- |
| `src/control-input.ts` | `ControlInput` interface, `InputProvider`, `CompositeInputProvider` |
| `src/b3d-controllable.ts` | Base class for input-driven entities (biped, car, aircraft) |
| `src/b3d-controller.ts` | `<tosi-b3d-controller>` / `b3dController()` — casual bodyless controllable; self-wires the full input stack, hands merged input to a `drive(input, dt)` callback |
| `src/b3d-input-focus.ts` | Input routing and vehicle enter/exit mechanics |
| `src/virtual-gamepad.ts` | `VirtualGamepad` — unified gamepad abstraction (sticks, buttons, triggers) |
| `src/keyboard-gamepad.ts` | Keyboard/mouse → VirtualGamepad mapping |
| `src/hardware-gamepad.ts` | Physical gamepad → VirtualGamepad mapping |
| `src/xr-input-provider.ts` | XR controller input implementation |
| `src/xr-gamepad.ts` | XR controllers → VirtualGamepad mapping |
| `src/touch-gamepad.ts` | Touch/pointer SVG virtual gamepad (`data-part` element mapping) |
| `src/glass-gamepad.ts` | `<tosi-b3d-gamepad>` on-screen glass gamepad component + control parsing |
| `src/gamepad-svg.ts` / `src/gamepad.ts` | SVG rendering + text/state helpers for the gamepad UI |
| `src/game-controller.ts` | Legacy keyboard/mouse input with attack/decay smoothing |

**World Simulation (store ↔ driver ↔ view):**
| File | Purpose |
| --- | --- |
| `src/world-contract.ts` | Boundary types: `WorldState`, `SimulationEvent`, `WorldApi` (no logic) |
| `src/world-store.ts` | Pure, deterministic, Babylon-free reference simulation |
| `src/world-view.ts` | Babylon projection — one mesh per entity, reconciled `store → meshes` |

**Controllable Entities:**
| File | Purpose |
| --- | --- |
| `src/b3d-biped.ts` | Character controller with animation state machine, follow/XR camera |
| `src/b3d-car.ts` | Vehicle with acceleration, steering, wheel spin, enterability |
| `src/b3d-aircraft.ts` | Aircraft with VTOL, flight dynamics, follow camera |
| `src/fly-by-wire.ts` | Pure "drone-becomes-a-plane" attitude-command flight model (zero Babylon deps), unit-tested |

**Environment & Effects:**
| File | Purpose |
| --- | --- |
| `src/b3d-shadows.ts` | `B3dSun` — directional light with cascaded shadow maps (CSM) |
| `src/b3d-skybox.ts` | Procedural sky with day/night cycle, sun positioning |
| `src/b3d-water.ts` | Water surface using WaterMaterial with waves/wind |
| `src/b3d-reflections.ts` | Automatic reflection probes for `_mirror` meshes |
| `src/b3d-light.ts` | Hemispheric ambient light |
| `src/b3d-fog.ts` | Fog configuration |
| `src/b3d-particles.ts` | Particle effect system |
| `src/b3d-sound.ts` | Positional 3D audio |
| `src/b3d-terrain.ts` | Terrain generation |
| `src/b3d-planet.ts` | Procedural planet rendering |
| `src/b3d-star.ts` / `b3d-star-system.ts` | Star and star system rendering |
| `src/b3d-galaxy.ts` / `galaxy-data.ts` | Galaxy visualization |
| `src/b3d-black-hole.ts` | Procedural black hole with accretion disk, lensing, photon ring |

**UI & Textures:**
| File | Purpose |
| --- | --- |
| `src/svg-texture.ts` | Dynamic SVG → Babylon texture rendering |
| `src/b3d-svg-plane.ts` | In-scene SVG-based UI planes |
| `src/widgets3d.ts` / `src/widgets3d-layout.ts` | SVG-native UI widgets (`panel3d`, `slider3d`, …) that work as DOM overlays or in-scene panels; stack layout |
| `src/xr-frames.ts` | XR reference frames (`world`/`rig`/`body`/`neck`/`face` + hands) for spatial UI |
| `src/frame-panel.ts` | `attachFramePanel` — SVG panel pinned to an XR frame, gaze-revealed |
| `src/b3d-panel.ts` | `<tosi-b3d-panel>` declarative spatial-UI panel component |
| `src/gradient-editor.ts` | Interactive gradient-editing widget |
| `src/b3d-primitives.ts` | Basic mesh primitives (sphere, ground) |
| `src/b3d-button.ts` | 3D GUI button |
| `src/b3d-exploder.ts` | Model exploder (separates mesh parts) |

**Procedural & Utilities:**
| File | Purpose |
| --- | --- |
| `src/perlin-noise.ts` | Seeded 2D/3D Perlin noise |
| `src/mersenne-twister.ts` | Seeded PRNG |
| `src/gradient-filter.ts` | Gradient-based color mapping |
| `src/surface-sampler.ts` | Surface point sampling |
| `src/terrain-grid.ts` | Pure LOD terrain-tile grid math (placement/sampling/culling), unit-tested |
| `src/model-transform.ts` | Babylon-only model frame helpers (`canonicalize`, scale-bake) for spawned models |
| `src/spatial-transform.ts` | Pure transform math for spatial attachment (`SPATIAL-DESIGN.md`) — vector/quaternion ops, compose ↔ relative, unit-tested |
| `src/asset-url.ts` | `assetUrl()` — resolve a logical asset path to a hosted URL (retargetable CDN base, see `static-assets` memory) |
| `src/perf-probe.ts` / `b3d-quality.ts` / `b3d-probe.ts` | Device-capability probe → per-tier `PerfBudgets` (see Adaptive defaults) |
| `src/b3d-physics.ts` / `jolt-plugin.ts` | Jolt Physics integration layer |

**Combat (shipped v0.4.0 — pure models bridged to Babylon, spec in `COMBAT-DESIGN.md`):**

Same discipline as `fly-by-wire`/`world-store`: the `*.ts` model files are pure, Babylon-free, deterministic (plain `{x,y,z}`, no `Date.now`/`Math.random`, time via `dt`), unit-tested; the `b3d-*.ts` files bridge them to the scene. The pure integrator that drives live flight is the SAME one the bomb sight predicts with (prediction == simulation), and one `smart`/`smartness` 0..1 dial governs both guided rounds and turret lead.

| File                          | Purpose                                                                                                                                        |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/resource.ts`             | Pure capacity + delayed-regen pool — Destroyable health AND launcher ammo/energy                                                               |
| `src/destroyable.ts`          | Pure `CombatWorld` — damage (protection/armor), regen, cascading chain reactions; deterministic                                                |
| `src/warhead.ts`              | Pure warhead resolution — DIRECT (single hit) or AOE (outward shockwave, distance-staggered)                                                   |
| `src/ballistics.ts`           | Pure ballistic flight — `ballisticStep` (gravity + quadratic drag), `predictPath` (bomb sight), `ballisticAim` (drop-compensated elevation)    |
| `src/guidance.ts`             | Pure guidance/interception — `steerToward` (turn-rate-limited seeker), `proNav`, `interceptLead` (firing lead)                                 |
| `src/b3d-destroyable.ts`      | `<tosi-b3d-destroyable>` — bridges a `CombatWorld` entry to a mesh; `.damage(n)`, `destroyed` event, floating-origin aware                     |
| `src/destroyable-behavior.ts` | Attachable destroyable — makes _any_ modeled element (GLB, biped, vehicle) take damage without being a separate element                        |
| `src/b3d-warhead.ts`          | `<tosi-b3d-warhead>` — on `detonate(center)` gathers `b3d-destroyable`s in range (LOS raycast), applies `warhead.ts` AOE + explosion FX        |
| `src/b3d-launcher.ts`         | `<tosi-b3d-launcher>` — scene-side shoot loop; drives projectile meshes via `ballistics.ts`, ammo via `resource.ts`, swept collision → warhead |
| `src/b3d-turret.ts`           | `<tosi-b3d-turret>` — auto-tracking gun; slews to lead + elevate (`smart` dial), `can-bear` flag → reticle color                               |

**HUD & Radar (aircraft):**

Same pure-model-bridged-to-Babylon discipline as combat. The sensor (`radar.ts`) decides
_what is seen and locked_; the HUD (`hud-math.ts` → `hud.ts`) decides _where it draws_.
A platform reads `radar.tracks` to plot the HUD and `radar.nearestLock` to give a homing
missile its target (no lock ⇒ the round flies ballistic).

| File                    | Purpose                                                                                                                                               |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/radar.ts`          | Pure, deterministic radar model — range · profile, detection cone, lock acquisition/decay (narrow _acquire_ cone, wider _maintain_ cone); unit-tested |
| `src/hud-math.ts`       | Pure HUD math — Manta-style radar-trace projection (tracks off-screen targets), horizon transform; unit-tested                                        |
| `src/hud.ts`            | HUD driver — 4 meters, horizon/pitch ladder, radar traces, warnings; code HUD (`buildFallbackHud`) is the default, designer SVG via `loadHud`         |
| `src/b3d-hud.ts`        | `<tosi-b3d-hud>` — drop-in additive/translucent HUD overlay; `setMeter`/`setHorizon`/`setTraces`/`setWarnings`                                        |
| `src/b3d-radar.ts`      | `<tosi-b3d-radar>` — nest in the platform (aircraft, turret); enumerates blips, runs `radar.ts`, exposes `tracks`/`nearestLock`                       |
| `src/b3d-radar-blip.ts` | `<tosi-b3d-radar-blip>` — tags a thing as detectable (`profile`, `faction`); nested = follows that mesh, standalone = static world point              |

### Convention-Based Mesh/Light Configuration

PBR material properties from Blender's Principled BSDF are preserved via glTF (`PBRMaterial`). Material appearance (metallic, roughness, emissive, alpha, etc.) comes through automatically. The loader applies performance optimizations based on material properties:

- **Near-opaque alpha** (> 0.95) snapped to 1.0 to avoid unnecessary blend cost
- **Translucent materials** (alpha ≤ 0.95) get depth pre-pass, double-sided rendering, and shadow exclusion

Name suffixes on meshes/lights control **behavioral** properties that can't be inferred from materials:

| Suffix                        | Effect                                  |
| ----------------------------- | --------------------------------------- |
| `_noshadow`                   | Mesh doesn't receive shadows            |
| `_nocast`                     | Mesh doesn't cast shadows               |
| `_mirror`                     | Mesh gets a dynamic reflection probe    |
| `-ignore`                     | Node is disposed on load (filtered out) |
| `_collide` / `_collideSphere` | Sphere collider                         |
| `_collideBox`                 | Box collider                            |
| `_collideCylinder`            | Cylinder collider                       |
| `_collideMesh`                | Mesh collider (exact shape)             |

Underscore-separated variants also work (e.g., `_collide_box`).

### Component Pattern

All components are regular tosijs `Component` subclasses (not blueprints). They use `static initAttributes` for reactive properties and `elementCreator()` for registration. Use `declare prop: Type` (not `prop = default`) for TypeScript typing of initAttributes properties. **Scene children extend `B3dChild`** (or `AbstractMesh`, which extends it and adds position/rotation syncing) rather than `Component` directly — see [Child Lifecycle](#child-lifecycle--the-b3dchild-pull-model). Non-scene UI/utility elements (`b3d-panel`, `b3d-probe`) stay on plain `Component`.

**⚠️ Never name a callback prop `onFoo`.** The element creator (`elementCreator()`) treats any `on*`-prefixed prop as a **DOM event listener** — `b3dController({ onInput })` silently becomes `addEventListener('input', …)` and the `onInput` class field stays `null`, so your callback is never called and there's **no error**. This cost a long debugging detour (the `b3dController` fire callback). Name frame/lifecycle callback props off the `on` prefix: `drive` (controller), `whenDestroyed` (destroyable/loader/behavior), etc. (Reported upstream; tosijs should eventually flag declaring an `onX` property that's also creator-assigned.)

**⚠️ A boolean attribute can't default to `true`.** HTML boolean semantics are correct here — an absent attribute is `false` — so `static initAttributes = { foo: true }` never turns on when the element is written without `foo`, and it fails **silently** (it killed `b3d-trigger`'s `active`). Never declare a default-`true` boolean: either invert it to a negative (`disabled`, default `false` = active — what the trigger now does) or keep the positive meaning with a string enum (`'on' | 'off'`). TODO.md tracks the remaining offenders (black-hole, shadows, star-system, svg-plane). tosijs will eventually make `foo: true` a definition-time error.

**⚠️ `parentElement` is the `<tosi-slot>`, not the component you nested into.** tosijs mounts a component's light-DOM children inside a `<tosi-slot>` wrapper, so for `b3dDestroyable({…}, b3dRadarBlip({…}))` the blip's `parentElement` is that **slot**, not the destroyable. Any child that wants to find "the thing I'm nested in" must skip it — use **`semanticParent(el)`** from `b3d-utils` (walks up past `TOSI-SLOT`). This fails **silently**: the lookup just returns a node with no `mesh`, so the child quietly finds nothing (it cost a long detour — `<tosi-b3d-radar>` found no platform and every nested `<tosi-b3d-radar-blip>` reported a null position, so the radar produced zero tracks and the HUD zero blips). `findB3dOwner()` is unaffected because it walks _all_ the way up. There's no clean workaround — the slot is a real DOM node, so `parentElement` is honestly reporting it; skipping it is the fix. (Documented upstream in the tosijs docs.)

### Adaptive defaults — prefer `auto` over hard-wired performance numbers

The device-capability system (`perf-probe.ts` → `b3d-quality.ts`, driven by the `<tosi-b3d-probe>` benchmark) vends per-tier **budgets** (render scaling, terrain detail, shadow-map size, reflection resolution, …). A single hard-wired default is always wrong for _something_ — too heavy for a Quest, too timid for a workstation.

So **whenever you find a performance-sensitive default, make it `auto` instead of a fixed number**:

- Declare the `initAttributes` default as the `auto` sentinel `0` (a comment says so), not a literal.
- Resolve it where you use it: `const n = resolveBudget(this.someAttr, 'someBudgetKey', { xr })`. An explicit author value (`> 0`) always wins; `0`/unset falls back to the current device tier's budget.
- Values read once at setup (pool/buffer sizes, shadow-map size) must be resolved once and cached on the instance (e.g. terrain's `_resolvedSubs`) — the attribute stays at the `0` sentinel, so re-reading it later would break.
- Add the knob to `PerfBudgets` (and the tier table) in `perf-probe.ts` if it isn't there yet.

`<tosi-b3d>` seeds the profile synchronously from cache before children build (and runs the probe in the background on a cold first visit), applies engine hardware scaling, and re-applies the XR-biased scaling on `IN_XR`. A global `quality="auto|low|medium|high"` attribute (or `setQuality()`) forces a tier. This is the pattern to reach for as more hard-coded defaults surface — terrain/shadows/reflections are the first cases, not the last.

### WebXR / immersive rendering

**`window.requestAnimationFrame` is suspended during an immersive session** — the browser hands the frame clock to the headset compositor, and rendering is expected to go through `XRSession.requestAnimationFrame` (Babylon switches to this internally). Consequences that bite:

- **tosijs's to-DOM binding flush is rAF-batched, so it STALLS in VR.** Value sets, `.observe()` callbacks, and computed values still run synchronously in a session — but the step that projects an observed change onto the DOM (`bindValue`, attribute reflection like `timeOfDay: demo.time`, the component `render()` a bound change triggers) is coalesced onto `window.requestAnimationFrame` and never flushes while immersive. So the _data_ is current but its _DOM projection_ freezes. `<tosi-b3d>` works around this with `_installXrRafPump()`: on `IN_XR` it shims `window.requestAnimationFrame` to enqueue callbacks and flushes them from `onXRFrameObservable` each XR frame, restoring on exit. Anything else batching on window-rAF (tweens, other libs) would freeze the same way in a session.
  - **The stranded-render footgun (flush before entry).** tosijs component render uses a **per-element flag**: `if(!this._renderQueued){this._renderQueued=true; requestAnimationFrame(render)}`. If a render is already queued at the instant the session suspends `window.rAF`, that callback is stranded → the flag stays `true` forever → the element never schedules another render → the pump can't see it → its bindings freeze for the whole session. (The skybox's `realtimeScale` `setInterval` almost always has one pending → "time-of-day slider dead on first XR entry".) Fix: **`await updates()` before `enterXRAsync`** — flush pending rAF-batched work while flat rAF still works, so nothing is stranded. General rule: before handing the frame clock to the compositor, flush anything batched on window-rAF (a stuck per-element flag is invisible to the pump).
- **Dual-presence UI — the `scenePanel` hook.** A `b3d({ scenePanel: (host) => Widget3d[] })` hook (widgets from `widgets3d.ts`: `slider3d`, `toggle3d`, `select3d`, `button3d`, `list3d`, `label3d`, `text3d`) renders BOTH as a flat ⚙ gear overlay AND as a floating in-VR panel (`_attachXrPanel`), both binding the same reactive values. This is how demos expose tweakable settings that work inside the headset — prefer it over an HTML overlay of `<input>`s for any in-scene control. The flat panel rebuilds each time the gear opens (so hooks that read async state, like a library mesh list, stay current); `refreshScenePanel()` updates an already-open one. The XR panel routes controller/mouse picks → texture UV → the panel's viewBox coords → `handlePointer` (coordinate-based, not DOM events).

  **⚠️ It is ONE ui with two presentations — divergence is a bug.** Both build from the same widget list (`_panelWidgets`) and repaint through the same entry point (`_repaintPanels`); XR-only rows (Exit VR, Re-seat) are _appended at the mount site_, never branched into the shared list. Don't write `if (xr)` inside the widget list. The danger isn't cosmetic: when the flat panel could rebuild and the XR panel couldn't, the XR side grew its own "refresh" that swapped the SVG's children in place — which silently detached the `handlePointer`/`scrollBy` closures `panel3d` hangs off the element, and the panel became **untargetable in VR** (the ray hit it and produced a plausible uv that mapped to the wrong control). **Structural changes rebuild the panel; live values rewrite `<text>` nodes in place.** Never reach into an element a component gave you behaviour on. See UI-DESIGN-NOTES.md → "One UI, two presentations".

  **Any code can write to the Perf Stats panel** via `b3d.addDebugSource({name, lines, actions})` — the only debug readout that exists in a headset (no console in VR, and VR has the tightest budget). `lines()` is re-called live; `actions` become buttons, which is how you switch a profiler on from inside the headset. Debug rows render FIRST (a diagnostic below the fold is a diagnostic you can't read).

- **VRAM across sessions:** the Quest browser does not reliably release WebXR GPU resources between enter/exit, so repeated sessions can exhaust VRAM (reticle → checkerboard). Our per-session teardown (`_startDefaultXrExperience`'s disposer) IS complete — verify any new per-session resource is disposed there — but the browser-level retention isn't ours to fix; keep baseline XR VRAM low (render scaling, modest panel/texture resolution).

### Styling — use tosijs's CSS facilities, never hand-roll it

tosijs ships a whole optimized, typed CSS/variable library. **Do not** hand-roll `document.createElement('style')`, manual `id`-uniqueness/dedup, or CSS-as-string templates — reach for the built-ins, which are deduped, updatable/bindable, type-checked, and test-covered.

**Why it matters — the whole philosophy.** The facilities exist to make styling DRY, efficient, low-footprint, and _browser-native_. The principles:

- **DRY / define only what you need.** One sheet per component/id, written once — not per-element inline styles or repeated class strings. No dead rules, no duplication.
- **Low memory footprint & efficiency.** A handful of real, shared `<style>` sheets the browser parses once and reuses, rather than thousands of generated classes or per-node style objects. Let the cascade and CSS variables do the work at runtime.
- **Browser kung fu — leverage what the browser is already great at.** Real stylesheets, the cascade, custom properties (`vars`/`initVars`), container queries, `:host`, containment. Don't reimplement in JS what CSS does natively and faster.
- **Debuggability / traceability.** Every sheet is a real `<style>` keyed by a stable `id`/component tag, inspectable in devtools with the selectors you actually wrote — the deliberate opposite of React/Tailwind's generated, near-untraceable class soup.

Hand-rolled `createElement('style')`, dynamically-concatenated CSS strings, or per-element inline styling all erode these, so lean on the built-ins that preserve them. (`lightStyleSpec` is itself built on `StyleSheet`.)

- **Component styles**: `static lightStyleSpec` (light DOM) or `static shadowStyleSpec` (shadow DOM). `static styleSpec` is **deprecated** — prefer the explicit light/shadow forms so it's clear which is intended. Both take an `XinStyleSheet` object (typed, camelCase props), not a CSS string.
- **Global / light-DOM stylesheets** (e.g. styling a light-DOM component's own tag from the page): `StyleSheet(id, spec)` from `tosijs` — creates/updates one `<style>` keyed by `id`, deduped and re-runnable. This is the correct replacement for any bespoke `<style>` injection (e.g. the pattern in `glass-gamepad.ts`).
- **CSS variables / theming**: use the variable library — `vars`, `initVars`, `varDefault`, `getCssVar`, `invertLuminance`, and the theme-preference API (`getThemePreferences`, `onThemePreferencesChange`, `onStylesheetChange`) — instead of writing literal `var(--x)` strings. It's the optimized path and stays in sync with theming.
- Helpers: `css(obj)` renders an `XinStyleSheet` to a string; `Component.StyleNode(spec)` builds a `<style>` element from a spec.

### Dependencies

- **Runtime**: `@babylonjs/core`, `@babylonjs/gui`, `@babylonjs/loaders`, `@babylonjs/materials` (^9.16)
- **Physics**: `jolt-physics` (^1.0.0) — optional peer dependency
- **Framework**: `tosijs` (^1.6.6) — peer dependency, do not re-export from this library
- **Debug/automation**: `haltija` (`hj`) — headless-browser debug tool used to drive/verify live demos (see the `no-electron-haltija-by-default` memory for the pin-the-right-tab guardrails)
- **Build tooling**: Bun (bundler, dev server, test runner)

## Code Style

- Prettier: single quotes, no semicolons, trailing commas (ES5), 2-space indent
- ESLint: `@typescript-eslint/no-explicit-any` and `no-non-null-assertion` are allowed
- ESM throughout (`"type": "module"` in package.json)

## Testing Patterns

Tests import from `bun:test` (`describe`, `expect`, `test`). The project favors **pure, dependency-free modules** that can be tested without a 3D engine — see `fly-by-wire.ts` (plain `{x, y, z}` objects, no Babylon), `perlin-noise.ts`, and the combat models `resource.ts` / `destroyable.ts` (deterministic — time only via a `dt`/`tick`, no `Date.now`/`Math.random`) as examples. When adding testable logic, follow this pattern: isolate computation from Babylon.js types so it can be unit tested directly. Pure state models that must be reproducible (combat, world-store) advance time explicitly and avoid `Date.now`/`Math.random`.

Run `bun test` to exercise the full pure-model suite (26 files, ~300 tests, under a second — no excuse to skip it). The `*.test.ts` files (`fly-by-wire`, `perlin-noise`, `resource`/`destroyable`/`ballistics`/`guidance`/`warhead`, `radar`/`hud-math`/`hud-side`, `world-store`/`world-view`, `terrain-grid`, `spatial-transform`, `xr-frames`, `aircraft-rig`, `babylon-orientation`, `perf-probe`/`b3d-quality`, `model-transform`, `surface-sampler`, `gradient-filter`, `asset-url`, `svg-to-code`, …) are where the framework's behavior is pinned down without a 3D engine; read the relevant one before changing a model it covers.

## Demo & Docs

- The doc browser is built from `demo/src/` using tosijs-ui's `createDocBrowser`
- Source files use `/*# */` comments for extractable documentation. **Each `src/*.ts` doc comment becomes its own page** — writing the doc where the code is _is_ how a component gets documented; there's no separate docs tree to update.
- `src/docs/*.md` are the hand-written **category landing pages** (`core`, `input`, `vehicles`, `combat`, `world-sim`, `space`, `environment`, `effects`, `ui`, `performance`, `utilities`) — an `<!--{ "order": n }-->` block sets their position and a `<!-- toc -->` lists the pages beneath them. Add a new component's page to the matching category's toc, or it's orphaned.
- `bin/svg-to-code.ts` converts a designer's SVG into a parameterized tosijs `svgElements` builder (HUD, gauges, touch controls). It's how the gamepad/HUD art gets into code as tweakable functions rather than a static asset.
- Assets are in `./static/` and `./demo/static/` (copied to `docs/` during build); large shared blobs (Kenney/CC0 models) live in the sibling `static-assets` repo and are referenced via `assetUrl()`.
- Deployed to GitHub Pages with the **publishing source set to `main` branch, `/docs` folder** — `docs/` is the web root. The build emits root-absolute asset paths (`/iife.js`, etc.) and writes `CNAME` + `.nojekyll` into `docs/`, so the Pages source must be `/docs`, not `/` (serving from root 404s every asset).
- \*_`/_# \*/` examples run through the tjs-lang transpiler, which has a bug: reassigning an ALL-UPPERCASE identifier (`B = BABYLON`) is rewritten to `const B = …`, shadowing a module-level `let B`so it reads null in other functions. Don't alias`BABYLON` (or anything) to an all-caps name and reassign it in a callback — pass it as a parameter, or use a lowercase alias (`babylon`). (Bit the exploder/physics demos; being fixed upstream in tjs-lang.)
- **Put tweakable demo controls in the `scenePanel` hook, not an HTML overlay** (see WebXR section) so they work in VR. Keep only pure readouts / text-entry (no VR keyboard) as slim flat overlays.
- **Doc ordering — demo above the fold.** In a component's `/*# */` doc, put the `## Demo` (the most compelling, live one) FIRST, right after the intro — above `## Attributes` and any large reference blocks. Readers (and AI agents) should hit a working example immediately, not scroll past a table to find it. Tables/attribute reference go below the demo(s).
