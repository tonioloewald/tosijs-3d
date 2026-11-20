# b3d-npc

**Puts a mind in a biped.** Nest it in a `<tosi-b3d-biped>` and the biped
stands guard (or wanders), is oblivious until it notices the player, then
chases and attacks within reach; it loses them, searches, and goes back. A
noise sends it to look. It drives the biped exactly as a player does, with
the same `ControlInput` (AI-DESIGN: an AI is an input provider), so anything
a player's biped can do, an NPC's can.

The decisions are [npc-brain](/npc-brain/)'s and the senses
[sensorium](/sensorium/)'s, both pure and seeded. This element gives them a
body:

- **Sight**: in front (180°) out to 50 m, along a ray from its chest to the
  target's (`aimTarget`), so cover hides you.
- **Close behind**: within 10 m, ray or not.
- **Stealth**: a crouching target is noticed at `stealth` (0.33) of each
  distance, so you can creep to 3.3 m behind it.
- **Noise** ([noise](/noise/)): gunfire carries 25 m, a blast farther, a
  thrown thing where it lands; it goes to look at where the noise WAS.
- **Pain** wakes it: hurt, it knows where you are.
- **Its attack** plays `attackState` and, at the moment the blow lands, hurts
  the target if it is still within reach and in front of it.

Give the biped `health` and it can be killed: it plays its death and stops.

```javascript
import { b3dBiped, b3dNpc, ualAnimationStates, assetUrl } from 'tosijs-3d'

b3dBiped(
  {
    url: assetUrl('quaternius/UAL1_core.glb', 5),
    animationStates: ualAnimationStates([{ name: 'attack', animation: 'Sword_Attack', loop: false }]),
    x: 10, z: -10, ry: -35, health: 60,
  },
  b3dNpc({ attackDamage: 20 })
)
```

The Biped Playground has one standing guard past the crates.

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `target` | `'player'` | Who it is after: the player (the input focus's biped) |
| `skill` | `0` | 0..1: how often it thinks again, so how fast it reacts and how fresh its idea of where you are (dumb is the default) |
| `sightRange` | `50` | Metres it notices you in front |
| `sightDeg` | `180` | How wide "in front" is |
| `nearRange` | `10` | Metres it notices you behind it |
| `stealth` | `0.33` | What crouching multiplies those by |
| `hearing` | `1` | Multiplies how far a noise carries to it |
| `wanderRadius` | `0` | Metres it wanders from where it started; 0 stands guard |
| `memory` | `6` | Seconds it remembers you after losing you |
| `attackRange` | `1.4` | Metres it attacks from |
| `attackDamage` | `20` | What a blow does |
| `attackCooldown` | `1.6` | Seconds between attacks |
| `attackState` | `'attack'` | The biped state its attack plays |
| `walkPace` | `0.3` | Forward input while walking (0..1) |
| `runPace` | `0.7` | Forward input while chasing |
| `seed` | `1` | Its wandering and timing: the same seed, the same behaviour |

`patrol` (a property, not an attribute: `b3dNpc({ patrol: [{ x, z }, …] })`)
is a route it walks in a loop, pausing at each point.

`debugState` reads what it is doing: `{ mode, alertness, sees, senses, heard }`.
