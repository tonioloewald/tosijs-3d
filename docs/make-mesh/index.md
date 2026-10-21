# make-mesh

**`el.make.box({ y: 1, color: '#c33', glow: 0.3 })`** — Babylon primitives with
the four things everyone forgets already done.

## Demo

```js
import { b3d, b3dSkybox } from 'tosijs-3d'
import { demoStage, orbitCam } from 'tosijs-3d/demo-utils'

const scene = b3d(
  {
    glowLayerIntensity: 0.7,
    sceneCreated(el) {
      orbitCam(el, { radius: 9, target: [0, 1, 0] })
      // Every one of these casts a shadow and is ray-ready immediately.
      el.make.box({ size: 1.2, x: -2.4, y: 0.9, color: '#b8483a', glow: 0.25 })
      el.make.sphere({ diameter: 1.3, y: 1, color: '#3f7fb8' })
      el.make.cylinder({ height: 1.8, diameter: 0.9, x: 2.4, y: 0.9, color: '#c9a227', glow: 0.15 })
      el.make.torus({ diameter: 1.4, thickness: 0.28, y: 2.6, rx: 90, color: '#6ab04c' })
      // Never hand-written here — the proxy forwards to MeshBuilder.CreateIcoSphere.
      el.make.icoSphere({ radius: 0.7, subdivisions: 2, x: -2.4, y: 2.6, color: '#b07acc', glow: 0.3 })
      el.make.torusKnot({ radius: 0.5, tube: 0.16, x: 2.4, y: 2.7, color: '#e08a3c', glow: 0.2 })
    },
  },
  ...demoStage({ size: 16, tiles: 10, texture: '/tosi-warhol-testgrid.svg' }),
)

preview.append(scene)
```

`b3dBox`/`b3dSphere`/`b3dGround` cover the DECLARATIVE case. But plenty of scene
code is imperative — inside `sceneCreated`, in a spawner, in a demo — and there
the honest version of "add a cube" is:

```javascript
const box = BABYLON.MeshBuilder.CreateBox('box', { size: 1 }, el.scene)
box.position.set(0, 1, 0)
const mat = new BABYLON.StandardMaterial('box-mat', el.scene)
mat.diffuseColor = BABYLON.Color3.FromHexString('#c33')
box.material = mat
el.register({ meshes: [box] }) // or it casts no shadow
box.computeWorldMatrix(true) // or a ray this frame misses it
```

Six lines, of which the last two are invisible until something is subtly wrong.
This is the same shape as `b3d-library`'s `lib.make.scout()` for content, and
tosijs's `elementCreator`: the thing you want, named, taking the
options you'd have set anyway.

## What it does for you

| | why it matters |
| --- | --- |
| **material** from `color`/`glow`/`glowColor` | the same `primitiveMaterial` `b3dBox` uses, so the two paths cannot drift |
| **`register()`** with the owner | shadow casting, reflection probes — the scene-listener contract. A mesh nobody registered is a mesh the sun has never heard of |
| **`computeWorldMatrix(true)`** | see below — this one is a genuine trap |
| **degrees** for `rx`/`ry`/`rz` | matches `AbstractMesh`, which is degrees. Babylon is radians, so a bare number is ambiguous exactly where it hurts |

## It covers everything `MeshBuilder` has

`make` is a Proxy that forwards `make.<shape>` to `MeshBuilder.Create<Shape>`, so
all 26 are there — `icoSphere`, `torusKnot`, `polyhedron`, `tube`, `lathe`,
`geodesic`, `goldberg`, `tiledBox` — plus whatever Babylon adds later, with no
code here to keep in step. Options you don't recognise are simply forwarded, so
a shape's own parameters work exactly as they do in Babylon.

It is weightless: one Proxy, and a closure only for the names actually used.
That laziness is the point — a hand-written list of eight would be wrong the
moment somebody wanted the ninth.

`make.decal` is refused with a message, because `CreateDecal` takes a source
mesh rather than options and so doesn't fit the forwarding shape.

## Why `worldMatrix` defaults to true

A mesh that has been positioned but never RENDERED has no world matrix, so
anything that reads world space this frame — a ray, a bounding check, an
`absolutePosition` — sees it **at the origin**. It does not throw; it quietly
answers about a phantom copy somewhere else.

A wall placed at `z=6` and shot at on its first frame reports an impact near the
origin with a confident normal off the wrong face: the ray started inside the
phantom and exited its far side.

Pass `worldMatrix: false` if you are about to reposition the mesh anyway and
want to skip the work.
