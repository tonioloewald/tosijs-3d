/*#
# b3d-prop

**A library model in the scene, and nothing else.** A transform, a mesh name,
and no behaviour — which is most of what populates a level.

```markup
<tosi-b3d-library url="https://cdn.tosijs.net/kenney/libraries/nature-kit-core.glb"
                  type="nature"></tosi-b3d-library>
<tosi-b3d-prop library="nature" mesh-name="tree_pineDefaultA"
               x="2" z="-3" ry="45"></tosi-b3d-prop>
```

## Why this exists

`b3d-destroyable`'s own doc named the gap it closed — *"a static, destroyable
thing that uses a library mesh is most of what populates a level, and there was
no route to it"* — and stopped one case short of this one. A plain prop had to
be a `<tosi-b3d-destroyable>` with `capacity`, `armor`, `regenRate`, `explode`
and `deathBlast` all inert but all present, plus a combat id registered in the
`CombatWorld` for an object nothing will ever shoot.

## The reason it matters more than "a convenience element"

**It is the difference between the CDN's 5,108 models being reachable or not
from a page that cannot run JavaScript.**

`cdn.tosijs.net` publishes 48 kit libraries, one glb per kit, uniform by
construction — but every model sits at the ORIGIN with no translation, because
the format is built for `getObjectByName(...).clone()`. Point a plain viewer at
`cube-pets.glb` and you get 24 animals stacked inside each other. So a consumer
with a JS build reaches all 5,108 and a consumer writing declarative HTML
reaches **zero**.

Reported from `tosijs-product`, whose doc pages are Markdown with raw HTML and
**no `<script>` execution** — the scroll narrative is authored as elements with
attributes. They wanted one parrot out of `cube-pets.glb` and there was no way
to ask for it.

## `library-url` — the one-model case

A separate `<tosi-b3d-library>` plus a `type` handshake is right when several
props share a kit, and ceremony when you want one object:

```markup
<tosi-b3d-prop library-url="https://cdn.tosijs.net/kenney/libraries/cube-pets.glb"
               mesh-name="parrot" y="0.5"></tosi-b3d-prop>
```

The element mounts its own hidden `<tosi-b3d-library>` and uses it. Several
props sharing one `library-url` share the ONE library element, so the glb is
fetched once rather than per prop — otherwise this convenience would quietly
cost a download per model.

> The markup blocks above use a ```markup fence, not ```html — an `html` fence
> is a LIVE EXAMPLE language here (html/js/css fences compose one runnable
> example), so markup meant only to be read would be executed. Written as
> `html`, these two blocks became live custom elements with no scene around
> them.

## Attributes

| attribute | default | |
| --- | --- | --- |
| `library` | `''` | `type` of a `<tosi-b3d-library>` in the scene |
| `libraryUrl` | `''` | glb URL — mounts a library for you; use instead of `library` |
| `meshName` | `''` | model name within the library |
| `scale` | `1` | uniform scale applied to the instance root |
| `x` `y` `z` | `0` | position |
| `rx` `ry` `rz` | `0` | rotation, in DEGREES |

## Demo

Three props from one Kenney kit, placed declaratively.

```js
import { b3d, b3dLight, b3dSun, b3dSkybox, b3dLibrary, b3dProp, b3dGround } from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'
import { assetUrl } from 'tosijs-3d'

preview.append(
  b3d(
    {
      style: 'width:100%;height:100%',
      sceneCreated(el) {
        orbitCam(el, { alpha: -Math.PI / 2.4, beta: Math.PI / 3, radius: 9, target: [0, 1, 0] })
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
*/
/*{ "parent": "Core", "order": 146 }*/
import { AbstractMesh } from './b3d-utils.js';
import { loadLibraryMesh } from './library-mesh.js';
/**
 * Libraries mounted for `libraryUrl` — PER SCENE, keyed by url within it.
 *
 * Shared within a scene, because the convenience would otherwise cost a
 * download per prop: ten trees from one kit would fetch the kit ten times. One
 * library element per distinct url per scene, and every prop in that scene
 * asking for that url uses it.
 *
 * ⚠️ IT USED TO BE A MODULE GLOBAL keyed by url alone, and that was wrong in a
 * way this element's own documentation advertises. `B3d.getLibrary` reads a
 * PER-INSTANCE map, so on a page with two `<tosi-b3d>` sections sharing a
 * `library-url` — a scroll narrative of sections, which is exactly the case the
 * doc sells — scene B was handed scene A's type, never mounted a library into
 * itself, polled for five seconds and rendered nothing. Worse on an SPA
 * re-mount: the cached entry pointed at a detached element from a disposed
 * scene and nothing ever removed it, so the url was poisoned for the life of
 * the page.
 *
 * A `WeakMap` keyed by the owner, so a disposed scene's entry goes with it
 * rather than having to be swept.
 */
