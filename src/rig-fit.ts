/*
FITTING A SKELETON TO A MESH FROM EIGHT MARKERS, as Mixamo's auto-rigger does
(board #3349). Someone drags chin, groin, wrists, elbows and knees onto a
FRONT view of a character standing in a T-pose (up +Y, facing +Z, its left
on +X); this places the UE mannequin's 65 joints (UAL's skeleton, so the
UAL clips play on it with no retargeting of names) inside the mesh.

Two halves, both pure:

- `meshQuery(positions, indices)` answers what a front view cannot: how
  deep the mesh is at a point. A ray along Z through (x, y) gives the spans
  inside the mesh, front first.
- `fitSkeleton(markers, mesh)` turns markers into joints. Five kinds of
  joint are where a marker says; the rest are inferred from the markers and
  the mesh (an ankle under its knee at the foot's height, a shoulder an
  upper arm's length in from the elbow). Fingers are found from ABOVE,
  where palm-down fingers show as separate prongs (`findFingers`). Every
  joint sits at the middle of the mesh's thickness at its (x, y), in the
  FRONT-MOST span, so a tail or a backpack behind the body is not mistaken
  for it.

The rest pose is the T-pose as drawn: every bone's local rotation is
identity and its position is its offset from its parent, so a bone points
at the next joint down its limb. `retarget` lines bones up by direction, not
by rotation, so that is all a clip needs.

Binding the mesh to the result (bone heat) and the marker panel come next.
*/

import type { RestBone } from './retarget.js'
import type { Vec3 } from './spatial-transform.js'

export interface Point2 {
  x: number
  y: number
}

export type MarkerName =
  | 'chin'
  | 'groin'
  | 'wristL'
  | 'wristR'
  | 'elbowL'
  | 'elbowR'
  | 'kneeL'
  | 'kneeR'

export const MARKER_NAMES: readonly MarkerName[] = [
  'chin',
  'groin',
  'wristL',
  'wristR',
  'elbowL',
  'elbowR',
  'kneeL',
  'kneeR',
]

/** Front-view positions, in the mesh's units. L is the character's left (+X). */
export type Markers = Record<MarkerName, Point2>

/** A run of a Z ray inside the mesh: `front` is the larger z. */
export interface Span {
  front: number
  back: number
}

export interface MeshQuery {
  min: Vec3
  max: Vec3
  /** Spans inside the mesh along a ray through (x, y), front first. */
  spans(x: number, y: number): Span[]
  /**
   * The same mesh looked at from ABOVE: `spans(x, -z)` gives the spans of a
   * vertical ray through (x, z), top first (`front` is the higher y). Built
   * when first asked for. How the fingers are found: palm down in a T-pose,
   * they are separate only from above.
   */
  fromAbove?(): MeshQuery
  /**
   * The same mesh turned `angle` radians about the Z axis through
   * (`cx`, `cy`) (positive turns +X toward +Y). How a hanging hand is read:
   * turned level, palm-in becomes palm-down.
   */
  turnedAboutZ?(
    angle: number,
    cx: number,
    cy: number,
    crop?: HandCrop
  ): MeshQuery
}

/**
 * Only the part of a mesh beyond a point along a direction (in the front
 * view), within `radius` of it, and joined to it there: a hand on its own,
 * without the thigh it hangs beside.
 */
export interface HandCrop {
  from: Vec3
  along: Point2
  radius: number
}

/**
 * A mesh you can ask how deep it is, from a triangle soup (positions xyz,
 * indices in threes). Ray casts are bucketed on a grid over the front view.
 */
export function meshQuery(
  positions: ArrayLike<number>,
  indices: ArrayLike<number>
): MeshQuery {
  const min = { x: Infinity, y: Infinity, z: Infinity }
  const max = { x: -Infinity, y: -Infinity, z: -Infinity }
  for (let i = 0; i + 2 < positions.length; i += 3) {
    const x = positions[i]
    const y = positions[i + 1]
    const z = positions[i + 2]
    if (!Number.isFinite(x + y + z)) continue
    min.x = Math.min(min.x, x)
    min.y = Math.min(min.y, y)
    min.z = Math.min(min.z, z)
    max.x = Math.max(max.x, x)
    max.y = Math.max(max.y, y)
    max.z = Math.max(max.z, z)
  }
  const N = 64
  const cw = (max.x - min.x) / N || 1
  const ch = (max.y - min.y) / N || 1
  const cells: number[][] = Array.from({ length: N * N }, () => [])
  const cell = (v: number, lo: number, size: number) =>
    Math.max(0, Math.min(N - 1, Math.floor((v - lo) / size)))
  const tris = Math.floor(indices.length / 3)
  for (let t = 0; t < tris; t++) {
    let x0 = Infinity
    let x1 = -Infinity
    let y0 = Infinity
    let y1 = -Infinity
    let ok = true
    for (let k = 0; k < 3; k++) {
      const i = indices[t * 3 + k] * 3
      const x = positions[i]
      const y = positions[i + 1]
      if (!Number.isFinite(x + y + positions[i + 2])) ok = false
      x0 = Math.min(x0, x)
      x1 = Math.max(x1, x)
      y0 = Math.min(y0, y)
      y1 = Math.max(y1, y)
    }
    if (!ok) continue
    for (let cy = cell(y0, min.y, ch); cy <= cell(y1, min.y, ch); cy++)
      for (let cx = cell(x0, min.x, cw); cx <= cell(x1, min.x, cw); cx++)
        cells[cy * N + cx].push(t)
  }
  const hit = (t: number, x: number, y: number): number | null => {
    const a = indices[t * 3] * 3
    const b = indices[t * 3 + 1] * 3
    const c = indices[t * 3 + 2] * 3
    const ax = positions[a]
    const ay = positions[a + 1]
    const bx = positions[b]
    const by = positions[b + 1]
    const cx = positions[c]
    const cy = positions[c + 1]
    const d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
    if (Math.abs(d) < 1e-14) return null
    const u = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / d
    const v = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / d
    const w = 1 - u - v
    const e = -1e-9
    if (u < e || v < e || w < e) return null
    return u * positions[a + 2] + v * positions[b + 2] + w * positions[c + 2]
  }
  let above: MeshQuery | null = null
  return {
    min,
    max,
    fromAbove() {
      if (above == null) {
        // (x, y, z) → (x, -z, y): a ray along the new Z is vertical.
        const p = Array.from(positions)
        for (let i = 0; i + 2 < p.length; i += 3) {
          const y = p[i + 1]
          p[i + 1] = -p[i + 2]
          p[i + 2] = y
        }
        above = meshQuery(p, indices)
      }
      return above
    },
    turnedAboutZ(angle, cx, cy, crop) {
      const c = Math.cos(angle)
      const sn = Math.sin(angle)
      const p = Array.from(positions)
      const kept = crop != null ? cropped(positions, indices, crop) : indices
      for (let i = 0; i + 2 < p.length; i += 3) {
        const x = p[i] - cx
        const y = p[i + 1] - cy
        p[i] = cx + c * x - sn * y
        p[i + 1] = cy + sn * x + c * y
      }
      return meshQuery(p, kept)
    },
    spans(x, y) {
      if (x < min.x || x > max.x || y < min.y || y > max.y) return []
      /*
      OFF THE SEAM: a symmetric model has a row of edges at x = 0, exactly
      where the chin and groin markers go. A ray along an edge can slip
      between its two triangles, one hit goes missing, and every span after
      it pairs a back with the next front (the pelvis landed in the tail).
      A nudge far below anything visible keeps rays off edges.
      */
      x += (max.x - min.x) * 7.3e-6
      y += (max.y - min.y) * 3.1e-6
      const zs: number[] = []
      for (const t of cells[cell(y, min.y, ch) * N + cell(x, min.x, cw)]) {
        const z = hit(t, x, y)
        if (z != null) zs.push(z)
      }
      zs.sort((a, b) => b - a)
      // A ray through a shared edge hits both triangles: count it once.
      const eps = (max.z - min.z) * 1e-6
      const uniq = zs.filter((z, i) => i === 0 || zs[i - 1] - z > eps)
      const out: Span[] = []
      for (let i = 0; i + 1 < uniq.length; i += 2)
        out.push({ front: uniq[i], back: uniq[i + 1] })
      // An odd count (an open mesh): the last hit is a thin wall.
      if (uniq.length % 2 === 1) {
        const z = uniq[uniq.length - 1]
        out.push({ front: z, back: z })
      }
      return out
    },
  }
}

