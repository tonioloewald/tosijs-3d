# interaction

**The rules for touching a thing** — the pure half of [b3d-interactive](?b3d-interactive.ts).
Babylon-free, deterministic, unit tested, so what counts as "you used it" can be
argued about without a scene.

## Why this exists

tosijs-3d could shoot things long before it could *touch* one. `b3d-button` is a
floating Babylon GUI widget, not world geometry you reach for, so doors, knobs,
switches, levers and consoles had no substrate — the gap
[tosijs-3d-ensemble](https://github.com/tonioloewald/tosijs-3d-ensemble) named
as _"almost nothing for building a PLACE, as opposed to a battle"_ (#36).

## The rules, and why each is a rule

- **Activation is press-then-release ON the thing.** Not press. A press you
  drag off and release elsewhere is a *cancelled* press, which is how every
  real button behaves and how anyone recovers from touching the wrong thing.
  In a headset, where your aim wanders, this matters more rather than less.
- **Reach is part of the rule, not decoration.** A knob across the room should
  not be operable because your ray happens to land on it. Out of reach behaves
  exactly like not-over: no hover, no activation.
- **Disabled means disabled, mid-gesture too.** A press in flight is dropped if
  the thing is disabled under you — otherwise a door that locks while you are
  pressing it still opens.
- **Vetoes are consulted at ACTIVATION, not at hover.** A locked door still
  highlights and still reports being used; it just does not open. That is what
  lets `lockable` and `interactive` compose on the same piece instead of one
  knowing about the other (ensemble's `ctx.feature()` finding).
