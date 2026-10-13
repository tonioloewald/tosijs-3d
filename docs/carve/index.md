# carve

**The shapes you cut caves out of, and the noise that stops them looking cut.**
Pure, deterministic, Babylon-free; the vocabulary [[patch-field]] composes and
[[sdf-lattice]] extracts, and the same primitives the topology→voxel compiler
will stamp (see `TUNNEL-DESIGN.md`).

A `Carve` is a signed distance to a carved surface, **positive INSIDE the air**
— the opposite sign convention to density, because you author the hole, not the
rock. `applyCarve` turns one into a `PatchField`:

```javascript
import { carve } from 'tosijs-3d'

const cave = carve.applyCarve(
  carve.roughen(
    carve.smoothUnion(30,
      carve.sphere({ x: 0, y: -40, z: 0 }, 45),          // a hall
      carve.capsule({ x: 0, y: -40, z: 0 }, { x: 200, y: -70, z: 40 }, 14),
    ),
    { amp: 6, scale: 0.02, octaves: 3, seed: 7 },
  )
)
```

> The family is exported as **`carve.*`**, not as bare names: `box`, `sphere`,
> `tube` and `union` are common nouns, and one of them (`box`) would otherwise
> shadow [[box]]'s UI container. Same reasoning as the `ui.*` namespace.

## Why a capsule is the workhorse

A tunnel is a **segment with a radius** — that's a capsule, and its exact
distance function is three lines. Chain them along a spine and you have a
passage that bends; take their smooth union with a room and the junction is a
mouth rather than a pipe stuck into a sphere. Everything else here is a
variation on that idea.

## Perturbation: two knobs, different jobs

- **`roughen`** displaces the surface along its own normal — walls get texture,
  the silhouette stays where you put it. Cheap: one noise lookup per sample.
- **`warp`** bends the SPACE the shape lives in, so a straight tunnel meanders
  and a sphere becomes a cavern. This is what removes "regular geometry" as a
  rule rather than as a decoration — but it moves the surface, so a warped
  passage needs its clearance re-checked, not assumed.

Both take an amplitude in METRES and a scale in 1/metres (small scale = big
features), the same convention as the terrain noise, so numbers transfer.
