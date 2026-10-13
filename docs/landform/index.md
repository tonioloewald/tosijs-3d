# landform

**Authored landforms as terrain overrides** — where [[slope-profile]]s *remap*
the noise (levels curves), a landform *forces* a shape through it: a volcano
cone, an impact crater, wherever you say. Pure, deterministic, unit-tested;
[[b3d-terrain]] applies its `landform` hook after the profile pipeline in
origin-stable coordinates, so authored shapes survive floating-origin resets
and light correctly (normals difference the hooked field).

The factories return a **matched pair** — the height `landform` and the
`provinceField` that makes it glow — because a volcano isn't a shape OR a
material, it's both:

```javascript
const vesuvius = volcano({ x: 45, z: -25, radius: 55, height: 24, baseLevel: 5 })
terrain.landform = vesuvius.landform
terrain.provinceField = vesuvius.province
terrain.regenerate()
```

> Shown, not run — it needs a `terrain` from the surrounding scene. The doc
> system executes ```` ```js ````, ```` ```ts ```` and ```` ```tjs ```` fences as
> LIVE examples, so an illustrative fragment in one of those renders as a broken
> demo. ```` ```javascript ```` is the fence for "read this, don't run it".
> A working landform is on the [[sdf-lattice]] page, where `volcano` builds the
> cone you can cut open.

And a runtime explosion is the same move with the other factory — stamp an
`impactCrater` at the hit point, compose it in, `regenerate()`: a glowing
crater with almost no effort. `pad` is the same idea for CIVILIZATION — a
dead-flat surface with a cut-and-fill skirt, which is how cities and bases
claim ground (terrace several up a hillside with `composeLandforms`).
`composeLandforms` chains shapes; `mergeProvinces` maxes glow fields.

## A field knows where it stops

Every factory here returns a field tagged with an **`extent`** — the world-space
AABB outside which it is inert. A province has a natural boundary; it just
spans more than one tile, so the question a tile has to ask is
rectangle-vs-rectangle:

```javascript
const vesuvius = volcano({ x: 45, z: -25, radius: 55, height: 24 })
extentOf(vesuvius.province)                     // {minX, minZ, maxX, maxZ}
touchesExtent(vesuvius.province, x0, z0, x1, z1) // does it reach this tile?
```

It exists because a bare `(x, z) => number` cannot be asked that. The footprint
was always known — `volcano({radius})` early-returns past its radius — and it
was closed over and discarded, so terrain sampled every province at every vertex
of every tile in the world. `b3d-terrain` now skips a province that cannot reach
the tile it is building, which is exactly equivalent (the alpha lane is already
`1` = none, and the field returns `0` out there) and is the same test a per-tile
decision like an ice underside needs.

**The landform and the province carry SEPARATE extents**, because they genuinely
differ: a volcano's glow tail dies at `craterRadius + radius * 0.4` — inside the
cone for a default crater and *outside* it for a wide caldera — while a crater's
glow stops at `0.85 R` and its rim runs to `1.25 R`. One box for both is wrong
in one direction or the other every time.

⚠️ **An extent is a promise, and a wrong one is invisible.** Callers may skip the
field entirely outside it, so an extent that is too SMALL clips the thing it
describes with no error; too large only costs work. A hand-written closure that
declares none is treated as unbounded and behaves exactly as it always did — and
one unbounded member makes a whole `mergeProvinces`/`composeLandforms`
unbounded, because a box around only the members that declared one is a promise
nobody made.
