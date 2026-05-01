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
import { b3d, b3dLibrary, b3dLight, b3dSkybox, b3dGround } from 'tosijs-3d'
import { popMenu } from 'tosijs-ui'
import { elements } from 'tosijs'
const { div, button } = elements

const lib = b3dLibrary({ url: './test-2.glb', type: 'scene' })

const scene = b3d(
  {
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

function isInsertable(node) {
  return node.isMesh || node.children.some(c => c.isMesh)
}

function buildMenuItems(nodes) {
  const items = []
  for (const node of nodes) {
    if (isInsertable(node)) {
      items.push({ caption: node.name, action: () => lib.instantiate(node.name) })
    }
    if (node.children.length > 0) {
      const childItems = buildMenuItems(node.children)
      if (childItems.length) {
        items.push({ caption: node.name + ' parts', menuItems: childItems })
      }
    }
  }
  return items
}

const pickBtn = button({ textContent: 'Pick mesh…' })
pickBtn.addEventListener('click', () => {
  const hierarchy = lib.getHierarchy()
  popMenu({
    target: pickBtn,
    menuItems: buildMenuItems(hierarchy),
  })
})

const clearBtn = button({ textContent: 'Clear all', onclick() { lib.clearInstances() } })

preview.append(
  scene,
  div(
    { class: 'debug-panel' },
    pickBtn,
    clearBtn,
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
import { Component } from 'tosijs';
import * as BABYLON from '@babylonjs/core';
export class B3dLibrary extends Component {
    static initAttributes = {
        url: '',
        type: '',
    };
    owner = null;
    container = null;
    instances = [];
    _readyResolve;
    ready;
    // See AbstractMesh.loadGeneration — same race-safe pattern, applied here
    // because B3dLibrary extends Component directly.
    loadGeneration = 0;
    constructor() {
        super();
        this.ready = new Promise((resolve) => {
            this._readyResolve = resolve;
        });
    }
    connectedCallback() {
        super.connectedCallback();
    }
    sceneReady(owner, scene) {
        this.owner = owner;
        const attrs = this;
        const url = attrs.url;
        const type = attrs.type;
        if (type) {
            owner.registerLibrary(type, this);
        }
        if (!url)
            return;
        const gen = ++this.loadGeneration;
        BABYLON.SceneLoader.LoadAssetContainer(url, undefined, scene, (container) => {
            if (gen !== this.loadGeneration)
                return; // stale — discard
            this.container = container;
            this._readyResolve();
            this.dispatchEvent(new CustomEvent('library-ready'));
        });
    }
    getNames() {
        if (!this.container)
            return [];
        return this.container.meshes
            .filter((m) => m.name !== '__root__' && !m.name.includes('-ignore'))
            .map((m) => m.name);
    }
    getRootNames() {
        if (!this.container)
            return [];
        const root = this.container.meshes.find((m) => m.name === '__root__');
        return this.container.meshes
            .filter((m) => m.name !== '__root__' &&
            !m.name.includes('-ignore') &&
            (m.parent === root || m.parent == null))
            .map((m) => m.name);
    }
    getHierarchy() {
        if (!this.container)
            return [];
        const root = this.container.meshes.find((m) => m.name === '__root__');
        const allNodes = [
            ...this.container.meshes,
            ...this.container.transformNodes,
        ];
        const buildTree = (parent) => {
            return allNodes
                .filter((n) => n.parent === parent &&
                n.name !== '__root__' &&
                !n.name.includes('-ignore'))
                .map((n) => {
                const isMesh = n instanceof BABYLON.AbstractMesh;
                return {
                    name: n.name,
                    children: buildTree(n),
                    isMesh,
                };
            });
        };
        return buildTree(root ?? null);
    }
    clearInstances() {
        for (const instance of this.instances) {
            instance.dispose();
        }
        this.instances = [];
    }
    instantiate(name, options = {}) {
        if (!this.container || !this.owner)
            return null;
        const source = this.container.meshes.find((m) => m.name === name) ??
            this.container.transformNodes.find((n) => n.name === name);
        if (!source) {
            console.error(`b3d-library: no node named "${name}"`);
            return null;
        }
        const clone = source.clone(`${name}_instance_${this.instances.length}`, options.parent ?? null);
        if (!clone) {
            console.error(`b3d-library: failed to clone "${name}"`);
            return null;
        }
        if (clone instanceof BABYLON.TransformNode) {
            clone.position.x = options.x ?? 0;
            clone.position.y = options.y ?? 0;
            clone.position.z = options.z ?? 0;
            if (options.rx !== undefined)
                clone.rotation.x = options.rx;
            if (options.ry !== undefined)
                clone.rotation.y = options.ry;
            if (options.rz !== undefined)
                clone.rotation.z = options.rz;
        }
        const meshes = clone instanceof BABYLON.AbstractMesh
            ? [clone, ...clone.getChildMeshes()]
            : clone.getChildMeshes();
        this.instances.push(clone);
        this.owner.register({ meshes });
        return clone;
    }
    sceneDispose() {
        this.loadGeneration++; // invalidate any in-flight load
        const attrs = this;
        if (this.owner && attrs.type) {
            this.owner.unregisterLibrary(attrs.type, this);
        }
        for (const instance of this.instances) {
            instance.dispose();
        }
        this.instances = [];
        if (this.container) {
            this.container.dispose();
            this.container = null;
        }
        this.owner = null;
    }
    disconnectedCallback() {
        this.sceneDispose();
        super.disconnectedCallback();
    }
}
export const b3dLibrary = B3dLibrary.elementCreator({
    tag: 'tosi-b3d-library',
});
//# sourceMappingURL=b3d-library.js.map