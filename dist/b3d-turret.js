/*#
# b3d-turret

An **auto-tracking gun** — it slews its barrel to lead a moving target and elevate for
gravity drop (how much of each is governed by `smart`; drop uses `ballisticAim` from
[ballistics.ts](?ballistics.ts)), turns within a `traverseRate` budget (`steerToward`
from [guidance.ts](?guidance.ts)), and fires [warhead](?b3d-warhead.ts) shells
([spawnProjectile](?b3d-launcher.ts)) once the target is **in range and it can
bear**. The barrel glows its `armedColor` the instant it has a firing solution — so
you can watch it acquire, lead, and open up.

## Demo

A drone **orbits** the turret; the turret tracks it, **leads** the crossing motion, and
fires when aligned (barrel glows red when it can bear). Shots arc in and blast the drone,
which **respawns at a fresh altitude** each time. It's fully automatic — no controls;
just watch it acquire, engage, and correct. The **`smart` (0..1)** slider is a skill
*curve*: at **0** it aims straight at where the target *is now* — so it whiffs the
crossing motion and, at the default low muzzle speed, **falls short**. **Leading ramps in
first — full by 0.5** — then **drop compensation** finishes ramping to **1**, elevating
the barrel for gravity. So low-smart turrets lead but shoot flat; high-smart ones lead
*and* arc their shots onto target. (0.5–1 is reserved to fold in target
acceleration/turn-rate prediction later.) Drop the traverse rate to watch it struggle to
keep up even when smart.

```js
import { b3d, b3dTurret, b3dDestroyable, b3dLight, b3dSkybox, b3dGround, label3d, slider3d, sceneDelta } from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'
import { tosi } from 'tosijs'

const { s } = tosi({ s: { traverseRate: 2.5, range: 30, fireRate: 2, muzzleSpeed: 24, smart: 0 } })
const turret = b3dTurret({ x: 0, y: 0, z: 0, traverseRate: s.traverseRate, range: s.range, fireRate: s.fireRate, muzzleSpeed: s.muzzleSpeed, smart: s.smart })

const scene = b3d(
  {
    scenePanelOpen: true,
    scenePanel: () => [
      label3d({ text: 'Turret', bold: true }),
      slider3d({ label: 'traverse rate', value: s.traverseRate, min: 0.3, max: 6, step: 0.1 }),
      slider3d({ label: 'range', value: s.range, min: 8, max: 40, step: 1 }),
      slider3d({ label: 'fire rate', value: s.fireRate, min: 0.5, max: 8, step: 0.5 }),
      slider3d({ label: 'muzzle speed', value: s.muzzleSpeed, min: 15, max: 60, step: 1 }),
      slider3d({ label: 'smart (drop comp)', value: s.smart, min: 0, max: 1, step: 0.05 }),
    ],
    sceneCreated(el, BABYLON) {
      orbitCam(el, { alpha: -Math.PI / 2.2, beta: Math.PI / 3.2, radius: 34, target: [0, 3, 0] })
      let a = 0, target = null, baseY = 4
      const spawn = () => {
        baseY = 3 + Math.random() * 8 // ~3–11m, within the turret's reach
        const t = b3dDestroyable({ meshName: 'drone', x: 12, y: baseY, z: 0, size: 1.3, capacity: 24, color: '#3388dd', explode: 'on' })
        el.appendChild(t)
        return t
      }
      target = spawn()
      el.addEventListener('destroyed', () => {
        const dead = target; target = null
        if (dead) dead.remove()
        setTimeout(() => { target = spawn() }, 500)
      })
      el.scene.onBeforeRenderObservable.add(() => {
        turret.traverseRate = s.traverseRate.value
        turret.range = s.range.value
        turret.fireRate = s.fireRate.value
        turret.muzzleSpeed = s.muzzleSpeed.value
        turret.smart = s.smart.value
        a += sceneDelta(el.scene)
        if (!target || target.dead || !target.mesh) return
        target.x = Math.cos(a * 0.6) * 12
        target.z = Math.sin(a * 0.6) * 12
        target.y = baseY + Math.sin(a * 1.3) * 1.2
        turret.track(target.mesh)
      })
    },
  },
  b3dLight({ y: 1, intensity: 0.85 }),
  b3dSkybox({ timeOfDay: 10 }),
  b3dGround({ width: 60, height: 60, color: '#5a6b52' }),
  turret,
)
preview.append(scene)
```
```css
tosi-b3d { width: 100%; height: 100%; }
```

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `muzzleSpeed` | `35` | Shell launch speed (also the lead-solver's projectile speed) |
| `fireRate` | `2` | Max shots per second |
| `range` | `30` | Won't fire beyond this distance |
| `traverseRate` | `2.5` | Max barrel slew rate (rad/sec) |
| `smart` | `0` | Skill curve 0..1: **lead** ramps to full by **0.5**, **drop** compensation to full by **1** (0 = aim at the target's current spot). 0.5–1 reserved for acceleration/turn-rate prediction later |
| `aimTolerance` | `6` | Fires only when the barrel is within this many degrees of the solution |
| `gravity` / `drag` / `mass` | `-9.81` / `0.01` / `1` | Shell ballistics (see b3d-launcher) |
| `damage` / `fullRadius` / `blastRadius` / `los` | `20` / `1` / `2.5` / `'on'` | Warhead payload (see b3d-warhead) |
| `idleColor` | `'#4a5560'` | Barrel colour with no firing solution |
| `armedColor` | `'#e04030'` | Barrel colour when it can bear (has a solution, in range) |
| `x`,`y`,`z` | `0` | Turret base position |
*/
/*{ "parent": "Combat" }*/
import * as BABYLON from '@babylonjs/core';
import { loadLibraryMesh } from './library-mesh.js';
import { findBarrel } from './model-transform.js';
import { AbstractMesh, isOff, sceneDelta } from './b3d-utils.js';
import { ballisticAim } from './ballistics.js';
import { spawnProjectile } from './b3d-launcher.js';
import { steerToward, gNormalize, gSub } from './guidance.js';
const RAD_TO_DEG = 180 / Math.PI;
export class B3dTurret extends AbstractMesh {
    static preferredTagName = 'tosi-b3d-turret';
    static initAttributes = {
        ...AbstractMesh.initAttributes,
        meshName: 'turret',
        /**
         * Instantiate `meshName` from this LIBRARY instead of drawing the built-in
         * pedestal-and-box.
         *
         * A piece that IS a turret rendered as two primitives, because neither this
         * element nor `b3d-launcher` took a library (#34) while `b3d-destroyable`
         * and `b3d-aircraft` both did.
         *
         * Which node AIMS is declared by the MODEL, via the `_barrel` suffix —
         * the same way it already declares its colliders and its centre of gravity.
         * A model without one yaws as a unit, which is right for a simple turret
         * and means a placed model works before anyone rigs it.
         */
        library: '',
        muzzleSpeed: 35,
        fireRate: 2,
        range: 30,
        traverseRate: 2.5, // rad/sec
        // Drop compensation 0..1: 0 aims straight (naive, falls short at range); 1 fully
        // elevates for gravity so it hits harder/farther targets without more muzzle speed.
        smart: 0,
        aimTolerance: 6, // degrees within which it fires
        gravity: -9.81,
        drag: 0.01,
        mass: 1,
        damage: 20,
        fullRadius: 1,
        blastRadius: 2.5,
        los: 'on',
        idleColor: '#4a5560',
        armedColor: '#e04030',
    };
    _barrel;
    _barrelMat;
    _stopLoad = null;
    _aim = { x: 0, y: 0, z: 1 }; // world-space unit barrel direction
    _target;
    _lastTargetPos;
    _cooldown = 0;
    _armed = false;
    _tick;
    get warheadSpec() {
        return {
            damage: this.damage,
            fullRadius: this.fullRadius,
            blastRadius: this.blastRadius,
        };
    }
    get ballisticParams() {
        return {
            gravity: { x: 0, y: this.gravity, z: 0 },
            dragCoeff: this.drag,
            mass: this.mass,
        };
    }
    /** True while the turret has a firing solution (in range + bearing). */
    get canBear() {
        return this._armed;
    }
    sceneReady(owner, scene) {
        super.sceneReady(owner, scene);
        const attrs = this;
        // Base pedestal — positioned by AbstractMesh from x/y/z; the barrel is a child
        // we rotate freely so the transform sync (which only touches this.mesh) can't
        // fight the aim.
        this.mesh = BABYLON.MeshBuilder.CreateCylinder(this.meshName, { height: 0.5, diameter: 0.9 }, scene);
        const baseMat = new BABYLON.StandardMaterial(`${this.meshName}-base`, scene);
        baseMat.diffuseColor = new BABYLON.Color3(0.22, 0.24, 0.28);
        this.mesh.material = baseMat;
        this.mesh.position.set(attrs.x, attrs.y, attrs.z);
        this._barrel = BABYLON.MeshBuilder.CreateBox(`${this.meshName}-barrel`, { width: 0.22, height: 0.22, depth: 1.1 }, scene);
        this._barrel.parent = this.mesh;
        this._barrel.position.set(0, 0.55, 0); // sit atop the pedestal
        this._barrelMat = new BABYLON.StandardMaterial(`${this.meshName}-bmat`, scene);
        this._barrelMat.diffuseColor = BABYLON.Color3.FromHexString(this.idleColor);
        this._barrel.material = this._barrelMat;
        /*
        A LIBRARY MODEL REPLACES BOTH PRIMITIVES.
    
        Built after them rather than instead, so the aiming rig is already wired and
        the model is a swap rather than a second code path — if the library never
        resolves, the primitives are still there and the turret still works.
    
        `_barrel` says which node elevates. Absent, the whole model becomes the
        barrel and yaws as a unit: correct for a simple turret, and it means a model
        works the moment it is placed rather than once someone has rigged it.
        */
        const libType = String(this.library ?? '');
        if (libType !== '') {
            this._stopLoad = loadLibraryMesh({
                owner,
                type: libType,
                meshName: this.meshName,
                transform: { x: attrs.x, y: attrs.y, z: attrs.z },
                generation: () => this.loadGeneration,
                started: ++this.loadGeneration,
                label: 'b3d-turret',
                onLoaded: (node) => {
                    this._barrel?.dispose();
                    this._barrelMat?.dispose();
                    this._barrelMat = undefined;
                    this.mesh?.dispose();
                    this.mesh = node;
                    const barrel = findBarrel(node);
                    // No `_barrel` → the model itself is what aims.
                    this._barrel = (barrel ?? node);
                    owner.register({ meshes: node.getChildMeshes() });
                },
            });
        }
        this._tick = scene.onBeforeRenderObservable.add(() => {
            const dt = sceneDelta(scene);
            if (this._cooldown > 0)
                this._cooldown -= dt;
            this._update(dt);
        });
    }
    /** Track a mesh: the turret leads and fires on it while it's in range. */
    track(mesh) {
        this._target = mesh;
    }
    /** Stop tracking (barrel holds its last heading, goes idle). */
    clearTarget() {
        this._target = undefined;
        this._lastTargetPos = undefined;
    }
    /** World-space muzzle point (barrel tip). */
    muzzle() {
        const base = this.mesh?.absolutePosition ?? BABYLON.Vector3.Zero();
        return new BABYLON.Vector3(base.x + this._aim.x * 0.6, base.y + 0.55 + this._aim.y * 0.6, base.z + this._aim.z * 0.6);
    }
    _update(dt) {
        if (this.mesh == null || this._barrel == null)
            return;
        let solution = null;
        let inRange = false;
        if (this._target != null && !this._target.isDisposed()) {
            const p = this._target.absolutePosition;
            const tPos = { x: p.x, y: p.y, z: p.z };
            // Finite-difference the target velocity for the lead solver.
            const tVel = this._lastTargetPos != null && dt > 1e-5
                ? {
                    x: (tPos.x - this._lastTargetPos.x) / dt,
                    y: (tPos.y - this._lastTargetPos.y) / dt,
                    z: (tPos.z - this._lastTargetPos.z) / dt,
                }
                : { x: 0, y: 0, z: 0 };
            this._lastTargetPos = tPos;
            const base = this.mesh.absolutePosition;
            const mount = { x: base.x, y: base.y + 0.55, z: base.z };
            inRange = this._dist(tPos, mount) <= this.range;
            // `smart` (0..1) is a skill CURVE governing lead and drop, with lead ramping in
            // faster than drop:
            //  - 0     = dumb: aim straight at where the target IS now (whiffs crossing
            //            motion, falls short at range).
            //  - →0.5  = lead ramps to FULL (aim where the target WILL be).
            //  - →1    = drop compensation ramps to full (elevate for gravity).
            // (The 0.5..1 band is where target acceleration / turn-rate prediction will fold
            //  in later — for now it just finishes the drop ramp.)
            const smart = Math.max(0, Math.min(1, this.smart));
            const leadK = Math.min(1, smart / 0.5); // full lead by 0.5
            const dropK = smart; // full drop by 1
            const flight = this._dist(tPos, mount) / Math.max(1, this.muzzleSpeed);
            const aimPoint = {
                x: tPos.x + tVel.x * flight * leadK,
                y: tPos.y + tVel.y * flight * leadK,
                z: tPos.z + tVel.z * flight * leadK,
            };
            const straight = gNormalize(gSub(aimPoint, mount)); // line to the (lead-adjusted) point
            const ball = ballisticAim(mount, aimPoint, this.muzzleSpeed, this.gravity) ??
                straight;
            solution = gNormalize({
                x: straight.x + (ball.x - straight.x) * dropK,
                y: straight.y + (ball.y - straight.y) * dropK,
                z: straight.z + (ball.z - straight.z) * dropK,
            });
            // Slew the aim toward the solution within the traverse budget.
            this._aim = gNormalize(steerToward(this._aim, solution, this.traverseRate, dt));
        }
        // Orient the barrel to the current aim (world == local; base has no rotation).
        this._barrel.rotationQuaternion = BABYLON.Quaternion.FromLookDirectionLH(new BABYLON.Vector3(this._aim.x, this._aim.y, this._aim.z), BABYLON.Vector3.Up());
        // Can we bear? aim within tolerance of the solution AND target in range.
        let armed = false;
        if (solution != null && inRange) {
            const cos = Math.max(-1, Math.min(1, this._aim.x * solution.x +
                this._aim.y * solution.y +
                this._aim.z * solution.z));
            const offDeg = Math.acos(cos) * RAD_TO_DEG;
            armed = offDeg <= this.aimTolerance;
        }
        if (armed !== this._armed) {
            this._armed = armed;
            if (this._barrelMat != null)
                this._barrelMat.diffuseColor = BABYLON.Color3.FromHexString(armed ? this.armedColor : this.idleColor);
        }
        if (armed && this._cooldown <= 0)
            this._fire();
    }
    _fire() {
        if (this.owner == null)
            return;
        this._cooldown = this.fireRate > 0 ? 1 / this.fireRate : 0;
        spawnProjectile(this.owner, {
            origin: this.muzzle(),
            velocity: new BABYLON.Vector3(this._aim.x, this._aim.y, this._aim.z).scale(this.muzzleSpeed),
            warhead: this.warheadSpec,
            params: this.ballisticParams,
            color: '#ffcc33',
            useLos: !isOff(this.los),
        });
    }
    _dist(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dz = a.z - b.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    sceneDispose() {
        // Stop a library load that would otherwise land on a disposed turret.
        this._stopLoad?.();
        this._stopLoad = null;
        if (this._tick != null) {
            this.owner?.scene.onBeforeRenderObservable.remove(this._tick);
            this._tick = undefined;
        }
        this._barrel?.dispose();
        this._barrel = undefined;
        this._barrelMat = undefined;
        super.sceneDispose();
    }
}
export const b3dTurret = B3dTurret.elementCreator();
//# sourceMappingURL=b3d-turret.js.map