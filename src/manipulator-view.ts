/*#
# manipulator-view

**The visible half of the manipulator: a universal widget, in the sense
Cheetah 3D means it.** Every enabled affordance is on screen at once and the
part you grab says what the drag means — drag a shaft to move along an axis, a
pad to move in a plane, a ring to turn, a cube to scale. The maths is in
[[manipulator]]; the element you actually place in a scene is
[[b3d-manipulator]].

Babylon has a `GizmoManager`, and it is mouse-shaped. This is built so a **hand**
can grab it, not only a ray.

## Why one widget instead of a mode

A mode switch makes you say what you want twice: once to the toolbar and again
to the handle. It also costs a round trip for the commonest edit there is —
nudge it over, then turn it a bit. The cost is crowding, and the answer to that
is the transform set: turn off what you are not using and its grips are simply
not built.

## Sized for hands, not only for pixels

Handles carry a `nearRadius` and are picked two ways: a hand inside that radius
grabs directly, anything further grabs by pointing. A gizmo designed for a mouse
gets this wrong by being visually thin — fine for a pixel-accurate cursor,
impossible to grab with a controller you are holding at arm's length, and
reported from a phone as *"I couldn't move a selection"*. So every drawn handle
carries a second, invisible, fatter mesh that exists only to be picked.

## Two-pass picking, and why one pass was the bug

`gripAt` picks the DRAWN handles first, then falls back to the fat targets. One
pass over both meant the fat targets — which overlap by design — decided
everything by ray depth, so the nearest surface was regularly a ring's tube
passing in front of the arrowhead squarely under the cursor. *"I rotated when I
tried to translate."*

## `renderingGroupId` draws it on top and does NOT make it pickable

Handles draw in group 1, because a handle buried inside the mesh it manipulates
cannot be seen — and the object an author most wants to move is usually the one
embedded in something else. That is a LOOK fix only: rendering group has no
bearing on picking, and this library has already shipped that mistake once
(see the camera-relative panel note in `b3d-svg-plane`, where a panel painted
in front and could not be touched).

It is safe here for a reason that does not generalise: `gripAt` picks with a
PREDICATE that admits nothing but handle meshes, so an occluder is never a
candidate and the depth question never arises. Pick handles any other way and
the terrain in front of them wins.

## Where this came from

Ported from `tosijs-3d-ensemble`, where every proportion below was measured
against the owner's reference model rather than eyeballed, and every sizing
decision was won against a real complaint. The geometry is unchanged; the API
is smaller — `gripAt` folds in the two-pass pick the consumer used to write
itself, and `composeRotation` folds in the euler composition it used to inject.
*/
/*{ "parent": "Utilities", "order": 119 }*/

