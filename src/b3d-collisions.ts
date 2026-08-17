/*#
# b3d-collisions

Opt-in collision detection via mesh naming conventions authored in Blender.

## Demo — where did it hit, and which way is the surface facing?

Hail falls on a lumpy rock. Each impact is found by a SWEPT RAY (the segment the
stone travelled this frame, not its position), and the marker shows both things
you actually need: the **point**, and a disc lying flat on the surface with a
stalk along the **normal**. Watch the discs tilt as they land on the flanks.

The sweep is the part worth copying. Testing "is the stone inside the rock now?"
misses anything moving faster than its own radius per frame — at 60fps a stone
falling at 12 m/s moves 0.2m, so a thin surface is a coin toss. Casting the
segment cannot tunnel.

```js
import { b3d, label3d, slider3d } from 'tosijs-3d'
import { demoStage, orbitCam, impactMarker } from 'demo-utils'
import { tosi } from 'tosijs'

const { hail } = tosi({ hail: { rate: 6, hits: 0 } })
const readout = document.createElement('div')
readout.style.cssText = 'font: 13px ui-monospace, monospace; padding: 6px'
hail.hits.observe(() => { readout.textContent = `impacts: ${hail.hits.valueOf()}` })

const scene = b3d(
  {
    scenePanel: () => [
      label3d({ text: 'hail' }),
      slider3d({ label: 'stones', value: hail.rate, min: 1, max: 24, step: 1 }),
    ],
    sceneCreated(el, BABYLON) {
      orbitCam(el, { radius: 9, beta: Math.PI / 2.9, target: [0, 1.5, 0] })

      // An IRREGULAR target — lumps merged into one mesh, so the surface
      // normals genuinely vary and the markers have something to reveal.
      const lumps = []
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2
        const r = 0.9 + ((i * 7) % 5) * 0.12
        const s = BABYLON.MeshBuilder.CreateSphere('lump', { diameter: 1.1 + ((i * 3) % 4) * 0.28, segments: 10 }, el.scene)
        s.position.set(Math.cos(a) * r, 0.9 + ((i * 5) % 3) * 0.34, Math.sin(a) * r)
        lumps.push(s)
      }
      const rock = BABYLON.Mesh.MergeMeshes(lumps, true, true)
      rock.name = 'rock'
      const rockMat = new BABYLON.StandardMaterial('rock-mat', el.scene)
      rockMat.diffuseColor = new BABYLON.Color3(0.55, 0.52, 0.48)
      rockMat.specularColor = new BABYLON.Color3(0.08, 0.08, 0.08)
      rock.material = rockMat
      el.register({ meshes: [rock] })

      // Stones are pure kinematics — no physics engine, no colliders. The only
      // question this demo asks is "what did the segment cross, and where".
      const G = 9.8
      const stones = []
      const mat = new BABYLON.StandardMaterial('stone-mat', el.scene)
      mat.diffuseColor = new BABYLON.Color3(0.75, 0.8, 0.95)
      const reset = (s) => {
        s.mesh.position.set((Math.random() - 0.5) * 5, 7 + Math.random() * 3, (Math.random() - 0.5) * 5)
        s.vel = -1 - Math.random() * 2
      }
      const spawn = () => {
        const mesh = BABYLON.MeshBuilder.CreateSphere('stone', { diameter: 0.18, segments: 6 }, el.scene)
        mesh.material = mat
        const s = { mesh, vel: 0 }
        reset(s)
        stones.push(s)
        return s
      }

      const ray = new BABYLON.Ray(BABYLON.Vector3.Zero(), BABYLON.Vector3.Up(), 1)
      const onlyRock = (m) => m === rock
      el.scene.registerBeforeRender(() => {
        const dt = el.frameDelta
        while (stones.length < hail.rate.valueOf()) spawn()
        while (stones.length > hail.rate.valueOf()) stones.pop().mesh.dispose()
        for (const s of stones) {
          const from = s.mesh.position.clone()
          s.vel -= G * dt
          s.mesh.position.y += s.vel * dt
          const drop = from.y - s.mesh.position.y
          if (drop > 0) {
            // SWEEP the segment just travelled, not the new position.
            ray.origin = from
            ray.direction = BABYLON.Vector3.Down()
            ray.length = drop + 0.09
            const hit = el.scene.pickWithRay(ray, onlyRock)
            if (hit?.hit && hit.pickedPoint) {
              impactMarker(el, hit.pickedPoint, hit.getNormal(true), { life: 1.4 })
              hail.hits = hail.hits.valueOf() + 1
              reset(s)
              continue
            }
          }
          if (s.mesh.position.y < -0.4) reset(s)
        }
      })
    },
  },
  ...demoStage({ size: 30, pattern: true, timeOfDay: 9 }),
)

preview.append(scene, readout)
```

## Naming Conventions

Add these suffixes to mesh names in Blender:

| Suffix | Collider Shape |
|--------|---------------|
| `_collide` | Sphere (default) |
| `_collideSphere` | Sphere |
| `_collideBox` | Box |
| `_collideCylinder` | Cylinder |
| `_collideMesh` | Mesh (exact shape) |

Underscore variants also work: `_collide_sphere`, `_collide_box`, etc.

## Debug Mode

Set `debug: true` to show green wireframe colliders:

```javascript
import { b3d, b3dCollisions, b3dLoader } from 'tosijs-3d'

document.body.append(
  b3d({},
    b3dLoader({ url: '/scene.glb' }),
    b3dCollisions({ debug: true })
  )
)
```
*/
/*{ "parent": "Core" }*/