/** One joint of a fitted skeleton, in the mesh's space. */
export interface FittedJoint {
  name: string
  parent: string | null
  position: Vec3
  /** For a joint with nothing below it: where its bone ends. */
  end?: Vec3
}

export interface FittedRig {
  joints: FittedJoint[]
  /**
   * The fingers found in the mesh, per side (`thumb`, `index`, …): those
   * joints sit on real fingers and take the skin. Fingers not listed were
   * placed by proportion (a mitten, or no view from above) and do not.
   */
  fingers?: Record<'l' | 'r', string[]>
  /** A joint's position by name. */
  at(name: string): Vec3 | undefined
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const add = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.x + b.x,
  y: a.y + b.y,
  z: a.z + b.z,
})
const scale = (a: Vec3, k: number): Vec3 => ({
  x: a.x * k,
  y: a.y * k,
  z: a.z * k,
})
const minus = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.x - b.x,
  y: a.y - b.y,
  z: a.z - b.z,
})
const along = (a: Vec3, b: Vec3, t: number): Vec3 =>
  add(a, scale(minus(b, a), t))

/**
 * Place UAL's skeleton in a mesh from eight front-view markers. Joints the
 * markers do not fix are inferred; see the comment at the top of this file.
 */
export interface FitOptions {
  /**
   * Where a tail ends, in 3D: a front view cannot see a tail (it points
   * away), so the tip is placed from the side. The chain runs from the back
   * of the pelvis to it, `tailBones` long (default 5), named `tail_01` …
   * `tail_leaf`.
   */
  tail?: Vec3
  tailBones?: number
  /** Where the tail starts (its first joint), if not the back of the pelvis. */
  tailStart?: Vec3
}

