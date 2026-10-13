# b3d-prop

**A library model in the scene, and nothing else.** A transform, a mesh name,
and no behaviour — which is most of what populates a level.

```markup
<tosi-b3d-library url="https://cdn.tosijs.net/kenney/libraries/nature-kit-core.glb"
                  type="nature"></tosi-b3d-library>
<tosi-b3d-prop library="nature" mesh-name="tree_pineDefaultA"
               x="2" z="-3" ry="45"></tosi-b3d-prop>
```

## Why this exists

`b3d-destroyable`'s own doc named the gap it closed — *"a static, destroyable
thing that uses a library mesh is most of what populates a level, and there was
no route to it"* — and stopped one case short of this one. A plain prop had to
be a `<tosi-b3d-destroyable>` with `capacity`, `armor`, `regenRate`, `explode`
and `deathBlast` all inert but all present, plus a combat id registered in the
`CombatWorld` for an object nothing will ever shoot.

## The reason it matters more than "a convenience element"

**It is the difference between the CDN's 5,108 models being reachable or not
from a page that cannot run JavaScript.**

`cdn.tosijs.net` publishes 48 kit libraries, one glb per kit, uniform by
construction — but every model sits at the ORIGIN with no translation, because
the format is built for `getObjectByName(...).clone()`. Point a plain viewer at
`cube-pets.glb` and you get 24 animals stacked inside each other. So a consumer
with a JS build reaches all 5,108 and a consumer writing declarative HTML
reaches **zero**.

Reported from `tosijs-product`, whose doc pages are Markdown with raw HTML and
**no `<script>` execution** — the scroll narrative is authored as elements with
attributes. They wanted one parrot out of `cube-pets.glb` and there was no way
to ask for it.

## `library-url` — the one-model case

A separate `<tosi-b3d-library>` plus a `type` handshake is right when several
props share a kit, and ceremony when you want one object:

```markup
<tosi-b3d-prop library-url="https://cdn.tosijs.net/kenney/libraries/cube-pets.glb"
               mesh-name="parrot" y="0.5"></tosi-b3d-prop>
```

The element mounts its own hidden `<tosi-b3d-library>` and uses it. Several
props sharing one `library-url` share the ONE library element, so the glb is
fetched once rather than per prop — otherwise this convenience would quietly
cost a download per model.

> The markup blocks above use a ```markup fence, not ```html — an `html` fence
> is a LIVE EXAMPLE language here (html/js/css fences compose one runnable
> example), so markup meant only to be read would be executed. Written as
> `html`, these two blocks became live custom elements with no scene around
> them.

## Attributes

| attribute | default | |
| --- | --- | --- |
| `library` | `''` | `type` of a `<tosi-b3d-library>` in the scene |
| `libraryUrl` | `''` | glb URL — mounts a library for you; use instead of `library` |
| `meshName` | `''` | model name within the library |
| `scale` | `1` | uniform scale applied to the instance root |
| `x` `y` `z` | `0` | position |
| `rx` `ry` `rz` | `0` | rotation, in DEGREES |

## Demo

Three props from one Kenney kit, placed declaratively.

```js
import { b3d, b3dLight, b3dSun, b3dSkybox, b3dLibrary, b3dProp, b3dGround } from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'
import { assetUrl } from 'tosijs-3d'

preview.append(
  b3d(
    {
      style: 'width:100%;height:100%',
      sceneCreated(el) {
        orbitCam(el, { alpha: -Math.PI / 2.4, beta: Math.PI / 3, radius: 9, target: [0, 1, 0] })
      },
    },
    b3dSun({}),
    b3dSkybox({ timeOfDay: 9 }),
    b3dLight({ intensity: 0.5 }),
    b3dGround({ size: 40, color: '#6b7a4f' }),
    b3dLibrary({ url: assetUrl('kenney/libraries/nature-kit-core.glb'), type: 'nature' }),
    b3dProp({ library: 'nature', meshName: 'tree_pineDefaultA', x: -2, z: 0 }),
    b3dProp({ library: 'nature', meshName: 'tree_pineDefaultA', x: 2.4, z: -1.5, ry: 40, scale: 1.4 }),
    b3dProp({ library: 'nature', meshName: 'rock_largeA', x: 0.6, z: 1.6, ry: 120 })
  )
)
```
```css
.preview { height: 100%; }
```
