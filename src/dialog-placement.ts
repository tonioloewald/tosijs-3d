/*#
# dialog-placement

**Where a modal dialog goes, when it should follow you, and which way a panel
faces** — the pure half of world-placed dialogs, plus the one function every
panel in the library aims itself with (`faceViewer`). Babylon-free (plain `{x, y, z}`), deterministic, and unit
tested, so the rules can be argued about without a headset.

## Why dialogs are world-placed at all

A camera-parented panel is the obvious implementation and the wrong one. In 2D a
DOM element is clipped to its window, and `z-index` is a *local* claim that
cannot lift you out of an `overflow: hidden` ancestor. **Depth and collision are
XR's window frame**: you do not get to composite over them. A respawn panel set
to draw on top painted in front of the terrain and became untouchable, because
picking is geometric and does not care what you drew last.

So a dialog is a thing at a place. It occludes and is occluded like anything
else, it stacks with other UI by ordinary depth, and it does not jitter with
your head.

## Why it still follows you

The one honest argument for head-locking is "what if I cannot find it". Answer:
if the dialog has been outside a generous cone for a couple of seconds, it
re-picks a spot in front of you and eases over. You get findability without the
panel chasing your eyes — the thing that made a face-pinned pause dialog
unpleasant.

**Eased, never snapped.** A dialog that teleports reads as a glitch; one that
moves reads as deliberate.
*/
/*{ "parent": "UI" }*/

/** Minimal vector — deliberately not Babylon's, so this module stays pure. */
export interface Vec3 {
  x: number
  y: number
  z: number
}

const sub = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.x - b.x,
  y: a.y - b.y,
  z: a.z - b.z,
})
const len = (v: Vec3): number => Math.hypot(v.x, v.y, v.z)

/** Unit vector, or `null` for a zero-length input (which has no direction). */
export function normalize(v: Vec3): Vec3 | null {
  const l = len(v)
  if (l < 1e-9) return null
  return { x: v.x / l, y: v.y / l, z: v.z / l }
}

/**
 * Angle in DEGREES between where the viewer looks and where the dialog is.
 *
 * Returns `0` when the dialog is exactly on the view axis and `180` when it is
 * directly behind. A dialog at the viewer's own position has no direction, and
 * is reported as `0` — on-axis — because "you are inside it" is not a reason to
 * go and fetch it.
 */
export function gazeOffAxisDeg(eye: Vec3, forward: Vec3, dialog: Vec3): number {
  const f = normalize(forward)
  const d = normalize(sub(dialog, eye))
  if (f == null || d == null) return 0
  const dot = Math.max(-1, Math.min(1, f.x * d.x + f.y * d.y + f.z * d.z))
  return (Math.acos(dot) * 180) / Math.PI
}

/** How long the dialog has been out of view, in seconds. */
export interface GazeState {
  offAxisSec: number
}

export const newGazeState = (): GazeState => ({ offAxisSec: 0 })

export interface GazeOptions {
  /** Half-angle you may look away by before the clock starts. Default 55°. */
  coneDeg?: number
  /** Seconds outside the cone before the dialog comes to you. Default 2. */
  holdSec?: number
}

/**
 * Advance the look-away clock and say whether the dialog should re-place.
 *
 * The clock **resets** the moment the dialog is back inside the cone, so a
 * glance away costs nothing — only sustained inattention moves it. Returns the
 * next state alongside the decision rather than mutating, so the rule is
 * testable and the caller owns the state.
 */
export function gazeStep(
  state: GazeState,
  offAxisDeg: number,
  dt: number,
  opts: GazeOptions = {}
): { state: GazeState; recover: boolean } {
  const { coneDeg = 55, holdSec = 2 } = opts
  if (offAxisDeg <= coneDeg) return { state: { offAxisSec: 0 }, recover: false }
  const offAxisSec = state.offAxisSec + Math.max(0, dt)
  if (offAxisSec >= holdSec) return { state: { offAxisSec: 0 }, recover: true }
  return { state: { offAxisSec }, recover: false }
}

/**
 * Pick the best of several candidate distances — the results of casting a ray
 * along each candidate direction.
 *
 * `Infinity` means nothing was hit, i.e. fully clear. The winner is the
 * candidate with the most room, preferring EARLIER candidates on a tie so a
 * caller can order them by desirability (straight ahead first). Returns `-1`
 * when every candidate is too cramped to use.
 */
export function bestCandidate(
  clearances: number[],
  minClearance: number
): number {
  let best = -1
  let bestClear = -Infinity
  for (let i = 0; i < clearances.length; i++) {
    const c = clearances[i]
    if (c < minClearance) continue
    if (c > bestClear) {
      best = i
      bestClear = c
    }
  }
  return best
}

