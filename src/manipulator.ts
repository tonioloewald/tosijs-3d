/*#
# manipulator

**The maths a translate/rotate/scale widget needs, as pure functions.** No
scene, no engine, no pointer — so the part most likely to be subtly wrong is the
part that can be tested without a browser. [[manipulator-view]] draws it and
[[b3d-manipulator]] is the element you actually use.

Each grip answers one question: *given where the pointer is aiming now, what
value should this handle have?*

| grip | reading |
| --- | --- |
| `translate` | the point on the axis closest to the pointer's ray |
| `planar` | where the ray crosses the plane the grip lies in, as a point |
| `rotate` | the angle around the axis where the ray crosses its plane |
| `scale` | the same projection as translate, read as a ratio |
| `uniform` | the ray's distance from the widget centre, read as a ratio |

## A grip, not a mode

The widget shows every enabled affordance AT ONCE and lets the grip you grab say
what the drag means — the shape Cheetah 3D's universal manipulator made its
reputation on. A mode switch asks the author to declare their intent twice: once
to the toolbar, and again to the handle. Here `Grip` is the whole vocabulary,
and it is what a pick returns.

## Snapping quantises the VALUE, not the movement

A drag that snaps by stepping the delta accumulates error: sixty frames of
`round(delta)` is not `round(sixty deltas)`, and a piece walks off the grid over
a long drag. Quantising the resulting absolute value instead means a snapped
object is always exactly on the grid, however it got there.

The one exception is ROTATION, which snaps its DELTA — a 15° step about the ring
you grabbed is what the setting promises, and it has to survive a start rotation
that is not itself on the grid.

## The drag measures against a FROZEN frame

`beginDrag` captures the object's axes and holds them for the whole gesture.
Reading them live is a feedback loop for rotation: measure the angle in the
object's current frame, apply it, and the frame has now turned by what you just
applied — so the next sample measures against a basis your own output moved.
That reads, from the outside, as *"a tiny movement spins the thing hundreds of
degrees"*.

## Where this came from

Ported from `tosijs-3d-ensemble`, where it was built and shaken out against real
authoring — including on a phone, which is where most of the sizing decisions in
[[manipulator-view]] were won. The maths is unchanged; the shape is not.
Ensemble's version speaks in `[x, y, z]` tuples and writes into an ensemble
document, so it is re-expressed here in this library's `{x, y, z}` and returns a
transform rather than editing anything.
*/
/*{ "parent": "Utilities", "order": 118 }*/

/** A point or direction. Plain numbers — the engine does not belong in here. */
export interface Vec3 {
  x: number
  y: number
  z: number
}

/** Euler rotation in DEGREES, matching an element's `rx`/`ry`/`rz`. */
export interface Euler {
  rx: number
  ry: number
  rz: number
}

/** A world-space ray: where the pointer is, and where it aims. */
export interface ManipulatorRay {
  origin: Vec3
  direction: Vec3
}

export type Axis = 'x' | 'y' | 'z'

/** What a grip does when you drag it. */
export type GripKind = 'translate' | 'planar' | 'rotate' | 'scale' | 'uniform'

/**
 * One grabbable part of the manipulator.
 *
 * `axis` means the axis dragged along or turned around — except for `planar`,
 * where it is the axis NORMAL to the drag plane (so the XZ pad is
 * `{kind: 'planar', axis: 'y'}`). Encoding a plane by its normal keeps every
 * grip the same shape, which is what lets one pick, one metadata field and one
 * drag record cover all five kinds. `uniform` has no axis.
 */
export interface Grip {
  kind: GripKind
  axis?: Axis
}

/** Which transforms the widget offers. All off draws nothing. */
export interface TransformSet {
  translate: boolean
  rotate: boolean
  scale: boolean
}

export const NO_TRANSFORMS: TransformSet = {
  translate: false,
  rotate: false,
  scale: false,
}

/** True when the widget would draw nothing. */
export const noTransforms = (t: TransformSet): boolean =>
  !t.translate && !t.rotate && !t.scale

/** The two axes that are not this one, in cyclic order. */
export function otherAxes(axis: Axis): [Axis, Axis] {
  return axis === 'x' ? ['y', 'z'] : axis === 'y' ? ['z', 'x'] : ['x', 'y']
}

