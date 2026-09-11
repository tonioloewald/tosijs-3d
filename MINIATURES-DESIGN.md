# Miniatures battle — RECOVERED NOTES

> ⚠️ **This is not the design document, and must not be treated as one.** Tonio:
> *"when / if we rebuild this thing it will be its own project. I'll write a
> comprehensive design document before we build in earnest."* The game is a
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
> He also describes the original as *"a beautiful design and an early victim of
> creeping elegance / featuritis"*, which has a section of its own at the end
> because it is the most useful sentence in these notes.

The measured constraint is gone: a whole battle is ~270 figures against 200,000
drawn at 60ms in a lit, shadowed scene — or 20,000 figures carrying a REAL rig's
1,380 vertices at 33ms, which is still seventy battles at once (see
[`b3d-crowd`](src/b3d-crowd.ts), which also explains why those two are not the
same budget). So none of what follows is
a performance decision. It is all here because it produced **feel**, which is
the thing that does not get easier with faster hardware.

## The scale

| | |
| --- | --- |
| regular unit | 15 figures |
| irregular unit | 7 figures |
| army | 3–9 units, laid out three wide, as deep as forces allow |
| largest army | 9 × 15 = **135** |
| a battle | **~270** |

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

| | integrated (`ballistics.ts`) | parameterised (this) |
| --- | --- | --- |
| state per shot | position + velocity | `from`, `to`, `t0` |
| per frame | a step + a swept collision test | one lerp + an arc height |
| outcome | emerges | decided at launch |
| right for | a bomb sight, a guided round | a volley of 200 arrows |
| determinism | needs care | free |

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
*the interesting behaviour is in the TRANSITION, and the temptation is always to
skip it.* A unit that teleports into formation is cheaper, tidier, and dead.

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

> *"a beautiful design and an early victim of creeping elegance / featuritis"*

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

| capability | state | nearest existing |
| --- | --- | --- |
| **Instanced animated figures** — many, one draw call | built ([`b3d-crowd`](src/b3d-crowd.ts), [`vertex-animation`](src/vertex-animation.ts)) | — |
| **Parameterised projectile** — `(from, to, t)`, outcome decided at launch, instanceable | not built; pure and small | `ballistics.ts` (the integrated sibling) |
| **Cell occupancy + sub-cell pose** — O(1) "is it taken", pose from a small offset table | not built; pure | `terrain-grid.ts`, `world-topology.ts` |
| **Formation as CELLS rather than positions** | partial | `formations.ts` computes continuous positions today |
| **Arrive-and-re-form as a visible transition** | not built | `AI-DESIGN.md`'s watchable-behaviour rule |
| **A destroyable that carries a ROLE**, so its death changes what a group can do | close | `destroyable-behavior.ts` + `Cause {by, kind, via, hops}` |

Every row is useful to something other than a miniatures game: a parameterised
arc is right for any thrown or fired thing whose hit is decided by a roll, cell
occupancy is right for any tile-based world, and a role-carrying destroyable is
how "the radio operator died" becomes a sentence a simulation can produce.

That is the test for whether any of it belongs here: **would a second, unrelated
game want it?** If not, it goes in the game's project.