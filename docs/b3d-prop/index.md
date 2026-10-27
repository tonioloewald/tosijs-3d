# b3d-prop

**A library model in the scene, and nothing else.** A transform, a mesh name,
and no behaviour, which is most of what populates a level.

```markup
<tosi-b3d-library url="https://cdn.tosijs.net/kenney/libraries/nature-kit-core.glb"
                  type="nature"></tosi-b3d-library>
<tosi-b3d-prop library="nature" mesh-name="tree_pineDefaultA"
               x="2" z="-3" ry="45"></tosi-b3d-prop>
```

## Demo

```js
import { b3d, b3dLight, b3dSun, b3dSkybox, b3dLibrary, b3dProp, b3dGround } from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'
import { assetUrl } from 'tosijs-3d'

preview.append(
  b3d(
    {
      style: 'width:100%;height:100%',
      sceneCreated(el) {
        orbitCam(el, { alphaDeg: -75, betaDeg: 60, radius: 9, target: [0, 1, 0] })
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

Three props from one Kenney kit, placed declaratively.

## Why a prop

A prop has no combat record. A `<tosi-b3d-destroyable>` can place a library mesh
too, but it registers something nothing will ever shoot, with `capacity`, `armor`
and the rest all inert.

It also makes the CDN's models reachable from a page that cannot run JavaScript.
`cdn.tosijs.net` publishes its kits as one glb per kit, with every model at the
ORIGIN (the format is built for `getObjectByName(...).clone()`). Point a plain
viewer at `cube-pets.glb` and you get 24 animals stacked inside each other. With a
prop, a Markdown page with raw HTML and no `<script>` can still ask for one parrot.

## `library-url` — the one-model case

A separate `<tosi-b3d-library>` plus a `type` handshake is right when several
props share a kit, and ceremony when you want one object:

```markup
<tosi-b3d-prop library-url="https://cdn.tosijs.net/kenney/libraries/cube-pets.glb"
               mesh-name="parrot" y="0.5"></tosi-b3d-prop>
```

The element mounts its own hidden `<tosi-b3d-library>` and uses it. Several
props sharing one `library-url` share the ONE library element, so the glb is
fetched once rather than per prop.

## Attributes

| attribute | default | |
| --- | --- | --- |
| `library` | `''` | `type` of a `<tosi-b3d-library>` in the scene |
| `libraryUrl` | `''` | glb URL — mounts a library for you; use instead of `library` |
| `meshName` | `''` | model name within the library |
| `scale` | `1` | uniform scale applied to the instance root |
| `x` `y` `z` | `0` | position |
| `rx` `ry` `rz` | `0` | rotation, in DEGREES |

## Loading from a library

Props, destroyables, turrets and launchers share one library loader, and it
handles three things you would otherwise trip over:

- **The library may connect after the prop.** Declaration order in a scene is
  yours to choose, so the loader retries briefly rather than giving up.
- **Rotation is applied when the instance is made,** so an async load keeps
  `rx`/`ry`/`rz`.
- **A stale load never lands.** Remove the element while its model is loading and
  the result is discarded, rather than leaving a node owned by nobody.