const AXIS_VECTOR: Record<Axis, Vec3> = {
  x: { x: 1, y: 0, z: 0 },
  y: { x: 0, y: 1, z: 0 },
  z: { x: 0, y: 0, z: 1 },
}

export const axisVector = (axis: Axis): Vec3 => AXIS_VECTOR[axis]

const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z
const sub = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.x - b.x,
  y: a.y - b.y,
  z: a.z - b.z,
})
const along = (ray: ManipulatorRay, t: number): Vec3 => ({
  x: ray.origin.x + ray.direction.x * t,
  y: ray.origin.y + ray.direction.y * t,
  z: ray.origin.z + ray.direction.z * t,
})

/** Read one component of a vector by axis name. */
export const axisComponent = (v: Vec3, axis: Axis): number => v[axis]

/**
 * Closest point, along an infinite axis line, to a ray.
 *
 * The standard line-line closest-approach solve. Returns a distance along the
 * axis from `origin`, or `null` when the two are parallel — dragging an axis
 * you are looking straight down has no answer, and inventing one makes the
 * object leap to infinity.
 */
export function axisClosestApproach(
  origin: Vec3,
  axis: Vec3,
  ray: ManipulatorRay
): number | null {
  const w = sub(origin, ray.origin)
  const a = dot(axis, axis)
  const b = dot(axis, ray.direction)
  const c = dot(ray.direction, ray.direction)
  const d = dot(axis, w)
  const e = dot(ray.direction, w)
  const denominator = a * c - b * b
  // Parallel within floating-point reach. The threshold is RELATIVE, not
  // absolute, so it holds for a scene measured in metres or in kilometres.
  if (Math.abs(denominator) < 1e-9 * a * c) return null
  return (b * e - c * d) / denominator
}

/**
 * The angle a ray makes about an axis, in DEGREES.
 *
 * Rotation happens in the object's own frame, so the ring a pointer is dragging
 * lies in a plane whose normal is the object's axis — not the world's. `normal`
 * is that axis; `u` and `v` are the other two, and they set where zero is and
 * which way the angle grows.
 */
export function angleAboutAxis(
  origin: Vec3,
  normal: Vec3,
  u: Vec3,
  v: Vec3,
  ray: ManipulatorRay
): number | null {
  const denominator = dot(normal, ray.direction)
  if (Math.abs(denominator) < 1e-9) return null // ray runs along the plane
  const t = dot(normal, sub(origin, ray.origin)) / denominator
  if (t < 0) return null // the plane is behind the pointer
  const local = sub(along(ray, t), origin)
  return (Math.atan2(dot(local, v), dot(local, u)) * 180) / Math.PI
}

/**
 * Which two axes span the plane of a rotation ring, and in which order.
 *
 * The order fixes where zero is and which way the angle grows; get it wrong for
 * one ring and that ring drags backwards, which reads as a bug in the pointer
 * rather than a sign.
 */
export const RING_BASIS: Record<Axis, [Axis, Axis]> = {
  x: ['z', 'y'],
  y: ['x', 'z'],
  z: ['x', 'y'],
}

/**
 * Where a ray crosses the plane through `origin` whose normal is `axis`.
 *
 * The point a planar grip drags to. Null when the ray runs ALONG the plane (no
 * crossing) or when the plane is behind the pointer, which is a drag reaching
 * round the back of the widget.
 */
export function rayPlanePoint(
  origin: Vec3,
  axis: Axis,
  ray: ManipulatorRay
): Vec3 | null {
  const normal = AXIS_VECTOR[axis]
  const denominator = dot(normal, ray.direction)
  if (Math.abs(denominator) < 1e-9) return null
  const t = dot(normal, sub(origin, ray.origin)) / denominator
  if (t < 0) return null
  return along(ray, t)
}

/**
 * Perpendicular distance from a point to a ray.
 *
 * What the centre grip scales by: pull away from the widget and it grows. It
 * needs no axis and no camera, which is what makes it the one affordance that
 * behaves identically from a mouse and from a hand — an in-scene widget has no
 * "screen space" to fall back on.
 */
export function rayPerpendicularDistance(
  origin: Vec3,
  ray: ManipulatorRay
): number {
  const w = sub(origin, ray.origin)
  const dd = dot(ray.direction, ray.direction)
  if (dd < 1e-12) return 0
  const d = sub(origin, along(ray, dot(w, ray.direction) / dd))
  return Math.hypot(d.x, d.y, d.z)
}

