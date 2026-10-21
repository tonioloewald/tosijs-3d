# Miniatures battle — RECOVERED NOTES

> ⚠️ **This is not the design document, and must not be treated as one.** Tonio:
> _"when / if we rebuild this thing it will be its own project. I'll write a
> comprehensive design document before we build in earnest."_ The game is a
> CONSUMER of this framework, not part of it, and its design is his to write.
>
> What this is: detail recovered in conversation from the original Amiga 500
> version (7MHz, 320×200, 16 colours, ~10fps), written down before it evaporates
> — the kind of thing that is expensive to re-derive and impossible to
> re-remember. Raw material for that document, nothing more.
>
> **What tosijs-3d should act on is the last section**, which extracts the
> framework capabilities these mechanics imply. Those belong here. The rules of
> the game do not.
>
> He also describes the original as _"a beautiful design and an early victim of
> creeping elegance / featuritis"_, which has a section of its own at the end
> because it is the most useful sentence in these notes.

The measured constraint is gone: a whole battle is ~270 figures against 200,000
drawn at 60ms in a lit, shadowed scene — or 20,000 figures carrying a REAL rig's
1,380 vertices at 33ms, which is still seventy battles at once (see
[`b3d-crowd`](src/b3d-crowd.ts); `DECISIONS.md` → "Crowd benchmarks" explains why
those two are not the same budget). So none of what follows is
a performance decision. It is all here because it produced **feel**, which is
the thing that does not get easier with faster hardware.

## The scale

|                |                                                         |
| -------------- | ------------------------------------------------------- |
| regular unit   | 15 figures                                              |
| irregular unit | 7 figures                                               |
| army           | 3–9 units, laid out three wide, as deep as forces allow |
| largest army   | 9 × 15 = **135**                                        |
| a battle       | **~270**                                                |

## Four mechanics, and why each one works

### 1. Occupancy is per SQUARE; pose is a fixed offset within it

Each figure sits on a virtual 4×4 grid inside its own square — sixteen discrete
offsets — so placement is a lookup and collision is "is that square occupied".

- **O(1) per move**, O(N) at N figures, against a broadphase whose cost grows
  with density — which is exactly when a battle needs it not to.
- **Formations fall out** rather than being fought for: a rank IS a row of cells.
- **"Can I stand there"** is a lookup, not a tolerance you tune forever.
- It reads as a crowd rather than a chessboard because **occupancy is discrete
  and pose is continuous-enough**. Sixteen offsets is plenty of apparent
  disorder.

Modern payoff, larger than the original: a figure's whole state is four small
integers (`cellX`, `cellZ`, `offsetIndex`, `facing`) from which the matrix is
DERIVED — so a thin-instance buffer changes only when a figure changes cell or
offset, **not every frame**. That is the difference between writing N matrices
per frame and writing none.

Nearest relatives: `terrain-grid.ts` (tile maths), `world-topology.ts`
(coordinate-free occupancy), `formations.ts` (which computes CONTINUOUS
positions today and wants a cell-and-offset variant).

### 2. A projectile is `(launch, landing, t)`

No velocity, no gravity step, no per-frame collision query. Position is that far
along an arc.

The point is not speed. It is that **the outcome is decided at launch**: whether
the arrow hits is a roll when it is loosed, and the flight is presentation. That
is right for a miniatures game and wrong for the aircraft, where
`ballistics.ts` integrates precisely because prediction must equal simulation
for a bomb sight to be honest. Two legitimate models:

|                | integrated (`ballistics.ts`)    | parameterised (this)     |
| -------------- | ------------------------------- | ------------------------ |
| state per shot | position + velocity             | `from`, `to`, `t0`       |
| per frame      | a step + a swept collision test | one lerp + an arc height |
| outcome        | emerges                         | decided at launch        |
| right for      | a bomb sight, a guided round    | a volley of 200 arrows   |
| determinism    | needs care                      | free                     |

And it instances: `from`/`to`/`t0` never change during flight, the same shape as
the crowd's `vatState`, so a volley is one draw call and no CPU work.

### 3. A unit RE-FORMS on arrival, so transit is chaotic and vulnerable

Every unit has a preferred formation and arranges itself into it (modulo facing)
when it reaches a destination. In transit it is a mess.

This is the mechanic that produces the tactics, and it is worth being explicit
about why. Movement is not free and not instantaneous, and the cost is not a
number in a table — **it is a state you can see and exploit**. Catching a unit
mid-move is a real advantage that no rule grants you; it falls out of the
simulation being honest about the intermediate state.

The general principle, which is this project's north star stated another way:
_the interesting behaviour is in the TRANSITION, and the temptation is always to
skip it._ A unit that teleports into formation is cheaper, tidier, and dead.

### 4. You give orders by picking the FLAG BEARER

Command is a physical thing in the world, not a UI abstraction. Kill the flag
bearer and the unit cannot be directed until another member picks up the flag.

Three properties, none of which a command menu has:

