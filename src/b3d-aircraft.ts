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
import { b3d, b3dAircraft, b3dLibrary, b3dLight, b3dSkybox, b3dGround, gameController, inputFocus } from 'tosijs-3d'
import { elements } from 'tosijs'
const { div, span } = elements

const aircraft = b3dAircraft({
  library: 'vehicles', meshName: 'scout',
  player: true, y: 20,
  vtolSpeed: 15, stallSpeed: 0, maxSpeed: 50,
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

// Scatter reference markers on the ground
function addMarkers(scene) {
  scene.sceneCreated = (owner, BABYLON) => {
    const mat = new BABYLON.StandardMaterial('marker-mat', owner.scene)
    mat.diffuseColor = new BABYLON.Color3(0.2, 0.5, 0.8)
    for (let i = 0; i < 40; i++) {
      const x = (Math.random() - 0.5) * 400
      const z = (Math.random() - 0.5) * 400
      const box = BABYLON.MeshBuilder.CreateBox('marker' + i, { size: 2, height: 1 + Math.random() * 4 }, owner.scene)
      box.position.set(x, 0, z)
      box.material = mat
    }
  }
  return scene
}

const scene = addMarkers(b3d(
  b3dLight({ y: 1, intensity: 0.7 }),
  b3dSkybox({ timeOfDay: 10 }),
  b3dGround({ width: 500, height: 500 }),
  b3dLibrary({ url: './test-2.glb', type: 'vehicles' }),
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
| `vtolSpeed` | `0` | Speed threshold for VTOL mode (0 = no VTOL) |
| `stallSpeed` | `40` | Speed below which stall occurs (0 = no stall) |

## API (read-only properties for HUD binding)

- `airspeed: number` — current forward speed (m/s)
- `altitude: number` — height above ground
- `vtolActive: boolean` — true when in VTOL mode
- `stalling: boolean` — true when airspeed < stallSpeed (not in VTOL)
- `pullUp: boolean` — true when ground collision predicted within ~5s
*/

import * as BABYLON from '@babylonjs/core'
import type { B3d } from './tosi-b3d'
import { B3dControllable } from './b3d-controllable'
import type { ControlInput } from './control-input'
import { aircraftMapping } from './virtual-gamepad'

const DEG2RAD = Math.PI / 180
const GRAVITY = 9.81
const PULL_UP_SECONDS = 5

export class B3dAircraft extends B3dControllable {
  inputMapping = aircraftMapping()

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
  }

  // Read-only flight state
  airspeed = 0
  altitude = 0
  throttleLevel = 0
  vtolActive = false
  stalling = false
  pullUp = false

  private velocity = new BABYLON.Vector3(0, 0, 0)
  private rollAngle = 0
  private meshNode: BABYLON.TransformNode | null = null
  private meshesToDispose: BABYLON.Node[] = []
  private libraryNode: BABYLON.Node | null = null
  private loadGeneration = 0

  getCameraTarget(): BABYLON.Node | null {
    return this.meshNode ?? null
  }

  applyInput(input: ControlInput, dt: number) {
    if (!this.meshNode) return
    const attrs = this as any
    const node = this.meshNode
    const vel = this.velocity

    // --- Orientation: pitch, yaw, roll ---
    const pitchAmount = input.forward * attrs.pitchRate * DEG2RAD * dt
    const yawAmount = input.turn * attrs.turnRate * DEG2RAD * dt
    node.rotate(BABYLON.Axis.X, pitchAmount, BABYLON.Space.LOCAL)
    node.rotate(BABYLON.Axis.Y, yawAmount, BABYLON.Space.WORLD)

    // Manual roll from strafe
    const manualRoll = input.strafe * 60 * DEG2RAD * dt
    if (Math.abs(manualRoll) > 0.001) {
      node.rotate(BABYLON.Axis.Z, -manualRoll, BABYLON.Space.LOCAL)
    }
    // Yaw-coupled roll: rudder banks the aircraft (max 30° at full rudder)
    const yawCoupledTarget = -input.turn * 30 * DEG2RAD
    const prevRoll = this.rollAngle
    this.rollAngle += (yawCoupledTarget - this.rollAngle) * Math.min(1, 3 * dt)
    const yawRollDelta = this.rollAngle - prevRoll
    if (Math.abs(yawRollDelta) > 0.0001) {
      node.rotate(BABYLON.Axis.Z, yawRollDelta, BABYLON.Space.LOCAL)
    }

    // --- Get aircraft axes in world space ---
    const localUp = node.up // lift direction
    const localForward = node.forward // thrust direction

    const throttle = input.throttle
    const speed = vel.length()
    const isVtol = attrs.vtolSpeed > 0 && speed < attrs.vtolSpeed

    // === FORCES → velocity ===

    // 1. Gravity (always)
    vel.y -= GRAVITY * dt

    // 2. Thrust
    if (isVtol) {
      // VTOL: thrust along local UP (hover/climb)
      // At 0% throttle, thrust = gravity (hover). Above = climb. Below = sink.
      // We want hover at ~50% throttle, so thrust = throttle * 2 * gravity
      // but capped so 50% = hover, 100% = strong climb, 0% = fall
      const hoverThrust = GRAVITY // force needed to hover
      const thrustMag = throttle * 2 * hoverThrust // 50% → hovers, 100% → 2g up
      vel.addInPlaceFromFloats(
        localUp.x * thrustMag * dt,
        localUp.y * thrustMag * dt,
        localUp.z * thrustMag * dt
      )
      // Beyond top detent: add forward thrust for flight transition
      const topDetent = 0.7
      if (throttle > topDetent) {
        const fwdMag =
          ((throttle - topDetent) / (1 - topDetent)) * attrs.acceleration
        vel.addInPlaceFromFloats(
          localForward.x * fwdMag * dt,
          localForward.y * fwdMag * dt,
          localForward.z * fwdMag * dt
        )
      }
    } else {
      // Level flight: thrust along local FORWARD
      const thrustMag = throttle * attrs.acceleration
      vel.addInPlaceFromFloats(
        localForward.x * thrustMag * dt,
        localForward.y * thrustMag * dt,
        localForward.z * thrustMag * dt
      )

      // 3. Lift along local UP, proportional to airspeed
      // Tuned so at cruise speed (~50% max), lift = gravity
      const cruiseSpeed = attrs.maxSpeed * 0.5
      const liftCoeff = GRAVITY / Math.max(cruiseSpeed, 1)
      const liftMag = Math.min(speed, attrs.maxSpeed) * liftCoeff
      vel.addInPlaceFromFloats(
        localUp.x * liftMag * dt,
        localUp.y * liftMag * dt,
        localUp.z * liftMag * dt
      )
    }

    // 4. Drag (opposing velocity, proportional to speed)
    if (speed > 0.01) {
      // Drag coefficient tuned so terminal velocity ~ maxSpeed at full throttle
      const dragCoeff = attrs.acceleration / attrs.maxSpeed
      const dragMag = speed * dragCoeff
      const dragScale = -(dragMag * dt) / speed
      vel.addInPlaceFromFloats(
        vel.x * dragScale,
        vel.y * dragScale,
        vel.z * dragScale
      )
    }

    // 5. Aerodynamic alignment: sideways drag is much higher than forward drag.
    // Decompose velocity into forward and sideways components, decay sideways.
    if (speed > 0.1) {
      const fwdDot = BABYLON.Vector3.Dot(vel, localForward)
      const upDot = BABYLON.Vector3.Dot(vel, localUp)
      // Reconstruct velocity as forward + up components (kill sideways)
      const alignRate = 5 * dt // how fast sideways velocity decays
      const alignFactor = Math.min(1, alignRate)
      // Current sideways = vel - forward*fwdDot - up*upDot
      // Blend toward aligned: vel = lerp(vel, forward*fwdDot + up*upDot, alignFactor)
      const alignedX = localForward.x * fwdDot + localUp.x * upDot
      const alignedY = localForward.y * fwdDot + localUp.y * upDot
      const alignedZ = localForward.z * fwdDot + localUp.z * upDot
      vel.x += (alignedX - vel.x) * alignFactor
      vel.y += (alignedY - vel.y) * alignFactor
      vel.z += (alignedZ - vel.z) * alignFactor
    }

    // 6. Stall: nose drops when too slow (non-VTOL only)
    if (!isVtol && attrs.stallSpeed > 0 && speed < attrs.stallSpeed) {
      node.rotate(BABYLON.Axis.X, 0.5 * dt, BABYLON.Space.LOCAL)
    }

    // === Apply velocity to position ===
    node.position.addInPlaceFromFloats(vel.x * dt, vel.y * dt, vel.z * dt)

    // Ground collision (update altitude AFTER moving, then correct)
    this.updateAltitude(node)
    const groundClearance = 0.5
    if (this.altitude < groundClearance) {
      node.position.y += groundClearance - this.altitude
      if (vel.y < 0) vel.y = 0
    }

    // --- Update read-only state ---
    this.airspeed = speed
    this.throttleLevel = throttle
    this.vtolActive = isVtol
    this.updatePullUp(node, dt)
    this.stalling = !isVtol && attrs.stallSpeed > 0 && speed < attrs.stallSpeed
  }

  private updateAltitude(node: BABYLON.TransformNode) {
    if (!this.owner) return
    const ray = new BABYLON.Ray(
      node.position.clone(),
      BABYLON.Vector3.Down(),
      500
    )
    const hit = this.owner.scene.pickWithRay(
      ray,
      (m) => m !== (node as any) && !m.name.includes('__root__')
    )
    this.altitude = hit?.hit ? hit.distance : node.position.y
  }

  private updatePullUp(node: BABYLON.TransformNode, _dt: number) {
    const speed = this.velocity.length()
    if (!this.owner || speed < 1) {
      this.pullUp = false
      return
    }
    // Project position forward by PULL_UP_SECONDS
    const futurePos = node.position.add(this.velocity.scale(PULL_UP_SECONDS))
    const ray = new BABYLON.Ray(futurePos, BABYLON.Vector3.Down(), 500)
    const hit = this.owner.scene.pickWithRay(
      ray,
      (m) => m !== (node as any) && !m.name.includes('__root__')
    )
    const futureAlt = hit?.hit ? futurePos.y - hit.pickedPoint!.y : futurePos.y
    // Warn if we'll be below 10m in PULL_UP_SECONDS
    this.pullUp = futureAlt < 10 && node.forward.y < -0.05
  }

  connectedCallback() {
    super.connectedCallback()
  }

  sceneReady(owner: B3d, scene: BABYLON.Scene) {
    super.sceneReady(owner, scene)
    const attrs = this as any
    const gen = ++this.loadGeneration

    if (attrs.url !== '') {
      this.loadFromUrl(attrs.url, owner, scene, gen)
    } else if (attrs.library !== '' && attrs.meshName !== '') {
      this.loadFromLibrary(attrs.library, attrs.meshName, owner, gen)
    }
  }

  private loadFromUrl(
    url: string,
    owner: B3d,
    scene: BABYLON.Scene,
    gen: number
  ) {
    BABYLON.SceneLoader.LoadAssetContainer(
      url,
      undefined,
      scene,
      (container) => {
        if (gen !== this.loadGeneration) return
        const entries = container.instantiateModelsToScene(undefined, false, {
          doNotInstantiate: true,
        })
        if (entries.rootNodes.length !== 1) {
          throw new Error(
            '<tosi-b3d-aircraft> expects a container with exactly one root node'
          )
        }
        const root = entries.rootNodes[0] as BABYLON.Mesh
        this.setupMesh(root, owner)
        this.meshesToDispose = entries.rootNodes
      }
    )
  }

  private loadFromLibrary(
    libraryType: string,
    meshName: string,
    owner: B3d,
    gen: number
  ) {
    const tryLoad = () => {
      if (gen !== this.loadGeneration) return true // stale — stop trying
      const lib = owner.getLibrary(libraryType)
      if (!lib) return false
      lib.ready.then(() => {
        if (gen !== this.loadGeneration) return // stale — discard
        const node = lib.instantiate(meshName, {
          x: (this as any).x ?? 0,
          y: (this as any).y ?? 0,
          z: (this as any).z ?? 0,
        })
        if (!node) {
          console.error(
            `b3d-aircraft: could not instantiate "${meshName}" from library "${libraryType}"`
          )
          return
        }
        this.libraryNode = node
        if (node instanceof BABYLON.TransformNode) {
          this.setupMesh(node, owner)
        }
      })
      return true
    }

    if (!tryLoad()) {
      const handler = () => {
        if (tryLoad()) {
          owner.removeEventListener('library-changed', handler)
        }
      }
      owner.addEventListener('library-changed', handler)
    }
  }

  private setupMesh(root: BABYLON.TransformNode, owner: B3d) {
    this.meshNode = root
    if (root instanceof BABYLON.Mesh) {
      this.mesh = root
      root.ellipsoid = new BABYLON.Vector3(1, 0.5, 2)
      root.ellipsoidOffset = new BABYLON.Vector3(0, 0.5, 0)
    }

    const meshes =
      root instanceof BABYLON.AbstractMesh
        ? [root, ...root.getChildMeshes()]
        : root.getChildMeshes()

    owner.register({ meshes })

    // Set up follow camera now that we have a mesh (may have been deferred if
    // inputFocus called setupCameraForEntity before mesh was loaded)
    if (this.inputProvider) {
      this.setupFollowCamera()
    }

    this.lastUpdate = Date.now()
    owner.scene.registerBeforeRender(this._update)
  }

  private chaseCamera: BABYLON.FreeCamera | null = null

  setupFollowCamera() {
    if (!this.owner) return
    const target = this.getCameraTarget()
    if (!target) return
    const existing = this.owner.scene.getCameraByName('aircraft-follow-cam')
    if (existing) return

    const cam = new BABYLON.FreeCamera(
      'aircraft-follow-cam',
      target.getAbsolutePosition().clone(),
      this.owner.scene
    )
    // Parent camera to aircraft — Babylon handles the transform in the scene
    // graph, no manual updates, no timing issues.
    cam.parent = target
    cam.position = new BABYLON.Vector3(0, 1.6, -4.8)
    cam.setTarget(BABYLON.Vector3.Zero())
    this.chaseCamera = cam
    this.owner.setActiveCamera(cam, { attach: false })
  }

  sceneDispose() {
    if (this.owner?.scene) {
      this.owner.scene.unregisterBeforeRender(this._update)
    }
    if (this.chaseCamera) {
      this.chaseCamera.parent = null
    }
    this.chaseCamera = null
    for (const node of this.meshesToDispose) {
      node.dispose()
    }
    this.meshesToDispose = []
    if (this.libraryNode) {
      this.libraryNode.dispose()
      this.libraryNode = null
    }
    this.meshNode = null
    this.inputProvider = null
    super.sceneDispose()
  }

  disconnectedCallback() {
    this.sceneDispose()
    super.disconnectedCallback()
  }
}

export const b3dAircraft = B3dAircraft.elementCreator({
  tag: 'tosi-b3d-aircraft',
})
