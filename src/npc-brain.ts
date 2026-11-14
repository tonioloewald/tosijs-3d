/*#
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
*/
/*{ "parent": "b3d-npc" }*/

import { hears, notices, type Noise, type Sensorium } from './sensorium.js'

export interface NpcBrainOptions {
  /** Where it stands or wanders around, and goes back to. */
  home: { x: number; z: number }
  /** The seed for its wandering: the same seed, the same walk. */
  seed?: number
  /** 0..1. Dumb (0) is the default. */
  skill?: number
  /** What it can perceive (see sensorium). */
  senses?: Partial<Sensorium>
  /** Metres it wanders from home; 0 (default) stands guard there. */
  wanderRadius?: number
  /**
   * A route it walks, in a loop, pausing a moment at each point. Takes the
   * place of standing guard or wandering; after an alarm it rejoins the
   * route at the nearest point.
   */
  patrol?: Array<{ x: number; z: number }>
  /** It attacks from this close, metres. */
  attackRange?: number
  /** Seconds between attacks. */
  attackCooldown?: number
  /** Seconds it remembers where you were after losing you. */
  memory?: number
}

export type NpcMode =
  | 'idle'
  | 'wander'
  | 'investigate'
  | 'chase'
  | 'attack'
  | 'search'
  | 'return'
  | 'patrol'

export interface NpcPercept {
  self: { x: number; z: number; heading: number }
  /**
   * What it is after, if anything: where, whether a clear line from its eyes
   * reaches it (the caller casts the ray), and how conspicuous it is (1
   * standing, `STEALTH` crouching).
   */
  target?: { x: number; z: number; clearLine: boolean; conspicuity?: number } | null
  /** Noises made since the last step (it hears those that carry to it). */
  noises?: Noise[]
}

export interface NpcIntent {
  mode: NpcMode
  /** Where it is going (null: nowhere). */
  moveTo: { x: number; z: number } | null
  pace: 'stop' | 'walk' | 'run'
  /** Attack now: true for the one step an attack starts on. */
  attack: boolean
  /** 0..1. */
  alertness: number
  /** It sees its target (in front), senses it (close behind), or heard a noise this step. */
  sees: boolean
  senses: boolean
  heard: boolean
}