export function fitSkeleton(
  markers: Markers,
  mesh: MeshQuery,
  options: FitOptions = {}
): FittedRig {
  const floor = mesh.min.y
  const zMid = (mesh.min.z + mesh.max.z) / 2

  // The middle of the front-most span at (x, y), or `fallback` if the ray
  // misses (a marker dropped just off the silhouette).
  const depth = (x: number, y: number, fallback = zMid): number => {
    const s = mesh.spans(x, y)[0]
    return s != null ? (s.front + s.back) / 2 : fallback
  }
  const inside = (x: number, y: number) => mesh.spans(x, y).length > 0
  const at = (p: Point2, fallback?: number): Vec3 => ({
    x: p.x,
    y: p.y,
    z: depth(p.x, p.y, fallback),
  })

  const joints: FittedJoint[] = []
  const byName = new Map<string, FittedJoint>()
  const put = (
    name: string,
    parent: string | null,
    position: Vec3,
    end?: Vec3
  ) => {
    const j: FittedJoint = { name, parent, position, end }
    joints.push(j)
    byName.set(name, j)
    return position
  }

  const { chin, groin } = markers
  const torso = chin.y - groin.y
  const cx = groin.x

  /*
  THE TORSO'S DEPTH. Where a tail grows out of the back it is one span with
  the body, and that span's middle is inside the tail. So measure how thick
  the body usually is up the centre (the median, which a tail at a few
  heights cannot move) and never put the spine further back from the front
  than half of that.
  */
  /*
  And a tail can hang BELOW the body: in the notch between the legs, a ray
  at hip height may meet only the tail. So the torso also has a usual front
  (the median again); of the spans a ray meets, the body's is the one whose
  front is nearest that, and if none is near, the body is not there and the
  joint goes on its usual line.
  */
  const halves: number[] = []
  const fronts: number[] = []
  for (let i = 0; i <= 24; i++) {
    const y = lerp(groin.y, chin.y, i / 24)
    const s = mesh.spans(lerp(cx, chin.x, i / 24), y)[0]
    if (s == null) continue
    halves.push((s.front - s.back) / 2)
    fronts.push(s.front)
  }
  const median = (list: number[], none: number) =>
    list.length > 0 ? list.sort((a, b) => a - b)[list.length >> 1] : none
  const half = median(halves, Infinity)
  const front = median(fronts, zMid)
  const torsoDepth = (x: number, y: number, fallback = zMid): number => {
    if (!Number.isFinite(half)) return fallback
    let best: Span | null = null
    for (const s of mesh.spans(x, y))
      if (
        best == null ||
        Math.abs(s.front - front) < Math.abs(best.front - front)
      )
        best = s
    if (best == null || Math.abs(best.front - front) > 2 * half)
      return front - half
    return best.front - Math.min((best.front - best.back) / 2, half)
  }

  // The body: pelvis a little above the crotch, neck under the chin.
  const pelvisY = groin.y + 0.08 * torso
  const pelvis = { x: cx, y: pelvisY, z: torsoDepth(cx, pelvisY) }
  put('root', null, { x: cx, y: floor, z: pelvis.z })
  put('pelvis', 'root', pelvis)
  const armY = (markers.elbowL.y + markers.elbowR.y) / 2
  const neckY = Math.max(lerp(groin.y, chin.y, 0.82), Math.min(armY, chin.y))
  const neckZ = torsoDepth(chin.x, neckY, pelvis.z)
  const neck = { x: lerp(cx, chin.x, 0.8), y: neckY, z: neckZ }
  const spineAt = (t: number) => {
    const y = lerp(pelvisY, neckY, t)
    const x = lerp(cx, neck.x, t)
    return { x, y, z: torsoDepth(x, y, pelvis.z) }
  }
  put('spine_01', 'pelvis', spineAt(0.25))
  put('spine_02', 'spine_01', spineAt(0.5))
  const chest = put('spine_03', 'spine_02', spineAt(0.75))
  put('neck_01', 'spine_03', neck)
  // The head joint is the head's base, at the chin; its bone runs up to the
  // top of the head straight above it.
  const headBase = {
    x: chin.x,
    y: chin.y,
    z: depth(chin.x, chin.y - 0.02 * torso, neckZ),
  }
  let top = chin.y
  const step = (mesh.max.y - floor) / 400
  for (let y = chin.y; y <= mesh.max.y; y += step)
    if (inside(chin.x, y)) top = y
  put('Head', 'neck_01', headBase, { x: chin.x, y: top, z: headBase.z })

  const fingersFound: Record<'l' | 'r', string[]> = { l: [], r: [] }
  for (const side of ['l', 'r'] as const) {
    const S = side === 'l' ? 'L' : 'R'
    const sign = side === 'l' ? 1 : -1

    // The arm: wrist and elbow as marked, the shoulder an upper arm's
    // length in from the elbow (taken as the forearm's length), but never
    // nearer the middle than a quarter of the elbow's reach.
    const wrist2 = markers[`wrist${S}`]
    const elbow2 = markers[`elbow${S}`]
    const fore = { x: elbow2.x - wrist2.x, y: elbow2.y - wrist2.y }
    let sh = { x: elbow2.x + fore.x, y: elbow2.y + fore.y }
    const minOut = 0.25 * (elbow2.x - cx)
    if (sign * (sh.x - cx) < sign * minOut) {
      // Slide back along the same line to the limit.
      const t = (cx + minOut - elbow2.x) / (fore.x || 1e-9)
      sh = { x: elbow2.x + fore.x * t, y: elbow2.y + fore.y * t }
    }
    const shoulder = at(sh, chest.z)
    const clav = {
      x: lerp(neck.x, shoulder.x, 0.15),
      y: lerp(chest.y, shoulder.y, 0.7),
      z: lerp(chest.z, shoulder.z, 0.5),
    }
    put(`clavicle_${side}`, 'spine_03', clav)
    put(`upperarm_${side}`, `clavicle_${side}`, shoulder)
    const elbow = put(
      `lowerarm_${side}`,
      `upperarm_${side}`,
      at(elbow2, shoulder.z)
    )
    const wrist = put(`hand_${side}`, `lowerarm_${side}`, at(wrist2, elbow.z))

    /*
    A HANGING HAND IS READ TURNED LEVEL. Fingers are found from above, on a
    hand held out palm-down; a hand hanging at the side (an A-pose) is
    palm-in, and from above it is a blob, so its fingers were placed by
    proportion and fanned out across ten centimetres (Tonio: twisted hands
    on Blender's bodies). Turned about the front-to-back axis until the
    forearm is level, a palm-in hand IS palm-down: the mesh is turned about
    the wrist, read exactly as a T-pose hand is, and the joints turned back.
    */
    const hangs =
      mesh.turnedAboutZ != null &&
      Math.abs(wrist2.y - elbow2.y) > Math.abs(wrist2.x - elbow2.x)
    const turn = hangs
      ? Math.atan2(0, sign) - Math.atan2(wrist2.y - elbow2.y, wrist2.x - elbow2.x)
      : 0
    const turnPoint = <T extends Point2>(p: T, a: number): T => {
      const c = Math.cos(a)
      const sn = Math.sin(a)
      const x = p.x - wrist.x
      const y = p.y - wrist.y
      return { ...p, x: wrist.x + c * x - sn * y, y: wrist.y + sn * x + c * y }
    }
    // The hand alone: beyond the wrist, within a forearm's length of it.
    const foreLen = Math.hypot(wrist2.x - elbow2.x, wrist2.y - elbow2.y)
    const hm = hangs
      ? mesh.turnedAboutZ!(turn, wrist.x, wrist.y, {
          from: wrist,
          along: { x: wrist2.x - elbow2.x, y: wrist2.y - elbow2.y },
          radius: foreLen,
        })
      : mesh
    const hInside = (x: number, y: number) => hm.spans(x, y).length > 0
    const hw2 = turnPoint(wrist2, turn)
    const he2 = turnPoint(elbow2, turn)
    const hw = turnPoint(wrist, turn)
    const putHand = (name: string, parent: string, p: Vec3) =>
      put(name, parent, turnPoint(p, -turn))
    // The hand: walk on from the wrist until the ray leaves the mesh.
    const dir = { x: hw2.x - he2.x, y: hw2.y - he2.y }
    const dl = Math.hypot(dir.x, dir.y) || 1
    const ux = dir.x / dl
    const uy = dir.y / dl
    let reach = 0
    for (let d = 0; d < 2 * dl + (hm.max.x - hm.min.x); d += step) {
      if (hInside(hw2.x + ux * d, hw2.y + uy * d)) reach = d
      else if (d > reach + 4 * step) break
    }
    reach = Math.max(reach, 0.25 * dl)
    const tip = {
      x: hw2.x + ux * reach,
      y: hw2.y + uy * reach,
      z: hw.z,
    }
    // Palm down in a T-pose, so the hand's width runs along Z: thumb and
    // index to the front, pinky to the back.
    const palm2 = {
      x: hw2.x + ux * reach * 0.35,
      y: hw2.y + uy * reach * 0.35,
    }
    const ps = hm.spans(palm2.x, palm2.y)[0]
    const half = ps != null ? (ps.front - ps.back) / 2 : 0.15 * reach
    const palmZ = ps != null ? (ps.front + ps.back) / 2 : hw.z
    /*
    THE FINGERS THE MESH HAS, found from above (Tonio: the skinny weasel has
    three fingers and a thumb, and they were not rigged). A finger is placed
    joint by joint along the real one and takes the skin; one the mesh does
    not show is placed by proportion, as before, and takes none.
    */
    const above = hm.fromAbove?.()
    let found = above != null ? findFingers(above, hw, sign, reach) : null
    // No separate fingers: one mitten or claw, and a thumb without a gap.
    if (above != null && (found == null || found.fingers.length === 0)) {
      const m = findMitten(hm, above, hw, sign, reach)
      if (m != null)
        found = { fingers: [m.mitten], thumb: found?.thumb ?? m.thumb }
    }
    const real: string[] = []
    const chain = (f: string, pts: Vec3[]) => {
      putHand(`${f}_01_${side}`, `hand_${side}`, pts[0])
      putHand(`${f}_02_${side}`, `${f}_01_${side}`, pts[1])
      putHand(`${f}_03_${side}`, `${f}_02_${side}`, pts[2])
      putHand(`${f}_04_leaf_${side}`, `${f}_03_${side}`, pts[3])
    }
    const names = found != null ? FINGER_NAMES[found.fingers.length] ?? [] : []
    const fingers: Array<[string, number]> = [
      ['index', 0.6],
      ['middle', 0.2],
      ['ring', -0.2],
      ['pinky', -0.6],
    ]
    /*
    A FINGER THE MESH DOES NOT SHOW, BESIDE ONES IT DOES, lies on the nearest
    real one. Placed by proportion it went across the palm's span, and that
    span includes the thumb: omnidude's mitten is his index, so his made-up
    middle finger sat beside the thumb, 42° off the hand's line, and the
    retarget, which aims a hand by its middle finger, turned the whole hand by
    that much (a hook at the wrist, Tonio #3468). It takes no skin either way.
    */
    const shown = fingers.filter(([f]) => names.includes(f))
    for (const [f, off] of fingers) {
      const k = names.indexOf(f)
      if (k >= 0) {
        chain(f, found!.fingers[k])
        real.push(f)
        continue
      }
      if (shown.length > 0) {
        const [near] = shown.reduce((a, b) =>
          Math.abs(b[1] - off) < Math.abs(a[1] - off) ? b : a
        )
        chain(f, found!.fingers[names.indexOf(near)])
        continue
      }
      const z = palmZ + off * half
      const base = {
        x: lerp(hw.x, tip.x, 0.45),
        y: lerp(hw.y, tip.y, 0.45),
        z,
      }
      const end = { x: tip.x, y: tip.y, z }
      chain(f, [base, along(base, end, 0.4), along(base, end, 0.7), end])
    }
    if (found?.thumb != null) {
      chain('thumb', found.thumb)
      real.push('thumb')
    } else {
      const base = {
        x: lerp(hw.x, tip.x, 0.12),
        y: lerp(hw.y, tip.y, 0.12),
        z: palmZ + 0.5 * half,
      }
      const end = {
        x: lerp(hw.x, tip.x, 0.6),
        y: lerp(hw.y, tip.y, 0.6),
        z: palmZ + 1.6 * half,
      }
      chain('thumb', [base, along(base, end, 0.4), along(base, end, 0.7), end])
    }
    fingersFound[side] = real

    // The leg: the hip above the knee at pelvis height (a little in, as
    // legs splay), the ankle under the knee, the toes forward of it.
    const knee2 = markers[`knee${S}`]
    const hipX = lerp(knee2.x, cx, 0.1)
    const hipY = pelvisY - 0.04 * torso
    const hip = { x: hipX, y: hipY, z: torsoDepth(hipX, hipY, pelvis.z) }
    put(`thigh_${side}`, 'pelvis', hip)
    const knee = put(`calf_${side}`, `thigh_${side}`, at(knee2, hip.z))
    const ankleY = floor + 0.28 * (knee2.y - floor)
    /*
    THE FOOT WHERE IT IS, not under the knee. Legs angle in and feet turn
    out (Blender's base meshes: the ray under the knee missed the foot, the
    toe fell back to just in front of the ankle, the foot bone pointed down,
    and every clip turned the foot through 90°). The ankle is the middle of
    the leg's run across the front view at its height; the toe is the
    farthest-forward point of the foot's run near the ground.
    */
    const ankleRun = runAcross(mesh, ankleY, knee2.x, sign)
    const ankle = put(
      `foot_${side}`,
      `calf_${side}`,
      at({ x: ankleRun != null ? (ankleRun.lo + ankleRun.hi) / 2 : knee2.x, y: ankleY }, knee.z)
    )
    // The foot reaches forward: the front of the mesh near the ground.
    const soleY = floor + 0.15 * (ankleY - floor)
    const footRun = runAcross(mesh, soleY, ankle.x, sign)
    let toe = { x: ankle.x, z: ankle.z + 0.5 * (ankleY - floor) }
    if (footRun != null) {
      let best = -Infinity
      const step = Math.max((footRun.hi - footRun.lo) / 24, 1e-4)
      for (let x = footRun.lo; x <= footRun.hi + 1e-9; x += step) {
        const f = mesh.spans(x, soleY)[0]?.front
        if (f != null && f > best) {
          best = f
          toe = { x, z: f }
        }
      }
    }
    /*
    THE BALL IN THE MIDDLE OF THE FOOT'S THICKNESS, as UAL's is (1.5 cm up
    a 3 cm foot). At a fixed 30% of the ankle's height it sat on the top of
    the Blender bodies' feet, and every clip curled the toes up.
    */
    const ballX = lerp(ankle.x, toe.x, 0.65)
    const ballZ = lerp(ankle.z, toe.z, 0.65)
    let top = floor
    const rise = Math.max((ankleY - floor) / 60, 1e-4)
    for (let y = floor; y <= ankleY; y += rise)
      if (mesh.spans(ballX, y).some((s) => s.back <= ballZ && s.front >= ballZ)) top = y
    const ballY = top > floor ? (floor + top) / 2 : floor + 0.15 * (ankleY - floor)
    put(`ball_${side}`, `foot_${side}`, { x: ballX, y: ballY, z: ballZ })
    put(`ball_leaf_${side}`, `ball_${side}`, { x: toe.x, y: ballY, z: toe.z })
  }

  if (options.tail != null) {
    // From the back of the pelvis (half the body's depth toward the tip).
    const tip = options.tail
    const d = minus(tip, pelvis)
    const len = Math.hypot(d.x, d.y, d.z)
    if (len > 1e-9) {
      const start =
        options.tailStart ??
        add(
          pelvis,
          scale(d, Math.min(0.9, (Number.isFinite(half) ? half : 0) / len))
        )
      const count = Math.max(1, Math.round(options.tailBones ?? 5))
      let parent = 'pelvis'
      for (let i = 0; i <= count; i++) {
        const name =
          i < count ? `tail_${String(i + 1).padStart(2, '0')}` : 'tail_leaf'
        put(name, parent, along(start, tip, i / count))
        parent = name
      }
    }
  }

  return {
    joints,
    at: (name) => byName.get(name)?.position,
    fingers: fingersFound,
  }
}

