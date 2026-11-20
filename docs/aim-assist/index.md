# aim-assist

**Aiming a stick at a person**, two helpers. Pure: plain `{x, y, z}`.

- `stickCurve(v, expo)`: a stick's deflection shaped so small movements are
  small. `expo` 1 is linear; 2 (the biped's default while aiming) turns at a
  quarter of the rate at half deflection and the same rate at full, so a
  nudge fine-tunes and a shove still swings round.
- `aimFriction(origin, dir, targets, strength)`: how much to slow the aim, as
  a factor on its rate (1 is no change). It is `1 - strength` while the aim
  line passes within a target's radius, easing back to 1 at three times that,
  so the sight drags across a person rather than skating off them. It never
  moves the aim: that is the player's.

- `stickyAim(lock, input)`: the aim STICKS to a target. Sweeping near one
  (within `capture`) with the stick below `breakout` locks onto it: from
  then the aim follows the target as it, or you, move, and the stick slides
  the aim slowly across it (`fineDegPerSec`, to put it on the head). Push the
  stick past `breakout` and it lets go and swings freely; slide past
  `release` and it lets go too. A fresh lock caught near the edge eases onto
  the body (no snap); touching the stick stops that, so an aim you put on
  the head stays there.

The biped uses them in gunplay (`aimCurve`, `aimAssist`, `aimBreakout`).
