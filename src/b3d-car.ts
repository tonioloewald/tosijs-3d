/*#
# b3d-car

**A car you can drive**: walk up to it, press **E**, and drive. It sits on its
springs, leans in a turn, squats as it pulls away, holds on a hill, and slides
when you ask too much of the tyres. The handling is
[ground-vehicle](/ground-vehicle/), a pure model with no physics engine, so a
car drives in any scene with ground under it.

## Demo

```js
import { assetUrl, b3d, b3dBiped, b3dCar, b3dTank, b3dLibrary, inputFocus, playground, ualAnimationStates } from 'tosijs-3d'

const cars = b3dLibrary({ url: assetUrl('tonio/vehicles/cars.glb'), type: 'cars' })
const hero = b3dBiped({
  url: assetUrl('quaternius/UAL1_core.glb', 2),
  animationStates: ualAnimationStates(),
  x: -4, z: 10, player: true, cameraType: 'follow',
})
preview.append(
  b3d(
    // On foot: move, turn, jump, get in. Driving: the triggers are the pedals,
    // the left stick steers, the right looks around, A is the handbrake, X gets out.
    { style: 'width: 100%; height: 100%', gamepad: 'left_stick,right_stick,left_trigger,right_trigger,A,X' },
    cars,
    ...playground({ targets: 0 }),
    inputFocus(
      hero,
      b3dCar({ library: 'cars', meshName: 'Coupe', scale: 2, enterable: true, x: 0, z: 12, ry: 90 }),
      b3dCar({ library: 'cars', meshName: 'SUV', scale: 2, enterable: true, x: 3, z: 4, ry: 180, drive: 'all' }),
      b3dTank({ enterable: true, x: -12, z: 2 })
    )
  )
)
```
```css
.preview { height: 100%; }
```

Walk up to a car (or the tank) and press **E** to get in, **E** again to get
out. **W** drives, **S** brakes and then reverses, **A** and **D** steer, and
**space** is the handbrake: hold it into a turn at speed and the back steps out.
Let go below walking pace and the brakes hold the car where it is, even on the
ramp. The tank turns on the spot with **A** or **D** alone.

With a gamepad (or the on-screen one) it drives the GTA way: the **right
trigger** accelerates, the **left trigger** brakes and then reverses, the
**left stick** steers, the **right stick** looks around, **A** (or the right
bumper) is the handbrake and **X** gets in and out. **Arrow keys** look around
on a keyboard.

The camera rides high behind the car and looks ahead of it, swinging round
behind as you turn.

The cars are Tonio Loewald's (CC BY 4.0), at twice their size: they are made
half life size.

## A model to drive

Any model whose wheels are separate objects with **`wheel`** in their names
(these are `Wheel_FL` and so on). The car measures them: where each
sits is where its hub rests, its height is its diameter. The wheels in front
of the middle steer, and `drive` says which are driven. Author it the
library's way: facing −Y in Blender (+Z here), its origin on the ground
between the wheels.

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `url` | `''` | GLB model URL |
| `library` / `meshName` | `''` | Or a model from a `b3d-library` |
| `scale` | `1` | Uniform scale of the model |
| `enterable` | `false` | A biped can get in (inside an `inputFocus`) |
| `mass` | `1200` | kg |
| `maxSpeed` | `25` | m/s; the engine gives nothing past it |
| `acceleration` | `5` | m/s² from a standstill |
| `braking` | `9` | m/s² |
| `grip` | `1` | Tyre grip, a friction coefficient: lower slides sooner |
| `steerDeg` | `35` | Full lock, degrees; at speed, no more than the tyres can hold |
| `drive` | `'rear'` | Driven wheels: `rear`, `front` or `all` |

`speed` is its speed along the nose (m/s), `state` the model's state (each
wheel's load, compression and whether it slides).
*/
/*{ "parent": "characters-and-vehicles", "order": 30 }*/

import * as BABYLON from '@babylonjs/core'
import { B3dGroundVehicle } from './b3d-ground-vehicle.js'
import { carMapping } from './virtual-gamepad.js'
import type { VehicleSpec, VehicleState, WheelSpec } from './ground-vehicle.js'

