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

const lib = b3dLibrary({ url: '/test-3.glb', type: 'scene' })

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
            // Animated models come alive on spawn: loop their first group
            // (the scout opens its cockpit — see "Animations travel with the
            // instance" below).
            placed?.metadata?.animationGroups?.[0]?.start(true)
            // Rest the spawn on the ground rather than at the origin (where it may
            // float or clip depending on the GLB).
            if (placed) placeOnSurface(placed)
          },
        }),
        button3d({ label: 'Clear all', onClick: () => lib.clearInstances() }),
      ]
    },
    // No custom camera — b3d's default orbit camera already has sensible limits
    // (≥5° above the horizon, bounded zoom) so you can't tilt under the ground or
    // zoom through the parts.
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
## Authoring conventions (Blender)

- **Axes: Blender defaults, in the model's LOCAL frame** — the nose faces
  **local −Y**, up is **local +Z**. The convention lives in the object's own
  coordinate system: the collapse (`canonicalize`) DISCARDS the object's
  scene transform, so scene placement — position, scenic rotation — is
  irrelevant and needn't be tidied. (Corollary: do NOT "apply all transforms"
  on a model inside a scene file; that bakes the scenic rotation into the
  data and corrupts the local frame. Apply-all is right only for dedicated
  single-model files where the object sits at identity.) The engine defines
  the one mapping from local-frame convention to engine frame (content-front
  → engine +Z); never fix orientation per-asset — a model that flies
  backwards needs its LOCAL frame fixed in Blender (edit-mode 180° about Z),
  not a rotation in the scene or the code.
- **Exports: append `.model`** to each node you intend to publish
  (`scout.model`). Once a file declares any, ONLY those are listed — under
  their clean names (`getNames()` → `'scout'`, `instantiate('scout')` works) —
  so collections, rig helpers and boolean cutters stay out of the catalog. A
  file with no `.model` nodes lists everything (legacy behaviour).
- **`.model` is orthogonal to the behaviour suffixes**: every suffix check
  (`_collideMesh`, `_noshadow`, `_mirror`, `-ignore`, …) runs on the name with
  `.model` stripped, so `Hull_collideMesh.model` exports AND gets its
  collider — you never trade one convention for the other.

## Animations travel with the instance

If the source model carries **AnimationGroups** (the scout's `Cockpit Open`
and gear-retract animations in `test-3.glb`), `instantiate` clones them
**retargeted onto the instance** — `node.clone()` alone would leave them on
the container, animating the original nobody can see. They land on
`instance.metadata.animationGroups`, named `<group>::<instance>` so multiple
instances animate independently:

```js
const scout = lib.instantiate('scout', { canonical: true })
const cockpit = scout.metadata.animationGroups
  .find((g) => g.name.startsWith('Cockpit Open'))
cockpit.start(false) // one shot; .start(true) loops
```

Only groups whose targets all live inside the model's subtree travel — the
scene's ambient animations stay behind. Pass `animations: false` to skip;
`clearInstances()` disposes the clones with their instance.

- `getNames(): string[]` — declared `.model` exports under clean names (or all
  mesh/transform-node names when none are declared; `__root__`/`-ignore` always excluded)
- `getRootNames(): string[]` — same, top-level nodes only
- `getHierarchy(): {name, children, isMesh}[]` — recursive tree of all nodes (meshes + transforms) reflecting parent–child structure
- `instantiate(name, options?): Node | null` — clone a named node (mesh or transform, with children) into the scene
- `clearInstances(): void` — dispose all previously instantiated clones
- Options: `{ x?, y?, z?, rx?, ry?, rz?, parent? }`
*/
/*{ "parent": "Core" }*/
import { B3dChild, conventionName } from './b3d-utils';
import * as BABYLON from '@babylonjs/core';
import { canonicalize } from './model-transform';
/**
 * The `.model` naming convention, pure (unit-tested): a node named
 * `<name>.model` declares itself an INTENDED EXPORT of the library file.
 *
 * A working Blender file is full of things that are not deliverables —
 * collections, rig helpers, boolean cutters, reference geometry — and a
 * library that lists everything makes the consumer (and the library demo)
 * wade through construction junk. Appending `.model` to the things you MEAN
 * to publish makes the export list an authoring decision:
 *
 * - when a file declares ANY `.model` nodes, only those are listed — under
 *   their clean names (`scout.model` lists as `scout`);
 * - a file with none keeps the legacy behaviour (everything listed) so
 *   existing content doesn't go dark;
 * - `instantiate('scout')` resolves to `scout.model` (exact match wins).
 */
export function modelExportNames(names) {
    const models = names.filter((n) => n.endsWith('.model'));
    if (models.length === 0)
        return names.filter((n) => !n.endsWith('.model'));
    return models.map((n) => n.slice(0, -'.model'.length));
}
/** Resolve a requested name against the `.model` convention: exact match
 * first, then `<name>.model`. Returns the node name to look up. */
