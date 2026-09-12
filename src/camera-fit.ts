/*#
# camera-fit

**Where a chase camera is allowed to be.** Pure — distances and heights, no
Babylon, no rays — so the rules can be tested without a scene.

Two problems that look unrelated and are the same problem:

- **A wall between you and the camera.** The camera sits behind the character;
  the character backs into a corner; now you are looking at the inside of a
  wall, or through it at nothing.
- **The camera at a medium boundary.** Half the frame should be underwater and
  is not, because fog is one value per frame ([[MEDIUM-DESIGN]] §6a).

Both are *the camera is somewhere it should not be*, and both are fixed by
moving it — pull it in, or push it out of the band. Tonio, joining them up:
*"The same sort of correction could handle the medium boundary issue."* So this
module is a list of corrections applied to a desired position, rather than two
features that each own a camera.

## Snap IN, ease OUT — and that asymmetry is the whole feel

A wall arrives between you and the camera in one frame, and you must be inside
it **that frame**: easing in means one or two frames of looking through
geometry, which is the artifact every third-person camera is judged on.

Coming back out is the opposite. The ray that found the wall will flicker at
its edge — a pillar, a doorway, a railing — and easing out is what stops the
camera pumping in and out at 60Hz while you stand still. Different rates for
the two directions is not a polish detail; it is the difference between a
camera that works and one that makes people ill.

## The band case IS the Manta flip

`MEDIUM-DESIGN` §6a records how Manta solved the waterline on an iPhone 3G:
flip the camera from decidedly above to decidedly below, so the state never
arises. Expressed here, that is one more constraint — *stay out of this band* —
and it composes with the wall correction instead of being a second mode with
its own camera code.

Which side it goes to is decided by **the subject**, not by the camera: if the
swimmer is under, the camera goes under. A camera that picked the nearer side
would cross the surface every time the character bobbed.
*/
/*{ "parent": "Vehicles", "order": 170 }*/

export interface FitOptions {
  /** Never closer than this, however blocked. */
  min?: number
  /**
   * Space left between the camera and whatever it backed into.
   *
   * It has to clear the near plane, or the wall the camera is avoiding gets
   * sliced open and you see through it — the failure that looks like the
   * correction is not working at all when in fact it is working and stopping a
   * hair too late.
   */
  margin?: number
}

/**
 * How far back the camera may sit, given what a ray from the subject hit.
 *
 * `hit` is the distance to the obstruction, or `Infinity` for a clear view.
 * Returns the desired distance when nothing is in the way, and otherwise the
 * largest distance that keeps the camera in front of it.
 */
export function fitDistance(
  desired: number,
  hit: number,
  options: FitOptions = {}
): number {
  const min = options.min ?? 0.6
  const margin = options.margin ?? 0.35
  if (!(hit > 0) || !Number.isFinite(hit)) return Math.max(min, desired)
  return Math.max(min, Math.min(desired, hit - margin))
}

export interface EaseOptions {
  /**
   * Seconds to close the gap when moving IN. **`0` (the default) SNAPS.**
   *
   * The first version of this eased inward over 0.05s, which sounds immediate
   * and is not: at 60Hz that is 28% of the gap in the first frame, so the
   * camera is still most of the way inside the wall for two or three frames.
   * The test caught it, and it caught the module disagreeing with its own
   * heading — "snap IN, ease OUT" was the design and 0.05 was not a snap.
   */
  inSeconds?: number
  /** Seconds when moving OUT. Larger: this is where flicker becomes pumping. */
  outSeconds?: number
}

/**
 * Move a distance toward its target, fast inward and slow outward.
 *
 * Frame-rate independent in the `1 - exp(-t/τ)` sense rather than `k·dt`, which
 * is the form that made the VR chase camera behave differently at 72 and 90Hz.
 */
export function easeDistance(
  current: number,
  target: number,
  dt: number,
  options: EaseOptions = {}
): number {
  if (!(dt > 0)) return current
  const tau =
    target < current ? options.inSeconds ?? 0 : options.outSeconds ?? 0.45
  // A zero time constant is a SNAP, and inward that is the point rather than a
  // degenerate case: a wall that appeared this frame must be respected this
  // frame.
  if (!(tau > 0)) return target
  const t = 1 - Math.exp(-dt / tau)
  return current + (target - current) * t
}

