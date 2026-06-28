/*#
# b3d-aircraft

Arcade flight controller with optional VTOL. Uses the virtual gamepad input system:
left stick for pitch/yaw, right stick X for roll, triggers for throttle up/down.
Solid flight mechanics: rolling costs lift, climbing costs speed.

Throttle has "detents" that make it easy to fly:
- **Level flight**: no throttle → glide at safe speed with gentle descent; mid → cruise; full → accelerate
- **VTOL mode**: no throttle → hover; throttle → climb; pitch down to descend

Set `vtolSpeed` > 0 to enable VTOL. Below that airspeed, thrust goes vertical.
Set `stallSpeed` > 0 for stall behavior (nose drops when too slow).

Mesh can come from a `url` (own GLB) or from a `b3d-library` via `library` + `meshName`.

## Demo

```js
import { b3d, b3dAircraft, b3dLibrary, b3dLight, b3dSun, b3dSkybox, b3dGround, gameController, inputFocus } from 'tosijs-3d'
import { elements } from 'tosijs'
const { div, span } = elements

const aircraft = b3dAircraft({
  library: 'vehicles', meshName: 'scout',
  // Start parked on the ground. The model is rested on the surface via its
  // computed bounding box, so y is the height of its belly — y: 0 = grounded.
  player: true, y: 0,
  // vtolSpeed should match the speed at which lift can sustain altitude
  // — in this model that's maxSpeed * 0.5 (the cruise speed).
  vtolSpeed: 25, stallSpeed: 0, maxSpeed: 50,
})

const hud = div({ class: 'hud' },
  span({ class: 'hud-speed' }),
  span({ class: 'hud-alt' }),
  span({ class: 'hud-throttle' }),
  span({ class: 'hud-mode' }),
  span({ class: 'hud-warn' }),
)

const controls = div({ class: 'controls' },
  'W/S: pitch | A/D: yaw | \u2190/\u2192: roll | R: throttle+ | Q: throttle\u2212 | Release: snap to detent'
)

// Scatter reference markers on the ground. Registering them makes them shadow
// casters, so there are always crisp ground shadows for depth/scale cues — the
// aircraft's own shadow is small and far-offset when it's high up.
function addMarkers(scene) {
  scene.sceneCreated = (owner, BABYLON) => {
    const mat = new BABYLON.StandardMaterial('marker-mat', owner.scene)
    mat.diffuseColor = new BABYLON.Color3(0.2, 0.5, 0.8)
    const boxes = []
    for (let i = 0; i < 40; i++) {
      const x = (Math.random() - 0.5) * 200
      const z = (Math.random() - 0.5) * 200
      const box = BABYLON.MeshBuilder.CreateBox('marker' + i, { size: 2, height: 1 + Math.random() * 4 }, owner.scene)
      box.position.set(x, 0, z)
      box.material = mat
      box.receiveShadows = true
      boxes.push(box)
    }
    owner.register({ meshes: boxes })
  }
  return scene
}

const scene = addMarkers(b3d(
  // On-screen glass gamepad (touch) wired into the input system: left stick
  // pitch/roll, right trigger throttle, etc. via aircraftMapping.
  { gamepad: true },
  // Ambient fill kept low so the directional sun's shadows actually read.
  b3dLight({ y: 1, intensity: 0.4 }),
  // Cascaded shadows cover the whole camera view with a sensible depth range,
  // which suits an aerial scene (aircraft high above a large ground plane).
  // shadowMaxZ spans altitude→ground; activeDistance keeps the aircraft a
  // caster; the low updateIntervalMs keeps caster gating responsive in flight.
  b3dSun({
    x: -0.6, y: -1, z: -0.4,
    intensity: 0.9,
    shadowTextureSize: 2048,
    shadowMaxZ: 300,
    activeDistance: 150,
    updateIntervalMs: 50,
  }),
  b3dSkybox({ timeOfDay: 10 }),
  // `_nocast` so the huge ground only RECEIVES shadows. If it also cast,
  // the sun's auto-fit shadow frustum would stretch to 500 units and the
  // aircraft's shadow would shrink to sub-pixel (i.e. invisible).
  b3dGround({ meshName: 'ground_nocast', width: 500, height: 500, color: '#7d9b6e' }),
  b3dLibrary({ url: '/test-2.glb', type: 'vehicles' }),
  inputFocus(
    gameController(),
    aircraft,
  ),
))

function updateHud() {
  const speedEl = hud.querySelector('.hud-speed')
  const altEl = hud.querySelector('.hud-alt')
  const modeEl = hud.querySelector('.hud-mode')
  const warnEl = hud.querySelector('.hud-warn')
  const throttleEl = hud.querySelector('.hud-throttle')
  speedEl.textContent = `Speed: ${aircraft.airspeed.toFixed(0)} m/s`
  altEl.textContent = `Alt: ${aircraft.altitude.toFixed(0)} m`
  throttleEl.textContent = `Throttle: ${(aircraft.throttleLevel * 100).toFixed(0)}%`
  modeEl.textContent = aircraft.vtolActive ? 'VTOL' : 'FLIGHT'
  const warnings = []
  if (aircraft.stalling) warnings.push('STALL')
  if (aircraft.pullUp) warnings.push('PULL UP')
  warnEl.textContent = warnings.join(' | ')
  warnEl.style.color = warnings.length ? '#ff4444' : 'white'
  requestAnimationFrame(updateHud)
}

preview.append(scene, hud, controls)
requestAnimationFrame(updateHud)
```
```css
tosi-b3d { width: 100%; height: 100%; }
.hud {
  position: absolute;
  bottom: 10px;
  left: 10px;
  display: flex;
  gap: 16px;
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  border-radius: 6px;
  font: 14px monospace;
  z-index: 10;
}
.controls {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 6px 12px;
  background: rgba(0, 0, 0, 0.5);
  color: #ccc;
  border-radius: 4px;
  font: 12px monospace;
  z-index: 10;
}
```

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `url` | `''` | GLB model URL (direct load) |
| `library` | `''` | Library type to source mesh from |
| `meshName` | `''` | Node name to instantiate from library |
| `enterable` | `false` | Whether a biped can enter |
| `maxSpeed` | `50` | Max forward speed (m/s) |
| `acceleration` | `12` | Thrust acceleration |
| `friction` | `2` | Drag when coasting |
| `pitchRate` | `60` | Degrees/sec pitch |
| `turnRate` | `45` | Degrees/sec yaw |
| `vtolSpeed` | `0` | Forward-airspeed threshold for VTOL (0 = no VTOL). Recommended: `maxSpeed * 0.5` — the speed at which lift sustains altitude in this model. |
| `stallSpeed` | `40` | Speed below which stall occurs (0 = no stall) |

## API (read-only properties for HUD binding)

- `airspeed: number` — current forward speed (m/s)
- `altitude: number` — height above ground
- `vtolActive: boolean` — true when in VTOL mode
- `stalling: boolean` — true when airspeed < stallSpeed (not in VTOL)
- `pullUp: boolean` — true when ground collision predicted within ~5s
- `grounded: boolean` — true when settled on the ground (wheels/rolling resistance)
*/
/*{ "parent": "Vehicles" }*/
import * as BABYLON from '@babylonjs/core';
import { B3dControllable } from './b3d-controllable';
import { aircraftMapping } from './virtual-gamepad';
import { computeForces } from './aircraft-physics';
import { placeOnSurface, boundingBottomOffset } from './b3d-utils';
// Small gap kept between the model's belly and the ground.
const GROUND_SEPARATION = 0.05;
const DEG2RAD = Math.PI / 180;
const PULL_UP_SECONDS = 5;
// Landing: distance above clearance still counted as "on the ground", and the
// per-second rolling-resistance decay applied to horizontal velocity once down.
const GROUND_TOUCH = 0.15;
const GROUND_FRICTION = 1.2;
export class B3dAircraft extends B3dControllable {
    inputMapping = aircraftMapping();
    static initAttributes = {
        ...B3dControllable.initAttributes,
        url: '',
        library: '',
        meshName: '',
        player: false,
        enterable: false,
        maxSpeed: 50,
        acceleration: 12,
        friction: 2,
        pitchRate: 60,
        turnRate: 45,
        vtolSpeed: 0,
        stallSpeed: 40,
    };
    // Read-only flight state
    airspeed = 0;
    altitude = 0;
    throttleLevel = 0;
    vtolActive = false;
    stalling = false;
    pullUp = false;
    grounded = false;
    /** Active camera mode — toggled by the `view` button. Also read by the XR
     * chase rig to sit in the cockpit vs. behind the aircraft. */
    cameraView = 'chase';
    viewWasPressed = false;
    velocity = new BABYLON.Vector3(0, 0, 0);
    rollAngle = 0;
    meshNode = null;
    meshesToDispose = [];
    // Derived from the model's geometry in setupMesh so the body rests on the
    // ground rather than the origin sinking into it (origins aren't at the feet).
    groundClearance = 0.5;
    libraryNode = null;
    getCameraTarget() {
        return this.meshNode ?? null;
    }
    applyInput(input, dt) {
        if (!this.meshNode)
            return;
        const attrs = this;
        const node = this.meshNode;
        const vel = this.velocity;
        // Camera toggle on the view button (edge-detected so a held press fires once)
        const viewPressed = input.view > 0.5;
        if (viewPressed && !this.viewWasPressed) {
            this.setCameraView(this.cameraView === 'chase' ? 'cockpit' : 'chase');
        }
        this.viewWasPressed = viewPressed;
        // --- Orientation: pitch, yaw, roll ---
        const pitchAmount = input.forward * attrs.pitchRate * DEG2RAD * dt;
        const yawAmount = input.turn * attrs.turnRate * DEG2RAD * dt;
        node.rotate(BABYLON.Axis.X, pitchAmount, BABYLON.Space.LOCAL);
        node.rotate(BABYLON.Axis.Y, yawAmount, BABYLON.Space.WORLD);
        // Manual roll from strafe
        const manualRoll = input.strafe * 60 * DEG2RAD * dt;
        if (Math.abs(manualRoll) > 0.001) {
            node.rotate(BABYLON.Axis.Z, -manualRoll, BABYLON.Space.LOCAL);
        }
        // Yaw-coupled roll: rudder banks the aircraft (max 30° at full rudder)
        const yawCoupledTarget = -input.turn * 30 * DEG2RAD;
        const prevRoll = this.rollAngle;
        this.rollAngle += (yawCoupledTarget - this.rollAngle) * Math.min(1, 3 * dt);
        const yawRollDelta = this.rollAngle - prevRoll;
        if (Math.abs(yawRollDelta) > 0.0001) {
            node.rotate(BABYLON.Axis.Z, yawRollDelta, BABYLON.Space.LOCAL);
        }
        // --- Forces (delegated to pure aircraft-physics module) ---
        const localUp = node.up;
        const localForward = node.forward;
        const config = {
            maxSpeed: attrs.maxSpeed,
            acceleration: attrs.acceleration,
            vtolSpeed: attrs.vtolSpeed,
            stallSpeed: attrs.stallSpeed,
        };
        const { dv, vtol, airspeed } = computeForces({ x: vel.x, y: vel.y, z: vel.z }, {
            forward: { x: localForward.x, y: localForward.y, z: localForward.z },
            up: { x: localUp.x, y: localUp.y, z: localUp.z },
        }, input.throttle, config, dt);
        vel.x += dv.x;
        vel.y += dv.y;
        vel.z += dv.z;
        // Stall: nose drops when too slow (non-VTOL only).
        // (Kept here because it mutates orientation, not velocity.)
        if (!vtol && attrs.stallSpeed > 0 && airspeed < attrs.stallSpeed) {
            node.rotate(BABYLON.Axis.X, 0.5 * dt, BABYLON.Space.LOCAL);
        }
        // === Apply velocity to position ===
        node.position.addInPlaceFromFloats(vel.x * dt, vel.y * dt, vel.z * dt);
        // Ground contact. Clamp out of the terrain; once settled, behave like
        // wheels — kill the downward bounce and apply rolling resistance so you can
        // land, roll to a stop, and accelerate to take off again. (First cut — tune
        // GROUND_FRICTION / GROUND_TOUCH; the model's own ground tweaks are separate.)
        const groundDist = this.raycastGround(node);
        if (groundDist < this.groundClearance) {
            node.position.y += this.groundClearance - groundDist;
        }
        this.grounded = groundDist <= this.groundClearance + GROUND_TOUCH;
        if (this.grounded) {
            if (vel.y < 0)
                vel.y = 0; // don't sink or bounce off the surface
            const roll = Math.exp(-GROUND_FRICTION * dt);
            vel.x *= roll;
            vel.z *= roll;
        }
        // --- Update read-only state ---
        this.altitude = node.position.y;
        this.airspeed = airspeed;
        this.throttleLevel = input.throttle;
        this.vtolActive = vtol;
        this.updatePullUp(node, dt);
        this.stalling = !vtol && attrs.stallSpeed > 0 && airspeed < attrs.stallSpeed;
    }
    /** Raycast downward to find distance to ground. Returns Infinity if no hit. */
    raycastGround(node) {
        if (!this.owner)
            return Infinity;
        const ray = new BABYLON.Ray(node.position.clone(), BABYLON.Vector3.Down(), 500);
        const ownMeshes = new Set();
        if (node instanceof BABYLON.AbstractMesh)
            ownMeshes.add(node);
        for (const child of node.getChildMeshes())
            ownMeshes.add(child);
        const hit = this.owner.scene.pickWithRay(ray, (m) => !ownMeshes.has(m) && !m.name.includes('__root__'));
        return hit?.hit ? hit.distance : Infinity;
    }
    updatePullUp(node, _dt) {
        // Warn if projected altitude in PULL_UP_SECONDS is below 10m
        const groundDist = this.raycastGround(node);
        const futureY = groundDist < Infinity
            ? groundDist + this.velocity.y * PULL_UP_SECONDS
            : node.position.y + this.velocity.y * PULL_UP_SECONDS;
        this.pullUp = futureY < 10 && node.forward.y < -0.05;
    }
    connectedCallback() {
        super.connectedCallback();
    }
    sceneReady(owner, scene) {
        super.sceneReady(owner, scene);
        const attrs = this;
        if (attrs.url !== '') {
            this.loadFromUrl(attrs.url, owner, scene);
        }
        else if (attrs.library !== '' && attrs.meshName !== '') {
            this.loadFromLibrary(attrs.library, attrs.meshName, owner);
        }
    }
    loadFromUrl(url, owner, scene) {
        this.loadAssetContainer(scene, url, (container) => {
            const entries = container.instantiateModelsToScene(undefined, false, {
                doNotInstantiate: true,
            });
            if (entries.rootNodes.length !== 1) {
                throw new Error('<tosi-b3d-aircraft> expects a container with exactly one root node');
            }
            const root = entries.rootNodes[0];
            this.setupMesh(root, owner);
            this.meshesToDispose = entries.rootNodes;
        });
    }
    loadFromLibrary(libraryType, meshName, owner) {
        // Library load doesn't go through loadAssetContainer, so capture the gen
        // ourselves and use the same invalidation mechanism.
        const gen = ++this.loadGeneration;
        const tryLoad = () => {
            if (gen !== this.loadGeneration)
                return true; // stale — stop trying
            const lib = owner.getLibrary(libraryType);
            if (!lib)
                return false;
            lib.ready.then(() => {
                if (gen !== this.loadGeneration)
                    return; // stale — discard
                const node = lib.instantiate(meshName, {
                    x: this.x ?? 0,
                    y: this.y ?? 0,
                    z: this.z ?? 0,
                });
                if (!node) {
                    console.error(`b3d-aircraft: could not instantiate "${meshName}" from library "${libraryType}"`);
                    return;
                }
                this.libraryNode = node;
                if (node instanceof BABYLON.TransformNode) {
                    this.setupMesh(node, owner);
                }
            });
            return true;
        };
        if (!tryLoad()) {
            const handler = () => {
                if (tryLoad()) {
                    owner.removeEventListener('library-changed', handler);
                }
            };
            owner.addEventListener('library-changed', handler);
        }
    }
    setupMesh(root, owner) {
        this.meshNode = root;
        if (root instanceof BABYLON.Mesh) {
            this.mesh = root;
            root.ellipsoid = new BABYLON.Vector3(1, 0.5, 2);
            root.ellipsoidOffset = new BABYLON.Vector3(0, 0.5, 0);
        }
        const meshes = root instanceof BABYLON.AbstractMesh
            ? [root, ...root.getChildMeshes()]
            : root.getChildMeshes();
        owner.register({ meshes });
        // Rest the model on the ground at its spawn height, and derive the ground
        // clearance from geometry so flight keeps the body (not the origin) above
        // the surface.
        this.groundClearance = boundingBottomOffset(root) + GROUND_SEPARATION;
        placeOnSurface(root, this.y ?? 0, GROUND_SEPARATION);
        // Set up follow camera now that we have a mesh (may have been deferred if
        // inputFocus called setupCameraForEntity before mesh was loaded)
        if (this.inputProvider) {
            this.setupFollowCamera();
        }
        this.lastUpdate = Date.now();
        owner.scene.registerBeforeRender(this._update);
    }
    chaseCamera = null;
    cockpitCamera = null;
    setupFollowCamera() {
        if (!this.owner)
            return;
        const target = this.getCameraTarget();
        if (!target)
            return;
        const existing = this.owner.scene.getCameraByName('aircraft-follow-cam');
        if (existing)
            return;
        // Chase: behind and above, looking at the aircraft. Both cameras are
        // parented to the aircraft so Babylon transforms them for free.
        const chase = new BABYLON.FreeCamera('aircraft-follow-cam', target.getAbsolutePosition().clone(), this.owner.scene);
        chase.parent = target;
        chase.position = new BABYLON.Vector3(0, 1.6, -4.8);
        chase.setTarget(BABYLON.Vector3.Zero());
        this.chaseCamera = chase;
        // Cockpit: near the nose, looking straight ahead (local +Z = forward).
        const cockpit = new BABYLON.FreeCamera('aircraft-cockpit-cam', target.getAbsolutePosition().clone(), this.owner.scene);
        cockpit.parent = target;
        cockpit.position = new BABYLON.Vector3(0, 0.9, 1.0);
        cockpit.rotation = new BABYLON.Vector3(0, 0, 0);
        cockpit.minZ = 0.05;
        this.cockpitCamera = cockpit;
        this.setCameraView(this.cameraView);
    }
    /** Switch the active camera between chase and cockpit. */
    setCameraView(view) {
        this.cameraView = view;
        const cam = view === 'cockpit' ? this.cockpitCamera : this.chaseCamera;
        if (cam != null && this.owner != null) {
            this.owner.setActiveCamera(cam, { attach: false });
        }
    }
    sceneDispose() {
        if (this.owner?.scene) {
            this.owner.scene.unregisterBeforeRender(this._update);
        }
        if (this.chaseCamera) {
            this.chaseCamera.parent = null;
        }
        this.chaseCamera = null;
        if (this.cockpitCamera) {
            this.cockpitCamera.parent = null;
        }
        this.cockpitCamera = null;
        for (const node of this.meshesToDispose) {
            node.dispose();
        }
        this.meshesToDispose = [];
        if (this.libraryNode) {
            this.libraryNode.dispose();
            this.libraryNode = null;
        }
        this.meshNode = null;
        this.inputProvider = null;
        super.sceneDispose();
    }
    disconnectedCallback() {
        this.sceneDispose();
        super.disconnectedCallback();
    }
}
export const b3dAircraft = B3dAircraft.elementCreator({
    tag: 'tosi-b3d-aircraft',
});
//# sourceMappingURL=b3d-aircraft.js.map