# tosijs-3d

[github](https://github.com/tonioloewald/tosijs-3d/) | [live demo](https://3d.tosijs.net) | [npm](https://www.npmjs.com/package/tosijs-3d)

<div style="text-align: center; margin: 20px">
  <img style="width: 280px; height: 280px;" alt="tosijs-3d logo" src="https://3d.tosijs.net/favicon.svg">
</div>

Declarative 3D/XR framework built on Babylon.js and tosijs. Compose 3D scenes with web components.
See the [b3d](?tosi-b3d.ts) page for a live interactive demo.

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
