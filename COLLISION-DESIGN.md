# Collision design — probes, skeletons, and what may hit what

Status: **design, mostly unbuilt.** The aircraft's two rays are the only shipped
consumers. Written when the phantom-collision hunt (VR pass 2) showed that the
one rule we had — _ray origins come from the world matrix_ — was documented in
`b3d-aircraft` for `muzzle()` and still missed by the collision rays in the same
file. A rule that isn't shared isn't a rule; it's a comment.

The next consumers are the hard ones: **a sword tip parented to a bone in an
animated skeleton**, a **limb** that has to notice the environment, and the same
question again for jeeps, ships, submarines, bipeds and animals.

## The design constraint on "is this thing hitting that thing"

This is not a separate skeletal-collision subsystem to build later. It is a
**constraint on the reusable hit test**, and it has to be taken at design time
because it decides the signature:

> **The test never accepts a position. It accepts something that can produce a
> world matrix.**

Every case we know we need is then the same case:

| Thing                                       | Where it really is                          |
| ------------------------------------------- | ------------------------------------------- |
| a plain prop                                | its node's world matrix                     |
| an aircraft with a `_centerOfGravity` pivot | world matrix (NOT `position` — today's bug) |
| a sword tip on a hand bone                  | the bone-attached node's world matrix       |
| a limb capsule                              | ditto                                       |
| anything, after a floating-origin shift     | ditto, inherited through the parent         |

A signature that takes `Vector3` **cannot** express a sword tip without the
caller doing bone math at every call site — which is precisely how the aircraft
ended up with a rule its own file documented and its own rays ignored. A
signature that takes a _pose source_ makes the animated case free, the pivot case
free, and the floating-origin case free, because all three live in the matrix.

The corollary is that the test's other half — **what am I allowed to hit** — must
also be declarative rather than a per-call predicate, for the same reason: a rule
each caller re-implements is a rule that will be got wrong somewhere. See
"What may hit what" below.

## The requirement

Three probe shapes cover everything we have and everything named above:

| Probe                           | Question                                    | Shipped example                                                 |
| ------------------------------- | ------------------------------------------- | --------------------------------------------------------------- |
| **Point / ray**                 | "what is below/ahead of me?"                | aircraft `raycastGround`                                        |
| **Swept segment**               | "what did I pass THROUGH since last frame?" | aircraft impact sweep, `b3d-launcher`'s swept projectile        |
| **Volume** (sphere/capsule/box) | "what am I overlapping?"                    | `b3d-collisions` convention colliders, `b3d-warhead` AOE gather |

A sword tip is the **swept segment** case and nothing more exotic: between two
frames the tip travels a line, and what that line crosses is what it cut. The
difficulty is not the geometry — it is knowing **where the tip actually was**,
on an animated skeleton, without paying for mesh-accurate skinned picking.

## The trap: skinned picking is the BIND POSE

Verified against `@babylonjs/core` 9.16.2 (typings, this repo's `node_modules`):

- `AbstractMesh.getPositionData(applySkeleton?, applyMorph?)` — **`applySkeleton`
  defaults to false**.
- `AbstractMesh.refreshBoundingInfo(applySkeletonOrOptions, applyMorph)` — same,
  opt-in.

So a ray tested against an animated character hits **the pose it was exported
in**, silently and plausibly. Nothing errors; the arm is simply not where the
collision says it is. Asking for the truth (`applySkeleton: true`) means CPU
skinning of the position buffer — per mesh, per frame, on the main thread. That
is the opposite of the perf posture in `PERF-DESIGN.md`, and it buys accuracy we
do not need.

**Therefore: never collide against skinned geometry.** Collide against **proxy
volumes attached to bones.**

## The architecture: bone-attached proxies

Babylon gives us exactly the two pieces (verified):

- `mesh.attachToBone(bone, affectedTransformNode)` — a `TransformNode` rides a
  bone.
- `bone.getFinalMatrix()` (`getWorldMatrix()` is deprecated) and
  `bone.getAbsolutePositionToRef(mesh, result)` — the bone's animated world
  transform, cheap, already computed for rendering.

A weapon, a hand, a hoof, a limb capsule is a **node on a bone**, and its probe
reads that node's **world matrix**. This is the same rule today's aircraft fix
enforced, one level deeper: the animated pose is in the matrix, so anything that
reads the matrix is automatically correct under animation — no skinning, no
per-frame vertex work, and it composes with the floating origin for free (a
bone-attached node inherits the shift through its parent).

Cost is a handful of matrix reads per armed entity per frame, not a skinned
buffer. This is the "**spend headroom on agents and reactions, not vertices**"
north star applied to collision: a fencer whose blade is a capsule on a bone can
have _many_ opponents; a fencer whose blade is mesh-accurate can have one.

**Authoring follows the existing convention.** Colliders are already declared by
name suffix (`_collide`, `_collideBox`, `_collideCapsule`…, see CLAUDE.md). A rig
declares its proxies the same way — an empty on the hand bone named
`Blade_collideCapsule` is a sword edge — so a rigger creates collision in
Blender, not a programmer in TypeScript.

## Default groups, and why UI must be excluded BY DEFAULT

Tonio: _"Unity defined a few [groups] by default and UI is an obvious group to
exclude from all non-UI physics stuff by default."_ Agreed, and the emphasis
belongs on **by default** — that is the part that would have prevented this bug
rather than merely described it.

The shipped `markUiMesh`/`isNoCollide` is **opt-out**: every predicate has to
remember `&& !isNoCollide(m)`. We already know what happens to a rule each call
site must remember — it is the same failure that produced this bug (the
world-matrix rule was written down in `b3d-aircraft` and its own rays ignored
it) and there are **four more predicates** in the tree that don't have it yet
(launcher, turret LOS, warhead gather, `b3d-collisions`). Opt-out means the bug
is latent in each of them and will resurface in whichever ships first.

So the reusable probe **excludes UI unless you ask for it**:

| Group         | In a physical probe        | Notes                                 |
| ------------- | -------------------------- | ------------------------------------- |
| `world`       | ✅ default                 | terrain, structures, props            |
| `actors`      | ✅ default                 | vehicles, bipeds, animals             |
| `projectiles` | ✅ default                 | needs self/owner exclusion, see below |
| **`ui`**      | **❌ never, unless asked** | panels, HUDs, pointer targets         |
| `sensor`      | ❌ never                   | trigger volumes — overlap tests only  |

Pointer/gaze picking is the one caller that asks FOR `ui`, and it is already a
different code path. So the default is right for every existing call site, and
"I want to hit UI" becomes the loud, rare, explicit case — which is the correct
shape for a footgun.

The corollary matters as much: **a probe with no group argument must be safe**,
because that is what a hurried call site writes. `probe.segment(from, to)` should
already skip UI and sensors. Anything that requires an argument to be correct
will eventually be called without it.

## What may hit what — the exclusion problem

Tonio: _"in Unity you can exclude certain mesh families from a ray collision
test."_ We have no such thing, and it already cost us:

- Every call site passes an **ad-hoc predicate**.
- **Passing a predicate makes Babylon SKIP its built-in `isPickable`/`isEnabled`
  filter** — the predicate is the sole test — so every predicate must re-check
  both or it picks non-pickable things. That is exactly how the aircraft picked a
  **cloud blob** as ground and pulled up over open sky.
- Each new entity re-derives the same "not me, not `__root__`, not water if I am
  submersible" list, and any one of them can get it wrong quietly.

**Proposal — one `probe()` and a declarative exclusion.** A single shared helper
takes a probe (ray/segment/volume), an origin **derived from the world matrix**,
and a **group** describing what it may hit; it re-checks `isPickable`/`isEnabled`
once, centrally, so no call site can forget. Membership is declared in metadata
seeded from the naming convention (the project already parses `_nocast`,
`-ignore`, `_collide*` via `conventionName`), not assembled per call.

Sketch, not settled:

```
probe.segment(from, to, { exclude: self, groups: ['world', 'actors'] })
```

The self-exclusion must be **the whole entity** (a sword must not cut its own
wielder's arm), which means the group system needs an _owner_ concept, not just
mesh identity. That is the part most likely to be got wrong on the first try.

## Rules that already have scars

1. **Probe origins come from the WORLD MATRIX, never `node.position`.** With a
   `_centerOfGravity` pivot (or any parent) `position` is the stance origin, not
   where the body is; banking moved the aircraft out from under its own rays.
   Transform the LOCAL ORIGIN through the world matrix — identical to
   `node.position` when there is no pivot, so it is free to adopt. Pinned in
   `aircraft-rig.test.ts`.
2. **Fast things need a SWEPT probe, not a point.** A point test tunnels through
   thin geometry at speed. The aircraft learned this as "flying into a cliff
   reports the valley floor far below"; a sword tip at swing speed is the same
   problem an order of magnitude smaller.
3. **A crash/impact must record WHAT it hit.** The phantom collision was
   unfalsifiable until the hit mesh had a name attached (`crashReport`). Any
   probe that can kill something should be able to say what did it.
4. **Keep the math pure.** Segment/capsule/sphere intersection is plain vector
   arithmetic; it belongs in a Babylon-free, unit-tested module beside
   `spatial-transform` and `ballistics`, with the Babylon layer only supplying
   matrices. Same discipline as `fly-by-wire`.

## Open questions

- **Rate.** Do limb probes run every frame, or only during an animation window
  the clip declares ("frames 8–14 of `slash` are live")? An authored window is
  cheaper AND better game feel, but it is content the rigger must supply.
- **Response.** Damage is solved (`destroyable`/`warhead`); what a biped does
  physically on limb contact (stop, ragdoll, push) is not, and probably belongs
  with the character controller rather than here.
- **Whose job is a hit?** A sword owned by the wielder, swung into another
  entity, produces an event that the combat layer must attribute (`CombatEvent`
  carries no attribution — manta-recon #8, still open). Skeletal weapons make
  that gap load-bearing.
