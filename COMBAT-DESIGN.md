# Combat System Design

Living spec for the weapons/combat system: warheads, destroyables, shields,
projectiles (ballistic + guided), launchers, turrets, flame/melee, and the
targeting side (Sensorium / Detectable). Specs are captured here as they're
agreed; `TODO.md` (Combat) holds the actionable checklist.

## Architectural commitments

- **Pure, Babylon-free, testable models** for all math — damage resolution,
  ballistics, guidance/lead, shield state — as plain modules (cf.
  `aircraft-physics.ts`, `fly-by-wire.ts`), each bridged by a thin `b3d-*`
  component. Deterministic (MersenneTwister; no `Date.now`/`Math.random`) so it's
  unit-testable and replay-safe.
- **Respect the sim/driver decoupling** (`world-contract`): combat reports
  *physical* reality (a Destroyable took damage / died) via events; it never
  encodes narrative ("objective destroyed"). Meaning is a driver concern.

Status legend: ✅ agreed · 🟡 spec'd, open questions · ✏️ drafting

---

## Warhead ✅

The damage-delivery payload. Sits on a projectile (or bomb, or mine); the
delivery system carries it, the warhead decides what damage happens on contact.

### Agreed spec
- **Minimum activation time (arming delay).** For a period after launch/spawn the
  warhead is **inert** — it will not detonate. Prevents a projectile detonating on
  the launcher / point-blank.
- **Collision radius.** A sphere; contact within it triggers detonation (once
  armed).
- **Damage modes (one of):**
  - **Direct** — a fixed amount of damage to the single thing it hits.
  - **Area (AOE) ✅** — **linear falloff between two radii:**
    - **max-damage radius** `r_full` — within it, target takes **full** damage `D`.
    - **max (blast) radius** `R` — damage scales **linearly** from `D` (at
      `r_full`) down to **1** (at `R`), i.e.
      `dmg = D − (D − 1)·(d − r_full)/(R − r_full)` for `r_full < d ≤ R`.
    - beyond `R`: **0** (unaffected).
    Note the floor is **1**, not 0 — anything inside the blast radius takes at
    least 1 (before armor/protection). (Deliberately linear, not inverse-square.)
    **Occluded ✅:** the blast only affects a target with **nothing between it and
    the warhead** — shields and other geometry **block** the splash (line-of-sight
    per target; a blocked target takes nothing). *Shelved refinement:* if the
    blast **destroys** the blocker (e.g. pops a shield), let the
    **remaining/overkill** damage pass through to what was behind it. Not in v1 —
    v1 is binary block / no-block.
- **Explosion effect (optional).** A warhead may spawn an explosion effect,
  oriented either:
  - **normal to the impact** — a surface explosion (uses the hit surface normal), or
  - **world-space aligned** — an airburst.
- **Single-use ✅.** A warhead is **destroyed when it inflicts damage**. There is
  no multi-hit / re-arming warhead — **if you want anything more complex, add more
  warheads.** This is the system's composition principle: keep each warhead simple
  and single-purpose; stack several for compound effects.

### Consequences of the composition principle (resolved)
- **Direct vs. AOE is one mode per warhead ✅** — want a direct hit *plus* splash?
  Put **two warheads** on the projectile (one direct, one AOE). No combined mode.
- **Death explosion = a Warhead ✅** — a Destroyable that "blows up and hurts
  everything nearby" simply carries a **Warhead that fires on destruction**. (So
  Destroyable's death-AOE question is answered: reuse Warhead; keep the directed
  chain link for scripted propagation.)

### Defaulted (override anytime)
- **Arming** — time-since-launch only (no min-distance in v1); while inert the
  projectile **passes through** targets (no detonation, no bounce).
- **Owner / friendly fire — NONE.** A warhead has **no** owner or faction
  exclusion; once armed it damages **anything** in range, **including its own
  launcher/owner**. The **activation delay is the only self-protection** (it can't
  detonate point-blank on launch). So you *can* blow yourself up with your own bomb
  if you're too close when it arms. (Contrast: **melee** *is* owner-friendly.)
