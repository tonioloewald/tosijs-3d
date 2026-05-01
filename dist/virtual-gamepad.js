/*#
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
*/
import { emptyInput } from './control-input';
export function emptyGamepad() {
    return {
        leftStickX: 0,
        leftStickY: 0,
        rightStickX: 0,
        rightStickY: 0,
        buttonA: 0,
        buttonB: 0,
        buttonX: 0,
        buttonY: 0,
        leftBumper: 0,
        rightBumper: 0,
        leftTrigger: 0,
        rightTrigger: 0,
        dpadUp: 0,
        dpadDown: 0,
        dpadLeft: 0,
        dpadRight: 0,
    };
}
function maxAbs(a, b) {
    return Math.abs(a) >= Math.abs(b) ? a : b;
}
export function mergeGamepads(a, b) {
    return {
        leftStickX: maxAbs(a.leftStickX, b.leftStickX),
        leftStickY: maxAbs(a.leftStickY, b.leftStickY),
        rightStickX: maxAbs(a.rightStickX, b.rightStickX),
        rightStickY: maxAbs(a.rightStickY, b.rightStickY),
        buttonA: Math.max(a.buttonA, b.buttonA),
        buttonB: Math.max(a.buttonB, b.buttonB),
        buttonX: Math.max(a.buttonX, b.buttonX),
        buttonY: Math.max(a.buttonY, b.buttonY),
        leftBumper: Math.max(a.leftBumper, b.leftBumper),
        rightBumper: Math.max(a.rightBumper, b.rightBumper),
        leftTrigger: Math.max(a.leftTrigger, b.leftTrigger),
        rightTrigger: Math.max(a.rightTrigger, b.rightTrigger),
        dpadUp: Math.max(a.dpadUp, b.dpadUp),
        dpadDown: Math.max(a.dpadDown, b.dpadDown),
        dpadLeft: Math.max(a.dpadLeft, b.dpadLeft),
        dpadRight: Math.max(a.dpadRight, b.dpadRight),
    };
}
// --- Built-in mapping presets ---
export function bipedMapping(pad, _dt) {
    const input = emptyInput();
    input.forward = pad.leftStickY;
    input.turn = pad.leftStickX;
    input.jump = pad.buttonA;
    input.sprint = pad.leftBumper;
    input.interact = pad.buttonX;
    input.shoot = pad.buttonB;
    input.cameraZoom = pad.rightStickY;
    input.sneak = pad.dpadDown;
    return input;
}
export const bipedMappingDescriptor = {
    map: bipedMapping,
    labels: {
        leftStickY: 'move',
        leftStickX: 'turn',
        buttonA: 'jump',
        leftBumper: 'sprint',
        buttonX: 'interact',
        buttonB: 'shoot',
        rightStickY: 'camera',
        dpadDown: 'sneak',
    },
};
export function carMapping(pad, _dt) {
    const input = emptyInput();
    input.forward = pad.leftStickY;
    input.turn = pad.leftStickX;
    input.throttle = pad.rightTrigger;
    input.interact = pad.buttonX;
    input.sprint = pad.leftBumper;
    return input;
}
export const carMappingDescriptor = {
    map: carMapping,
    labels: {
        leftStickY: 'accelerate',
        leftStickX: 'steer',
        rightTrigger: 'throttle',
        buttonX: 'interact',
        leftBumper: 'nitro',
    },
};
const DEFAULT_DETENTS = {
    detents: [0.3, 0.5, 0.7],
    rate: 1.5,
};
function snapToDetent(level, detents) {
    if (detents.length === 0)
        return level;
    let closest = detents[0];
    let minDist = Math.abs(level - closest);
    for (let i = 1; i < detents.length; i++) {
        const dist = Math.abs(level - detents[i]);
        if (dist < minDist) {
            closest = detents[i];
            minDist = dist;
        }
    }
    return closest;
}
export function aircraftMapping(config) {
    const { detents, rate } = { ...DEFAULT_DETENTS, ...config };
    let throttleLevel = 0.5;
    let wasActive = false; // were triggers active last frame?
    return (pad, dt) => {
        const input = emptyInput();
        input.forward = pad.leftStickY; // pitch
        input.turn = pad.leftStickX; // yaw
        input.strafe = pad.rightStickX; // roll
        // Throttle with detent snapping
        const triggerDelta = pad.rightTrigger - pad.leftTrigger;
        const isActive = Math.abs(triggerDelta) > 0.05;
        if (isActive) {
            // Actively pushing throttle up/down
            throttleLevel += triggerDelta * rate * dt;
            throttleLevel = Math.max(0, Math.min(1, throttleLevel));
            wasActive = true;
        }
        else if (wasActive) {
            // Just released — snap to nearest detent
            throttleLevel = snapToDetent(throttleLevel, detents);
            wasActive = false;
        }
        input.throttle = throttleLevel;
        input.interact = pad.buttonX;
        input.cameraZoom = pad.rightStickY;
        return input;
    };
}
export function aircraftMappingDescriptor(config) {
    return {
        map: aircraftMapping(config),
        labels: {
            leftStickY: 'pitch',
            leftStickX: 'yaw',
            rightStickX: 'roll',
            rightTrigger: 'throttle+',
            leftTrigger: 'throttle-',
            buttonX: 'interact',
            rightStickY: 'camera',
        },
    };
}
// --- MappedInputProvider ---
export class MappedInputProvider {
    sources = [];
    mapping;
    constructor(mapping, ...sources) {
        this.mapping = mapping;
        this.sources = [...sources];
    }
    setMapping(mapping) {
        this.mapping = mapping;
    }
    addSource(source) {
        this.sources.push(source);
    }
    removeSource(source) {
        const idx = this.sources.indexOf(source);
        if (idx > -1)
            this.sources.splice(idx, 1);
    }
    /** Returns the merged VirtualGamepad before mapping — useful for visualizers */
    pollRaw() {
        let merged = emptyGamepad();
        for (const source of this.sources) {
            merged = mergeGamepads(merged, source.poll());
        }
        return merged;
    }
    poll(dt) {
        const merged = this.pollRaw();
        return this.mapping(merged, dt);
    }
}
//# sourceMappingURL=virtual-gamepad.js.map