/**
 * The run of the mesh across the front view at height `y` nearest `x`, on
 * its side of the middle (`sign`: +1 the left, on +X), or null if none is
 * within 15% of the mesh's width.
 */
function runAcross(
  mesh: MeshQuery,
  y: number,
  x: number,
  sign: number
): { lo: number; hi: number } | null {
  const width = mesh.max.x - mesh.min.x
  const step = width / 400
  const inside = (u: number) => u * sign > 0 && mesh.spans(u, y).length > 0
  let start: number | null = null
  for (let d = 0; d <= 0.15 * width && start == null; d += step)
    for (const u of [x + d, x - d]) if (start == null && inside(u)) start = u
  if (start == null) return null
  let lo = start
  let hi = start
  while (inside(lo - step)) lo -= step
  while (inside(hi + step)) hi += step
  return { lo, hi }
}

/**
 * The triangles of a `HandCrop`: every corner near enough and beyond the
 * point, and of those, the ones joined (through shared corners, welded by
 * position) to the corner nearest the point.
 */
function cropped(
  positions: ArrayLike<number>,
  indices: ArrayLike<number>,
  crop: HandCrop
): number[] {
  const { from, along, radius } = crop
  const al = Math.hypot(along.x, along.y) || 1
  const ok = (v: number) => {
    const x = positions[v * 3] - from.x
    const y = positions[v * 3 + 1] - from.y
    const z = positions[v * 3 + 2] - from.z
    return (
      Math.hypot(x, y, z) <= radius &&
      (x * along.x + y * along.y) / al >= -0.1 * radius
    )
  }
  const weld = new Map<string, number>()
  const id = (v: number) => {
    const k = `${Math.round(positions[v * 3] * 1e5)},${Math.round(
      positions[v * 3 + 1] * 1e5
    )},${Math.round(positions[v * 3 + 2] * 1e5)}`
    let w = weld.get(k)
    if (w == null) weld.set(k, (w = weld.size))
    return w
  }
  const tris: number[] = []
  for (let t = 0; t + 2 < indices.length; t += 3)
    if (ok(indices[t]) && ok(indices[t + 1]) && ok(indices[t + 2])) tris.push(t)
  // Union the welded corners of each kept triangle.
  const parent: number[] = []
  const find = (a: number): number => {
    while (parent[a] !== a) a = parent[a] = parent[parent[a]]
    return a
  }
  const ids = tris.map((t) => [0, 1, 2].map((k) => id(indices[t + k])))
  for (let i = 0; i < weld.size; i++) parent[i] = i
  for (const [a, b, c] of ids) {
    parent[find(b)] = find(a)
    parent[find(c)] = find(a)
  }
  // The piece holding the corner nearest the point.
  let near = -1
  let best = Infinity
  tris.forEach((t, i) => {
    const v = indices[t]
    const d = Math.hypot(
      positions[v * 3] - from.x,
      positions[v * 3 + 1] - from.y,
      positions[v * 3 + 2] - from.z
    )
    if (d < best) {
      best = d
      near = find(ids[i][0])
    }
  })
  const out: number[] = []
  tris.forEach((t, i) => {
    if (find(ids[i][0]) === near) out.push(indices[t], indices[t + 1], indices[t + 2])
  })
  return out
}

