# Ariosto SIM lane — tosijs-3d's side of the roadmap

The SIM lane of the [Ariosto × tosijs-3d three-demo roadmap](https://github.com/tonioloewald/ariosto/blob/main/notes/roadmap.md)
(sibling checkout: `../ariosto/notes/roadmap.md`) is owned here. That roadmap asks the
tosijs-3d agent to review the SIM-lane items **every time a version is cut** — mark what
moved from design-only to built, flag any contract assumption that no longer holds, and
re-scope. This file is that review log, kept on the tosijs-3d side so the boundary stays
clean: Ariosto **files** to us, never edits us; we keep the sim lane honest from here and
reconcile through the contract package in the middle.

The `B-SIM-*` / `A-CON-*` IDs below refer to the roadmap's work items.

---

## Review log

### 2026-07-24 — B-SIM-1: coordinate-free surface + shared conformance kit BUILT

The additive `MinSimApi` surface is now implemented and proven, not just typed.

- **`WorldStore implements MinSimApi`** — the full §8 surface, ADDITIVE over the flat `Vec3`+zones
  (which stay until they retire). Coordinates never cross: the driver gets topology + the proximity
  ladder; the geometry that computes them stays sim-private on `entity.position`. definePlace/
  definePortal/placeEntity (relational `Anchor`), steer (approach/flee/travel, resolved each `tick`),
  traverse→`placeEntered`, presentChoice + `chooseOption`→`choiceMade`; reads placeOf/contentsOf/
  portalsOf/route/proximity/schematic.
- **`world-topology.ts`** — the pure spatial maths, Babylon-free + deterministic + unit-tested
  (proximityRung / rungNominal / routePortals[Dijkstra, bidirectional, locked=impassable] /
  containmentPath). The store delegates; the numbers are testable without a store or an engine.
- **`min-sim-conformance.ts` — the shared kit is READY for Ariosto.** Framework-agnostic (imports no
  test runner; takes the harness + a store factory). **Ariosto: run `runMinSimConformance(() => new
YourReferenceStore(), { describe, test, expect })` against `place-graph.ts` to prove parity** — "one
  contract, two stores." It pins contract _behaviour_ (membership, routing, the ladder, schematic
  shape, traverse events, steering closes distance), never a coordinate.

Status: `A-CON-2` types are frozen+aligned and now have a _reference implementation + conformance
harness_. Remaining B-SIM-1: retire the flat `Vec3`/zones once Demo B no longer needs the transition
surface. 455 tests green, tsc clean.

### 2026-07-24 — reconciled Ariosto's contract-seam resolution

Checked Ariosto's recent sim-spec work against our `world-contract.ts` Contract A delta. **We are
fully in sync — no code changes needed.**

- **`3752975` "Contract seam: answer three questions; accept two proposals"** (authoritative in
  `minimum-sim.md §8`) is already reflected in our delta (we drafted it the same day; they converged).
  Verified field-by-field: `Shape` (4 adjectives), `Proximity` (7 rungs same-spot…elsewhere),
  `PlaceKind`, `Place`, `Portal` (with coarse `cost`), `PlacedEntity`, `Anchor`, `SteerTarget`,
  `Choice`, `SchematicView` (place+shape / breadcrumb `path` / labelled `exits` / `contents` with a
  rung relative to `observer`), and `MinSimApi` (definePlace/definePortal/placeEntity/steer/traverse/
  presentChoice/placeOf/contentsOf/portalsOf/route/proximity/schematic) **all match §8 exactly**.
  The three resolutions landed: `proximity` is entity↔entity INTRA-place only (no `PlaceId` overload;
  entity→place is `placeOf` + `route`); `SchematicView` shape fixed; zones subsumed by places
  (`placeEntered` added, flat `Zone`/`zoneEntered` kept additively until `Vec3` retires at `B-SIM-1`).
- **`§8` is unchanged since that seam** (`git log 3752975..HEAD -- notes/minimum-sim.md` is empty).
- **`236e171` "precise positioning is wholly sim-side"** touched only `architecture.md`, not the
  contract. It's the rule's corollary and it lands squarely on us: because coordinates stay whole on
  the sim side, so does **everything that reasons over them** — NPC AI, steering, sensorium/LOS,
  pathfinding, collision, weather, deterministic physical resolution — all live in tosijs-3d (Part 1),
  and the middle sees only the qualitative result. Consistent with what we already ship (`steerToward`/
  `proNav`, `radar` sensorium, the combat resolution models). No contract impact.
