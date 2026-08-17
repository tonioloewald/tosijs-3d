/*#
# make-mesh

**`el.make.box({ y: 1, color: '#c33', glow: 0.3 })`** — Babylon primitives with
the four things everyone forgets already done.

`b3dBox`/`b3dSphere`/`b3dGround` cover the DECLARATIVE case. But plenty of scene
code is imperative — inside `sceneCreated`, in a spawner, in a demo — and there
the honest version of "add a cube" is:

```js
const box = BABYLON.MeshBuilder.CreateBox('box', { size: 1 }, el.scene)
box.position.set(0, 1, 0)
const mat = new BABYLON.StandardMaterial('box-mat', el.scene)
mat.diffuseColor = BABYLON.Color3.FromHexString('#c33')
box.material = mat
el.register({ meshes: [box] }) // or it casts no shadow
box.computeWorldMatrix(true) // or a ray this frame misses it
```

Six lines, of which the last two are invisible until something is subtly wrong.
This is the same shape `b3d-library` grew for content (`lib.make.scout()`), and
tosijs's `elementCreator` before that: the thing you want, named, taking the
options you'd have set anyway.

## What it does for you

| | why it matters |
| --- | --- |
| **material** from `color`/`glow`/`glowColor` | the same `primitiveMaterial` `b3dBox` uses, so the two paths cannot drift |
| **`register()`** with the owner | shadow casting, reflection probes — the scene-listener contract. A mesh nobody registered is a mesh the sun has never heard of |
| **`computeWorldMatrix(true)`** | see below — this one is a genuine trap |
| **degrees** for `rx`/`ry`/`rz` | matches `AbstractMesh`, which is degrees. Babylon is radians, so a bare number is ambiguous exactly where it hurts |

## Why `worldMatrix` defaults to true

A mesh that has been positioned but never RENDERED has no world matrix, so
anything that reads world space this frame — a ray, a bounding check, an
`absolutePosition` — sees it **at the origin**. It does not throw; it quietly
answers about a phantom copy somewhere else.

That is not hypothetical: it cost a debugging detour in the collision demo's
tests. A wall placed at `z=6`, shot at on the first frame, reported an impact at
`z=0.25` with a confident normal off the wrong face — the ray had started inside
the phantom at the origin and exited its far side. Plausible, wrong, and silent.

Pass `worldMatrix: false` if you are about to reposition the mesh anyway and
want to skip the work.

## Demo

```js
import { b3d, b3dSkybox } from 'tosijs-3d'
import { demoStage, orbitCam } from 'demo-utils'

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
    },
  },
  ...demoStage({ size: 16, tiles: 10, pattern: true }),
)

preview.append(scene)
```
*/
/*{ "parent": "Core", "order": 200 }*/

import * as BABYLON from '@babylonjs/core'
import { primitiveMaterial } from './b3d-primitives'

/** The bits of `<tosi-b3d>` a maker touches. Duck-typed so a test can stand one
 * up without an engine, the same way the rest of this codebase does. */
export interface MakeOwner {
  scene: BABYLON.Scene
  register?(additions: { meshes?: BABYLON.AbstractMesh[] }): void
}

/** Options every maker understands, on top of its own shape parameters. */
export interface MakeOptions {
  name?: string
  x?: number
  y?: number
  z?: number
  /** DEGREES, matching `AbstractMesh`'s rx/ry/rz — not Babylon's radians. */
  rx?: number
  ry?: number
  rz?: number
  color?: string
  /** Self-illumination 0..1 as a fraction of `color` (see b3d-primitives). */
  glow?: number
  glowColor?: string
  /** Polished PBR metal instead of a StandardMaterial. */
  mirror?: boolean
  parent?: BABYLON.Node
  /** Register with the owner so the sun/reflections pick it up (default true).
   * `false` for something purely decorative that shouldn't cast. */
  shadows?: boolean
  pickable?: boolean
  /** Compute the world matrix now (default true) — see the module note. */
  worldMatrix?: boolean
}

const DEG = Math.PI / 180

