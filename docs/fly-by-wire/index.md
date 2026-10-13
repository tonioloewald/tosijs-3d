# fly-by-wire

**The aircraft's flight model, with no 3D engine in it.** A "drone that
becomes a plane": the stick commands an attitude (bank and pitch), the model
eases toward it and levels itself when you let go, banking turns the heading,
and the velocity chases where the nose points. Below `vtolSpeed` it hovers
like a drone; above it, it flies like a plane. There are no aerodynamic
forces to fight, which is the point: you go the way you are pointing.

[[b3d-aircraft]] is this model bridged to a Babylon mesh. Use the model
directly for an AI pilot, a headless test, or a flight you want to predict.

```javascript
import { flyByWireStep } from 'tosijs-3d/fly-by-wire'

// heading / pitch / bank in radians, speed in m/s
const state = { heading: 0, pitch: 0, bank: 0, speed: 40 }
const stick = { pitch: 0, roll: 0.5, lift: 0 } // each -1..1

// once per frame: (state, command, forwardSpeed, altitude, config, dt, grounded)
flyByWireStep(state, stick, state.speed, 120, config, 1 / 60, false)
// state.bank has eased toward the commanded bank; state.heading is turning
```

`config` is a `FlyByWireConfig` (speeds, rates and limits; every field is
documented on the type). The other exports are the pieces `b3d-aircraft` uses
around the step: `regime` (hover or plane), `targetVelocity` and
`chaseVelocity` (velocity follows the nose), `equilibriumSpeed` (where a
throttle setting settles) and `turbulence`.

Plain `{x, y, z}` objects, time only through `dt`, no randomness: the same
inputs give the same flight, which is what `fly-by-wire.test.ts` relies on.
