/*#
# b3d-biped

Animated humanoid character controller. Loads a GLB model with skeletal animations
and drives it via `ControlInput`.

## Demo

```js
import { b3d, b3dBiped, b3dLight, b3dSkybox, b3dGround, label3d, select3d, slider3d } from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'
import { elements, tosi } from 'tosijs'

const animations = [
  'idle', 'walk', 'run', 'sneak', 'climb', 'walkBackwards',
  'jump', 'running-jump', 'salute', 'wave',
  'tread-water', 'swim', 'talk', 'look', 'dance', 'pickup', 'pilot',
]

const { bipedDemo } = tosi({
  bipedDemo: {
    animation: 'run',
    speed: 0.25,
  }
})

const biped = b3dBiped({
  url: '/omnidude.glb',
  animation: bipedDemo.animation,
  animationSpeed: bipedDemo.speed,
})

preview.append(
  b3d(
    {
      scenePanel: () => [
        label3d({ text: 'Biped' }),
        select3d({ label: 'animation', value: bipedDemo.animation, options: animations }),
        slider3d({ label: 'speed', value: bipedDemo.speed, min: 0, max: 2, step: 0.1 }),
      ],
      sceneCreated(el, BABYLON) {
        const camera = orbitCam(el, {
          alpha: -Math.PI / 2, beta: Math.PI / 3.5, radius: 2, target: [0, 0.5, 0],
        })
        camera.lowerRadiusLimit = 1.5
        camera.upperRadiusLimit = 10
      },
    },
    b3dLight({ y: 1, intensity: 0.7 }),
    b3dSkybox({ timeOfDay: 10 }),
    b3dGround({ width: 10, height: 10 }),
    biped,
  ),
)
```
```css
tosi-b3d { width: 100%; height: 100%; }
```

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `url` | `''` | GLB model URL |
| `skin` | `''` | Optional albedo texture URL applied to the `skin` material (reskin) |
| `scale` | `1` | Uniform scale applied to the loaded model |
| `animation` | `''` | Current animation state name |
| `animationSpeed` | `1` | Playback speed multiplier (0–2) |
| `player` | `false` | Whether this biped receives input |
| `cameraType` | `'none'` | `'follow'`, `'xr'`, or `'none'` |
| `turnSpeed` | `180` | Degrees per second |
| `forwardSpeed` | `2` | Walk speed |
| `runSpeed` | `5` | Sprint speed |
| `backwardSpeed` | `1` | Backward speed |
| `cameraHeightOffset` | `1` | Camera height above target |
| `cameraTargetHeight` | `0.75` | Height of the point the camera looks at |
| `cameraMinFollowDistance` | `2` | Closest follow distance |
| `cameraMaxFollowDistance` | `5` | Furthest follow distance |

## Animations

The biped automatically transitions between animation states based on input:
`idle`, `walk`, `run`, `walkBackwards`, `sneak`, `jump`, `swim`, `dance`, `pilot`, etc.

Animation names in the GLB must match these names.

## Usage

```javascript
import { b3d, b3dBiped, gameController, inputFocus } from 'tosijs-3d'

document.body.append(
  b3d({},
    inputFocus(
      gameController(),
      b3dBiped({
        url: '/character.glb',
        player: true,
        cameraType: 'follow',
        initialState: 'idle',
      })
    )
  )
)
```
*/
/*{ "parent": "Vehicles" }*/

import * as BABYLON from '@babylonjs/core'
import { XRStuff, collidable } from './b3d-utils'
import type { B3d } from './tosi-b3d'
import { xrControllers } from './gamepad'
import type { GameController } from './game-controller'
import { B3dControllable } from './b3d-controllable'
import type { ControlInput } from './control-input'
import { CompositeInputProvider } from './control-input'
import { XRInputProvider } from './xr-input-provider'

const DEG_TO_RAD = Math.PI / 180

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export type AnimStateSpec = {
  animation: string
  name?: string
  loop?: boolean
  additive?: boolean
  backwards?: boolean
}

export class AnimState {
  animation: string
  name: string
  loop: boolean
  additive: boolean
  backwards: boolean

  constructor(spec: AnimStateSpec) {
    this.animation = spec.animation
    this.name = spec.name || spec.animation
    this.loop = spec.loop ?? false
    this.additive = spec.additive ?? false
    this.backwards = spec.backwards ?? false
  }

