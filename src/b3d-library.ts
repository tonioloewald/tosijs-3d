/*#
# b3d-library

Asset library component. Loads a GLB file via `LoadAssetContainer` and holds
it as a reusable parts catalog — nothing is added to the scene until you call
`instantiate(name)`.

Libraries register with the parent `B3d` by `type`, so consumers (like a
tile map) can discover them via `owner.getLibrary('tiles')` without holding
direct references.

## Demo

```js
import { b3d, b3dLibrary, b3dLight, b3dSkybox, b3dGround, placeOnSurface, label3d, list3d, button3d } from 'tosijs-3d'
import { elements } from 'tosijs'
const { div, p } = elements

const lib = b3dLibrary({ url: '/test-2.glb', type: 'scene' })

function isInsertable(node) {
  return node.isMesh || node.children.some(c => c.isMesh)
}

// Flatten the GLB hierarchy into one scrollable pick list: every insertable node
// (a mesh, or a group that contains meshes), children indented under their parent.
// Instantiating a group clones it whole; instantiating a leaf clones just that.
function flattenInsertable(nodes, depth = 0, out = []) {
  for (const node of nodes) {
    if (isInsertable(node)) {
      out.push({ label: '- '.repeat(depth) + node.name, name: node.name })
    }
    if (node.children.length) flattenInsertable(node.children, depth + 1, out)
  }
  return out
}

const scene = b3d(
  {
    // Dual-presence picker: the mesh list lives in the ⚙ panel, so you can spawn
    // parts from inside VR too. The hook re-reads the hierarchy each time the panel
    // is (re)built; refreshScenePanel() below updates an already-open panel once
    // the GLB finishes loading.
    scenePanel: () => {
      const items = flattenInsertable(lib.getHierarchy())
      return [
        label3d({ text: items.length ? 'Spawn a mesh' : 'Loading…' }),
        list3d({
          items,
          onSelect: (it) => {
            const placed = lib.instantiate(it.name)
            // Rest the spawn on the ground rather than at the origin (where it may
            // float or clip depending on the GLB).
            if (placed) placeOnSurface(placed)
          },
        }),
        button3d({ label: 'Clear all', onClick: () => lib.clearInstances() }),
      ]
    },
    sceneCreated(el, BABYLON) {
      const camera = new BABYLON.ArcRotateCamera(
        'cam', -Math.PI / 2, Math.PI / 3, 10,
        BABYLON.Vector3.Zero(), el.scene
      )
      camera.attachControl(el.querySelector('canvas'), true)
      el.setActiveCamera(camera)
    },
  },
  b3dLight({ y: 1, intensity: 0.7 }),
  b3dSkybox({ timeOfDay: 12 }),
  b3dGround({ width: 20, height: 20 }),
  lib,
)

// Refresh an already-open panel once the model has loaded (opening it after the
// load already picks up the list via the rebuild-on-open above).
lib.ready.then(() => scene.refreshScenePanel())

preview.append(
  scene,
  div(
    { class: 'debug-panel' },
    p('Open the ⚙ to spawn library meshes — works in VR too.'),
  ),
)
```
```css
tosi-b3d { width: 100%; height: 100%; }
.debug-panel {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  border-radius: 6px;
  font-size: 14px;
  z-index: 10;
}
.debug-panel select, .debug-panel button {
  color: white;
  background: #444;
  border: 1px solid #888;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 13px;
}
```

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `url` | `''` | GLB/glTF file URL |
| `type` | `''` | Library type for scene registry lookup |

## API

- `ready: Promise<void>` — resolves when the GLB has loaded
- `getNames(): string[]` — list all mesh names (excluding `__root__` and `-ignore`)
- `getRootNames(): string[]` — list only top-level mesh names (direct children of root)
- `getHierarchy(): {name, children, isMesh}[]` — recursive tree of all nodes (meshes + transforms) reflecting parent–child structure
- `instantiate(name, options?): Node | null` — clone a named node (mesh or transform, with children) into the scene
- `clearInstances(): void` — dispose all previously instantiated clones
- Options: `{ x?, y?, z?, rx?, ry?, rz?, parent? }`
*/
/*{ "parent": "Core" }*/

import { B3dChild } from './b3d-utils'
import * as BABYLON from '@babylonjs/core'
import type { B3d } from './tosi-b3d'
import { canonicalize } from './model-transform'

export interface InstantiateOptions {
  x?: number
  y?: number
  z?: number
  rx?: number
  ry?: number
  rz?: number
  parent?: BABYLON.Node
  /** Collapse the model's frame: bake its SCALE into the geometry so the returned
   * node has unit scale (its orientation — the nose direction — is preserved).
   * Vehicles want this: a clean unit-scale control node means forward/up come out
   * unit and the camera can parent to the hull without per-use scale fixes. */
  canonical?: boolean
}

export class B3dLibrary extends B3dChild {
  static initAttributes = {
    url: '',
    type: '',
  }

