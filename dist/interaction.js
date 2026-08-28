/*#
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
*/
/*{ "parent": "World Sim" }*/
export const newInteractState = () => ({
    phase: 'idle',
    armed: false,
});
/**
 * Advance one interaction step. Pure: same inputs, same outputs, no clock.
 *
 * Returns the next state rather than mutating, so a caller can test a rule
 * without owning an element — and so the rules stay inspectable.
 */
export function interactStep(state, input) {
    const enabled = input.enabled ?? true;
    const reachable = input.withinReach ?? true;
    const live = enabled && reachable;
    const over = live && input.over;
    const wasHovering = state.phase !== 'idle';
    // Disabled or out of reach drops everything, including a press in flight —
    // a door that locks under your finger must not open.
    if (!live) {
        return {
            state: newInteractState(),
            entered: false,
            exited: wasHovering,
            activated: false,
        };
    }
    let phase = over ? 'hover' : 'idle';
    let armed = state.armed;
    let activated = false;
    if (input.down) {
        // Arm only if the press STARTED on this thing.
        if (!state.armed && over && state.phase === 'hover')
            armed = true;
        if (armed)
            phase = 'press';
    }
    else {
        // Release: it counts only if the pointer is still on the thing.
        if (state.armed && over)
            activated = true;
        armed = false;
        phase = over ? 'hover' : 'idle';
    }
    return {
        state: { phase, armed },
        entered: !wasHovering && phase !== 'idle',
        exited: wasHovering && phase === 'idle',
        activated,
    };
}
/**
 * May this activation proceed? The composition seam.
 *
 * Each veto is another feature on the SAME piece answering "not while I say
 * so" — `lockable` is the obvious one. Vetoes run at activation rather than at
 * hover deliberately: a locked door should still highlight, and should still
 * report that you tried, because "it did not budge" is feedback and silence is
 * a bug report.
 *
 * Returns the first refusal's reason, so a caller can say WHY rather than
 * merely doing nothing — the difference between a locked door and a broken one.
 */
export function activationVeto(vetoes) {
    for (const v of vetoes) {
        if (v.blocks())
            return v.name;
    }
    return null;
}
/**
 * Is a point close enough to touch? `maxDistance <= 0` means no limit.
 *
 * Squared comparison, because this runs per interactive object per frame and a
 * square root buys nothing when only the comparison matters.
 */
export function withinReach(from, to, maxDistance) {
    if (maxDistance <= 0)
        return true;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dz = to.z - from.z;
    return dx * dx + dy * dy + dz * dz <= maxDistance * maxDistance;
}
//# sourceMappingURL=interaction.js.map