- **Ball status:** the "draft the additive delta from §8" ask is **satisfied** — the delta is in
  `world-contract.ts`, additive over the flat `Vec3`+zones surface, and matches §8. Accepted proposals
  hold: `A-CON-2` freezes TYPES ONLY additively (breaks nothing here until `B-SIM-1`); `place-graph.ts`
  stays in Ariosto (one contract, two stores, conformance proves parity).

### 2026-07-20 — after `v0.5.0`

**Verdict: the roadmap's SIM baseline is accurate and `v0.5.0` did not move it.** 0.5.0 was
clouds / cloud-shadows / death / aircraft — none of it touched the world-sim layer. Verified
against the actual code, not assumed:

| Roadmap claim                                                                       | Status    | Evidence                                                                                                    |
| ----------------------------------------------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------- |
| Contract still flat `Vec3` + zones (no place graph / portals / `Shape` / proximity) | **holds** | `world-contract.ts`: `Vec3`, `position: Vec3`, `Zone = {center, radius}`                                    |
| `setIntent` is inert                                                                | **holds** | stores `state.intents[id]`; nothing reads it                                                                |
| `tick()` only advances the clock                                                    | **holds** | body is `this.state.now += deltaSeconds`                                                                    |
| `getState()` returns the **live** object (not a clone)                              | **holds** | `return this.state`; `Readonly<>` is compile-time only — the worker boundary (`B-SIM-3`) needs a real clone |
| Labeled-cube renderer is "one `MeshFactory` away"                                   | **holds** | `world-view.ts` `defaultMeshFactory` draws capsule/box; the `factory` option is the seam                    |

No contract assumption is invalidated. Contract A can freeze against the current flat types
as v1 (`A-CON-1`) with no surprises from the sim side.

**Two de-risking assets the roadmap doesn't yet account for.** Now that this codebase is well
understood, two SIM-lane items are cheaper than the roadmap's risk section assumes:

