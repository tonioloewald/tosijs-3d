# game-controller

Input component that maps keyboard/mouse to a virtual gamepad and optionally
merges with a hardware gamepad. Produces `ControlInput` via an `InputMapping`.

Keyboard/mouse listening is built-in. For standalone keyboard-only or
hardware-only sources, see `KeyboardGamepadSource` and `HardwareGamepadSource`.

## Default Key Map

| VirtualGamepad | Keys |
|----------------|------|
| leftStick Y | W (+) / S (-) |
| leftStick X | D (+) / A (-) |
| rightStick X | ArrowRight (+) / ArrowLeft (-) (look: turn) |
| rightStick Y | ArrowUp (+) / ArrowDown (-) (look: pitch) |
| buttonA | Space, left mouse button |
| buttonB | F, right mouse button |
| buttonX | E |
| leftBumper | ShiftLeft |
| rightBumper | ShiftRight, middle mouse button |
| leftTrigger | Q |
| rightTrigger | R |
| dpadDown | G (toggle) |

The mouse wheel is ZOOM: it drives the d-pad up/down axis, not the right
stick. Mouse buttons count only when the press starts on a scene canvas.

## Usage

```javascript
import { gameController, b3dBiped, inputFocus, b3d } from 'tosijs-3d'

document.body.append(
  b3d({},
    inputFocus(
      gameController(),
      b3dBiped({ url: '/model.glb', player: true, cameraType: 'follow' })
    )
  )
)
```

## InputProvider

Call `getInputProvider(mapping?)` to get a `MappedInputProvider`. Default mapping is `bipedMapping`.
