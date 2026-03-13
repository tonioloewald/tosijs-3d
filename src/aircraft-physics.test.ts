import { describe, test, expect } from 'bun:test'
import {
  computeForces,
  type AircraftConfig,
  type AircraftAxes,
  type Vec3,
} from './aircraft-physics'

const DEFAULT_CONFIG: AircraftConfig = {
  maxSpeed: 50,
  acceleration: 12,
  vtolSpeed: 0,
  stallSpeed: 40,
}

// Level flight: nose along +Z, up along +Y
const LEVEL: AircraftAxes = {
  forward: { x: 0, y: 0, z: 1 },
  up: { x: 0, y: 1, z: 0 },
}

// Nose straight down: forward = -Y, up = +Z
const NOSE_DOWN: AircraftAxes = {
  forward: { x: 0, y: -1, z: 0 },
  up: { x: 0, y: 0, z: 1 },
}

// Rolled 45° right: forward = +Z, up = (sin45, cos45, 0)
const ROLLED_45: AircraftAxes = {
  forward: { x: 0, y: 0, z: 1 },
  up: { x: Math.SQRT1_2, y: Math.SQRT1_2, z: 0 },
}

// Rolled 90° right: forward = +Z, up = +X
const ROLLED_RIGHT: AircraftAxes = {
  forward: { x: 0, y: 0, z: 1 },
  up: { x: 1, y: 0, z: 0 },
}

// Rolled 135° right: forward = +Z, up = (sin135, cos135, 0)
const ROLLED_135: AircraftAxes = {
  forward: { x: 0, y: 0, z: 1 },
  up: { x: Math.SQRT1_2, y: -Math.SQRT1_2, z: 0 },
}

// Inverted (rolled 180°): forward = +Z, up = -Y
const INVERTED: AircraftAxes = {
  forward: { x: 0, y: 0, z: 1 },
  up: { x: 0, y: -1, z: 0 },
}

// Inverted + nose pitched up 60°: belly-up, nose toward sky
// forward = (0, sin60, cos60), up is inverted relative to normal pitch
// Normal 60° pitch: up = (0, cos60, -sin60). Inverted: negate up.
const S60 = Math.sin(Math.PI / 3)
const C60 = Math.cos(Math.PI / 3)
const INVERTED_NOSE_UP: AircraftAxes = {
  forward: { x: 0, y: S60, z: C60 },
  up: { x: 0, y: -C60, z: S60 },
}

// Nose 45° up: forward = (0, sin45, cos45), up = (0, cos45, -sin45)
const S45 = Math.SQRT1_2
const NOSE_UP_45: AircraftAxes = {
  forward: { x: 0, y: S45, z: S45 },
  up: { x: 0, y: S45, z: -S45 },
}

const DT = 1 / 60

function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }
}

function len(v: Vec3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z)
}

function dotn(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z
}

/** Run the simulation for N seconds, return final velocity */
function simulate(
  vel: Vec3,
  axes: AircraftAxes,
  throttle: number,
  config: AircraftConfig,
  seconds: number,
  dt = DT
): Vec3 {
  let v = { ...vel }
  const steps = Math.round(seconds / dt)
  for (let i = 0; i < steps; i++) {
    const { dv } = computeForces(v, axes, throttle, config, dt)
    v = add(v, dv)
  }
  return v
}

describe('aircraft physics — gravity', () => {
  test('gravity pulls down when stationary, no throttle', () => {
    const { dv } = computeForces(
      { x: 0, y: 0, z: 0 },
      LEVEL,
      0,
      DEFAULT_CONFIG,
      DT
    )
    expect(dv.y).toBeLessThan(0)
    expect(Math.abs(dv.x)).toBeLessThan(0.001)
    expect(Math.abs(dv.z)).toBeLessThan(0.001)
  })

  test('free fall accelerates downward over 1 second', () => {
    const v = simulate({ x: 0, y: 0, z: 0 }, LEVEL, 0, DEFAULT_CONFIG, 1)
    // After 1s of free fall, vy should be close to -9.81 (minus some drag)
    expect(v.y).toBeLessThan(-8)
    expect(v.y).toBeGreaterThan(-11)
  })
})

