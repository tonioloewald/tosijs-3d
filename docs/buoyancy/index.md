# buoyancy

**Falling in water is not falling in air.** The pure vertical model behind the
biped's swimming: how fast a body sinks, why it comes back up, and where it
settles. Babylon-free, deterministic, unit tested.

## Why a model rather than a constant

The obvious version — "use a smaller gravity underwater" — sinks you forever,
just slowly. What actually happens is that a body is slightly **less dense than
water**, so it is pushed up in proportion to how much of it is submerged, and it
comes to rest at the depth where that push balances its weight. That is one
equation, and everything readable falls out of it for free:

- Drop in from a height and you plunge, decelerate hard, and **bob back up**.
- Settle and your head is out of the water, because equilibrium is at partial
  submersion — not because anything targets a head height.
- Wade in from a beach and nothing happens until the water is deep enough to
  lift you, because the push scales with submersion.

Aiming at a target depth instead would have to special-case every one of those.

## The numbers, and what they mean

`buoyancy` is the ratio of the upward push at FULL submersion to weight. Above 1
you float, and the equilibrium submersion is `1 / buoyancy` — so the default
`1.15` rests with about 87% of you under, which is roughly a person treading
water. Below 1 you sink forever, which is the honest way to model armour, and
`waterDrag` then sets how fast.

Drag is quadratic, so terminal speed is `sqrt(|a| / drag)` — the default gives
about 1.5 m/s sinking, an order slower than the ~20 m/s of a fall through air.
Slow enough to see, fast enough not to feel broken.
