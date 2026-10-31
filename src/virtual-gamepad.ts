/*#
# virtual-gamepad

Standardized virtual gamepad abstraction. All input sources (keyboard, hardware gamepad,
XR controllers, touch) produce a `VirtualGamepad`, and each entity type defines an
`InputMapping` that converts it to `ControlInput`. `inputFocus` and `b3dController`
wire all of this for you; this page is for when you assemble it yourself.

## Demo

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

let lastTime = performance.now()
function update() {
  const now = performance.now()
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

Try the controls above — press WASD, plug in a gamepad, or touch the SVG.
All sources merge and drive the same readout.

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
| `menu`, `view` | 0..1 | Menu (start) and view (select) buttons |
| `leftStickPress/rightStickPress` | 0..1 | Pressing a stick in (L3, R3) |

## InputMapping

A function `(pad, dt) => ControlInput` that maps gamepad state to entity-specific
controls. Can be a closure with persistent state (e.g. throttle accumulator for aircraft).

Built-in presets: `bipedMapping`, `carMapping`, `aircraftMapping()`.

Each preset has a matching descriptor (e.g. `bipedMappingDescriptor`) that pairs
the mapping function with human-readable labels for UI visualizers:

```typescript
bipedMappingDescriptor.labels
// { leftStickY: 'move', buttonA: 'jump', leftBumper: 'sneak', rightTrigger: 'sprint / fire', ... }
```

## MappedInputProvider

Bridges gamepad sources to the `InputProvider` interface. Merges multiple sources,
runs through the active mapping, produces `ControlInput`.

- `addSource(source)` / `removeSource(source)` — hot-swap input devices
- `setMapping(mapping)` — switch mappings at runtime (e.g. entering a vehicle)
- `pollRaw()` — get the merged `VirtualGamepad` before mapping (for visualizers)

## Sources

### Keyboard and mouse

`KeyboardGamepadSource` (element creator `keyboardGamepad()`) turns keys and the
mouse into a `VirtualGamepad`, with attack/decay smoothing so digital keys feel
analog. It is an element: append it to the page (as the demo does) so it listens.

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

The mouse wheel adjusts the ZOOM axis (d-pad up/down), not the look stick.

### Hardware gamepad

`new HardwareGamepadSource({ deadzone, gamepadIndex })` reads
`navigator.getGamepads()` with the Standard Gamepad layout (axes 0-3, buttons 0-16).
`deadzone` (default `0.15`) filters stick drift; `gamepadIndex` `-1` (default) takes
the first connected pad.

### XR controllers

`new XrGamepadSource(xrControllers(xrHelper))` adapts the live XR controllers, so whatever a
mapping does flat it does in VR, with no per-entity XR code. Standard
`xr-standard-*` mappings (Quest / oculus-touch layout):

| VirtualGamepad | XR component |
| --- | --- |
| `leftStickX/Y`, `rightStickX/Y` | `xr-standard-thumbstick` (Y inverted: up = +) |
| `leftTrigger`, `rightTrigger` | `xr-standard-trigger` |
| `leftBumper`, `rightBumper` | `xr-standard-squeeze` (grip) |
| `buttonA`, `buttonB` | right `a-button`, `b-button` |
| `buttonX`, `buttonY` | left `x-button`, `y-button` |
| `leftStickPress`, `rightStickPress` | pressing `xr-standard-thumbstick` |

### Touch

`TouchGamepadSource` reads an on-screen SVG pad; see
[touch-gamepad](/touch-gamepad/) and the [glass gamepad](/glass-gamepad/).

## Drawing a pad

`gamepadSvg(colors?)` draws the controller used in the demo. Its parts carry
`data-part` attributes (not ids), so several can be on one page.

```javascript
import { gamepadSvg } from 'tosijs-3d'

const pad = gamepadSvg() // default colours
const dark = gamepadSvg({ controllerColor: '#333', widgetColor: '#888' })
```

| Colour | Default | Used by |
|--------|---------|---------|
| `strokeColor` | `#000000` | All stroked elements |
| `strokeWidth` | `16` | All stroked elements |
| `widgetColor` | `#ffffff` | Bumpers, triggers, dpad, sticks, menu, view |
| `controllerColor` | `#aaaaaa` | Controller body |
| `stickTravelColor` | `#505050` | Stick travel circles |
| `fillA` | `#ff1d25` | A button (red) |
| `fillB` | `#fcee22` | B button (yellow) |
| `fillX` | `#8cc63f` | X button (green) |
| `fillY` | `#3ea9f5` | Y button (blue) |

## Keys and text fields

The keyboard source listens on `window`, so you steer without clicking the canvas
first. A page also has search boxes and forms, so every global key listener here
first asks `isTextEntry(event)`: is the person typing into something? If so the key
is left alone. It is a question asked of the event rather than a mode, so it
cannot go stale and covers elements nobody planned for.

What counts: `<input>` (except button-like ones such as checkboxes), `<textarea>`,
`<select>`, anything `contenteditable`, and anything with a
`textbox`/`searchbox`/`combobox` role. It checks `composedPath` first, so an input
inside a shadow root is recognised.

```javascript
import { isTextEntry } from 'tosijs-3d'

window.addEventListener('keydown', (event) => {
  if (isTextEntry(event)) return // the person is typing
  // ...your shortcut
})
```
*/
/*{ "parent": "input-internals", "order": 30 }*/

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
  /** Pressing the left stick in (L3). */
  leftStickPress: number
  /** Pressing the right stick in (R3). */
  rightStickPress: number
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
    leftStickPress: 0,
    rightStickPress: 0,
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
    leftStickPress: Math.max(a.leftStickPress, b.leftStickPress),
    rightStickPress: Math.max(a.rightStickPress, b.rightStickPress),
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