import {
  Color3,
  Matrix,
  Mesh,
  MeshBuilder,
  Quaternion,
  Ray,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core'
import type * as BABYLON from '@babylonjs/core'
import type {
  Axis,
  AxisFrame,
  Euler,
  Grip,
  ManipulatorRay,
  TransformSet,
  Vec3,
} from './manipulator.js'

const DEG = Math.PI / 180

/** Marks a mesh as ours, so picking can tell a handle from the scene. */
export const HANDLE_TAG = 'tosi-b3d-manipulator-handle'

/**
 * Marks the mesh you can SEE, as opposed to its fat invisible twin.
 *
 * Picking runs in two passes and this is what separates them. Deciding between
 * overlapping grips by ray DEPTH alone gave the ring whose tube happened to pass
 * in front; deciding by distance to the drawn mesh's centre was worse, because a
 * ring is centred on the widget origin and so never wins against anything.
 */
export const DRAWN_TAG = `${HANDLE_TAG}-drawn`

const AXIS_COLOR: Record<Axis, [number, number, number]> = {
  x: [0.9, 0.25, 0.3],
  y: [0.35, 0.85, 0.4],
  z: [0.3, 0.5, 0.95],
}

const NEUTRAL: [number, number, number] = [0.85, 0.85, 0.88]

/** How close a HAND has to be, in metres, to grab a handle directly. */
export const NEAR_RADIUS = 0.18

/**
 * How much fatter the INVISIBLE pick target is than the handle you see.
 *
 * A fingertip covers roughly a centimetre of screen wherever it lands. Mouse
 * users benefit too: aiming at a 3 px cylinder was never good, it was merely
 * possible.
 */
const PICK_FATNESS = 5

/*
WHERE EACH GRIP SITS, AT UNIT SCALE. One table, so the layout can be read.

Ordered outward from the centre, and EVERY GRIP OWNS A BAND along the axis:

  Along −axis:  pad 0.2
  Along +axis:  shaft 0.1 – 0.6   ring 0.6 – 0.8   head 0.8 – 1.1   cube 1.28

That separation is the point, and it was missing. A ring at radius 1.2 with
shafts reaching 1.3 physically CROSSES them, so at four points on every ring the
drawn geometry of two different grips occupies the same pixels and no amount of
clever picking can tell which you meant.

⚠️ THE BREAK IN THE SHAFT IS LOAD-BEARING. It looks like an arbitrary gap and it
is the only reason rings and arrows cannot collide, so closing it up to make the
arrow "whole" reintroduces the bug at every orientation but the identity.

It is also frame-AGNOSTIC, which is the property worth keeping: arrows are
world-aligned and rings ride the object, and a radial band that no arrow occupies
clears them whatever their relative orientation.

The shaft is deliberately HAIRLINE. It is a line showing which way the axis runs,
not the thing you reach for — the arrowhead is. Its pick target stays generous,
so aiming at the line still works; it just no longer ADVERTISES itself as the
target.
*/
const SHAFT_LENGTH = 0.5
// Circumscribed circle: a square 0.05 across the flats measures 0.0707 corner
// to corner, and `diameter` is the corners.
const SHAFT_DIAMETER = 0.0707
const SHAFT_PICK_FATNESS = 11
const SHAFT_OFFSET = 0.35
const PAD_SIZE = 0.2
const RING_INNER = 0.6
const RING_OUTER = 0.8
/**
 * Extra band width per edge on the invisible pick ring.
 *
 * Modest, on purpose: the pick band must not reach the arrowhead at 0.8. Where
 * it does graze, the two-pass pick settles it.
 */
const RING_PICK_MARGIN = 0.08
const RING_SEGMENTS = 32
/** Centre distance of a plane pad along its offset axis. */
const PAD_OFFSET = 0.2
const CUBE_SIZE = 0.17
// Outside the ring and the arrowhead, both of which reach 1.1.
const CUBE_OFFSET = 1.28
const CENTRE_SIZE = 0.2

/**
 * The arrowhead, and why a shaft alone was not enough.
 *
 * A bare cylinder is a thin target wherever you aim at it, and on a touchscreen
 * that made single-axis movement effectively impossible while the big flat plane
 * pads worked fine. A cone is both the conventional "drag me" affordance and, at
 * this size, the fattest part of the axis.
 *
 * It is a separate PART of the same grip, not a grip of its own — grabbing the
 * head and grabbing the shaft mean the same drag.
 */
const HEAD_LENGTH = 0.3
const HEAD_DIAMETER = 0.283
const HEAD_OFFSET = 0.95

interface HandleMesh {
  grip: Grip
  /** Where this part sits, in unit-scale local space. */
  offset: Vec3
  /** How this part is turned onto its axis, in radians. */
  spin: Vec3
  mesh: BABYLON.Mesh
}

export interface HandlesView {
  /** Rebuild for a new transform set. Cheap no-op when nothing changed. */
  setTransforms(transforms: TransformSet): void
  moveTo(position: Vec3): void
  /**
   * Resize the handles so they stay a constant size ON SCREEN.
   *
   * Called every frame with the distance from the camera. Without it the
   * handles are world-sized: correct at one camera distance and unusable at
   * every other. Framed on a 24 m scene, the fat pick target measured about
   * ELEVEN PIXELS across — reported, accurately, as *"touching the manipulator
   * is very hit and mostly miss"*.
   */
  setScale(scale: number): void
  /**
   * The object's own rotation, for the grips that work in its frame.
   *
   * Scale and rotate both do. `node.scaling` is local, and rotation is defined
   * as being about the object's own axes — so a cube drawn on a world axis, or
   * a ring lying in a world plane, is a control pointing somewhere other than
   * where it acts. Measured before it was fixed: an object turned 90° about Y
   * grew along world Z when its X cube was dragged.
   *
   * Translate stays world-aligned, because a move is a world move.
   */
  setOrientation(rotation: Euler | null): void
  setVisible(visible: boolean): void
  /** The grip within `NEAR_RADIUS` of a hand, if any. */
  nearestGrip(hand: Vec3): Grip | null
  /** The grip a ray hits — drawn handles first, then the fat targets. */
  gripAt(ray: ManipulatorRay): Grip | null
  /** The grip a handle mesh belongs to, for a pick you ran yourself. */
  gripOf(mesh: unknown): Grip | null
  /** Is this mesh part of the manipulator at all? */
  isHandle(mesh: unknown): boolean
  /** Are these meshes still in a live scene? */
  alive(): boolean
  dispose(): void
}

/** A vector turned by a quaternion, as plain numbers. */
function rotated(v: Vec3, q: Quaternion): Vec3 {
  const out = Vector3.Zero()
  new Vector3(v.x, v.y, v.z).rotateByQuaternionToRef(q, out)
  return { x: out.x, y: out.y, z: out.z }
}

const quatOf = (rotation: Euler): Quaternion =>
  Quaternion.RotationYawPitchRoll(
    rotation.ry * DEG,
    rotation.rx * DEG,
    rotation.rz * DEG
  )

/**
 * Turn `start` by `degrees` about one of the OBJECT's own axes.
 *
 * The implementation [[manipulator]] declines to write, and this is where it
 * belongs: a real rotation is a COMPOSITION, and converting the result back to
 * euler needs Babylon's exact convention rather than a re-derivation of it.
 * Pass this to `updateDrag`.
 */
export function composeRotation(
  start: Euler,
  axis: Axis,
  degrees: number
): Euler {
  const base = quatOf(start)
  const local = Quaternion.RotationAxis(
    axis === 'x'
      ? Vector3.Right()
      : axis === 'y'
      ? Vector3.Up()
      : Vector3.Forward(),
    degrees * DEG
  )
  // `base × local` turns about the OBJECT's axis; `local × base` would turn
  // about the world's, which is a different (and usually unwanted) gesture.
  const e = base.multiply(local).toEulerAngles()
  return { rx: e.x / DEG, ry: e.y / DEG, rz: e.z / DEG }
}

/**
 * The object's axes in WORLD space — what a drag measures against.
 *
 * `beginDrag` freezes this for the length of a gesture; see the note there for
 * why reading it live spins an object hundreds of degrees.
 */
export function axisFrameOf(rotation: Euler | null): AxisFrame {
  if (
    rotation == null ||
    (rotation.rx === 0 && rotation.ry === 0 && rotation.rz === 0)
  ) {
    return {
      x: { x: 1, y: 0, z: 0 },
      y: { x: 0, y: 1, z: 0 },
      z: { x: 0, y: 0, z: 1 },
    }
  }
  const q = quatOf(rotation)
  return {
    x: rotated({ x: 1, y: 0, z: 0 }, q),
    y: rotated({ x: 0, y: 1, z: 0 }, q),
    z: rotated({ x: 0, y: 0, z: 1 }, q),
  }
}

/**
 * Build handles into a scene.
 *
 * Geometry is built at UNIT size and scaled per frame by `setScale` — rebuilding
 * every mesh each frame to track the camera would be absurd, and
 * `setTransforms` is the only thing that should ever rebuild.
 */
export function createHandles(scene: BABYLON.Scene, scale = 1): HandlesView {
  const handles: HandleMesh[] = []
  const materials: BABYLON.Material[] = []
  let position: Vec3 = { x: 0, y: 0, z: 0 }
  let transforms: TransformSet = {
    translate: true,
    rotate: false,
    scale: false,
  }
  /** Null means "not turned", and world axes are used as they are. */
  let orientation: Quaternion | null = null

  const material = (
    key: string,
    colour: [number, number, number],
    alpha = 1
  ): StandardMaterial => {
    const m = new StandardMaterial(`${HANDLE_TAG}-${key}`, scene)
    const [r, g, b] = colour
    // Emissive and unlit: a handle must read the same against a bright sky and
    // a dark hull, and it is UI rather than part of the scene.
    m.emissiveColor = new Color3(r, g, b)
    m.disableLighting = true
    m.alpha = alpha
    // A plane pad is a flat quad and gets looked at from both sides; without
    // this it vanishes from half the orbit, which reads as a missing handle.
    m.backFaceCulling = false
    materials.push(m)
    return m
  }

  interface PartSpec {
    /** Distinguishes parts of one grip in mesh names — `translate-x-head`. */
    part?: string
    make: (name: string, fatness: number) => BABYLON.Mesh
    colour: [number, number, number]
    alpha?: number
    offset?: Vec3
    spin?: Vec3
  }

  const ZERO: Vec3 = { x: 0, y: 0, z: 0 }

  /** The drawn mesh and its fat invisible twin, both tagged with the grip. */
  const add = (grip: Grip, spec: PartSpec): void => {
    const { make, colour, alpha = 1, offset = ZERO, spin = ZERO } = spec
    const key = `${grip.kind}-${grip.axis ?? 'all'}${
      spec.part ? `-${spec.part}` : ''
    }`
    const mesh = make(`${HANDLE_TAG}-${key}`, 1)
    mesh.material = material(key, colour, alpha)
    mesh.renderingGroupId = 1
    /*
    The drawn handle IS pickable, and is picked FIRST.

    It used to be unpickable, leaving the fat targets to decide everything by
    ray depth — which is how aiming squarely at an arrowhead could rotate the
    object instead. A hit on drawn geometry is unambiguous: it is the thing you
    could see and aimed at.
    */
    mesh.isPickable = true
    mesh.metadata = { [HANDLE_TAG]: grip, [DRAWN_TAG]: true }
    handles.push({ grip, mesh, offset, spin })

    const target = make(`${HANDLE_TAG}-${key}-pick`, PICK_FATNESS)
    /*
    `visibility = 0`, not `isVisible = false`: Babylon's picking skips meshes
    that are not visible, so hiding it the obvious way would make the pick
    target unpickable — which is the only thing it exists for.
    */
    target.visibility = 0
    target.isPickable = true
    target.metadata = { [HANDLE_TAG]: grip }
    handles.push({ grip, mesh: target, offset, spin })
  }

  const HALF = Math.PI / 2

  /**
   * Turn a shape built along +Y onto an axis, pointing OUTWARD.
   *
   * The sign matters. A cylinder is symmetric, so `+90°` for X drew a shaft
   * positioned on +X while oriented along −X and nobody could tell. A cone can
   * tell: it would point back at the object.
   */
  const alongAxis = (axis: Axis): Vec3 =>
    axis === 'x'
      ? { x: 0, y: 0, z: -HALF }
      : axis === 'z'
      ? { x: HALF, y: 0, z: 0 }
      : ZERO

  /**
   * A flat 90° annulus segment lying in XZ with normal +Y.
   *
   * A ribbon between two arcs: `CreateDisc` has an `arc` option but gives a pie
   * slice with no hole. Double-sided, because a flat band seen from the other
   * face would otherwise be invisible AND unpickable, and which face you see is
   * the camera's business.
   */
  const quarterAnnulus = (
    name: string,
    inner: number,
    outer: number,
    startDegrees: number
  ): BABYLON.Mesh => {
    const arc = (radius: number): Vector3[] => {
      const points: Vector3[] = []
      for (let i = 0; i <= RING_SEGMENTS; i++) {
        const t = ((startDegrees + (i / RING_SEGMENTS) * 90) * Math.PI) / 180
        points.push(new Vector3(Math.cos(t) * radius, 0, Math.sin(t) * radius))
      }
      return points
    }
    return MeshBuilder.CreateRibbon(
      name,
      { pathArray: [arc(inner), arc(outer)], sideOrientation: Mesh.DOUBLESIDE },
      scene
    )
  }

  /**
   * Where each axis's quarter starts, so it lands on the −`previousAxis` spoke.
   *
   * The SAME spoke as that axis's plane pad, which is what makes each axis read
   * as one row. `ringOn` only fixes the normal; the roll within the plane is
   * left over, and rather than composing a second rotation into `spin` the arc
   * is simply generated at the right angle.
   */
  const arcStart = (axis: Axis): number =>
    axis === 'x' ? 225 : axis === 'z' ? 45 : 135

  /**
   * A 4-sided cylinder standing on its CORNERS.
   *
   * Babylon puts the first vertex of a tessellated cylinder at angle 0, so a
   * 4-sided one has flat faces facing the axes. Vertices there instead is a
   * cleaner silhouette and, being asymmetric under 90° turns, tells you how the
   * object is ORIENTED rather than just which way the axis runs. Baked into the
   * vertices, because `spin` already owns `mesh.rotation`.
   */
  const squareTapered = (
    name: string,
    options: { height: number; diameterTop: number; diameterBottom: number }
  ): BABYLON.Mesh => {
    const mesh = MeshBuilder.CreateCylinder(
      name,
      { ...options, tessellation: 4 },
      scene
    )
    mesh.bakeTransformIntoVertices(Matrix.RotationY(Math.PI / 4))
    return mesh
  }

  /** Turn a ring (lying in XZ, normal +Y) so its normal is `axis`. */
  const ringOn = (axis: Axis): Vec3 =>
    axis === 'x'
      ? { x: 0, y: 0, z: HALF }
      : axis === 'z'
      ? { x: HALF, y: 0, z: 0 }
      : ZERO

  /** Turn a plane (facing +Z) so it faces `axis`. */
  const facing = (axis: Axis): Vec3 =>
    axis === 'x'
      ? { x: 0, y: HALF, z: 0 }
      : axis === 'y'
      ? { x: HALF, y: 0, z: 0 }
      : ZERO

  /** The axis before this one in x → y → z → x. */
  const previousAxis = (axis: Axis): Axis =>
    axis === 'x' ? 'z' : axis === 'y' ? 'x' : 'y'

  /** A vector that is `distance` along one axis and zero elsewhere. */
  const alongBy = (axis: Axis, distance: number): Vec3 => ({
    ...ZERO,
    [axis]: distance,
  })

  const build = (): void => {
    for (const h of handles) h.mesh.dispose()
    for (const m of materials) m.dispose()
    handles.length = 0
    materials.length = 0

    for (const axis of ['x', 'y', 'z'] as Axis[]) {
      const colour = AXIS_COLOR[axis]
      const grip = (kind: Grip['kind']): Grip => ({ kind, axis })

      if (transforms.translate) {
        add(grip('translate'), {
          part: 'shaft',
          colour,
          offset: alongBy(axis, SHAFT_OFFSET),
          spin: alongAxis(axis),
          make: (name, fat) =>
            squareTapered(name, {
              height: SHAFT_LENGTH,
              diameterTop: SHAFT_DIAMETER * (fat > 1 ? SHAFT_PICK_FATNESS : 1),
              diameterBottom:
                SHAFT_DIAMETER * (fat > 1 ? SHAFT_PICK_FATNESS : 1),
            }),
        })
        add(grip('translate'), {
          part: 'head',
          colour,
          offset: alongBy(axis, HEAD_OFFSET),
          spin: alongAxis(axis),
          make: (name, fat) =>
            squareTapered(name, {
              height: HEAD_LENGTH * (fat > 1 ? 1.5 : 1),
              diameterTop: 0,
              // Fattened much less than a shaft: it is already the widest thing
              // on the axis, and inflating it 5× would swallow the ring.
              diameterBottom: HEAD_DIAMETER * (fat > 1 ? 1.8 : 1),
            }),
        })
        /*
        The pad lies IN the plane it slides across — `facing` points its normal
        down the grip's axis — and is offset along the axis BEFORE the normal in
        x→y→z→x. That puts the three pads on three DIFFERENT axes; any rule that
        reuses an axis puts two pads at the same point in different planes,
        intersecting.
        */
        add(grip('planar'), {
          colour,
          alpha: 0.35,
          offset: alongBy(previousAxis(axis), -PAD_OFFSET),
          spin: facing(axis),
          make: (name, fat) =>
            MeshBuilder.CreatePlane(
              name,
              { size: PAD_SIZE * (fat > 1 ? 1.6 : 1) },
              scene
            ),
        })
      }

      if (transforms.rotate) {
        add(grip('rotate'), {
          colour,
          spin: ringOn(axis),
          make: (name, fat) =>
            quarterAnnulus(
              name,
              fat > 1 ? RING_INNER - RING_PICK_MARGIN : RING_INNER,
              fat > 1 ? RING_OUTER + RING_PICK_MARGIN : RING_OUTER,
              arcStart(axis)
            ),
        })
      }

      if (transforms.scale) {
        add(grip('scale'), {
          colour,
          offset: alongBy(axis, CUBE_OFFSET),
          make: (name, fat) =>
            MeshBuilder.CreateBox(
              name,
              { size: CUBE_SIZE * (fat > 1 ? 2.2 : 1) },
              scene
            ),
        })
      }
    }

    if (transforms.scale) {
      add(
        { kind: 'uniform' },
        {
          colour: NEUTRAL,
          make: (name, fat) =>
            MeshBuilder.CreateBox(
              name,
              { size: CENTRE_SIZE * (fat > 1 ? 2 : 1) },
              scene
            ),
        }
      )
    }

    place()
  }

  /*
  Position and orientation are decided at BUILD time and simply applied here.

  They used to be recomputed from the grip kind on every frame, which worked
  only while one kind meant exactly one mesh. An arrowhead is a second part of
  the same grip sitting at a different offset, and a switch on `kind` has no way
  to tell the two apart.
  */
  const place = (): void => {
    for (const { grip, mesh, offset, spin } of handles) {
      mesh.scaling.set(scale, scale, scale)
      mesh.rotation.set(spin.x, spin.y, spin.z)
      /*
      Scale cubes and rotation rings ride the OBJECT's frame — those are the
      axes they actually act on. Translate shafts and pads stay world-aligned,
      because a move is a world move.
      */
      const local =
        orientation != null && (grip.kind === 'scale' || grip.kind === 'rotate')
      const at = local ? rotated(offset, orientation!) : offset
      if (local) {
        // A quaternion, not euler: composing the object's turn with the grip's
        // own turn in euler would mean re-deriving Babylon's order by hand.
        mesh.rotationQuaternion = orientation!.multiply(
          Quaternion.RotationYawPitchRoll(spin.y, spin.x, spin.z)
        )
      } else {
        mesh.rotationQuaternion = null
      }
      mesh.position.set(
        position.x + at.x * scale,
        position.y + at.y * scale,
        position.z + at.z * scale
      )

      /*
      FORCE THE WORLD MATRIX. A mesh that has been positioned but not yet
      RENDERED has no world matrix, so a ray cast in the same frame finds it at
      the ORIGIN and answers confidently and wrongly.

      A manipulator is the worst possible case for that: it moves its handles
      and then immediately picks against them, so it can never wait for a render
      — and an editor's input loop deliberately runs even when the scene is
      paused. Measured, not assumed: without this, the handles picked as though
      they were at 0,0,0 while drawing correctly at the selection.
      */
      mesh.computeWorldMatrix(true)
    }
  }

  const gripOf = (mesh: unknown): Grip | null => {
    const meta = (mesh as { metadata?: Record<string, Grip> } | null)?.metadata
    return meta?.[HANDLE_TAG] ?? null
  }

  const isDrawn = (mesh: unknown): boolean =>
    (mesh as { metadata?: Record<string, unknown> } | null)?.metadata?.[
      DRAWN_TAG
    ] === true

  build()

  return {
    setTransforms(next) {
      if (
        next.translate === transforms.translate &&
        next.rotate === transforms.rotate &&
        next.scale === transforms.scale
      ) {
        return
      }
      transforms = { ...next }
      build()
    },
    moveTo(next) {
      position = next
      place()
    },
    setOrientation(rotation) {
      const next =
        rotation != null &&
        (rotation.rx !== 0 || rotation.ry !== 0 || rotation.rz !== 0)
          ? quatOf(rotation)
          : null
      const same =
        (next === null && orientation === null) ||
        (next !== null &&
          orientation !== null &&
          Quaternion.AreClose(next, orientation, 1e-4))
      // Per frame, like `setScale`: re-placing every mesh for an orientation
      // that has not changed is waste on the one loop that must not stutter.
      if (same) return
      orientation = next
      place()
    },
    setScale(next) {
      if (Math.abs(next - scale) < 1e-3) return
      scale = next
      place()
    },
    setVisible(visible) {
      // Pick targets stay at visibility 0 either way; only the drawn ones toggle.
      for (const { mesh } of handles) {
        if (mesh.visibility !== 0) mesh.isVisible = visible
      }
    },
    nearestGrip(hand) {
      let best: Grip | null = null
      /*
      A hand is a fixed size; the handles are not, since they track the camera
      to stay constant on screen. So reach is the LARGER of what a hand needs
      and what the handle actually occupies — scaling the hand radius with the
      handle would shrink the grab volume to a centimetre exactly when you are
      close enough to reach for it.
      */
      let bestDistance = Math.max(NEAR_RADIUS, 0.5 * scale)
      for (const { grip, mesh } of handles) {
        const d = Math.hypot(
          mesh.position.x - hand.x,
          mesh.position.y - hand.y,
          mesh.position.z - hand.z
        )
        if (d <= bestDistance) {
          bestDistance = d
          best = grip
        }
      }
      return best
    },
    gripAt(ray) {
      if (handles.length === 0) return null
      const r = new Ray(
        new Vector3(ray.origin.x, ray.origin.y, ray.origin.z),
        new Vector3(ray.direction.x, ray.direction.y, ray.direction.z)
      )
      // Pass one: what you AIMED at. A hit on drawn geometry is unambiguous.
      const drawn = scene.pickWithRay(r, (mesh) => isDrawn(mesh))
      const aimed = gripOf(drawn?.pickedMesh)
      if (aimed) return aimed
      // Pass two: what you were REACHING for.
      const hit = scene.pickWithRay(r, (mesh) => gripOf(mesh) != null)
      return gripOf(hit?.pickedMesh)
    },
    gripOf,
    isHandle(mesh) {
      return gripOf(mesh) != null
    },
    alive() {
      return handles.length > 0 && !handles[0]!.mesh.isDisposed()
    },
    dispose() {
      for (const { mesh } of handles) mesh.dispose()
      for (const m of materials) m.dispose()
      handles.length = 0
      materials.length = 0
    },
  }
}
