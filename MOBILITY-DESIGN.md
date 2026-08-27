# Mobility — two models, and cover you discover

> **Status: design, not built.** Recorded 2026-08-27 from Tonio's framing while
> we were tuning a jump button and finding that no amount of tuning would fix
> it. Nothing here is scheduled. It is animation-led and wants a real set first
> (Quaternius is being looked at, which also brings props and customisation).

## The problem that started it

A jump the player triggers must fire **now** to feel responsive. A jump that
looks right must wind up **first**. The wind-up is exactly the part nobody will
wait for, so every game splits the difference and every game's jump looks a bit
wrong.

We hit this immediately and measured it. The stock `running-jump` clip is
**0.93 s** and almost entirely airborne; the standing `jump` is **1.93 s**
because most of it happens with the feet down — crouch and recovery. The running
jump reads well precisely because the character was **already committed and
moving**. Crouch-on-press/launch-on-release buys some of the anticipation back
by spending a moment the player chose to spend, and it is still a compromise.

Tonio: _"jumping looks terrible in almost all games because for gameplay you want
it to be instantaneous but real jumps require anticipation that is insanely hard
to do properly."_

## The bifurcation

`b3d-biped` should become **two locomotion models**, not one model with a
realism slider. They make opposite promises and a spectrum between them would
keep both.

|                     | **Platform jumper**                         | **Intent model**                                  |
| ------------------- | ------------------------------------------- | ------------------------------------------------- |
| The player supplies | a verb, executed now                        | an intention                                      |
| Jump is             | instantaneous, a core gameplay function     | something the character does on the way somewhere |
| Movement is         | a control                                   | a **skill the character has**                     |
| Contract            | the character does exactly what you pressed | the character attempts what you meant             |
| Reference           | Mario, Celeste                              | RDR2's horses, Mirror's Edge, Tomb Raider         |

The intent model is the RDR2 horse: _"you just steer them and they figure out the
terrain."_ It refuses the responsiveness/anticipation trade instead of splitting
it, because the character **decides to jump before the player would have** — so
it has the time to wind up properly. Consequences that follow, and each is a
behaviour rather than a feature:

- **Baulking at cliffs.** Not refusing input — arriving at an edge and visibly
  declining, which reads as judgement.
- **Prepping a jump automatically**, so the gap is crossed by a run-up that
  started before you asked.
- **Parkour when capable**, which makes capability an attribute of the character
  rather than of the player's button work.

That last one matters for the whole project: it puts mobility on the same
**skill dial** as combat and AI, so a clumsy character is expressible and
interesting rather than a bad one. See AI-DESIGN.md → "artificial stupidity":
invest in the LOW end.

## The north star: cover you DISCOVER

Tonio's own framing, and the sharpest requirement here:

> Characters being able to **"discover" cover** — push into a nook while
> crouched and you automatically take cover; move out of cover and that is
> automatic too. Cover mechanics **without "stuck in cover"**. Possibly explicit
> "dash from cover to cover". The best of GTA V and Watch Dogs, with Mirror's
> Edge and Tomb Raider thrown in.

The anti-goal is the load-bearing half. Nearly every cover system is a **mode you
enter and are then trapped in**, and the trap is what people hate — the wrestle
to get out, the stick input that means something different for as long as you are
stuck, the character glued to a wall you wanted to walk past.

**Cover must be DERIVED, never entered.** It is a description of where you are
standing and how, not a state you transition into. Stand in the nook crouched
and you are in cover; walk away and you are not; nothing was pressed either way
and nothing can be stuck, because there is no state to be stuck in.

We already have that pattern working, which is the encouraging part. Swimming is
derived exactly this way — `isSwimming(submerged, restingOnFloor)` is a function
of the world, not a mode — and it is why entering and leaving water needs no
transitions and cannot desync. Cover is the same shape at a larger scale.

`dash from cover to cover` is then the one explicit verb, and it is safe to add
**because it is a movement order, not a mode change**: it says "go there", and
being in cover on arrival is still derived.

## What it needs that we do not have

- **Affordance queries.** "Is this geometry cover, from where?" is the same
  question as [b3d-interactive](src/b3d-interactive.ts)'s "can I use this?", one
  layer up: an affordance found in the WORLD rather than declared on a tagged
  object. The interaction substrate's veto seam is probably the right shape for
  the composition — `cover` is a thing a piece of geometry offers, and other
  features get to say "not from that angle".
- **A capability set per character** — can it vault, mantle, climb, wall-run —
  so "if sufficiently capable" is data rather than a branch.
- **Terrain reading ahead of the character**, which is what makes a run-up
  possible at all. The probe work in the biped (step offset, ground snap) is the
  primitive; this needs it aimed forward rather than down.
- **A real animation set.** The whole idea is animation-led: without clips for
  vault, mantle, slide-into-cover and the transitions between them, the intent
  model has nothing to express and would degrade to the platform jumper with
  extra latency.

## What would falsify it

- If deriving cover every frame proves too noisy — flickering in and out at a
  boundary — then it needs hysteresis, and hysteresis is a state, and the
  "cannot be stuck" property is weaker than claimed. Worth testing early with
  something crude before building on it.
- If players read an automatic baulk as **unresponsive** rather than as
  judgement, the intent model is wrong for anything action-paced and belongs
  only where the pace allows it.

## Cross-references

`AI-DESIGN.md` (the skill dial, and why the low end is the interesting one),
`COLLISION-DESIGN.md` (probes take a pose source — what an affordance query would
be built on), `src/b3d-interactive.ts` (the use/veto seam), `src/buoyancy.ts`
(derivation over modes, already shipped and working), `TODO.md` → the locomotion
entry.