  static buildList(...specs: AnimStateSpec[]): AnimState[] {
    return specs.map((spec) => new AnimState(spec))
  }
}

/**
 * How far above the feet the collision body starts — everything below this is
 * walked over rather than collided with. Unity calls it Step Offset.
 */
const STEP_OFFSET = 0.35
/** How high a lip the biped walks straight over instead of being stopped by. */
const STEP_UP = 0.5
/** How far the ground may drop before it becomes a FALL rather than a step. */
const STEP_DOWN = 0.6

export class B3dBiped extends B3dControllable {
  static initAttributes = {
    ...B3dControllable.initAttributes,
    url: '',
    // Optional skin texture URL applied to the model's `skin` material. Kenney
    // characters ship textureless with one `skin` material + separate skin PNGs,
    // so reskinning is just swapping this albedo texture.
    skin: '',
    // Uniform scale applied to the loaded model. Handy when an asset imports at the
    // wrong size (Kenney FBX characters come in ~2x too big; 0.48 ≈ 1.8m) — though
    // baking scale into the conversion is preferred so every consumer gets it right.
    scale: 1,
    player: false,
    cameraType: 'none',
    animation: '',
    animationSpeed: 1,
    initialState: 'idle',
    turnSpeed: 180,
    forwardSpeed: 2,
    runSpeed: 5,
    backwardSpeed: 1,
    cameraHeightOffset: 1,
    cameraTargetHeight: 0.75,
    cameraMinFollowDistance: 2,
    cameraMaxFollowDistance: 5,
    // Void-catch backstop: a biped never falls below this Y. It's a last resort for
    // scenes with NO collidable ground at all (a GLB floor not named `_collide`), so
    // set it DEEP — not at walking level. At 0 it would act as an invisible floor,
    // pinning the biped above any sub-zero terrain and sealing water/pits. Real
    // collidable ground (terrain, seabed) grounds the biped normally above this.
    // Scenes that genuinely want a shallow floor can raise it.
    groundY: -1000,
    // Eye height for the first-person camera (the view button toggles between
    // third-person over-the-shoulder and this).
    eyeHeight: 1.6,
  }

  entries?: BABYLON.InstantiatedEntries
  camera?: BABYLON.Camera
  /** Camera mode, toggled by the view button: third-person over-the-shoulder
   * ('chase') or first-person ('fpv', at the head with the body hidden — keep
   * first-person parts via a `_fpv` mesh name). Read by the XR rig too. */
  cameraView: 'chase' | 'fpv' = 'chase'
  private fpvCamera: BABYLON.FreeCamera | null = null
  private headNode: BABYLON.TransformNode | null = null
  private viewWasPressed = false
  private hiddenBody: BABYLON.AbstractMesh[] = []

  /** XR/chase camera params, computed from the model bounds in render(). The
   * chase rig interpolates height (eyeHeight→chaseHeight) and distance with the
   * zoom intent, so zooming in drops to head height and out pulls back/up. */
  chaseHeight = 2.5
  chaseDistance = 3.5
  private _eyePos = new BABYLON.Vector3()
  /** Eye position for first-person: the head bone (or eyeHeight fallback) nudged
   * up + forward to roughly the eyes, so the camera sits at the eyes rather than
   * the neck / head-bone base — which would leave the head & neck in front of the
   * view. Forward is body-facing (root-aligned), since the camera ignores the
   * head's own animation. Returns a cached vector — read it now, don't retain. */
  getHeadPosition(): BABYLON.Vector3 | null {
    if (this.mesh == null) return null
    const f = this.mesh.forward
    const EYE_FWD = 0.12
    const EYE_UP = 0.06
    if (this.headNode != null) {
      const hp = this.headNode.getAbsolutePosition()
      this._eyePos.set(
        hp.x + f.x * EYE_FWD,
        hp.y + EYE_UP,
        hp.z + f.z * EYE_FWD
      )
    } else {
      const o = this.mesh.getAbsolutePosition()
      this._eyePos.set(
        o.x + f.x * EYE_FWD,
        o.y + (this as any).eyeHeight,
        o.z + f.z * EYE_FWD
      )
    }
    return this._eyePos
  }
  xrStuff?: XRStuff
  private xrInputProvider?: XRInputProvider
  animationState?: AnimState
  animationGroup?: BABYLON.AnimationGroup
  gameController?: GameController
  // XR camera: zoom goes from (1 back, 1 up) to (5 back, 2 up), default (2 back, 1.25 up)
  /**
   * Downward speed while airborne, m/s. One value per element rather than per
   * root node: a character GLB has a single root, and sharing it across two
   * would only matter for a rig that does not exist.
   */
  private _fallVel = 0
  private xrCamZoom = 0.25 // 0 = closest, 1 = furthest