/** A seeded 0..1 generator (mulberry32): no Math.random in a sim. */
function seeded(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const dist = (a: { x: number; z: number }, b: { x: number; z: number }) =>
  Math.hypot(a.x - b.x, a.z - b.z)

/** An NPC's mind. `step` each frame with what it perceives; it says what to do. */
export function npcBrain(options: NpcBrainOptions) {
  const skill = Math.max(0, Math.min(1, options.skill ?? 0))
  const senses = options.senses ?? {}
  const home = options.home
  const wanderRadius = options.wanderRadius ?? 0
  const patrol = options.patrol?.length ? options.patrol : null
  let leg = 0
  let pauseFor = 0
  const attackRange = options.attackRange ?? 1.4
  const attackCooldown = options.attackCooldown ?? 1.6
  const memory = options.memory ?? 6
  const rand = seeded(options.seed ?? 1)
  // A dumb one thinks every 1.2 s, a sharp one every 0.25 s.
  const thinkEvery = 1.2 - 0.95 * skill

  let mode: NpcMode = 'idle'
  let alertness = 0
  let moveTo: { x: number; z: number } | null = null
  // Where it last knew its target was, and how long ago.
  let known: { x: number; z: number } | null = null
  let sinceKnown = Infinity
  // A noise it is going to look at.
  let lure: { x: number; z: number } | null = null
  let lookFor = 0
  // Staggered by the seed, so a crowd does not all think on one frame.
  let thinkIn = rand() * thinkEvery
  let idleFor = 1 + rand() * 2
  let searchFor = 0
  let cooldown = 0
  // Stuck: no progress toward where it is going.
  let stuckFor = 0
  let lastDist = Infinity
  let detour: { x: number; z: number; left: number } | null = null

  const wanderPoint = () => {
    const a = rand() * Math.PI * 2
    const r = wanderRadius * Math.sqrt(rand())
    return { x: home.x + Math.cos(a) * r, z: home.z + Math.sin(a) * r }
  }
  const engaged = () =>
    known != null && sinceKnown < memory && alertness >= 0.5

  function think(p: NpcPercept, sees: boolean): void {
    const here = p.self
    if (engaged()) {
      // It goes to where it last knew you were: stale between thoughts.
      mode = sees && dist(here, known!) <= attackRange ? 'attack' : 'chase'
      moveTo = mode === 'attack' ? null : { ...known! }
      searchFor = 3 + rand() * 3
      lure = null
      return
    }
    if (known != null && searchFor > 0) {
      // Lost you: poke about where you were.
      mode = 'search'
      if (moveTo == null || dist(here, moveTo) < 1) {
        const a = rand() * Math.PI * 2
        moveTo = { x: known.x + Math.cos(a) * 3, z: known.z + Math.sin(a) * 3 }
      }
      return
    }
    known = null
    if (lure != null) {
      // Go and see what the noise was, then look about a while.
      mode = 'investigate'
      if (dist(here, lure) > 1.2) moveTo = { ...lure }
      else {
        moveTo = null
        if (lookFor <= 0) lookFor = 2 + rand() * 2
        else if ((lookFor -= thinkEvery) <= 0) lure = null
      }
      return
    }
    if (patrol != null) {
      // Back on the route: from the nearest point if it was called away.
      if (mode !== 'patrol') {
        let best = 0
        for (let i = 1; i < patrol.length; i++)
          if (dist(here, patrol[i]) < dist(here, patrol[best])) best = i
        leg = best
        pauseFor = 0
      }
      mode = 'patrol'
      const to = patrol[leg]
      if (dist(here, to) > 1.2) moveTo = { ...to }
      else if (pauseFor <= 0) {
        // Arrived: a look round, then on to the next.
        moveTo = null
        pauseFor = 1 + rand() * 1.5
      } else if ((pauseFor -= thinkEvery) <= 0) {
        leg = (leg + 1) % patrol.length
        moveTo = { ...patrol[leg] }
      }
      return
    }
    if (wanderRadius <= 0.5) {
      // A guard: back to its post, then stand.
      if (dist(here, home) > 1.2) {
        mode = 'return'
        moveTo = { ...home }
      } else {
        mode = 'idle'
        moveTo = null
      }
      return
    }
    if (mode !== 'wander') {
      if (idleFor <= 0) {
        mode = 'wander'
        moveTo = wanderPoint()
      } else {
        mode = 'idle'
        moveTo = null
      }
      return
    }
    if (moveTo == null || dist(here, moveTo) < 1) {
      mode = 'idle'
      moveTo = null
      idleFor = 1 + rand() * 3
    }
  }

  function step(p: NpcPercept, dt: number): NpcIntent {
    const t = p.target
    // An alert creature looks a little harder.
    const noticed = t != null ? notices(p.self, senses, t, 1 + 0.25 * alertness) : null
    const sees = noticed === 'seen'
    const sensed = noticed === 'sensed'
    let heardAt: Noise | null = null
    for (const n of p.noises ?? [])
      if (hears(p.self, senses, n) && (heardAt == null || dist(p.self, n) < dist(p.self, heardAt)))
        heardAt = n
    if (t != null && (sees || sensed)) {
      // Noticed: wide awake, and it knows where you are, after a moment to
      // react (one turn of its think clock: long when dumb).
      if (alertness < 0.5) thinkIn = thinkEvery
      alertness = 1
      known = { x: t.x, z: t.z }
      sinceKnown = 0
    } else {
      alertness = Math.max(0, alertness - 0.08 * dt)
      sinceKnown += dt
    }
    if (heardAt != null && !engaged()) {
      lure = { x: heardAt.x, z: heardAt.z }
      lookFor = 0
      alertness = Math.max(alertness, 0.4)
    }
    idleFor -= dt
    if (mode === 'search') searchFor -= dt
    cooldown = Math.max(0, cooldown - dt)

    thinkIn -= dt
    if (thinkIn <= 0) {
      thinkIn = thinkEvery
      think(p, sees)
    }

    // Stuck: walking but not getting closer for 1.5 s, step off to one side.
    let goal = moveTo
    if (detour != null) {
      detour.left -= dt
      if (detour.left <= 0 || dist(p.self, detour) < 0.5) detour = null
      else goal = detour
    }
    if (goal != null && detour == null && mode !== 'attack') {
      const d = dist(p.self, goal)
      if (d > lastDist - 0.2 * dt) stuckFor += dt
      else stuckFor = 0
      lastDist = d
      if (stuckFor > 1.5) {
        stuckFor = 0
        lastDist = Infinity
        const side = rand() < 0.5 ? -1 : 1
        const h = ((p.self.heading + side * 75) * Math.PI) / 180
        detour = {
          x: p.self.x + Math.sin(h) * 2.5,
          z: p.self.z + Math.cos(h) * 2.5,
          left: 1.2,
        }
        goal = detour
      }
    } else {
      stuckFor = 0
      lastDist = Infinity
    }

    let attack = false
    if (mode === 'attack' && cooldown <= 0) {
      attack = true
      cooldown = attackCooldown
    }
    const pace =
      goal == null || mode === 'attack'
        ? 'stop'
        : mode === 'chase'
        ? 'run'
        : 'walk'
    return {
      mode,
      moveTo: goal,
      pace,
      attack,
      alertness,
      sees,
      senses: sensed,
      heard: heardAt != null,
    }
  }

  return {
    step,
    /** Something hurt it: it is wide awake and knows where you are. */
    hurt(from?: { x: number; z: number }) {
      alertness = 1
      if (from) {
        known = { ...from }
        sinceKnown = 0
      }
      thinkIn = 0
    },
    get mode() {
      return mode
    },
    get alertness() {
      return alertness
    },
  }
}

export type NpcBrain = ReturnType<typeof npcBrain>