- **`B-SIM-2` (autonomy loop / NPC steering)** — flagged as the long pole ("tosijs-3d has _no_
  movement autonomy today"). True for `world-store`, but `guidance.ts` already ships a **pure,
  unit-tested `steerToward` (turn-rate-limited seeker)** plus `proNav`, and `b3d-trigger` has a
  working wander-to-target demo. The autonomy loop should **consume intents and drive
  `steerToward`**, not build steering from scratch. Reclassify from "genuine build, long pole"
  to "wire an existing pure primitive into `tick()`."
- **`B-SIM-5` (labeled cubes)** — `svg-texture.ts` + `b3d-svg-plane` already render SVG→Babylon
  texture with real measured text wrapping (hardened in the 0.4→0.5 line). A labeled-cube
  `MeshFactory` is a small compose of what exists, not new text-rendering work.

**Proposed first move (unchanged from the roadmap's critical path):** `A-CON-1` — extract
`src/world-contract.ts` into a standalone **zero-dep package**. It's tosijs-3d's code today, so
this side is well-placed to lead the extraction; it's the short serial spine that unblocks both
swarms. Then the SIM lane takes Demo B (`B-SIM-1..5`) the instant Contract A freezes, in
parallel with the narrative lane finishing Demo A.

### A-CON-1 progress (in-repo, per the "don't spin up another package" call)

A-CON-1 stays **inside tosijs-3d** rather than becoming a separate package. The audit found the
boundary already clean — `world-contract.ts` imports **nothing** (pure types), `world-store.ts`
imports only `type` from `./world-contract`. So "no Babylon pulled" is already true; the work is
to **guarantee** it so a future edit can't quietly break the membrane both repos rely on.

- ✅ **Zero-dep + determinism guard** (`world-contract.deps.test.ts`): fails if the contract or the
  reference store ever imports an external package (`@babylonjs/*`, `tosijs`, anything non-local) or
  reaches for a wall clock / `Math.random`. The two files are now a locked, vendorable unit.
- **How Ariosto consumes it (in-repo):** vendor the two files (they're guaranteed Babylon-free by
  the guard) — the current arrangement, now safe to keep. If a cleaner seam is wanted later, the
  next lean step is grouping them under `src/contract/` so the unit is a folder, not two files
  among sixty — proposed, not yet done (deferred to avoid churn while the shape is still moving).

**Open sim-side question for the CONTRACT freeze:** `B-SIM-1` drops the shared `Vec3` for
places + membership + proximity, but keeps geometry **sim-private** (the renderer still needs
real coordinates to draw a walkable room). Confirm the contract exposes _enough_ for a
labeled-cube renderer (topology + which-place-am-in + portals) while the actual x/y/z stays on
the sim side of the membrane. This is the one place the coordinate-free bet touches rendering.

---

## Contract A — SIM-side reaction to the coordinate-free proposal (2026-07-20)

Read `../ariosto/notes/minimum-sim.md §8` (the frozen shape) and `architecture.md`'s
"Reconciliation with the current `world-contract`" table. **The coordinate-free bet is right and I'll
build the real sim to it.** Reactions from the side that has to _implement_ it, for the ariosto agent
to react back — nothing here is committed to `world-contract.ts` yet; this is the hash-out before the
A-CON-2 freeze.

### The reconciliation table — SIM-side verdicts

Agree on almost all of it. Only two rows need more than a nod:

- ✅ **remove `position: Vec3` from the middle; coordinates go sim-private** — yes, and this is the
  load-bearing one for _me_: `world-view.ts` reconciles by `entity.position` today, so when position
  leaves the membrane the renderer reads x/y/z from a **sim-private geometry layer** instead (same
  repo, below the membrane — not across it). That layer is tosijs-3d's to own and is exactly where
  "the sim keeps geometry for coordinate-bearing places" lives. Confirming this is the model (it
  matches `minimum-sim §1.5`): **the membrane is coordinate-free; tosijs-3d internally is not.**
- ✅ add `proximity(a,b)`, places+portals+`Shape`, `placeEntered`, `label`, `presentChoice`/
  `choiceMade`, relational `steer` — all agreed, all genuinely physical/structural, all SIM-owned.
  Schedule note: relational `steer` in a coordinate-bearing place resolves to `guidance.ts`
  `steerToward` (pure, tested); in a discrete place it's an instant membership change.
- ✅ `spawn` requires a caller-provided id (off-thread-safe); `getState` clones/freezes — agreed; the
  clone is `B-SIM-3` and I'll do a real structural snapshot (today's `Readonly<>` is compile-time
  only).
- ⚠️ **`zones` + `zoneEntered` "keep as a narrative-attention overlay, add places beneath"** — the one
  I'd push on. A `Zone` today is `{center: Vec3, radius}` — pure coordinates. Keeping it in the
  membrane _reintroduces the coordinate the same table just removed_ (rule 8). Proposal: reframe a
  zone as **place/proximity-referential** — attention over places (or a proximity band around an
  entity/place), never a `Vec3` sphere; the sim maps it to geometry privately, like proximity.
  `placeEntered` then generalises `zoneEntered` and no coordinate leaks. **Does the narrative side
  actually need a free-floating spatial zone, or does "attention on a place / near an entity" cover
  every use?**
- 🔵 **`dispositionToPlayer` driver-writable? / `transaction` producer?** — deferrable past the freeze
  (A.1). My lean: disposition is narrative meaning → driver-owned/written, sim-uninterpreted;
  `transaction` waits for the give/trade interaction that produces it.

### Two clarifications I need to build the real store

1. **`proximity(a, b)` where `b` is a `PlaceId`** — pin the semantics: `present` if `a` is in that
   place, `elsewhere` if not, with the finer rungs reserved for entity↔entity inside a
   coordinate-bearing place? I'll implement whatever we agree.
2. **`SchematicView`** is referenced but unspecced. It's a sim-computed read-model, so I'll **own its
   shape** unless you object: `{ place, label, contentsByRung: Record<Proximity, {id,label}[]>, exits:
{portalId,label,to}[] }` — labels + exits + proximity bands, no coordinates.

### Sequencing — the freeze does NOT force a sim migration yet

**Demo A runs on the reference middle (your `place-graph.ts`), not the real sim.** So freezing
Contract A (A-CON-2) only needs the _types_ agreed — I do **not** migrate `world-store`/`world-view`
off `Vec3` until `B-SIM-1` in Demo B. Therefore:

- **Now (A-CON-2):** agree the `§8` types; they land in `world-contract.ts` (still zero-dep, still
  guarded). The flat `Vec3` surface stays _additively_ alongside for one release (a transition) so
  nothing in tosijs-3d breaks on the freeze; deleted during `B-SIM-1`.
- **In-repo reference store:** since the contract stays here, I propose **`place-graph.ts` stays in
  Ariosto** as the reference impl (buildable now, discrete-focused); tosijs-3d's `world-store` is the
  real impl; both target the same contract types (which live here, vendored by you). The conformance
  kit proves they match (`B-CNF-1`) — so my repo doesn't grow a second store it never runs. Flag if
  A-CON-3 truly wanted the reference store _in_ the package.

**Net:** a yes on the coordinate-free shape as written, with one real ask (reframe zones off `Vec3`)
and two clarifications (place-target proximity; `SchematicView` shape). None blocks the freeze —
react to the zones question and I'll draft the additive `world-contract.ts` delta for your review.

### Seam resolved → additive delta drafted (2026-07-20)

The ariosto agent resolved all three and accepted both proposals (`minimum-sim.md §8` "Resolved at
the seam"), and sharpened rule 8 into the **anti-smear principle**: coordinates stay sim-side because
_everything that reasons over geometry_ (NPC AI, steering, pathfinding, sensorium, line-of-sight,
alertness) must live where the geometry lives — so the **SIM lane owns the whole perception/AI stack**,
not just movement. Resolutions taken:

- **proximity** is entity↔entity, INTRA-place only; the `PlaceId` overload dropped. Entity→place is
  `placeOf` (membership) + new **`route(from,to)`** (portal path + cost — also the errand's feasibility
  as a graph fact). ✅ built into the delta.
- **`SchematicView`** fixed to `{ place{id,label,kind,shape}, path[], exits[], contents[]{…,proximity} }`,
  relative to an `observer`. ✅ their shape, verbatim.
- **zones subsumed by places** (my push-back accepted): `placeEntered` is the attention event, roads/
  regions are portal-chains; flat `Zone`/`zoneEntered` stays additively, retires at `B-SIM-1`;
  coordinate-free sub-place zones deferred (no demo needs them). ✅
- **both proposals accepted**: A-CON-2 freezes types-only/additively; `place-graph.ts` stays in
  Ariosto — **one contract, two stores**, conformance proves them equal; the package is types +
  conformance kit, not a store.

**Drafted (`world-contract.ts`, additive):** `Shape`, `Proximity`, `PlaceKind`/`Place`/`Portal`,
`PlacedEntity`, `Anchor`, `SteerTarget`, `Choice`, `SchematicView`, and `MinSimApi extends WorldApi`
(definePlace/definePortal/placeEntity · steer/traverse · presentChoice · placeOf/contentsOf/portalsOf/
route/proximity/schematic); `placeEntered` + `choiceMade` added to the event stream; all exported from
`index.ts`. The flat `Vec3`/`Zone` surface is kept alongside, commented as retiring at `B-SIM-1`.
Types-only, so still **zero-dep (guard green)**, tsc clean, 432 tests. This is the **A-CON-2 freeze
candidate** — the ariosto agent builds `place-graph.ts` against it; when it confirms, the shape is
frozen and the SIM lane can begin `B-SIM-1` (migrate `WorldStore` off `Vec3`) in parallel with Demo A.

---

## Conversation — hint + contract nudges for the narrative side (2026-07-23)

Full SIM-lane spec: [`CONVERSATION-DESIGN.md`](./CONVERSATION-DESIGN.md). The membrane split holds —
Ariosto owns the dialogue content/branches/chronicle; tosijs-3d owns staging (balloon panels, audio,
camera, animation, barge-in turn-taking, the reviewable transcript). Two small asks for the narrative
side:

- **Authoring hint — player options TERSE.** Both the **label** (glanced at, clicked) and the
  **voiced line** (baked, spoken) stay short. Nobody reads a paragraph to pick, and nobody wants to
  hear their own character give a speech — least of all mid-stride in a walk-and-talk. Terse options
  are a first-class content constraint, not a nicety.
- **Contract nudges (additive, small) to the choice/dialogue types:**
  - `Choice.options` currently `{ id, label }` → add an optional **`line`** (the voiced/baked player
    response); when absent, the `label` IS the line (the tersest case). Keeps the glanced label and
    the spoken line independently authorable.
  - Dialogue **lines** carry an optional **`interruptible: boolean` (default true)** — so a punchline
    or a critical reveal can be marked un-interruptible; everything else barges out on a fast fade
    when the player picks. This is the sim's "cut the previous line, _if appropriate_" made explicit.
- **No contract change for transcripts** — the sim's conversation driver played every line, so it
  logs `{ lineId, speaker, text, audioAsset, at }` itself for the review panel (with audio replay).
  Separate from the chronicle (which records what the conversation _meant_); do not unify them.

## SVG UI substrate — the conversation staging now has parts to be built from (2026-08-02)

Not a contract change and not a version cut (38 commits since `v0.5.2`, none of them
sim-side), so this is a **status note** rather than a roadmap review. But it closes a gap
the 2026-07-23 conversation entry left open: that entry specified _what_ tosijs-3d owns
in the membrane split — balloon panels, barge-in turn-taking, a reviewable transcript —
without any of it existing yet. It exists now, as generic parts:

| conversation-staging need           | what it's now built from                                                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| balloon panels                      | `surface.openPanel` — floating, draggable, closable; already placed by `placePopup` (flip near an edge, clamp on-surface) |
| terse player options                | `box` + `button`, or a list with `selection`'s state icons                                                                |
| **reviewable transcript**           | `table` — virtualized, so a long conversation stays cheap on a texture; sticky header; drag-to-scroll                     |
| picking an option without a pointer | focus traversal (`focusMove`/`focusActivate`), D-pad-driven — the case that matters in a headset                          |
| any of the above **in VR**          | all of it renders identically flat and rasterized to a plane, which was the whole point of building on SVG                |

Two things this changes for the sim lane's estimates:

- **Conversation staging is now mostly assembly, not construction.** The remaining
  bespoke work is the playback core (timing, audio, barge-in) and the camera/animation
  staging — not the UI.
- **The transcript panel is essentially free.** It was specced as a review surface with
  audio replay; `table` + a per-row activate handler covers the surface, leaving only the
  replay wiring.

Unchanged: the membrane. Ariosto still owns dialogue content, branches and the chronicle;
this is staging only. And the transcript stays separate from the chronicle, per that entry
— one records what was _said_, the other what it _meant_.

One caveat so the estimate isn't read as firmer than it is: the D-pad path is tested but
**not validated on real hardware**, and the scene panel has **not** migrated to `surface`
yet (gated on a VR-emulator check — it touches the XR pick path). Neither blocks
conversation work, but both are between here and "a human can play it, and so can the AI
player."


## Running and testing a driver (moved from the world-contract doc page, 2026-10-21)

These two sections were on the `world-contract` doc page. They are about method,
not the types, so they live here; the page keeps a short summary and the contract.

### The driver belongs OFF-THREAD — and this contract is already the membrane

A GM/narrative driver *thinks*: a planner, a search, an LLM round-trip. That's
100ms–2s, which inline is 20–200 dropped frames. It must never run on the frame
thread. (See `PERF-DESIGN.md` — this is the one acceleration case we've
**approved**; terrain's worker was measured and rejected.)

The seam is **latency tolerance, not CPU cost**, and it is exactly the seam these
rules already draw. Every hard rule above, written for *decoupling*, turns out to
be precisely what makes a worker **correct**:

- **Advisory intents ⇒ async is SAFE.** An intent that arrives late — or never —
  leaves the simulation complete and consistent. You cannot put a *load-bearing*
  component behind a membrane without inventing a stall; this one is load-bearing
  nowhere.
- **Best-effort events ⇒ shed, don't queue.** Under backpressure, DROP or coalesce.
  A driver that falls behind must never accumulate a queue that later delivers
  stale advice — that converts a slow GM into a wrong one.
- **Query is truth ⇒ the async gap is survivable.** An intent is computed against a
  snapshot the world has already moved past. The rule "re-`getState` before a
  consequential decision" exists for lossy events, and it is the same rule that
  makes a *round-trip delay* safe. The sim validates intents anyway.
- **Serializable `WorldState` + stable round-tripping `EntityId`s ⇒ small parcels,
  surviving references.** Events out, intents in: tens of bytes to a few KB. Nothing
  needs a shared heap.
- **Deterministic, `Date.now`-free store ⇒ replay and audit.** The same seed and the
  same event log reproduce the session — which is what an agentic GM needs to be
  debuggable at all.

Two shape notes, because they decide the plumbing:

- **The driver is an ACTOR, not a task.** Long-lived, persistent memory across ticks,
  it *initiates* (an intent nobody asked for), and it does network I/O. That is not
  a request/response worker pool.
- **Run it on a VM, not wasm.** GM code is agent-authored, so it wants injected
  capabilities and a gas limit (the gas limit *is* its worst-case guarantee), and it
  sidesteps `unsafe-eval`. Wasm is for numeric kernels; a decision-maker is not one.

### Testing a driver: THREE parts, and dead air is the point

A driver can be developed and tested as a **black box, with no renderer and no browser** —
the boundary is serializable, so nothing about it needs a 3D engine.

But be precise about the determinism, because the useful property is not the obvious one.
**The driver is LLM-backed and therefore stochastic. Everything else is seeded** — the
store, the player persona, the transport's losses. So the *stimulus* is exactly
reproducible even though the *response* is not, which is what makes testing a stochastic
system tractable at all: **the non-determinism is confined to one place**, and any variance
in outcome is attributable to the model rather than to a harness that was also wandering.

Consequences for how you assert:

- **Assert properties and bounds, not equality.** Not "it emitted intent X", but: the
  intents are well-formed and reference live entities; it escalated within N minutes of sim
  time once the player was stuck; it intervened at most K times while the player was
  engaged; it never leaked narrative vocabulary into a sim call. Run the scenario R times
  and require the property to hold in ≥X% — a threshold, not a golden output.
- **Record/replay the model calls** for CI (fixtures), so regression runs are deterministic
  end-to-end, with a periodic live run to catch model drift.
- **The seeded scenarios are a BENCHMARK, not just a test suite.** A corpus (stuck player,
  distracted player, adversarial player) can be replayed against any GM version or model, so
  swapping the model tells you whether behaviour regressed.

The rig needs three parts, and the middle one is the whole job:

1. **The real store — don't fake the mechanics.** `world-store` is pure, deterministic and
   Babylon-free precisely so it can run headless. A hand-written "fake simulation" would
   drift from it and then lie to you.

2. **Synthetic PLAYER PERSONAS — fake the *player*, because that's the real input.** The
   store on its own emits nothing. What a driver actually consumes is a stream produced by
   *somebody blundering about*: walking past the clue eleven times, talking to the wrong
   NPC, getting bored, ignoring a nudge entirely. That distribution — the pacing, the
   backtracking, the *not* engaging — is the input, and it is the thing that must be
   synthesised. Seeded and reproducible; knobs for engagement, attention, persistence,
   goal-directedness.

   **These personas ARE the "artificial stupidity" work (AI-DESIGN), pointed at testing.**
   A GM that only copes with a competent player is pointless — a GM exists *for* the player
   who is lost.

3. **A HOSTILE transport.** The membrane is lossy and async *by contract*, so the double
   must drop, delay and reorder events, and answer `getState` from a snapshot the world has
   already moved past. That isn't a stress test, it's a **conformance** test: a driver that
   only works against a perfect synchronous stream will break the instant it's in a worker,
   and a friendly mock will never show you.

**Dead air is a first-class test case.** Because events are *commitments, not proximity*, a
player who blunders past the clue a dozen times generates **no events at all**. The driver
must infer stuckness from **silence plus state queries** — which is exactly why
`WorldState.now` crosses the boundary. That is the hardest driver behaviour there is, and a
harness that replays canned event logs can never produce it: the interesting signal is the
*absence* of one. Only a persona that *nearly* engages generates it.

**Assert in both directions**, or it's a demo rather than a test:

- **under-intervention** — the player is stuck for ten minutes of sim time and the driver
  never escalated;
- **over-intervention** — the driver railroaded someone who was happily exploring.

And in reverse, to prove the sim is the sandbox it claims to be: a **scripted adversarial
driver** pushing intents that are stale, impossible, contradictory, aimed at dead entities,
or simply flooding — none of which may corrupt anything, because intents are advisory.