  animationStates = AnimState.buildList(
    { animation: 'idle', loop: true },
    { animation: 'walk', loop: true },
    { animation: 'sneak', loop: true },
    { animation: 'run', loop: true },
    { animation: 'climb', loop: true },
    { name: 'walkBackwards', animation: 'walk', backwards: true, loop: true },
    { animation: 'jump', loop: false },
    { animation: 'running-jump', loop: false },
    { animation: 'salute', loop: false },
    { animation: 'wave', loop: false, additive: true },
    { animation: 'tread-water', loop: true },
    { animation: 'swim', loop: true },
    { animation: 'talk', loop: true },
    { animation: 'look', loop: true },
    { animation: 'dance', loop: true },
    { animation: 'pickup', loop: false },
    { animation: 'pilot', loop: true }
  )

  setAnimationState(name: string, speed = 1) {
    if (name == null) {
      throw new Error('setAnimationState failed, no animation name specified.')
    }
    if (
      this.animationState?.name === name ||
      this.animationState?.animation === name
    ) {
      this.animationGroup!.speedRatio = speed
      return
    }
    if (this.entries == null) return

    const newState = this.animationStates.find(
      (state) => state.name === name || state.animation === name
    )
    if (newState == null) {
      console.error(`setAnimationState: no state named "${name}"`)
      return
    }
    const idx = this.entries.animationGroups.findIndex((g) =>
      g.name.endsWith(newState.animation)
    )
    if (idx === -1) {
      console.error(
        `setAnimationState: could not find animation "${newState.animation}"`
      )
      return
    }
    this.animationState = newState
    const loop = newState.loop
    const additive = newState.additive
    if (loop) {
      for (const ag of this.entries.animationGroups) {
        ag.stop()
      }
    }
    const animationGroup = this.entries.animationGroups[idx]
    if (newState.backwards) {
      animationGroup.start(
        loop,
        speed,
        animationGroup.to,
        animationGroup.from,
        additive
      )
    } else {
      animationGroup.start(
        loop,
        speed,
        animationGroup.from,
        animationGroup.to,
        additive
      )
    }
    this.animationGroup = animationGroup
  }

  getCameraTarget(): BABYLON.Node | null {
    return this.entries?.rootNodes[0] ?? null
  }

