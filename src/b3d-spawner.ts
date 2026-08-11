/*#
# b3d-spawner

Keeps the world **populated**. Spawns [prefabs](?prefab.ts) — usually *encounters*: a
mothership with escorts, a base with ground defences and air cover — around the player, and
refills them as you destroy them.

An encounter is **not a special kind of thing**. It's a prefab whose members are placed in a
[formation](?formations.ts). That's the whole idea:

```javascript
import { definePrefab, escorts, at, b3dSpawner, b3dDestroyable, b3dRadarBlip } from 'tosijs-3d'

definePrefab('mothership-group', ({ position }) => [
  // The prize. A waypoint blip so the player can FIND it — and it dies with the ship,
  // because the blip follows the mesh and a destroyed mesh reports no position.
  b3dDestroyable(
    { meshName: 'mothership', size: 14, capacity: 400, ...position },
    b3dRadarBlip({ faction: 'hostile', profile: -1 }) // -1 = always detectable
  ),
  // The screen.
  ...at(position, escorts(5, 45, { y: 8 })).map((p) =>
    b3dDestroyable({ meshName: 'escort', size: 3, capacity: 30, ...p })
  ),
])

b3dSpawner({ prefab: 'mothership-group', maxAlive: 1, minDistance: 800, maxDistance: 1600 })
```

## Demo — hunt the mothership

Two hostile groups are out there, each a **mothership ringed by escorts**. The motherships
carry a **waypoint blip** (`profile: -1` — always detectable), so the HUD shows you where to
go; the escorts don't, so you only see them when your radar picks them up.

**Kill a mothership and its waypoint vanishes** — not because anything cleans it up, but
because the blip follows that mesh, and a destroyed mesh reports no position. The marker
stops existing because the thing it marked stopped existing.

Clear a group and the spawner puts a fresh one somewhere else.

```js
import { b3d, b3dAircraft, b3dRadar, b3dRadarBlip, b3dHud, b3dLibrary, b3dDestroyable, b3dSpawner, b3dDeath, b3dLight, b3dSun, b3dSkybox, b3dGround, definePrefab, escorts, at, gameController, inputFocus } from 'tosijs-3d'

// An ENCOUNTER is just a prefab whose members are placed in a formation.
definePrefab('mothership-group', ({ position }) => [
  b3dDestroyable(
    { meshName: 'mothership', size: 10, color: '#b05050', capacity: 120,
      explode: 'on', explodeForce: 10, ...position, y: position.y + 30 },
    // The prize, and the thing you can FIND: always-detectable waypoint blip.
    b3dRadarBlip({ faction: 'hostile', profile: -1 }),
  ),
  // The screen — no waypoint of their own; radar has to find them.
  ...at({ ...position, y: position.y + 30 }, escorts(5, 55, { y: 6 })).map((p) =>
    b3dDestroyable(
      { meshName: 'escort', size: 3, color: '#d07070', capacity: 20, explode: 'on', ...p },
      b3dRadarBlip({ faction: 'hostile', profile: 1 }),
    )
  ),
])

const plane = () => b3dAircraft(
  { library: 'vehicles', meshName: 'scout', player: true, y: 120, vtolSpeed: 6, maxSpeed: 60 },
  b3dRadar({ range: 900, coneDeg: 90, lockTime: 1.2, maxLocks: 2 }),
)
const focus = inputFocus(gameController(), plane())

const scene = b3d(
  { gamepad: true },
  b3dLight({ y: 1, intensity: 0.5 }),
  b3dSun({ intensity: 0.9 }),
  b3dSkybox({ timeOfDay: 10 }),
  b3dGround({ meshName: 'ground_nocast', width: 6000, height: 6000, color: '#6b7f5e' }),
  b3dLibrary({ url: '/test-3.glb', type: 'vehicles' }),
  b3dHud({}),
  // Two groups at a time, seeded — the same battles in the same places, every run.
  b3dSpawner({
    prefab: 'mothership-group',
    maxAlive: 2, interval: 6,
    minDistance: 700, maxDistance: 1500,
    seed: 42,
  }),
  b3dDeath({ title: 'DOWN', respawn() { focus.appendChild(plane()) } }),
  focus,
)
preview.append(scene)
```
```css
tosi-b3d { width: 100%; height: 100%; }
```

## The rules it follows

- **`maxAlive` groups, and no more.** A capacity, not a queue — the same discipline as the
  terrain tile pool. It refills as you clear them; it never piles up work behind you.
- **Spawned at a distance you have to fly to** (`minDistance`…`maxDistance`), never on top of
  you and never in your lap. Finding them is the game.
- **Seeded.** The same `seed` gives the same battles in the same places. That's what makes a
  scenario reproducible — and what lets a GM's benchmark mean anything (see
  `world-contract.ts`).
- **A group is dead when everything in it is dead**, at which point the slot frees and the
  next one can spawn. Kill the escorts and the mothership still counts; kill the lot and a
  new group appears somewhere else.

## Why the prefab is a NAME

Because a **narrative driver can ask for one**. `spawn('mothership-group', at)` is a string,
and a string crosses a worker membrane; a closure does not. So "find and destroy the enemy
mothership" is a GM composing pieces the simulation already has — with no narrative
vocabulary anywhere in the sim.

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `prefab` | `''` | Prefab name to spawn (usually an encounter) |
| `maxAlive` | `2` | How many groups may exist at once |
| `interval` | `8` | Seconds between spawn attempts |
| `minDistance` | `600` | Nearest a group may appear (from the player) |
| `maxDistance` | `1400` | Furthest a group may appear |
| `y` | `0` | Base height for the spawn point (the prefab places its own members) |
| `seed` | `1` | Deterministic placement — same seed, same battles |
| `disabled` | `false` | Stop spawning (a boolean can't default to true — see CLAUDE.md) |

## Events

`spawned` — bubbles, `detail: { prefab, position, elements }`.
*/
/*{ "parent": "World Sim" }*/

