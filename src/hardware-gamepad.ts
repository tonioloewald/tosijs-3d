/*#
# hardware-gamepad

Maps a physical gamepad (via `navigator.getGamepads()`) to a `VirtualGamepad`.
Uses the Standard Gamepad layout (axes 0-3, buttons 0-16).

Configurable deadzone filters stick drift.
*/

import type { VirtualGamepad, GamepadSource } from './virtual-gamepad'
import { emptyGamepad } from './virtual-gamepad'

function applyDeadzone(value: number, deadzone: number): number {
  if (Math.abs(value) < deadzone) return 0
  const sign = Math.sign(value)
  return sign * ((Math.abs(value) - deadzone) / (1 - deadzone))
}

export class HardwareGamepadSource implements GamepadSource {
  deadzone: number
  gamepadIndex: number

  constructor(options: { deadzone?: number; gamepadIndex?: number } = {}) {
    this.deadzone = options.deadzone ?? 0.15
    this.gamepadIndex = options.gamepadIndex ?? -1 // -1 = first connected
  }

  poll(): VirtualGamepad {
    const pad = emptyGamepad()
    const gamepads = navigator.getGamepads()
    if (!gamepads) return pad

    let gp: Gamepad | null = null
    if (this.gamepadIndex >= 0) {
      gp = gamepads[this.gamepadIndex]
    } else {
      for (const g of gamepads) {
        if (g) {
          gp = g
          break
        }
      }
    }
    if (!gp) return pad

    const dz = this.deadzone

    // Standard Gamepad axes
    if (gp.axes.length >= 2) {
      pad.leftStickX = applyDeadzone(gp.axes[0], dz)
      pad.leftStickY = applyDeadzone(-gp.axes[1], dz) // invert Y (up = positive)
    }
    if (gp.axes.length >= 4) {
      pad.rightStickX = applyDeadzone(gp.axes[2], dz)
      pad.rightStickY = applyDeadzone(-gp.axes[3], dz)
    }

    // Standard Gamepad buttons
    const b = gp.buttons
    if (b.length >= 17) {
      pad.buttonA = b[0].value
      pad.buttonB = b[1].value
      pad.buttonX = b[2].value
      pad.buttonY = b[3].value
      pad.leftBumper = b[4].value
      pad.rightBumper = b[5].value
      pad.leftTrigger = b[6].value
      pad.rightTrigger = b[7].value
      // b[8] = select/back, b[9] = start
      // b[10] = left stick press, b[11] = right stick press
      pad.dpadUp = b[12].value
      pad.dpadDown = b[13].value
      pad.dpadLeft = b[14].value
      pad.dpadRight = b[15].value
    }

    return pad
  }
}