/**
 * Quantise a value to a step. `step <= 0` means no snapping.
 *
 * Applied to the absolute value rather than the delta — see the note above.
 */
export function snap(value: number, step: number): number {
  if (!Number.isFinite(step) || step <= 0) return value
  return Math.round(value / step) * step
}

/** Snap each component of a position. */
export function snapVec3(value: Vec3, step: number): Vec3 {
  return {
    x: snap(value.x, step),
    y: snap(value.y, step),
    z: snap(value.z, step),
  }
}

/**
 * Wrap an angle into (-180, 180].
 *
 * Rotation drags cross the ±180 seam constantly, and an unwrapped difference
 * there is a 359° jump — the object spins the long way round for one frame.
 */
export function wrapDegrees(angle: number): number {
  if (!Number.isFinite(angle)) return 0
  const wrapped = ((((angle + 180) % 360) + 360) % 360) - 180
  return wrapped === -180 ? 180 : wrapped
}

/**
 * An angle as it is STORED: 0 up to but not including 360.
 *
 * Distinct from `wrapDegrees`, and the two must not be confused. A DELTA is
 * signed — turning back five degrees is -5, and calling it 355 would spin the
 * object the long way round — so deltas keep the (-180, 180] wrap. A stored
 * ANGLE has no direction to preserve and reads better without minus signs,
 * particularly since composing a rotation returns whichever euler triple the
 * engine picks: an object turned about its own axis comes back as
 * `[-5, 174, -40]` where nobody would have typed that.
 *
 * 360 normalises to 0, which is the same orientation spelled shorter.
 */
export function normaliseDegrees(angle: number): number {
  if (!Number.isFinite(angle)) return 0
  return ((angle % 360) + 360) % 360
}

/** Scale factor from a drag along an axis, clamped so an object cannot invert. */
export function scaleFactor(
  startDistance: number,
  currentDistance: number
): number {
  if (Math.abs(startDistance) < 1e-6) return 1
  // Negative or near-zero scale mirrors or annihilates the mesh, and neither is
  // ever what a drag past the origin meant.
  return Math.max(0.01, currentDistance / startDistance)
}

/* ------------------------------------------------------------------------- *
 * The drag itself
 * ------------------------------------------------------------------------- */

/** What a manipulator produces: the transform the object should now have. */
export interface ManipulatorTransform {
  position: Vec3
  /** DEGREES. */
  rotation: Euler
  scale: Vec3
}

/** The object's own axes in WORLD space, frozen for the length of a drag. */
export type AxisFrame = Record<Axis, Vec3>

/** World axes — the frame of an object that has not been turned. */
export const WORLD_FRAME: AxisFrame = {
  x: AXIS_VECTOR.x,
  y: AXIS_VECTOR.y,
  z: AXIS_VECTOR.z,
}

/**
 * Compose a rotation: turn `start` by `degrees` about one of the OBJECT's axes.
 *
 * Injected rather than implemented here, and deliberately. `rotation.rx += d`
 * edits one euler component, which matches a real rotation only while the
 * object has no prior rotation — turn an already-turned object that way and it
 * goes somewhere nobody asked for. Composing correctly needs quaternions, and
 * converting the result back to euler needs the ENGINE's exact convention, so
 * re-deriving it here would be subtly wrong about the order. [[manipulator-view]]
 * exports `composeRotation`, which asks Babylon.
 */
export type ComposeRotation = (
  start: Euler,
  axis: Axis,
  degrees: number
) => Euler

export interface DragOptions {
  /** Position snap, in metres. `0` is off. */
  gridSnap?: number
  /** Angle snap, in degrees. `0` is off. */
  angleSnap?: number
  /**
   * Was the secondary button held AT THE GRAB?
   *
   * Latched, not read live: a modifier that can flip mid-drag means the axes
   * being scaled change under your hand, and the result depends on whether you
   * happened to be holding it when you let go.
   */
  secondary?: boolean
}

