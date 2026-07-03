# NPC AI Design

Living spec for the AI that controls NPCs — perception (vision/hearing =
Sensorium), a deterministic **strategy** selector modulated by **skill**, and the
behaviors themselves. Sits alongside `COMBAT-DESIGN.md` (AI drives weapons; shares
the smartness/firing-solution dial) and respects the `world-contract` decoupling.

## Design philosophy: artificial _stupidity_

**Fun AIs are believably imperfect, not lethal.** A perfect killer is trivial to
build (leads perfectly, reassesses every frame, never loses track, never picks the
wrong strategy) — and no fun to fight. The design work is the **low/mid end of the
skill dial**: AIs that make **plausible mistakes** — poor/late aim, slow or wrong
strategy switches, losing the player after LOS breaks, being fooled by evasion,
over-committing to a stale last-known position, patrolling predictably. So:

- **The skill dial degrades _gracefully into character_, not just into weakness.**
  Tune it for _how_ an AI is wrong (readable, exploitable, human-feeling), not only
  _how often_.
- **Dumb is the default** — consistent with weapon smartness defaulting to 0. The
  believable-mistakes band is where we invest; near-max skill is the easy corner.
- Difficulty comes from **numbers, positioning, and variety of imperfect AIs**,
  not from one omniscient sniper.

**Reference points:**

- **Borderlands — anti-pattern:** enemies take cover and just _sit there_ →
  firefights stall and annoy. Passive/static "smart" behavior is the enemy of fun.
- **GTA V — the goal:** enemies are **actively stupid in plausible ways** — they
  keep _doing_ things (rushing, repositioning, flushing you out) and their mistakes
  read as human. Bias strategies toward **action**, not turtling.

## Architectural commitments

- **AI is an `InputProvider`.** It produces `ControlInput` for a `B3dControllable`
  — the _same_ interface the player drives (biped, car, aircraft). So an AI NPC and
  a player are interchangeable at the control seam; the AI just decides the inputs.
- **Deterministic + skill-modulated.** Strategy logic is mechanical and
  reproducible (seeded per-NPC; no `Date.now`/`Math.random`) so it's testable and
  replay-safe (fits `world-store`). **Skill ("smartness")** is the dial that makes
  one AI better than another.
- **Narrative-decoupled.** The AI executes systemic behavior. A driver / narrative
  engine may set goals, factions, or waypoints, but the AI runs standalone and
  never encodes plot (per `world-contract`).

Status legend: ✅ agreed · 🟡 spec'd, open questions · ✏️ drafting

---

## NPC AI controller 🟡

### Agreed spec

- **Perception** — a **vision cone** and a **hearing radius**. (This is the
  Sensorium; what's detectable and how far ties to Detectable profiles — see
  below.)
- **Strategy set** — a collection of candidate **strategies**. Examples:
  - **Patrol** — go to the nearest waypoint you can see that you haven't visited
    recently.
  - **Pursue & attack** — head toward the nearest enemy (or last-known enemy
    position), attack when able.
  - **Flee evasively.**
  - …extensible.
- **Reassessment** — an internal **clock**: the AI periodically re-evaluates which
  strategy to run. Reassessment can **also be triggered by an event** (took damage,
  spotted an enemy, heard something, reached a waypoint…).
- **Mechanical & deterministic, modulated by skill:**
  - Strategies are simple, deterministic behaviors.
  - **Skill (smartness)** makes AIs better in two ways: they **reassess more often**
    (shorter clock) and they **make better choices** at each reassessment.
- Each chosen strategy emits `ControlInput` each tick to drive the controllable.

### The three dials — sensorium → alertness → (× skill)

Clean causal chain, no circularity:

**1. Sensorium (raw perception).** Hearing radius + vision cone/acuity (+ later,
fuller Detectable profiles). This is what an NPC can actually sense.

**2. Alertness (dynamic state, _driven by_ the sensorium).** Levels:
**oblivious → suspicious → paranoid → actively engaged.** Sensory detections and
events (saw/heard something, took damage, got a distress call) **raise** it; it
**decays** when nothing reinforces it. **Better hearing/eyesight ⇒ it rises faster
and higher** — good senses notice threats sooner. Alertness then:

- **gates the strategy _class_** — **oblivious → idle**, low → **routine** (patrol/
  work), suspicious/paranoid → **searching** (investigate/sweep), engaged →
  **active combat**;
- sets a **base reassessment urgency**.
  _(Soft feedback only: a heightened NPC also peers/listens a bit harder, so
  alertness can mildly sharpen effective sensing — but the primary direction is
  **sensorium → alertness**, not the reverse.)_

**3. Skill / smarts (static trait, a _multiplier_).** On top of alertness, higher
skill **multiplies**:

- **reassessment frequency** — smarter NPCs re-think more often, and
- **strategy aggressiveness / quality** — smarter NPCs are **more likely to pick
  less-passive** strategies (the GTA-V "keep doing things" bias) and **better
  execution tiers** (see worked examples), plus better weapon **lead + drop**
  (the shared smartness dial).

Summary: **sensorium → alertness** decides _what class / how urgent_; **skill**
decides _how often you re-think and how actively/well you act._

### Personality / disposition → which strategy in a class

Within the alertness-gated class, **personality** picks the specific behavior:

- **Aggression / bravery** — on spotting an enemy, a **brave** unit goes **hostile**,
  a **cowardly** one goes **evasive**. (Destroyer vs. merchant ship.)
- **Tactical archetype** shapes the _hostile_ strategy:
  - **take cover** / hold — cautious
  - **flank** — sniper / U-boat (attack from an advantageous angle)
  - **charge** — berserker
  - **charge obliquely** — smarter berserker
