/*#
# melee stroke

**A sword stroke you can cut short or chain.** A swing that must play to its
last frame before the next one makes you wait through a follow-through that
does nothing. So a press during a stroke is read by where the stroke is
(`progress`, 0 to 1), with three tunable marks:

- before **`restartBefore`** (default 0.1): the stroke is cancelled and
  starts again, so a double press is one swing, not two;
- from **`chainFrom`** (default 0.9): a new stroke starts at once;
- from **`queueFrom`** (default 0.8) up to `chainFrom`: a follow-up is
  queued and starts when the stroke reaches `chainFrom`;
- in between, the press is ignored: the stroke is committed.

Holding the trigger chains too: a held stroke starts the next at `chainFrom`.
The blow lands once per stroke, when it passes **`hitAt`** (default 0.4); a
stroke cancelled before then never lands.

`strokeStep(state, input, rules)` is the whole clock, pure: the biped feeds
it the trigger and the frame's step, and plays a new stroke when it says
`start`, deals the blow when it says `hit`. `meleeTargets` picks what a blow
reaches: within `reach` metres and `arc` degrees of the way the swinger
faces, nearest first.
*/
/*{ "parent": "b3d-biped" }*/

/** Where in a stroke a press restarts, queues or chains (fractions, 0 to 1). */
export interface StrokeRules {
  restartBefore: number
  queueFrom: number
  chainFrom: number
  /** When the blow lands. */
  hitAt: number
}

export const STROKE_RULES: StrokeRules = {
  restartBefore: 0.1,
  queueFrom: 0.8,
  chainFrom: 0.9,
  hitAt: 0.4,
}

/** What a press during a stroke does. */
export type StrokePress = 'start' | 'restart' | 'queue' | 'chain' | 'ignore'

/** What a press does at `progress` (null: no stroke playing). */
export function strokePress(
  progress: number | null,
  rules: StrokeRules = STROKE_RULES
): StrokePress {
  if (progress == null || progress >= 1) return 'start'
  if (progress < rules.restartBefore) return 'restart'
  if (progress >= rules.chainFrom) return 'chain'
  if (progress >= rules.queueFrom) return 'queue'
  return 'ignore'
}

export interface StrokeState {
  /** Seconds into the stroke playing, or null between strokes. */
  t: number | null
  /** The stroke's length in seconds. */
  duration: number
  queued: boolean
  landed: boolean
  /** Was the trigger down last frame (a press is its edge). */
  held: boolean
}

export const idleStroke = (): StrokeState => ({
  t: null,
  duration: 1,
  queued: false,
  landed: false,
  held: false,
})

export interface StrokeInput {
  trigger: boolean
  dt: number
  /** The clip's length, read when a stroke starts. */
  duration: number
}

export interface StrokeOutcome {
  state: StrokeState
  /** A new stroke starts this frame (play the clip from its start). */
  start: boolean
  /** The blow lands this frame. */
  hit: boolean
}

/** Advance a stroke by one frame. */
export function strokeStep(
  s: StrokeState,
  input: StrokeInput,
  rules: StrokeRules = STROKE_RULES
): StrokeOutcome {
  const pressed = input.trigger && !s.held
  let { t, duration, queued, landed } = s
  let start = false
  let hit = false
  if (t != null) {
    t += input.dt
    if (!landed && t >= duration * rules.hitAt) {
      landed = true
      hit = true
    }
    if (t >= duration) t = null
  }
  const progress = t == null ? null : t / duration
  if (pressed) {
    const what = strokePress(progress, rules)
    if (what === 'queue') queued = true
    else if (what !== 'ignore') start = true
  }
  // A queued follow-up, or a held trigger, goes at the chain mark.
  if (
    !start &&
    (queued || input.trigger) &&
    (progress == null ? queued || input.trigger : progress >= rules.chainFrom)
  )
    start = true
  if (start) {
    t = 0
    duration = input.duration > 0 ? input.duration : 1
    queued = false
    landed = false
  }
  return {
    state: { t, duration, queued, landed, held: input.trigger },
    start,
    hit,
  }
}

export interface MeleeCandidate<T> {
  item: T
  x: number
  z: number
}

/**
 * What a blow from (x, z), facing `headingDeg` (0 = +z, 90 = +x), reaches:
 * within `reach` metres and `arc` degrees (the whole arc), nearest first.
 */
export function meleeTargets<T>(
  from: { x: number; z: number },
  headingDeg: number,
  candidates: MeleeCandidate<T>[],
  options: { reach: number; arc: number }
): T[] {
  const half = options.arc / 2
  return candidates
    .map((c) => {
      const dx = c.x - from.x
      const dz = c.z - from.z
      const d = Math.hypot(dx, dz)
      const bearing = (Math.atan2(dx, dz) * 180) / Math.PI
      const off = Math.abs(((bearing - headingDeg + 540) % 360) - 180)
      return { c, d, off }
    })
    .filter(({ d, off }) => d <= options.reach && (d < 0.3 || off <= half))
    .sort((a, b) => a.d - b.d)
    .map(({ c }) => c.item)
}
