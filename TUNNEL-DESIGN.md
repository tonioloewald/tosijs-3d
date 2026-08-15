# Tunnel & cave design — topology → voxels → geometry

> **⚰️ THE PATCH IMPLEMENTATION WAS YANKED, 2026-08-15.** `b3d-patch` — the
> element that stitched an SDF-extracted volumetric patch into the heightfield,
> with its residency, budgets, cavity predicates and boundary reconciliation —
> is deleted. Tonio's verdict, and it is right: _a non-solution to a bypassed
> problem._ It never worked (see "Entrances"), and the design below has since
> removed the problem it was solving rather than solving it.
>
> **What was KEPT, because the new plan is built on it:** `carve.*` (the
> subtractive half of a province), `sdf-lattice` (one global lattice, so chunks
> weld bit-identically — cross-LOD seams unrepresentable rather than stitched),
> and `patch-field.terrainDensity` (how a density field agrees with the
> heightfield). None of that was the failure; the failure was making two
> representations coexist.
>
> Stages 1–3 below (topology → voxel map) are unaffected — deciding _where the
> air goes_ was always the real work. Read the volumetric-fine-tiles sections
> first; they supersede the geometry half of this document.

How caves, tunnels and underground complexes are authored, compiled and rendered.
Companion to `SPATIAL-DESIGN.md` (attachment) and `TERRAIN-SHADER-DESIGN.md` (surface).

> **The decision (Tonio, 2026-08-12): build from a VOXEL MAP, and have a
> topology → voxel-map renderer.** The voxel map is the intermediate
> representation everything downstream consumes; topology compiles _into_ it,
> and a level designer can author or edit it directly.

## Why this shape

Three requirements arrived together and they pull in different directions:

- **Ariosto wants topology.** Outside → _locked door_ → big cavern → … The
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
source of truth for _meaning_. Neither is derived from the other at runtime —
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
reachable. This is the tunnel equivalent of the chunk-weld proof: _the cave the
sim believes in and the cave you can fly through cannot diverge_, because
divergence fails a test rather than surprising a player an hour in.

