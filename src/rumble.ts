/*#
# rumble

**A buzz in the player's hands when something happens to them.** One call
shakes whatever they are holding: a gamepad's two motors (the strong, low one
and the weak, high one) or a headset's controllers.

```javascript
// from any scene child, once it has an owner
owner.rumble('hit')                              // a named effect
owner.rumble({ strong: 0.8, weak: 0.3, ms: 200 }) // or your own
owner.rumble('shot', 'right')                    // one hand, in a headset
```

The biped rumbles when it is the player and is hurt, lands hard, dies from a
fall or lands a blow; a vehicle when it hits something; the pad's UI focus
gives a small tick each time it moves. `<tosi-b3d rumble-strength="0">`
turns it off for a scene (and `0.5` halves it).

## Effects

| name | strong | weak | ms | for |
| --- | --- | --- | --- | --- |
| `tick` | 0 | 0.25 | 25 | the UI focus moving |
| `shot` | 0.3 | 0.6 | 60 | firing |
| `blow` | 0.5 | 0.4 | 80 | a melee blow landing |
| `hit` | 0.7 | 0.5 | 150 | being hurt |
| `landing` | 0.8 | 0.3 | 180 | a hard landing |
| `crash` | 1 | 0.8 | 350 | a crash, or a fall that kills |

## Where it works

A pad rumbles through the Gamepad API's `vibrationActuator` (Chrome, Edge
and Safari; Firefox does not offer it by default). A headset's controllers
buzz through WebXR (`pulse` on each controller), which has one motor, so it
takes the larger of the two. Anywhere else nothing happens and nothing
fails.
*/
/*{ "parent": "input" }*/

/** Two motors, 0…1 each, for `ms` milliseconds. */
export interface RumbleEffect {
  strong: number
  weak: number
  ms: number
}

export const RUMBLE = {
  tick: { strong: 0, weak: 0.25, ms: 25 },
  shot: { strong: 0.3, weak: 0.6, ms: 60 },
  blow: { strong: 0.5, weak: 0.4, ms: 80 },
  hit: { strong: 0.7, weak: 0.5, ms: 150 },
  landing: { strong: 0.8, weak: 0.3, ms: 180 },
  crash: { strong: 1, weak: 0.8, ms: 350 },
} satisfies Record<string, RumbleEffect>

export type RumbleName = keyof typeof RUMBLE

const clamp01 = (x: number) => Math.max(0, Math.min(1, Number(x) || 0))

/**
 * The effect to play: a name or an effect, scaled by `strength` (0 is off),
 * each motor kept within 0…1. Null when there is nothing to feel.
 */
export function rumbleEffect(
  effect: RumbleName | RumbleEffect,
  strength = 1
): RumbleEffect | null {
  const e = typeof effect === 'string' ? RUMBLE[effect] : effect
  if (e == null) return null
  const k = Math.max(0, Number(strength) || 0)
  const out = {
    strong: clamp01(e.strong * k),
    weak: clamp01(e.weak * k),
    ms: Math.max(0, Math.round(Number(e.ms) || 0)),
  }
  return out.ms > 0 && (out.strong > 0 || out.weak > 0) ? out : null
}

/** What a headset's one motor gets: the larger of the two. */
export function oneMotor(effect: RumbleEffect): number {
  return Math.max(effect.strong, effect.weak)
}

/**
 * Rumble every connected gamepad that can. Returns how many were asked.
 */
export function rumblePads(effect: RumbleEffect): number {
  const pads =
    typeof navigator !== 'undefined' && navigator.getGamepads
      ? navigator.getGamepads()
      : []
  let n = 0
  for (const gp of pads ?? []) {
    const act = (gp as any)?.vibrationActuator
    if (act?.playEffect == null) continue
    n++
    void Promise.resolve(
      act.playEffect('dual-rumble', {
        startDelay: 0,
        duration: effect.ms,
        strongMagnitude: effect.strong,
        weakMagnitude: effect.weak,
      })
    ).catch(() => false)
  }
  return n
}