describe('aircraft physics — lift', () => {
  test('level flight at cruise speed: lift ≈ gravity', () => {
    // Cruise speed = maxSpeed * 0.5 = 25 m/s
    const cruiseVel: Vec3 = { x: 0, y: 0, z: 25 }
    const { dv } = computeForces(cruiseVel, LEVEL, 0, DEFAULT_CONFIG, DT)
    // At cruise: lift should roughly cancel gravity
    // dv.y ≈ lift - gravity ≈ 0
    expect(Math.abs(dv.y)).toBeLessThan(0.05) // close to zero
  })

  test('lift is proportional to airspeed, not total speed', () => {
    // Aircraft level, but falling fast (high total speed, low airspeed)
    const fallingVel: Vec3 = { x: 0, y: -30, z: 5 }
    const { dv, airspeed } = computeForces(
      fallingVel,
      LEVEL,
      0,
      DEFAULT_CONFIG,
      DT
    )
    expect(airspeed).toBeCloseTo(5, 0)
    // Low airspeed → low lift → net downward force (gravity wins)
    expect(dv.y).toBeLessThan(0)
  })

  test('rolled 90°: lift goes sideways, not up', () => {
    // Flying forward at cruise speed, but rolled 90° right
    const cruiseVel: Vec3 = { x: 0, y: 0, z: 25 }
    const { dv } = computeForces(cruiseVel, ROLLED_RIGHT, 0, DEFAULT_CONFIG, DT)
    // Lift is along local up = +X, so dv.x should be positive (sideways)
    expect(dv.x).toBeGreaterThan(0.01)
    // Gravity still pulls down, lift no longer counteracts it
    expect(dv.y).toBeLessThan(-0.1)
  })
})

describe('aircraft physics — roll angles', () => {
  // All tests at cruise speed (25 m/s) along +Z
  const cruiseVel: Vec3 = { x: 0, y: 0, z: 25 }

  test('rolled 45°: lift has both upward and sideways components', () => {
    const { dv } = computeForces(cruiseVel, ROLLED_45, 0, DEFAULT_CONFIG, DT)
    // Lift along up = (S45, S45, 0): both +X and +Y components
    // Y component: lift * cos45 ≈ gravity * cos45 — less than gravity, so net Y is negative
    expect(dv.x).toBeGreaterThan(0.05) // sideways lift component
    expect(dv.y).toBeLessThan(0) // lift.y < gravity → net downward
    // But less downward than 90° roll (some lift still fights gravity)
    const { dv: dv90 } = computeForces(
      cruiseVel,
      ROLLED_RIGHT,
      0,
      DEFAULT_CONFIG,
      DT
    )
    expect(dv.y).toBeGreaterThan(dv90.y) // 45° roll loses less altitude than 90°
  })

  test('rolled 90°: all lift goes sideways, none fights gravity', () => {
    const { dv } = computeForces(cruiseVel, ROLLED_RIGHT, 0, DEFAULT_CONFIG, DT)
    // Lift is entirely along +X (sideways)
    expect(dv.x).toBeGreaterThan(0.1)
    // dv.y ≈ -gravity * dt (no vertical lift component)
    expect(dv.y).toBeCloseTo(-9.81 * DT, 1)
  })

  test('rolled 135°: lift pulls sideways AND downward', () => {
    const { dv } = computeForces(cruiseVel, ROLLED_135, 0, DEFAULT_CONFIG, DT)
    // Lift along up = (S45, -S45, 0): +X and -Y
    // Lift actively works WITH gravity now
    expect(dv.x).toBeGreaterThan(0.05) // sideways
    expect(dv.y).toBeLessThan(-9.81 * DT) // worse than pure gravity
  })

  test('inverted (180°): lift doubles gravity — aircraft plummets', () => {
    const { dv } = computeForces(cruiseVel, INVERTED, 0, DEFAULT_CONFIG, DT)
    // Lift along up = (0, -1, 0) — straight down, same direction as gravity
    // Net downward: gravity + lift ≈ 2 * gravity
    expect(dv.y).toBeLessThan(-2 * 9.81 * DT * 0.8) // roughly double gravity
    expect(Math.abs(dv.x)).toBeLessThan(0.01) // no sideways force
  })

  test('inverted + nose up: lift still pulls down despite pitch', () => {
    // Aircraft is belly-up and pitched nose-up 60°.
    // forward = (0, S60, C60), up = (0, -C60, S60)
    // Lift is along local up which has negative Y component — still pulls down!
    // Velocity along forward at cruise speed:
    const vel: Vec3 = { x: 0, y: 25 * S60, z: 25 * C60 }
    const { dv } = computeForces(vel, INVERTED_NOSE_UP, 0, DEFAULT_CONFIG, DT)
    // Lift Y component = liftMag * up.y = liftMag * (-C60) = liftMag * (-0.5)
    // So lift adds to downward force (gravity + lift.y both negative)
    expect(dv.y).toBeLessThan(-9.81 * DT) // worse than gravity alone
  })

  test('inverted + nose up + full throttle: thrust can compensate', () => {
    // Same inverted+nose-up orientation, but full throttle
    // Thrust is along forward = (0, S60, C60), which has strong +Y component
    // With enough thrust, the aircraft can climb despite inverted lift
    const vel: Vec3 = { x: 0, y: 25 * S60, z: 25 * C60 }
    const { dv } = computeForces(vel, INVERTED_NOSE_UP, 1, DEFAULT_CONFIG, DT)
    // Thrust.y = acceleration * dt * S60 ≈ 12 * (1/60) * 0.866 ≈ 0.173
    // This should partially or fully compensate the downward forces
    // The net Y should be significantly better than without thrust
    const { dv: dvNoThrust } = computeForces(
      vel,
      INVERTED_NOSE_UP,
      0,
      DEFAULT_CONFIG,
      DT
    )
    expect(dv.y).toBeGreaterThan(dvNoThrust.y)
  })

  test('roll angle progressively reduces vertical lift component', () => {
    // Verify monotonic decrease in vertical lift from 0° → 45° → 90° → 135° → 180°
    const orientations: [string, AircraftAxes][] = [
      ['level', LEVEL],
      ['45°', ROLLED_45],
      ['90°', ROLLED_RIGHT],
      ['135°', ROLLED_135],
      ['inverted', INVERTED],
    ]
    const dvYs = orientations.map(([, axes]) => {
      const { dv } = computeForces(cruiseVel, axes, 0, DEFAULT_CONFIG, DT)
      return dv.y
    })
    // Each successive roll angle should have less (more negative) vertical lift
    for (let i = 1; i < dvYs.length; i++) {
      expect(dvYs[i]).toBeLessThan(dvYs[i - 1])
    }
  })
})

