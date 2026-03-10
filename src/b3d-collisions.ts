/*#
# b3d-collisions

Opt-in collision detection via mesh naming conventions authored in Blender.

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
    b3dLoader({ url: './scene.glb' }),
    b3dCollisions({ debug: true })
  )
)
```
*/

import { Component } from 'tosijs'
import * as BABYLON from '@babylonjs/core'
import type { B3d, SceneAdditions, SceneAdditionHandler } from './tosi-b3d'

export class B3dCollisions extends Component {
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
    const lower = name.toLowerCase()
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

  connectedCallback() {
    super.connectedCallback()
  }

  sceneReady(owner: B3d, _scene: BABYLON.Scene) {
    this.owner = owner
    this._callback = this.processAdditions.bind(this)
    owner.onSceneAddition(this._callback)
  }

  sceneDispose() {
    if (this.owner && this._callback) {
      this.owner.offSceneAddition(this._callback)
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

  disconnectedCallback() {
    this.sceneDispose()
    super.disconnectedCallback()
  }
}

export const b3dCollisions = B3dCollisions.elementCreator({
  tag: 'tosi-b3d-collisions',
})