- **Trigger surface** — detonates on **any solid contact** (terrain/geometry too,
  so bombs explode on the ground), not just Destroyables.

*(AOE falloff — RESOLVED: linear `r_full`→`R`, floor 1. AOE occlusion — RESOLVED:
line-of-sight. Damage type — SHELVED, single scalar v1. See Destroyable →
Resolved.)*

### Implementation sketch (tentative)
- Pure `warhead.ts`: `resolveDamage(warhead, impactPoint, targets[]) → Array<{target, amount}>` — no Babylon; unit-tested against known geometries. Occlusion stays out of the pure model: it either receives **already-LOS-filtered targets**, or takes an `isVisible(target) => boolean` predicate the bridge supplies. Falloff math is pure/testable.
- `b3d-warhead` (or a field on the projectile component) bridges: collision-sphere
  overlap test in the scene, arming timer, the **LOS raycast** from the impact
  point to each candidate (blockers = shields/geometry), spawns the explosion
  effect with the chosen orientation, applies results to overlapping Destroyables.

---

## Destroyable 🟡

Anything that can take damage and be destroyed — the sink every warhead resolves
against. This is the core state model of combat.

### Agreed spec
- **Damage capacity** — the HP pool. Destroyed when it's exhausted.
- **Regeneration rate** (default **0**) — capacity restored over time, but only
  after a **regen delay**: regen does not cut in until **no damage has been
  received for time x** (default **0.5 s**), then resumes.
- **Armor** — a flat amount of damage **shrugged off** each hit (subtracted from
  incoming damage before it touches capacity).
- **Protection by another Destroyable** — while the protector is intact, incoming
  damage is reduced by a **flat amount** (the protection value), and the reduced
  damage simply **vanishes** (it is *not* dealt to the protector). E.g.
  `protection 2` turns incoming `5` into `3`. *(Revised from an earlier
  "fraction" reading — it's flat, like armor, but conditional on the protector
  being intact.)* "Full protection" (suffer no damage) = a protection value large
  enough to absorb any hit.
