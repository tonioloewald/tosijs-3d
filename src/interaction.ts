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

/** Where a gesture currently is. */
export type InteractPhase = 'idle' | 'hover' | 'press'

export interface InteractState {
  phase: InteractPhase
  /** True while a press that STARTED on this thing is still live. */
  armed: boolean
}

export const newInteractState = (): InteractState => ({
  phase: 'idle',
  armed: false,
})

export interface InteractInput {
  /** Is the pointer/ray currently on this thing? */
  over: boolean
  /** Is the button/trigger held? */
  down: boolean
  /** Close enough to touch. `true` when the thing has no reach limit. */
  withinReach?: boolean
  /** `false` disables it entirely — see the rule about mid-gesture. */
  enabled?: boolean
}

export interface InteractResult {
  state: InteractState
  /** Hover began this step (for highlight on). */
  entered: boolean
  /** Hover ended this step (for highlight off). */
  exited: boolean
  /** A completed press-then-release ON the thing. */
  activated: boolean
}

/**
 * Advance one interaction step. Pure: same inputs, same outputs, no clock.
 *
 * Returns the next state rather than mutating, so a caller can test a rule
 * without owning an element — and so the rules stay inspectable.
 */
export function interactStep(
  state: InteractState,
  input: InteractInput
): InteractResult {
  const enabled = input.enabled ?? true
  const reachable = input.withinReach ?? true
  const live = enabled && reachable
  const over = live && input.over

  const wasHovering = state.phase !== 'idle'

  // Disabled or out of reach drops everything, including a press in flight —
  // a door that locks under your finger must not open.
  if (!live) {
    return {
      state: newInteractState(),
      entered: false,
      exited: wasHovering,
      activated: false,
    }
  }

  let phase: InteractPhase = over ? 'hover' : 'idle'
  let armed = state.armed
  let activated = false

  if (input.down) {
    // Arm only if the press STARTED on this thing.
    if (!state.armed && over && state.phase === 'hover') armed = true
    if (armed) phase = 'press'
  } else {
    // Release: it counts only if the pointer is still on the thing.
    if (state.armed && over) activated = true
    armed = false
    phase = over ? 'hover' : 'idle'
  }

  return {
    state: { phase, armed },
    entered: !wasHovering && phase !== 'idle',
    exited: wasHovering && phase === 'idle',
    activated,
  }
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
 *
 * ## A veto is TOLD about the activation
 *
 * `blocks(info)` receives the same description the `refused` event carries —
 * who activated it, how (a pointer, a hand within reach, `useNearest`, an API
 * call), and how far away they were. Without it a veto can only close over
 * ambient state, which breaks the moment there is more than one actor:
 *
 * - **two actors.** An NPC opening a door it has the key for while the player
 *   does not. One closure over `player.has(…)` cannot answer for both.
 * - **near versus far.** The same door reached by a hand at 0.4 m and by a ray
 *   at 8 m may want different answers — a lock you can reach is not a lock you
 *   can merely see — and a veto with no argument cannot tell which happened.
 *
 * Raised by `tosijs-3d-ensemble` (#36) with the observation that decided it:
 * it costs nothing today and cannot be added later without changing every veto
 * anyone has written. A veto that ignores its argument is still a veto, so
 * `blocks: () => !hasKey` is unaffected.
 */
export interface ActivationVeto<Info = unknown> {
  name: string
  /**
   * Refuse this activation?
   *
   * `info` describes THIS activation — who, how, and how far — and a veto that
   * ignores it is still a valid veto, so `blocks: () => !hasKey` keeps working.
   */
  blocks: (info: Info) => boolean
}

/**
 * What a veto is told when the caller knows nothing about the activation.
 *
 * `distance: Infinity` rather than `{}`, and the difference is the whole point.
 * An empty object gives a reach veto `undefined > 2` — **false**, so the door
 * opens — which is precisely the fail-open the pre-release review caught. An
 * unknown distance has to read as "we do not know that you are near", so a
 * reach veto refuses and the caller has to say what it means.
 *
 * Measured against the three veto shapes this library documents:
 *
 * ```
 *                          reach    actor    legacy
 *   {}                     false    true     true     ← fails open
 *   {distance: Infinity}   true     true     true
 * ```
 */
export const UNKNOWN_ACTIVATION: { distance: number } = { distance: Infinity }

/**
 * `info` is OPTIONAL, which is what keeps this from being a source break.
 *
 * It was briefly required, and a required second parameter on a
 * barrel-exported function is a hard TypeScript break for every consumer
 * calling `activationVeto(vetoes)`. It does not need to be: a veto that ignores
 * its argument — every veto written before this existed — is unaffected by the
 * default, and a veto that reads one gets a conservative answer instead of a
 * permissive one.
 */
export function activationVeto<Info>(
  vetoes: Array<ActivationVeto<Info>>,
  info: Info = UNKNOWN_ACTIVATION as Info
): string | null {
  for (const v of vetoes) {
    if (v.blocks(info)) return v.name
  }
  return null
}

/**
 * Is a point close enough to touch? `maxDistance <= 0` means no limit.
 *
 * Squared comparison, because this runs per interactive object per frame and a
 * square root buys nothing when only the comparison matters.
 */
export function withinReach(
  from: { x: number; y: number; z: number },
  to: { x: number; y: number; z: number },
  maxDistance: number
): boolean {
  if (maxDistance <= 0) return true
  const dx = to.x - from.x
  const dy = to.y - from.y
  const dz = to.z - from.z
  return dx * dx + dy * dy + dz * dz <= maxDistance * maxDistance
}
