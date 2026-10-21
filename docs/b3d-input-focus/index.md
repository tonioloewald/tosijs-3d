# b3d-input-focus

Focus manager that wires input to the active controllable entity and handles
enter/exit vehicle mechanics.

## How It Works

1. Finds the `player: true` entity among its children, and wires keyboard, mouse,
   gamepads and XR controllers to it (through a `gameController` it builds, or
   one you nested to set its options)
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
import { b3d, b3dBiped, b3dCar, inputFocus } from 'tosijs-3d'

document.body.append(
  b3d({},
    inputFocus(
      b3dBiped({ url: '/character.glb', player: true, cameraType: 'follow' }),
      b3dCar({ url: '/car.glb', enterable: true, x: 5 })
    )
  )
)
```