interface WheelPart {
  node: BABYLON.TransformNode
  rest: BABYLON.Vector3
  turn: BABYLON.Quaternion
  /** Metres in the vehicle per unit in the wheel's parent. */
  scale: number
}

const isWheel = (n: BABYLON.Node) => /wheel/i.test(n.name)

export class B3dCar extends B3dGroundVehicle {
  static preferredTagName = 'tosi-b3d-car'

  inputMapping = carMapping
  static initAttributes = {
    ...B3dGroundVehicle.initAttributes,
    steerDeg: 35,
    drive: 'rear' as 'rear' | 'front' | 'all',
  }
  declare steerDeg: number
  declare drive: 'rear' | 'front' | 'all'

  private wheelParts: WheelPart[] = []

  protected specFor(control: BABYLON.TransformNode): VehicleSpec | null {
    // The outermost nodes named as wheels (a wheel's own parts are not wheels).
    const nodes = control
      .getDescendants(false)
      .filter(
        (n): n is BABYLON.TransformNode =>
          n instanceof BABYLON.TransformNode &&
          isWheel(n) &&
          !(n.parent != null && isWheel(n.parent))
      )
    const measured = nodes.map((node) => {
      const { min, max } = node.getHierarchyBoundingVectors(true)
      return {
        node,
        at: min.add(max).scale(0.5),
        radius: (max.y - min.y) / 2,
        bottom: min.y,
      }
    })
    // Only wheels that reach the ground: a spare on the tailgate is not one.
    const lowest = Math.min(...measured.map((w) => w.bottom))
    const found = measured.filter((w) => w.bottom <= lowest + w.radius / 4)
    if (found.length < 3) return null
    const zs = found.map((w) => w.at.z)
    const middle = (Math.min(...zs) + Math.max(...zs)) / 2
    const drive = this.drive
    const wheels: WheelSpec[] = found.map((w) => {
      const front = w.at.z > middle
      return {
        at: { x: w.at.x, y: w.at.y, z: w.at.z },
        radius: w.radius,
        steerDeg: front ? Number(this.steerDeg) || 0 : 0,
        drive: drive === 'all' || (drive === 'front') === front ? 1 : 0,
        handbrake: !front,
      }
    })
    this.wheelParts = found.map(({ node }) => {
      const parent = node.parent as BABYLON.TransformNode | null
      return {
        node,
        rest: node.position.clone(),
        turn: (
          node.rotationQuaternion ??
          BABYLON.Quaternion.FromEulerVector(node.rotation)
        ).clone(),
        scale: parent?.absoluteScaling.y || 1,
      }
    })
    const { min, max } = control.getHierarchyBoundingVectors(true)
    const hubs = wheels.reduce((t, w) => t + w.at.y, 0) / wheels.length
    const mass = Number(this.mass)
    return {
      mass,
      size: { x: max.x - min.x, y: max.y - min.y, z: max.z - min.z },
      // Low, between the axles: cars roll, they do not tip.
      centreOfMass: { x: (min.x + max.x) / 2, y: hubs, z: (min.z + max.z) / 2 },
      wheels,
      engineForce: mass * Number(this.acceleration),
      brakeForce: mass * Number(this.braking),
      maxSpeed: Number(this.maxSpeed),
      grip: Number(this.grip),
    }
  }

  protected pose(state: VehicleState) {
    const steer = new BABYLON.Quaternion()
    const spin = new BABYLON.Quaternion()
    this.wheelParts.forEach((w, i) => {
      const c = state.wheels[i]
      if (c == null) return
      w.node.position.copyFrom(w.rest)
      w.node.position.y += c.compression / w.scale
      BABYLON.Quaternion.RotationAxisToRef(BABYLON.Axis.Y, c.steer, steer)
      BABYLON.Quaternion.RotationAxisToRef(BABYLON.Axis.X, c.angle, spin)
      w.node.rotationQuaternion = steer.multiply(spin).multiply(w.turn)
    })
  }

  sceneDispose() {
    this.wheelParts = []
    super.sceneDispose()
  }
}

export const b3dCar = B3dCar.elementCreator()