- **Chain reaction** — on destruction, inflicts a specified amount of damage to
  **linked** Destroyable(s) after a delay (**default 0.25 s** when a link exists).
  A **list** of links (one-to-many), and it **cascades** (a link that destroys its
  target fires *that* target's links too). This is the mechanism for:
  - a **generator** whose destruction destroys the **shields it powers**, and
  - the **Death Star**: a bomb down the exhaust chute destroys a small critical
    Destroyable, which chain-links to destroy the **whole station**.
  So chains model both *propagation* (generator → many shields) and *criticals*
  (tiny weak point → the big thing dies).

### Damage resolution pipeline (draft — confirm ordering)
Per incoming damage packet, tentatively:
1. **Shield** absorbs first (front of the intake — usually *spatial*: the hit
   lands on the shield's collider instead; see Shield).
2. **Protection** — if a protector is intact, subtract its flat protection value
   (the reduced damage **vanishes**; it is not dealt to the protector).
3. **Armor** — subtract flat: `effective = max(0, dmg − armor)`.
4. **Apply** `effective` to capacity.
5. If capacity ≤ 0 → **destroyed**: fire the chain link(s) (after each delay), run
   the death outcome (corpse/wreck/explosion — and any on-death **Warhead**), emit
   a `destroyed` event. Otherwise emit `damaged`.
Regen ticks capacity back toward max **once no damage has arrived for the regen
delay** (default 0.5 s); never past max; stops at destruction.

### Resolved
- ✅ **Protection is flat + vanishes** (see spec). *Open sub-points:* is
  **"intact"** = not-destroyed (assumed) or full-capacity? Are protection links
  **transitive**? (defaulting: intact = not-destroyed, non-transitive for v1.)
- ✅ **Chain = list, cascades** (generator→shields; Death-Star critical). *Open
  sub-point:* is chain damage a normal packet (subject to armor/protection/shield)
  or does it bypass? (defaulting: normal packet — set the amount high to guarantee
  a kill.)
- ✅ **Regen delay** — resumes after no damage for x (default 0.5 s). Armor is
  constant (no armor regen).
- ✅ **Death AOE = an on-death Warhead** (composition principle); the chain link
  stays for directed propagation.
- ✅ **Damage type SHELVED** — single scalar for v1. Future (Foresight RPG):
  **kinetic, impact, energy** damage types with matching resistances; design armor
  now as one scalar but leave room to become per-type later.

### Open questions (to confirm before implementing)
1. **Ordering sanity:** is the pipeline order (shield → protection → armor →
   capacity) right? Specifically, **armor before or after protection**? (Order
   only matters at the `max(0, …)` floor; with both flat they otherwise commute.)

### Implementation sketch (tentative)
- Pure `destroyable.ts`: a `DestroyableState` + `applyDamage(state, packet) →
  {state', events[]}` and `regen(state, dt)`. No Babylon, deterministic,
  unit-tested (armor floor, partial protection, chain-with-delay, cascades).
  Links/protectors referenced by id so the model stays serializable (fits
  `world-store`).
- `b3d-destroyable` bridges to a mesh: wires the collider, drives the death
  outcome/effect, emits events onto the scene/world-store.

---

## Shield 🟡

**A Shield is a Destroyable with a collider that spatially blocks attacks aimed at
something else.** Almost entirely *composition* of primitives already defined —
this validates the model rather than adding much new.

### What it reuses (no new mechanics)
- **Is a Destroyable** — capacity, regen (this is the classic *shield recharge*),
  armor. Hits on the shield damage the shield's own capacity.
- **Protection link** — the protected thing has a (full or fractional) protection
  link to the shield: *impossible or hard* to damage while the shield is intact.
- **Chain links** — the "connected shields" pattern is just one-to-many chain
  links (see below). Confirms Destroyable needs a **list** of chain links.

### What's genuinely new
- **A collider (sphere or other)** that physically intercepts projectiles/warheads
  *before* they reach the protected thing. This makes the pipeline's "shield
  absorbs first" step **spatial**: a projectile simply hits the shield's collider
  (a normal Destroyable taking a hit); only when the shield is **down** do attacks
  pass through to the protected collider. Reuse the convention-based collider
  system (`b3d-collisions`: sphere/box/cylinder/mesh).

### Two protection mechanisms, combined
1. **Spatial** (collider) — blocks attacks that *cross* the shield boundary.
2. **Abstract** (protection link) — while the shield is intact, the protected
   Destroyable takes no / fractional damage even from what leaks (e.g. AOE).
Emergent nicety from the spatial model: an attack that **originates inside** the
shield bubble isn't intercepted → "you must get inside the shield to hurt it."

### Canonical patterns (from spec)
- **protected destroyed → shield destroyed** (a chain link protected→shield).
- **shield intact → protected safe** (full protection); *partial* for the "hard
  but not impossible" case.
- **Cascade vulnerability:** a partially-shielded **generator**, when destroyed,
  chain-links to a bunch of **connected shields**, destroying them → everything
  *those* shields protected becomes vulnerable at once. (Chain links, one-to-many.)

### Open questions (to confirm before implementing)
1. **Downed collider:** when the shield's capacity hits 0, its collider **stops
   intercepting** (attacks pass through), yes? And on regen, does it **pop back up**
   (collider re-enabled) at full capacity, or at any capacity > 0, or a threshold?
2. **Recharge behavior:** shields are the poster child for **regen-pause-after-hit**
   (Destroyable Q3) — want a recharge *delay* after the last hit, then regen? A
   downed shield presumably has a longer **down-time** before it starts recharging?
3. **Topology:** can multiple shields protect one thing (**layered** shields, hit
   outer-first)? Can one shield protect **many** things? ("connected shields"
   implies many-to-many is allowed.)
4. **Does hitting the shield count as hitting the protected** for targeting/AI
   (a turret leading a shielded target aims at the shield collider)? (Probably
   yes — targeting sees the outermost collider.)

### Implementation sketch (tentative)
- No new pure model — Shield = a `DestroyableState` + a collider + protection/chain
  links, all already in `destroyable.ts`.
- `b3d-shield` component: owns the collider, references its protected target and
  linked shields by id, disables/enables the collider on down/recharge, and (as a
  Destroyable) participates in the same damage pipeline + events.

---

## Ballistic projectile ✅

The dumb, fast carrier a Warhead rides on. No guidance — it just flies a plausible
ballistic arc.

### Agreed spec
- **Initial velocity** (a world-space vector — the "velocity arrow").
- **Mass.**
- **Drag coefficient** — "a little bit of friction."
- Flies a **reasonably plausible ballistic route**: gravity + quadratic drag
  opposing motion. Gravity is mass-independent; drag deceleration scales with
  `dragCoeff/mass` (heavier = flatter, longer; draggier/lighter = arcs & stops
  sooner). Rough model:
  `accel = gravity − (dragCoeff/mass)·|v|·v ; v += accel·dt ; p += v·dt`
  (air density/area folded into `dragCoeff` — plausible, not a wind-tunnel).

### Pure vs. physics engine — the bomb sight decides it
- **Big wrinkle: an optional BOMB SIGHT** that projects the **path** and the
  **expected impact point**.
- This argues for a **pure integrator** over Jolt: the sight is just the *same*
  integrator **run forward** from the current state until it hits terrain/a
  collider — so **prediction == simulation** and the drawn arc is *truthful*
  (matches where the bomb actually lands, drag and all). A physics-engine
  projectile can't be cheaply/deterministically fast-forwarded for a preview.
- So: pure `ballistics.ts` (plain `{x,y,z}`, deterministic, unit-tested — like
  `aircraft-physics`), used for BOTH live flight and the predictive sight. Jolt
  adds little here.

### Resolved
- ✅ **Bomb sight = 3D in-scene arc + impact marker**, shown while aiming a
  ballistic weapon. Normal aiming shows the **reticle**; ballistic mode adds the
  **arc + marker** (reticle can remain). Predicted from `predictPath`, so it's
  truthful.
- ✅ **Launcher velocity inherited** — initial velocity **adds the launcher's own
  velocity** (bomb from a moving plane keeps its momentum). (Wiring is a launcher
  concern.)
- ✅ **Fast-mover collision — cheap-then-refine sweep:** first a **crude test**
  (single segment / broad check between the last and current position), then a
  **series of finer rays** (sub-steps) only if the crude test suggests a
  hit/near-miss. Warhead sphere still governs detonation.
- ✅ **Lifetime / end-of-life behavior:** a max lifetime, with a configurable
  end-of-life action — **default `explode`** (detonate the warhead at end of
  life → timed airburst), alternative **`inert`** (become a harmless dud).
- ✅ **Impact prediction:** raycast each forward step vs terrain + colliders until
  first hit = impact point; capped by max preview steps/time.

### Implementation sketch (tentative)
- Pure `ballistics.ts`: `step(state, {gravity, dragCoeff, mass}, dt) → state'` and
  `predictPath(state, params, {dt, maxSteps, hitTest}) → {points[], impact?}` —
  `hitTest` is a bridge-supplied ray/point test so the pure model stays
  Babylon-free but the sight is exact.
- `b3d-ballistic` (or the projectile component): drives the mesh from `step`,
  sweeps for collision, detonates its Warhead on contact; optional child renders
  the predicted arc + impact marker from `predictPath`.

---

## Guided projectile ✅

A **ballistic projectile + a seeker + steering**. It reuses everything from
Ballistic; when it can't or shouldn't guide (thrust spent, target lost past the
reacquire window) it simply **falls back to pure ballistic flight**. Deliberately
*arcade*, not a military flight sim.

### Agreed spec
- **Seeker: vision range + cone** (default cone **30°**). It can only see/track a
  target within that range and cone.
- **Acquisition: fire-and-forget.** Takes time to lock — default **3 s** — then it
  guides autonomously. No launcher-in-the-loop.
- **Thrust budget** — while powered it steers toward the aimpoint; once spent it
  goes **ballistic** (gravity + drag, no steering).
- **Intelligence (smartness), 0..1, default 0 (dumb)** — one dial covering **both
  lead and ballistic drop** (the full firing-solution quality):
  - **0 (dumb)** — aims flat at the target's **present position** (no lead, no
    drop).
  - **1 (smart)** — full solution: **lead** (predicted intercept from target
    velocity + projectile speed) **and** ballistic **drop** compensation.
  - **between** — **interpolates** the aim correction (both lead and drop) by the
    smartness factor.
- **Target loss** — **time-to-reacquire** in seconds (default **0** → give up
  immediately, go ballistic). While the target is lost (during the reacquire
  window) it **dead-reckons by smartness**: dumb → flies **straight** (last vector),
  smart → **tracks the projected position** (extrapolate last-known target
  velocity); in between, interpolate. If it doesn't reacquire in time → ballistic.
- **Lock / pit-bull** — future possibilities, **not** in v1.

### Resolved
- ✅ **Turn rate / agility** — a max turn-rate cap while powered, with a sane
  default.
- ✅ **Target selection** — lock the **first eligible** target (owner/faction
  excluded). *Future:* a **fire-control system** that can acquire N locks, manage
  them, and **hand them off** to weapons later (a targeting-layer concept, ties to
  Sensorium; not in v1).
- ✅ **Acquisition = dwell, not cumulative** — target must stay in cone+range
  **continuously** for the acquire time (default 3 s); leaving resets it.
- ✅ **Steering requires thrust** — no thrust ⇒ no steering ⇒ ballistic.

### Implementation sketch (tentative)
- Reuse pure `ballistics.ts` for the unpowered phase. Add pure `guidance.ts`:
  `firingSolution(targetPos, targetVel, projPos, projSpeed, ballisticParams,
  smartness) → aimDir` — interpolates from **flat-at-present** (smartness 0) to the
  **full solution** (smartness 1): **lead** (predicted intercept) **and drop**
  (elevation for gravity/drag, using the ballistic params). **Shared with the
  turret.** Plus a steering step that turns velocity toward the aim within the
  turn-rate cap while thrust remains. Deterministic, unit-tested (dumb aims-at-now,
  smart leads a crossing target and lobs to hit at range, mid interpolates both).
- Seeker (range/cone test, acquire timer, loss/reacquire timer) lives in the
  bridge component (needs scene queries); guidance math stays pure.

---

## Launcher ✅

Spawns projectiles. Holds a **weapon** (a projectile template — a ballistic shot,
a missile, …) and the timing/ammo rules for firing it.

### Agreed spec
- **Fire delay** (default **0**) — time from pressing fire to the shot leaving
  (trigger windup / spool-up).
- **Cycle time** (default **0.25 s**) — cooldown before it can fire again. **Just a
  cooldown — no heat/overheat model.** Generalized: cycle time is **either a single
  value OR a repeating sequence** of intervals (the gap *after* each shot). So a
  **burst falls out for free** — e.g. `[0.1, 0.1, 0.5]` = fire, 0.1 s, fire, 0.1 s,
  fire, 0.5 s, then repeat → bursts of 3 with a 0.5 s gap between bursts. The
  sequence length = shots per burst; the last entry = inter-burst interval. No
  separate salvo mechanic.
- **Cost — ammo OR energy:**
  - **Ammo** — a count of shots with a **per-shot refill time**: **`0` = finite**
    (no regen; needs an external reload/pickup), otherwise regen **one shot every
    refill seconds** (default **0.5 s**), up to the magazine capacity.
  - **Energy** — each shot costs energy pulled from an **independently-managed
    resource** (a shared pool — e.g. a ship's capacitor — owned/regenerated
    elsewhere; the launcher just draws from it and can't fire if it's short).
- **Weapon** — the projectile it fires (missile = guided, shell = ballistic, etc.).
  In v1 the launcher just **spawns** it; guided rounds acquire their own target
  (fire-and-forget). A future **fire-control system** hands off locks.
- **Origin** — its **position projected forward slightly**; the launcher is
  **parented to the weapon geometry**, so it aims where the barrel/rail points.
- **Inherited velocity** — the projectile's initial velocity **adds the launcher's
  own world velocity** (already agreed in Ballistic).
- **Accuracy** — a **max angular error** applied as a small random cone deviation
  per shot (default **~0.1°**). Seeded (MersenneTwister) so it's deterministic.

### Resolved
- ✅ **Refill `0` = finite ammo** (no regen; external reload). Otherwise one shot
  per refill interval (default 0.5 s), up to magazine capacity.
- ✅ **Burst = cycle-time sequence** (see above) — no separate salvo mechanic.
- ✅ **Fire delay = one-time windup** on trigger press; cycle time governs repeats.
  So the **DOOM chaingun** = long fire delay + very short cycle time (spin-up then
  rapid fire); a typical weapon = little/no delay + short cycle time.

### Defaulted (override anytime)
- **Energy pool = a generic Resource** — reuse Destroyable's `capacity` / `regen` /
  `regen-delay` mechanic (one tested primitive, two uses). On empty: a **dry-fire
  click** (no shot), not a hard error.

### Implementation sketch (tentative)
- Mostly a **bridge** component `b3d-launcher`: timers (delay, cycle, per-shot
  regen), ammo/energy accounting, spawns the weapon at the muzzle transform with
  `launcherVelocity + muzzleVelocity` and the accuracy jitter. Little pure math
  beyond the seeded angular-error sample.
- References its weapon template and (energy mode) its resource pool by id — stays
  serializable for `world-store`.

---

## Turret ✅

An **aiming platform**, *not* a launcher. It's a mount with **one or more
Launchers parented to it**; the turret slews/elevates to point them at a target,
the launchers do the firing. Composition again.

### Agreed spec
- **Traverse (rotation):** either full **360°** or a **limited deviation from
  forward** (e.g. ±60°). **Default 360°.**
- **Elevation:** a **max elevation** (default **70°**) and a **max declination**
  (depression). Genre feel: tanks = small declination + modest elevation; warship
  / AA = very high elevation.
- **Traverse flexibility matters:** a **360°** turret can rotate **either
  direction** to a new heading (take the shortest path) → more targeting
  flexibility and faster time-to-bear. A **limited** turret can't cross its dead
  zone, so some targets are **unreachable** and it may have to slew the long way
  within its arc. The aiming model must respect limits and pick the shortest
  *legal* path.
- **Lead + drop / smartness:** uses the **same firing-solution solver + smartness
  dial (0..1)** as the guided projectile. Smartness now covers **both** target
  **lead** and **ballistic drop**: `dumb (0)` points flat at the present position
  (no lead, no drop); `smart (1)` uses the full solution (lead intercept **plus**
  elevation-for-drop); between interpolates the correction. (Shared `guidance.ts`.)
- **Slew rate** (traverse °/s) and a separate **elevation rate** (°/s).
  **Acceleration ignored for now** — constant rates.

### Defaulted (override anytime)
- **Max declination −10°** (tanks can't depress much); elevation 70°.
- **Acquisition: both supported, default self-acquire** — first-eligible target
  within range + the turret's **reachable** arc; can also be **directed** by a
  player / fire-control system. (Ties to the AI turret + Sensorium TODO.)
- **Fire tolerance: yes** — fire only once the muzzle is within an angular
  tolerance (~ the launcher's accuracy) of the solution, so it doesn't fire
  mid-slew.
- **Drop compensation folded into smartness** — see below. `dumb` points flat at
  the present position (no lead, no drop); `smart` uses the full firing solution
  (lead **and** ballistic drop); between interpolates both. (No separate
  direct-fire mode — it's just smartness 0.)
- **Idle: return to forward/neutral** when no target.

### Control modes (self-acquire vs. directed)
The turret supports both (agreed earlier). A key **directed** mode for the MVP:
- **View-slaved (player-directed):** the turret's aim target is the **player's view
  direction** (flat: camera forward; VR: head forward), clamped to the turret's
  traverse/elevation limits. Used for the aircraft's two waist guns.
- **Reachability feedback → reticle color:** because the turrets have **limited
  traverse/elevation**, the desired look direction may be **out of arc**. The
  **reticle changes color** to signal whether a turret can actually bear there
  (e.g. green = can fire / on-arc, red = out of arc). With **two** turrets (left &
  right), "reachable" = **at least one** can bear; optional amber = only one. The
  turret aiming helper already returns a **can-bear/on-target** flag — the reticle
  reads it. (Reticle visual spec lives in `UI-DESIGN.md`.)

### Implementation sketch (tentative)
- Pure aiming helper (in `guidance.ts`): given current traverse/elevation, the
  aimpoint (or a **desired look direction** for view-slaved mode), the limits, and
  the rates → the next traverse/elevation step (shortest legal path, clamped to
  limits and rates) + an **on-target? / can-bear?** flag (the latter drives the
  reticle color). Deterministic, unit-tested (360° shortest-direction, limited-arc
  unreachable, elevation clamp, can-bear flag).
- `b3d-turret` bridge: rotates the mount node from the helper, hosts the child
  Launcher(s), triggers them when on-target, does target acquisition via scene
  queries.

---

## Flame thrower ⏸️ SHELVED

Deferred for now. (Likely a cone/particle sustained-damage weapon later.)

---

## Melee ✅

A **collider that inflicts damage on contact** — no projectile, no arming. The
melee weapon (blade, fist, spikes, grinder) has a collider; when it overlaps a
Destroyable it applies damage, then waits a **cycle time** before it can hit
again.

### Agreed spec
- **Collider** that inflicts damage on impact with a Destroyable.
- **Cycle time** between damage applications — and, reusing the launcher's
  generalization, it may be **a single value OR a sequence** (like the burst
  example). The sequence **differentiates a sustained impact from a glancing one:**
  a **sustained** contact steps through the whole sequence (repeated ticks while
  the collider stays in contact — think grinder/chainsaw), while a **glancing**
  contact only lands the **first** tick before the collider separates.

### Resolved
- ✅ **Damage = flat value per tick; the cycle time does the differentiation.**
  How much total damage a hit deals is just how many ticks land — a **glancing**
  contact = one tick (low), a **sustained** contact = the whole sequence (high).
  No per-tick Warhead needed for that. *(An optional Warhead for fancy hits —
  AOE/knockback hammer — stays available via composition, but isn't required.)*

- ✅ **Collider active window — gated by default.** The melee collider only
  inflicts damage while **active** (an `active` flag driven by the attack
  action/animation), so a sword you're merely holding does nothing; it bites only
  during the swing's active frames. **Always-on** stays available as an option for
  spikes / spinning blades / grinders.

- ✅ **Owner is friendly by default** — the melee doesn't damage its own owner /
  faction. (Overridable if you ever want self/friendly-harming hazards.)

### Implementation sketch (tentative)
- Almost pure-reuse: the **cycle-time sequence** logic (shared with Launcher), the
  **collider** (from `b3d-collisions`), and the **damage pipeline** (Destroyable).
- `b3d-melee` bridge: tracks per-target contact so it knows a "sustained" contact
  from a fresh one (to advance vs. reset the cycle sequence), applies damage on the
  scheduled ticks.