/** A drag in progress. Opaque to callers apart from `grip` and `moved`. */
export interface Drag {
  readonly grip: Grip
  /** Where the widget sits in world space — the origin every reading is against. */
  readonly origin: Vec3
  readonly start: ManipulatorTransform
  /** Where the pointer started, in whatever units this grip drags in. */
  readonly startValue: number | Vec3
  readonly secondary: boolean
  readonly frame: AxisFrame
  /** The transform as it currently stands. */
  current: ManipulatorTransform
  /**
   * Did the POINTER ever move, whatever the value did with it?
   *
   * Distinct from "did the committed value change". A drag that travelled and
   * then snapped back to the grid it started on has changed nothing to commit,
   * but it was still a DRAG — treating it as a click hands the selection to
   * whatever is behind the widget, which is how *"clicking a foreground object
   * trumps clicking on the transform affordances"* happens on every small nudge.
   */
  moved: boolean
}

const cloneTransform = (t: ManipulatorTransform): ManipulatorTransform => ({
  position: { ...t.position },
  rotation: { ...t.rotation },
  scale: { ...t.scale },
})

/**
 * Start a drag on `grip`.
 *
 * Null when the pointer cannot produce a reading for this grip — parallel to
 * the axis, or aiming behind the plane. That is not a failure to report; it is
 * a gesture that has no meaning yet, and starting anyway would make the object
 * leap.
 */
export function beginDrag(
  grip: Grip,
  origin: Vec3,
  transform: ManipulatorTransform,
  ray: ManipulatorRay,
  frame: AxisFrame = WORLD_FRAME,
  options: DragOptions = {}
): Drag | null {
  const startValue = measure(grip, origin, ray, frame)
  if (startValue === null) return null
  return {
    grip,
    origin,
    start: cloneTransform(transform),
    startValue,
    secondary: options.secondary === true,
    frame,
    current: cloneTransform(transform),
    moved: false,
  }
}

/**
 * Fold the pointer's current aim into a running drag. Mutates `drag`.
 *
 * Returns false when the pointer produced no usable reading this frame, in
 * which case the drag simply holds its last value rather than jumping.
 */
export function updateDrag(
  drag: Drag,
  ray: ManipulatorRay,
  composeRotation: ComposeRotation,
  options: DragOptions = {}
): boolean {
  const now = measure(drag.grip, drag.origin, ray, drag.frame)
  if (now === null) return false
  apply(drag, now, composeRotation, options)
  if (pointerMoved(drag.startValue, now)) drag.moved = true
  return true
}

/**
 * The transform to COMMIT, snapped and normalised.
 *
 * Snap first, then normalise: 359.6 rounds to 360 and is stored as 0.
 */
export function commitTransform(
  drag: Drag,
  options: DragOptions = {}
): ManipulatorTransform {
  const grid = options.gridSnap ?? 0
  const angle = options.angleSnap ?? 0
  const r = drag.current.rotation
  return {
    position: snapVec3(drag.current.position, grid),
    rotation: {
      rx: normaliseDegrees(snap(r.rx, angle)),
      ry: normaliseDegrees(snap(r.ry, angle)),
      rz: normaliseDegrees(snap(r.rz, angle)),
    },
    scale: { ...drag.current.scale },
  }
}

/**
 * Did this drag actually change anything worth writing?
 *
 * Takes the SNAPPED transform, because that is what would be committed. A
 * ten-centimetre nudge on a one-metre grid rounds back to where it started:
 * there is nothing to write, and treating it as a drag would swallow a tap to
 * no purpose. Compared against what the drag started FROM, so a gesture that
 * wandered and came back also reads as unmoved.
 */
export function dragChanged(
  drag: Drag,
  committed: ManipulatorTransform
): boolean {
  const near = (a: number, b: number, epsilon: number) =>
    Math.abs(a - b) < epsilon
  const s = drag.start
  const still =
    near(committed.position.x, s.position.x, 1e-4) &&
    near(committed.position.y, s.position.y, 1e-4) &&
    near(committed.position.z, s.position.z, 1e-4) &&
    // Both sides normalised: the drag's value has been, the object's stored one
    // may predate the rule, and -40 versus 320 is not a movement.
    (['rx', 'ry', 'rz'] as const).every((k) =>
      near(
        normaliseDegrees(committed.rotation[k]),
        normaliseDegrees(s.rotation[k]),
        1e-3
      )
    ) &&
    near(committed.scale.x, s.scale.x, 1e-4) &&
    near(committed.scale.y, s.scale.y, 1e-4) &&
    near(committed.scale.z, s.scale.z, 1e-4)
  return !still
}

