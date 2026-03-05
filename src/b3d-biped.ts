import * as BABYLON from '@babylonjs/core'
import { AbstractMesh, XRStuff } from './b3d-utils'
import { xrControllers, TosiXRControllerMap } from './gamepad'
import type { GameController } from './game-controller'

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

export class B3dBiped extends AbstractMesh {
  static initAttributes = {
    ...AbstractMesh.initAttributes,
    url: '',
    player: false,
    cameraType: 'none',
    initialState: 'idle',
    turnSpeed: 180,
    forwardSpeed: 2,
    runSpeed: 5,
    backwardSpeed: 1,
    cameraHeightOffset: 1.5,
    cameraMinFollowDistance: 2,
    cameraMaxFollowDistance: 5,
  }

  entries?: BABYLON.InstantiatedEntries
  camera?: BABYLON.Camera
  xrStuff?: XRStuff
  xrControllerMap?: TosiXRControllerMap
  animationState?: AnimState
  animationGroup?: BABYLON.AnimationGroup
  gameController?: GameController
  private lastUpdate = 0
  // XR camera: zoom goes from (1 back, 1 up) to (5 back, 2 up), default (2 back, 1.25 up)
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

    this.animationState = this.animationStates.find(
      (state) => state.name === name || state.animation === name
    )
    if (this.animationState != null) {
      const idx = this.entries.animationGroups.findIndex((g) =>
        g.name.endsWith(this.animationState!.animation)
      )
      if (idx > -1) {
        const loop = this.animationState.loop
        const additive = this.animationState.additive
        if (loop) {
          for (const ag of this.entries.animationGroups) {
            ag.stop()
          }
        }
        const animationGroup = this.entries.animationGroups[idx]
        if (this.animationState.backwards) {
          animationGroup.start(
            loop,
            speed,
            animationGroup.from,
            animationGroup.to,
            additive
          )
        } else {
          animationGroup.start(
            loop,
            speed,
            animationGroup.to,
            animationGroup.from,
            additive
          )
        }
        this.animationGroup = animationGroup
      } else {
        console.error(
          `setAnimationState: could not find animation "${this.animationState.animation}"`
        )
      }
    } else {
      console.error(`setAnimationState: no state named "${name}"`)
    }
  }

  private setupXRInput(xr: BABYLON.WebXRDefaultExperience) {
    this.xrControllerMap = xrControllers(xr)
  }

  private getXRStickInput(): {
    forward: number
    turn: number
    zoom: number
  } {
    if (this.xrControllerMap == null) return { forward: 0, turn: 0, zoom: 0 }
    let forward = 0
    let turn = 0
    let zoom = 0
    const left = this.xrControllerMap['left']
    if (left?.['xr-standard-thumbstick']) {
      const axes = left['xr-standard-thumbstick'].axes
      if (Math.abs(axes.y) > 0.1) forward = -axes.y
      if (Math.abs(axes.x) > 0.1) turn = axes.x
    }
    const right = this.xrControllerMap['right']
    if (right?.['xr-standard-thumbstick']) {
      const axes = right['xr-standard-thumbstick'].axes
      if (Math.abs(axes.y) > 0.1) zoom = axes.y
    }
    return { forward, turn, zoom }
  }

  private _update = () => {
    const attrs = this as any
    if (!attrs.player || this.entries == null) return

    const now = Date.now()
    const timeElapsed = (now - this.lastUpdate) * 0.001
    this.lastUpdate = now

    // Combine keyboard/gameController input with XR stick input
    const gc = this.gameController
    const gcState = gc?.state
    const xrInput = this.getXRStickInput()

    // Right stick Y: adjust camera zoom (0=close, 1=far), push forward = closer
    if (xrInput.zoom !== 0) {
      this.xrCamZoom += xrInput.zoom * 0.5 * timeElapsed
      this.xrCamZoom = Math.max(0, Math.min(1, this.xrCamZoom))
    }

    const rotation = (gcState ? gcState.right - gcState.left : 0) + xrInput.turn
    const speed =
      (gcState ? gcState.forward - gcState.backward : 0) + xrInput.forward
    const sprint = gcState?.sprint ?? 0
    const sprintSpeed = speed * sprint
    const totalSpeed =
      speed * attrs.forwardSpeed +
      sprintSpeed * (attrs.runSpeed - attrs.forwardSpeed)

    if (this.camera instanceof BABYLON.FollowCamera && gc) {
      this.camera.radius = lerp(
        attrs.cameraMinFollowDistance,
        attrs.cameraMaxFollowDistance,
        (gc as any).wheel
      )
    }

    for (const node of this.entries.rootNodes as BABYLON.Mesh[]) {
      if (speed > 0) {
        node.moveWithCollisions(
          node.forward.scaleInPlace(totalSpeed * timeElapsed)
        )
      } else if (speed < 0) {
        node.moveWithCollisions(
          node.forward.scaleInPlace(speed * timeElapsed * attrs.backwardSpeed)
        )
      }
      node.rotate(
        BABYLON.Vector3.Up(),
        rotation * timeElapsed * attrs.turnSpeed * DEG_TO_RAD
      )

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
      // it should face (character direction). This corrects for XR reference
      // space not being aligned with Babylon's world axes.
      if (firstFrame) {
        firstFrame = false
        let headWorldYaw = 0
        if (baseExperience.camera.rotationQuaternion) {
          headWorldYaw =
            baseExperience.camera.rotationQuaternion.toEulerAngles().y
        }
        // We want: rigYaw + headYaw = targetYaw
        // So: yawOffset = targetYaw - headWorldYaw
        // And rigYaw = targetYaw - yawOffset ... wait, rigYaw IS what we converge on
        // Actually: on first frame, headWorldYaw is where user physically faces
        // We want that to equal targetYaw, so rigYaw = targetYaw - headWorldYaw
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
      // Rotate the camera's local offset by the rig yaw to get world-space offset
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
      this.xrControllerMap = undefined
    }
    const attrs = this as any
    const followCamera = new BABYLON.FollowCamera(
      'FollowCam',
      BABYLON.Vector3.Zero(),
      this.owner.scene
    )
    followCamera.radius = 5
    followCamera.heightOffset = attrs.cameraHeightOffset
    followCamera.rotationOffset = 180
    followCamera.lockedTarget = this.entries.rootNodes[0] as BABYLON.Mesh
    this.camera = followCamera
    this.owner.setActiveCamera(followCamera, { attach: false })
  }

  connectedCallback() {
    super.connectedCallback()
    const attrs = this as any
    if (attrs.player) {
      // Find parent GameController
      const gcEl = this.closest('tosi-game-controller')
      this.gameController = gcEl as unknown as GameController | undefined
    }
    if (this.owner != null && attrs.url !== '') {
      BABYLON.SceneLoader.LoadAssetContainer(
        attrs.url,
        undefined,
        this.owner.scene,
        (container) => {
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
          this.owner!.register({ meshes })
          this.setAnimationState(attrs.initialState)

          this.lastUpdate = Date.now()
          this.owner!.scene.registerBeforeRender(this._update)
          this.queueRender()
        }
      )
    }
  }

  disconnectedCallback() {
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
    this.xrControllerMap = undefined
    super.disconnectedCallback()
  }

  render() {
    super.render()
    if (this.entries == null) return
    const attrs = this as any
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
