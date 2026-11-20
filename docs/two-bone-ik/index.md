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
