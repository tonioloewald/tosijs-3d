# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

tosijs-3d is a declarative 3D/XR framework built on Babylon.js and the tosijs web component framework. It provides composable custom elements for building 3D scenes — a parent `<tosi-b3d>` element manages the engine/scene, and child components (sun, skybox, water, reflections, character controllers, etc.) compose inside it to build scenes declaratively.

## Build & Development Commands

- **Dev server**: `bun start` (formats code, then runs HTTPS dev server on port 8030 with file watching)
- **Format**: `bun format` (ESLint fix + Prettier)
- **Run tests**: `bun test` (Bun's native test runner, test files use `*.test.ts` pattern)
- **Run single test**: `bun test src/perlin-noise.test.ts`
- **TLS setup**: `cd tls && ./create-dev-certs.sh` (required once for HTTPS dev server)

The dev server (`dev.ts`) watches `./src` and `./demo/src`, and builds two bundles on every change:

1. **Library**: `src/index.ts` → `dist/index.js` (minified, with source maps)
2. **Doc browser**: `demo/src/index.ts` → `docs/index.js`

It also runs `bin/docs.ts` to extract `/*# */` doc comments from source files into `demo/docs.json`. TypeScript is set to `noEmit` — Bun handles all compilation and bundling.

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

### Key Files

| File                       | Purpose                                                                                  |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| `src/tosi-b3d.ts`          | Core `B3d` Component — engine, scene, render loop, scene registration, camera management |
| `src/b3d-utils.ts`         | `AbstractMesh` base class, `findB3dOwner()`, `enterXR()`, shared types                   |
| `src/b3d-collisions.ts`    | Collision detection system with convention-based collider shapes                         |
| `src/b3d-controllable.ts`  | `B3dControllable` — base class for input-driven entities                                 |
| `src/control-input.ts`     | `ControlInput` interface, `InputProvider`, `CompositeInputProvider`                      |
| `src/b3d-input-focus.ts`   | `B3dInputFocus` — input routing and vehicle enter/exit mechanics                         |
| `src/xr-input-provider.ts` | XR controller input implementation of `InputProvider`                                    |
| `src/b3d-biped.ts`         | `B3dBiped` — character controller with animation state machine, follow/XR camera         |
| `src/b3d-car.ts`           | `B3dCar` — vehicle with acceleration, steering, wheel spin, enterability                 |
| `src/b3d-shadows.ts`       | `B3dSun` — directional light with cascaded/standard shadow generation                    |
| `src/b3d-skybox.ts`        | `B3dSkybox` — procedural sky with day/night cycle, sun positioning                       |
| `src/b3d-water.ts`         | `B3dWater` — water surface using WaterMaterial with waves/wind                           |
| `src/b3d-reflections.ts`   | `B3dReflections` — automatic reflection probes for `_mirror` meshes                      |
| `src/b3d-loader.ts`        | `B3dLoader` — loads GLB/GLTF files, registers meshes/lights                              |
| `src/b3d-light.ts`         | `B3dLight` — hemispheric ambient light                                                   |
| `src/b3d-primitives.ts`    | `B3dSphere`, `B3dGround` — basic mesh primitives                                         |
| `src/b3d-button.ts`        | `B3dButton` — 3D GUI button                                                              |
| `src/game-controller.ts`   | `GameController` — keyboard/mouse input with attack/decay smoothing                      |
| `src/gamepad.ts`           | Hardware gamepad and XR controller state utilities                                       |
| `src/perlin-noise.ts`      | `PerlinNoise` — seeded 2D/3D noise for procedural generation                             |

### Convention-Based Mesh/Light Configuration

Name suffixes on meshes/lights (set in the 3D authoring tool) control behavior:

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

- **Runtime**: `@babylonjs/core`, `@babylonjs/gui`, `@babylonjs/loaders`, `@babylonjs/materials` (^8.53)
- **Framework**: `tosijs` (^1.4.1) — peer dependency, do not re-export from this library
- **Build tooling**: Bun (bundler, dev server, test runner)

## Code Style

- Prettier: single quotes, no semicolons, trailing commas (ES5), 2-space indent
- ESLint: `@typescript-eslint/no-explicit-any` and `no-non-null-assertion` are allowed
- ESM throughout (`"type": "module"` in package.json)

## Demo & Docs

- `index.html` redirects to the doc browser at `docs/index.html`
- The doc browser is built from `demo/src/` using tosijs-ui's `createDocBrowser`
- Source files use `/*# */` comments for extractable documentation
- Assets are in `./static/`