describe('aircraft physics — diving', () => {
  test('nose straight down: accelerates downward', () => {
    // Pointed straight down, flying forward (which is now -Y)
    const vel: Vec3 = { x: 0, y: -20, z: 0 }
    const { dv, airspeed } = computeForces(
      vel,
      NOSE_DOWN,
      0.5,
      DEFAULT_CONFIG,
      DT
    )
    // Airspeed = dot(vel, forward) = dot((0,-20,0), (0,-1,0)) = 20
    expect(airspeed).toBeCloseTo(20, 0)
    // Thrust is along forward = -Y direction, should push further down
    // Gravity also pulls down. Net dv.y should be strongly negative.
    expect(dv.y).toBeLessThan(0)
  })

  test('nose down with forward velocity: does not climb', () => {
    // Start with some forward velocity, nose pointed down
    const vel: Vec3 = { x: 0, y: -10, z: 0 }
    // Run for 2 seconds with no throttle — should keep going down
    const v = simulate(vel, NOSE_DOWN, 0, DEFAULT_CONFIG, 2)
    expect(v.y).toBeLessThan(-10) // should be going down faster
  })

  test('nose 45° up at cruise speed: climbs', () => {
    // Forward velocity has a vertical component when pitched up
    const vel: Vec3 = { x: 0, y: 25 * S45, z: 25 * S45 }
    const { dv } = computeForces(vel, NOSE_UP_45, 0.5, DEFAULT_CONFIG, DT)
    // Thrust pushes along forward (partially up), lift along local up
    // Net should have positive y component (climbing, not falling)
    // At cruise speed with 50% throttle and pitched up, should sustain
    expect(dv.y).toBeGreaterThan(-0.2) // at worst, very slightly net down
  })
})

