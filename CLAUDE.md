# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

tosijs-3d is a declarative 3D/XR framework built on Babylon.js and the tosijs web component framework. It provides composable custom elements for building 3D scenes — a parent `<tosi-b3d>` element manages the engine/scene, and child components (sun, skybox, water, reflections, character controllers, etc.) compose inside it to build scenes declaratively.

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

### Input Architecture

Input is abstracted through a layered system:

- **`ControlInput`** — universal control interface with fields like `forward`, `strafe`, `turn`, `pitch`, `throttle`, `jump`, `shoot`, `sprint`, `interact`, `cameraZoom`, etc.
- **`InputProvider`** — any input source (keyboard/mouse, gamepad, XR controllers, AI) implements this to produce `ControlInput`
- **`CompositeInputProvider`** — merges multiple providers (e.g., keyboard + XR sticks)
- **`B3dControllable`** — base class for any entity that accepts `ControlInput` (biped, car, etc.)
- **`B3dInputFocus`** (`inputFocus()`) — routes input to the active controllable entity and handles vehicle enter/exit via the `interact` action

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
| `src/b3d-utils.ts` | `AbstractMesh` base class, `findB3dOwner()`, `enterXR()`, `placeOnSurface()`, shared types |
| `src/b3d-loader.ts` | Loads GLB/GLTF files, registers meshes/lights, applies naming conventions |
| `src/b3d-library.ts` | Parts catalog — preloaded mesh library for spawning instances |
| `src/b3d-collisions.ts` | Collision detection with convention-based collider shapes |
| `src/b3d-trigger.ts` | Proximity-based trigger zones |

**Input & Control:**
| File | Purpose |
| --- | --- |
| `src/control-input.ts` | `ControlInput` interface, `InputProvider`, `CompositeInputProvider` |
| `src/b3d-controllable.ts` | Base class for input-driven entities (biped, car, aircraft) |
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
| `src/perf-probe.ts` / `b3d-quality.ts` / `b3d-probe.ts` | Device-capability probe → per-tier `PerfBudgets` (see Adaptive defaults) |
| `src/b3d-physics.ts` / `jolt-plugin.ts` | Jolt Physics integration layer |

**Combat (pure models + bridges — WIP, spec in `COMBAT-DESIGN.md`):**
| File | Purpose |
| --- | --- |
| `src/resource.ts` | Pure capacity + delayed-regen pool — Destroyable health AND launcher energy |
| `src/destroyable.ts` | Pure `CombatWorld` — damage (protection/armor), regen, cascading chain reactions; deterministic |

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

All components are regular tosijs `Component` subclasses (not blueprints). They use `static initAttributes` for reactive properties and `elementCreator()` for registration. Use `declare prop: Type` (not `prop = default`) for TypeScript typing of initAttributes properties. The `AbstractMesh` base class provides position/rotation syncing for components that manage Babylon meshes.

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
- **Dual-presence UI — the `scenePanel` hook.** A `b3d({ scenePanel: (host) => Widget3d[] })` hook (widgets from `widgets3d.ts`: `slider3d`, `toggle3d`, `select3d`, `button3d`, `list3d`, `label3d`, `text3d`) renders BOTH as a flat ⚙ gear overlay AND as a floating in-VR panel (`_attachXrPanel`), both binding the same reactive values. This is how demos expose tweakable settings that work inside the headset — prefer it over an HTML overlay of `<input>`s for any in-scene control. The flat panel rebuilds each time the gear opens (so hooks that read async state, like a library mesh list, stay current); `refreshScenePanel()` updates an already-open one. The XR panel routes controller/mouse picks → texture UV → the panel's viewBox coords → `handlePointer` (coordinate-based, not DOM events).
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

- **Runtime**: `@babylonjs/core`, `@babylonjs/gui`, `@babylonjs/loaders`, `@babylonjs/materials` (^8.55)
- **Physics**: `jolt-physics` (^1.0.0) — optional peer dependency
- **Framework**: `tosijs` (^1.5.0) — peer dependency, do not re-export from this library
- **Build tooling**: Bun (bundler, dev server, test runner)

## Code Style

- Prettier: single quotes, no semicolons, trailing commas (ES5), 2-space indent
- ESLint: `@typescript-eslint/no-explicit-any` and `no-non-null-assertion` are allowed
- ESM throughout (`"type": "module"` in package.json)

## Testing Patterns

Tests import from `bun:test` (`describe`, `expect`, `test`). The project favors **pure, dependency-free modules** that can be tested without a 3D engine — see `fly-by-wire.ts` (plain `{x, y, z}` objects, no Babylon), `perlin-noise.ts`, and the combat models `resource.ts` / `destroyable.ts` (deterministic — time only via a `dt`/`tick`, no `Date.now`/`Math.random`) as examples. When adding testable logic, follow this pattern: isolate computation from Babylon.js types so it can be unit tested directly. Pure state models that must be reproducible (combat, world-store) advance time explicitly and avoid `Date.now`/`Math.random`.

## Demo & Docs

- The doc browser is built from `demo/src/` using tosijs-ui's `createDocBrowser`
- Source files use `/*# */` comments for extractable documentation
- Assets are in `./static/` and `./demo/static/` (copied to `docs/` during build)
- Deployed to GitHub Pages with the **publishing source set to `main` branch, `/docs` folder** — `docs/` is the web root. The build emits root-absolute asset paths (`/iife.js`, etc.) and writes `CNAME` + `.nojekyll` into `docs/`, so the Pages source must be `/docs`, not `/` (serving from root 404s every asset).
- \*_`/_# \*/` examples run through the tjs-lang transpiler, which has a bug: reassigning an ALL-UPPERCASE identifier (`B = BABYLON`) is rewritten to `const B = …`, shadowing a module-level `let B`so it reads null in other functions. Don't alias`BABYLON` (or anything) to an all-caps name and reassign it in a callback — pass it as a parameter, or use a lowercase alias (`babylon`). (Bit the exploder/physics demos; being fixed upstream in tjs-lang.)
- **Put tweakable demo controls in the `scenePanel` hook, not an HTML overlay** (see WebXR section) so they work in VR. Keep only pure readouts / text-entry (no VR keyboard) as slim flat overlays.