  applyInput(input: ControlInput, dt: number) {
    if (this.entries == null) return
    const attrs = this as any

    // Camera toggle on the view button (edge-detected).
    const viewPressed = input.view > 0.5
    if (viewPressed && !this.viewWasPressed) {
      this.setCameraView(this.cameraView === 'chase' ? 'fpv' : 'chase')
    }
    this.viewWasPressed = viewPressed

    // First-person camera tracks the head node — so it doesn't fall behind the
    // head when walking, or float above it when crouching. Orientation stays
    // root-aligned (yaw only) to avoid the head's animation bob/rotation. Flat
    // only; in VR the rig anchors to getHeadPosition().
    if (
      this.cameraView === 'fpv' &&
      this.fpvCamera != null &&
      this.mesh != null &&
      !this.owner?.xrActive
    ) {
      const eye = this.getHeadPosition()
      this.fpvCamera.parent = null
      if (eye != null) this.fpvCamera.position.copyFrom(eye)
      const f = this.mesh.forward
      this.fpvCamera.rotation.set(0, Math.atan2(f.x, f.z), 0)
    }

    const speed = input.forward
    const rotation = input.turn
    const sprint = input.sprint
    const sprintSpeed = speed * sprint
    const totalSpeed =
      speed * attrs.forwardSpeed +
      sprintSpeed * (attrs.runSpeed - attrs.forwardSpeed)

    // Camera zoom from input
    if (this.camera instanceof BABYLON.FollowCamera) {
      this.camera.radius = lerp(
        attrs.cameraMinFollowDistance,
        attrs.cameraMaxFollowDistance,
        Math.max(0, Math.min(1, input.cameraZoom))
      )
    }

    // XR camera zoom from right stick
    if (input.cameraZoom !== 0 && this.xrStuff) {
      this.xrCamZoom += input.cameraZoom * 0.5 * dt
      this.xrCamZoom = Math.max(0, Math.min(1, this.xrCamZoom))
    }

    for (const node of this.entries.rootNodes as BABYLON.Mesh[]) {
      if (speed > 0) {
        node.moveWithCollisions(node.forward.scaleInPlace(totalSpeed * dt))
      } else if (speed < 0) {
        node.moveWithCollisions(
          node.forward.scaleInPlace(speed * dt * attrs.backwardSpeed)
        )
      }
      node.rotate(
        BABYLON.Vector3.Up(),
        rotation * dt * attrs.turnSpeed * DEG_TO_RAD
      )

      /*
      STAND ON THE GROUND — a SNAP, not a dead band.

      This used to probe 0.15 m down from just above the feet and, if it found
      anything, do nothing at all. So there was no term pulling the biped TOWARD
      the surface: it fell until the probe happened to see ground, then stopped
      wherever in that 0.15 m window it landed. Anything inside the band was
      permanent, which is exactly how it was reported — Tonio: "you often end up
      a little offset from the ground (floating above or sunken in) and this
      never really corrects. It just gets randomly messed up again when you
      navigate another slope."

      Slopes made it worse in both directions. Going UP, `moveWithCollisions`
      slides the body up the ellipsoid and leaves it high in the band. Going
      DOWN — "especially down" — the ground fell away faster than the old
      gravity could follow: it moved at most `min(0.1, 9.81·dt)` per frame, a
      hard 0.1 m clamp, so a brisk descent outran it and it floated the whole
      way down.

      Now: probe a step's worth up and a step's worth down, and if there is
      ground in that range put the feet ON it (the root origin IS the feet — see
      the ellipsoid offset in setupMesh). Otherwise fall properly, accumulating
      velocity rather than moving a fixed amount per frame.
      */
      const fallStep = Math.abs(this._fallVel * dt)
      const ray = new BABYLON.Ray(
        new BABYLON.Vector3(
          node.position.x,
          node.position.y + STEP_UP,
          node.position.z
        ),
        BABYLON.Vector3.Down(),
        // Extended by this frame's fall so a fast descent cannot step over the
        // surface between two frames and keep going.
        STEP_UP + STEP_DOWN + fallStep
      )
      const hit = this.owner!.scene.pickWithRay(
        ray,
        // `collidable()` for the shared rules (UI never counts as floor,
        // isPickable/isEnabled re-checked because a predicate replaces
        // Babylon's own filter); `checkCollisions` stays as OUR clause.
        collidable((m) => m === node || !m.checkCollisions)
      )
      if (hit?.hit && hit.pickedPoint != null) {
        node.position.y = hit.pickedPoint.y
        this._fallVel = 0
      } else {
        // Terminal velocity keeps one slow frame from teleporting a biped
        // through the floor, on top of the probe extension above.
        this._fallVel = Math.max(-20, this._fallVel - 9.81 * dt)
        node.moveWithCollisions(new BABYLON.Vector3(0, this._fallVel * dt, 0))
      }
      // Void-catch backstop: never sink below groundY, so a biped can't fall forever
      // when a scene has no collidable ground at all. Default is DEEP (see
      // initAttributes) so it doesn't act as an invisible floor over sub-zero terrain
      // or water — real collidable surfaces above it ground the biped via the probe.
      if (node.position.y < attrs.groundY) node.position.y = attrs.groundY

      if (speed > 0.1) {
        if (sprintSpeed > 0.25) {
          this.setAnimationState('run', sprintSpeed + 0.25)
        } else {
          this.setAnimationState('walk', speed + 0.25)
        }
      } else if (speed < -0.1) {
        this.setAnimationState('walkBackwards', Math.abs(speed) + 0.25)
      } else if (Math.abs(rotation) > 0.1) {
        this.setAnimationState('walk', Math.abs(rotation * 0.5) + 0.25)
      } else {
        this.setAnimationState('idle')
      }
    }
  }

