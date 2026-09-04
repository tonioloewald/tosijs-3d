/*#
# xr-gamepad

`XrGamepadSource` adapts the live XR controllers (from [[gamepad]]'s
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
*/
/*{ "parent": "Input", "order": 900 }*/

import type { TosiXRControllerMap } from './gamepad.js'
import {
  type GamepadSource,
  type VirtualGamepad,
  emptyGamepad,
} from './virtual-gamepad.js'

export class XrGamepadSource implements GamepadSource {
  readonly kind = 'xr'

  constructor(private controllers: TosiXRControllerMap) {}

  poll(): VirtualGamepad {
    const pad = emptyGamepad()
    const left = this.controllers['left']
    const right = this.controllers['right']

    if (left != null) {
      const ts = left['xr-standard-thumbstick']?.axes
      if (ts != null) {
        pad.leftStickX = ts.x
        pad.leftStickY = -ts.y // up = positive, matching the other sources
      }
      pad.leftTrigger = left['xr-standard-trigger']?.value ?? 0
      pad.leftBumper = left['xr-standard-squeeze']?.value ?? 0
      pad.buttonX = left['x-button']?.pressed ? 1 : 0
      pad.buttonY = left['y-button']?.pressed ? 1 : 0
      // Thumbstick clicks stand in for the menu/view buttons in XR.
      pad.menu = left['xr-standard-thumbstick']?.pressed ? 1 : 0
    }

    if (right != null) {
      const ts = right['xr-standard-thumbstick']?.axes
      if (ts != null) {
        pad.rightStickX = ts.x
        pad.rightStickY = -ts.y
      }
      pad.rightTrigger = right['xr-standard-trigger']?.value ?? 0
      pad.rightBumper = right['xr-standard-squeeze']?.value ?? 0
      pad.buttonA = right['a-button']?.pressed ? 1 : 0
      pad.buttonB = right['b-button']?.pressed ? 1 : 0
      pad.view = right['xr-standard-thumbstick']?.pressed ? 1 : 0
    }

    return pad
  }
}
