# ground-vehicle

**How a car or a tank moves, as pure code**: a body on springs, tyres that
grip until they slide, tracks that steer by running one side faster than the
other. No Babylon and no physics engine, so it is tested headless and a vehicle
drives in any scene that has ground to stand on. [b3d-car](/b3d-car/) and
[b3d-tank](/b3d-tank/) are the scene elements built on it.

```javascript
import { createVehicle, stepVehicle, heightGround } from 'tosijs-3d'

const spec = {
  mass: 1200,
  size: { x: 1.8, y: 1.4, z: 4.2 },
  wheels: [
    { at: { x: -0.8, y: -0.4, z: 1.3 }, radius: 0.33, steerDeg: 35 },
    { at: { x: 0.8, y: -0.4, z: 1.3 }, radius: 0.33, steerDeg: 35 },
    { at: { x: -0.8, y: -0.4, z: -1.3 }, radius: 0.33, drive: 1, handbrake: true },
    { at: { x: 0.8, y: -0.4, z: -1.3 }, radius: 0.33, drive: 1, handbrake: true },
  ],
  engineForce: 7000,
  brakeForce: 12000,
  maxSpeed: 30,
}
const ground = heightGround(() => 0)
const car = createVehicle(spec, { position: { x: 0, y: 0.8, z: 0 } })
stepVehicle(spec, car, { throttle: 1, steer: 0 }, 1 / 60, ground)
```

## The model

The vehicle is ONE rigid body. Everything that touches the ground is a
**contact**: a wheel, or a point under a track. Each contact casts a ray down
its suspension, and from what it finds come two forces:

- **The spring.** A spring and damper hold the body up. A wheel's `at` is
  where its hub sits when the vehicle is standing still, so the spring is
  preloaded to carry its share of the weight there; `travel` is how far it may
  move either way. Pitch under braking, squat under power and roll in a corner
  are not modelled: they are what the springs do.
- **The grip.** Where the contact meets the ground, its velocity is split into
  along the wheel and across it. Across is resisted, along is driven or braked,
  and the two together are limited to `grip` × the load on that contact (the
  friction circle). Past it the contact SLIDES: a handbrake turn, a skid on
  braking, a wheel spinning on a steep bank.

A car steers its wheels (by Ackermann, so the inner wheel turns more), and the
engine pulls through the driven ones, fading to nothing at `maxSpeed`. A tank's
tracks each run at a commanded belt speed; steering slows one and speeds the
other, so it turns on the spot with the stick to one side and nothing else.

`throttle` is one axis, the GTA way: positive goes, negative brakes and then
reverses. On a pad that is the right trigger minus the left; on a keyboard W
and S. Off the throttle it slows gently, as an engine brakes (`coast`, m/s²);
let go below walking pace and the brakes hold it, so a parked car stays on a
hill. Steering at speed is held to what the tyres can take, so a turn keeps
its speed; the handbrake is how you ask for more.

## The chase view

`chaseRigFor(size)` and `chasePose` place the camera behind and above the
vehicle, aimed at a point AHEAD of it, so the road in front fills the screen
rather than the car's roof and the ground behind it. Both scale with the
vehicle's length, so a tank's camera stands farther back than a car's.

The step is fixed (1/60 s, the remainder carried over), so the same inputs
give the same drive at any frame rate.

## Directions

The vehicle's frame is +Z forward and +Y up. Steering positive turns toward
+X (right, in Babylon). The model does not care which way round the world is:
it only rotates and crosses vectors.
