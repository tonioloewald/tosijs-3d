/*#
# b3d-aircraft

Fly-by-wire VTOL controller — a forgiving "drone that becomes a plane" rather
than a simulation. The stick commands an ATTITUDE (bank + pitch); the craft eases
toward it and self-levels when you let go, banking swings the heading (a
coordinated turn), and the velocity simply chases where the nose points. The
model is pure and unit-tested in [fly-by-wire](?fly-by-wire.ts).

Two regimes split by forward ground speed (`vtolSpeed`):
- **Hover / drone** (slow): right trigger climbs, left trigger descends. Let go
  while slow and it bleeds back to a stationary hover; lean forward (pitch) to
  build speed and transition.
- **Plane** (fast): right trigger speeds up, left trigger slows down; speed holds
  steady when you let go. Holding throttle past `maxSpeed` enters **afterburner**
  (up to `afterburnerSpeed`); release and it bleeds back to `maxSpeed`. Pitch is
  climb/dive, the turn stick banks to turn. Slow back below `vtolSpeed` and the
  triggers return to up/down. Banking off level costs a little altitude.

Set `vtolSpeed` to 0 for a pure aeroplane with no hover regime.

Inputs: left stick = pitch + turn (bank), right stick X = aux roll, triggers =
lift/throttle (the dual-purpose axis above), right stick Y = camera zoom.

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
  // Below this forward speed it hovers (triggers = up/down); above it flies like
  // a plane (triggers = throttle). Set to 0 for a pure aeroplane.
  vtolSpeed: 12, maxSpeed: 50,
})

const hud = div({ class: 'hud' },
  span({ class: 'hud-speed' }),
  span({ class: 'hud-alt' }),
  span({ class: 'hud-throttle' }),
  span({ class: 'hud-mode' }),
  span({ class: 'hud-warn' }),
)

const controls = div({ class: 'controls' },
  'W/S: pitch | A/D: turn (bank) | \u2190/\u2192: roll | R: up / faster | Q: down / slower'
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
| `maxSpeed` | `50` | Normal top speed (m/s) — the cruise cap a released throttle settles at |
| `afterburnerSpeed` | `75` | Speed ceiling while the throttle is held past `maxSpeed`; releasing bleeds back to `maxSpeed`. ≤ `maxSpeed` disables afterburner. |
| `acceleration` | `12` | Throttle / lean authority (speed change rate) |
| `vtolSpeed` | `12` | Forward ground speed splitting hover (below) from plane (above). 0 = pure aeroplane, no hover regime. |
| `groundY` | `0` | Assumed ground-plane height (a floor in addition to any terrain colliders) |
| `crashSpeed` | `8` | Vertical impact speed (m/s) above which a ground contact is a crash |

## API (read-only properties for HUD binding)

- `airspeed: number` — current forward speed (m/s)
- `altitude: number` — height above ground
- `vtolActive: boolean` — true in the hover regime (below `vtolSpeed`)
- `pullUp: boolean` — true when ground collision predicted within ~5s
- `grounded: boolean` — true when settled on the ground (wheels/rolling resistance)
- `crashed: boolean` — true after a hard/inverted ground impact; fires a `crash` event

On the ground the wings hold level and the turn stick taxi-steers; pulling back
rotates for takeoff (or a VTOL lifts straight up on the right trigger). A contact
faster than `crashSpeed`, or banked/inverted, crashes instead of lands.
*/
/*{ "parent": "Vehicles" }*/
import * as BABYLON from '@babylonjs/core';
import { B3dControllable } from './b3d-controllable';
import { aircraftMapping } from './virtual-gamepad';
import { flyByWireStep, targetVelocity, chaseVelocity, } from './fly-by-wire';
import { placeOnSurface, boundingBottomOffset } from './b3d-utils';
// Small gap kept between the model's belly and the ground.
const GROUND_SEPARATION = 0.05;
const DEG2RAD = Math.PI / 180;
const PULL_UP_SECONDS = 5;
const LOCAL_Z = new BABYLON.Vector3(0, 0, 1);
// Fly-by-wire tuning (the model itself lives in fly-by-wire.ts). Attitude eases
// toward the stick at ATTITUDE_RATE and self-levels at the same rate; the turn
// stick banks up to MAX_BANK and the bank swings the heading at up to
// BANK_TURN_RATE (× sin bank); pitch commands up to MAX_PITCH of climb/dive.
const ATTITUDE_RATE = 3;
const MAX_BANK = 55 * DEG2RAD;
const MAX_PITCH = 35 * DEG2RAD;
const BANK_TURN_RATE = 70 * DEG2RAD;
// How fast the velocity chases where the nose points (the forgiveness knob), and
// how fast drone-mode forward speed bleeds back to a stationary hover.
const VEL_CHASE = 2.5;
const HOVER_DAMP = 1.5;
// Afterburner: per-second rate the speed bleeds from the afterburner range back
// down to the normal max once the throttle is released.
const AFTERBURNER_TAPER = 0.6;
// Pull-back for the parented FLAT chase, since the canonical hull is unit-scale
// (the offset used to inherit the model's ~2.4x scale). Flat camera only.
const FLAT_CHASE_SCALE = 1.8;
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
        // Hard speed ceiling while the throttle is held past maxSpeed (afterburner).
        // Release and it bleeds back to maxSpeed. ≤ maxSpeed disables afterburner.
        afterburnerSpeed: 75,
        acceleration: 12,
        // Forward ground speed below which the craft hovers like a drone (triggers =
        // up/down) and above which it flies like a plane (triggers = throttle). Set
        // to 0 for a pure aeroplane with no hover regime.
        vtolSpeed: 12,
        // Assumed ground-plane height (used as a floor in addition to any terrain
        // colliders the downward raycast hits).
        groundY: 0,
        // Vertical impact speed (m/s) above which a ground contact is a crash, not
        // a landing.
        crashSpeed: 8,
    };
    // Read-only flight state
    airspeed = 0;
    altitude = 0;
    throttleLevel = 0;
    vtolActive = false;
    stalling = false;
    pullUp = false;
    grounded = false;
    crashed = false;
    /** Active camera mode — toggled by the `view` button. Also read by the XR
     * chase rig to sit in the cockpit vs. behind the aircraft. */
    cameraView = 'chase';
    viewWasPressed = false;
    /** Camera offsets (read by the XR rig too). The cockpit rides inside the
     * airframe banking with it; the chase springs to a yaw-frame offset behind +
     * above, so it stays level and looks down at the plane (not dead-on its tail)
     * rather than being swung below when the aircraft pitches/rolls. */
    eyeHeight = 0.9; // cockpit height above the origin
    cockpitForward = 0.5; // cockpit offset toward the nose (local +Z)
    chaseMinHeight = 2.0; // chase height zoomed all the way in
    chaseHeight = 3.2; // chase height zoomed out (overview)
    chaseDistance = 4.8; // chase distance behind
    velocity = new BABYLON.Vector3(0, 0, 0);
    _fwd = new BABYLON.Vector3(); // scratch: world nose direction (unit)
    // Fly-by-wire flight state (heading/pitch/bank/speed). Seeded from the spawned
    // orientation on the first frame, then this controller owns the quaternion.
    fbw = { heading: 0, pitch: 0, bank: 0, speed: 0 };
    fbwSeeded = false;
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
        // Crashed: a wreck — no control or motion (the camera toggle above still
        // works). Stays put until something resets it.
        if (this.crashed) {
            vel.setAll(0);
            return;
        }
        // --- Fly-by-wire VTOL: stick commands attitude, velocity chases the nose ---
        // The model is pure (fly-by-wire.ts); this bridges it to Babylon. We OWN the
        // node's quaternion from here on, so seed the heading from the spawned
        // orientation once.
        if (!this.fbwSeeded) {
            node.computeWorldMatrix(true);
            node.getDirectionToRef(LOCAL_Z, this._fwd);
            this.fbw.heading = Math.atan2(this._fwd.x, this._fwd.z);
            this.fbw.pitch = 0;
            this.fbw.bank = 0;
            this.fbw.speed = Math.hypot(vel.x, vel.z);
            this.fbwSeeded = true;
        }
        const cmd = {
            pitch: input.pitch,
            // Left stick X is the primary turn (banks → turns); right stick X adds roll.
            roll: Math.max(-1, Math.min(1, input.turn + input.strafe)),
            lift: input.lift, // trigger axis: + up/faster, − down/slower
        };
        const cfg = {
            maxSpeed: attrs.maxSpeed,
            afterburnerSpeed: attrs.afterburnerSpeed,
            afterburnerTaper: AFTERBURNER_TAPER,
            vtolSpeed: attrs.vtolSpeed,
            maxBank: MAX_BANK,
            maxPitch: MAX_PITCH,
            attitudeRate: ATTITUDE_RATE,
            bankTurnRate: BANK_TURN_RATE,
            accel: attrs.acceleration,
            leanAccel: attrs.acceleration,
            hoverDamp: HOVER_DAMP,
            climbRate: attrs.maxSpeed * 0.3,
            offLevelSink: attrs.maxSpeed * 0.12,
            diveBoost: attrs.maxSpeed * 0.4,
            velChase: VEL_CHASE,
        };
        // Forward GROUND speed picks the drone↔plane regime.
        const fwdSpeed = Math.hypot(vel.x, vel.z);
        flyByWireStep(this.fbw, cmd, fwdSpeed, cfg, dt, this.grounded);
        // Realise the attitude as a quaternion. Babylon's +pitch(X) drops the nose
        // and +roll(Z) banks left, so negate both (our state: +pitch = nose up,
        // +bank = right). Verified through the rig test.
        node.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(this.fbw.heading, -this.fbw.pitch, -this.fbw.bank);
        node.computeWorldMatrix(true);
        node.getDirectionToRef(LOCAL_Z, this._fwd);
        this._fwd.normalize();
        // Velocity eases toward where the nose points (the "go where you're pointing"
        // chase) — this is what makes it forgiving instead of a skiddy simulation.
        const tv = targetVelocity(this.fbw, cmd, { x: this._fwd.x, y: this._fwd.y, z: this._fwd.z }, fwdSpeed, cfg);
        chaseVelocity(vel, tv, cfg.velChase, dt);
        // Read-only flight state for the HUD / XR rig.
        this.airspeed = this.fbw.speed;
        this.altitude = node.position.y;
        this.throttleLevel =
            attrs.maxSpeed > 0 ? this.fbw.speed / attrs.maxSpeed : 0;
        this.vtolActive = attrs.vtolSpeed > 0 && fwdSpeed < attrs.vtolSpeed;
        this.stalling = false;
        // === Apply velocity to position ===
        node.position.addInPlaceFromFloats(vel.x * dt, vel.y * dt, vel.z * dt);
        // Ground contact. Clamp out of the terrain; once settled, behave like
        // wheels — kill the downward bounce and apply rolling resistance so you can
        // land, roll to a stop, and accelerate to take off again. (First cut — tune
        // GROUND_FRICTION / GROUND_TOUCH; the model's own ground tweaks are separate.)
        const groundDist = this.groundDistance(node);
        const wasGrounded = this.grounded;
        if (groundDist < this.groundClearance) {
            // First contact this approach: a fast or inverted/banked impact is a
            // crash; a gentle, roughly-level touchdown is a landing.
            if (!wasGrounded && (vel.y < -attrs.crashSpeed || node.up.y < 0.5)) {
                this.crash();
            }
            node.position.y += this.groundClearance - groundDist;
        }
        this.grounded = groundDist <= this.groundClearance + GROUND_TOUCH;
        if (this.grounded && !this.crashed) {
            if (vel.y < 0)
                vel.y = 0; // don't sink or bounce off the surface
            const roll = Math.exp(-GROUND_FRICTION * dt);
            vel.x *= roll;
            vel.z *= roll;
        }
        // Read-only flight state (airspeed/altitude/throttle/vtol) is set in the
        // fly-by-wire block above. Just refresh the ground-proximity pull-up warning.
        this.altitude = node.position.y;
        this.updatePullUp(node, dt);
    }
    /** Distance from the aircraft origin down to the nearest ground: the lower of
     * any terrain collider the raycast hits and the configured ground plane. */
    groundDistance(node) {
        const terrain = this.raycastGround(node);
        const plane = node.position.y - (this.groundY ?? 0);
        return Math.min(terrain, plane);
    }
    /** Transition to the crashed/wrecked state: stop, lock out control, notify. */
    crash() {
        if (this.crashed)
            return;
        this.crashed = true;
        this.velocity.setAll(0);
        this.dispatchEvent(new CustomEvent('crash', { bubbles: true }));
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
        const groundDist = this.groundDistance(node);
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
                    canonical: true, // unit-scale control node (collapse the model frame)
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
        // Chase: behind and above, parented to the airframe (the known-good "starts
        // ok" framing). It inherits the plane's pitch/roll, so it swings somewhat on
        // hard manoeuvres — that belongs to the flight-model pass. An unparented
        // yaw-only follow mis-framed the view on load, so it's reverted.
        const chase = new BABYLON.FreeCamera('aircraft-follow-cam', target.getAbsolutePosition().clone(), this.owner.scene);
        chase.parent = target;
        // The hull is now unit-scale (canonical), so the parented offset no longer
        // gets the model's ~2.4x magnification — pull it back to keep the same flat
        // framing (the VR chase is computed in world space and is unaffected).
        chase.position = new BABYLON.Vector3(0, this.chaseMinHeight * FLAT_CHASE_SCALE, -this.chaseDistance * FLAT_CHASE_SCALE);
        chase.setTarget(BABYLON.Vector3.Zero());
        // Far clip well past any streamed terrain so distance/fog is never cut off
        // (the default 10000 is usually fine, but set it explicitly for aerial views).
        chase.minZ = 0.5;
        chase.maxZ = 20000;
        this.chaseCamera = chase;
        // Cockpit: near the nose, looking straight ahead (local +Z = forward).
        // Parented so it banks/pitches with the airframe.
        const cockpit = new BABYLON.FreeCamera('aircraft-cockpit-cam', target.getAbsolutePosition().clone(), this.owner.scene);
        cockpit.parent = target;
        cockpit.position = new BABYLON.Vector3(0, this.eyeHeight, this.cockpitForward);
        cockpit.rotation = new BABYLON.Vector3(0, 0, 0);
        cockpit.minZ = 0.05;
        this.cockpitCamera = cockpit;
        this.setCameraView(this.cameraView);
    }
    /** Switch the camera between chase and cockpit. In VR the XR rig reads
     * cameraView and owns the viewpoint, so we must NOT swap the active scene
     * camera (that would steal it from the WebXR camera and break the headset). */
    setCameraView(view) {
        this.cameraView = view;
        if (this.owner?.xrActive)
            return;
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