export type InputMapping = ((pad: VirtualGamepad, dt: number) => ControlInput) & {
  /**
   * Rewrites a KEYBOARD source's pad before the sources merge. For a mapping
   * whose pad layout has no keyboard equivalent: the car's pedals are the
   * triggers, and W/S are the left stick, so the car moves W/S onto the
   * triggers for the keyboard alone (a pad's left stick only steers).
   */
  keyboard?: (pad: VirtualGamepad) => VirtualGamepad
}

/** Labels for each gamepad control — used by UI visualizers */
export type MappingLabels = Partial<Record<keyof VirtualGamepad, string>>

export interface InputMappingDescriptor {
  map: InputMapping
  labels: MappingLabels
}

// --- Built-in mapping presets ---

/**
 * @param gunplay Weapon raised. The right trigger changes job across this line
 * and nothing else does — see the block comment below.
 */
export function bipedMapping(
  pad: VirtualGamepad,
  _dt: number,
  gunplay = false
): ControlInput {
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
  input.interact = pad.buttonX
  /*
  THE RIGHT TRIGGER CHANGES JOB WITH THE WEAPON, and nothing else does.

  Tonio: *"Why not right trigger to shoot? I should be able to toggle between
  walking and gunplay mode, and be aiming when I am in gunplay."* Right on both
  counts, and the mode is what makes the mapping possible rather than a fight
  over one button.

  The trigger used to sprint permanently, with a real argument behind it:
  movement is the left stick, so a left-hand sprint modifier fights the left
  thumb. That argument still holds — which is why sprint stays on the right
  trigger for the half of the game where you are not shooting. GTA V's own
  resolution, and the reason it needs no displaced control: you cannot sprint
  while aiming a weapon anyway, so the two never want the trigger at once.

  Weapon raised: right trigger FIRES, left trigger aims down the sights, and
  sprint is unavailable. Weapon down: right trigger sprints and the gun does
  nothing. `buttonB` stays a fire alias so a pad without usable triggers — and
  the glass pad, where a trigger is a poor touch target — can still shoot.
  */
  if (gunplay) {
    input.shoot = Math.max(pad.rightTrigger, pad.buttonB)
    input.aim = pad.leftTrigger
  } else {
    input.sprint = pad.rightTrigger
  }
  /*
  RAISE AND LOWER on A, which is the one face button the biped left unused.

  It does not jump — that was Tonio's call and it is why the button was free —
  so the key everyone presses expecting something now does something, and the
  thing it does is the mode this whole mapping turns on.
  */
  // (weapon is set with jump below — one place, so they cannot drift apart)
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
  /*
  RIGHT BUMPER RAISES AND LOWERS THE WEAPON; A JUMPS.

  Tonio: *"having right bumper toggle weapon ready mode is probably the best
  option (and not a bad option in general ... a lot of games use the button we're
  using for view toggle to toggle weapon ready mode)."*

  ⚠️ This moves JUMP onto `buttonA`, which reverses an earlier call recorded
  right here — that the face buttons are reserved for actions, so that a control
  vocabulary does not change meaning per vehicle. That reasoning still stands for
  the aircraft. It is being overruled for the biped because a shoulder button is
  where every third-person shooter puts weapon-ready, A-to-jump is the single
  most universal convention there is, and a mode you toggle constantly deserves
  the better button. Easily reverted if it plays worse than it reads.
  */
  // Clicking the right stick toggles it too (R3), so both clicks do something.
  input.weapon = Math.max(pad.rightBumper, pad.rightStickPress)
  input.jump = pad.buttonA
  // Clicking the left stick sneaks too, as L3 does in GTA V.
  input.sneak = Math.max(pad.leftBumper, pad.leftStickPress)
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
    rightBumper: 'weapon',
    rightStickPress: 'weapon',
    buttonA: 'jump',
    leftBumper: 'sneak',
    leftStickPress: 'sneak',
    // The trigger's label is mode-dependent and a descriptor is not, so it
    // names both rather than picking the half that happens to be true now.
    rightTrigger: 'sprint / fire',
    leftTrigger: 'aim',
    buttonX: 'interact',
    buttonB: 'fire',
    rightStickY: 'pitch',
    dpadUp: 'zoom',
  },
}

