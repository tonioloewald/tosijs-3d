# tosijs-3d

[github](https://github.com/tonioloewald/tosijs-3d/) | [live demo](https://3d.tosijs.net) | [npm](https://www.npmjs.com/package/tosijs-3d)

<div style="text-align: center; margin: 20px">
  <img style="width: 280px; height: 280px;" alt="tosijs-3d logo" src="https://3d.tosijs.net/favicon.svg">
</div>

**tosijs-3d is a library for building 3D web apps** — and standalone apps, if
that is what you want. Under the hood it uses Babylon.js for rendering, glTF/GLB
for models and the usual bitmap formats for textures — but it also leans on
**SVG**, for textures and for the entire user interface.

Free and open source, and light for what it is (Babylon is not small; this
adds little to it). Scenes are composed from **web components**, so a world is
markup you can read:

```javascript
b3d(
  b3dSun({ shadowCascading: true }),
  b3dSkybox({ timeOfDay: 6 }),
  b3dLoader({ url: './scene.glb' }),
  b3dWater({ y: -0.2 })
)
```

The [doc site](https://3d.tosijs.net) has about a hundred live demos you can
edit in place; the [b3d page](https://3d.tosijs.net/tosi-b3d/) is that scene
running.

## Getting started

```bash
npm install tosijs-3d tosijs @babylonjs/core @babylonjs/gui @babylonjs/loaders @babylonjs/materials
```

Babylon (`^9`) and `tosijs` (`^1.9.2`) are peer dependencies: you install
them, so there is exactly one copy of the engine in your app. `jolt-physics`
is an optional peer, needed only if you use `b3dPhysics`.

A first scene, with no model file to find:

```javascript
import { b3d, b3dSun, b3dSkybox, b3dGround, b3dBox, b3dSphere } from 'tosijs-3d'

document.body.append(
  b3d(
    b3dSun({ shadowCascading: true }),
    b3dSkybox({ timeOfDay: 10 }),
    b3dGround({ size: 24, texture: 'checker' }),
    b3dBox({ x: -1.5, y: 0.5, color: '#c8553d' }),
    b3dSphere({ x: 1.5, y: 1, diameter: 2, color: '#ffd166' })
  )
)
```

Give `tosi-b3d` a size in CSS (`tosi-b3d { width: 100vw; height: 100vh }`) and
you have a lit scene with shadows and an orbit camera. Then:

- **Your own model:** [b3d-loader](https://3d.tosijs.net/b3d-loader/) takes a
  GLB; name suffixes on its meshes (`_collide`, `_mirror`, `_nocast`) set how
  they behave.
- **Something to drive:** a [character](https://3d.tosijs.net/b3d-biped/), a
  [car](https://3d.tosijs.net/b3d-car/) or an
  [aircraft](https://3d.tosijs.net/b3d-aircraft/), inside an
  [input focus](https://3d.tosijs.net/b3d-input-focus/) so keyboard, gamepad,
  touch and VR controllers all work.
- **A world:** [terrain](https://3d.tosijs.net/b3d-terrain/),
  [water](https://3d.tosijs.net/b3d-water/) and a
  [sky](https://3d.tosijs.net/b3d-skybox/); [Land and
  Sky](https://3d.tosijs.net/land-and-sky/) is all of it at once.
- **Controls that work in a headset:** the `scenePanel` hook on
  [b3d](https://3d.tosijs.net/tosi-b3d/) and the
  [widget set](https://3d.tosijs.net/widgets3d/).

## Four things you may not have seen in a 3D library

**Flat 3D and VR are the same app.** You can enter and leave an immersive
session without the simulation resetting — the scene, the physics and your
place in the world all survive the transition, because nothing is torn down to
make it.

**One user interface, in three places.** The SVG-powered widget set renders
identically as a DOM overlay, on a plane inside a 3D scene, and in VR. Not three
implementations that drift — one, with three presentations, where any divergence
is treated as a bug.

**One control system, every input.** Keyboard and mouse, gamepads, VR
controllers and touch all arrive as the same `ControlInput`. You write the
behaviour once; supporting a new device is a new provider, not a rewrite.

**The simulation is testable without a GPU.** The flight model, the combat
maths, the world state and the layout engine are deliberately Babylon-free,
deterministic, and unit-tested — so the interesting logic can be exercised in
milliseconds rather than in a browser.

## Finding things

**Search the [attribute index](https://3d.tosijs.net/attributes.txt)** before
assuming a capability does not exist — one greppable line per attribute,
generated from source on every build. There is a [JSON
form](https://3d.tosijs.net/attributes.json) for tools, and both ship **inside
the package**, so an agent already in a consumer project reads
`node_modules/tosijs-3d/static/attributes.txt` with no network.

It exists because the recurring adopter failure is not a missing feature, it is
a feature that ships, is documented, and cannot be found: three issues in one
week turned out to be capability that was already there. One `grep water` finds
`submersible`; reading two hundred doc pages does not.

**Upgrading?** See [Migration](https://3d.tosijs.net/Migration/) for the
breaking changes and what to do about them, and the
[Changelog](https://3d.tosijs.net/CHANGELOG/) for the full detail. Both ship
inside the package as `Migration.md` and `CHANGELOG.md`, so they work from
`node_modules` too.

## Highlights

**Procedural astronomical objects** — [planets](https://3d.tosijs.net/b3d-planet/),
[stars and star systems](https://3d.tosijs.net/b3d-star-system/),
[galaxies](https://3d.tosijs.net/b3d-galaxy/), and
[black holes](https://3d.tosijs.net/b3d-black-hole/) with accretion disk, photon
ring and lensing. Generated, not modelled — a solar system is a few attributes.

**Procedural terrain** — [streaming LOD terrain](https://3d.tosijs.net/b3d-terrain/)
with a [biome shader](https://3d.tosijs.net/biome-chart/) that runs one material
from seafloor to mountain, a floating origin so worlds can be large, and
[carved landforms](https://3d.tosijs.net/sdf-lattice/) — volcanoes with lava
tubes bored through them, arches, caverns.

**Biped control** — a [character controller](https://3d.tosijs.net/b3d-biped/)
with an animation state machine and follow/XR cameras, from a GLB.

**Aircraft control** — a [forgiving flight model](https://3d.tosijs.net/b3d-aircraft/)
that flies like a drone below transition speed and like a plane above it, with
VTOL, bank-to-turn, a HUD and radar.

**One UI for flat, in-scene and VR** — the [widget set](https://3d.tosijs.net/widgets3d/)
renders as a DOM overlay, as a texture on a surface in the scene, and as a
floating panel in a headset, from the same declaration. Includes a
[flowing box model](https://3d.tosijs.net/box/), [menus and panels](https://3d.tosijs.net/surface/),
a data table, and an on-screen keyboard — because a headset has nowhere to type.

**SVG textures** — [draw with SVG](https://3d.tosijs.net/svg-texture/), use it as
a live texture. Designer artwork becomes a HUD, a gauge, or a control surface
without a round-trip through a bitmap.

...and a few things that are less visible but are why the rest works:

**Every input device behind one interface** — keyboard/mouse, touch, hardware
gamepads and XR controllers all produce the same `ControlInput`, so an entity is
driven identically by a thumbstick, a glass pad, or an AI. Vehicle enter/exit and
input focus come with it. Most frameworks hand you the input surface and wish you
luck.

**Simulation that doesn't know about the renderer** — a pure, deterministic
world store with a documented contract, so an external driver (a narrative
engine, a test, a headless run) can drive a world the simulation never had to
anticipate.

**Adaptive by default** — a device-capability probe vends per-tier budgets, and
performance-sensitive settings resolve to `auto` rather than to a number that is
always wrong for something. A Quest and a workstation get different worlds.

**Pure models, actually tested** — the flight model, ballistics, guidance, biome
classification, layout and text editing are engine-free and unit-tested (about
3,000 tests, run in seconds with no GPU). If it can be a function of its inputs,
it is.

## Development

Requires [Bun](https://bun.sh).

```bash
bun install
bun tls     # once: local HTTPS certificates (needs mkcert)
bun start   # the doc site and dev server, rebuilding on change
bun test
```

The dev server runs on https://localhost:8030.

<!--{ "pin": "top" }-->