  private setupXRInput(xr: BABYLON.WebXRDefaultExperience) {
    const controllerMap = xrControllers(xr)
    this.xrInputProvider = new XRInputProvider(controllerMap)
    // Add XR input to the composite provider
    if (this.inputProvider instanceof CompositeInputProvider) {
      this.inputProvider.add(this.xrInputProvider)
    }
  }

  async setupXRCamera() {
    if (this.owner == null) return
    const scene = this.owner.scene
    const mode = 'immersive-vr'

    if (navigator.xr == null) throw new Error('xr is not available')
    if (!(await navigator.xr.isSessionSupported(mode))) {
      throw new Error(`navigator.xr does not support requested mode "${mode}"`)
    }

    // Create XR experience first
    const xr = await scene.createDefaultXRExperienceAsync({
      uiOptions: { sessionMode: mode },
    })

    // Register controller observables BEFORE entering XR so we catch controller connect events
    this.setupXRInput(xr)

    // Now enter XR
    const { baseExperience } = xr
    const { camera } = baseExperience
    camera.name = (this as any).cameraType
    await baseExperience.enterXRAsync(mode, 'local-floor')

    this.xrStuff = {
      camera,
      xr,
      async exitXR() {
        await baseExperience.exitXRAsync()
      },
    }
    this.camera = camera
    this.owner.xrActive = true

    // Disable all default XR movement so we control it
    if (xr.teleportation) {
      xr.teleportation.dispose()
    }
    try {
      baseExperience.featuresManager.disableFeature(
        BABYLON.WebXRFeatureName.MOVEMENT
      )
    } catch (_) {
      // Feature may not be enabled
    }

    // Parent the XR camera to a container so we can move/rotate the rig
    // without fighting head tracking (head tracking applies as local transform on top)
    const camRig = new BABYLON.TransformNode('xr-rig', this.owner.scene)
    baseExperience.camera.parent = camRig

    let lastTime = Date.now()
    let yawOffset = 0 // correction between XR reference space and Babylon world
    let currentYaw = 0
    const currentPos = new BABYLON.Vector3()
    let firstFrame = true

    baseExperience.sessionManager.onXRFrameObservable.add(() => {
      if (!this.entries) return
      const now = Date.now()
      const dt = Math.min((now - lastTime) * 0.001, 0.1)
      lastTime = now

      const node = this.entries.rootNodes[0] as BABYLON.Mesh

      // Zoom: 0 = (1 back, 1 up), 1 = (5 back, 2 up), default 0.25 = (2 back, 1.25 up)
      const backDist = lerp(1, 5, this.xrCamZoom)
      const upDist = lerp(1, 2, this.xrCamZoom)

      // Target position: behind and above the character
      const behind = node.forward.scale(-backDist)
      const targetX = node.position.x + behind.x
      const targetY = node.position.y + upDist
      const targetZ = node.position.z + behind.z

      // Target yaw: face same direction as character
      const fwd = node.forward
      const targetYaw = Math.atan2(fwd.x, fwd.z)

      // On first frame, compute offset between where headset faces and where
      // it should face (character direction).
      if (firstFrame) {
        firstFrame = false
        let headWorldYaw = 0
        if (baseExperience.camera.rotationQuaternion) {
          headWorldYaw =
            baseExperience.camera.rotationQuaternion.toEulerAngles().y
        }
        yawOffset = headWorldYaw
        currentYaw = targetYaw - yawOffset
      }

      const adjustedTargetYaw = targetYaw - yawOffset
      const t = Math.min(1, 2 * dt)

      currentPos.x = lerp(currentPos.x, targetX, t)
      currentPos.y = lerp(currentPos.y, targetY, t)
      currentPos.z = lerp(currentPos.z, targetZ, t)

      let yawDiff = adjustedTargetYaw - currentYaw
      while (yawDiff > Math.PI) yawDiff -= Math.PI * 2
      while (yawDiff < -Math.PI) yawDiff += Math.PI * 2
      currentYaw += yawDiff * t

      // Set rig transform, compensating for camera's local offset from head tracking
      const camLocal = baseExperience.camera.position
      const yawQuat = BABYLON.Quaternion.RotationYawPitchRoll(currentYaw, 0, 0)
      const rotatedLocal = new BABYLON.Vector3()
      BABYLON.Vector3.TransformCoordinatesToRef(
        camLocal,
        BABYLON.Matrix.FromQuaternionToRef(yawQuat, BABYLON.Matrix.Identity()),
        rotatedLocal
      )
      camRig.position.set(
        currentPos.x - rotatedLocal.x,
        currentPos.y - rotatedLocal.y,
        currentPos.z - rotatedLocal.z
      )
      camRig.rotationQuaternion = yawQuat
    })
  }

