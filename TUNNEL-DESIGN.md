# Tunnel & cave design — topology → voxels → geometry

How caves, tunnels and underground complexes are authored, compiled and rendered.
Companion to `SPATIAL-DESIGN.md` (attachment) and `TERRAIN-SHADER-DESIGN.md` (surface).

> **The decision (Tonio, 2026-08-12): build from a VOXEL MAP, and have a
> topology → voxel-map renderer.** The voxel map is the intermediate
> representation everything downstream consumes; topology compiles *into* it,
> and a level designer can author or edit it directly.

## Why this shape

Three requirements arrived together and they pull in different directions:

- **Ariosto wants topology.** Outside → *locked door* → big cavern → … The
  narrative engine reasons about places and passages, never coordinates
  (`world-contract.ts` §8 already says so: `Place`, `Portal { locked, cost }`,
  and coordinates never cross the boundary).
- **Level design wants a map.** Something concrete you can look at, edit, diff
  and hand-tune — "a voxel map would serve".
- **The renderer wants a field.** `sdf-lattice` extracts an isosurface from any
  `(x,y,z) => number`, and `b3d-patch` streams the result.

A single pipeline satisfies all three, because each stage is a lowering:

```
  TOPOLOGY            VOXEL MAP              DENSITY FIELD        GEOMETRY
  places + portals →  sparse carved cells →  smoothed sampler  →  surface nets
  (Ariosto's view)    (the level designer's) (patch-field)        (sdf-lattice)
       ↑                      ↑
   authored, or          hand-editable, and the
   generated             thing that gets saved
```

The voxel map is the **source of truth for geometry**; the topology graph is the
source of truth for *meaning*. Neither is derived from the other at runtime —
the compiler runs once, offline or at load, and both artifacts ship.

## Stage 1 — topology (what Ariosto sees)

Already typed in `world-contract.ts`. A cave system is a `Place` subgraph plus
`Portal`s:

```
place  cave.entrance.north   kind: place    label: "north adit"
place  cave.hall             kind: room     label: "the great hall"
place  cave.flooded          kind: room     label: "the sump"
portal cave.hall→cave.flooded  locked: false cost: 40
portal outside→cave.entrance.north locked: true label: "blast door"
```

"Two entrances connecting a series of three caverns" is this graph and nothing
more. `world-topology.ts` already routes it (`routePortals`, locked = impassable)
and answers containment (`containmentPath`), so the sim side needs no new work.

## Stage 2 — the topology → voxel renderer

The compiler. Deterministic (seeded), so a graph always produces the same cave.

**Places become volumes.** A `room` is a blobby cavern — an ellipsoid sized from
its `Shape`, then displaced by seeded noise so it never reads as an ellipsoid.
Scale is a property of the place, not a constant: Tonio's rule is that shafts
are either **enormous** or **big with a gentle slope**, never the narrow pipes a
naive cylinder gives you.

**Portals become passages.** A portal is routed as a spine from one place's
surface to the next:

