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

See the [b3d](?tosi-b3d.ts) page for that running, and every page here carries a
live demo you can edit in place.

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
`submersible`; reading 147 doc pages does not.

**Upgrading?** See [Migration.md](./Migration.md) for the breaking changes and
what to do about them, and [CHANGELOG.md](./CHANGELOG.md) for the full detail.
Both ship inside the package, so they work from `node_modules` too.

```javascript
import {
  b3d,
  b3dSun,
  b3dSkybox,
  b3dLoader,
  b3dWater,
  b3dReflections,
} from 'tosijs-3d'

document.body.append(
  b3d(
    { glowLayerIntensity: 1 },
    b3dSun({ shadowCascading: true }),
    b3dSkybox({ timeOfDay: 6, realtimeScale: 100 }),
    b3dLoader({ url: './scene.glb' }),
    b3dWater({ y: -0.2 }),
    b3dReflections()
  )
)
```

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
classification, layout and text editing are engine-free and unit-tested (1000+
assertions run in ~2s with no GPU). If it can be a function of its inputs, it is.

## Development

Requires [Bun](https://bun.sh).

```bash
bun install
bun start
```

Dev server runs on https://localhost:8030 with auto-rebuild on file changes.

<!--{ "pin": "top" }-->