  async setupFollowCamera() {
    if (this.owner == null || this.entries == null) return
    if (this.xrStuff) {
      await this.xrStuff.exitXR()
      this.owner.xrActive = false
      this.xrStuff = undefined
      this.xrInputProvider = undefined
      // Remove XR provider from composite
      if (this.inputProvider instanceof CompositeInputProvider) {
        for (const p of this.inputProvider.providers) {
          if (p instanceof XRInputProvider) {
            this.inputProvider.remove(p)
            break
          }
        }
      }
    }
    const attrs = this as any
    // Target a point at chest height so the character is centered in frame
    const root = this.entries.rootNodes[0] as BABYLON.Mesh
    const cameraTarget = new BABYLON.TransformNode(
      'camera-target',
      this.owner.scene
    )
    cameraTarget.parent = root
    cameraTarget.position.y = attrs.cameraTargetHeight

    // Named to match cameraType so the render() camera-check is stable (it
    // recreates when this.camera.name !== cameraType).
    const followCamera = new BABYLON.FollowCamera(
      attrs.cameraType,
      BABYLON.Vector3.Zero(),
      this.owner.scene
    )
    followCamera.radius = 5
    followCamera.heightOffset = attrs.cameraHeightOffset
    followCamera.rotationOffset = 180
    followCamera.lockedTarget = cameraTarget as any
    this.camera = followCamera

    // First-person camera — parented to the ROOT (not the head bone, which would
    // inherit animation bob and be nauseating), at eye height, looking forward.
    const fpv = new BABYLON.FreeCamera(
      'biped-fpv',
      BABYLON.Vector3.Zero(),
      this.owner.scene
    )
    fpv.parent = root
    fpv.position = new BABYLON.Vector3(0, attrs.eyeHeight, 0.15)
    fpv.rotation = BABYLON.Vector3.Zero()
    fpv.minZ = 0.06 // the head mesh is hidden in fpv, so only a small near plane
    this.fpvCamera = fpv

    this.setCameraView(this.cameraView)
  }

  /** Toggle third-person ('chase') vs first-person ('fpv'). In VR the rig reads
   * cameraView; on flat we switch the active camera. Either way the body is
   * hidden in first-person so it isn't in your face (and can't run ahead of the
   * camera) — while still casting its shadow. */
  setCameraView(view: 'chase' | 'fpv') {
    this.cameraView = view
    this.setBodyHidden(view === 'fpv')
    if (this.owner?.xrActive) return // the XR rig handles the viewpoint in VR
    const cam = view === 'fpv' ? this.fpvCamera : this.camera
    if (cam != null && this.owner != null) {
      this.owner.setActiveCamera(cam, { attach: false })
    }
  }

  /** Hide the WHOLE biped in first-person (robust regardless of head-mesh names,
   * and it kills the body-running-ahead artefact), EXCEPT meshes whose name
   * contains `_fpv` — mark first-person hands/arms/tools that way to keep them.
   * Shadow casting is unaffected: Babylon's shadow generator renders its caster
   * list regardless of `isVisible`, so you still cast a full-body shadow. */
  private setBodyHidden(hidden: boolean) {
    if (hidden && this.hiddenBody.length === 0 && this.entries != null) {
      const root = this.entries.rootNodes[0] as BABYLON.Mesh
      this.hiddenBody = root
        .getChildMeshes()
        .filter((m) => !/_fpv/i.test(m.name))
    }
    for (const m of this.hiddenBody) m.isVisible = !hidden
  }

  connectedCallback() {
    super.connectedCallback()
    const attrs = this as any
    if (attrs.player) {
      // Check if we're inside an inputFocus manager (it will wire input for us)
      const focusManager = this.closest('tosi-b3d-input-focus')
      if (!focusManager) {
        // Legacy: direct child of gameController
        const gcEl = this.closest('tosi-game-controller')
        this.gameController = gcEl as unknown as GameController | undefined
        if (this.gameController) {
          const composite = new CompositeInputProvider(
            this.gameController.getInputProvider()
          )
          this.inputProvider = composite
        }
      }
    }
  }

