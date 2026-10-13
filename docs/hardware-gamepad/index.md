# hardware-gamepad

Maps a physical gamepad (via `navigator.getGamepads()`) to a `VirtualGamepad`.
Uses the Standard Gamepad layout (axes 0-3, buttons 0-16).

Configurable deadzone filters stick drift.

## Example

Needs a physical gamepad connected. Maps the Standard Gamepad layout to a `VirtualGamepad`:

```javascript
import { HardwareGamepadSource } from 'tosijs-3d'
// new HardwareGamepadSource() → .poll() reads navigator.getGamepads() into a VirtualGamepad
// (sticks, face buttons, triggers), deadzone-filtered. Merged automatically by <tosi-b3d-controller>.
```
