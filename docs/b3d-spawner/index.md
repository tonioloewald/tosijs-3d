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
| `anchor` | `'player'` | `'player'` = a ring around the player (an encounter); `'place'` = exactly at `x`/`y`/`z` (a launchpad) |
| `x` `z` | `0` | Spawn point, when `anchor="place"`. Ignored otherwise |
| `facingDeg` | `0` | Facing for a placed spawn, degrees about Y — reaches the prefab as `rotation` |
| `y` | `0` | Base height for the spawn point (the prefab places its own members) |
| `seed` | `1` | Deterministic placement — same seed, same battles |
| `disabled` | `false` | Stop spawning (a boolean can't default to true — see CLAUDE.md) |

## Events

`spawned` — bubbles, `detail: { prefab, position, elements }`.
