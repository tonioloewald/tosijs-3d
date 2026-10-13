# wreck-fall

**A dead aircraft falls.** The pure model behind `b3d-death`'s wreckage: a
tumbling ballistic descent, an impact, a skid, and a rest. Babylon-free,
deterministic, unit tested — the same discipline as `fly-by-wire` and
`ballistics`, whose `ballisticStep` does the translation here rather than a
second copy of gravity.

## Why this exists

A wreck used to stop dead at the point of death and hang in the air. Tonio, from
a headset: _"I collided with wreckage high up … the wrecked plane hanging in
mid-air (it should really tumble to the ground)."_ Hanging wreckage is worse than
untidy — it is a **solid object in the sky**, so the debris of one death becomes
the cause of the next.

It is also the cheapest possible piece of the north star: the unit of progress is
a watchable behaviour, and a plane that comes apart, tumbles, slams in and slides
to a stop is one, for the price of eleven lines of integration.

## The rules

- **The spin is DERIVED, never random.** Axis from the velocity — a craft
  tumbles end-over-end about the axis across its flight path — and rate from
  speed. So a fast crash windmills, a stall drops flat, and the same crash looks
  the same twice, which matters for a scenario you are trying to tune.
- **It bounces once, badly.** Real wreckage does not stick where it lands; it
  slams, hops, and slides. The hop is small and the skid decays, so it settles
  quickly rather than skating away.
- **It stops for good.** Below a threshold it is `grounded` and stays there —
  no infinite micro-bouncing, and the caller can stop stepping it entirely.

## Ground is passed IN, not sampled here

The caller raycasts (that is a scene concern) and hands over a `groundY`. Which
also means a caller holding the wreck's position on a NODE can copy it in and
out each frame, so a floating-origin rebase is absorbed for free — the model
never holds a world position across a shift.