/** Which UAL fingers a hand of n fingers uses, front (thumb side) first. */
const FINGER_NAMES: Record<number, string[]> = {
  1: ['index'],
  2: ['index', 'middle'],
  3: ['index', 'middle', 'ring'],
  4: ['index', 'middle', 'ring', 'pinky'],
}

/*
FINDING FINGERS FROM ABOVE. Palm down in a T-pose, a hand seen from above is
a palm with prongs. Slices across the hand, from the fingertips back toward
the wrist, each cut the fingers as separate runs; where two runs join, those
fingers have reached the palm (their knuckles). A prong that starts near the
wrist and reaches forward is the thumb.

Each finger's four joints run from a little behind where it leaves the palm
to its tip, following its middle line, each at the middle of the finger's
thickness. Returns null for a hand with no separate fingers (a mitten), so
the caller falls back to proportions.
*/
function findFingers(
  above: MeshQuery,
  wrist: Vec3,
  sign: number,
  reach: number
): { fingers: Vec3[][]; thumb: Vec3[] | null } | null {
  // The front view's reach can stop short (a gap between fingers), so look
  // well past it; nothing beyond the hand is in reach of a T-posed arm.
  const h = reach / 150
  const zLo = wrist.z - 1.5 * reach
  const zHi = wrist.z + 1.5 * reach
  const dMax = reach * 2.5
  const occupied = (d: number, z: number) =>
    above.spans(wrist.x + sign * d, -z).length > 0
  const midY = (d: number, z: number, fallback: number) => {
    const s = above.spans(wrist.x + sign * d, -z)[0]
    return s != null ? (s.front + s.back) / 2 : fallback
  }
  type Run = { z0: number; z1: number }
  const runsAt = (d: number): Run[] => {
    const out: Run[] = []
    let start: number | null = null
    for (let z = zLo; z <= zHi + h / 2; z += h) {
      const on = z <= zHi && occupied(d, z)
      if (on && start == null) start = z
      else if (!on && start != null) {
        out.push({ z0: start, z1: z - h })
        start = null
      }
    }
    return out
  }
  interface Prong {
    tipD: number
    baseD: number | null
    path: Array<{ d: number; z0: number; z1: number }>
    alive: boolean
    merged: boolean
  }
  const prongs: Prong[] = []
  const overlaps = (r: Run, p: Prong) => {
    const last = p.path[p.path.length - 1]
    return r.z0 <= last.z1 + 1.5 * h && r.z1 >= last.z0 - 1.5 * h
  }
  for (let d = dMax; d >= 0; d -= h) {
    const runs = runsAt(d)
    const alive = prongs.filter((p) => p.alive)
    const claimed = new Set<Prong>()
    for (const r of runs) {
      const hit = alive.filter((p) => overlaps(r, p))
      if (hit.length === 0) {
        prongs.push({
          tipD: d,
          baseD: null,
          path: [{ d, ...r }],
          alive: true,
          merged: false,
        })
      } else if (hit.length === 1) {
        hit[0].path.push({ d, ...r })
        claimed.add(hit[0])
      } else {
        // Fingers joining: they have reached the palm.
        for (const p of hit) {
          p.alive = false
          p.baseD = d
          claimed.add(p)
        }
        prongs.push({
          tipD: d,
          baseD: null,
          path: [{ d, ...r }],
          alive: true,
          merged: true,
        })
      }
    }
    for (const p of alive) if (!claimed.has(p)) p.alive = false
  }
  const tipD = Math.max(...prongs.map((p) => p.tipD), 0)
  const line = (p: Prong, d: number) => {
    let best = p.path[0]
    for (const q of p.path)
      if (Math.abs(q.d - d) < Math.abs(best.d - d)) best = q
    return (best.z0 + best.z1) / 2
  }
  const point = (d: number, z: number, fallbackY: number): Vec3 => ({
    x: wrist.x + sign * d,
    y: midY(d, z, fallbackY),
    z,
  })
  const fingers = prongs
    .filter(
      (p) =>
        !p.merged &&
        p.baseD != null &&
        p.tipD > 0.55 * tipD &&
        p.tipD - p.baseD > 0.08 * reach
    )
    .map((p) => {
      const len = p.tipD - p.baseD!
      const base = Math.max(0, p.baseD! - 0.2 * len)
      const ds = [
        base,
        base + 0.45 * (p.tipD - base),
        base + 0.75 * (p.tipD - base),
        p.tipD - h,
      ]
      return {
        z: line(p, p.tipD),
        joints: ds.map((d) =>
          point(d, line(p, Math.max(d, p.baseD!)), wrist.y)
        ),
      }
    })
    .sort((a, b) => b.z - a.z)
    .slice(0, 4)
  // The palm's front edge, part way to the tips: the run the wrist is in.
  const palmRuns = runsAt(0.5 * tipD)
  const palm =
    palmRuns.find((r) => r.z0 <= wrist.z + h && r.z1 >= wrist.z - h) ??
    palmRuns[0]
  const palmFront = Math.max(palm?.z1 ?? wrist.z, ...fingers.map((f) => f.z))
  const thumbs = prongs.filter(
    (p) =>
      !p.merged &&
      p.tipD <= 0.55 * tipD &&
      Math.max(...p.path.map((q) => q.z1)) > palmFront
  )
  let thumb: Vec3[] | null = null
  if (thumbs.length > 0) {
    const t = thumbs.reduce((a, b) =>
      Math.max(...a.path.map((q) => q.z1)) >=
      Math.max(...b.path.map((q) => q.z1))
        ? a
        : b
    )
    // Its tip is the point furthest forward; its base, the part of it
    // nearest the palm (it may point back toward the wrist as well).
    let tipQ = t.path[0]
    let baseQ = t.path[0]
    for (const q of t.path) {
      if (q.z1 > tipQ.z1) tipQ = q
      if (q.z0 < baseQ.z0) baseQ = q
    }
    const b = point(baseQ.d, Math.min(baseQ.z0, palmFront), wrist.y)
    const e = point(tipQ.d, tipQ.z1 - h, wrist.y)
    const mid = (k: number) => {
      const p = along(b, e, k)
      return point(sign * (p.x - wrist.x), p.z, p.y)
    }
    thumb = [b, mid(0.4), mid(0.7), e]
  }
  if (fingers.length === 0 && thumb == null) return null
  return { fingers: fingers.map((f) => f.joints), thumb }
}

