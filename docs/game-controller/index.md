# game-controller

> **Deprecated as something you add yourself.** You do not need to put a
> `gameController()` in a scene: [inputFocus](/b3d-input-focus/) builds one when it
> has none, and for an input loop without a body use
> [b3d-controller](/b3d-controller/), which wires keyboard, mouse, the glass pad,
> hardware pads and XR controllers. This page documents the key map they use.

Input component that maps keyboard/mouse to a virtual gamepad and optionally
merges with a hardware gamepad. Produces `ControlInput` via an `InputMapping`.
For standalone keyboard-only or hardware-only sources, see
[virtual-gamepad](/virtual-gamepad/).

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

## Attributes

These are read from the controller `inputFocus` creates; to change them, add your
own `gameController({ … })` inside the `inputFocus` and it is used instead.

| Attribute | Default | Description |
|-----------|---------|-------------|
| `mouseLook` | `'off'` | How the mouse looks around: `'drag'` (hold a button), `'lock'` (pointer lock, for a real game) or `'off'` |
| `mouseSensitivity` | `1` | Degrees of view per 100px of mouse movement, roughly |
| `wheelSensitivity` | `1` | Scales the wheel's zoom axis |
| `updateIntervalMs` | `33` | How often key state is smoothed, ms |

## InputProvider

Call `getInputProvider(mapping?)` to get a `MappedInputProvider`. Default mapping is `bipedMapping`.
