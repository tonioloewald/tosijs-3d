# patch-field

**`landform`'s volumetric sibling.** Where a [[landform]] post-filters the
terrain's HEIGHT, a patch post-filters its DENSITY — one dimension up, so it can
carve bores, caverns and chambers that a heightfield cannot express:

```
landform:  (x, z, h)    => h'      composeLandforms(...)     // shaping
patch:     (x, y, z, d) => d'      composePatches(...)       // carving
```

Pure, deterministic, Babylon-free, unit-tested. [[sdf-lattice]] turns the
resulting field into triangles.

> **Still alive after `b3d-patch` was removed** (0.7.0). The element that
> stitched an SDF patch into the heightfield is gone — it never worked, and the
> volumetric-terrain design removed the problem it was solving rather than
> solving it. This module was the substrate underneath it and survives intact:
> **`terrainDensity` is how a density field agrees with the heightfield**, which
> is load-bearing for carved landforms, and the compose/footprint helpers are the
> composition vocabulary.
>
> The one vestige is **`marginBlend`**, which converged a patch's rim onto the
> heightfield across a boundary. There is no such boundary any more, so it has no
> current caller — kept because a rim that has to meet a surface is a real
> problem that will come back with authored entrances, not because anything uses
> it today. See `TUNNEL-DESIGN.md`.

## Ordering is load-bearing

The base density is `y − heightAt(x, z)` where `heightAt` is the terrain's
**hooked, landform-composed** height — not raw noise. Compose it that way and a
bore under a `pad()` plateau meets the plateau; get it wrong and the mouth erupts
through the wrong surface. `terrainDensity(heightAt)` builds the base from
exactly the sampler the tiles use, so the two cannot disagree.

## The rim cannot crack

`marginBlend` is why a hole's edge doesn't need stitching to the tile grid.
Inside a margin band at the footprint's edge the patch density is blended back
toward the terrain's own density, so the extracted surface **converges onto the
heightfield** rather than merely arriving near it — and `tuck` puts that
convergence a hair BELOW the terrain surface, so the tile geometry laps over the
join. The stair-stepped hole edge in the tile grid then sits inside solid rock,
where nobody can see it. (Same instinct as terrain's skirts, which don't solve
the LOD seam either — they make it invisible.)
