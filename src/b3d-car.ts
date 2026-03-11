/*#
# b3d-car

Vehicle controller with acceleration, braking, friction, and speed-dependent steering.

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `url` | `''` | GLB model URL |
| `enterable` | `false` | Whether a biped can enter this vehicle |
| `maxSpeed` | `15` | Maximum forward speed |
| `acceleration` | `8` | Acceleration rate |
| `braking` | `15` | Braking rate |
| `turnRate` | `90` | Degrees per second at full speed |
| `friction` | `3` | Deceleration when coasting |

## Mesh Naming

In Blender, name wheel meshes with `wheel` in the name (e.g. `wheel_fl`, `wheel_fr`)
and they'll spin automatically based on speed.

## Enter/Exit

When `enterable: true` and wrapped in an `inputFocus`, a nearby biped can press E
to enter the vehicle. Press E again to exit.

```javascript
import { b3d, b3dCar, b3dBiped, gameController, inputFocus } from 'tosijs-3d'

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
import type { B3d } from './tosi-b3d'
import { B3dControllable } from './b3d-controllable'
import type { ControlInput } from './control-input'
import { carMapping } from './virtual-gamepad'

export class B3dCar extends B3dControllable {
  inputMapping = carMapping
  static initAttributes = {
    ...B3dControllable.initAttributes,
    url: '',
    enterable: false,
    maxSpeed: 15,
    acceleration: 8,
    braking: 15,
    turnRate: 90,
    friction: 3,
  }

  entries?: BABYLON.InstantiatedEntries
  private speed = 0
  private wheels: BABYLON.AbstractMesh[] = []

  getCameraTarget(): BABYLON.Node | null {
    return this.entries?.rootNodes[0] ?? null
  }

  applyInput(input: ControlInput, dt: number) {
    if (this.entries == null) return
    const attrs = this as any
    const node = this.entries.rootNodes[0] as BABYLON.Mesh

    // Acceleration / braking
    const throttle = input.forward
    if (throttle > 0) {
      this.speed += attrs.acceleration * throttle * dt
    } else if (throttle < 0) {
      // Braking or reverse
      if (this.speed > 0.1) {
        this.speed -= attrs.braking * Math.abs(throttle) * dt
      } else {
        this.speed += attrs.acceleration * throttle * dt * 0.5 // reverse at half power
      }
    } else {
      // Coast / friction
      if (Math.abs(this.speed) < 0.1) {
        this.speed = 0
      } else {
        this.speed -= Math.sign(this.speed) * attrs.friction * dt
      }
    }

    // Clamp speed
    this.speed = Math.max(
      -attrs.maxSpeed * 0.3,
      Math.min(attrs.maxSpeed, this.speed)
    )

    // Steering: turn rate depends on speed (no turning while stopped)
    const speedFactor = Math.min(1, Math.abs(this.speed) / 3)
    const steer =
      input.turn * attrs.turnRate * speedFactor * dt * (Math.PI / 180)
    // Reverse steering direction when going backward
    const steerDir = this.speed >= 0 ? 1 : -1
    node.rotate(BABYLON.Vector3.Up(), steer * steerDir)

    // Move forward
    if (Math.abs(this.speed) > 0.01) {
      node.moveWithCollisions(node.forward.scaleInPlace(this.speed * dt))
    }

    // Gravity
    const feetY = node.position.y + 0.05
    const rayOrigin = new BABYLON.Vector3(
      node.position.x,
      feetY,
      node.position.z
    )
    const ray = new BABYLON.Ray(rayOrigin, BABYLON.Vector3.Down(), 0.3)
    const hit = this.owner!.scene.pickWithRay(
      ray,
      (m) => m !== node && m.checkCollisions
    )
    if (!hit?.hit) {
      const gravity = Math.min(0.2, 9.81 * dt)
      node.moveWithCollisions(new BABYLON.Vector3(0, -gravity, 0))
    }

    // Spin wheels
    const wheelSpin = this.speed * dt * 2
    for (const wheel of this.wheels) {
      wheel.rotate(BABYLON.Vector3.Right(), wheelSpin, BABYLON.Space.LOCAL)
    }
  }

  connectedCallback() {
    super.connectedCallback()
  }

  sceneReady(owner: B3d, scene: BABYLON.Scene) {
    super.sceneReady(owner, scene)
    const attrs = this as any
    if (attrs.url !== '') {
      BABYLON.SceneLoader.LoadAssetContainer(
        attrs.url,
        undefined,
        scene,
        (container) => {
          this.entries = container.instantiateModelsToScene(undefined, false, {
            doNotInstantiate: true,
          })
          if (this.entries.rootNodes.length !== 1) {
            throw new Error(
              '<tosi-b3d-car> expects a container with exactly one root node'
            )
          }
          const root = this.entries.rootNodes[0] as BABYLON.Mesh
          const meshes = root.getChildMeshes()
          this.mesh = root
          root.ellipsoid = new BABYLON.Vector3(1, 0.5, 2)
          root.ellipsoidOffset = new BABYLON.Vector3(0, 0.5, 0)
          root.checkCollisions = true
          owner.register({ meshes })

          // Find wheel meshes by naming convention
          this.wheels = meshes.filter((m) => {
            const lower = m.name.toLowerCase()
            return lower.includes('_wheel') || lower.includes('wheel')
          })

          this.lastUpdate = Date.now()
          scene.registerBeforeRender(this._update)
        }
      )
    }
  }

  sceneDispose() {
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
    this.wheels = []
    this.inputProvider = null
    super.sceneDispose()
  }

  disconnectedCallback() {
    this.sceneDispose()
    super.disconnectedCallback()
  }
}

export const b3dCar = B3dCar.elementCreator({ tag: 'tosi-b3d-car' })