/*
GTA V's driving layout: the right trigger is the accelerator, the left the brake
(held, it reverses), the left stick ONLY steers, the right stick looks around.
On a keyboard W/S drive as before: `carMapping.keyboard` moves them onto the
triggers for the keyboard alone.
*/
export const carMapping: InputMapping = Object.assign(
  (pad: VirtualGamepad, _dt: number): ControlInput => {
    const input = emptyInput()
    input.forward = pad.rightTrigger - pad.leftTrigger
    input.throttle = pad.rightTrigger
    input.turn = pad.leftStickX
    input.lookX = pad.rightStickX
    input.lookY = pad.rightStickY
    input.interact = pad.buttonX
    input.sprint = pad.leftBumper
    input.jump = Math.max(pad.buttonA, pad.rightBumper)
    return input
  },
  {
    keyboard: (pad: VirtualGamepad): VirtualGamepad => ({
      ...pad,
      rightTrigger: Math.max(pad.rightTrigger, pad.leftStickY),
      leftTrigger: Math.max(pad.leftTrigger, -pad.leftStickY),
      leftStickY: 0,
    }),
  }
)

export const carMappingDescriptor: InputMappingDescriptor = {
  map: carMapping,
  labels: {
    leftStickX: 'steer',
    rightStickX: 'look',
    rightStickY: 'look',
    rightTrigger: 'accelerate',
    leftTrigger: 'brake / reverse',
    buttonA: 'handbrake',
    rightBumper: 'handbrake',
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
    const keyboard = this.mapping.keyboard
    for (const source of this.sources) {
      const pad = source.poll()
      merged = mergeGamepads(
        merged,
        keyboard && source.kind === 'keyboard' ? keyboard(pad) : pad
      )
    }
    return merged
  }

  poll(dt: number): ControlInput {
    const merged = this.pollRaw()
    return this.mapping(merged, dt)
  }
}