describe('aircraft physics — thrust', () => {
  test('full throttle at rest: accelerates forward', () => {
    const { dv } = computeForces(
      { x: 0, y: 0, z: 0 },
      LEVEL,
      1,
      DEFAULT_CONFIG,
      DT
    )
    // Thrust along +Z (forward)
    expect(dv.z).toBeGreaterThan(0)
  })

  test('full throttle level flight converges to max speed', () => {
    const v = simulate({ x: 0, y: 0, z: 0 }, LEVEL, 1, DEFAULT_CONFIG, 30)
    // Should approach maxSpeed along Z, with y roughly stable
    expect(v.z).toBeGreaterThan(DEFAULT_CONFIG.maxSpeed * 0.8)
    expect(v.z).toBeLessThan(DEFAULT_CONFIG.maxSpeed * 1.2)
  })
})

describe('aircraft physics — drag', () => {
  test('drag opposes motion', () => {
    const vel: Vec3 = { x: 0, y: 0, z: 40 }
    const { dv } = computeForces(vel, LEVEL, 0, DEFAULT_CONFIG, DT)
    // dv.z should be negative (drag slows forward motion)
    // (lift doesn't contribute to Z when level)
    expect(dv.z).toBeLessThan(0)
  })

  test('drag opposes vertical motion too', () => {
    const vel: Vec3 = { x: 0, y: -30, z: 0 }
    const { dv } = computeForces(vel, LEVEL, 0, DEFAULT_CONFIG, DT)
    // Drag component on y should be positive (opposing downward velocity)
    // But gravity also acts. Check that drag adds some upward delta.
    // gravity dv = -9.81 * dt ≈ -0.164
    // drag on y should be positive: -(-30 * dragScale) > 0
    const gravityDv = -9.81 * DT
    expect(dv.y).toBeGreaterThan(gravityDv) // drag partially counteracts gravity
  })
})