/*
A MITTEN OR A CLAW: a hand with no fingers apart (the space marine's hooked
claw, a mitten). Seen from above it is one blob, so `findFingers` finds no
prongs. Instead its middle line is followed slice by slice outward from the
wrist: each slice across the arm (x fixed) gives the middle of the flesh in
height and depth, so a claw that hooks down is followed down. That line is
one finger (the index, as Mixamo's mittens have), from where the hand narrows
past the palm to its tip.

A thumb that grows straight out of the palm's front edge has no gap to show
it from above either; it is a BUMP on that edge: the slices whose front
stands well out past the palm's usual front.
*/
function findMitten(
  front: MeshQuery,
  above: MeshQuery,
  wrist: Vec3,
  sign: number,
  reach: number
): { mitten: Vec3[]; thumb: Vec3[] | null } | null {
  const h = reach / 60
  // The middle of the flesh across one slice: rows of the front view.
  const across = (d: number): { y: number; z: number; n: number } | null => {
    const x = wrist.x + sign * d
    let sy = 0
    let sz = 0
    let n = 0
    for (let y = wrist.y - 2 * reach; y <= wrist.y + reach; y += h)
      for (const sp of front.spans(x, y)) {
        // Only flesh near the wrist's depth (not a leg the arm hangs by).
        const mid = (sp.front + sp.back) / 2
        if (Math.abs(mid - wrist.z) > 1.5 * reach) continue
        const w = sp.front - sp.back
        sy += y * w
        sz += mid * w
        n += w
      }
    return n > 0 ? { y: sy / n, z: sz / n, n } : null
  }
  const slices: Array<{ d: number; y: number; z: number; n: number }> = []
  for (let d = 0; d <= 2.5 * reach; d += h) {
    const c = across(d)
    if (c == null) {
      if (slices.length > 0) break
      continue
    }
    slices.push({ d, ...c })
  }
  if (slices.length < 6) return null
  const last = slices[slices.length - 1]
  const extent = last.d
  /** The middle line's point at distance d out from the wrist. */
  const mid = (d: number): Vec3 => {
    let best = slices[0]
    for (const q of slices)
      if (Math.abs(q.d - d) < Math.abs(best.d - d)) best = q
    return { x: wrist.x + sign * best.d, y: best.y, z: best.z }
  }
  const mitten = [0.45, 0.65, 0.82, 1].map((k) => mid(k * extent))

  // The thumb: from above, how far forward the hand's front edge stands.
  const frontAt = (d: number): number | null => {
    let best: number | null = null
    for (let z = wrist.z - 1.5 * reach; z <= wrist.z + 1.5 * reach; z += h)
      if (above.spans(wrist.x + sign * d, -z).length > 0) best = z
    return best
  }
  const edges = slices
    .filter((q) => q.d <= 0.8 * extent)
    .map((q) => ({ d: q.d, z: frontAt(q.d) }))
    .filter((e): e is { d: number; z: number } => e.z != null)
  if (edges.length < 4) return { mitten, thumb: null }
  const sorted = edges.map((e) => e.z).sort((a, b) => a - b)
  const usual = sorted[Math.floor(sorted.length / 2)]
  const peak = edges.reduce((a, b) => (b.z > a.z ? b : a))
  let thumb: Vec3[] | null = null
  if (peak.z - usual > 0.15 * reach) {
    const yAt = (d: number, z: number) => {
      const sp = above.spans(wrist.x + sign * d, -z)[0]
      return sp != null ? (sp.front + sp.back) / 2 : wrist.y
    }
    const base = { x: wrist.x + sign * peak.d, y: yAt(peak.d, usual), z: usual }
    const tipZ = peak.z - h
    const tip = { x: wrist.x + sign * peak.d, y: yAt(peak.d, tipZ), z: tipZ }
    const at = (k: number) => {
      const z = lerp(base.z, tip.z, k)
      return { x: base.x, y: yAt(peak.d, z), z }
    }
    // Rooted a little inside the palm, as a thumb's first joint is.
    const root = { ...base, z: lerp(usual, wrist.z, 0.5), y: base.y }
    thumb = [root, at(0.35), at(0.7), tip]
  }
  return { mitten, thumb }
}

/*
WHICH BONES TAKE THE SKIN, and where each one runs. Fingers take it only
where the mesh has them (found from above: `rig.fingers`); otherwise the hand
takes the whole hand, as a mitten or a paw should. The root and the leaf
joints only mark where a chain ends.
*/
const SEGMENT_TO: Record<string, string> = {
  pelvis: 'spine_01',
  spine_01: 'spine_02',
  spine_02: 'spine_03',
  spine_03: 'neck_01',
  neck_01: 'Head',
}
for (const s of ['l', 'r']) {
  SEGMENT_TO[`clavicle_${s}`] = `upperarm_${s}`
  SEGMENT_TO[`upperarm_${s}`] = `lowerarm_${s}`
  SEGMENT_TO[`lowerarm_${s}`] = `hand_${s}`
  SEGMENT_TO[`hand_${s}`] = `middle_04_leaf_${s}`
  SEGMENT_TO[`thigh_${s}`] = `calf_${s}`
  SEGMENT_TO[`calf_${s}`] = `foot_${s}`
  SEGMENT_TO[`foot_${s}`] = `ball_${s}`
  SEGMENT_TO[`ball_${s}`] = `ball_leaf_${s}`
}

/**
 * The bones that take the skin, as segments for `boneHeat`, each with its
 * index in `rig.joints` (the order the skeleton is built in).
 */