/**
 * How far along a candidate direction to actually sit.
 *
 * Short of the obstruction by `margin` so the panel is not coplanar with a wall,
 * never past the distance you asked for, and never closer than `minZ` — a panel
 * at arm's length is uncomfortable in a headset, which is why "just use the near
 * clip plane" is the wrong version of this idea.
 */
export function placementDistance(
  clearance: number,
  desired: number,
  minZ = 0.6,
  margin = 0.25
): number {
  const room = clearance === Infinity ? desired : clearance - margin
  return Math.max(minZ, Math.min(desired, room))
}

/**
 * Ease a position toward a target — frame-rate independent.
 *
 * `smoothing` is the fraction of the remaining distance left after one second,
 * so the result does not change when the frame rate does (the naive
 * `lerp(a, b, 0.1)` per frame moves twice as fast at 120fps as at 60).
 */
export function easeTo(
  current: Vec3,
  target: Vec3,
  dt: number,
  smoothing = 0.001
): Vec3 {
  const t = 1 - Math.pow(smoothing, Math.max(0, dt))
  return {
    x: current.x + (target.x - current.x) * t,
    y: current.y + (target.y - current.y) * t,
    z: current.z + (target.z - current.z) * t,
  }
}

/**
 * Aim a panel's FACE at a point. Returns `{ yaw, pitch }` in **radians**, ready
 * for `Quaternion.RotationYawPitchRoll(yaw, pitch, roll)`.
 *
 * **A Babylon plane's visible front normal is local −Z, not +Z.** (Verified, not
 * assumed: `MeshBuilder.CreatePlane` normals come out `(0, 0, -1)` and our
 * `rounded-rect` geometry matches it deliberately — both pinned in
 * `babylon-orientation.test.ts`.) So the obvious `atan2(dx, dz)` aims local +Z
 * at the viewer and turns the panel's **back** to them.
 *
 * That fails in the one way nobody looks for. A `doubleSided` plane's back faces
 * reuse the front's UVs, so the panel does not vanish — it renders with the
 * texture **mirrored horizontally**, and a mirrored panel still reads as a panel
 * with its button roughly where you expect. A bug that degrades gracefully is a
 * bug that ships: this reached a release, and arrived as "the death / respawn
 * dialog was flipped horizontally" rather than as a missing dialog.
 *
 * It exists as ONE function because it had previously been answered three times,
 * differently, in three files — two compensating with `tex.uScale = -1` (and one
 * of those also flipping `1 - uv.x` on every pick) and the third not at all.
 * Knowledge that lives in a comment does not travel; a function does.
 *
 * **Roll comes back NEGATED, and that is the point of passing it in here.**
 * Turning a panel around reverses the apparent sense of a roll, so a caller
 * moving off the old back-facing convention has to flip its own roll or every
 * non-symmetric one silently mirrors. I first reasoned that the flip and the
 * dropped texture-mirror cancelled — they do not, and only a test caught it
 * (`180°` is symmetric, so the one roll actually in use agreed with the wrong
 * answer). The correction lives here rather than in each caller, because the
 * whole reason this function exists is that per-caller memory is what failed.
 */
export function faceViewer(
  panel: Vec3,
  viewer: Vec3,
  /** Roll in RADIANS, in the sense the caller wants the viewer to see. */
  roll = 0
): { yaw: number; pitch: number; roll: number } {
  const dx = viewer.x - panel.x
  const dy = viewer.y - panel.y
  const dz = viewer.z - panel.z
  const flat = Math.hypot(dx, dz)
  // Negated because the FACE is −Z: aim −Z at the viewer, not +Z.
  return {
    yaw: Math.atan2(-dx, -dz),
    pitch: Math.atan2(dy, flat),
    roll: -roll,
  }
}

/**
 * Yaw in DEGREES that turns a panel's face toward the viewer — `faceViewer` for
 * something that stays upright, which every dialog does.
 *
 * Degrees because it is written onto an ELEMENT (`ry`), and the authoring
 * surface is degrees.
 */
export function facingYawDeg(panel: Vec3, eye: Vec3): number {
  // Directly overhead (or exactly on the panel) gives no yaw to speak of;
  // keeping the current one beats spinning to an arbitrary answer.
  if (Math.hypot(eye.x - panel.x, eye.z - panel.z) < 1e-6) return 0
  return (faceViewer(panel, eye).yaw * 180) / Math.PI
}