- **Decapitation is a real tactic**, and it needs no special rule.
- **The command channel has a position**, so it can be reached, blocked, or lost.
- **Recovery is diegetic** — someone picks up the flag — which is a beat you
  watch rather than a cooldown you wait out.

Engine fit is close: a flag bearer is a `DestroyableBehavior` whose death
changes the unit's command state, and `destroyable.ts`'s `Cause {by, kind, via,
hops}` already carries who did it, which is what makes "the archers broke their
command" a sentence the sim can produce.

## The warning, which is the real inheritance

> _"a beautiful design and an early victim of creeping elegance / featuritis"_

The four mechanics above are small and they INTERACT. Grid occupancy makes
re-forming legible; re-forming makes transit vulnerable; the flag bearer makes
vulnerability exploitable; parameterised volleys make exploiting it cheap enough
to do at scale. The feel is in the interaction, not in any one of them.

That is exactly the kind of design that features destroy — not by being bad
individually, but by adding rules that dilute the ones already carrying the
weight. The original died of it once. Some guards, stated now while it is easy:

- **A new rule must make an EXISTING mechanic more interesting**, not add a
  parallel one. Morale that makes re-forming risky is good; morale as a separate
  number that decrements is featuritis wearing a design's clothes.
- **Prefer removing a special case to adding one.** Decapitation needing no rule
  is the model.
- **If it cannot be watched, it is not a mechanic.** This repo already says the
  unit of progress is a watchable behaviour (`AI-DESIGN.md`); a rule whose
  effect is only visible in a log is a rule nobody is playing with.
- **The 1980s constraints were doing design work.** Being unable to afford a
  feature is not the same as choosing not to have it, but the result is often
  identical and the constraint was more disciplined than we will be.

---

## What tosijs-3d actually owes this — the framework-facing half

Separated deliberately: everything above is the GAME's design and belongs in the
game's own project. What follows is the list of framework capabilities those
mechanics imply, which is this repo's business and can be built without knowing
a single rule of the game.

| capability                                                                              | state                                                                                  | nearest existing                                          |
| --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| **Instanced animated figures** — many, one draw call                                    | built ([`b3d-crowd`](src/b3d-crowd.ts), [`vertex-animation`](src/vertex-animation.ts)) | —                                                         |
| **Parameterised projectile** — `(from, to, t)`, outcome decided at launch, instanceable | not built; pure and small                                                              | `ballistics.ts` (the integrated sibling)                  |
| **Cell occupancy + sub-cell pose** — O(1) "is it taken", pose from a small offset table | not built; pure                                                                        | `terrain-grid.ts`, `world-topology.ts`                    |
| **Formation as CELLS rather than positions**                                            | partial                                                                                | `formations.ts` computes continuous positions today       |
| **Arrive-and-re-form as a visible transition**                                          | not built                                                                              | `AI-DESIGN.md`'s watchable-behaviour rule                 |
| **A destroyable that carries a ROLE**, so its death changes what a group can do         | close                                                                                  | `destroyable-behavior.ts` + `Cause {by, kind, via, hops}` |

Every row is useful to something other than a miniatures game: a parameterised
arc is right for any thrown or fired thing whose hit is decided by a roll, cell
occupancy is right for any tile-based world, and a role-carrying destroyable is
how "the radio operator died" becomes a sentence a simulation can produce.

That is the test for whether any of it belongs here: **would a second, unrelated
game want it?** If not, it goes in the game's project.

---

## From the b3d-crowd page (moved 2026-10-21)

Moved here verbatim from the `b3d-crowd` doc page, where it had grown up beside
the benchmark. Headings are one level down; otherwise unchanged. The benchmark
history and the crowd/skinned seam are in `DECISIONS.md` → "Crowd benchmarks and
the actors/crowd boundary".

### The target, and what it means that we cleared it

The game this was built to answer for is a virtual miniatures battle. Tonio's
original ran on an Amiga 500 — 7MHz, 320×200, 16 colours, about 10fps — where a
unit of regulars was 15 figures and one of irregulars 7, and an army was three
to nine units laid out three wide. So:

| | |
| --- | --- |
| largest army | 9 units × 15 = **135 figures** |
| a whole battle | **~270** |
| measured here | **200,000 blocky figures**, 60ms with shadows |
| or | **20,000 baked omnidudes** at 33ms |
| headroom | **~740×** on count, ~74× on a real rig |

That is not "we can do it". That is the constraint having moved somewhere else
entirely, which is the outcome worth acting on rather than celebrating.

**So figure COUNT should stop shaping the design.** The Amiga's answer to 270
figures was two or three animation states and 4-bit sprites; ours does not have
to be, and the budget freed should go where this project's north star says it
goes — *agents and reactions, not vertices* (`AI-DESIGN.md`). At 270 figures
every one of them can afford a real sensorium, its own equipment via
[[vertex-animation|sockets]], and a bake rate high enough that clip blending is
not a luxury reserved for wildlife.

### The roster, and why it is cheap