import { B3dChild } from './b3d-utils'
import { MersenneTwister } from './mersenne-twister'
import { spawnPrefab, type Prefab } from './prefab'
import type { B3d } from './tosi-b3d'

type Group = { elements: Element[] }

export class B3dSpawner extends B3dChild {
  static initAttributes = {
    prefab: '',
    maxAlive: 2,
    interval: 8,
    minDistance: 600,
    maxDistance: 1400,
    y: 0,
    seed: 1,
    disabled: false,
  }

  declare prefab: string
  declare maxAlive: number
  declare interval: number
  declare minDistance: number
  declare maxDistance: number
  declare y: number
  declare seed: number
  declare disabled: boolean

  /** A prefab FUNCTION instead of a name (a closure over game state). Not `onSpawn` — an
   * `on*` prop would be bound as a DOM event listener and never fire. */
  prefabFn: Prefab | null = null

  /** Live groups (a group is one spawned encounter). */
  get alive(): number {
    return this._groups.length
  }

  private _groups: Group[] = []
  private _rng: MersenneTwister | null = null
  private _since = 0
  private _tick = () => this._update()

  sceneReady(owner: B3d) {
    this._rng = new MersenneTwister(this.seed)
    // First group lands promptly — an empty sky on spawn-in reads as a broken game.
    this._since = this.interval
    owner.scene.registerBeforeRender(this._tick)
  }

  sceneDispose() {
    this.owner?.scene.unregisterBeforeRender(this._tick)
    this._groups = []
  }

  private _update(): void {
    const owner = this.owner
    if (owner == null || this.disabled) return
    this._prune()

    const dt = owner.scene.getEngine().getDeltaTime() / 1000
    this._since += dt
    if (this._since < this.interval) return
    if (this._groups.length >= this.maxAlive) return
    this._since = 0
    this.spawnOne()
  }

  /** Drop groups whose every member is gone or dead. The slot frees, and the next group can
   * come. A group with ONE survivor is still a group — you haven't cleared it yet. */
  private _prune(): void {
    this._groups = this._groups.filter((g) => {
      g.elements = g.elements.filter((el) => {
        if (!el.isConnected) return false
        const dead = (el as any).dead
        return dead !== true
      })
      return g.elements.length > 0
    })
  }

  /** Spawn one group now, wherever the rules say. Public so a driver (or a demo) can force
   * one without waiting for the interval. */
  spawnOne(): Element[] {
    const owner = this.owner
    const rng = this._rng
    if (owner == null || rng == null) return []

    // Somewhere on a ring around the player — far enough that finding it is the game.
    const player = this._playerPosition()
    const angle = rng.random() * Math.PI * 2
    const spread = Math.max(0, this.maxDistance - this.minDistance)
    const dist = this.minDistance + rng.random() * spread
    const position = {
      x: player.x + Math.cos(angle) * dist,
      y: this.y,
      z: player.z + Math.sin(angle) * dist,
    }

    const elements = spawnPrefab(this.prefabFn ?? this.prefab, {
      owner,
      position,
      source: this,
    })
    if (elements.length === 0) return []

    this._groups.push({ elements })
    this.dispatchEvent(
      new CustomEvent('spawned', {
        bubbles: true,
        detail: { prefab: this.prefab, position, elements },
      })
    )
    return elements
  }

  private _playerPosition(): { x: number; z: number } {
    const cam = this.owner?.scene.activeCamera
    const p = cam?.globalPosition
    return p ? { x: p.x, z: p.z } : { x: 0, z: 0 }
  }
}

export const b3dSpawner = B3dSpawner.elementCreator({
  tag: 'tosi-b3d-spawner',
}) as (...args: unknown[]) => B3dSpawner
