# guidance

**Hitting something that moves.** Three pure functions: one steers a guided
round, one leads a gun, and both are used by [[b3d-launcher]] and
[[b3d-turret]].

```javascript
import { steerToward, proNav, interceptLead } from 'tosijs-3d/guidance'

// A GUN: where to aim a round of `speed` so it meets a moving target.
// Null if the target can outrun the round.
const aim = interceptLead(gunPos, 300, targetPos, targetVel)

// A MISSILE, each frame: the direction proportional navigation wants...
const want = proNav(missilePos, missileVel, targetPos, targetVel)
// ...and the new velocity, turning toward it no faster than the seeker can.
missileVel = steerToward(missileVel, want, maxTurnRate, dt) // rad/s
```

`steerToward` keeps the speed and only turns it, so a round with a low turn
rate misses a hard-turning target, which is what makes a missile dodgeable.
`boostAuthority(elapsed, boostTime)` ramps steering in over the launch.

The one `smart` dial on a launcher or turret (0 to 1) blends between aiming
straight at the target and using these: 0 is a dumb round, 1 is a full
solution. Unguided flight is [[ballistics]].
