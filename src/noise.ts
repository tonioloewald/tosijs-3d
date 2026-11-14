/*#
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
*/
/*{ "parent": "b3d-npc" }*/

import type * as BABYLON from '@babylonjs/core'
import { sceneSeconds } from './b3d-utils.js'

export interface SceneNoise {
  x: number
  y: number
  z: number
  /** Metres it carries. */
  carries: number
  /** Scene seconds when it happened. */
  at: number
}

/** How long a noise is kept, in scene seconds: a listener asks every frame or so. */
const KEEP = 2

const heard = new WeakMap<BABYLON.Scene, SceneNoise[]>()

/** A noise at `at` that carries `carries` metres. */
export function makeNoise(
  scene: BABYLON.Scene,
  at: { x: number; y?: number; z: number },
  carries = 25
): void {
  const now = sceneSeconds(scene)
  const list = (heard.get(scene) ?? []).filter((n) => now - n.at < KEEP)
  list.push({ x: at.x, y: at.y ?? 0, z: at.z, carries, at: now })
  heard.set(scene, list)
}

/** The noises made after `since` (scene seconds), oldest first. */
export function noisesSince(scene: BABYLON.Scene, since: number): SceneNoise[] {
  return (heard.get(scene) ?? []).filter((n) => n.at > since)
}
