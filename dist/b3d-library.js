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
*/
/*{ "parent": "Core" }*/
import { B3dChild, publicName, isIgnored } from './b3d-utils';
import * as BABYLON from '@babylonjs/core';
import { canonicalize } from './model-transform';
import { manifestFromNodes } from './glb-manifest';
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
    // Names are PUBLIC names: `.model` and the behaviour suffixes both come off,
    // so `Hull_collideMesh.model` lists as `Hull`. A consumer should never have
    // to type a collider annotation to spawn a thing (Tonio, 2026-08-12), and
    // dedupe because two annotated nodes can share one public name.
    const models = names.filter((n) => n.endsWith('.model'));
    const source = models.length === 0 ? names : models;
    return [...new Set(source.map(publicName))];
}
/** Resolve a requested name against the `.model` convention: exact match
 * first, then `<name>.model`. Returns the node name to look up. */
export function resolveModelName(names, requested) {
    if (names.includes(requested))
        return requested; // exact wins
    const suffixed = `${requested}.model`;
    if (names.includes(suffixed))
        return suffixed;
    // …then the PUBLIC name: `Hull` finds `Hull_collideMesh.model`. Declared
    // exports are preferred, so an annotated `.model` node beats a stray node
    // that happens to clean to the same name.
    const declared = names.filter((n) => n.endsWith('.model'));
    const match = declared.find((n) => publicName(n) === requested) ??
        names.find((n) => publicName(n) === requested);
    return match ?? requested;
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
    static preferredTagName = 'tosi-b3d-library';
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
        return [...this.container.meshes, ...this.container.transformNodes].filter((n) => n.name !== '__root__' && !isIgnored(n.name));
    }
    /**
     * **The library's own catalogue**, or `null` if the glb does not carry one.
     *
     * Built from `metadata.gltf.extras` on the loaded nodes, which Babylon's
     * `ExtrasAsMetadata` extension populates for free. Note it does NOT come from
     * `scenes[0].extras.library`, even though the pipeline writes a fuller index
     * there: Babylon surfaces extras for nodes, cameras, materials and animations
     * and drops them for SCENES. Verified by loading a real library headlessly —
     * every item node arrives with its extras, and nothing anywhere carries the
     * scene block. (three.js does hand that one back as `gltf.scene.userData`,
     * so it is not dead weight upstream, just invisible here.)
     */
    getManifest() {
        return manifestFromNodes(this._allNodes().map((n) => ({ name: n.name, metadata: n.metadata })));
    }
    /**
     * What the library says about ONE item — `{category, tags, clips, size}` —
     * without instantiating it.
     *
     * `clips` is the point: it answers "what animations does this model have"
     * before anything is placed, which is what a clip picker in a property panel
     * needs and what `instance.metadata.animationGroups` cannot provide (it
     * requires an instance to exist first).
     */
    getInfo(name) {
        const resolved = resolveModelName(this._allNodes().map((n) => n.name), name);
        const node = this._allNodes().find((n) => n.name === resolved);
        const extras = node?.metadata?.gltf?.extras;
        return extras != null && typeof extras === 'object' ? extras : null;
    }
    /**
     * Public names of the things an author may ask for.
     *
     * **A declared catalogue wins.** When the glb's nodes carry library extras,
     * those items ARE the export list — the data-driven twin of the `.model`
     * naming convention, and it narrows for the same reason. Without it a packed
     * kit over-reports: measured on `pirate-kit.glb`, 80 names for 72 declared
     * items, the extras being a stray Blender `Group` plus sub-parts (a chest's
     * `lid`, a ship's `sail-a`, `paddles`). Those are real subsystem targets and
     * useless as palette entries — an author offered "lid" has been shown an
     * implementation detail.
     *
     * `getRootNames()`/`getHierarchy()` still expose everything, so the sub-part
     * cases keep working. Reported by the ensemble pipeline as #45.
     */
    getNames() {
        const manifest = this.getManifest();
        if (manifest != null)
            return manifest.items.map((i) => publicName(i.name));
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
                !isIgnored(n.name) &&
                /*
                Hide the glTF loader's PRIMITIVE SPLITS. A multi-material mesh is
                imported as a TransformNode carrying the authored name plus one child
                mesh per material, `<name>_primitive0`, `_primitive1`… Those children
                are fragments of one authored object, not things you can meaningfully
                pick.
    
                They only became visible when `publicName` started stripping the
                suffix — before that they were ugly but distinct, and afterwards a
                building rendered as "building" nested under "building" nested under
                "building". Tonio: "we now have a whole lot of things called
                building… it's not showing the hierarchy at all, which it used to."
                The tree was still there; every level just had the same name.
                */
                !/_primitive\d+$/i.test(n.name))
                .map((n) => {
                const isMesh = n instanceof BABYLON.AbstractMesh;
                return {
                    name: n.name,
                    // What a HUMAN should see: `.model`, the behaviour suffixes and the
                    // loader's `_primitiveN` all off. `name` stays raw because that is
                    // what identifies the node; `label` is what you show.
                    label: publicName(n.name),
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
    /**
     * The library's contents as CALLABLE NAMES: `lib.make.scout({ y: 1 })`
     * instead of `lib.instantiate('scout', { y: 1 })`.
     *
     * Same call, minus the quotes — which matters more than it looks. A string
     * argument is invisible to the editor: no completion, no go-to-definition,
     * and a typo is a runtime `console.error` rather than something you notice
     * while typing. A property access at least reads like the thing it makes.
     *
     * Deliberately a SUB-OBJECT rather than methods on the element itself. This
     * is an HTMLElement, and a GLB is free to contain a node called `title`,
     * `id`, `children` or `remove` — putting arbitrary content names in that
     * namespace means a model can silently shadow the DOM.
     *
     * It is `make` and not `parts` because `parts` is tosijs's own part registry
     * (`this.parts.canvas`) — the first cut used it and the compiler caught the
     * clash, which is the same class of collision one level up.
     *
     * Unknown names behave exactly as `instantiate` does: log and return null,
     * never throw. A missing prop is a content problem, and taking the scene down
     * over it helps nobody.
     *
     * Mirrors `svgIcons.<name>()` and `<tosi-b3d>`'s own `el.make.box()`, so the
     * codebase has ONE idea of what a name-keyed factory looks like — and the
     * same option vocabulary (`x/y/z`, `rx/ry/rz` in degrees) whether the thing
     * you are making is a primitive or a model.
     */
    get make() {
        return new Proxy({}, {
            get: (_t, prop) => (options = {}) => this.instantiate(prop, options),
            // So `'scout' in lib.parts` and console autocomplete tell the truth.
            has: (_t, prop) => this.getNames().includes(prop),
            ownKeys: () => this.getNames(),
            getOwnPropertyDescriptor: () => ({
                enumerable: true,
                configurable: true,
            }),
        });
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
        /*
        CARRY THE EXTRAS ONTO WHAT WE RETURN.
    
        `clone()` preserves `metadata` (verified — it is the same object), but
        `canonical: true` returns a WRAPPER built by `canonicalize`, and the wrapper
        has none: the extras are down on the child. So a consumer doing the
        documented thing got `metadata` `{}` and concluded the catalogue was
        unreachable (#45). It was one node away.
    
        Copied rather than shared, so a consumer annotating an instance cannot write
        through to the container's node and change what every later instance sees.
        */
        const extras = source?.metadata?.gltf?.extras;
        if (extras != null && result !== clone) {
            const meta = (result.metadata ??= {});
            const gltf = (meta.gltf ??= {});
            gltf.extras = { ...extras };
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
            /*
            QUATERNION, not euler — `.rotation` is IGNORED here.
      
            Babylon's glTF loader always assigns a `rotationQuaternion` (its
            `_LoadTransform` sets `Quaternion.Identity()` even when the file carries
            no rotation), and a TransformNode ignores `.rotation` entirely while a
            quaternion is present. So writing euler did NOTHING on the default
            non-canonical path: measured on the shipped scout, `ry = 0`, `ry = 140`
            and `ry = -90` all produced bit-identical forward vectors — you got the
            GLB's own baked scene rotation whichever you asked for.
      
            Position worked, which is what made it look wired up. The option has been
            inert since it existed; 0.7.0 is merely the release that advertised it,
            and briefly shipped a changelog telling adopters to convert a number that
            was never read. Same lesson as `ry` on AbstractMesh: when something else
            owns the quaternion, euler fields are decoration.
            */
            if (options.rx !== undefined ||
                options.ry !== undefined ||
                options.rz !== undefined) {
                const DEG = Math.PI / 180;
                result.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll((options.ry ?? 0) * DEG, (options.rx ?? 0) * DEG, (options.rz ?? 0) * DEG);
            }
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
export const b3dLibrary = B3dLibrary.elementCreator();
//# sourceMappingURL=b3d-library.js.map