  owner: B3d | null = null
  private container: BABYLON.AssetContainer | null = null
  private instances: BABYLON.Node[] = []
  private _readyResolve!: () => void
  ready: Promise<void>
  // See AbstractMesh.loadGeneration — same race-safe pattern, applied here
  // because B3dLibrary extends B3dChild directly (not AbstractMesh).
  private loadGeneration = 0

  constructor() {
    super()
    this.ready = new Promise((resolve) => {
      this._readyResolve = resolve
    })
  }

  sceneReady(owner: B3d, scene: BABYLON.Scene) {
    this.owner = owner
    const attrs = this as any
    const url = attrs.url as string
    const type = attrs.type as string

    if (type) {
      owner.registerLibrary(type, this)
    }

    if (!url) return

    const gen = ++this.loadGeneration
    BABYLON.SceneLoader.LoadAssetContainer(
      url,
      undefined,
      scene,
      (container) => {
        if (gen !== this.loadGeneration) return // stale — discard
        this.container = container
        this._readyResolve()
        this.dispatchEvent(new CustomEvent('library-ready'))
      }
    )
  }

  getNames(): string[] {
    if (!this.container) return []
    return this.container.meshes
      .filter((m) => m.name !== '__root__' && !m.name.includes('-ignore'))
      .map((m) => m.name)
  }

  getRootNames(): string[] {
    if (!this.container) return []
    const root = this.container.meshes.find((m) => m.name === '__root__')
    return this.container.meshes
      .filter(
        (m) =>
          m.name !== '__root__' &&
          !m.name.includes('-ignore') &&
          (m.parent === root || m.parent == null)
      )
      .map((m) => m.name)
  }

  getHierarchy(): { name: string; children: any[]; isMesh: boolean }[] {
    if (!this.container) return []
    const root = this.container.meshes.find((m) => m.name === '__root__')
    const allNodes: BABYLON.Node[] = [
      ...this.container.meshes,
      ...this.container.transformNodes,
    ]

    const buildTree = (
      parent: BABYLON.Node | null
    ): { name: string; children: any[]; isMesh: boolean }[] => {
      return allNodes
        .filter(
          (n) =>
            n.parent === parent &&
            n.name !== '__root__' &&
            !n.name.includes('-ignore')
        )
        .map((n) => {
          const isMesh = n instanceof BABYLON.AbstractMesh
          return {
            name: n.name,
            children: buildTree(n),
            isMesh,
          }
        })
    }

    return buildTree(root ?? null)
  }

  clearInstances(): void {
    for (const instance of this.instances) {
      instance.dispose()
    }
    this.instances = []
  }

  instantiate(
    name: string,
    options: InstantiateOptions = {}
  ): BABYLON.Node | null {
    if (!this.container || !this.owner) return null

    const source: BABYLON.Node | undefined =
      this.container.meshes.find((m) => m.name === name) ??
      this.container.transformNodes.find((n) => n.name === name)
    if (!source) {
      console.error(`b3d-library: no node named "${name}"`)
      return null
    }

    const i = this.instances.length
    const clone = source.clone(`${name}_instance_${i}`, options.parent ?? null)
    if (!clone) {
      console.error(`b3d-library: failed to clone "${name}"`)
      return null
    }

    // Canonical: wrap the model in a clean unit-scale control node (nose → +Z),
    // model hanging underneath (any hierarchy, nothing baked). The returned node
    // is what the consumer controls. Otherwise the clone is the node directly.
    let result: BABYLON.Node = clone
    if (options.canonical && clone instanceof BABYLON.TransformNode) {
      clone.name = `${name}_mesh`
      result = canonicalize(clone, this.owner.scene, `${name}_instance_${i}`)
    }

    if (result instanceof BABYLON.TransformNode) {
      result.position.x = options.x ?? 0
      result.position.y = options.y ?? 0
      result.position.z = options.z ?? 0
      if (options.rx !== undefined) result.rotation.x = options.rx
      if (options.ry !== undefined) result.rotation.y = options.ry
      if (options.rz !== undefined) result.rotation.z = options.rz
    }

    const meshes =
      clone instanceof BABYLON.AbstractMesh
        ? [clone, ...clone.getChildMeshes()]
        : clone.getChildMeshes()
    this.instances.push(result) // disposing the wrapper disposes the model child
    this.owner.register({ meshes })

    return result
  }

  sceneDispose() {
    this.loadGeneration++ // invalidate any in-flight load
    const attrs = this as any
    if (this.owner && attrs.type) {
      this.owner.unregisterLibrary(attrs.type, this)
    }
    for (const instance of this.instances) {
      instance.dispose()
    }
    this.instances = []
    if (this.container) {
      this.container.dispose()
      this.container = null
    }
    this.owner = null
  }
}

export const b3dLibrary = B3dLibrary.elementCreator({
  tag: 'tosi-b3d-library',
})