But "connected" is not a property of the cave alone (Tonio, 2026-08-12: _"if
you're flying not every hole is going to serve"_). A crack a walker squeezes
through is a wall to the scout. So connectivity is computed in the agent's
configuration space:

1. **Clearance field.** Distance-transform the voxel map: every open cell gets
   its distance to the nearest solid. Cheap on a sparse grid, and reusable —
   every agent class reads the same field.
2. **Erode, then fill.** Flood-fill only cells whose clearance ≥ the agent's
   radius. That is exactly "which holes serve _me_".
3. **Per profile.** `foot` (0.4 m), `scout` (~4 m), whatever a capital ship is —
   each yields its own connectivity, from one compile.

Two consequences worth designing for rather than discovering:

- **A portal carries a clearance, not just `locked`.** Ariosto can then route
  per agent: the same map says a passage is walkable and un-flyable, which is a
  _gameplay_ fact (land, go on foot) rather than a bug. It sits naturally
  beside `Portal.cost`.
- **The compiler can widen to satisfy a declaration.** "The scout must reach the
  great hall" becomes a constraint: raise that route's radius until the eroded
  fill connects, or fail the build with the narrowest point named. That is what
  makes purpose-driven authoring — _two entrances, three caverns, flyable_ —
  actually enforceable.

### Resolution is load-bearing

A flood fill is only as honest as its grid. A 4 m voxel cannot certify a 4 m
gap: partial occupancy at the cell scale is exactly where the answer lives.

**Rule: the voxel edge must be ≤ half the smallest clearance you intend to
certify** — certify the 4 m scout on ≤ 2 m voxels. Coarser than that and the
verification is a guess wearing a test's clothing, which is worse than no test.
Where that gets expensive, verify at fine resolution only along routes the
topology declares (which is a thin subset of the map), and leave the bulk coarse.

## Locks, and why bypassing one must not break the story

> **Tonio, 2026-08-12:** _"Not all locks need be geometric or absolute. Players
> bypassing locks should be a feature not a bug… the way most games handle locks
> is the story beyond the lock is disabled until the lock is opened even if you
> walk around the locked door or drill through it. This is narrative vandalism."_

A lock is a **deterrent with a price**, never a switch that suspends the world
behind it. Three rules follow, and they're binding on both sides of the
sim/driver boundary:

**1. A lock never gates simulation.** The places beyond a locked portal are
simulated exactly as they would be if the door stood open — NPCs there keep
doing what they were doing, fires burn, cargo rots. This is the same principle
`world-contract.ts` already states as _the driver is never load-bearing_: the
sim is a complete sandbox and narrative is advisory. A lock that disabled the
far side would make the sim depend on the story, which is the dependency this
architecture exists to forbid.

**2. Locked means EXPENSIVE, not impassable.** `Portal.locked` is a routing and
cost fact — an NPC without the key shouldn't _plan_ through it — but it says
nothing about whether a player can get there. A lock is any obstacle with a
price: a door needing a key, a guarded hall, a rubble choke, a pressure
hazard, a fight. `Portal.cost` already carries the currency.

**3. However you got in, the world knows HOW — and that's the interesting
part.** Entry through the door, around it via a side passage, or through a wall
you drilled are three different _events_, not one boolean. The event stream
records the means (it already only records commitments — intentional acts), so a
driver can react to a breach: alarms, a changed reception, the guard captain
noticing the hole. Reacting is richer than refusing, and it costs the sim
nothing to make available.

### Bypass is the pipeline, not an exception

This is where the voxel map earns its place. A player drilling through a wall is
**an edit to the voxel map** — the same operation the compiler performs, at
runtime, in one chunk. Re-run the clearance fill over the touched region and the
connectivity that falls out includes the new hole. So:

- **Authored portals carry meaning** — labels, kinds, `locked`, intent.
- **Live connectivity is DERIVED from the voxel map** — including passages
  nobody authored.

A breach therefore appears to the sim as a real portal (unlabelled, agent-
clearance known) rather than as a special case somebody remembered to handle.
Nothing needs to detect "the player cheated"; there was no cheat, only a new
edge in the graph. And because connectivity is agent-relative, a hole drilled
big enough to walk through but not to fly through is _automatically_ exactly
that fact, for every system that asks.

The one thing the compiler owes the designer here: when it generates a lock, it
should usually also generate — or at least not preclude — an alternative. A lock
whose only outcome is "come back with the key" is the failure mode above wearing
level design's clothes.

## Entrances: shape the ground, don't boolean it

> **Learned the hard way, 2026-08-13.** The plan said to cut the mouth by
> masking tiles where the carve breaks the surface, then reconcile the seam
> (rim tuck, margin blend). We built that. It doesn't work, and the reason is
> structural rather than a matter of tuning.

An arbitrary heightfield meets an extracted tube at whatever angle the hill
happens to have. Where the tube runs _nearly parallel_ to the ground — which
it does constantly, because both are shaped by the same landscape — it breaks
the surface repeatedly in a rash of small openings, each with its own seam,
each collecting the tile skirts that hang below it. Every fix aimed at the
boundary (a bigger rim collar, a flange, a probe depth) improves one crossing
and creates another somewhere else, because the _conditioning_ is the problem:
two surfaces meeting at a grazing angle have no well-defined boundary to
reconcile.

**So shape the ground to suit the tunnel.** `landform.gulley` cuts a
flat-floored channel ending in a near-vertical FACE, and the tunnel starts in
that face. The mouth becomes a circle meeting a plane, roughly perpendicular —
the best-conditioned intersection available — and the approach is a corridor
you fly down. The player reads it as an excavated entrance, because that's
exactly what it is.

The general rule this is an instance of: **where a tunnel must meet the
surface, author the surface.** Interiors can be arbitrary — underground there
is no tile to disagree with — but every _transition_ wants a landform placed
deliberately, not discovered. The topology compiler should therefore emit a
landform per entrance portal, not only a carve.

## ⚠️ The idea that may dissolve all of this: volumetric fine tiles

> Tonio, 2026-08-15. Untried, and it deserves trying before any more work goes
> into reconciling boundaries.

**What if terrain tiles were volumetric, and only the coarser LODs were a top
surface?** The finest ring around the camera extracts from a density field the
way `b3d-patch` already does; everything beyond it stays the heightfield it is
today.

The reason this is interesting is not performance — it is that **it deletes the
problem above rather than solving it.** Everything in the "Entrances" section is
the cost of a _representation boundary_: a heightfield quantised to quads meeting
an SDF quantised to a lattice, at whatever grazing angle the hill happens to
have. Make the near field entirely volumetric and that boundary does not exist
where the player is. The only remaining transition is volumetric-fine →
heightfield-coarse, which happens _far away_, is always roughly horizontal, and
is already hidden by the skirt machinery built for LOD seams.

It also lines up with what we already know: caves are a NEAR-FIELD feature. You
cannot see into one from a distance — at range a mouth is a dark patch, which a
heightfield represents perfectly well. So "volumetric only where you can see
detail" is not a compromise, it is the same information budget the LOD system
already applies to everything else.

**The risk, and it is the whole risk:** the two representations must produce the
_same surface_ where there is no cave, or the ground visibly shifts when a tile
changes LOD. Surface nets places a vertex where the density crosses zero; a
heightfield grid places one at a sample point. Those are not the same surface,
and a ripple that runs around the player at a fixed radius would be far worse
than any seam we have now.

Three things make it tractable rather than hopeful:

- `sdf-lattice` already extracts from ONE global hash-jittered lattice, so
  chunks weld bit-identically — cross-tile and cross-LOD seams are
  _unrepresentable_ there, not stitched. That guarantee is exactly what this
  needs, and it already exists and is unit-tested.
- `patch-field.terrainDensity` already derives density from the hooked height
  sampler, so "the density field agrees with the heightfield" is the existing
  contract, not a new one.
- `marginBlend` already converges a rim onto the heightfield.

**How to test it cheaply, before building anything:** extract one flat tile
volumetrically with no carve at all, overlay it on the heightfield tile it
replaces, and measure the maximum vertex deviation. If it is sub-centimetre the
idea is alive; if it is not, that number is the whole feasibility answer and
costs an afternoon. Do that first — it is the same discipline that would have
saved the fortnight the "Entrances" section documents.

**If it works**, the `landform.gulley` / author-the-surface rule stops being a
requirement and becomes a _style choice_: an excavated entrance because you
wanted one, not because the geometry could not survive anything else.

### …and then there are no tunnels

Tonio's follow-on, and it is the real conclusion: **this eliminates tunnels as a
concept. We would just be shrink-wrapping volumes.**

A tunnel stops being a _thing the engine knows about_ and becomes a region where
the density function says air. The extractor does not know a cave from a cliff
from an overhang; it wraps an isosurface. Which means most of what this document
describes is scaffolding for a problem that disappears:

| built for tunnels                                | becomes                                |
| ------------------------------------------------ | -------------------------------------- |
| `b3d-patch` residency, budgets, chunk release    | the terrain's own LOD, already written |
| the patch/terrain boundary, rim collars, flanges | nothing — there is no boundary         |
| "Entrances: shape the ground, don't boolean it"  | a style choice                         |
| cavity predicates for flying inside              | one density query, same as the ground  |
| `carve.*` as a patch vocabulary                  | terms in the terrain density function  |

What genuinely remains is the part that was always the real work: **deciding
where the air goes** (topology → voxel map, Stages 1–3), and authoring a density
function. Those keep their value entirely. What evaporates is the machinery for
making two representations coexist — which is where the fortnight went.

Overhangs, arches, sea caves and cliff undercuts come along free, because none of
them were ever tunnel-specific; they were all just "things a heightfield cannot
say".

**The cost, stated honestly:** the finest terrain ring gets more expensive
(surface nets over a lattice versus a grid of heights), and the near ring is
already the most expensive thing in the scene. So feasibility is two numbers, not
one — the vertex deviation above, and extraction cost per tile against the
current tile build budget. Both are measurable before anything is built, and both
should be, given what the last attempt cost.

### The refinement that makes it cheap: the last LOD adds VOLUME, not polys

> Tonio, same conversation, and it changes the plan materially.

Two moves, and together they retire most of the risk above.

**1. The finest LOD stops refining the surface and starts adding volume.** The
tessellation ladder ends a rung early; the budget that would have bought more
surface triangles buys cavities instead. So the last rung changes _kind_ rather
than _density_ — which means **the surface transition stays seamless out to the
third-highest LOD**, because nothing about the surface changes at the finest
step. Only holes appear in it.

**2. The volume is the surface MINUS cavities.** Not a re-extraction of the
ground: the boundary _is_ the heightfield where nothing has been carved, exactly
and by construction. This is the important one, because it dissolves the risk
this document raised two sections ago — there is no "does surface nets reproduce
the heightfield" question if the heightfield is what is being used. Deviation
only arises where a cavity actually cuts the surface, and that is a small
authored set rather than everywhere.

It also means **the lower LODs cost nothing extra**, which was the other worry:
they are the heightfield they already are, untouched.

### Precompute which cavities never reach the surface

Most caves in a world never break the ground. A cavity whose highest point sits
below the terrain over its own footprint **cannot affect the visible surface at
all** — so at surface level it can be ignored outright, and its walls only need
to exist when a viewer is inside or can see through an opening.

That is a cheap precomputation (cavity bounds against the height sampler, done
once at authoring or load) and it turns the residency question from a radius —
which is what `b3d-patch` does today, with the hysteresis problem that entails —
into something far better defined: **am I inside, or can I see in.**

### Cavities come from PROVINCES, so there are none by default

The last piece, and it is what makes the cost story "zero" rather than "small".

A world has no cavities unless something declares them, and the thing that
declares them is the mechanism that already exists for exactly this shape of
statement: a **province**. `landform` already returns one for volcanism, `pad`
already claims ground for a city, `provinceField` already seeds them across a
world. "This region has caves" is the same authoring gesture as "this region is
volcanic" — not a new system, a new field on an old one.

What that buys, in order of importance:

- **A default world pays nothing.** No province, no cavity, no volumetric path,
  no extra tile cost — the terrain is exactly the terrain we ship today. The
  feature is opt-in per region rather than a tax on the substrate.
- **The reaches-the-surface precomputation is scoped for free.** A province has
  bounds, so the question is asked over a known footprint instead of a world.
- **Residency has an obvious unit.** Not a radius, not a tile heuristic: the
  province. You are inside one or you are not, and its bounds are declared.
- **Seeded worlds stay reproducible.** Provinces are already part of the seed, so
  "same seed, same caves" comes along without a second mechanism — the same
  property `b3d-spawner` relies on for "same seed, same battles".

It also means the terrain's existing `patchMask` / `patches` hooks have a natural
owner: a province emits them, rather than a consumer wiring them by hand.

### The vocabulary this leaves: add a shape, subtract some volumes

A province turns out to be two things we have already built and tested:

> **height forcing function** (`landform.*`) **+ a list of subtracted volumes**
> (`carve.*`)

- **volcano** = a mount, minus a bunch of lava tubes
- **arch** = a mound, minus a cylinder
- **sea cave** = a headland, minus a capsule aimed inland
- **crater with a collapsed chamber** = `impactCrater`, minus a sphere below it

That is the entire authoring surface, and neither half is new. `landform` already
does the additive side (`volcano`, `impactCrater`, `pad`, composed by
`composeLandforms`); `carve` already does the subtractive side (`sphere`,
`capsule`, `tube`, `box`, `smoothUnion`, and the two perturbations that stop
anything reading as a primitive). The work done for tunnels survives intact — it
just stops being "the tunnel system" and becomes the second half of a province.

**The arch is the case worth building first**, and not because it is pretty: it
is a cavity that breaks the surface _twice_, at close to the best-conditioned
angle available (a cylinder exiting a mound is roughly perpendicular to it). So
it exercises the whole path — additive shape, subtracted volume, surface
intersection — in the geometry most likely to succeed. If an arch cannot be made
to work, nothing harder will.

And a lava tube is the complementary case: mostly _not_ reaching the surface, so
mostly free under the precomputation above, with the hard part confined to its
mouths — which is exactly where an author wants to place a landform anyway.

### Mining falls out of it — and a mined world is a few kilobytes

If a cavity is a carve and a province is a list of them, then **mining is
appending to that list at runtime.** A player's beam adds a small sphere; the
affected chunk re-extracts. There is no separate destructible-terrain system,
because there is no distinction between "a cave the world came with" and "a hole
the player made" — both are subtracted volumes.

The part that matters most is not the rendering, it is the **storage**. A mined
world is not a voxel grid: it is a seed plus an edit list. A player's entire
excavation history is a few kilobytes of primitives, which means it costs nothing
to save, nothing to sync, nothing to send to another player, and — the point Tonio
is making — nothing to _load_. A No Man's Sky-shaped world that opens from a URL
in seconds on a phone is possible precisely because there are no assets to stream:
a procedural base, plus a list of spheres.

Undo, refill and "the world heals over time" are all list operations. So is
multiplayer: you exchange edits, not geometry.

**Two real constraints, both known:**

- **Re-extraction must fit a frame budget.** `b3d-patch`'s ms-budgeted extractor
  survives this redesign even though its residency machinery does not — that part
  was always right, and it is exactly what a mining beam needs.
- **A hole is invisible at coarse LOD**, because coarse LOD is a heightfield.
  Walk away far enough and your excavation flattens. That is the same near-field
  property that makes the whole scheme cheap, and it is probably fine — you cannot
  see a one-metre hole from a kilometre — but it is a real limit and worth stating
  before someone discovers it as a bug.

### What this leaves as the hard case, honestly

Where a cavity _does_ break the surface, the conditioning problem from
"Entrances" is unchanged: two surfaces meeting at a grazing angle still have no
well-defined boundary. What changes is its _scope_. It stops being a constant
tax paid everywhere a tunnel runs near the ground, and becomes a rare case
attached to entrances you placed deliberately — where the author-the-surface
rule (`landform.gulley`, a near-vertical face) already works.

So the earlier claim needs correcting: this does not delete the entrance
problem. It **shrinks it from pervasive to occasional, and moves it to exactly
the places where the existing fix applies.** That is a smaller claim and a much
more believable one.

## Story → geometry, in the new paradigm: pin to the surface, then carve

> Tonio, 2026-08-15. This replaces the geometry half of Stage 2 — the topology
> stays, its output changes from a voxel map to a carve list.

The compiler is three steps, and the middle one is the whole trick:

1. **Take the map specification as a small graph** — nodes are places, edges are
   connections. Lay it out over the terrain as a plan: `(x, z)` per node.
2. **Pin every node BELOW THE SURFACE at a stated depth.** Not an absolute `y` —
   an _offset from the terrain at that `(x, z)`_. The height sampler already
   provides this (`heightSampler()`), and `patch-field.terrainDensity` is built
   on it.
3. **Hang volumetric strokes and fills off the pinned graph.** An edge becomes a
   `carve.tube` along its spine; a node becomes a `carve.sphere` or `box` — a
   chamber. `smoothUnion` makes the junctions read as excavated rather than
   assembled, which is what it was written for.

### Why the offset is the important part

A node pinned at "40 m below the surface" **cannot break the surface**, by
construction. So the precomputation this document asks for two sections up —
_which cavities reach the surface_ — stops being a check and becomes a property:
a cavity surfaces only where an author deliberately pins a node at zero depth.

That is the entrance-conditioning problem finally cornered. It does not go away,
but it stops happening _by accident_, which is what made it intractable: a tube
in absolute coordinates grazes the hillside wherever the hill happens to rise,
constantly and unpredictably. A tube pinned to the surface simply follows it.

It also means the tunnel system inherits the terrain's own shape for free — a
passage under a mountain is deeper because the mountain is taller, without
anyone saying so.

### Small graphs only, and say so in the API

This is deliberately **not** a dungeon generator. With a large graph you get edge
self-intersections producing connections nobody declared, and the verification
step (Stage 1's rule: connectivity is CHECKED against the declared graph, never
assumed) turns from a cheap assertion into a search problem.

Small, authored, story-shaped: a cave system with three chambers and a back way
out. That is what a narrative engine actually asks for, and the constraint should
be stated in the API rather than discovered at scale.

### The two failure modes to check for, not hope about

- **An edge can surface even when both its nodes are deep.** Two nodes pinned at
  −40 m with a ridge between them: a straight tube pops out of the ridge. So an
  edge must be pinned _per sample along its length_, not interpolated between its
  endpoints — the same rule `carve.roughen` already carries ("certify clearance
  AFTER perturbing, never before").
- **Edges that cross create connectivity nobody declared.** Two passages at the
  same depth crossing in plan view merge into a junction. Either separate them in
  depth at layout time, or detect it and say so — but do not let the geometry
  quietly answer a question the topology was supposed to own.

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

| Piece                               | State                                                                            |
| ----------------------------------- | -------------------------------------------------------------------------------- |
| `sdf-lattice`                       | **done** — global lattice, surface nets, chunk-weld proof                        |
| `patch-field`                       | **done** — density composition, `marginBlend` rim convergence                    |
| `b3d-patch`                         | **done** — residency, budgeted extraction, cavity predicate, footprint ownership |
| `world-contract` / `world-topology` | **done** — `Place`/`Portal`, routing, locked edges                               |
| voxel map (sparse store + sampler)  | **to build** — stage 3/4                                                         |
| topology → voxel compiler           | **to build** — stage 2, incl. grade-budgeted routing                             |
| connectivity verification           | **to build** — flood fill vs the declared graph                                  |
| voxel editor / blockout import      | **later** — the level-design front end                                           |

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
  driven by which _place_ you're in — which the topology already knows.