/** Apply the shared half: transform, material, registration, world matrix. */
function finish<T extends BABYLON.Mesh>(
  mesh: T,
  owner: MakeOwner,
  opts: MakeOptions
): T {
  mesh.position.set(opts.x ?? 0, opts.y ?? 0, opts.z ?? 0)
  if (opts.rx != null || opts.ry != null || opts.rz != null) {
    // Yaw/pitch/roll from DEGREES. Written as a quaternion because
    // AbstractMesh-managed meshes ignore `.rotation` (it sets
    // rotationQuaternion every frame), and having the two paths disagree about
    // which field is authoritative is its own long afternoon.
    mesh.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(
      (opts.ry ?? 0) * DEG,
      (opts.rx ?? 0) * DEG,
      (opts.rz ?? 0) * DEG
    )
  }
  if (opts.parent != null) mesh.parent = opts.parent
  mesh.material = primitiveMaterial(mesh.name, mesh.getScene(), {
    color: opts.color ?? '#cccccc',
    glow: opts.glow,
    glowColor: opts.glowColor,
    mirror: opts.mirror,
  })
  if (opts.pickable != null) mesh.isPickable = opts.pickable
  if (opts.shadows !== false) owner.register?.({ meshes: [mesh] })
  if (opts.worldMatrix !== false) mesh.computeWorldMatrix(true)
  return mesh
}

/**
 * Build the `make` facade for an owner.
 *
 * A plain object rather than a Proxy — unlike `b3d-library`, the set of
 * primitives is FIXED and known at build time, so a real object is what gives
 * you completion and type-checked shape options. A proxy would trade both away
 * for nothing.
 */
export function createMakers(owner: MakeOwner) {
  const scene = () => owner.scene
  return {
    box: (
      opts: MakeOptions & {
        size?: number
        width?: number
        height?: number
        depth?: number
      } = {}
    ) =>
      finish(
        BABYLON.MeshBuilder.CreateBox(
          opts.name ?? 'box',
          {
            size: opts.size ?? 1,
            width: opts.width ?? opts.size ?? 1,
            height: opts.height ?? opts.size ?? 1,
            depth: opts.depth ?? opts.size ?? 1,
          },
          scene()
        ),
        owner,
        opts
      ),
    sphere: (
      opts: MakeOptions & { diameter?: number; segments?: number } = {}
    ) =>
      finish(
        BABYLON.MeshBuilder.CreateSphere(
          opts.name ?? 'sphere',
          { diameter: opts.diameter ?? 1, segments: opts.segments ?? 16 },
          scene()
        ),
        owner,
        opts
      ),
    cylinder: (
      opts: MakeOptions & {
        height?: number
        diameter?: number
        diameterTop?: number
        diameterBottom?: number
        tessellation?: number
      } = {}
    ) =>
      finish(
        BABYLON.MeshBuilder.CreateCylinder(
          opts.name ?? 'cylinder',
          {
            height: opts.height ?? 1,
            diameter: opts.diameter ?? 1,
            diameterTop: opts.diameterTop,
            diameterBottom: opts.diameterBottom,
            tessellation: opts.tessellation ?? 24,
          },
          scene()
        ),
        owner,
        opts
      ),
    plane: (
      opts: MakeOptions & {
        size?: number
        width?: number
        height?: number
      } = {}
    ) =>
      finish(
        BABYLON.MeshBuilder.CreatePlane(
          opts.name ?? 'plane',
          {
            size: opts.size ?? 1,
            width: opts.width,
            height: opts.height,
            sideOrientation: BABYLON.Mesh.DOUBLESIDE,
          },
          scene()
        ),
        owner,
        opts
      ),
    ground: (
      opts: MakeOptions & {
        width?: number
        height?: number
        subdivisions?: number
      } = {}
    ) =>
      finish(
        BABYLON.MeshBuilder.CreateGround(
          opts.name ?? 'ground',
          {
            width: opts.width ?? 10,
            height: opts.height ?? 10,
            subdivisions: opts.subdivisions ?? 1,
          },
          scene()
        ),
        owner,
        opts
      ),
    disc: (
      opts: MakeOptions & { radius?: number; tessellation?: number } = {}
    ) =>
      finish(
        BABYLON.MeshBuilder.CreateDisc(
          opts.name ?? 'disc',
          { radius: opts.radius ?? 0.5, tessellation: opts.tessellation ?? 24 },
          scene()
        ),
        owner,
        opts
      ),
    torus: (
      opts: MakeOptions & {
        diameter?: number
        thickness?: number
        tessellation?: number
      } = {}
    ) =>
      finish(
        BABYLON.MeshBuilder.CreateTorus(
          opts.name ?? 'torus',
          {
            diameter: opts.diameter ?? 1,
            thickness: opts.thickness ?? 0.25,
            tessellation: opts.tessellation ?? 24,
          },
          scene()
        ),
        owner,
        opts
      ),
    capsule: (opts: MakeOptions & { radius?: number; height?: number } = {}) =>
      finish(
        BABYLON.MeshBuilder.CreateCapsule(
          opts.name ?? 'capsule',
          { radius: opts.radius ?? 0.3, height: opts.height ?? 1 },
          scene()
        ),
        owner,
        opts
      ),
  }
}

export type Makers = ReturnType<typeof createMakers>
