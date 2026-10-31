import { describe, expect, test } from 'bun:test'
import {
  carMapping,
  emptyGamepad,
  MappedInputProvider,
  type GamepadSource,
  type VirtualGamepad,
} from './virtual-gamepad.js'

const pad = (over: Partial<VirtualGamepad> = {}): VirtualGamepad => ({ ...emptyGamepad(), ...over })
const source = (kind: string, over: Partial<VirtualGamepad>): GamepadSource => ({
  kind,
  poll: () => pad(over),
})

describe('the car mapping (GTA V)', () => {
  test('the right trigger accelerates, the left brakes and reverses', () => {
    expect(carMapping(pad({ rightTrigger: 1 }), 0).forward).toBe(1)
    expect(carMapping(pad({ leftTrigger: 0.5 }), 0).forward).toBe(-0.5)
  })

  test('on a pad the left stick only steers', () => {
    const input = carMapping(pad({ leftStickY: 1, leftStickX: -0.4 }), 0)
    expect(input.forward).toBe(0)
    expect(input.turn).toBe(-0.4)
  })

  test('the right stick looks around', () => {
    const input = carMapping(pad({ rightStickX: 0.3, rightStickY: -0.6 }), 0)
    expect(input.lookX).toBe(0.3)
    expect(input.lookY).toBe(-0.6)
  })

  test('on a keyboard W and S still drive', () => {
    const w = new MappedInputProvider(carMapping, source('keyboard', { leftStickY: 1 }))
    expect(w.poll(0).forward).toBe(1)
    const s = new MappedInputProvider(carMapping, source('keyboard', { leftStickY: -1 }))
    expect(s.poll(0).forward).toBe(-1)
    // Only the keyboard: a hardware pad's stick is left alone.
    const p = new MappedInputProvider(carMapping, source('hardware', { leftStickY: 1 }))
    expect(p.poll(0).forward).toBe(0)
  })
})
