/*#
# fall

What a fall does to a body, as pure rules: how far it drops before it reads as
falling rather than stepping down, and what the landing is.

```javascript
import { landingOutcome, fallRules } from 'tosijs-3d/fall'

const rules = fallRules(1.8, { lethalFall: 6 })
landingOutcome(1, rules)   // 'soft': the jump's own landing
landingOutcome(3, rules)   // 'hard': a heavy landing that holds you a moment
landingOutcome(7, rules)   // 'lethal': you die where you land
```

Heights are the DROP: from the highest point of the flight (the top of a
jump's arc, or the ledge you walked off) to where you land. A jump on flat
ground drops only as far as it rose, so it lands softly however it was made.

Defaults scale with the body, because a fall is a fact about the body: a
hard landing from 1.5 body heights (2.7 m for a 1.8 m person). A lethal fall
is OFF unless asked for (`lethalFall`, metres): a death needs an exit, and
only a scene with one (`<tosi-b3d-death>`) should kill.

The biped uses these (`hardLanding`, `lethalFall`); see [b3d-biped](/b3d-biped/).
*/
/*{ "parent": "b3d-biped" }*/

/** How far below the takeoff a body must be before a walk off a ledge reads as a fall. */
export const FALL_START_DROP = 0.6

export interface FallRules {
  /** Metres of drop past which a landing is hard. */
  hardLanding: number
  /** Metres of drop past which a landing kills (Infinity: never). */
  lethalFall: number
}

/**
 * The rules for a body `bodyHeight` metres tall. `hardLanding` and
 * `lethalFall` are metres; 0 (or absent) takes the default: a hard landing
 * from 1.5 body heights, and no lethal fall.
 */
export function fallRules(
  bodyHeight: number,
  options: { hardLanding?: number; lethalFall?: number } = {}
): FallRules {
  const h = bodyHeight > 0 ? bodyHeight : 1.8
  const hardLanding =
    options.hardLanding && options.hardLanding > 0
      ? options.hardLanding
      : 1.5 * h
  const lethalFall =
    options.lethalFall && options.lethalFall > 0 ? options.lethalFall : Infinity
  return { hardLanding, lethalFall }
}

export type LandingOutcome = 'soft' | 'hard' | 'lethal'

/** What a landing after dropping `drop` metres is. */
export function landingOutcome(drop: number, rules: FallRules): LandingOutcome {
  if (drop >= rules.lethalFall) return 'lethal'
  if (drop >= rules.hardLanding) return 'hard'
  return 'soft'
}