export function resolveModelName(names, requested) {
    if (names.includes(requested))
        return requested;
    const suffixed = `${requested}.model`;
    if (names.includes(suffixed))
        return suffixed;
    return requested;
}
/**
 * Retarget a container's AnimationGroups onto a CLONED subtree.
 *
 * `node.clone()` copies the hierarchy but NOT the animation groups — those
 * live on the AssetContainer, targeting the ORIGINAL nodes, so a library-
 * instantiated model's animations play silently against meshes nobody can
 * see. This walks the source and clone trees in parallel (clone preserves
 * child order and names), builds the source→clone map, and clones every
 * group whose targets ALL live inside the subtree — the scout's "Cockpit
 * Open" travels with a scout instance; the scene's ambient animations don't.
 *
 * Exported for reuse (and tested against the real test-3.glb).
 */
export function cloneNodeAnimations(container, source, clone, instanceName) {
    const map = new Map();
    const walk = (a, b) => {
        map.set(a, b);
        const ak = a.getChildren();
        const bk = b.getChildren();
        for (let i = 0; i < Math.min(ak.length, bk.length); i++)
            walk(ak[i], bk[i]);
    };
    walk(source, clone);
    const out = [];
    for (const g of container.animationGroups) {
        const targets = g.targetedAnimations.map((t) => t.target);
        if (targets.length === 0)
            continue;
        if (!targets.every((t) => map.has(t)))
            continue; // not (all) ours
        out.push(g.clone(`${g.name}::${instanceName}`, (old) => map.get(old) ?? old));
    }
    return out;
}
export class B3dLibrary extends B3dChild {
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
    // because B3dLibrary extends B3dChild directly (not AbstractMesh).
    loadGeneration = 0;
    constructor() {
        super();
        this.ready = new Promise((resolve) => {
            this._readyResolve = resolve;
        });
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
    /** Every node (meshes AND transform nodes — a multi-part model's top node is
     * usually a TransformNode) eligible for listing. */
    _allNodes() {
        if (!this.container)
            return [];
        return [...this.container.meshes, ...this.container.transformNodes].filter((n) => n.name !== '__root__' && !conventionName(n.name).includes('-ignore'));
    }
    getNames() {
        return modelExportNames(this._allNodes().map((n) => n.name));
    }
    getRootNames() {
        if (!this.container)
            return [];
        const root = this.container.meshes.find((m) => m.name === '__root__');
        return modelExportNames(this._allNodes()
            .filter((n) => n.parent === root || n.parent == null)
            .map((n) => n.name));
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
                !conventionName(n.name).includes('-ignore'))
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
            // Animation-group clones aren't node children — dispose them explicitly
            // or they keep animating disposed meshes.
            const groups = instance.metadata?.animationGroups;
            groups?.forEach((g) => g.dispose());
            instance.dispose();
        }
        this.instances = [];
    }
    instantiate(name, options = {}) {
        if (!this.container || !this.owner)
            return null;
        // `.model` convention: `instantiate('scout')` finds a node named
        // `scout.model` (the file's declared export) — or an exact match.
        const resolved = resolveModelName([...this.container.meshes, ...this.container.transformNodes].map((n) => n.name), name);
        const source = this.container.meshes.find((m) => m.name === resolved) ??
            this.container.transformNodes.find((n) => n.name === resolved);
        if (!source) {
            console.error(`b3d-library: no node named "${name}"`);
            return null;
        }
        const i = this.instances.length;
        const clone = source.clone(`${name}_instance_${i}`, options.parent ?? null);
        if (!clone) {
            console.error(`b3d-library: failed to clone "${name}"`);
            return null;
        }
        // Canonical: wrap the model in a clean unit-scale control node (nose → +Z),
        // model hanging underneath (any hierarchy, nothing baked). The returned node
        // is what the consumer controls. Otherwise the clone is the node directly.
        let result = clone;
        if (options.canonical && clone instanceof BABYLON.TransformNode) {
            clone.name = `${name}_mesh`;
            result = canonicalize(clone, this.owner.scene, `${name}_instance_${i}`);
        }
        // Animations: retarget the container's groups onto the clone (see
        // cloneNodeAnimations — node.clone() alone leaves them behind).
        if (options.animations !== false) {
            const groups = cloneNodeAnimations(this.container, source, clone, `${name}_instance_${i}`);
            if (groups.length > 0) {
                const meta = (result.metadata ??= {});
                meta.animationGroups = groups;
            }
        }
        if (result instanceof BABYLON.TransformNode) {
            result.position.x = options.x ?? 0;
            result.position.y = options.y ?? 0;
            result.position.z = options.z ?? 0;
            if (options.rx !== undefined)
                result.rotation.x = options.rx;
            if (options.ry !== undefined)
                result.rotation.y = options.ry;
            if (options.rz !== undefined)
                result.rotation.z = options.rz;
        }
        const meshes = clone instanceof BABYLON.AbstractMesh
            ? [clone, ...clone.getChildMeshes()]
            : clone.getChildMeshes();
        this.instances.push(result); // disposing the wrapper disposes the model child
        this.owner.register({ meshes });
        return result;
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
}
export const b3dLibrary = B3dLibrary.elementCreator({
    tag: 'tosi-b3d-library',
});
//# sourceMappingURL=b3d-library.js.map