- **Grade budget.** Each passage carries a maximum grade. A ramp is grade-limited
  (so it's walkable/flyable), a shaft is not — and the compiler CHOOSES the
  route to satisfy the budget rather than the author hand-placing waypoints. That
  is what makes "gentle slope" a declarative property instead of a modelling job.
- **Radius profile.** Tapers along the spine, widening into each place so the
  junction is a mouth rather than a pipe meeting a sphere.
- **A locked portal is a NECK** — a deliberately narrow, regular section where a
  door can be mounted. It is the one place regular geometry is wanted, and it
  reads as built rather than natural, which is exactly right.

**Nothing regular by default.** The spine wanders (seeded), the radius breathes
along it, and junctions are smooth-min unions. Combined with the extraction
lattice's own hash jitter, no straight cylinder survives to the surface.

**Then verify — per AGENT, not in the abstract.** Compile, then flood-fill the
voxel map and assert that every declared portal is traversable and every place
reachable. This is the tunnel equivalent of the chunk-weld proof: *the cave the
sim believes in and the cave you can fly through cannot diverge*, because
divergence fails a test rather than surprising a player an hour in.

But "connected" is not a property of the cave alone (Tonio, 2026-08-12: *"if
you're flying not every hole is going to serve"*). A crack a walker squeezes
through is a wall to the scout. So connectivity is computed in the agent's
configuration space:

1. **Clearance field.** Distance-transform the voxel map: every open cell gets
   its distance to the nearest solid. Cheap on a sparse grid, and reusable —
   every agent class reads the same field.
2. **Erode, then fill.** Flood-fill only cells whose clearance ≥ the agent's
   radius. That is exactly "which holes serve *me*".
3. **Per profile.** `foot` (0.4 m), `scout` (~4 m), whatever a capital ship is —
   each yields its own connectivity, from one compile.

Two consequences worth designing for rather than discovering:

- **A portal carries a clearance, not just `locked`.** Ariosto can then route
  per agent: the same map says a passage is walkable and un-flyable, which is a
  *gameplay* fact (land, go on foot) rather than a bug. It sits naturally
  beside `Portal.cost`.
- **The compiler can widen to satisfy a declaration.** "The scout must reach the
  great hall" becomes a constraint: raise that route's radius until the eroded
  fill connects, or fail the build with the narrowest point named. That is what
  makes purpose-driven authoring — *two entrances, three caverns, flyable* —
  actually enforceable.

### Resolution is load-bearing

A flood fill is only as honest as its grid. A 4 m voxel cannot certify a 4 m
gap: partial occupancy at the cell scale is exactly where the answer lives.

**Rule: the voxel edge must be ≤ half the smallest clearance you intend to
certify** — certify the 4 m scout on ≤ 2 m voxels. Coarser than that and the
verification is a guess wearing a test's clothing, which is worse than no test.
Where that gets expensive, verify at fine resolution only along routes the
topology declares (which is a thin subset of the map), and leave the bulk coarse.

## Stage 3 — the voxel map

**Sparse, chunked, integer-addressed.** Only carved cells are stored, so a 2 km
adit is thousands of cells rather than a dense grid of mostly-rock. Chunk keys
align with `sdf-lattice`'s global lattice so the two never disagree about where a
cell is.

Each cell holds an occupancy scalar (not a boolean) — that's what lets the
sampler interpolate to something organic instead of Minecraft. A designer editing
by hand paints 0/1 and the smoothing does the rest.

## Stage 4 — voxels → density

A `PatchField` that trilinearly interpolates the occupancy field, low-passes it,
and adds a little high-frequency noise so walls have texture. Everything
downstream already exists: `patch-field` composes it against the terrain,
`b3d-patch` streams it, `sdf-lattice` extracts it, and the biome shader paints it
(`interior: 1`, flooding by `waterTable`).

Voxel resolution and lattice spacing are independent: voxels can be coarse (2–4 m)
while extraction is fine, because the interpolated field is smooth between cells.

## What exists today

| Piece | State |
| --- | --- |
| `sdf-lattice` | **done** — global lattice, surface nets, chunk-weld proof |
| `patch-field` | **done** — density composition, `marginBlend` rim convergence |
| `b3d-patch` | **done** — residency, budgeted extraction, cavity predicate, footprint ownership |
| `world-contract` / `world-topology` | **done** — `Place`/`Portal`, routing, locked edges |
| voxel map (sparse store + sampler) | **to build** — stage 3/4 |
| topology → voxel compiler | **to build** — stage 2, incl. grade-budgeted routing |
| connectivity verification | **to build** — flood fill vs the declared graph |
| voxel editor / blockout import | **later** — the level-design front end |

## Open questions

- **Where does a voxel map live?** A file beside the GLBs (compact binary), or
  generated at load from a seed + graph? Generated-at-load keeps content tiny and
  editable-by-graph; a file is what a level designer wants to hand-tune. Probably
  both: generate, then allow an override file that wins.
- **Does the terrain surface participate?** A cavern near the surface should
  break through it. The patch already owns its footprint, so the answer is
  probably "the compiler marks the footprint and the existing machinery handles
  it" — but it needs proving with a cavern that breaches a hillside.
- **Streaming a large complex.** `b3d-patch` currently treats a patch as
  all-or-nothing resident. A multi-kilometre system wants per-chunk residency
  driven by which *place* you're in — which the topology already knows.
