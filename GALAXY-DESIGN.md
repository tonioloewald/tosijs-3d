# Galaxy design — a voxel galaxy with two populations

> Status: agreed with Tonio (2026-09-24). **One galaxy since 2026-09-25**
> (see "Reconciliation"). **Steps 1–2 are built** (the pure
> core in `src/voxel-galaxy.ts`, the baker, `bin/bake-stars.ts`) and the
> shipped sky was rebaked from it on 2026-09-25. Steps 3–4 are not started.
> Supersedes the "GALAXY ARCHITECTURE" TODO line.

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
removes the COST that forced it — dim stars cost only where someone is looking —
but **not the reason to keep it.** Realism is not the target (the project's
north star: behavioural richness, not photorealism). Tonio: _"A galaxy that is
just full of lifeless red dwarfs is realistic but not more interesting and you
won't be able to see most of them anyway. The dimmer red dwarfs in particular
are just not interesting to us based on current modeling (they're too
low-energy and unstable for our ideas of where life might form)."_

So the weights serve what is worth visiting, not the census:

- **Keep the skew.** The model permits a realistic mix; it does not call for one.
- **The dim population is sky TEXTURE first.** Its job is to make the local sky
  dense on a low star count. Late M dwarfs can be underweighted freely; their
  names and planets stay derivable on demand (addresses make that free) but
  nothing is spent on them unless something asks.

Tonio's working guess — **~5k bright to ~95k dim** — sits between the A and F
cuts on today's weights, or almost exactly "F and hotter" on real ones. The cut
may be spectral or by luminosity (nearly equivalent; luminosity is what
rendering cares about) — decide when building, along with how far to
underweight the late M dwarfs.

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

## Build order — the baker drives it

### What the tuning loop found (2026-09-25)

The shipped sky is **100k bright + 1M dim budget, `dimReach` 0.04, floor
0.02** — `SHIPPED_SKY.voxel`, reproduced byte-for-byte by `bun
bin/bake-stars.ts` with no flags. Of the dim budget only ~15.7k stars fall
inside the computed gather radius (0.115), which is the point: a million-star
galaxy for the price of one voxel neighbourhood.

- **~5k bright is too few for the SKY.** At 5k, 20k and 40k the Milky Way band
  loses its grain; 100k restores it. The 5k guess still reads right for what a
  live galaxy view needs to show at once — the two consumers want different
  bright budgets, and that is fine: it is a dial, not a constant.
- **The local dim stars are the win** — an all-sky sprinkle the old bake never
  had ("OUTSTANDINGLY improved. Far more stars").
- **The band is broader than the old bake's**, because vertical cells (0.03 at
  `nz` 20 over ±0.3) are thicker than the disc near the bake point (~0.017).
  `--nz`/`--halfz` is the dial if it ever needs sharpening.

### Where habitable worlds live — why the live galaxy must stream dim voxels

Measured on `generateGalaxy(1234, 100000, { generatePlanets: true })`, systems
by best HI:

| class | HI 1 | HI 2 | HI 3  |
| ----- | ---- | ---- | ----- |
| A     | 22   | 208  | 1117  |
| B     | 3    | 85   | 247   |
| F     | 62   | 787  | 4732  |
| G0–5  | 252  | 2144 | 7624  |
| G6–9  | 127  | 1405 | 5172  |
| K     | 207  | 2394 | 17455 |
| M     | 0    | 0    | 277   |

**Half the earthlike systems (334 of 673) are in the DIM population.** So a
live galaxy that showed only the bright pass would silently halve what an HI
filter finds. Its HI filter must cover the bright pass globally, the streamed
dim voxels locally, and a "find earthlike anywhere" search walks voxels lazily
(see Consumers). M dwarfs contribute nothing above HI 3, which is the case for
underweighting them. Until step 4, `b3d-galaxy` stays on `generateGalaxy`, so
its filter is unchanged.

