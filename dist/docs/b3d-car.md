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