import { B3dChild } from './b3d-utils'
import * as BABYLON from '@babylonjs/core'
import { conventionName } from './b3d-utils'
import type { B3d, SceneAdditions, SceneAdditionHandler } from './tosi-b3d'

export class B3dCollisions extends B3dChild {
  static initAttributes = {
    debug: false,
  }

  declare debug: boolean
  owner: B3d | null = null
  private colliders: BABYLON.Mesh[] = []
  private _callback?: SceneAdditionHandler
  private debugMaterial?: BABYLON.StandardMaterial

  private getDebugMaterial(): BABYLON.StandardMaterial {
    if (this.debugMaterial == null) {
      const mat = new BABYLON.StandardMaterial(
        'collider-debug',
        this.owner!.scene
      )
      mat.wireframe = true
      mat.diffuseColor = new BABYLON.Color3(0, 1, 0)
      mat.alpha = 0.5
      this.debugMaterial = mat
    }
    return this.debugMaterial
  }

  private setupCollider(collider: BABYLON.Mesh, source: BABYLON.AbstractMesh) {
    collider.checkCollisions = true
    collider.isPickable = false
    if (this.debug) {
      collider.isVisible = true
      collider.material = this.getDebugMaterial()
    } else {
      collider.isVisible = false
    }
    collider.parent = source
    this.colliders.push(collider)
  }

  private createSphereCollider(mesh: BABYLON.AbstractMesh) {
    const bounds = mesh.getBoundingInfo()
    const sphere = bounds.boundingSphere
    const diameter = sphere.radius * 2
    const collider = BABYLON.MeshBuilder.CreateSphere(
      mesh.name + '_collider',
      { diameter },
      this.owner!.scene
    )
    collider.position = sphere.center.clone()
    this.setupCollider(collider, mesh)
  }

  private createBoxCollider(mesh: BABYLON.AbstractMesh) {
    const bounds = mesh.getBoundingInfo()
    const box = bounds.boundingBox
    const size = box.maximum.subtract(box.minimum)
    const collider = BABYLON.MeshBuilder.CreateBox(
      mesh.name + '_collider',
      { width: size.x, height: size.y, depth: size.z },
      this.owner!.scene
    )
    collider.position = box.center.clone()
    this.setupCollider(collider, mesh)
  }

  private createCylinderCollider(mesh: BABYLON.AbstractMesh) {
    const bounds = mesh.getBoundingInfo()
    const box = bounds.boundingBox
    const size = box.maximum.subtract(box.minimum)
    const diameter = Math.max(size.x, size.z)
    const height = size.y
    const collider = BABYLON.MeshBuilder.CreateCylinder(
      mesh.name + '_collider',
      { diameter, height },
      this.owner!.scene
    )
    collider.position = box.center.clone()
    this.setupCollider(collider, mesh)
  }

