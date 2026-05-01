# virtual-gamepad

Standardized virtual gamepad abstraction. All input sources (keyboard, hardware gamepad,
XR controllers, touch) produce a `VirtualGamepad`, and each entity type defines an
`InputMapping` that converts it to `ControlInput`.

## How to wire up controls

1. **Pick a mapping** — it translates gamepad buttons/sticks to game actions like
   `move`, `jump`, `accelerate`. Use a built-in preset or write your own.
2. **Create a `MappedInputProvider`** with your mapping and any input sources
   (keyboard, hardware gamepad, touch overlay).
3. **Assign it to your entity** — done.

Every input source produces a standardized `VirtualGamepad`. The provider merges
them all (max-abs for sticks, max for buttons) and runs your mapping. Plug in a
gamepad mid-game, touch the SVG overlay, or enter XR — it all composes automatically.

```typescript
const provider = new MappedInputProvider(
  bipedMapping,          // how gamepad maps to player actions
  keyboardSource,        // WASD/Space/etc.
  hardwareSource,        // any connected gamepad
  touchSource,           // SVG touch overlay
)
entity.inputProvider = provider
```

## VirtualGamepad

Two sticks + buttons, matching a standard controller layout:

| Field | Range | Maps to |
|-------|-------|---------|
| `leftStickX/Y` | -1..1 | Primary movement (WASD on keyboard) |
| `rightStickX/Y` | -1..1 | Secondary control (arrow keys on keyboard) |
| `buttonA/B/X/Y` | 0..1 | Face buttons (Space, F, E, etc.) |
| `leftBumper/rightBumper` | 0..1 | Bumpers (Shift, etc.) |
| `leftTrigger/rightTrigger` | 0..1 | Triggers (Q/R on keyboard) |
| `dpadUp/Down/Left/Right` | 0..1 | D-pad |

## InputMapping

A function `(pad, dt) => ControlInput` that maps gamepad state to entity-specific
controls. Can be a closure with persistent state (e.g. throttle accumulator for aircraft).

Built-in presets: `bipedMapping`, `carMapping`, `aircraftMapping()`.

Each preset has a matching descriptor (e.g. `bipedMappingDescriptor`) that pairs
the mapping function with human-readable labels for UI visualizers:

```typescript
bipedMappingDescriptor.labels
// { leftStickY: 'move', buttonA: 'jump', leftBumper: 'sprint', ... }
```

## MappedInputProvider

Bridges gamepad sources to the `InputProvider` interface. Merges multiple sources,
runs through the active mapping, produces `ControlInput`.

- `addSource(source)` / `removeSource(source)` — hot-swap input devices
- `setMapping(mapping)` — switch mappings at runtime (e.g. entering a vehicle)
- `pollRaw()` — get the merged `VirtualGamepad` before mapping (for visualizers)

## Demo

Try the controls below — press WASD, plug in a gamepad, or touch the SVG.
All sources merge and drive the same readout.

```js
import {
  gamepadSvg, TouchGamepadSource, KeyboardGamepadSource,
  HardwareGamepadSource, MappedInputProvider,
  bipedMapping, bipedMappingDescriptor,
  carMapping, carMappingDescriptor,
  aircraftMapping, aircraftMappingDescriptor,
} from 'tosijs-3d'
import { elements } from 'tosijs'
const { div, pre, select, option } = elements

const mappings = {
  biped: bipedMappingDescriptor,
  car: carMappingDescriptor,
  aircraft: aircraftMappingDescriptor(),
}

const pad = gamepadSvg()
const touchSource = new TouchGamepadSource(pad)
const keyboardSource = new KeyboardGamepadSource()
const hardwareSource = new HardwareGamepadSource()

const provider = new MappedInputProvider(
  mappings.biped.map, keyboardSource, hardwareSource, touchSource
)

touchSource.showLabels(mappings.biped.labels)

const readout = pre({ class: 'readout' })

const mappingSelect = select(
  { class: 'mapping-select' },
  option({ value: 'biped' }, 'Biped'),
  option({ value: 'car' }, 'Car'),
  option({ value: 'aircraft' }, 'Aircraft'),
)
mappingSelect.addEventListener('change', () => {
  const desc = mappings[mappingSelect.value]
  provider.setMapping(desc.map)
  touchSource.showLabels(desc.labels)
})

let lastTime = Date.now()
function update() {
  const now = Date.now()
  const dt = Math.min((now - lastTime) * 0.001, 0.1)
  lastTime = now

  const raw = provider.pollRaw()
  const input = provider.poll(dt)
  touchSource.reflectState(raw)

  const lines = []

  // Gamepad state
  const stickParts = []
  if (raw.leftStickX || raw.leftStickY)
    stickParts.push(`L: ${raw.leftStickX.toFixed(2)}, ${raw.leftStickY.toFixed(2)}`)
  if (raw.rightStickX || raw.rightStickY)
    stickParts.push(`R: ${raw.rightStickX.toFixed(2)}, ${raw.rightStickY.toFixed(2)}`)
  if (stickParts.length) lines.push(stickParts.join('  '))

  const btns = Object.keys(raw).filter(k =>
    !k.includes('Stick') && raw[k] > 0
  )
  if (btns.length) lines.push(btns.join(', '))

  // Mapped controls
  const controls = Object.entries(input)
    .filter(([, v]) => v !== 0)
    .map(([k, v]) => `${k}: ${typeof v === 'number' ? v.toFixed(2) : v}`)
  if (controls.length) lines.push(controls.join('  '))

  // Source status
  const hw = navigator.getGamepads?.()
  const hasGamepad = hw && Array.from(hw).some(g => g != null)
  lines.push(`keyboard: on  gamepad: ${hasGamepad ? 'on' : 'off'}`)

  readout.textContent = lines.join('\n') || 'Press WASD, plug in a gamepad, or touch the SVG'
  requestAnimationFrame(update)
}
update()

preview.append(div(
  { class: 'vgp-demo' },
  keyboardSource,
  pad,
  div({ class: 'vgp-controls' }, mappingSelect, readout),
))
```
```css
.vgp-demo {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.vgp-demo svg {
  width: 50%;
  max-height: 50%;
  cursor: pointer;
}
.vgp-controls {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  max-width: 400px;
}
.vgp-demo .mapping-select {
  padding: 4px;
  font-size: 13px;
  border-radius: 4px;
}
.vgp-demo .readout {
  font-family: ui-monospace, monospace;
  font-size: 11px;
  color: #222;
  min-height: 4em;
  margin: 0;
  white-space: pre-wrap;
}
.vgp-demo [data-part].active {
  stroke-width: 24;
  filter: brightness(1.3);
}
.vgp-demo .mapping-label {
  font-size: 18px;
  fill: #000;
  opacity: 0.7;
  pointer-events: none;
}
```