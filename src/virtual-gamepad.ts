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
/*{ "parent": "Input", "order": 900 }*/

import type { ControlInput, InputProvider } from './control-input.js'
import { emptyInput } from './control-input.js'

export interface VirtualGamepad {
  leftStickX: number
  leftStickY: number
  rightStickX: number
  rightStickY: number
  buttonA: number
  buttonB: number
  buttonX: number
  buttonY: number
  leftBumper: number
  rightBumper: number
  leftTrigger: number
  rightTrigger: number
  dpadUp: number
  dpadDown: number
  dpadLeft: number
  dpadRight: number
  /** Start/options ("≡") button — typically opens a menu. */
  menu: number
  /** Select/view ("⧉") button — typically cycles camera/view. */
  view: number
}

export function emptyGamepad(): VirtualGamepad {
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
    menu: 0,
    view: 0,
  }
}

function maxAbs(a: number, b: number): number {
  return Math.abs(a) >= Math.abs(b) ? a : b
}

export function mergeGamepads(
  a: VirtualGamepad,
  b: VirtualGamepad
): VirtualGamepad {
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
    menu: Math.max(a.menu, b.menu),
    view: Math.max(a.view, b.view),
  }
}

export interface GamepadSource {
  poll(): VirtualGamepad

  /**
   * A STABLE name for this kind of source — `'keyboard'`, `'hardware'`,
   * `'touch'`, `'xr'` — for code that needs to find or filter one.
   *
   * Exists because the obvious alternative silently fails: an adopter matched
   * our glass pad with `constructor?.name === 'B3dGamepad'`, their bundler
   * minified class names, the lookup never matched, and the patch they built on
   * it never ran — so every experiment they reasoned from was a no-op that
   * looked like a result (tosijs-3d#14). Class names are not API; this is.
   *
   * Optional so a consumer's own source needn't declare one.
   */
  readonly kind?: string
}

/**
 * THE SIGN CONTRACT every source must honour: **up / forward is POSITIVE**, on
 * both sticks and on every device.
 *
 * Written down as a constant because it was documented in three places and
 * enforced in none, which cost a day: a device that disagrees is internally
 * consistent, so only a player with two devices ever notices, and the bug
 * presents as "the framework is broken" rather than "one source is inverted".
 * `stick-sign.test.ts` asserts it across the sources.
 */
export const STICK_UP_IS_POSITIVE = true

export type InputMapping = (pad: VirtualGamepad, dt: number) => ControlInput

/** Labels for each gamepad control — used by UI visualizers */
export type MappingLabels = Partial<Record<keyof VirtualGamepad, string>>

export interface InputMappingDescriptor {
  map: InputMapping
  labels: MappingLabels
}

// --- Built-in mapping presets ---

export function bipedMapping(pad: VirtualGamepad, _dt: number): ControlInput {
  const input = emptyInput()
  /*
  GTA V LAYOUT: the left stick MOVES, the right stick TURNS.

  The biped was tank-controlled — left stick X turned the body — which nobody
  has muscle memory for any more, and it left the right stick doing camera work
  that could not steer. Turning the BODY with the right stick makes swim
  direction and body facing ONE thing rather than two that can disagree, which
  is what made look-directed swimming fiddly to control.

  Left stick X becomes strafe, which is worth having on land regardless.
  */
  input.forward = pad.leftStickY
  input.strafe = pad.leftStickX
  input.turn = pad.rightStickX
  // Right trigger, not left bumper: movement is the LEFT stick, so a left-hand
  // sprint modifier fights the left thumb. Right trigger frees that up.
  input.sprint = pad.rightTrigger
  input.interact = pad.buttonX
  input.shoot = pad.buttonB
  /*
  Right stick Y is PITCH — the camera's, and while swimming the body's. There is
  no separate camera yaw, because X turns the body and the camera follows it, so
  the view cannot be left pointing somewhere the character is not.

  It used to be zoom (Y) and a snap-back peek (X), which meant a character had
  no aim at all: nothing to point at a thing, and — once swimming arrived —
  nothing to point DOWN with. Zoom moved to the d-pad, which sneak vacated.
  */
  input.lookY = pad.rightStickY
  // Signed: up zooms out, down zooms in. It was wrapped in `Math.max(0, …)`,
  // which silently discarded the entire zoom-in half — down produced 0, not −1,
  // so the camera could only ever retreat. Tonio: "d-pad up zooms out and I
  // can't zoom in."
  input.cameraZoom = pad.dpadUp - pad.dpadDown
  /*
  BUMPERS for the two vertical verbs: left bumper sneak, right bumper jump.

  `buttonA` deliberately does NOT jump, though it did originally and I kept it
  as an alias on the grounds that A-to-jump is conventional. Tonio's call, and
  the better one: the face buttons are **reserved for actions**, because they
  are primary and secondary fire on the aircraft and a control vocabulary that
  changes meaning per vehicle is a vocabulary you have to relearn. A convention
  borrowed from other games is worth less than consistency within this one.
  */
  input.jump = pad.rightBumper
  input.sneak = pad.leftBumper
  // Camera toggle: glass-gamepad view button, or Y (reachable on a controller).
  input.view = Math.max(pad.view, pad.buttonY)
  return input
}

export const bipedMappingDescriptor: InputMappingDescriptor = {
  map: bipedMapping,
  labels: {
    leftStickY: 'move',
    leftStickX: 'strafe',
    rightStickX: 'turn',
    rightBumper: 'jump',
    leftBumper: 'sneak',
    rightTrigger: 'sprint',
    buttonX: 'interact',
    buttonB: 'shoot',
    rightStickY: 'pitch',
    dpadUp: 'zoom',
  },
}

