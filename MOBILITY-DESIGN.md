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

Tonio: _"Mario is not gradually turning into GTAV. They are different by
intention."_ Worth stating flatly, because "make it configurable" is the
default instinct and it is wrong here: the platform jumper's whole value is
that the character does exactly what you pressed, and any amount of the
character deciding things destroys it. These are not two ends of a dial. They
are two contracts.

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

## Derived from geometry, NEVER painted on it

The sharpest rule here, and the one with teeth. Two failure modes Tonio names:

- **Mass Effect's cover.** Cover is statically determined by a level designer.
  It does not matter whether a thing _looks_ like it would work as cover — it
  only matters whether someone painted the area with cover polygons.
- **MGSV's climbing.** The hero can do almost anything, but can only climb
  cliffs carrying a specific graphic.

Both break the same contract, and it is a contract about _trust_: the player
learns the world by looking at it, then discovers that looking at it was the
wrong way to know. A wall that plainly shelters you but is not painted is worse
than no cover system, because it teaches you to stop believing your eyes.

The alternative is not "better painting". Tonio's contrast is exact: cover
shooters that work do so **either** because geometry and line of sight actually
dictate cover, **or** because the designers were whipped until every spot anyone
could think of was painted — and only the first scales. (Borderlands is offered
as genuinely good mechanics with awful AI, which is a useful reminder that the
two are separable and fail separately. See AI-DESIGN.md.)

**The gold standard is the original box-terrain Tomb Raider**: climbability was
strictly geometric. The newer ones drift toward painting, and are better about
it than most only because the legacy keeps them honest.

### Why they paint, and why we might not have to

The honest engineering note: TR's world was literally a grid of blocks, so "can I
climb this?" was a question about a _shape_, answerable analytically. On
arbitrary triangle soup the same question is genuinely hard, and painting is what
studios do about that. Derivation is not a matter of virtue.

But **our terrain is closer to TR's box world than to triangle soup.** The voxel
/ density-field substrate (`sdf-lattice`, `patch-field`, TUNNEL-DESIGN.md) is a
field we can _query_ — a ledge, an overhang, a nook is a fact about the field
rather than something to be recovered from geometry after the fact. That is a
real structural advantage for this north star and an argument for pushing
mobility toward the terrain substrate rather than toward mesh annotation.

### The line this draws through OUR conventions

tosijs-3d is full of authored metadata — `_collideMesh`, `_collideCylinder`,
`_mirror`, `_noshadow`. That is painting. So the rule needs a boundary, or the
next person adds `_cover` and `_climbable` and reinvents Mass Effect:

> **Suffixes declare what geometry IS. Affordances describe what a character can
> DO with it, and must be computed.**

`_collideMesh` says "this is solid" — a physical fact about the object, true for
everyone, cheap to author and impossible to derive (we cannot know a decorative
railing is not a wall). "You may take cover here" is not a property of the
railing; it depends on the character's size, stance, and where the shooting is
coming from. It is a _relation_, and relations have to be computed or they are
lies.

**A `_cover` suffix would be a bug, not a shortcut.**

## Probes: one budgeted read of the surroundings, not a fan per feature

Recorded 2026-08-28, when the first piece of this actually shipped (`mantle.ts`

- the biped's `_readLedge`). Tonio, watching it go in: _"we're probably going to
  need a bunch of raycasts (maybe not sampled constantly) to handle tomb-raider
  style movement and cover discovery."_ Both halves are already true.

**A bunch.** The first implementation used ONE forward ray at shin height and it
failed against real terrain immediately: the canal bank's face existed only
between 0.25 m and 1.25 m — undercut below, sloping away above — so the ray
passed clean underneath a wall the character was visibly stuck against, and the
climb never considered itself. Nothing was wrong except the height of one line.
Five rays up the reachable band fixed it. Expect the same shape everywhere:
**real geometry is not sampled correctly by a single ray**, and the failure is
silent, because a miss is indistinguishable from "nothing there".

**Not constantly.** A mantle check is eight casts (five for the face, three for
top, headroom and landing). Vaulting, cover discovery and a "can I get there"
query each want a similar read, and eight per frame per feature is how a
character controller ends up dominating a frame budget. The mantle probe is
throttled to 12 Hz — at a run that is ~0.4 m between samples, far finer than any
ledge worth climbing — which costs a fifth of the naive version and misses
nothing.

The direction that follows: when the second consumer appears, **do not give it
its own fan of rays.** One budgeted environmental read per tick, shared —
"what is around me, at what heights, how far" — with features asking questions
of the result. That also puts affordances in exactly the place the north star
wants them (derived from a measurement of the world) rather than each feature
inventing its own private idea of the world's shape.

`COLLISION-DESIGN.md`'s rule already points here: a probe takes a POSE SOURCE,
never a position. A shared read is the same argument one level up.

## What it needs that we do not have

- **Affordance queries.** "Is this geometry cover, from where?" is the same
  question as [b3d-interactive](src/b3d-interactive.ts)'s "can I use this?", one
  layer up: an affordance found in the WORLD rather than declared on a tagged
  object. Note the **"from where"** — it is a relation between geometry, a
  character and a threat, which is precisely why it cannot be a suffix. The interaction substrate's veto seam is probably the right shape for
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

- ~~If deriving cover every frame proves too noisy — flickering in and out at a
  boundary — then it needs hysteresis, and hysteresis is a state.~~ **This
  fired, on 2026-08-27, in the smallest possible case.** Walking down a ramp
  into water, submersion hovers around the swim threshold and the character
  flickered between swimming and standing — "there's sometimes a twitch and you
  go back to standing as you ramp into water". `isSwimming` now enters at 0.5
  and holds until 0.35.

  So the claim survives with a caveat rather than intact, and the caveat is
  narrow: the state is one bit, it changes **when you switch**, never **what you
  can do**, and there is still nothing to be stuck in — the hysteresis band is
  0.15 of a body, not a mode you have to escape. Cover should expect the same
  and budget for it from the start rather than discovering it late.

- If players read an automatic baulk as **unresponsive** rather than as
  judgement, the intent model is wrong for anything action-paced and belongs
  only where the pace allows it.

## Cross-references

`AI-DESIGN.md` (the skill dial, and why the low end is the interesting one),
`COLLISION-DESIGN.md` (probes take a pose source — what an affordance query would
be built on), `src/b3d-interactive.ts` (the use/veto seam), `src/buoyancy.ts`
(derivation over modes, already shipped and working), `TODO.md` → the locomotion
entry.