The content this actually needs is not one figure, it is a cast. Tonio: *"what we
will need is more figures and more animations. Assuming we have a winged
creature, heavy mounted, light mounted, heavy infantry, light infantry and some
accessories like helmets, shields, weapons."*

That lands well, and specifically it lands on the axis this substrate is cheap
on. **Draw calls scale with TYPES, not with figures**: one `b3dCrowd` per kind
is five draw calls for an entire battlefield, whatever the counts. A thousand
light infantry and eight hundred heavy are two calls, not eighteen hundred.

The memory is not the problem either. A 300-vertex soldier with eight clips
baked at 10fps is around 80 frames:

    300 × 80 × 4 channels × 2 bytes × 2 textures ≈ 0.8MB

So five types is a handful of megabytes, and doubling the clip count doubles a
number nobody will notice. `vatBytes` is there to check rather than trust —
the arithmetic turns nasty only at hero vertex counts with long clips (a
16.9-second dance at 1,380 verts is most of the omnidude bake on its own).

Three notes for when this is built rather than imagined:

- **Bake rate follows how far the silhouette moves between frames ON SCREEN** —
  which is not the same as how fast the animation is, and I had it wrong first
  time. I wrote "the winged creature needs a high bake rate, a flap is fast";
  Tonio: *"the winged creature is probably more like a dragon and has a slow
  majestic flap."* A slow flap covers its arc over more time, so it needs FEWER
  frames per second of clip, not more.

  What makes a dragon unforgiving is the other term: it fills the view. The same
  angular error between frames is a handful of pixels on a distant soldier and a
  hand's width on a wing overhead. So the rule is angular change × apparent
  size, and the two big cases pull in opposite directions — a fast flap far away
  (a flock of birds) and a slow flap up close (this) can want the same rate for
  entirely different reasons.

  A slow flap also spends most of its cycle nearly still, gliding. That is where
  a low rate is free, and it moves the real problem from frame rate to **clip
  blending**: the pop when glide becomes flap is what you would notice, and it
  is the one thing in `vertex-animation` still unbuilt.

  And a dragon is a HANDFUL, not a crowd — so it can afford whatever it wants,
  including not being baked at all. At three of them a skinned rig is fine
  (~50 is the measured ceiling); at fifty wyverns this substrate wins again.
- **Mounted is one figure, not two.** Horse and rider bake as a single mesh with
  a single clip table, because they move together and a seam between them is a
  second thing to synchronise for no gain. A rider who dismounts is a *different
  figure*, which is the same seam as promoting one to a named character.
- **Accessories are [[vertex-animation|sockets]]**, not geometry: helmet, shield
  and weapon ride as their own instanced meshes sampling the same frame. That is
  what keeps unit identity — the thing you actually read at forty metres — off
  the body's vertex budget. It is the one piece of this that is designed and not
  yet built.

### Which path a thing takes is decided by UNIT SIZE

The roster sorts itself once you ask how many of a thing stand together. Tonio:
*"a dragon unit will likely be ONE figure or maybe three."*

| unit | figures | path |
| --- | --- | --- |
| light / heavy infantry | 15 | baked crowd |
| light / heavy mounted | 7–15 | baked crowd (horse and rider as one bake) |
| **dragon** | **1–3** | **skinned rig** |

At one to three there is nothing to amortise, and everything a named entity
wants comes back: real clip blending (which the glide→flap seam actually needs),
bones to parent a rider or a breath effect to, per-instance damage state, a
skeleton for a hit probe. Baking one dragon would buy a draw call nobody was
short of and give up all of it.

So the two paths are not a ladder with the crowd at the top — they are a
**threshold**, and unit size is the test. Hundreds of a thing: bake it, and
accept that it cannot be inspected closely. One of a thing: rig it, and spend
the budget the crowd just saved you on making it worth looking at.

The seam between them is the piece to design rather than discover: a figure
promoted out of a crowd (a champion stepping forward) or demoted into one has to
cross it, and nothing does that today.

### The original game already had the answer

*"In the original game the figures were walking on a virtual game board and
basically offset within a square, so basically collision detection was just were
you trying to enter an occupied square."*

That is not a concession to a 7MHz 68000 — it is the right design, and it should
be copied rather than out-grown:

| | grid occupancy | continuous collision |
| --- | --- | --- |
| cost of a move | **O(1)** — is that cell taken? | broadphase + narrowphase against neighbours |
| cost at N figures | **O(N)** | O(N·k), and k grows with density |
| formations | fall out — a rank IS a row of cells | emergent, and fight the solver |
| "can I stand there?" | a lookup | a query with a tolerance you tune forever |

A figure being *offset within* its square is what buys the look back: the
occupancy is discrete and the pose is continuous, so it reads as a crowd rather
than as a chessboard. That separation is the whole trick, and it is worth
writing down before anyone reaches for a physics engine.

`world-topology.ts` already carries the coordinate-free half of this idea
(places, portals, containment), and `terrain-grid.ts` the tile maths. A battle
grid is closer to those than it is to `b3d-collisions`.
