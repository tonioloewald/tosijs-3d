import { describe, test, expect } from 'bun:test'
import { bipedMapping, type VirtualGamepad } from './virtual-gamepad.js'

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
    menu: 0,
    leftStickPress: 0,
    rightStickPress: 0,
  }
  return { ...zero, ...over } as VirtualGamepad
}

describe('bipedMapping: GTA V layout — left moves, right turns', () => {
  test('left stick is move and STRAFE, not turn', () => {
    const i = bipedMapping(pad({ leftStickY: 0.8, leftStickX: -0.3 }), 1 / 60)
    expect(i.forward).toBeCloseTo(0.8, 9)
    expect(i.strafe).toBeCloseTo(-0.3, 9)
    expect(i.turn).toBe(0)
  })

  test('right stick X turns the BODY', () => {
    expect(bipedMapping(pad({ rightStickX: 0.5 }), 1 / 60).turn).toBeCloseTo(
      0.5,
      9
    )
  })
})

describe('bipedMapping: the right stick is LOOK', () => {
  /*
  This layer is exactly what a live test bypasses. Swimming "where you look" was
  verified by injecting lookY straight onto the ControlInput, which proved the
  model and never touched the mapping — where the stick was still bound to zoom,
  so in play there was no aim at all.
  */
  test('right stick Y drives lookY (pitch); X turns the body instead', () => {
    const i = bipedMapping(
      pad({ rightStickX: 0.5, rightStickY: -0.25 }),
      1 / 60
    )
    expect(i.lookY).toBeCloseTo(-0.25, 9)
    // No camera yaw at all: X is `turn`, so the view cannot end up pointing
    // somewhere the character is not.
    expect(i.lookX).toBe(0)
    expect(i.turn).toBeCloseTo(0.5, 9)
  })

  test('the right stick no longer zooms', () => {
    const i = bipedMapping(pad({ rightStickY: 1 }), 1 / 60)
    expect(i.cameraZoom).toBe(0)
  })

  test('zoom is the wheel (the pad\'s zoom axis), SIGNED; the d-pad does not zoom', () => {
    // The d-pad zoomed once; it is UI navigation now (it is the gap a gamepad
    // has that XR controllers do not). Signed: down the wheel zooms in.
    expect(bipedMapping(pad({ zoom: 1 }), 1 / 60).cameraZoom).toBe(1)
    expect(bipedMapping(pad({ zoom: -1 }), 1 / 60).cameraZoom).toBe(-1)
    expect(bipedMapping(pad({ dpadUp: 1 }), 1 / 60).cameraZoom).toBe(0)
    expect(bipedMapping(pad({ dpadDown: 1 }), 1 / 60).cameraZoom).toBe(0)
  })
})

describe('bipedMapping: bumpers carry the vertical verbs', () => {
  test('left bumper is sneak', () => {
    expect(bipedMapping(pad({ leftBumper: 1 }), 1 / 60).sneak).toBe(1)
  })

  test('so is clicking the left stick (L3, as in GTA V)', () => {
    expect(bipedMapping(pad({ leftStickPress: 1 }), 1 / 60).sneak).toBe(1)
  })

  test('clicking the right stick (R3) jumps, and does not toggle the weapon', () => {
    const input = bipedMapping(pad({ rightStickPress: 1 }), 1 / 60)
    expect(input.jump).toBe(1)
    expect(input.weapon).toBe(0)
  })

  /*
  RIGHT BUMPER RAISES THE WEAPON, AND A JUMPS — a reversal, recorded as one.

  These two tests used to assert the opposite, and the reasoning they carried
  was good: the face buttons are primary and secondary fire on the aircraft, and
  a control vocabulary that changes meaning per vehicle is one you have to
  relearn. That still holds for the aircraft.

  It was overruled for the biped, by Tonio, after playing it: "having right
  bumper toggle weapon ready mode is probably the best option (and not a bad
  option in general ... a lot of games use the button we're using for view
  toggle to toggle weapon ready mode)." A shoulder button is where every
  third-person shooter puts weapon-ready, a mode toggled constantly deserves the
  better button, and A-to-jump is the most universal convention there is.

  Reversed again (2026-11-18), by Tonio: A ATTACKS and B USES, the frequent
  verbs on the right hand, and B is never aggressive ("so that a player hitting
  it to open a door when there's no door doesn't shoot a child by accident").
  Jump went to the right stick's click, still the right hand, which a headset
  needs: X and Y are on the left controller. ("Right stick click for jump
  actually works really well. It messes up aim which you know jumping ought to.")
  */
  test('right bumper raises and lowers the weapon', () => {
    expect(bipedMapping(pad({ rightBumper: 1 }), 1 / 60).weapon).toBe(1)
  })

  test('A attacks: it fires with the weapon up, and neither jumps nor toggles', () => {
    const up = bipedMapping(pad({ buttonA: 1 }), 1 / 60, true)
    expect(up.shoot).toBe(1)
    const down = bipedMapping(pad({ buttonA: 1 }), 1 / 60)
    expect(down.jump).toBe(0)
    expect(down.weapon).toBe(0)
  })

  test('B uses with the weapon down, and ducks (never fires) with it up', () => {
    const down = bipedMapping(pad({ buttonB: 1 }), 1 / 60)
    expect(down.interact).toBe(1)
    expect(down.shoot).toBe(0)
    const up = bipedMapping(pad({ buttonB: 1 }), 1 / 60, true)
    expect(up.sneak).toBe(1)
    expect(up.shoot).toBe(0)
    expect(up.interact).toBe(0)
  })

  test('the keyboard keeps its keys: space jumps, E uses, F attacks', () => {
    const kb = (bipedMapping as unknown as { keyboard: (p: ReturnType<typeof pad>) => ReturnType<typeof pad> }).keyboard
    expect(bipedMapping(kb(pad({ buttonA: 1 })), 1 / 60).jump).toBe(1)
    expect(bipedMapping(kb(pad({ buttonX: 1 })), 1 / 60).interact).toBe(1)
    expect(bipedMapping(kb(pad({ buttonB: 1 })), 1 / 60, true).shoot).toBe(1)
    expect(bipedMapping(kb(pad({ buttonB: 1 })), 1 / 60).interact).toBe(0)
  })

  test('the right bumper does not also jump', () => {
    expect(bipedMapping(pad({ rightBumper: 1 }), 1 / 60).jump).toBe(0)
  })

  test('the d-pad no longer sneaks', () => {
    expect(bipedMapping(pad({ dpadDown: 1 }), 1 / 60).sneak).toBe(0)
  })
})

describe('bipedMapping: nothing else moved', () => {
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

describe('the mouse wheel must not reach the LOOK stick', () => {
  /*
  The wheel fed `rightStickY` for as long as the right stick was zoom, and came
  along for the ride when the stick became look — so a scroll pitched the
  camera, and while swimming it tipped the swimmer, because the swim aim IS the
  look pitch. Swimming broke and the wheel is the last place anyone would look.

  Asserted through the MAPPING, since that is the layer a live test bypasses —
  the same gap that let the original "no aim on a flat screen" bug ship.
  */
  test('the zoom axis reaches cameraZoom and never lookY', () => {
    const zoomed = bipedMapping(pad({ zoom: 1 }), 1 / 60)
    expect(zoomed.cameraZoom).toBe(1)
    expect(zoomed.lookY).toBe(0)
  })

  test('and look reaches lookY and never cameraZoom', () => {
    const looked = bipedMapping(pad({ rightStickY: 1 }), 1 / 60)
    expect(looked.lookY).toBe(1)
    expect(looked.cameraZoom).toBe(0)
  })
})
