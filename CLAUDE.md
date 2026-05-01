# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

tosijs-3d is a declarative 3D/XR framework built on Babylon.js and the tosijs web component framework. It provides composable custom elements for building 3D scenes — a parent `<tosi-b3d>` element manages the engine/scene, and child components (sun, skybox, water, reflections, character controllers, etc.) compose inside it to build scenes declaratively.

## Build & Development Commands

- **Dev server**: `bun start` (formats code, then runs HTTPS dev server on port 8030 with file watching)
- **Format**: `bun format` (ESLint fix + Prettier)
- **Run tests**: `bun test` (Bun's native test runner, test files use `*.test.ts` pattern)
- **Run single test**: `bun test src/perlin-noise.test.ts`
- **Build blueprint**: `bun make` (builds `src/blueprint.ts` → `dist/blueprint.js`, minified)
- **TLS setup**: `cd tls && ./create-dev-certs.sh` (required once for HTTPS dev server)

The dev server (`dev.ts`) watches `./src` and `./demo/src`, and on every change:

1. **Runs tests** via `bun test` (failures are logged but don't block the build)
2. Extracts `/*# */` doc comments → `demo/docs.json`
3. Builds **library**: `src/index.ts` → `dist/index.js` (minified, with source maps)
4. Builds **doc browser**: `demo/src/index.ts` → `docs/index.js`

TypeScript is set to `noEmit` — Bun handles all compilation and bundling. `jolt-physics` is marked as an external in the build (not bundled into `dist/`) — consumers must install it separately.

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

`aircraft-physics.ts` is a **pure, dependency-free force model** — it uses plain `{x, y, z}` objects (not Babylon Vector3) so it can be unit tested without a 3D engine. The companion `b3d-aircraft.ts` bridges this to Babylon. The force model handles lift, drag, thrust, VTOL transitions, and stall behavior.

### Key Files

**Core & Scene:**
| File | Purpose |
| --- | --- |
| `src/tosi-b3d.ts` | Core `B3d` Component — engine, scene, render loop, scene registration, camera management |
| `src/b3d-utils.ts` | `AbstractMesh` base class, `findB3dOwner()`, `enterXR()`, shared types |
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
| `src/game-controller.ts` | Legacy keyboard/mouse input with attack/decay smoothing |

**Controllable Entities:**
| File | Purpose |
| --- | --- |
| `src/b3d-biped.ts` | Character controller with animation state machine, follow/XR camera |
| `src/b3d-car.ts` | Vehicle with acceleration, steering, wheel spin, enterability |
| `src/b3d-aircraft.ts` | Aircraft with VTOL, flight dynamics, follow camera |
| `src/aircraft-physics.ts` | Pure force model (zero Babylon deps) — lift, drag, thrust, VTOL, stall |

**Environment & Effects:**
| File | Purpose |
| --- | --- |
| `src/b3d-shadows.ts` | `B3dSun` — directional light with cascaded/standard shadows |
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

**UI & Textures:**
| File | Purpose |
| --- | --- |
| `src/svg-texture.ts` | Dynamic SVG → Babylon texture rendering |
| `src/b3d-svg-plane.ts` | In-scene SVG-based UI planes |
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
| `src/b3d-physics.ts` / `jolt-plugin.ts` | Jolt Physics integration layer |

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

Tests import from `bun:test` (`describe`, `expect`, `test`). The project favors **pure, dependency-free modules** that can be tested without a 3D engine — see `aircraft-physics.ts` (plain `{x, y, z}` objects, no Babylon) and `perlin-noise.ts` as examples. When adding testable logic, follow this pattern: isolate computation from Babylon.js types so it can be unit tested directly.

## Demo & Docs

- `index.html` redirects to the doc browser at `docs/index.html`
- The doc browser is built from `demo/src/` using tosijs-ui's `createDocBrowser`
- Source files use `/*# */` comments for extractable documentation
- Assets are in `./static/` and `./demo/static/` (copied to `docs/` during build)
- Deployed to GitHub Pages from `docs/` directory (CNAME file in repo root)
