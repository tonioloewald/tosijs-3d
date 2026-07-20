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
