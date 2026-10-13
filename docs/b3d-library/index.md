# b3d-library

Asset library component. Loads a GLB file via `LoadAssetContainer` and holds
it as a reusable parts catalog — nothing is added to the scene until you call
`instantiate(name)`.

Libraries register with the parent `B3d` by `type`, so consumers (like a
tile map) can discover them via `owner.getLibrary('tiles')` without holding
direct references.

## Demo

```js
import { b3d, b3dLibrary, placeOnSurface, label3d, list3d, button3d } from 'tosijs-3d'
import { demoStage, orbitCam } from 'tosijs-3d/demo-utils'
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
      // `label`, not `name` — the raw node is `building_collideCylinder_primitive0`
      // and nobody should have to read a collider annotation to pick a building.
      out.push({ label: '   '.repeat(depth) + node.label, name: node.name })
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
          handleSelect: (it) => {
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
        button3d({ label: 'Clear all', handleClick: () => lib.clearInstances() }),
      ]
    },
    sceneCreated(el) {
      orbitCam(el, { radius: 12, beta: Math.PI / 2.9, target: [0, 1, 0] })
    },
  },
  ...demoStage({ size: 20, tiles: 12, texture: '/tosi-warhol-testgrid.svg', timeOfDay: 12 }),
  lib,
)

// Refresh an already-open panel once the model has loaded (opening it after the
// load already picks up the list via the rebuild-on-open above).
lib.ready.then(() => scene.refreshScenePanel())

preview.append(
  scene,
  div(
    { class: 'debug-panel' },
    p('Open the scene panel to spawn library meshes — works in VR too.'),
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
- **Origin: a vehicle's root-node origin is centred and grounded** — its
  on-ground stance point (between the wheels/gear), so `y = terrainHeight`
  parks it. Where the craft **pivots in flight** is declared by a child node
  with the **`_centerOfGravity` suffix** (an empty at the mass centre):
  aircraft rotate about the CoG while ground placement keeps the stance
  origin — one model conveys both how it flies and how it plants.
- **Exports: append `.model`** to each node you intend to publish
  (`scout.model`). Once a file declares any, ONLY those are listed — under
  their clean names (`getNames()` → `'scout'`, `instantiate('scout')` works) —
  so collections, rig helpers and boolean cutters stay out of the catalog. A
  file with no `.model` nodes lists everything (legacy behaviour).
- **`.model` is orthogonal to the behaviour suffixes**: every suffix check
  (`_collideMesh`, `_noshadow`, `_mirror`, `-ignore`, …) runs on the name with
  `.model` stripped, so `Hull_collideMesh.model` exports AND gets its
  collider — you never trade one convention for the other.
- **Suffixes never reach the consumer.** `getNames()` lists PUBLIC names, with
  `.model` *and* the behaviour suffixes stripped: `Hull_collideMesh.model` is
  simply `Hull`, and `instantiate('Hull')` finds it. Annotations say what the
  engine should DO with a node, not what the thing IS — so changing a
  collider in Blender can't break a consumer's spawn call.

## Animations travel with the instance

If the source model carries **AnimationGroups** (the scout's `Cockpit Open`
and gear-retract animations in `test-3.glb`), `instantiate` clones them
**retargeted onto the instance** — `node.clone()` alone would leave them on
the container, animating the original nobody can see. They land on
`instance.metadata.animationGroups`, named `<group>::<instance>` so multiple
instances animate independently:

```javascript
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
- `getHierarchy(): {name, label, children, isMesh}[]` — recursive tree of all nodes reflecting parent–child structure. `name` identifies the node; **`label` is what you show a human** (`.model`, behaviour suffixes and the glTF loader's `_primitiveN` all removed, so `building_collideCylinder_primitive0` reads as `building`)
- `instantiate(name, options?): Node | null` — clone a named node (mesh or transform, with children) into the scene
- `make` — the same thing, as callable names: `lib.make.scout({ y: 1 })`. Quotes are the only difference, but a string is invisible to the editor and a typo in one is a runtime error rather than something you see while typing. It's a sub-object, not methods on the element, because a GLB may contain a node called `id` or `remove` and a model must never be able to shadow the DOM.
- `clearInstances(): void` — dispose all previously instantiated clones
- Options: `{ x?, y?, z?, rx?, ry?, rz?, parent?, animations?, canonical? }` —
  rotation in **degrees** (it was radians before 0.7.0; see the CHANGELOG)
