/*#
# keyboard-gamepad

Maps keyboard and mouse input to a `VirtualGamepad`. Uses attack/decay smoothing
for responsive analog-feel from digital keys.

## Default Key Map

| VirtualGamepad | Keys |
|----------------|------|
| leftStick Y | W (+) / S (-) |
| leftStick X | D (+) / A (-) |
| rightStick Y | (unused) |
| rightStick X | ArrowRight (+) / ArrowLeft (-) |
| buttonA | Space |
| buttonB | F |
| buttonX | E |
| leftBumper | ShiftLeft |
| leftTrigger | Q |
| rightTrigger | R |
| dpadDown | G (toggle) |

Mouse wheel adjusts rightStick Y (for camera zoom).
*/

import { Component } from 'tosijs'
import type { VirtualGamepad, GamepadSource } from './virtual-gamepad'
import { emptyGamepad } from './virtual-gamepad'

function keycode(evt: KeyboardEvent): string {
  return evt.code.replace(/Key|Digit/, '')
}

function clamp(min: number, x: number, max: number): number {
  return x < min ? min : x > max ? max : x
}

type AxisDef = {
  field: keyof VirtualGamepad
  positiveKeys: string[]
  negativeKeys: string[]
  attack: number
  decay: number
}

type ButtonDef = {
  field: keyof VirtualGamepad
  keys: string[]
  attack: number
  decay: number
  type?: 'toggle'
}

const DEFAULT_AXES: AxisDef[] = [
  {
    field: 'leftStickY',
    positiveKeys: ['W'],
    negativeKeys: ['S'],
    attack: 2,
    decay: 5,
  },
  {
    field: 'leftStickX',
    positiveKeys: ['D'],
    negativeKeys: ['A'],
    attack: 2,
    decay: 5,
  },
  {
    field: 'rightStickX',
    positiveKeys: ['ArrowRight'],
    negativeKeys: ['ArrowLeft'],
    attack: 2,
    decay: 5,
  },
]

const DEFAULT_BUTTONS: ButtonDef[] = [
  { field: 'buttonA', keys: ['Space'], attack: 5, decay: 10 },
  { field: 'buttonB', keys: ['F'], attack: 5, decay: 10 },
  { field: 'buttonX', keys: ['E'], attack: 5, decay: 10 },
  { field: 'leftBumper', keys: ['ShiftLeft'], attack: 5, decay: 10 },
  { field: 'leftTrigger', keys: ['Q'], attack: 5, decay: 10 },
  { field: 'rightTrigger', keys: ['R'], attack: 5, decay: 10 },
  { field: 'dpadDown', keys: ['G'], attack: 5, decay: 10, type: 'toggle' },
]

export class KeyboardGamepadSource extends Component implements GamepadSource {
  static initAttributes = {
    wheelSensitivity: 1,
    updateIntervalMs: 33,
  }

  private axes = DEFAULT_AXES
  private buttons = DEFAULT_BUTTONS
  private pressedKeys = new Set<string>()
  private axisState: Record<string, number> = {}
  private buttonState: Record<string, number> = {}
  private wheelAccum = 0
  private interval = 0
  private lastUpdate = 0

  poll(): VirtualGamepad {
    const pad = emptyGamepad()

    for (const axis of this.axes) {
      pad[axis.field] = this.axisState[axis.field] ?? 0
    }
    for (const btn of this.buttons) {
      ;(pad as any)[btn.field] = this.buttonState[btn.field] ?? 0
    }

    // Mouse wheel → rightStickY (consumed each poll)
    pad.rightStickY = clamp(-1, this.wheelAccum, 1)
    this.wheelAccum *= 0.8 // decay wheel toward 0

    return pad
  }

  private _handleKeyDown = (event: KeyboardEvent) => {
    this.pressedKeys.add(keycode(event))

    // Handle toggles on press
    for (const btn of this.buttons) {
      if (btn.type !== 'toggle') continue
      if (btn.keys.some((k) => k === keycode(event))) {
        this.buttonState[btn.field] = 1 - (this.buttonState[btn.field] ?? 0)
      }
    }
  }

  private _handleKeyUp = (event: KeyboardEvent) => {
    this.pressedKeys.delete(keycode(event))
  }

  private _handleWheel = (event: WheelEvent) => {
    this.wheelAccum = clamp(
      -1,
      this.wheelAccum + event.deltaY * (this as any).wheelSensitivity * 0.01,
      1
    )
  }

  private _updateSmoothing = () => {
    const now = Date.now()
    const dt = (now - this.lastUpdate) * 0.001
    this.lastUpdate = now

    // Axes: positive/negative keys produce -1..1
    for (const axis of this.axes) {
      const posPressed = axis.positiveKeys.some((k) => this.pressedKeys.has(k))
      const negPressed = axis.negativeKeys.some((k) => this.pressedKeys.has(k))

      let target = 0
      if (posPressed && !negPressed) target = 1
      else if (negPressed && !posPressed) target = -1

      const current = this.axisState[axis.field] ?? 0
      if (
        Math.abs(target) > Math.abs(current) ||
        Math.sign(target) !== Math.sign(current)
      ) {
        // Moving toward target: use attack rate
        const step = axis.attack * dt
        if (Math.abs(target - current) < step) {
          this.axisState[axis.field] = target
        } else {
          this.axisState[axis.field] =
            current + Math.sign(target - current) * step
        }
      } else {
        // Decaying toward target: use decay rate
        const step = axis.decay * dt
        if (Math.abs(target - current) < step) {
          this.axisState[axis.field] = target
        } else {
          this.axisState[axis.field] =
            current + Math.sign(target - current) * step
        }
      }
    }

    // Buttons (non-toggle): 0..1 with attack/decay
    for (const btn of this.buttons) {
      if (btn.type === 'toggle') continue
      const pressed = btn.keys.some((k) => this.pressedKeys.has(k))
      const current = this.buttonState[btn.field] ?? 0
      if (pressed) {
        this.buttonState[btn.field] = Math.min(1, current + btn.attack * dt)
      } else {
        this.buttonState[btn.field] = Math.max(0, current - btn.decay * dt)
      }
    }
  }

  connectedCallback() {
    super.connectedCallback()
    this.pressedKeys = new Set()
    this.axisState = {}
    this.buttonState = {}
    this.lastUpdate = Date.now()
    this.interval = window.setInterval(
      this._updateSmoothing,
      (this as any).updateIntervalMs
    )
    window.addEventListener('keydown', this._handleKeyDown)
    window.addEventListener('keyup', this._handleKeyUp)
    window.addEventListener('wheel', this._handleWheel, {
      passive: false,
    })
  }

  disconnectedCallback() {
    clearInterval(this.interval)
    this.interval = 0
    window.removeEventListener('keydown', this._handleKeyDown)
    window.removeEventListener('keyup', this._handleKeyUp)
    window.removeEventListener('wheel', this._handleWheel)
    super.disconnectedCallback()
  }
}

export const keyboardGamepad = KeyboardGamepadSource.elementCreator({
  tag: 'tosi-keyboard-gamepad',
})
