# ballistics

**Where an unguided round goes.** Gravity plus drag, as a pure function. The
same integrator flies the live projectile and draws the bomb sight, so the arc
you are shown is the arc you get. [[b3d-launcher]] and [[b3d-turret]] are
built on it.

```javascript
import { ballisticStep, predictPath, ballisticAim } from 'tosijs-3d/ballistics'

const params = { gravity: { x: 0, y: -9.81, z: 0 }, dragCoeff: 0.002, mass: 1 }
const shell = { pos: { x: 0, y: 2, z: 0 }, vel: { x: 0, y: 30, z: 80 } }

ballisticStep(shell, params, 1 / 60) // advance one frame, in place

// The whole arc ahead of time (a bomb sight), stopping where it lands:
const { points, impact } = predictPath(shell, params, {
  dt: 1 / 30,
  maxSteps: 600,
  hitTest: (p) => p.y <= 0,
})

// The direction to fire at `speed` to hit a target, allowing for the drop
// (null if it is out of reach). Ignores drag.
const aim = ballisticAim(shell.pos, { x: 0, y: 0, z: 400 }, 120, -9.81)
```

Gravity does not depend on mass; drag is quadratic and is divided by mass, so
a heavy round carries further. For a moving target, see [[guidance]].
