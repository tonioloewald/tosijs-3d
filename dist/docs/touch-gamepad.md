# touch-gamepad

Touch/pointer-driven virtual gamepad backed by an SVG. Elements are identified
by `data-part` attributes (not IDs, so multiple instances work).

## How it works

Load any SVG with elements whose `data-part` values match the standard layout:

| `data-part` | VirtualGamepad | Type |
|-------------|---------------|------|
| `left_stick` / `left_stick_travel` | `leftStickX/Y` | stick |
| `right_stick` / `right_stick_travel` | `rightStickX/Y` | stick |
| `A`, `B`, `X`, `Y` | `buttonA/B/X/Y` | button |
| `left_bumper`, `right_bumper` | `leftBumper`, `rightBumper` | button |
| `left_trigger`, `right_trigger` | `leftTrigger`, `rightTrigger` | button |
| `dpad_up/down/left/right` | `dpadUp/Down/Left/Right` | button |

### Sticks

Touch inside a `*_stick_travel` region to grab the stick. The travel circle
recenters to your touch point and the knob tracks your drag. Release snaps
everything back. Deadzone and max-zone are applied so you don't need pixel
precision.

### Buttons

Touch a button element to set its value to 1 and add an `active` CSS class.
Release sets it back to 0. Elements with `data-part` values not in the table
above (e.g. `menu`, `view`) still get the `active` class and fire the optional
`onButton(part, pressed)` callback.

## Demo

```js
import { gamepadSvg, TouchGamepadSource } from 'tosijs-3d'
import { elements } from 'tosijs'
const { div, pre } = elements

const pad = gamepadSvg()
const customBtns = new Set()
const source = new TouchGamepadSource(pad, {
  onButton(part, pressed) {
    if (pressed) customBtns.add(part)
    else customBtns.delete(part)
  },
})
const readout = pre({ class: 'readout' })

function update() {
  const s = source.poll()
  const lines = []
  if (s.leftStickX || s.leftStickY)
    lines.push(`L stick: ${s.leftStickX.toFixed(2)}, ${s.leftStickY.toFixed(2)}`)
  if (s.rightStickX || s.rightStickY)
    lines.push(`R stick: ${s.rightStickX.toFixed(2)}, ${s.rightStickY.toFixed(2)}`)
  const btns = ['buttonA','buttonB','buttonX','buttonY',
    'leftBumper','rightBumper','leftTrigger','rightTrigger',
    'dpadUp','dpadDown','dpadLeft','dpadRight']
    .filter(k => s[k] > 0)
  if (btns.length) lines.push(`Buttons: ${btns.join(', ')}`)
  if (customBtns.size) lines.push(`Custom: ${[...customBtns].join(', ')}`)
  readout.textContent = lines.join('\n') || 'Touch or click the gamepad'
  requestAnimationFrame(update)
}
update()

preview.append(div({ class: 'gamepad-demo' }, pad, readout))
```
```css
.gamepad-demo {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.gamepad-demo svg {
  width: 100%;
  max-width: 400px;
  cursor: pointer;
}
.gamepad-demo .readout {
  font-family: ui-monospace, monospace;
  font-size: 12px;
  color: #222;
  min-height: 2.5em;
  margin: 0;
}
.gamepad-demo [data-part].active {
  stroke-width: 24;
  filter: brightness(1.3);
}
```

## Usage

```typescript
import { TouchGamepadSource } from 'tosijs-3d'

const svg = document.querySelector('svg.gamepad')
const source = new TouchGamepadSource(svg)

// Add to a MappedInputProvider alongside keyboard/hardware gamepad
provider.addSource(source)
```