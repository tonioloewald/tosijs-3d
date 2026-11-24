/*
GAIT, pure: which forward clip the biped plays at a speed. Babylon-free so
the hysteresis is testable (0.11 gate, #3422).

`speed` is the stick's forward amount, `sprint` the share of it that is
running (`speed * sprint input`). The jog is the run up to near full speed;
past it the rig's own sprint, if it has one, held until the speed drops back
a little, so an analog trigger near the line does not flicker between them.

`PACES` are what clicking the left stick cycles (GTA VI's walk, jog, run):
the share of running pushing forward gives with no trigger held.
*/

export type Pace = 'walk' | 'jog' | 'run'
export const PACES: readonly Pace[] = ['walk', 'jog', 'run']

/** The share of running a pace gives: walk none, jog half, run all. */
export function paceShare(pace: string): number {
  return pace === 'run' ? 1 : pace === 'jog' ? 0.5 : 0
}

/** The pace after this one (run goes back to walk). */
export function nextPace(pace: string): Pace {
  const i = PACES.indexOf(pace as Pace)
  return PACES[(i + 1) % PACES.length]
}

/** Start sprinting above this share of full speed… */
export const SPRINT_ENTER = 0.8
/** …and keep sprinting until below this one. */
export const SPRINT_LEAVE = 0.7

export interface ForwardGait {
  state: 'sprint' | 'run' | 'walk'
  /** The clip's speed ratio. */
  scale: number
  /** Pass back as `wasSprinting` next frame. */
  sprinting: boolean
}

export function forwardGait(
  speed: number,
  sprintSpeed: number,
  wasSprinting: boolean,
  hasSprint: boolean
): ForwardGait {
  const at = wasSprinting ? SPRINT_LEAVE : SPRINT_ENTER
  const sprinting = hasSprint && sprintSpeed > at
  if (sprinting) return { state: 'sprint', scale: sprintSpeed, sprinting }
  if (sprintSpeed > 0.25) {
    return { state: 'run', scale: sprintSpeed + 0.25, sprinting }
  }
  return { state: 'walk', scale: speed + 0.25, sprinting }
}
