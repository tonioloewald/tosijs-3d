import * as BABYLON from '@babylonjs/core'
import { AbstractMesh, enterXR, XRStuff } from './b3d-utils'
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
  animationState?: AnimState
  animationGroup?: BABYLON.AnimationGroup
  gameController?: GameController
  private lastUpdate = 0

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

  private _update = () => {
    const attrs = this as any
    if (attrs.player && this.gameController != null) {
      const now = Date.now()
      const timeElapsed = (now - this.lastUpdate) * 0.001
      this.lastUpdate = now

      const { state } = this.gameController
      const rotation = state.right - state.left
      const speed = state.forward - state.backward
      const sprint = state.sprint
      const sprintSpeed = speed * sprint
      const totalSpeed =
        speed * attrs.forwardSpeed +
        sprintSpeed * (attrs.runSpeed - attrs.forwardSpeed)

      if (this.camera instanceof BABYLON.FollowCamera) {
        this.camera.radius = lerp(
          attrs.cameraMinFollowDistance,
          attrs.cameraMaxFollowDistance,
          (this.gameController as any).wheel
        )
      }

      for (const node of this.entries!.rootNodes as BABYLON.Mesh[]) {
        if (speed > 0) {
          node.moveWithCollisions(
            node.forward.scaleInPlace(totalSpeed * timeElapsed)
          )
        } else {
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
          this.setAnimationState('walkBackwards', speed + 0.25)
        } else if (Math.abs(rotation) > 0.1) {
          this.setAnimationState('walk', Math.abs(rotation * 0.5) + 0.25)
        } else {
          this.setAnimationState('idle')
        }
      }
    }
  }

  async setupXRCamera() {
    if (this.owner == null) return
    this.xrStuff = await enterXR(this.owner.scene, {
      cameraName: (this as any).cameraType,
    })
    const { camera, sessionManager } = this.xrStuff
    this.camera = camera
    this.owner.xrActive = true
    sessionManager.onXRFrameObservable.add(() => {
      if (this.entries) {
        const { x, y, z } = this.entries.rootNodes[0].position
        camera.position.x = x
        camera.position.y = y + 0.7
        camera.position.z = z
      }
    })
  }

  async setupFollowCamera() {
    if (this.owner == null || this.entries == null) return
    if (this.xrStuff) {
      await this.xrStuff.exitXR()
      this.owner.xrActive = false
      this.xrStuff = undefined
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