  /** Swap the model's `skin` material albedo texture (Kenney characters are
   * textureless + reskinned by this PNG). Empty clears it. Matches materials named
   * ~`skin`, or all PBR materials if none is. */
  applySkin(url: string): void {
    if (this.entries == null || this.owner == null) return
    const scene = this.owner.scene
    const mats = new Set<BABYLON.PBRMaterial>()
    for (const n of this.entries.rootNodes) {
      for (const m of n.getChildMeshes()) {
        if (m.material instanceof BABYLON.PBRMaterial) mats.add(m.material)
      }
    }
    const named = [...mats].filter((m) => /skin/i.test(m.name))
    for (const mat of named.length ? named : [...mats]) {
      mat.albedoTexture?.dispose()
      mat.albedoTexture = url ? new BABYLON.Texture(url, scene) : null
      // Kenney character materials export as alphaMode MASK with base-color alpha 0
      // (an FBX-import artifact) → fully clipped/invisible. They're opaque, so force it.
      mat.transparencyMode = BABYLON.PBRMaterial.PBRMATERIAL_OPAQUE
    }
  }

  private _equipped = new Map<string, BABYLON.InstantiatedEntries>()

  /**
   * Load an accessory GLB and attach it to a named rig bone (`Head`, `RightHand`,
   * `Hips`, …), replacing anything already on that bone. Kenney accessories are
   * origin-authored (their geometry sits at the origin, meant to be positioned BY
   * the bone), so parenting to the bone's node places + animates them correctly.
   */
  equip(boneName: string, url: string): void {
    if (this.entries == null || this.owner == null) return
    const scene = this.owner.scene
    const skeleton = this.entries.skeletons?.[0]
    this.unequip(boneName)
    this.loadAssetContainer(scene, url, (container) => {
      if (this.mesh == null) return // disposed while loading
      const e = container.instantiateModelsToScene(undefined, false, {
        doNotInstantiate: true,
      })
      const acc = e.rootNodes[0] as BABYLON.TransformNode
      const bone =
        skeleton?.bones.find(
          (b) => b.name.toLowerCase() === boneName.toLowerCase()
        ) ?? skeleton?.bones.find((b) => new RegExp(boneName, 'i').test(b.name))
      acc.parent = bone?.getTransformNode?.() ?? this.mesh
      this._equipped.set(boneName, e)
    })
  }

  /** Remove whatever is equipped on a bone. */
  unequip(boneName: string): void {
    const e = this._equipped.get(boneName)
    if (e != null) {
      e.dispose()
      this._equipped.delete(boneName)
    }
  }

