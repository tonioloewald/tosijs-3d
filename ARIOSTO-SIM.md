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
