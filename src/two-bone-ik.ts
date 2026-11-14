/*#
# two-bone IK

**A limb of two bones reaches a point**: a leg puts its ankle on the floor, an
arm puts its hand on a rifle's foregrip. Given the three joints (shoulder,
elbow, wrist), where the end should go and which way the middle joint bends,
it returns the turn for each bone. A goal out of reach is reached for in a
straight line; a goal closer than the bones allow folds the limb as far as it
goes.

```javascript
import { twoBoneIk } from 'tosijs-3d'

const turn = twoBoneIk(shoulder, elbow, wrist, foregrip, { x: 0, y: -1, z: 0 })
// turn.first: the upper bone's world turn; turn.second: the lower bone's,
// the first included. turn.mid and turn.end: where the joints end up.
```

The turns are in world space and take each bone's direction the shortest way,
so the limb keeps the clip's twist. The retargeter's leg IK and the biped's
rifle hold ([[aim-ik]]'s `reachLimb`) both use it.

Pure: no Babylon.
*/
/*{ "parent": "aim" }*/

import { quatMul, rotateVector, sub, type Quat, type Vec3 } from './spatial-transform.js'

export interface TwoBoneTurn {
  /** The upper bone's world turn. */
  first: Quat
  /** The lower bone's world turn, `first` included. */
  second: Quat
  /** Where the middle joint goes. */
  mid: Vec3
  /** Where the end goes: the goal, or as near as the limb reaches. */
  end: Vec3
}

const dot = (p: Vec3, q: Vec3) => p.x * q.x + p.y * q.y + p.z * q.z
const length = (v: Vec3) => Math.hypot(v.x, v.y, v.z)
const normalize = (v: Vec3): Vec3 => {
  const l = length(v)
  return l > 1e-9 ? { x: v.x / l, y: v.y / l, z: v.z / l } : { x: 0, y: 0, z: 0 }
}

/** The shortest rotation taking unit vector `a` onto unit vector `b`. */
export function rotationBetween(a: Vec3, b: Vec3): Quat {
  const d = dot(a, b)
  if (d < -0.999999) {
    // Opposite: half a turn about any axis at right angles to `a`.
    const axis = normalize(
      Math.abs(a.x) < 0.9 ? { x: 0, y: -a.z, z: a.y } : { x: a.z, y: 0, z: -a.x }
    )
    return { x: axis.x, y: axis.y, z: axis.z, w: 0 }
  }
  const c = {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  }
  const w = 1 + d
  const l = Math.hypot(c.x, c.y, c.z, w)
  return { x: c.x / l, y: c.y / l, z: c.z / l, w: w / l }
}

/**
 * Turn the bones `root`→`mid`→`end` so `end` reaches `goal`, the middle joint
 * bending toward `bend` (any direction off the root-to-goal line). Null when
 * there is nothing to do (already there, a bone of no length, a bend along
 * the line).
 */
export function twoBoneIk(
  root: Vec3,
  mid: Vec3,
  end: Vec3,
  goal: Vec3,
  bend: Vec3
): TwoBoneTurn | null {
  const a = length(sub(mid, root))
  const b = length(sub(end, mid))
  if (a < 1e-6 || b < 1e-6) return null
  if (length(sub(goal, end)) < 1e-4 * (a + b)) return null
  const toGoal = sub(goal, root)
  const d0 = length(toGoal)
  if (d0 < 1e-6) return null
  const u = normalize(toGoal)
  const d = Math.min(a + b - 1e-5, Math.max(Math.abs(a - b) + 1e-5, d0))
  const k = dot(bend, u)
  const off = { x: bend.x - u.x * k, y: bend.y - u.y * k, z: bend.z - u.z * k }
  if (length(off) < 1e-9) return null
  const v = normalize(off)
  const cos = Math.min(1, Math.max(-1, (a * a + d * d - b * b) / (2 * a * d)))
  const sin = Math.sqrt(1 - cos * cos)
  const mid2 = {
    x: root.x + a * (u.x * cos + v.x * sin),
    y: root.y + a * (u.y * cos + v.y * sin),
    z: root.z + a * (u.z * cos + v.z * sin),
  }
  const end2 = { x: root.x + u.x * d, y: root.y + u.y * d, z: root.z + u.z * d }
  const first = rotationBetween(
    normalize(sub(mid, root)),
    normalize(sub(mid2, root))
  )
  const lowerNow = rotateVector(first, sub(end, mid))
  const second = quatMul(
    rotationBetween(normalize(lowerNow), normalize(sub(end2, mid2))),
    first
  )
  return { first, second, mid: mid2, end: end2 }
}
