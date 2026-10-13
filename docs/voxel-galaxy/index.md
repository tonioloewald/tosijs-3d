# voxel-galaxy

**A galaxy as a grid of voxels, each with two derived seeds** — one for its
BRIGHT stars, one for its DIM stars. The bright pass is global (the stars you
can see across the galaxy); the dim pass is local, generated only for the
voxels near something that is looking — above all, the skybox baker's camera.
Design and reasoning: `GALAXY-DESIGN.md`.

Pure: no Babylon, no DOM, deterministic. Positions are in the same frame as
[galaxy-data](?galaxy-data.ts) (z-up, the disc's radius ≈ 0.9), so a consumer
applies the transform it always has.

```javascript
import { voxelGalaxy } from 'tosijs-3d/voxel-galaxy'

const galaxy = voxelGalaxy({ seed: 1234 })
const bright = galaxy.brightStars()                     // ~5k, the whole galaxy
const local = galaxy.dimStarsNear({ x: 0.5, y: 0, z: 0.01 }, 0.08)
// Same query, any time, any order: the same stars, with the same addresses.
```

## What it guarantees

- **Identity is an address**, `seed:population:voxel:n` (galaxy seed,
  bright/dim, voxel, sequence number), and a star's seed is derived from it —
  never drawn from a shared range. Star n never depends on the budget, so an
  address resolves in a galaxy computed with a SMALLER one (`galaxy.star(id)`). (The generator this replaced, `generateGalaxy`, removed in 0.10, drew
  seeds from `range(1, 100000)`, so at 100k stars 63% of them shared one.)
- **Determinism and locality.** A voxel's stars depend only on the galaxy seed
  and the voxel. Generating one voxel never requires another, and loading them
  in any order gives the same stars.
- **Every voxel has a non-zero budget.** Density is sampled from the current
  spiral generator, lightly smoothed, and extended to every empty voxel by a
  distance falloff with a PINNED share — so the fringe is a dial, not a side
  effect, and the arms keep their contrast.
- **The grid does not show.** Stars are placed by rejection against the density
  interpolated between voxel centres, not uniformly within their voxel.

## Options

| option | default | |
| --- | --- | --- |
| `seed` | — | Galaxy seed: shapes the density AND derives every voxel's seeds |
| `brightBudget` | `5000` | Stars in the global pass |
| `dimBudget` | `95000` | Stars across all voxels' dim passes — most are never generated |
| `samples` | `100000` | Positions drawn from the spiral model (`sampleSpiral`) to impute the density |
| `galaxyOptions` | `{}` | Passed to the sampler (`spiralArms`, `thickness`, …) |
| `nx` | `64` | Grid resolution across the disc (x) |
| `ny` | `64` | Grid resolution across the disc (y) |
| `nz` | `60` | Grid resolution through the disc (z). Must resolve the disc's thickness: at 20 a layer (0.03) was as thick as the disc itself, so stars sat in flat slabs with hard edges, read as columns at 1M stars |
| `halfXY` | `1.05` | Grid half-extent across the disc |
| `halfZ` | `0.3` | Grid half-extent through the disc — room for a halo |
| `smoothPasses` | `1` | Blur passes over the sampled histogram (calms sparse voxels) |
| `fringeShare` | `0.02` | Share of the budget spread across EMPTY voxels |
| `fringeFalloff` | `3` | Falloff length for the fringe, in voxels |
| `brightMix` | O–G5 | The bright population's spectral mix — the bright/dim cut is here |
| `dimMix` | G6–M | The dim population's spectral mix — underweight late M freely |