- **Situational assessment** modulates the choice: whether the NPC perceives itself
  in an **advantageous vs. disadvantageous** position (numbers, health, range,
  angle) pushes it toward press-the-attack vs. cover/flank/retreat.

So selection is **hierarchical**: `alertness → strategy class`, then
`personality + situational assessment (+ skill) → specific strategy`.

**Worked example — skill grades the _execution_, not just the choice.** Same intent
(hostile, but out of range → close the distance), three quality tiers of the _same_
goal:

- **Dumb** → **charge** straight at the enemy (predictable, exposed).
- **Less dumb** → **close obliquely** (approach at an angle — harder to hit).
- **Better** → **dash to a closer position that's _safe_** (reposition into range
  using cover/terrain).
  And the mirror case — **hostile but scared → retreat / survive:**
- **Dumb** → **flee** (run straight away — predictable).
- **Less dumb** → **flee evasively** (juke / zigzag — harder to hit).
- **Better** → **dash to a safe position further away** (retreat _toward_ cover/
  safety, not just "away").

This is the model for how `skill` should work throughout: a low-skill NPC still
does the _sensible_ thing (close the distance / get away), just the crude version
of it — readable and exploitable, not broken. Both examples share the shape _"same
intent, three execution tiers."_ (Note: the top "safe position" tier — for both
approach and retreat — leans on cover/pathing, which is **deferred**, so v1 reaches
charge/oblique and flee/evasive; the safe-dash tiers land when navigation does.)

### Factions (who is an enemy, and how you regard them)

Factions are a **directed matrix**: for each ordered pair `(observer, other)` two
values —

- **hostility** — how much the observer wants to harm the other (drives
  enemy/neutral/ally classification and target selection: "nearest _enemy_"), and
- **regard: contempt ↔ fear** — a single signed axis for how the observer sizes the
  other up. **Contempt** → engage boldly (press/charge even at a disadvantage);
  **fear** → timid (flee/evade/cautious even when hostile).

**Asymmetric by design:** faction A may _hate and try to kill_ B while B merely
_dislikes and fears_ A. Each direction is independent.

How it plugs in: **hostility** decides who's a valid target; **regard** modulates
the **fight-vs-flee disposition** — it stacks with the NPC's own personality
(aggression/bravery) and the **situational assessment** to produce the final
choice (charge / flank / take cover / flee) and which execution tier. So a
contemptuous berserker charges; a fearful merchant flees evasively; the same
situation reads differently per faction relationship.

_(Faction sets the baseline disposition; per-NPC personality is the variation on
top. Membership is per-NPC.)_

### Inter-AI activation (coordination)

NPCs can **activate one another**: send **distress calls** and **share target /
last-known-position info**, which **raises nearby allies' alertness** and seeds
their memory with the enemy's position. (A lone sentry spotting you can wake a
whole outpost.) Cheap, event-driven; not full squad tactics.

### Out of scope (for now)

**Pathing, cover mechanics, squad maneuvers** etc. are explicitly **deferred** —
not needed yet. Strategies can assume simple "head toward / away from a point" for
v1; richer navigation comes later.

### Perception → knowledge (memory)

The AI acts on what it has perceived, not ground truth: **known enemies**,
**last-known positions** (persist/decay after line-of-sight is lost), and
**visited waypoints** with **recency**. (Exact persistence/decay TBD.)

### Resolved

- ✅ **Selection is hierarchical**, not flat: **alertness → strategy class**, then
  **personality + situational assessment (+ skill) → specific strategy**. (Within a
  class, scoring can rank candidates; skill sharpens it.)
- ✅ **Cadence** = driven by **alertness** (more alert ⇒ more often) **and skill**.
- ✅ **Bias toward action** (the GTA-V lesson) — prefer strategies that keep the NPC
  _doing_ something over static turtling.

### Open questions

1. **Skill = one scalar, or sub-skills?** Separation confirmed: **sensorium**
   (perception params) + **alertness** (dynamic, sensorium-driven) + **skill**
   (static multiplier). Remaining: is `skill` a single 0..1 dial (reassess rate ×
   aggressiveness × aim), or split into sub-skills (perception acuity / aim /
   tactics)? (Single scalar simplest; unifies with weapon smartness. Note sensory
   acuity already lives in the sensorium, so a perception sub-skill may be
   redundant.)
2. **Detectable profiles depth** — v1 = **vision cone + hearing radius** only, or
   the fuller **Sensorium/Detectable** (radar/visible/audio/scent, each with
   sensitivity + range + **directional falloff** via dot-product with facing)?
   (Your earlier TODO had the fuller version; alertness multiplies whichever we
   pick.)
3. **Reassessment staggering** — stagger NPC clocks (seeded offset) + cap
   reassessments/frame so a crowd doesn't spike a frame? (Assume yes.)

### Implementation sketch (tentative)

- Pure `npc-ai.ts`: `chooseStrategy(perceivedWorld, memory, skill, strategies) →
strategyId` (deterministic; skill sharpens scoring) and per-strategy pure
  `step(state, memory, skill) → ControlInput`. No Babylon — takes a **perceived
  world snapshot** the bridge assembles from scene queries; unit-testable (patrol
  visits unvisited waypoints, pursue heads to last-known position on LOS loss,
  higher skill reassesses/chooses better).
- Pure `sensorium.ts`: given sensor params + candidate Detectables → what's
  perceived (cone/range/falloff math, LOS predicate supplied by the bridge).
- Bridge (an `InputProvider` impl): runs the vision/hearing scene queries, feeds
  the pure chooser/stepper, applies the resulting `ControlInput` to the
  controllable. Shares the **firing-solution smartness** with weapons.