export interface Band {
  /** Bottom of the forbidden band, in world Y. */
  low: number
  /** Top of it. */
  high: number
}

/**
 * Push a camera height clear of a band, to the side the SUBJECT is on.
 *
 * The Manta flip as a constraint. Which side matters: choosing the nearer edge
 * would send the camera across the surface every time the character bobbed
 * through it, and a camera that crosses on its own is worse than one that sits
 * in the wrong medium.
 *
 * A subject inside the band is the genuinely ambiguous case — treading water,
 * exactly at the line. It resolves DOWNWARD, because a swimmer at the surface
 * is a swimmer: the interesting half of their world is below them, and that is
 * the half the camera should be in.
 */
export function clearOfBand(
  y: number,
  subjectY: number,
  band: Band,
  margin = 0.05
): number {
  const low = Math.min(band.low, band.high)
  const high = Math.max(band.low, band.high)
  if (y <= low || y >= high) return y
  const above = subjectY >= high
  return above ? high + margin : low - margin
}

/**
 * When there is nowhere safe to stand, STOP STANDING SOMEWHERE.
 *
 * Tonio: *"Worst case we force first person when we can't place the camera
 * safely."* Which is what every third-person camera that works does, and the
 * alternative is the two failures everyone has seen: the camera jammed inside a
 * wall showing the inside of the world, or jammed against the character's back
 * showing a shoulder blade.
 *
 * Hysteresis, for the same reason `isSwimming` and `inShelter` have it: a
 * doorway is exactly where the ray flickers, and a camera alternating between
 * first and third person at 60Hz is the worst outcome available — worse than
 * either state, and much worse in a headset.
 *
 * `enter` is tight and `leave` is loose: go first-person as soon as the third-
 * person position is untenable, and come back out only once there is real room,
 * not once there is barely room.
 */
export function forceFirstPerson(
  hit: number,
  wasFirstPerson = false,
  enter = 0.9,
  leave = 1.4
): boolean {
  if (!(hit > 0) || !Number.isFinite(hit)) return false
  return wasFirstPerson ? hit < leave : hit < enter
}

export interface ChaseFit {
  /** Distance behind the subject. */
  distance: number
  /** Height above it. */
  height: number
  /**
   * There is no safe third-person position — the caller should switch to a
   * first-person view rather than put the camera somewhere embarrassing.
   */
  firstPerson: boolean
}

/**
 * The whole correction, in the order the corrections have to happen.
 *
 * Distance first, because a nearer camera changes where the height constraint
 * applies; then the floor, which is the cheap always-correct half; then the
 * band, LAST, because it is the one that must survive everything else — a
 * camera pushed out of the water by the band rule and then dropped back into it
 * by a floor clamp is exactly the flicker this is meant to remove.
 */
export function fitChase(
  desired: { distance: number; height: number },
  state: { distance: number; firstPerson?: boolean },
  input: {
    hit?: number
    dt: number
    subjectY: number
    groundY?: number
    band?: Band | null
  },
  options: FitOptions &
    EaseOptions & {
      minHeight?: number
      firstPersonAt?: number
      firstPersonLeave?: number
    } = {}
): ChaseFit {
  const hit = input.hit ?? Infinity
  const firstPerson = forceFirstPerson(
    hit,
    state.firstPerson ?? false,
    options.firstPersonAt,
    options.firstPersonLeave
  )
  const target = fitDistance(desired.distance, hit, options)
  const distance = easeDistance(state.distance, target, input.dt, options)
  // Proportional, so pulling the camera in also brings it down — otherwise a
  // camera squeezed against a wall ends up craning over the subject's head.
  const shrink = desired.distance > 0 ? distance / desired.distance : 1
  let height = desired.height * shrink
  const floor = options.minHeight ?? 0.4
  if (input.groundY != null) {
    height = Math.max(height, input.groundY - input.subjectY + floor)
  } else {
    height = Math.max(height, floor)
  }
  if (input.band != null) {
    height =
      clearOfBand(input.subjectY + height, input.subjectY, input.band) -
      input.subjectY
  }
  return { distance, height, firstPerson }
}