export function skinSegments(
  rig: FittedRig
): Array<{ index: number; a: Vec3; b: Vec3 }> {
  const out: Array<{ index: number; a: Vec3; b: Vec3 }> = []
  // A tail bone runs to the next joint down its chain.
  const child = new Map<string, string>()
  for (const j of rig.joints)
    if (j.parent?.startsWith('tail_')) child.set(j.parent, j.name)
  /*
  FINGERS FOUND IN THE MESH take the skin, each joint to the next; then the
  hand runs only to the knuckles, so a finger's flesh is the finger's.
  */
  const handTo = new Map<string, Vec3>()
  for (const side of ['l', 'r'] as const) {
    const found = rig.fingers?.[side] ?? []
    for (const f of found)
      for (const [from, to] of [
        ['01', '02'],
        ['02', '03'],
        ['03', '04_leaf'],
      ])
        child.set(`${f}_${from}_${side}`, `${f}_${to}_${side}`)
    const knuckles = found
      .filter((f) => f !== 'thumb')
      .map((f) => rig.at(`${f}_01_${side}`)!)
    if (knuckles.length > 0)
      handTo.set(
        `hand_${side}`,
        scale(knuckles.reduce(add), 1 / knuckles.length)
      )
  }
  rig.joints.forEach((j, index) => {
    const to = handTo.has(j.name)
      ? null
      : SEGMENT_TO[j.name] ?? child.get(j.name)
    const b = handTo.get(j.name) ?? (to != null ? rig.at(to) : j.end)
    if (b != null) out.push({ index, a: j.position, b })
  })
  return out
}

/**
 * The fitted skeleton as `retarget` reads it: T-pose rest, identity local
 * rotations, each position its offset from its parent.
 */
export function fittedRestBones(rig: FittedRig): RestBone[] {
  return rig.joints.map((j) => {
    const p = j.parent != null ? rig.at(j.parent) : undefined
    return {
      name: j.name,
      parent: j.parent,
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      position: p != null ? minus(j.position, p) : j.position,
      end: j.end,
    }
  })
}

/**
 * The triangles of a Wavefront OBJ (text), as fitting and binding want them:
 * positions xyz and indices in threes, polygons fanned, data unchanged (OBJ
 * is right-handed, as `fitSkeleton` assumes). `objects` keeps only those `o`
 * groups (a file often holds the whole scene: props, clothes, eyes), and
 * only the vertices they use.
 */
export function objTriangles(
  text: string,
  objects?: readonly string[]
): { positions: number[]; indices: number[] } {
  const all: number[] = []
  const faces: number[] = []
  let obj = ''
  for (const line of text.split('\n')) {
    const p = line.trim().split(/\s+/)
    if (p[0] === 'o') obj = p.slice(1).join(' ')
    else if (p[0] === 'v') all.push(+p[1], +p[2], +p[3])
    else if (p[0] === 'f' && (objects == null || objects.includes(obj))) {
      // Negative indices count back from the vertices read so far.
      const ix = p.slice(1).map((s) => {
        const i = parseInt(s)
        return i < 0 ? all.length / 3 + i : i - 1
      })
      for (let k = 1; k + 1 < ix.length; k++)
        faces.push(ix[0], ix[k], ix[k + 1])
    }
  }
  const positions: number[] = []
  const remap = new Map<number, number>()
  const indices = faces.map((i) => {
    let j = remap.get(i)
    if (j == null) {
      j = positions.length / 3
      remap.set(i, j)
      positions.push(all[i * 3], all[i * 3 + 1], all[i * 3 + 2])
    }
    return j
  })
  return { positions, indices }
}

/*
THE MARKER STEP'S PURE HALF: a mesh seen from the front or the side, as runs
on a grid (small enough to draw as one SVG path), and a first placement of
the eight markers read off it. The widget is `rig-markers`.
*/

/** A view of a mesh as filled runs on a grid: `u` across, `v` up. */
export interface Silhouette {
  view: 'front' | 'side'
  /** Grid cell size, in mesh units. */
  cell: number
  min: { u: number; v: number }
  max: { u: number; v: number }
  /** Filled runs: row `v` (its bottom, in mesh units), from `u0` to `u1`. */
  runs: Array<{ v: number; u0: number; u1: number }>
}

/**
 * Rasterise a mesh's front (x, y) or side (z, y) view to runs on a grid,
 * `cells` across its larger dimension (default 160).
 */
export function rigSilhouette(
  positions: ArrayLike<number>,
  indices: ArrayLike<number>,
  view: 'front' | 'side' = 'front',
  cells = 160
): Silhouette {
  const ui = view === 'front' ? 0 : 2
  let minU = Infinity
  let maxU = -Infinity
  let minV = Infinity
  let maxV = -Infinity
  for (let i = 0; i < indices.length; i++) {
    const k = indices[i] * 3
    const u = positions[k + ui]
    const v = positions[k + 1]
    if (!Number.isFinite(u) || !Number.isFinite(v)) continue
    if (u < minU) minU = u
    if (u > maxU) maxU = u
    if (v < minV) minV = v
    if (v > maxV) maxV = v
  }
  if (!(maxU > minU && maxV > minV)) {
    return { view, cell: 1, min: { u: 0, v: 0 }, max: { u: 0, v: 0 }, runs: [] }
  }
  const cell = Math.max(maxU - minU, maxV - minV) / cells
  const cols = Math.ceil((maxU - minU) / cell) + 1
  const rows = Math.ceil((maxV - minV) / cell) + 1
  const grid = new Uint8Array(cols * rows)
  const p = [0, 0, 0, 0, 0, 0]
  for (let t = 0; t + 2 < indices.length; t += 3) {
    let ok = true
    for (let c = 0; c < 3; c++) {
      const k = indices[t + c] * 3
      p[c * 2] = (positions[k + ui] - minU) / cell
      p[c * 2 + 1] = (positions[k + 1] - minV) / cell
      if (!Number.isFinite(p[c * 2]) || !Number.isFinite(p[c * 2 + 1]))
        ok = false
    }
    if (!ok) continue
    const r0 = Math.max(0, Math.floor(Math.min(p[1], p[3], p[5])))
    const r1 = Math.min(rows - 1, Math.ceil(Math.max(p[1], p[3], p[5])))
    for (let r = r0; r <= r1; r++) {
      // Where the row's centre line crosses the triangle.
      const y = r + 0.5
      let lo = Infinity
      let hi = -Infinity
      for (let e = 0; e < 3; e++) {
        const ax = p[e * 2]
        const ay = p[e * 2 + 1]
        const bx = p[((e + 1) % 3) * 2]
        const by = p[((e + 1) % 3) * 2 + 1]
        if ((ay <= y && by >= y) || (by <= y && ay >= y)) {
          const x =
            ay === by
              ? Math.min(ax, bx)
              : ax + ((y - ay) / (by - ay)) * (bx - ax)
          const x2 = ay === by ? Math.max(ax, bx) : x
          if (x < lo) lo = x
          if (x2 > hi) hi = x2
        }
      }
      if (lo > hi) continue
      const c0 = Math.max(0, Math.floor(lo))
      const c1 = Math.min(cols - 1, Math.floor(hi))
      for (let c = c0; c <= c1; c++) grid[r * cols + c] = 1
    }
  }
  const runs: Silhouette['runs'] = []
  for (let r = 0; r < rows; r++) {
    let c = 0
    while (c < cols) {
      if (!grid[r * cols + c]) {
        c++
        continue
      }
      const start = c
      while (c < cols && grid[r * cols + c]) c++
      runs.push({
        v: minV + r * cell,
        u0: minU + start * cell,
        u1: minU + c * cell,
      })
    }
  }
  return {
    view,
    cell,
    min: { u: minU, v: minV },
    max: { u: maxU, v: maxV },
    runs,
  }
}