**The point of the whole design is generating the local dim stars RELATIVE TO
THE BAKE CAMERA** (Tonio). The sky is where the dense local population is
seen; the live galaxy's dim streaming is secondary and can come later. So the
first deliverable is exactly what the baker needs:

1. **The pure core, shaped by that query.** Density grid (sample, smooth,
   propagate), seed derivation, the global bright pass, and
   `dimStarsNear(point, radius)` — the dim stars of every voxel within
   `radius` of `point`, placed by rejection. Babylon-free, unit-tested:
   determinism and load-order independence, no seed clones, the falsifier
   above, and that a query touches only the voxels within its radius.
2. **The baker.** `starsFromGalaxy` gathers bright + `dimStarsNear(bakePoint,
R)` + the distant shell, with R computed from the brightness falloff and the
   display floor. `SHIPPED_SKY` gains the new parameters; the shipped sky is
   rebaked.
3. **Identity:** address-based lookups; names/details/planets on demand.
4. **Later:** the live galaxy streaming dim voxels near its camera; nebulae on
   the same scheme; the bulge in the sampler.

## Reconciliation — ONE galaxy (2026-09-25)

Tonio: _"we should use ONE galaxy implementation … reconcile the galaxies
around the new voxel implementation."_ Today there are two: `generateGalaxy`
(one sequential stream: stars, then nebulae, then the distant shell) and
`voxelGalaxy` (which SAMPLES `generateGalaxy` for its density). Every consumer
but the shipped sky still reads the old one: `b3d-galaxy`, `b3d-star-system`,
the skybox-baker demo, and `bin/bake-stars`'s shell.

### What survives of the old generator

**The spiral MODEL survives; the sequential GENERATOR does not.** The
spiral-Gaussian position model is exactly what the density grid is sampled
from, so it stays as `sampleSpiral(seed, n)`, which returns positions only
(no names, no details). It consumes the SAME random draws as the old star
loop, so the density grid, and therefore the shipped sky, is byte-identical
across the change. That is the check that the refactor moved code rather than
changed a galaxy.

### What moves onto derived seeds

Nebulae, distant galaxies and the distant-star shell stop being "whatever the
stream produces after the stars". Each gets its own derived seed
(`hash32(seed, stream)`), so they no longer depend on the star count, which
was a latent coupling (`bin/bake-stars` had to regenerate 100k old stars just
to reach the shell). This DOES change the nebula half of the shipped sky:
same distributions, different draws. The 0.8.4 pinned folder is unreleased,
so it is rebaked and eyeballed rather than versioned again.

### One view for every consumer

`galaxy.view({ near?, radius? })` returns the `GalaxyData` shape the
consumers already read: every bright star, the dim stars within `radius` of
`near` (none if no point is given), the nebulae and the shell. Stars gain their
`id` (address) and a name derived from their own seed, as the old generator
did. Consumers keep working; the source changes underneath them.

- **`generateGalaxy(seed, count, opts)`** becomes a deprecated ADAPTER over
  the voxel galaxy (`count` is the bright budget), removed in 0.9. There is
  one implementation behind both names.
- **`b3d-galaxy`**: `starCount` becomes the bright budget. It gains
  `getStar(id)`; `getStarAt(index)` stays, as an index into the loaded view.
  Its HI filter covers what is loaded. Streaming dim voxels near the camera
  (step 4) is what brings the other half of the earthlike systems in; until
  then the filter finds the bright half, and the docs say so.
- **`b3d-star-system`** gains `star` (an address); `starIndex` stays, as an
  index into the same view.
- **The baker**: `starsFromGalaxy(GalaxyData)` keeps working, because a view
  IS `GalaxyData`; the demo page and `bin/bake-stars` read one galaxy.
- **Tests**: the `galaxy-data` digests pinned the old stream, which no longer
  produces anything shipped. They are replaced with digests of the new view
  and `sampleSpiral`.

