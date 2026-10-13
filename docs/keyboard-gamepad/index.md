# keyboard-gamepad

Maps keyboard and mouse input to a `VirtualGamepad`. Uses attack/decay smoothing
for responsive analog-feel from digital keys.

## Example

Turns WASD / arrows / mouse into a `VirtualGamepad` — the same spine the hardware pad and XR
controllers feed, so a keyboard "just works" anywhere a gamepad does:

```javascript
import { keyboardGamepad } from 'tosijs-3d'
// keyboardGamepad() → a source whose .poll() yields a VirtualGamepad from the keys below. Usually
// you don't touch it directly — <tosi-b3d-controller> wires it into the merged input for you.
```

## Default Key Map

| VirtualGamepad | Keys |
|----------------|------|
| leftStick Y | W (+) / S (-) |
| leftStick X | D (+) / A (-) |
| rightStick Y | ArrowUp (+) / ArrowDown (-) — LOOK, not zoom |
| rightStick X | ArrowRight (+) / ArrowLeft (-) |
| buttonA | Space |
| buttonB | F |
| buttonX | E |
| leftBumper | ShiftLeft |
| leftTrigger | Q |
| rightTrigger | R |
| buttonY | Y |
| rightBumper | ShiftRight |
| dpadUp/Down/Left/Right | I / M / J / K |

Mouse wheel adjusts the ZOOM axis (d-pad up/down), not the look stick.