export function carMapping(pad: VirtualGamepad, _dt: number): ControlInput {
  const input = emptyInput()
  input.forward = pad.leftStickY
  input.turn = pad.leftStickX
  input.throttle = pad.rightTrigger
  input.interact = pad.buttonX
  input.sprint = pad.leftBumper
  return input
}

export const carMappingDescriptor: InputMappingDescriptor = {
  map: carMapping,
  labels: {
    leftStickY: 'accelerate',
    leftStickX: 'steer',
    rightTrigger: 'throttle',
    buttonX: 'interact',
    leftBumper: 'nitro',
  },
}

export interface ThrottleDetentConfig {
  /** Detent levels as fractions 0..1 (e.g. [0.3, 0.5, 0.7]). Sorted ascending. */
  detents: number[]
  /** How fast the throttle moves (full range per second). Default 1.5 */
  rate: number
}

/**
 * Preferences that change what an axis MEANS, which is the mapping's job and
 * nobody else's.
 *
 * `invertPitch` is the one nearly every project eventually wants: we ship the
 * flight-stick convention (pull back = nose up) and a large slice of players
 * expect the arcade one. Without this knob the natural place to implement it is
 * `entity.inputProvider` — which is per-entity and per-consumer, so the keyboard
 * ends up inverted and the glass gamepad doesn't, from a setting that was meant
 * to be global. That happened (tosijs-3d#10, reported by manta-recon); the
 * mapping is the only layer every source passes through.
 */
export interface AircraftMappingConfig extends Partial<ThrottleDetentConfig> {
  /** Push forward = nose up (arcade), instead of the flight-stick convention. */
  invertPitch?: boolean
  /** Reverse the bank/turn axis. */
  invertRoll?: boolean
  /** Reverse the look/camera pitch axis. */
  invertCameraY?: boolean
}

export function aircraftMapping(config?: AircraftMappingConfig): InputMapping {
  const pitchSign = config?.invertPitch ? 1 : -1
  const rollSign = config?.invertRoll ? -1 : 1
  const cameraYSign = config?.invertCameraY ? 1 : -1
  return (pad: VirtualGamepad): ControlInput => {
    const input = emptyInput()

    // Inverted on purpose — pull back (stick toward you) = nose UP, classic flight
    // stick convention. Without this, pulling back drops the nose. `invertPitch`
    // flips it for projects that want the arcade convention.
    input.pitch = pitchSign * pad.leftStickY
    input.turn = rollSign * pad.leftStickX // bank → turn
    // RIGHT STICK IS THE CAMERA, not a control surface. Aux roll on the right
    // stick was near-useless (the left stick already banks, and bank-to-turn
    // means a second roll axis fights it); swinging the view is what a pilot
    // actually reaches for. Springs back to centre — see b3d-aircraft.
    input.lookX = pad.rightStickX
    // Negated to match the left stick's convention (up = positive), so
    // positive lookY means "look from ABOVE" in both views.
    input.lookY = cameraYSign * pad.rightStickY
    // Trigger axis is the VTOL controller's dual-purpose lift: + (right trigger) =
    // climb when hovering / speed-up when flying; − (left trigger) = descend / slow
    // down. The flight model integrates it per-regime (no detents — direct rate).
    input.lift = pad.rightTrigger - pad.leftTrigger

    // Camera toggle: the glass-gamepad "view" button, or the Y face button (so
    // it's reachable on an XR controller / hardware pad without a view button).
    input.view = Math.max(pad.view, pad.buttonY)
    input.interact = pad.buttonX
    input.cameraZoom = 0 // (was right-stick Y; that axis is LOOK now)

    // Weapons (the combat slice): guns held, missile + bomb edge-fired. Button choice
    // is XR-driven — Y is taken for `view` and X for `menu` (XR controllers overload
    // those), and the LEFT bumper chords badly with the left stick (move/aim), so:
    //   A = guns, B = missile (adjacent face buttons), RIGHT bumper = bomb.
    input.shoot = pad.buttonA // cannon — A (held)
    input.aim = pad.buttonB // fire guided missile — B (edge-detected)
    input.jump = pad.rightBumper // drop bomb — right bumper (edge; left chords with the stick)

    return input
  }
}

export function aircraftMappingDescriptor(
  config?: AircraftMappingConfig
): InputMappingDescriptor {
  return {
    map: aircraftMapping(config),
    labels: {
      leftStickY: 'pitch',
      leftStickX: 'turn',
      rightStickX: 'look',
      rightTrigger: 'up / faster',
      leftTrigger: 'down / slower',
      buttonX: 'interact',
      rightStickY: 'look up/down',
      rightBumper: 'guns',
      buttonA: 'guns',
      buttonB: 'bomb',
      leftBumper: 'missile',
    },
  }
}

// --- MappedInputProvider ---

export class MappedInputProvider implements InputProvider {
  private sources: GamepadSource[] = []
  mapping: InputMapping

  constructor(mapping: InputMapping, ...sources: GamepadSource[]) {
    this.mapping = mapping
    this.sources = [...sources]
  }

  setMapping(mapping: InputMapping) {
    this.mapping = mapping
  }

  addSource(source: GamepadSource) {
    this.sources.push(source)
  }

  removeSource(source: GamepadSource) {
    const idx = this.sources.indexOf(source)
    if (idx > -1) this.sources.splice(idx, 1)
  }

  /** Returns the merged VirtualGamepad before mapping — useful for visualizers */
  pollRaw(): VirtualGamepad {
    let merged = emptyGamepad()
    for (const source of this.sources) {
      merged = mergeGamepads(merged, source.poll())
    }
    return merged
  }

  poll(dt: number): ControlInput {
    const merged = this.pollRaw()
    return this.mapping(merged, dt)
  }
}
