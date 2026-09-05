/*#
# b3d-destroyable

A thing that can take damage and be destroyed — the scene-side bridge to the pure
`CombatWorld` (see `destroyable.ts` / COMBAT-DESIGN.md). Drop it into a `<tosi-b3d>`
and it registers a Destroyable in the scene's combat world, drives a placeholder
cube mesh (real meshes/GLB later), and runs its death outcome when killed — whether
by a direct hit or a chain reaction resolved in the combat tick.

## Demo

**Click any cube** to damage it (1/click) — it flashes on a hit and dies at 0 hp. The
front grid are independent targets; the **back row is chain-linked**, so killing the
leftmost cascades the reaction down the line (chains are wired after mount, since they
reference combat ids that only exist once the targets have mounted).

```js
import { b3d, b3dDestroyable, b3dLight, b3dSkybox, b3dGround } from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'

const grid = []
for (let i = 0; i < 12; i++) {
  grid.push(b3dDestroyable({ x: (i % 4) * 1.6 - 2.4, y: 0.5, z: Math.floor(i / 4) * 1.6, capacity: 3, color: '#cc4444' }))
}
const chainRow = []
for (let i = 0; i < 6; i++) {
  chainRow.push(b3dDestroyable({ x: i * 1.6 - 4, y: 0.5, z: -3, capacity: 4, color: '#e0a020' }))
}

const scene = b3d(
  {
    sceneCreated(el, BABYLON) {
      orbitCam(el, { alpha: -Math.PI / 2, beta: Math.PI / 3.2, radius: 15, target: [0, 0.5, -0.5] })
      // click a cube → damage it
      el.scene.onPointerDown = (_evt, pick) => {
        if (!pick.hit || !pick.pickedMesh) return
        const t = [...grid, ...chainRow].find((c) => c.mesh === pick.pickedMesh)
        if (t) t.damage(1)
      }
    },
  },
  b3dLight({ y: 1, intensity: 0.85 }),
  b3dSkybox({ timeOfDay: 10 }),
  b3dGround({ width: 24, height: 24, color: '#5a6b52' }),
  ...grid,
  ...chainRow,
)
preview.append(scene)

// Wire the chain row once every target has mounted (its combat id exists then).
const wireChain = () => {
  if (chainRow.some((c) => !c.combatId)) { requestAnimationFrame(wireChain); return }
  for (let i = 0; i < chainRow.length - 1; i++) {
    chainRow[i].setChain([{ target: chainRow[i + 1].combatId, amount: 99, delay: 0.15 }])
  }
}
wireChain()
```
```css
tosi-b3d { width: 100%; height: 100%; }
```

## Death outcomes

What happens when it dies is configurable — the default just removes the mesh, but
you can compose:

- **`explode="on"`** — shatter the mesh into flying fragments ([b3d-exploder](?b3d-exploder.ts); `explodeForce` tunes it).
- **`deathBlast="on"`** — detonate a real AOE [warhead](?b3d-warhead.ts) at the death
  point after `blastDelay` (default 100 ms). This is a **second, distinct** chain
  mechanism from `chain`: `chain` is direct HP transfer to named targets; `deathBlast`
  is a falloff + line-of-sight **explosion** that ripples out and can set off *any*
  nearby destroyable — which may blast *its* neighbours, cascading. (`blastDamage` /
  `blastFullRadius` / `blastRadius`.)
- **`remains="<prefab>"`** — what it LEAVES BEHIND: wreckage, a burning hull, a crater,
  scattered loot. A [prefab](?prefab.ts) is a named factory that instantiates a package of
  stuff at a pose, and it's spawned at the death pose **inheriting the victim's velocity**,
  so debris keeps its momentum instead of dropping like a stone. (`remainsPrefab` takes a
  function directly, when a name won't do.)
- **`sound="<url>"`** — a positional death sound at the death point. Sugar over `remains`
  (it *is* just a `b3dSound` in a prefab), because almost every death wants one and making
  you write a factory for a single sound would be silly.
- **`whenDestroyed` callback** (set in code) + the bubbling **`destroyed`** event — the seam
  for putting a linked player/vehicle into a *dead* state, or anything `remains` can't
  express.

### Demo — a field of fuel drums that chain-explode

**Click any drum** — it explodes, and the blast sets off its neighbours in a spreading
chain reaction (each drum both `explode`s and fires a `deathBlast`).

```js
import { b3d, b3dDestroyable, b3dLight, b3dSkybox, b3dGround } from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'

const drums = []
for (let i = 0; i < 48; i++) {
  drums.push(b3dDestroyable({
    x: (i % 8) * 1.5 - 5.25, y: 0.5, z: Math.floor(i / 8) * 1.5 - 3.75,
    size: 0.9, capacity: 6, color: '#d06020',
    explode: 'on', explodeForce: 7,
    deathBlast: 'on', blastDamage: 30, blastFullRadius: 1.2, blastRadius: 2.4,
  }))
}

const scene = b3d(
  {
    sceneCreated(el, BABYLON) {
      orbitCam(el, { alpha: -Math.PI / 2, beta: Math.PI / 3, radius: 18, target: [0, 0.5, 0] })
      el.scene.onPointerDown = (_evt, pick) => {
        if (!pick.hit || !pick.pickedMesh) return
        const t = drums.find((d) => d.mesh === pick.pickedMesh)
        if (t) t.damage(99)
      }
    },
  },
  b3dLight({ y: 1, intensity: 0.85 }),
  b3dSkybox({ timeOfDay: 10 }),
  b3dGround({ width: 30, height: 30, color: '#5a6b52' }),
  ...drums,
)
preview.append(scene)
```
```css
tosi-b3d { width: 100%; height: 100%; }
```

It participates in the **floating origin**: because `AbstractMesh` treats the
`x/y/z` attributes as the source of truth for the mesh position, this uses
`addOriginListener` to shift BOTH the mesh node and its `x/z` attributes on a rebase
(NOT `registerWorldRoot`, which would leave the attributes stale so a later render
would un-shift the mesh).

Attributes: `capacity`, `armor`, `regenRate`, `regenDelay`, `protectedBy`,
`protection`, the death-outcome knobs (`explode`/`explodeForce`, `deathBlast` +
`blastDamage`/`blastFullRadius`/`blastRadius`/`blastDelay`), plus `size`/`color` for
the placeholder cube and the usual `x/y/z`/`meshName`. Set `.chain` (a `ChainLink[]`)
in code for direct-transfer chain reactions, or `whenDestroyed` for a death hook. Call
`.damage(n)` to hurt it (a warhead will do this on contact).
*/
/*{ "parent": "Combat", "order": 100 }*/
import * as BABYLON from '@babylonjs/core';
import { loadLibraryMesh } from './library-mesh.js';
import { AbstractMesh, isOff } from './b3d-utils.js';
import { DestroyableBehavior } from './destroyable-behavior.js';
import { spawnPrefab } from './prefab.js';
import { b3dSound } from './b3d-sound.js';
export class B3dDestroyable extends AbstractMesh {
    static preferredTagName = 'tosi-b3d-destroyable';
    static initAttributes = {
        ...AbstractMesh.initAttributes,
        meshName: 'target',
        /**
         * Instantiate `meshName` from this LIBRARY instead of drawing the
         * placeholder cube (`<tosi-b3d-library type="...">`). Absent = cube, so
         * nothing existing changes.
         *
         * The gap this closes: a static, destroyable thing that uses a library mesh
         * is most of what populates a level, and there was no route to it —
         * `b3d-loader` takes a `url` (which also loses the canonical frame), and
         * `b3d-aircraft` gets the frame right but flies. Reported by manta-recon
         * (#22), where `library` was silently ignored and the resulting cube read
         * as a deliberate placeholder rather than a fallback.
         */
        library: '',
        /**
         * `'off'` places the mesh WITHOUT enrolling it in combat — same knob and
         * same spelling as [b3d-loader](?b3d-loader.ts) already has.
         *
         * This element is the only way to place a LIBRARY mesh by name, so scenery
         * had no way out: an ensemble is mostly structure, and every wall and floor
         * was getting a combat record whether or not anything could shoot it
         * (tosijs-3d-ensemble, whose stopgap was `armor: 100_000` — buying "cannot
         * be killed" by paying for a combatant).
         */
        destroyable: 'on',
        size: 1, // placeholder cube edge length (ignored when `library` is set)
        /**
         * Uniform scale for a **library-backed** piece — the lever `size` is not.
         *
         * `size` is the placeholder cube's edge length and does nothing once
         * `library` is set, which left a placed model with no way to be resized at
         * all: ensemble measured a piece rendering at 5.273 units for
         * `scale` 1, 2 and 4 alike, the value going in and nothing coming out
         * (#47). Kept as a separate attribute rather than overloading `size`,
         * because a cube's edge length and a model's multiplier are different
         * quantities and one of them is already documented.
         */
        scale: 1,
        color: '#cc3333',
        capacity: 10, // hit points
        armor: 0, // flat damage shrugged off per hit
        regenRate: 0, // hp/sec (0 = no regen)
        regenDelay: 0.5, // seconds of no damage before regen resumes
        protectedBy: '', // combat id of a protector ('' = none)
        protection: 0, // flat reduction while the protector is intact
        // --- Death outcome (all optional; default is just "remove the mesh") ---
        // What it LEAVES BEHIND: a prefab name (see prefab.ts) — wreckage, a burning hull, a
        // crater, scattered loot. Spawned at the death pose, inheriting the victim's velocity
        // so debris keeps its momentum instead of dropping like a stone.
        remains: '',
        // Death sound (url) — positional, at the death point. Sugar: it's the one thing almost
        // every death wants, and making people write a prefab for a single sound is silly.
        sound: '',
        soundVolume: 1,
        explode: 'off', // on death, shatter the mesh into fragments (see b3d-exploder)
        explodeForce: 6, // outward fragment force when exploding
        deathBlast: 'off', // on death, detonate an AOE warhead (chain-reaction mechanism)
        blastDamage: 20, // death-warhead full damage
        blastFullRadius: 1, // death-warhead full-damage radius
        blastRadius: 4, // death-warhead falloff radius
        blastDelay: 0.1, // seconds after death before the warhead fires (default 100ms)
    };
    /**
     * On-destruction direct-transfer chain links (set in code; see destroyable.ts).
     * Distinct from `deathBlast`, which is an AOE explosion. Mirrored to the behavior.
     */
    chain = [];
    _behavior;
    _onShift;
    /**
     * Optional code-set hook, run once when this target is destroyed (before the
     * visual outcome). The clean seam for putting a linked player/vehicle into a
     * 'dead' state, spawning loot/wreckage, swapping a model, etc. Also rides the
     * bubbling `destroyed` CustomEvent.
     */
    whenDestroyed;
    /** A prefab FUNCTION, when a name won't do (a closure over game state). Takes precedence
     * over the `remains` attribute. Not `onRemains` — an `on*` prop would be bound as a DOM
     * event listener and never fire (see CLAUDE.md). */
    remainsPrefab = null;
    /** Spawn `remains` (+ the death `sound`) at the death pose. Both optional; a destroyable
     * with neither just vanishes, as before. */
    _leaveRemains(at) {
        const owner = this.owner;
        if (owner == null)
            return;
        const attrs = this;
        const node = this.mesh;
        const position = { x: at.x, y: at.y, z: at.z };
        if (attrs.sound) {
            owner.appendChild(b3dSound({
                url: attrs.sound,
                autoplay: true,
                volume: attrs.soundVolume,
                x: position.x,
                y: position.y,
                z: position.z,
            }));
        }
        const prefab = this.remainsPrefab ?? attrs.remains;
        // b3d meshes are quaternion-driven, so `node.rotation` (euler) is always (0,0,0) and Babylon
        // ignores it — read the quaternion so the wreck/crater faces the way the victim actually did.
        const euler = node
            ? node.rotationQuaternion?.toEulerAngles() ?? node.rotation
            : null;
        const RAD2DEG = 180 / Math.PI;
        spawnPrefab(prefab, {
            owner,
            position,
            rotation: euler
                ? { x: euler.x * RAD2DEG, y: euler.y * RAD2DEG, z: euler.z * RAD2DEG }
                : undefined,
            velocity: this.velocity ?? undefined,
            source: this,
            faction: this.faction ?? undefined,
        });
    }
    /** This entity's id in the scene combat world (also its mesh name). */
    get combatId() {
        return this._behavior?.combatId ?? '';
    }
    /** True once destroyed (mesh gone / exploding). Lets others skip dead targets. */
    get dead() {
        return this._behavior?.dead ?? false;
    }
    /** Name the node by the combat id and register it, whenever it arrives. */
    _adopt(owner) {
        const node = this.mesh;
        if (node == null)
            return;
        node.name = this.combatId;
        const meshes = node instanceof BABYLON.AbstractMesh
            ? [node]
            : node.getChildMeshes?.() ?? [];
        if (meshes.length > 0)
            owner.register({ meshes });
    }
    /**
     * Instantiate the model, retrying until the library is mounted and loaded.
     *
     * The library element may connect after this one (declaration order in a
     * scene is the author's business, not a load-order contract), so a single
     * lookup would lose the race — the same wait `b3d-aircraft` does.
     */
    _loadFromLibrary(owner, type, meshName) {
        const attrs = this;
        /*
        ONE loader, shared with `b3d-prop` — see `library-mesh.ts`.
    
        This was that module's original home, and three bugs arrived against it
        (rotation dropped, no scale, a node orphaned mid-load: #47/#48/#49). A
        second element with its own copy would have inherited all three silently,
        because a fix cannot reach a policy that was duplicated — which is exactly
        how the panel-sizing formula survived in two places after being fixed in a
        third.
        */
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
            label: 'b3d-destroyable',
            onLoaded: (node) => {
                /*
                A library instance's root is a TransformNode, and `AbstractMesh.mesh` is
                typed `Mesh` — so this is a cast. It is the RIGHT node to put there
                rather than a convenient lie: the base class syncs x/y/z and rx/ry/rz
                onto `mesh` every frame, which is exactly what a placed library model
                wants, and everything this component does with it (position, name,
                getChildMeshes, dispose) is TransformNode-safe.
                */
                this.mesh = node;
                this._applyScale();
                this.render();
                this._adopt(owner);
            },
        });
    }
    sceneReady(owner, scene) {
        super.sceneReady(owner, scene);
        const attrs = this;
        // A library model if asked for, else the placeholder cube. The standalone
        // element is a DestroyableBehavior wrapped around whichever it got; attach
        // one to a loader/biped/car the same way for anything else.
        //
        // NOTE the model is left PICKABLE, deliberately. A consumer workaround for
        // this gap parented a non-pickable skin to a hidden cube, because a skin
        // that intercepts the projectile ray makes the target look hit and never
        // die. Upstream that isn't needed: damage resolves from the warhead
        // gathering destroyables near the detonation, not from which mesh the ray
        // picked, so the model can simply BE the target.
        if (String(attrs.library) !== '') {
            this._loadFromLibrary(owner, String(attrs.library), attrs.meshName);
        }
        else {
            const mesh = BABYLON.MeshBuilder.CreateBox(`${attrs.meshName}-mesh`, { size: attrs.size }, scene);
            const mat = new BABYLON.StandardMaterial(`${attrs.meshName}-mat`, scene);
            mat.diffuseColor = BABYLON.Color3.FromHexString(attrs.color);
            mesh.material = mat;
            mesh.position.set(attrs.x, attrs.y, attrs.z);
            this.mesh = mesh;
        }
        // Scenery: placed, but not a combatant. No behaviour, so no combat record,
        // no `destroyed` event and nothing for a warhead to gather.
        if (isOff(attrs.destroyable))
            return;
        this._behavior = new DestroyableBehavior(owner, this, {
            idBase: attrs.meshName,
            capacity: attrs.capacity,
            regenRate: attrs.regenRate,
            regenDelay: attrs.regenDelay,
            armor: attrs.armor,
            protectedBy: attrs.protectedBy || undefined,
            protection: attrs.protection,
            chain: this.chain.length ? this.chain : undefined,
        }, {
            explode: !isOff(attrs.explode),
            explodeForce: attrs.explodeForce,
            deathBlast: !isOff(attrs.deathBlast),
            blastDamage: attrs.blastDamage,
            blastFullRadius: attrs.blastFullRadius,
            blastRadius: attrs.blastRadius,
            blastDelay: attrs.blastDelay,
        });
        // Run the user hook (mesh still live), then drop our ref — the behavior captured
        // the mesh before this and will explode/dispose it, so render() must stop writing
        // to it.
        this._behavior.whenDestroyed = (info) => {
            // What it leaves behind. Spawned while the mesh is still live, so the prefab can read
            // the death POSE and the victim's VELOCITY — debris that ignores momentum drops like
            // a stone and reads as fake.
            this._leaveRemains(info.position);
            this.whenDestroyed?.(info);
            this.mesh = undefined;
        };
        this._behavior.attach();
        // Name by the resolved combat id so lookups (warhead/aircraft) find it, and
        // register whatever we ended up with. A library model arrives ASYNC, so this
        // runs again when it lands — see `_adopt`.
        this._adopt(owner);
        // Floating origin: shift node AND the x/z attributes (see file header).
        this._onShift = (dx, dz) => {
            if (this.mesh == null)
                return;
            this.mesh.position.x -= dx;
            this.mesh.position.z -= dz;
            attrs.x -= dx;
            attrs.z -= dz;
        };
        owner.addOriginListener(this._onShift);
    }
    /** Hurt this target; returns the combat events from this hit (flashes on a hit). */
    damage(amount) {
        return this._behavior?.damage(amount) ?? [];
    }
    /**
     * Set on-destruction chain links AFTER mount — chains reference other targets'
     * combat ids, which only exist once those elements have mounted.
     */
    setChain(links) {
        this.chain = links;
        this._behavior?.setChain(links);
    }
    /**
     * Push `scale` onto the instantiated node.
     *
     * A library instance's root is a `TransformNode`, so scaling it scales the
     * whole model — which is what a placed piece means by scale. Uniform on
     * purpose: a non-uniform scale on an arbitrary model is a modelling
     * decision, not a placement one, and it breaks normals.
     */
    _stopLoad = null;
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
        // Scale is not part of AbstractMesh's per-render sync, so it is applied
        // here — otherwise setting `scale` after load would be another attribute
        // that takes a write and does nothing, which is the bug this fixes.
        if (this.library)
            this._applyScale();
    }
    sceneDispose() {
        // Stop a retry that would otherwise outlive this element.
        this._stopLoad?.();
        this._stopLoad = null;
        this._behavior?.dispose();
        this._behavior = undefined;
        if (this._onShift != null) {
            this.owner?.removeOriginListener(this._onShift);
            this._onShift = undefined;
        }
        super.sceneDispose();
    }
}
export const b3dDestroyable = B3dDestroyable.elementCreator();
//# sourceMappingURL=b3d-destroyable.js.map