# Galaxy design — a voxel galaxy with two populations

> Status: **design**, agreed in conversation with Tonio (2026-09-24), nothing
> built yet. Supersedes the "GALAXY ARCHITECTURE" TODO line.

## The problem

`generateGalaxy` draws N stars from ONE sequential random stream. Three things
follow, and all of them bite:

- **No locality.** A star's position depends on every star drawn before it, so
  there is no way to generate "just this region". Everything is loaded or
  nothing is.
- **One undifferentiated budget.** 100k stars means 100k of every kind, although
  almost all of them are dim stars nobody can see from more than a short
  distance away.
- **Identity is broken.** Each star's seed is `prng.range(1, 100000)`, drawn for
  up to 100k stars — the birthday problem at full strength. Measured at
  `generateGalaxy(1234, 100000)`: **63,108 distinct seeds; 63.4% of stars share
  one with another star**, and so share its spectral class, name and planets
  (48,546 distinct names). And stars are addressed by ARRAY INDEX
  (`getStarAt(i)`, `b3dStarSystem({ starIndex })`, the baker's join), so any
  change to the population changes every address.

## The model

**The galaxy is a grid of voxels, and every voxel has two derived seeds** — one
for its BRIGHT stars and one for its DIM stars (a third and fourth later, for
nebulae). Seeds are never stored: they are `hash(galaxySeed, vx, vy, vz, stream)`.

- **The bright pass is global.** Every voxel's bright stream, generated once:
  the stars you can see across the galaxy. A few thousand to ~50k.
- **The dim pass is local.** Only the voxels near something that is looking —
  a camera, a bake point. Generated on demand, identical every time.

A star's **address** is `(voxel, population, n)` and its seed is
`hash(voxelSeed, n)`. That ends the clone problem, makes identity independent of
what else is loaded, and makes every derived property (name, spectral detail,
planets, habitability) a pure function computed only when something asks.

### Density — sampled, then propagated

Each voxel's budget share comes from an imputed density:

1. **Sample it from the existing generator.** 100k positions from the current
   spiral-Gaussian model, histogrammed into the grid. This keeps today's look by
   construction, and it is cheap: measured **220 ms** for 100k stars with names
   (less without them) and **10 ms** to histogram. Only **8,902 of 32,768**
   voxels of a 64×64×8 grid are occupied; the densest holds 139 samples. (A
   sounder model can replace the sampler later without changing anything
   downstream.)
2. **Smooth lightly** — one or two blur passes, only enough to calm sparse
   voxels (5 samples is ±45% noise).
3. **Give EVERY voxel a non-zero density** (Tonio's rule), by DISTANCE FALLOFF
   from the populated voxels — `exp(−distance / λ)` — scaled so the fringe gets a
   **pinned share** of the budget. Not by diffusion: diffusing until every voxel
   is filled took 22 passes and moved **45.5%** of the stars into the fringe,
   erasing the spiral, and still left the far corners at ~10⁻¹⁶. The farthest
   empty voxel is 22 voxels from a populated one, so λ ≈ 3–4 voxels still gives
   the corners a small real chance.

So the three dials are independent: **smoothing**, **fringe share** (e.g. 2%),
**falloff length λ**.

### Counts and placement

- **Counts:** `budget × voxel density`, rounded STOCHASTICALLY with the voxel's
  own seed — totals land within noise of the budget, each voxel's count is
  fixed forever, and a fringe voxel expecting 0.02 stars has one in fifty
  voxels, deterministically.
- **Placement is the one trap.** Uniform-within-voxel shows the grid wherever
  density changes sharply (arm edges, the core). Place by REJECTION against the
  density interpolated across neighbouring voxels, and the grid is invisible.

### Shape — bulgier than life, on purpose

Real galaxies are remarkably flat. Ours should be **bulgier** (Tonio) — a
thicker disc and a central bulge read better as a place you are inside. The
shape lives entirely in the density grid, so this only changes the sampler
that seeds it; the grid's vertical extent grows to hold it (today ±0.1 fits the
disc tightly, and a real halo wants something like ±0.3 with 16–24 layers —
occupancy stays sparse).

### The bright/dim cut is a dial

Measured on today's generator (100k stars):

| bright = | bright of 100k | real Milky Way main sequence |
| -------- | -------------- | ---------------------------- |
| O, B, A  | 2,598 (2.6%)   | 0.7%                         |
| O–F      | 9,466 (9.5%)   | 3.7%                         |
| O–G5     | 20,277 (20.3%) | ~7.5%                        |

Today's spectral weights are top-heavy — A and F at 3–4× their real share —
and **on purpose** (Tonio): with one global population, a realistic mix needs an
obscene star count before the galaxy looks interesting, so the old model skewed
the mix toward bright stars to get there on a sane budget. The voxel model
removes that reason. Dim stars cost only where someone is looking, so the mix
can move toward realistic without the count exploding — which is a second
argument for the model, not just a side effect of it.

Tonio's working guess — **~5k bright to ~95k dim** — sits between the A and F
cuts on today's weights, or almost exactly "F and hotter" on real ones. The cut
may be spectral or by luminosity (nearly equivalent; luminosity is what
rendering cares about) — decide when building, alongside how far toward the
real mix the weights should move.

### Why the local dim population is the payoff

**The sky gets much denser on a comparatively low star count.** Dim stars are
only visible nearby, so filling the local and adjacent voxels with them
populates exactly the sky a viewer sees, while the global pass stays small. The
gather radius for dim stars should be COMPUTED from the brightness falloff and
the sky's display floor (the distance beyond which a dim star cannot clear it),
not guessed — and that radius is the number that sets the cost.

### Nebulae, the same way

- **Big, dim nebulae** in the global pass (the galaxy-scale structure).
- **Small, slightly brighter nebulae** per voxel, generated locally.

Each from its own derived per-voxel seed. The distant galaxies and the dim
distant-star shell sit OUTSIDE the disc and stay as they are.

## Consumers

- **The skybox baker** — all bright stars + dim stars (and small nebulae) from
  voxels within the computed radius of the bake point + the distant shell.
  `SHIPPED_SKY` changes with it, and the shipped sky is rebaked.
- **The live galaxy** — bright always; dim voxels streamed near the camera, like
  terrain tiles. The vertex-shader billboarding (0.8.3) makes a mesh per voxel
  cheap.
- **Identity migration** — `getStarAt(index)` and `b3dStarSystem({ starIndex })`
  become address-based. Only the galaxy and star-system demos use them.
- **Search changes shape.** Habitability filtering mostly concerns G/K dwarfs —
  the dim population. A "find earthlike" search walks voxels lazily
  (deterministic and cheap per voxel) rather than scanning one array.

## What would falsify it

The global bright pass plus every voxel's dim pass must reproduce the sampled
distribution — spectral mix, radial profile, arm contrast — within noise. If
matching needs a special case, that case names what the model is missing.

## Build order

1. **The pure core** (Babylon-free, unit-tested): density grid (sample, smooth,
   propagate), seed derivation, per-voxel bright and dim generation, rejection
   placement. Tests pin determinism and load-order independence, no seed
   clones, the falsifier above, and that dim generation touches only the voxels
   asked for.
2. **Identity:** address-based lookups; names/details/planets on demand.
3. **Consumers:** the baker's radius gather, then the galaxy's streamed voxels.
4. **Nebulae** on the same scheme; the bulge in the sampler.