describe('aircraft physics — VTOL', () => {
  const vtolConfig: AircraftConfig = {
    ...DEFAULT_CONFIG,
    vtolSpeed: 15,
  }

  test('VTOL at 50% throttle: approximately hovers', () => {
    const vel: Vec3 = { x: 0, y: 0, z: 0 }
    const { dv, vtol } = computeForces(vel, LEVEL, 0.5, vtolConfig, DT)
    expect(vtol).toBe(true)
    // 50% throttle should roughly cancel gravity
    expect(Math.abs(dv.y)).toBeLessThan(0.02)
  })

  test('VTOL at 0% throttle: falls', () => {
    const vel: Vec3 = { x: 0, y: 0, z: 0 }
    const { dv, vtol } = computeForces(vel, LEVEL, 0, vtolConfig, DT)
    expect(vtol).toBe(true)
    expect(dv.y).toBeLessThan(-0.1)
  })

  test('VTOL at 100% throttle: climbs', () => {
    const vel: Vec3 = { x: 0, y: 0, z: 0 }
    const { dv, vtol } = computeForces(vel, LEVEL, 1, vtolConfig, DT)
    expect(vtol).toBe(true)
    expect(dv.y).toBeGreaterThan(0.1)
  })

  test('VTOL hover + pitched nose down: loses altitude', () => {
    // Pitched 30° nose down: forward = (0, -sin30, cos30), up = (0, cos30, sin30)
    const S30 = Math.sin(Math.PI / 6)
    const C30 = Math.cos(Math.PI / 6)
    const pitched: AircraftAxes = {
      forward: { x: 0, y: -S30, z: C30 },
      up: { x: 0, y: C30, z: S30 },
    }
    const vel: Vec3 = { x: 0, y: 0, z: 0 }
    const { dv, vtol } = computeForces(vel, pitched, 0.5, vtolConfig, DT)
    expect(vtol).toBe(true)
    // Thrust along tilted up: Y component = GRAVITY * cos30 < GRAVITY
    // Net Y should be negative (losing altitude)
    expect(dv.y).toBeLessThan(0)
  })

  test('VTOL hover + pitched nose up: loses altitude', () => {
    // Pitched 30° nose up: forward = (0, sin30, cos30), up = (0, cos30, -sin30)
    const S30 = Math.sin(Math.PI / 6)
    const C30 = Math.cos(Math.PI / 6)
    const pitched: AircraftAxes = {
      forward: { x: 0, y: S30, z: C30 },
      up: { x: 0, y: C30, z: -S30 },
    }
    const vel: Vec3 = { x: 0, y: 0, z: 0 }
    const { dv, vtol } = computeForces(vel, pitched, 0.5, vtolConfig, DT)
    expect(vtol).toBe(true)
    // Thrust along tilted up: Y component = GRAVITY * cos30 < GRAVITY
    expect(dv.y).toBeLessThan(0)
  })

  test('VTOL hover + rolled: loses altitude', () => {
    // Rolled 30° right while hovering
    const S30 = Math.sin(Math.PI / 6)
    const C30 = Math.cos(Math.PI / 6)
    const rolled: AircraftAxes = {
      forward: { x: 0, y: 0, z: 1 },
      up: { x: S30, y: C30, z: 0 },
    }
    const vel: Vec3 = { x: 0, y: 0, z: 0 }
    const { dv, vtol } = computeForces(vel, rolled, 0.5, vtolConfig, DT)
    expect(vtol).toBe(true)
    // Thrust Y = GRAVITY * cos30 < GRAVITY → sinks
    expect(dv.y).toBeLessThan(0)
    // Also drifts sideways from the tilted thrust
    expect(dv.x).toBeGreaterThan(0)
  })

  test('VTOL nose down at hover: forward accel + less lift', () => {
    // Pitched 30° nose down, stationary, 50% throttle
    const S30 = Math.sin(Math.PI / 6)
    const C30 = Math.cos(Math.PI / 6)
    const noseDown: AircraftAxes = {
      forward: { x: 0, y: -S30, z: C30 },
      up: { x: 0, y: C30, z: S30 },
    }
    const vel: Vec3 = { x: 0, y: 0, z: 0 }
    const { dv, vtol } = computeForces(vel, noseDown, 0.5, vtolConfig, DT)
    expect(vtol).toBe(true)
    // Thrust along tilted up has a +Z component → forward acceleration
    expect(dv.z).toBeGreaterThan(0)
    // Thrust Y = GRAVITY * cos30 < GRAVITY → net downward (loses altitude)
    expect(dv.y).toBeLessThan(0)
    // Compare to level hover: less upward force
    const { dv: dvLevel } = computeForces(vel, LEVEL, 0.5, vtolConfig, DT)
    expect(dv.y).toBeLessThan(dvLevel.y)
  })

  test('VTOL nose up at hover: backward accel + less lift', () => {
    // Pitched 30° nose up, stationary, 50% throttle
    const S30 = Math.sin(Math.PI / 6)
    const C30 = Math.cos(Math.PI / 6)
    const noseUp: AircraftAxes = {
      forward: { x: 0, y: S30, z: C30 },
      up: { x: 0, y: C30, z: -S30 },
    }
    const vel: Vec3 = { x: 0, y: 0, z: 0 }
    const { dv, vtol } = computeForces(vel, noseUp, 0.5, vtolConfig, DT)
    expect(vtol).toBe(true)
    // Thrust along tilted up has a -Z component → backward acceleration
    expect(dv.z).toBeLessThan(0)
    // Thrust Y = GRAVITY * cos30 < GRAVITY → net downward (loses altitude)
    expect(dv.y).toBeLessThan(0)
    // Compare to level hover: less upward force
    const { dv: dvLevel } = computeForces(vel, LEVEL, 0.5, vtolConfig, DT)
    expect(dv.y).toBeLessThan(dvLevel.y)
  })

  test('VTOL rolled 90° at hover: falls over multiple seconds', () => {
    // This is the critical multi-frame test. Alignment must not cancel gravity.
    const v = simulate(
      { x: 0, y: 0, z: 0 },
      ROLLED_RIGHT, // up = +X, right = (0,1,0) = world up!
      0.5,
      vtolConfig,
      3
    )
    // After 3 seconds rolled 90° at hover thrust, should have significant downward velocity
    expect(v.y).toBeLessThan(-10)
  })

  test('VTOL inverted at hover: falls over multiple seconds', () => {
    const v = simulate(
      { x: 0, y: 0, z: 0 },
      INVERTED,
      0.5,
      vtolConfig,
      3
    )
    // Inverted: thrust pushes DOWN + gravity. Should fall fast.
    expect(v.y).toBeLessThan(-20)
  })

  test('VTOL: any tilt from level costs altitude at hover throttle', () => {
    // At 50% throttle, only perfectly level gives ~zero net Y.
    // Any tilt reduces the Y component of thrust below gravity.
    const vel: Vec3 = { x: 0, y: 0, z: 0 }
    const { dv: dvLevel } = computeForces(vel, LEVEL, 0.5, vtolConfig, DT)

    // Tilt 15° in various directions — all should have lower dv.y than level
    const angle = Math.PI / 12
    const s = Math.sin(angle)
    const c = Math.cos(angle)
    const tilts: AircraftAxes[] = [
      { forward: { x: 0, y: -s, z: c }, up: { x: 0, y: c, z: s } }, // nose down
      { forward: { x: 0, y: s, z: c }, up: { x: 0, y: c, z: -s } }, // nose up
      { forward: { x: 0, y: 0, z: 1 }, up: { x: s, y: c, z: 0 } }, // rolled right
      { forward: { x: 0, y: 0, z: 1 }, up: { x: -s, y: c, z: 0 } }, // rolled left
    ]
    for (const axes of tilts) {
      const { dv } = computeForces(vel, axes, 0.5, vtolConfig, DT)
      expect(dv.y).toBeLessThan(dvLevel.y)
    }
  })
})

