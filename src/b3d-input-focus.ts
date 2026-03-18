/*#
# b3d-input-focus

Focus manager that wires input to the active controllable entity and handles
enter/exit vehicle mechanics.

## How It Works

1. Discovers the `gameController` and `player: true` entity among its children
2. Routes the controller's input to whichever entity has focus
3. On E press near an `enterable` vehicle, switches focus (hides biped, drives vehicle)
4. On E press while in a vehicle, exits back to biped

When switching entities, the input mapping is swapped to match the entity type
(e.g. bipedMapping for characters, aircraftMapping for aircraft).

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `enterDistance` | `3` | Max distance to enter a vehicle |

## Usage

```javascript
import { b3d, b3dBiped, b3dCar, gameController, inputFocus } from 'tosijs-3d'

document.body.append(
  b3d({},
    inputFocus(
      gameController(),
      b3dBiped({ url: './character.glb', player: true, cameraType: 'follow' }),
      b3dCar({ url: './car.glb', enterable: true, x: 5 })
    )
  )
)
```
*/

import * as BABYLON from '@babylonjs/core'
import { Component } from 'tosijs'
import type { B3d } from './tosi-b3d'
import { B3dControllable } from './b3d-controllable'
import type { GameController } from './game-controller'
import { MappedInputProvider, bipedMapping } from './virtual-gamepad'
import { CompositeInputProvider } from './control-input'

export class B3dInputFocus extends Component {
  static initAttributes = {
    enterDistance: 3,
  }

  owner: B3d | null = null
  private focusedEntity: B3dControllable | null = null
  private playerEntity: B3dControllable | null = null
  private gameController: GameController | null = null
  /** The current MappedInputProvider (exposed for late-binding by controllables) */
  inputMappedProvider: MappedInputProvider | null = null
  private interactWasPressed = false

  connectedCallback() {
    super.connectedCallback()
  }

  sceneReady(owner: B3d, _scene: BABYLON.Scene) {
    this.owner = owner

    // Find the GameController child
    const gcEl = this.querySelector('tosi-game-controller')
    if (gcEl) {
      this.gameController = gcEl as unknown as GameController
      this.inputMappedProvider =
        this.gameController.getInputProvider(bipedMapping)
    }

    // Defer discovery to ensure all children have completed sceneReady
    // (inputFocus is notified before its children in document order)
    requestAnimationFrame(() => this.discoverEntities())
  }

  private discoverEntities() {
    // Find the player entity (the one with player=true)
    const allControllables = Array.from(this.querySelectorAll('*')).filter(
      (el) => el instanceof B3dControllable
    ) as unknown as B3dControllable[]

    for (const entity of allControllables) {
      if ((entity as any).player) {
        this.playerEntity = entity
        break
      }
    }

    if (this.playerEntity && this.inputMappedProvider) {
      this.focusEntity(this.playerEntity)
    }

    // Register update loop for interact proximity check
    if (this.owner) {
      this.owner.scene.registerBeforeRender(this._checkInteract)
    }
  }

  focusEntity(entity: B3dControllable) {
    if (this.focusedEntity === entity) return

    // Deactivate old focus
    if (this.focusedEntity) {
      this.focusedEntity.onLoseFocus()
      this.focusedEntity.inputProvider = null
    }

    this.focusedEntity = entity

    // Swap input mapping and wrap in CompositeInputProvider so XR etc. can add sources
    if (this.inputMappedProvider) {
      const mapping = entity.inputMapping ?? bipedMapping
      this.inputMappedProvider.setMapping(mapping)
      entity.inputProvider = new CompositeInputProvider(
        this.inputMappedProvider
      )
    }
    entity.onGainFocus()

    // Switch camera to follow the new entity
    this.setupCameraForEntity(entity)
  }