  private getCollideType(
    name: string
  ): 'mesh' | 'sphere' | 'box' | 'cylinder' | null {
    // `.model` (the library-export marker) is invisible to suffix parsing —
    // Hull_collideMesh.model exports AND collides.
    const lower = conventionName(name).toLowerCase()
    if (lower.includes('_collidemesh') || lower.includes('_collide_mesh'))
      return 'mesh'
    if (lower.includes('_collidesphere') || lower.includes('_collide_sphere'))
      return 'sphere'
    if (lower.includes('_collidebox') || lower.includes('_collide_box'))
      return 'box'
    if (
      lower.includes('_collidecylinder') ||
      lower.includes('_collide_cylinder')
    )
      return 'cylinder'
    // Bare _collide with no type defaults to sphere
    if (lower.includes('_collide')) return 'sphere'
    return null
  }

  private processAdditions(additions: SceneAdditions) {
    const { meshes } = additions
    if (meshes == null) return

    // Group meshes by their collision-annotated root.
    // Babylon splits GLB nodes into TransformNode + child Meshes.
    // We want one collider per logical object, built from combined bounds.
    const processed = new Set<string>()

    for (const mesh of meshes) {
      const collideType = this.getCollideType(mesh.name)
      if (collideType == null) continue

      if (collideType === 'mesh') {
        mesh.checkCollisions = true
        for (const child of mesh.getChildMeshes()) {
          child.checkCollisions = true
        }
        continue
      }

      // For shape colliders, find the root node for this object
      // (the TransformNode or top-level mesh with the collide name)
      let root: BABYLON.Node = mesh
      while (root.parent && this.getCollideType(root.parent.name) != null) {
        root = root.parent
      }

      const rootName = root.name
      if (processed.has(rootName)) continue
      processed.add(rootName)

      // Compute combined bounding box from all child meshes
      const childMeshes =
        root instanceof BABYLON.AbstractMesh
          ? [root, ...root.getChildMeshes()]
          : (root as BABYLON.TransformNode).getChildMeshes()

      if (childMeshes.length === 0) continue

      // Get world-space bounds across all children, then make collider in world space (no parent)
      let min: BABYLON.Vector3 | null = null
      let max: BABYLON.Vector3 | null = null
      for (const child of childMeshes) {
        child.computeWorldMatrix(true)
        const bi = child.getBoundingInfo()
        const bmin = bi.boundingBox.minimumWorld
        const bmax = bi.boundingBox.maximumWorld
        if (min == null) {
          min = bmin.clone()
          max = bmax.clone()
        } else {
          min = BABYLON.Vector3.Minimize(min, bmin)
          max = BABYLON.Vector3.Maximize(max!, bmax)
        }
      }
      if (min == null || max == null) continue

      const size = max.subtract(min)
      const center = BABYLON.Vector3.Center(min, max)

      let collider: BABYLON.Mesh
      if (collideType === 'sphere') {
        const diameter = Math.max(size.x, size.y, size.z)
        collider = BABYLON.MeshBuilder.CreateSphere(
          rootName + '_collider',
          { diameter },
          this.owner!.scene
        )
      } else if (collideType === 'box') {
        collider = BABYLON.MeshBuilder.CreateBox(
          rootName + '_collider',
          { width: size.x, height: size.y, depth: size.z },
          this.owner!.scene
        )
      } else {
        // cylinder
        const diameter = Math.max(size.x, size.z)
        collider = BABYLON.MeshBuilder.CreateCylinder(
          rootName + '_collider',
          { diameter, height: size.y },
          this.owner!.scene
        )
      }

      collider.position = center
      collider.checkCollisions = true
      collider.isPickable = false
      if (this.debug) {
        collider.isVisible = true
        collider.material = this.getDebugMaterial()
      } else {
        collider.isVisible = false
      }
      this.colliders.push(collider)
    }
  }

  sceneReady(owner: B3d, _scene: BABYLON.Scene) {
    this.owner = owner
    this._callback = this.processAdditions.bind(this)
    owner.addSceneListener(this._callback)
  }

  sceneDispose() {
    if (this.owner && this._callback) {
      this.owner.removeSceneListener(this._callback)
    }
    for (const collider of this.colliders) {
      collider.dispose()
    }
    this.colliders = []
    if (this.debugMaterial) {
      this.debugMaterial.dispose()
      this.debugMaterial = undefined
    }
    this.owner = null
  }

  render() {
    super.render()
    if (!this.owner) return
    for (const collider of this.colliders) {
      if (this.debug) {
        collider.isVisible = true
        collider.material = this.getDebugMaterial()
      } else {
        collider.isVisible = false
      }
    }
  }
}

export const b3dCollisions = B3dCollisions.elementCreator({
  tag: 'tosi-b3d-collisions',
})
