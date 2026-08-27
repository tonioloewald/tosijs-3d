import { describe, test, expect } from 'bun:test'
import { bipedMapping, type VirtualGamepad } from './virtual-gamepad'

/**
 * A neutral pad. Every field zero, so a test states only what it presses — and
 * a control that quietly reads something it should not shows up as a surprise.
 */
function pad(over: Partial<VirtualGamepad> = {}): VirtualGamepad {
  const zero = {
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
    start: 0,
    select: 0,
    view: 0,
  }
  return { ...zero, ...over } as VirtualGamepad
}

describe('bipedMapping: the right stick is LOOK', () => {
  /*
  This layer is exactly what a live test bypasses. Swimming "where you look" was
  verified by injecting lookY straight onto the ControlInput, which proved the
  model and never touched the mapping — where the stick was still bound to zoom,
  so in play there was no aim at all.
  */
  test('right stick drives lookX / lookY', () => {
    const i = bipedMapping(
      pad({ rightStickX: 0.5, rightStickY: -0.25 }),
      1 / 60
    )
    expect(i.lookX).toBeCloseTo(0.5, 9)
    expect(i.lookY).toBeCloseTo(-0.25, 9)
  })

  test('the right stick no longer zooms', () => {
    const i = bipedMapping(pad({ rightStickY: 1 }), 1 / 60)
    expect(i.cameraZoom).toBe(0)
  })

  test('zoom moved to the d-pad, which sneak vacated', () => {
    expect(bipedMapping(pad({ dpadUp: 1 }), 1 / 60).cameraZoom).toBe(1)
    expect(bipedMapping(pad({ dpadDown: 1 }), 1 / 60).cameraZoom).toBe(0)
  })
})

describe('bipedMapping: bumpers carry the vertical verbs', () => {
  test('left bumper is sneak', () => {
    expect(bipedMapping(pad({ leftBumper: 1 }), 1 / 60).sneak).toBe(1)
  })

  test('right bumper is jump', () => {
    expect(bipedMapping(pad({ rightBumper: 1 }), 1 / 60).jump).toBe(1)
  })

  test('A does NOT jump — the face buttons are reserved for actions', () => {
    // They are primary/secondary fire on the aircraft, and a control vocabulary
    // that changes meaning per vehicle is one you have to relearn. Consistency
    // within this project beats a convention borrowed from other games.
    expect(bipedMapping(pad({ buttonA: 1 }), 1 / 60).jump).toBe(0)
  })

  test('the d-pad no longer sneaks', () => {
    expect(bipedMapping(pad({ dpadDown: 1 }), 1 / 60).sneak).toBe(0)
  })
})

describe('bipedMapping: nothing else moved', () => {
  test('movement stays on the left stick', () => {
    const i = bipedMapping(pad({ leftStickY: 0.8, leftStickX: -0.3 }), 1 / 60)
    expect(i.forward).toBeCloseTo(0.8, 9)
    expect(i.turn).toBeCloseTo(-0.3, 9)
  })

  test('sprint stays on the right trigger, away from the left thumb', () => {
    expect(bipedMapping(pad({ rightTrigger: 1 }), 1 / 60).sprint).toBe(1)
  })

  test('a neutral pad asks for nothing at all', () => {
    const i = bipedMapping(pad(), 1 / 60)
    for (const [k, v] of Object.entries(i)) {
      if (typeof v === 'number') expect([k, v]).toEqual([k, 0])
    }
  })
})
