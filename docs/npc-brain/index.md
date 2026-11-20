# npc-brain

What an NPC decides, as pure rules: it stands guard or wanders, notices you,
chases, attacks when it can reach you, loses you, searches where it last knew
you were, and goes back. A noise sends it to look. Deterministic and seeded,
so the same scene plays the same way twice and a test can pin it down.
[b3d-npc](/b3d-npc/) puts it in a biped.

It follows [AI-DESIGN](https://github.com/tonioloewald/tosijs-3d/blob/main/AI-DESIGN.md):
what it perceives ([sensorium](/sensorium/): in front out to 50 m with a clear
line, behind within 10 m, a third of each when you crouch, noises in any
direction) drives its ALERTNESS, which decays when nothing feeds it; SKILL
multiplies how often it thinks again. The low end of the skill dial is where
the design effort goes, because believable mistakes are what make an enemy
fun:

- **It is oblivious until it notices you**, and then it is on you.
- **It thinks on a clock.** Between thoughts it keeps going where it last
  decided, so a dumb one runs to where you WERE, and a sidestep beats it. The
  clock is also how long it takes to react. Skill shortens it.
- **A noise is a place, not a person.** Hearing one, it goes to look at where
  the noise was: throw something and it looks there.
- **It forgets.** Out of sight and reach for `memory` seconds, it searches
  the last place it knew you were, then goes back.
- **It gets stuck, and knows it.** Making no progress for a second and a half,
  it steps off to one side for a moment and tries again.

```javascript
import { npcBrain } from 'tosijs-3d/npc-brain'

const brain = npcBrain({ home: { x: 0, z: 0 }, seed: 7, skill: 0.2 })
// every frame:
const intent = brain.step({
  self: { x, z, heading },
  target: { x: tx, z: tz, clearLine: true, conspicuity: 1 },
  noises: [{ x: nx, z: nz, carries: 25 }],
}, dt)
// intent.moveTo, intent.pace ('stop' | 'walk' | 'run'), intent.attack, intent.mode
```

`wanderRadius` 0 makes a guard: it stands where it was put, facing the way
it was facing, until something gets its attention. `patrol` (a list of
points) makes it walk a route in a loop instead.
