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
    // On foot: move, turn, jump, get in. Driving: the triggers are the pedals
    // (the right bumper brakes too), the left stick steers, the right looks
    // around, A is the handbrake, X gets out.
    { style: 'width: 100%; height: 100%', gamepad: 'left_stick,right_stick,left_trigger,right_trigger,right_bumper,A,X' },
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
**left stick** steers, the **right stick** swings the camera round the car
(springing back on release) and up and down an arc to almost above it, **A** is the
handbrake and **X** gets in and out. One step from GTA: the **right bumper**
brakes and reverses too, so on the on-screen pad the right thumb has both
pedals. **Arrow keys** move the camera on a keyboard. The camera looks at a
point a little above the car, so it looks over it at the road; its height
stays where you leave it, and swings round behind as you turn.

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
| `headlights` | `'auto'` | `'auto'` (on at night while driven), `'on'` or `'off'` |
| `sound` | `'on'` | `'off'` silences its engine |

`turnRate` and `friction` are gone (0.12): use `steerDeg` and `grip`; setting
either warns once.

`speed` is its speed along the nose (m/s), `state` the model's state (each
wheel's load, compression and whether it slides).
