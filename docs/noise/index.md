# noise

**Noises in a scene**, for whatever listens. A shot, an explosion, a thrown
thing landing: `makeNoise(scene, at, carries)` records where it was and how
far it carries, and a listener asks for the noises it can hear since it last
asked. An NPC ([b3d-npc](/b3d-npc/)) goes to see what a noise was, which is
how you lure one: throw something where you want it to look.

A noise tells a listener where the NOISE was, not who made it: a guard who
hears a bottle break goes to the bottle.

```javascript
import { makeNoise, noisesSince } from 'tosijs-3d/noise'
import { sceneSeconds } from 'tosijs-3d/b3d-utils'

makeNoise(scene, { x: 4, y: 0, z: -6 }, 15) // a can lands
// in a listener, each frame:
for (const n of noisesSince(scene, lastHeard)) console.log('heard', n.x, n.z)
lastHeard = sceneSeconds(scene)
```

Gunfire (`spawnProjectile`, so launchers and turrets) carries 25 m and a
warhead's blast four times its radius (at least 40 m). Times are scene
seconds, so a paused scene makes no new noise and old ones keep.