  private setupCameraForEntity(entity: B3dControllable) {
    // For bipeds, let them handle their own camera via cameraType attribute
    // For other entities, set up a follow camera on the entity's camera target
    if ('setupFollowCamera' in entity) {
      // Biped handles its own camera
      return
    }
    if (!this.owner) return
    const target = entity.getCameraTarget()
    if (!target) return

    const followCamera = new BABYLON.FollowCamera(
      'FollowCam',
      BABYLON.Vector3.Zero(),
      this.owner.scene
    )
    followCamera.radius = 8
    followCamera.heightOffset = 3
    followCamera.rotationOffset = 180
    followCamera.lockedTarget = target as BABYLON.AbstractMesh
    this.owner.setActiveCamera(followCamera, { attach: false })
  }

  private _checkInteract = () => {
    if (!this.inputMappedProvider || !this.playerEntity || !this.owner) return

    const input = this.inputMappedProvider.poll(0)
    const interactPressed = input.interact > 0.5
    const justPressed = interactPressed && !this.interactWasPressed
    this.interactWasPressed = interactPressed

    if (!justPressed) return

    if (this.focusedEntity === this.playerEntity) {
      // Player is on foot — check for nearby enterable entities
      const playerTarget = this.playerEntity.getCameraTarget()
      if (!playerTarget) return
      const playerPos =
        (playerTarget as BABYLON.AbstractMesh).absolutePosition ??
        (playerTarget as BABYLON.TransformNode).position

      const enterDist = (this as any).enterDistance as number

      // Find all controllable entities with enterable=true
      const candidates = Array.from(this.querySelectorAll('*')).filter((el) => {
        if (!(el instanceof B3dControllable)) return false
        if (el === this.playerEntity) return false
        return (el as any).enterable === true
      }) as unknown as B3dControllable[]

      let closest: B3dControllable | null = null
      let closestDist = enterDist

      for (const candidate of candidates) {
        const target = candidate.getCameraTarget()
        if (!target) continue
        const pos =
          (target as BABYLON.AbstractMesh).absolutePosition ??
          (target as BABYLON.TransformNode).position
        const dist = BABYLON.Vector3.Distance(playerPos, pos)
        if (dist < closestDist) {
          closestDist = dist
          closest = candidate
        }
      }

      if (closest) {
        this.enterVehicle(closest)
      }
    } else {
      // Player is in a vehicle — exit back to biped
      this.exitVehicle()
    }
  }

  private enterVehicle(vehicle: B3dControllable) {
    if (!this.playerEntity) return

    // Hide the biped mesh
    const playerTarget = this.playerEntity.getCameraTarget()
    if (playerTarget) {
      ;(playerTarget as BABYLON.AbstractMesh).setEnabled?.(false)
    }

    // Focus on the vehicle
    this.focusEntity(vehicle)
  }

  private exitVehicle() {
    if (!this.playerEntity || !this.focusedEntity) return
    const vehicle = this.focusedEntity

    // Find exit point or vehicle position
    const vehicleTarget = vehicle.getCameraTarget()
    const exitPos = vehicleTarget
      ? (
          (vehicleTarget as BABYLON.AbstractMesh).absolutePosition ??
          (vehicleTarget as BABYLON.TransformNode).position
        ).clone()
      : new BABYLON.Vector3(0, 0, 0)

    // Offset the biped to the side of the vehicle
    exitPos.x += 2

    // Show and reposition the biped
    const playerTarget = this.playerEntity.getCameraTarget()
    if (playerTarget) {
      ;(playerTarget as BABYLON.AbstractMesh).setEnabled?.(true)
      ;(playerTarget as BABYLON.TransformNode).position.copyFrom(exitPos)
    }

    // Focus back on the biped
    this.focusEntity(this.playerEntity)
  }

  sceneDispose() {
    if (this.owner) {
      this.owner.scene.unregisterBeforeRender(this._checkInteract)
    }
    this.focusedEntity = null
    this.playerEntity = null
    this.gameController = null
    this.inputMappedProvider = null
    this.owner = null
  }

  disconnectedCallback() {
    this.sceneDispose()
    super.disconnectedCallback()
  }
}

export const inputFocus = B3dInputFocus.elementCreator({
  tag: 'tosi-b3d-input-focus',
})
