/*#
# virtual-gamepad

Standardized virtual gamepad abstraction. All input sources (keyboard, hardware gamepad,
XR controllers, touch) produce a `VirtualGamepad`, and each entity type defines an
`InputMapping` that converts it to `ControlInput`.

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

## MappedInputProvider

Bridges gamepad sources to the `InputProvider` interface. Merges multiple sources,
runs through the active mapping, produces `ControlInput`.
*/

import type { ControlInput, InputProvider } from './control-input'
import { emptyInput } from './control-input'

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
  }
}

export interface GamepadSource {
  poll(): VirtualGamepad
}

export type InputMapping = (pad: VirtualGamepad, dt: number) => ControlInput

// --- Built-in mapping presets ---

export function bipedMapping(pad: VirtualGamepad, _dt: number): ControlInput {
  const input = emptyInput()
  input.forward = pad.leftStickY
  input.turn = pad.leftStickX
  input.jump = pad.buttonA
  input.sprint = pad.leftBumper
  input.interact = pad.buttonX
  input.shoot = pad.buttonB
  input.cameraZoom = pad.rightStickY
  input.sneak = pad.dpadDown
  return input
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

export interface ThrottleDetentConfig {
  /** Detent levels as fractions 0..1 (e.g. [0.3, 0.5, 0.7]). Sorted ascending. */
  detents: number[]
  /** How fast the throttle moves (full range per second). Default 1.5 */
  rate: number
}

const DEFAULT_DETENTS: ThrottleDetentConfig = {
  detents: [0.3, 0.5, 0.7],
  rate: 1.5,
}

function snapToDetent(level: number, detents: number[]): number {
  if (detents.length === 0) return level
  let closest = detents[0]
  let minDist = Math.abs(level - closest)
  for (let i = 1; i < detents.length; i++) {
    const dist = Math.abs(level - detents[i])
    if (dist < minDist) {
      closest = detents[i]
      minDist = dist
    }
  }
  return closest
}

export function aircraftMapping(
  config?: Partial<ThrottleDetentConfig>
): InputMapping {
  const { detents, rate } = { ...DEFAULT_DETENTS, ...config }
  let throttleLevel = 0.5
  let wasActive = false // were triggers active last frame?

  return (pad: VirtualGamepad, dt: number): ControlInput => {
    const input = emptyInput()

    input.forward = pad.leftStickY // pitch
    input.turn = pad.leftStickX // yaw
    input.strafe = pad.rightStickX // roll

    // Throttle with detent snapping
    const triggerDelta = pad.rightTrigger - pad.leftTrigger
    const isActive = Math.abs(triggerDelta) > 0.05

    if (isActive) {
      // Actively pushing throttle up/down
      throttleLevel += triggerDelta * rate * dt
      throttleLevel = Math.max(0, Math.min(1, throttleLevel))
      wasActive = true
    } else if (wasActive) {
      // Just released — snap to nearest detent
      throttleLevel = snapToDetent(throttleLevel, detents)
      wasActive = false
    }

    input.throttle = throttleLevel

    input.interact = pad.buttonX
    input.cameraZoom = pad.rightStickY

    return input
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

  poll(dt: number): ControlInput {
    let merged = emptyGamepad()
    for (const source of this.sources) {
      merged = mergeGamepads(merged, source.poll())
    }
    return this.mapping(merged, dt)
  }
}