/*
ARMS THAT HANG (an A-pose, or arms at the sides with a gap). Below the armpit
the left arm is the outermost run on its side of the row, apart from the torso
(or, lower, the leg) inside it. Its centres from the armpit down to the
fingertips give the arm's line. The shoulder joint is a little above the
armpit; the elbow and wrist go at a person's proportions along the line from
shoulder to fingertip (upper arm 0.42 of it, forearm to 0.75).
*/
function armHanging(
  rows: Map<number, Array<{ u0: number; u1: number }>>,
  nRows: number,
  groinV: number,
  vOf: (k: number) => number,
  H: number
): { elbow: Point2; wrist: Point2 } | null {
  const centres: Array<{ x: number; y: number }> = []
  let gap = 0
  for (let k = Math.round(nRows * 0.85); k > 0; k--) {
    const runs = (rows.get(k) ?? []).filter((r) => r.u1 > 0)
    const outer = runs.reduce<{ u0: number; u1: number } | null>(
      (o, r) => (o == null || r.u0 > o.u0 ? r : o),
      null
    )
    const apart =
      outer != null && outer.u0 > 0 && runs.some((r) => r.u1 < outer.u0)
    if (apart) {
      centres.push({ x: (outer!.u0 + outer!.u1) / 2, y: vOf(k) })
      gap = 0
    } else if (centres.length > 0 && ++gap > 2) break
  }
  if (centres.length < 2 || centres[0].y - centres[centres.length - 1].y < 0.15 * H)
    return null
  // The arm hangs from above the crotch, or what was found is not an arm.
  if (centres[0].y < groinV) return null
  // x as a straight line in y, by least squares.
  let sy = 0
  let sx = 0
  let syy = 0
  let sxy = 0
  for (const c of centres) {
    sy += c.y
    sx += c.x
    syy += c.y * c.y
    sxy += c.x * c.y
  }
  const n = centres.length
  const slope = (n * sxy - sx * sy) / (n * syy - sy * sy || 1e-9)
  const icept = (sx - slope * sy) / n
  const xAt = (y: number) => icept + slope * y
  const shoulderY = centres[0].y + 0.04 * H
  const tipY = centres[n - 1].y
  const len = shoulderY - tipY
  const point = (t: number) => {
    const y = shoulderY - t * len
    return { x: xAt(y), y }
  }
  return { elbow: point(0.42), wrist: point(0.75) }
}

/** A first placement of the eight markers, read off a front silhouette. */
export function guessMarkers(s: Silhouette): Markers {
  const H = s.max.v - s.min.v
  const rows = new Map<number, Array<{ u0: number; u1: number }>>()
  for (const r of s.runs) {
    const k = Math.round((r.v - s.min.v) / s.cell)
    if (!rows.has(k)) rows.set(k, [])
    rows.get(k)!.push(r)
  }
  const rowAt = (v: number) =>
    rows.get(Math.round((v - s.min.v) / s.cell)) ?? []
  const vOf = (k: number) => s.min.v + (k + 0.5) * s.cell
  const nRows = Math.round(H / s.cell)
  const extent = (runs: Array<{ u0: number; u1: number }>) =>
    runs.reduce((m, r) => Math.max(m, Math.abs(r.u0), Math.abs(r.u1)), 0)

  // The crotch: the first filled cell going up the centre line, below the
  // middle of the body (a tail hanging between the legs fills it sooner).
  let groinV = s.min.v + 0.47 * H
  for (let k = Math.round(nRows * 0.2); k < nRows * 0.62; k++) {
    if ((rows.get(k) ?? []).some((r) => r.u0 <= 0 && r.u1 >= 0)) {
      groinV = vOf(k)
      break
    }
  }

  // The arms: the widest row of the upper body.
  let armK = Math.round(nRows * 0.75)
  let armW = 0
  for (let k = Math.round(nRows * 0.5); k < nRows * 0.92; k++) {
    const w = extent(rows.get(k) ?? [])
    if (w > armW) {
      armW = w
      armK = k
    }
  }
  const armV = vOf(armK)
  const torsoW = extent(rowAt(groinV))
  // Arms out to the side (a T-pose): along the widest row.
  const armsOut = armW > torsoW * 1.6
  const down = armsOut ? null : armHanging(rows, nRows, groinV, vOf, H)
  /*
  IN THE MIDDLE OF THE ARM, not on its underside. The widest row is the
  arm's lowest (ties keep the first going up) or where the hand droops, so a
  marker there sat low (Tonio). At each marker's place along the arm, the
  rows the arm fills round the widest one are found and their middle taken.
  */
  const covers = (k: number, x: number) =>
    (rows.get(k) ?? []).some((r) => r.u0 <= x && r.u1 >= x)
  const armMiddle = (x: number) => {
    // The nearest row the arm fills there, above or below the widest.
    let k0 = -1
    for (let d = 0; d <= nRows * 0.06 && k0 < 0; d++) {
      if (covers(armK - d, x)) k0 = armK - d
      else if (covers(armK + d, x)) k0 = armK + d
    }
    if (k0 < 0) return armV
    let lo = k0
    let hi = k0
    while (covers(lo - 1, x)) lo--
    while (covers(hi + 1, x)) hi++
    return (vOf(lo) + vOf(hi)) / 2
  }
  const wristX = armW * 0.78
  const wrist = armsOut
    ? { x: wristX, y: armMiddle(wristX) }
    : down?.wrist ?? { x: torsoW * 1.1, y: s.min.v + 0.5 * H }
  const elbow = armsOut
    ? { x: wrist.x * 0.62, y: armMiddle(wrist.x * 0.62) }
    : down?.elbow ?? { x: torsoW * 1.05, y: s.min.v + 0.63 * H }

  // The neck: the narrowest row between the arms and the top of the head.
  let chinV = s.min.v + 0.82 * H
  let narrowest = Infinity
  for (let k = armK + 1; k < nRows - nRows * 0.04; k++) {
    const w = extent(rows.get(k) ?? [])
    if (w > 0 && w < narrowest) {
      narrowest = w
      chinV = vOf(k)
    }
  }

  // The knees: the middle of the left leg, a little over halfway up.
  const kneeV = s.min.v + (groinV - s.min.v) * 0.58
  const legs = rowAt(kneeV).filter((r) => r.u1 > 0)
  const leg = legs.sort((a, b) => b.u1 - b.u0 - (a.u1 - a.u0))[0]
  const kneeX = leg ? (Math.max(0, leg.u0) + leg.u1) / 2 : torsoW * 0.45

  const p = (x: number, y: number) => ({ x, y })
  return {
    chin: p(0, chinV),
    groin: p(0, groinV),
    wristL: p(wrist.x, wrist.y),
    wristR: p(-wrist.x, wrist.y),
    elbowL: p(elbow.x, elbow.y),
    elbowR: p(-elbow.x, elbow.y),
    kneeL: p(kneeX, kneeV),
    kneeR: p(-kneeX, kneeV),
  }
}
