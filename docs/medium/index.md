# medium

**What is this stuff, where does it end, and how far in am I?** A pure,
Babylon-free description of the *substance* a thing is moving through — air,
water, vacuum, liquid mercury — and the boundary between one and the next.

It answers three questions and does nothing else:

- **how deep** am I in it (`depthIn`)
- **how much** of me is in it (`submergence`, smoothed across a band)
- **did I just cross** its surface (`crossing`)

Everything else — drag, fog, buoyancy, the splash, the regime switch — is the
CALLER's business. This module owns no rendering, no physics and no Babylon
types, so it can be unit-tested and shared by the water, the projectiles, the
vehicles and the shader without any of them depending on each other.

```javascript
import { medium } from 'tosijs-3d'

const sea = medium.plane({ name: 'water', y: 0, band: 0.4, drag: 40, maxSpeed: 12 })

const w = medium.submergence({ x: 0, y: -3, z: 0 }, sea) // 1 — fully under
const c = medium.crossing({ x: 0, y: 2, z: 0 }, { x: 0, y: -1, z: 0 }, sea)
// → 'entered'  (the splash, the whiteout, the regime change: yours to dress)
```

## Two geometries, because there are two real cases

- **`plane`** — a horizontal surface at some `y`. A sea, a fog bank, a smoke
  layer, the top of a mercury vat. Inside is below.
- **`sphere`** — a shell around a centre. A planet's ocean, its atmosphere, the
  edge of space. Inside is within `radius`.

A plane is *not* modelled as a very large sphere. It could be, and it would be
worse: at a 6371 km radius the arithmetic loses the centimetres that decide
whether you are above or below a wave, and every flat scene would pay for a
planet it does not have.

## Stacking: space → air → water

Media nest, and `innermost` picks the one you are actually in — the deepest
match in the list, so an ocean inside an atmosphere inside vacuum resolves the
way you would say it out loud. Nothing here blends *properties* between media;
a caller that wants "half in, half out" has `submergence` for exactly that,
which is the same band-weight the fog compositor already uses (see
[[b3d-fog]]) so a surface crossing looks like one event rather than three
subsystems changing their minds at slightly different depths.

## Why a band and not a plane

A hard boundary produces the "thunk": the shader recompiles, the fog jumps, the
drag doubles between one frame and the next. `band` is the thickness over which
the transition happens (metres), smoothstepped — tight enough that entering
water is *obvious*, wide enough that it is not a discontinuity. Tuned from
[[b3d-water]]'s `fogTransition`, which learned this the hard way.