  sceneReady(owner: B3d, scene: BABYLON.Scene) {
    super.sceneReady(owner, scene)
    const attrs = this as any
    if (attrs.url !== '' && !this.entries) {
      this.loadAssetContainer(scene, attrs.url, (container) => {
        this.entries = container.instantiateModelsToScene(undefined, false, {
          doNotInstantiate: true,
        })
        if (this.entries.rootNodes.length !== 1) {
          throw new Error(
            '<tosi-b3d-biped> expects a container with exactly one root node'
          )
        }
        const meshes = this.entries.rootNodes
          .map((node) => node.getChildMeshes())
          .flat()
        this.mesh = this.entries.rootNodes[0] as BABYLON.Mesh
        if (attrs.scale !== 1) this.mesh.scaling.setAll(attrs.scale)
        // Derive eye height from the model (after scaling, so it's the real size) so first-person sits at the head, not
        // the origin (the feet). ~0.93 of total height ≈ eye level. Used as a
        // fallback when there's no head node to anchor to.
        const bounds = this.mesh.getHierarchyBoundingVectors()
        const height = bounds.max.y - bounds.min.y
        ;(this as any).eyeHeight = height * 0.93
        this.chaseHeight = height * 1.5
        this.chaseDistance = height * 2.0
        // Find the head BONE node (e.g. `mixamorig:Head`) so first-person anchors
        // to the actual animated head — which moves forward when walking and down
        // when crouching. Exclude meshes so we get the animated joint, not the
        // (static) `head` mesh node.
        this.headNode =
          this.mesh
            .getChildTransformNodes(false)
            .find(
              (n) =>
                /head/i.test(n.name) && !(n instanceof BABYLON.AbstractMesh)
            ) ?? null
        /*
        THE COLLISION BODY STARTS A STEP ABOVE THE FEET.

        Its bottom used to sit exactly ON the feet, which was survivable only
        because the old ground check left the biped floating somewhere in a
        15 cm dead band — that float WAS the clearance. Snapping the feet onto
        the surface removed the float and, with it, the clearance: moving into
        rising ground embedded the ellipsoid in the slope, Babylon refused the
        move, and you stopped dead. Tonio: "you can get stuck on sloped
        surfaces."

        Raising the offset by `STEP_OFFSET` is the standard fix (it is Unity's
        Step Offset): the capsule ignores anything lower than a step, so a slope
        rising under you is not an obstacle, and the ground probe puts the feet
        on the surface afterwards. A wall is still a wall — the capsule above
        the step height is unchanged.

        Kept below `STEP_UP` (the probe's reach), so anything the body walks over
        is something the probe can then stand you on.
        */
        this.mesh.ellipsoid = new BABYLON.Vector3(0.3, 0.75, 0.3)
        this.mesh.ellipsoidOffset = new BABYLON.Vector3(
          0,
          0.75 + STEP_OFFSET,
          0
        )
        this.mesh.checkCollisions = true
        owner.register({ meshes })
        // Skin materials that export as alphaMode MASK + base-color alpha 0 (an FBX
        // artifact) render the character fully invisible; they're opaque, so fix it
        // whether or not a `skin` is applied.
        for (const mm of meshes) {
          const mat = (mm as BABYLON.AbstractMesh).material
          if (mat instanceof BABYLON.PBRMaterial && /skin/i.test(mat.name)) {
            mat.transparencyMode = BABYLON.PBRMaterial.PBRMATERIAL_OPAQUE
          }
        }
        this.setAnimationState(attrs.initialState)
        if (attrs.skin) this.applySkin(attrs.skin)

        // If inputFocus wired input before GLB loaded, it may have been
        // cleared by a dispose/re-init cycle. Re-wire directly.
        if (attrs.player && this.inputProvider == null) {
          const focusManager = this.closest('tosi-b3d-input-focus') as any
          if (focusManager?.inputMappedProvider) {
            this.inputProvider = new CompositeInputProvider(
              focusManager.inputMappedProvider
            )
          }
        }

        this.lastUpdate = Date.now()
        scene.registerBeforeRender(this._update)
        this.queueRender()
      })
    }
  }

  sceneDispose() {
    if (this.fpvCamera) {
      this.fpvCamera.parent = null
      this.fpvCamera.dispose()
      this.fpvCamera = null
    }
    this.hiddenBody = []
    if (this.owner != null && this.entries) {
      this.owner.scene.unregisterBeforeRender(this._update)
      for (const node of this.entries.rootNodes) {
        node.dispose()
      }
      for (const skeleton of this.entries.skeletons) {
        skeleton.dispose()
      }
      for (const ag of this.entries.animationGroups) {
        ag.dispose()
      }
      this.entries = undefined
    }
    this.gameController = undefined
    this.inputProvider = null
    this.xrInputProvider = undefined
    super.sceneDispose()
  }

  render() {
    if (!this.owner) return
    super.render()
    if (this.entries == null) return
    const attrs = this as any
    if (attrs.animation !== '') {
      this.setAnimationState(attrs.animation, attrs.animationSpeed)
    } else if (this.animationGroup && attrs.animationSpeed !== undefined) {
      this.animationGroup.speedRatio = attrs.animationSpeed
    }
    if (this.camera == null || this.camera.name !== attrs.cameraType) {
      switch (attrs.cameraType) {
        case 'xr':
          this.setupXRCamera()
          break
        case 'follow':
          this.setupFollowCamera()
          break
        default:
          if (this.camera != null) {
            if (this.owner?.camera === this.camera) {
              this.owner.camera = undefined
            }
            this.camera.dispose()
            this.camera = undefined
          }
      }
    }
  }
}

export const b3dBiped = B3dBiped.elementCreator({ tag: 'tosi-b3d-biped' })