const mounted = new WeakMap();
let urlSeq = 0;
/** This scene's url → library-type map, created on first use. */
function mountedIn(owner) {
    let perScene = mounted.get(owner);
    if (perScene == null) {
        perScene = new Map();
        mounted.set(owner, perScene);
    }
    return perScene;
}
export class B3dProp extends AbstractMesh {
    static preferredTagName = 'tosi-b3d-prop';
    static initAttributes = {
        ...AbstractMesh.initAttributes,
        library: '',
        libraryUrl: '',
        meshName: '',
        scale: 1,
    };
    _stopLoad = null;
    sceneReady(owner) {
        const attrs = this;
        const meshName = String(attrs.meshName ?? '');
        if (meshName === '') {
            console.error('b3d-prop: no meshName — nothing to place.');
            return;
        }
        const type = this._resolveLibrary(owner);
        if (type == null) {
            console.error('b3d-prop: set `library` (a <tosi-b3d-library> type) or `libraryUrl`.');
            return;
        }
        this._stopLoad = loadLibraryMesh({
            owner,
            type,
            meshName,
            transform: {
                x: attrs.x,
                y: attrs.y,
                z: attrs.z,
                rx: attrs.rx,
                ry: attrs.ry,
                rz: attrs.rz,
            },
            generation: () => this.loadGeneration,
            started: ++this.loadGeneration,
            label: 'b3d-prop',
            onLoaded: (node) => {
                /*
                The instance root is a TransformNode and `AbstractMesh.mesh` is typed
                `Mesh` — the same cast `b3d-destroyable` makes, and for the same
                reason: it is the RIGHT node to put there, because the base class syncs
                position and rotation onto `mesh` every render, which is exactly what a
                placed model wants.
                */
                this.mesh = node;
                this._applyScale();
                // The component render that would have synced the transform has already
                // run; run it now that there is something to sync onto.
                this.render();
                owner.register({ meshes: node.getChildMeshes() });
            },
        });
    }
    /** The library `type` to load from, mounting one for `libraryUrl` if needed. */
    _resolveLibrary(owner) {
        const attrs = this;
        const declared = String(attrs.library ?? '');
        if (declared !== '')
            return declared;
        const url = String(attrs.libraryUrl ?? '');
        if (url === '')
            return null;
        const perScene = mountedIn(owner);
        const have = perScene.get(url);
        // Still connected? A library removed from the scene (or a scene torn down
        // and rebuilt into the same element) leaves an entry pointing at a detached
        // node, and returning its type would send every prop into the 5s poll.
        if (have != null && have.el.isConnected)
            return have.type;
        const type = `__prop-${urlSeq++}`;
        // Appended to the SCENE, not to this element: a library is scene-scoped,
        // and nesting it here would tie its life to one prop out of however many
        // end up sharing it.
        const el = document.createElement('tosi-b3d-library');
        el.setAttribute('url', url);
        el.setAttribute('type', type);
        owner.appendChild(el);
        perScene.set(url, { type, el });
        return type;
    }
    _applyScale() {
        const node = this.mesh;
        if (node?.scaling == null)
            return;
        const s = this.scale;
        const k = typeof s === 'number' && Number.isFinite(s) && s > 0 ? s : 1;
        node.scaling.set(k, k, k);
    }
    render() {
        super.render();
        // Scale is not part of AbstractMesh's per-render sync, so a later write
        // would otherwise take and do nothing — the exact shape of #43.
        if (this.mesh != null)
            this._applyScale();
    }
    sceneDispose() {
        this._stopLoad?.();
        this._stopLoad = null;
        this.mesh?.dispose();
        this.mesh = undefined;
        super.sceneDispose();
    }
}
export const b3dProp = B3dProp.elementCreator();
//# sourceMappingURL=b3d-prop.js.map