/** Where the pointer is, in the units this grip drags in. */
function measure(
  grip: Grip,
  origin: Vec3,
  ray: ManipulatorRay,
  frame: AxisFrame
): number | Vec3 | null {
  if (grip.kind === 'uniform') return rayPerpendicularDistance(origin, ray)
  if (!grip.axis) return null
  if (grip.kind === 'planar') return rayPlanePoint(origin, grip.axis, ray)
  if (grip.kind === 'rotate') {
    // About the object's own axis, in the plane the ring is actually drawn in.
    const [u, v] = RING_BASIS[grip.axis]
    return angleAboutAxis(origin, frame[grip.axis], frame[u], frame[v], ray)
  }
  // Scale measures along the OBJECT's axis too; translate is a world move.
  const axis = grip.kind === 'scale' ? frame[grip.axis] : AXIS_VECTOR[grip.axis]
  return axisClosestApproach(origin, axis, ray)
}

/**
 * Did the pointer move this grip, whatever the value did with it?
 *
 * Reads the POINTER, not the result. Inferring movement from the transform
 * changing worked only while snapping happened on release; now that the grid
 * quantises live, a nudge inside one grid step leaves the value exactly where
 * it started — and inferring from that turns a real drag into a click.
 */
function pointerMoved(start: number | Vec3, now: number | Vec3): boolean {
  const EPSILON = 1e-4
  if (typeof start === 'number' || typeof now === 'number') {
    return (
      typeof start === 'number' &&
      typeof now === 'number' &&
      Math.abs(now - start) > EPSILON
    )
  }
  return (['x', 'y', 'z'] as const).some(
    (k) => Math.abs(now[k] - start[k]) > EPSILON
  )
}

function apply(
  drag: Drag,
  now: number | Vec3,
  composeRotation: ComposeRotation,
  options: DragOptions
): void {
  const { kind, axis } = drag.grip
  const gridStep = options.gridSnap ?? 0
  const angleStep = options.angleSnap ?? 0
  const start = drag.start

  if (kind === 'planar') {
    if (!axis || typeof now === 'number' || typeof drag.startValue === 'number')
      return
    // Both in-plane axes move; the plane's normal is exactly what stays put,
    // which is the whole reason to offer a pad rather than two shaft drags.
    const position = { ...start.position }
    for (const a of otherAxes(axis)) {
      position[a] = snap(
        start.position[a] + (now[a] - drag.startValue[a]),
        gridStep
      )
    }
    drag.current.position = position
    return
  }

  if (typeof now !== 'number' || typeof drag.startValue !== 'number') return

  if (kind === 'translate') {
    if (!axis) return
    /*
      Snap the POSITION, live.

      A grid snap means "objects sit on the grid", so unlike the angle it is the
      RESULT that quantises, not the delta. Doing it only on release left the
      object sliding freely under the hand and jumping when you let go.
    */
    const position = { ...start.position }
    position[axis] = snap(
      start.position[axis] + (now - drag.startValue),
      gridStep
    )
    drag.current.position = position
    return
  }

  if (kind === 'rotate') {
    if (!axis) return
    /*
      From the rotation the drag STARTED with, every frame — composing onto the
      running value would accumulate rounding over a long drag.

      Snap the DELTA here, not the resulting euler: a 15° step about the grabbed
      ring is what the setting promises, and it survives a start rotation that is
      not itself on the grid.
    */
    drag.current.rotation = composeRotation(
      start.rotation,
      axis,
      snap(wrapDegrees(now - drag.startValue), angleStep)
    )
    return
  }

  const factor = scaleFactor(drag.startValue, now)

  if (kind === 'uniform') {
    drag.current.scale = {
      x: start.scale.x * factor,
      y: start.scale.y * factor,
      z: start.scale.z * factor,
    }
    return
  }

  if (kind === 'scale') {
    if (!axis) return
    const scale = { ...start.scale }
    // Secondary inverts the selection of axes: the cube you grabbed stays put
    // and the other two move. "Thinner, same height" without a second drag.
    for (const a of drag.secondary ? otherAxes(axis) : [axis]) {
      scale[a] = start.scale[a] * factor
    }
    drag.current.scale = scale
  }
}