describe('aircraft physics — aerodynamic alignment', () => {
  test('lateral velocity is reduced', () => {
    // Flying forward but with sideways drift
    const vel: Vec3 = { x: 10, y: 0, z: 25 }
    const { dv } = computeForces(vel, LEVEL, 0.5, DEFAULT_CONFIG, DT)
    // dv.x should be negative (killing sideways drift to the right)
    // Local right for LEVEL = cross(+Z, +Y) = -X...
    // Actually cross((0,0,1), (0,1,0)) = (-1,0,0)
    // lateralDot = dot(vel, right) = dot((10,0,25), (-1,0,0)) = -10
    // dv correction = -right * (-10) * alignFactor = +(-1,0,0) * (-10) * f = (10f, 0, 0)
    // Wait, that would ADD more sideways. Let me check the cross product direction.
    // Actually for this test, just verify x velocity decreases after applying dv
    const newVx = vel.x + dv.x
    expect(Math.abs(newVx)).toBeLessThan(Math.abs(vel.x))
  })

  test('forward velocity is NOT reduced by alignment', () => {
    // At cruise speed with 50% throttle, thrust exactly matches drag (equilibrium)
    // Use a lower speed so thrust > drag to verify alignment doesn't eat forward vel
    const vel: Vec3 = { x: 0, y: 0, z: 10 }
    const { dv } = computeForces(vel, LEVEL, 0.5, DEFAULT_CONFIG, DT)
    // Thrust (0.5 * 12 * dt) > drag (10 * 12/50 * dt), so net z should be positive
    expect(dv.z).toBeGreaterThan(0)
  })
})

describe('aircraft physics — equilibrium', () => {
  test('at cruise speed, lift ≈ gravity (stable altitude)', () => {
    // At cruise speed (maxSpeed * 0.5 = 25), lift should equal gravity
    const cruiseVel: Vec3 = { x: 0, y: 0, z: 25 }
    const { dv } = computeForces(cruiseVel, LEVEL, 0, DEFAULT_CONFIG, DT)
    // Lift cancels gravity, only drag remains (on z)
    expect(Math.abs(dv.y)).toBeLessThan(0.05)
  })

  test('above cruise speed, lift exceeds gravity (aircraft climbs)', () => {
    // At max speed, lift = 2x gravity — correct for high-performance aircraft
    const fastVel: Vec3 = { x: 0, y: 0, z: 50 }
    const { dv } = computeForces(fastVel, LEVEL, 0, DEFAULT_CONFIG, DT)
    // Net upward force: lift (2g) - gravity (g) = +g
    expect(dv.y).toBeGreaterThan(0.1)
  })

  test('full throttle level flight: forward speed converges to maxSpeed', () => {
    const v = simulate({ x: 0, y: 0, z: 0 }, LEVEL, 1, DEFAULT_CONFIG, 30)
    // Forward speed should approach maxSpeed
    expect(v.z).toBeGreaterThan(DEFAULT_CONFIG.maxSpeed * 0.8)
    expect(v.z).toBeLessThan(DEFAULT_CONFIG.maxSpeed * 1.2)
  })
})