### Where it stands (2026-09-25)

**Done, steps 1–4.** One implementation; the consumers read the voxel galaxy.
Addresses became `seed:population:voxel:n` on Tonio's point: galaxy seed,
population, voxel and SEQUENCE number (not the derived seed). Star _n_ never
reads the count, so an address resolves in a galaxy computed with a smaller
budget. The shipped sky was rebaked by `bin/bake-stars` + `bin/bake-nebula`,
and the two halves are checked to come from the same galaxy.

**Still open:** streaming dim voxels near the camera in `b3d-galaxy` (the
other half of the earthlike systems), and the "ellipsoid columns" TODO,
which now has one generator to look in.

### Order

1. `sampleSpiral`; the voxel density reads it. Prove the shipped sky is
   byte-identical.
2. Nebulae and the shell on derived seeds, inside the voxel galaxy; `view()`.
3. `generateGalaxy` becomes the adapter; consumers move to the view.
4. Rebake and eyeball the nebula half; update the digests; record in the
   changelog as a visible change (every seeded galaxy looks different).

## Interesting stars — the dim population, filtered for habitability (proposal)

Tonio (2026-09-25): bias dim-star generation toward systems worth visiting,
so the galaxy is "an entire galaxy whose stars are EITHER bright OR
interesting", and generate the BORING ones locally, purely as background, by
flipping the rule. A HARNESS learns the bias from the real generation rules
and the real HI algorithm, so refining HI (geological age, weather, radiation)
means rerunning the harness, not rebuilding the galaxy.

### The threshold is HI ≤ 2

HI 3 ("EVA possible") has no atmosphere requirement. It is anything not
crushing, not over 3 g, and between −150 and 150 °C, which includes the Moon
and Mars. Tonio: _"Almost any star system with planets, especially if we start
generating moons, is going to have a ball of rock someone can plant a flag
on."_ HI ≤ 3 covered 94% of G5–9 systems, so it measures "has somewhere to
stand", not "interesting". **Interesting = HI ≤ 2** (a breathable or filterable
atmosphere, under 2 g, not extreme).

### Measured (60k dim stars, 2026-09-25)

| class | HI ≤ 2 | HI ≤ 3 |
| ----- | ------ | ------ |
| G5–9  | 20.8%  | 94.1%  |
| K0–4  | 12.9%  | 82.1%  |
| K5–9  | 6.6%   | 66.5%  |
| M     | 0%     | ~0.5%  |
| all   | 5.2%   | 34.2%  |

**Class sets the odds; nothing finishes the job.** Within a class, HI does not
depend on planet count (K: ~74% at every count from 1 to 9). It is the system's
own draw. So the learned bias is a spectral MIX weighted by pass rate, and
each interesting star is still VERIFIED: candidate `c` of star `k` is seeded
`hash(voxelSeed, k, c)`, drawn from the mix, and the first that passes is the
star. That is deterministic, so addresses survive.

**Cost.** Scoring a system took 70 µs, almost all Mersenne Twister
construction (one per planet). PRNG now runs on xoshiro128\*\*: **6.5 µs**. At
roughly 8 candidates per interesting star, 20k interesting stars take about a
second, so the global pass can be eager again.

### The harness

`bin/tune-populations.ts`: build a corpus per spectral cell, score it with the
real `generateStarSystem` + HI, and write a GENERATED pass-rate table. A
freshness test fingerprints HI on a fixed probe set and fails when the
algorithm has drifted from the table ("rerun the harness").

### Open (Tonio's call)

- **The boring population, exact or statistical?** Exact verifies every
  background star fails the rule (~0.1 s per neighbourhood at 6.5 µs).
  Statistical draws from the boring mix unchecked, so a clicked star might
  score well.
- **Address churn.** Refining HI changes which candidates pass, so some
  interesting addresses will point at different stars. Stars that still pass
  are unchanged. The alternative is a rule version in the address.
