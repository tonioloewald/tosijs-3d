# xr-gamepad

`XrGamepadSource` adapts the live XR controllers (from `gamepad.ts`'s
`xrControllers()`) to a [[virtual-gamepad]] `VirtualGamepad`, so XR input flows
through the *same* spine as the keyboard, hardware pad, and on-screen glass
gamepad. Add it to the active `MappedInputProvider` and whatever a controllable's
mapping does on flat — it does in VR, no per-entity XR code.

Standard `xr-standard-*` mappings (Quest / oculus-touch layout):

| VirtualGamepad | XR component |
| --- | --- |
| `leftStickX/Y`, `rightStickX/Y` | `xr-standard-thumbstick` (Y inverted: up = +) |
| `leftTrigger`, `rightTrigger` | `xr-standard-trigger` |
| `leftBumper`, `rightBumper` | `xr-standard-squeeze` (grip) |
| `buttonA`, `buttonB` | right `a-button`, `b-button` |
| `buttonX`, `buttonY` | left `x-button`, `y-button` |

## Example

XR-only. Adapts live XR controllers to the same `VirtualGamepad` spine as the keyboard and hardware
pad, so XR input flows through one path:

```javascript
import { XrGamepadSource } from 'tosijs-3d'
// new XrGamepadSource(...) → .poll() yields a VirtualGamepad from the immersive controllers, merged
// with the other sources by CompositeInputProvider. Wired automatically inside <tosi-b3d-controller>.
```
