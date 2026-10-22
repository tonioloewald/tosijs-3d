/*#
# human-rig

UAL's 65-joint skeleton on a [human pack](/human-pack/)'s body, placed from
the body itself: every joint is the centre of one of MakeHuman's **joint
cubes**, small groups of vertices inside the mesh that the shape targets move
along with the skin. So a morphed body carries its own joint positions, and
nothing is fitted or guessed.


The [character builder](/character-builder/) shows it: the body walking while its sliders move.

## How it works

MakeHuman's own 163-bone skeleton is not used, only where its joints are. The
result is a `FittedRig`, the same thing the auto-rig produces from markers, so
the rest of that pipeline applies unchanged: `skinSegments` and `boneHeat`
bind the skin, `buildRig` makes the Babylon skeleton, and `retargetClip` plays
UAL's clips on it. The skin weights depend only on the mesh's topology, so
they are computed once per base and reused for every body.

`HM08_UAL` is the table, a row per UAL joint: its parent and the joint cube
it sits at (`bone____head` or `bone____tail`, in MakeHuman's naming), or a
rule for the two that have no cube (`root` is on the floor under the pelvis).
A base with different joint cubes brings its own table.

The pack is right-handed and a character faces +Z with its left on +X, as
`rig-fit` assumes, so MakeHuman's `.L` is UAL's `_l`.
*/
/*{ "parent": "character-builder", "order": 30 }*/

import type { FittedJoint, FittedRig } from './rig-fit.js'
import type { HumanPack, HumanPackManifest } from './human-pack.js'
import { humanJoint } from './human-morph.js'

type Vec3 = { x: number; y: number; z: number }

/** A UAL joint: its parent, and the joint cube at its position (and its end). */
export interface HumanRigRow {
  name: string
  parent: string | null
  at: string
  end?: string
  /**
   * Degrees forward of vertical from the parent joint: the joint keeps its
   * cube's HEIGHT but is set this lean from its parent, front to back. For
   * the spine, whose cubes follow a real S-curve where the clips' skeleton
   * is a nearly straight column.
   */
  lean?: number
}

const FINGERS = ['thumb', 'index', 'middle', 'ring', 'pinky'] as const

function hm08Table(): HumanRigRow[] {
  const rows: HumanRigRow[] = [
    // `root` is placed by rule (the floor under the pelvis); `at` is unused.
    { name: 'root', parent: null, at: 'spine05____head' },
    { name: 'pelvis', parent: 'root', at: 'spine05____head' },
    /*
    THE SPINE IS UAL'S COLUMN, not MakeHuman's curve. MakeHuman's joint cubes
    trace a real spine: the mid-back joint near the back, the neck leaning
    17° forward out of it. UAL's clips were made on a nearly straight column
    through the middle of the body (its leans, measured from UAL1's rest
    pose, are these), and played on the curve they hunch the head forward.
    */
    { name: 'spine_01', parent: 'pelvis', at: 'spine04____head', lean: 14.2 },
    { name: 'spine_02', parent: 'spine_01', at: 'spine02____head', lean: 7.4 },
    { name: 'spine_03', parent: 'spine_02', at: 'spine01____head', lean: -1.8 },
    { name: 'neck_01', parent: 'spine_03', at: 'neck01____head', lean: -1.9 },
    {
      name: 'Head',
      parent: 'neck_01',
      at: 'head____head',
      end: 'head____tail',
      lean: 10.9,
    },
  ]
  for (const [s, S] of [
    ['l', 'L'],
    ['r', 'R'],
  ]) {
    rows.push(
      {
        name: `clavicle_${s}`,
        parent: 'spine_03',
        at: `clavicle.${S}____head`,
      },
      {
        name: `upperarm_${s}`,
        parent: `clavicle_${s}`,
        at: `upperarm01.${S}____head`,
      },
      {
        name: `lowerarm_${s}`,
        parent: `upperarm_${s}`,
        at: `lowerarm01.${S}____head`,
      },
      { name: `hand_${s}`, parent: `lowerarm_${s}`, at: `wrist.${S}____head` }
    )
    FINGERS.forEach((f, i) => {
      const mh = `finger${i + 1}`
      rows.push(
        {
          name: `${f}_01_${s}`,
          parent: `hand_${s}`,
          at: `${mh}-1.${S}____head`,
        },
        {
          name: `${f}_02_${s}`,
          parent: `${f}_01_${s}`,
          at: `${mh}-2.${S}____head`,
        },
        {
          name: `${f}_03_${s}`,
          parent: `${f}_02_${s}`,
          at: `${mh}-3.${S}____head`,
        },
        {
          name: `${f}_04_leaf_${s}`,
          parent: `${f}_03_${s}`,
          at: `${mh}-3.${S}____tail`,
        }
      )
    })
    rows.push(
      { name: `thigh_${s}`, parent: 'pelvis', at: `upperleg01.${S}____head` },
      {
        name: `calf_${s}`,
        parent: `thigh_${s}`,
        at: `lowerleg01.${S}____head`,
      },
      { name: `foot_${s}`, parent: `calf_${s}`, at: `foot.${S}____head` },
      { name: `ball_${s}`, parent: `foot_${s}`, at: `toe3-1.${S}____head` },
      { name: `ball_leaf_${s}`, parent: `ball_${s}`, at: `toe3-3.${S}____tail` }
    )
  }
  return rows
}

/** hm08's joint cubes → UAL's 65 joints. */
export const HM08_UAL: readonly HumanRigRow[] = Object.freeze(hm08Table())

/**
 * UAL's skeleton for a body: `positions` are the morphed pack positions (all
 * vertices, the pack's frame). Joints whose cube the pack lacks are reported
 * by throwing, since a table that does not match its base is a build error.
 */
export function humanRig(
  manifest: HumanPackManifest,
  positions: ArrayLike<number>,
  table: readonly HumanRigRow[] = HM08_UAL,
  options: {
    /**
     * The pack's drawn triangles: the floor is then the lowest point of the
     * skin, the sole. Without them it is the lowest foot joint cube, which
     * sits INSIDE the foot, and a body stood on it sinks by an ankle's height.
     */
    triangles?: ArrayLike<number>
  } = {}
): FittedRig {
  const cube = (name: string): Vec3 => {
    const verts = manifest.joints[name]
    if (verts == null) throw new Error(`human-rig: no joint cube ${name}`)
    const [x, y, z] = humanJoint(positions, verts)
    return { x, y, z }
  }
  // The floor: the sole, the lowest point of the skin; or, without the
  // triangles, the lowest foot joint cube (inside the foot, so too high).
  let floor = Infinity
  if (options.triangles != null) {
    for (let i = 0; i < options.triangles.length; i++) {
      floor = Math.min(floor, positions[options.triangles[i] * 3 + 1])
    }
  } else {
    for (const r of table) {
      if (r.name.startsWith('ball_leaf_') || r.name.startsWith('foot_')) {
        floor = Math.min(floor, cube(r.at).y)
      }
    }
  }
  const joints: FittedJoint[] = []
  const byName = new Map<string, Vec3>()
  for (const r of table) {
    let position = cube(r.at)
    if (r.name === 'root') {
      const pelvis = position
      position = { x: pelvis.x, y: floor, z: pelvis.z }
    }
    const from = r.parent != null ? byName.get(r.parent) : undefined
    if (r.lean != null && from != null) {
      const rise = position.y - from.y
      position = {
        ...position,
        z: from.z + rise * Math.tan((r.lean * Math.PI) / 180),
      }
    }
    joints.push({
      name: r.name,
      parent: r.parent,
      position,
      end: r.end != null ? cube(r.end) : undefined,
    })
    byName.set(r.name, position)
  }
  return {
    joints,
    // Every finger is a real finger on this mesh, so each takes the skin.
    fingers: { l: [...FINGERS], r: [...FINGERS] },
    at: (name) => byName.get(name),
  }
}

/**
 * The body alone, compacted: `vertices[i]` is the pack vertex that compact
 * vertex `i` came from, and `triangles` index the compact list. Helpers and
 * joint cubes are left out, so binding and drawing see only the skin.
 */
export interface HumanSkin {
  vertices: Uint32Array
  triangles: Uint32Array
  /** The compact positions from a full set (all of the pack's vertices). */
  positions(full: ArrayLike<number>, into?: Float32Array): Float32Array
}

export function humanSkin(pack: HumanPack): HumanSkin {
  const remap = new Int32Array(pack.manifest.vertexCount).fill(-1)
  const vertices: number[] = []
  const triangles = new Uint32Array(pack.triangles.length)
  pack.triangles.forEach((v, i) => {
    if (remap[v] < 0) {
      remap[v] = vertices.length
      vertices.push(v)
    }
    triangles[i] = remap[v]
  })
  const list = Uint32Array.from(vertices)
  return {
    vertices: list,
    triangles,
    positions(full, into) {
      const out = into ?? new Float32Array(list.length * 3)
      for (let i = 0; i < list.length; i++) {
        const o = list[i] * 3
        out[i * 3] = full[o]
        out[i * 3 + 1] = full[o + 1]
        out[i * 3 + 2] = full[o + 2]
      }
      return out
    },
  }
}

/**
 * Make the head rigid in `weights` (in place): skin above the head joint,
 * and the face in front of it down to under the chin, moves wholly with the
 * head bone, blended in so the neck has no seam. Bone heat shares the face between head and neck, so the
 * eyelids slid over the eyeballs (which ride the head) whenever a clip moved
 * the neck. `positions` are the compact skin's (xyz), `rig` the fitted rig.
 */
export function stiffenHead(
  weights: { indices: Float32Array; weights: Float32Array },
  positions: ArrayLike<number>,
  rig: FittedRig,
  options: { head?: string; blend?: number } = {}
): void {
  const name = options.head ?? 'Head'
  const head = rig.joints.findIndex((j) => j.name === name)
  const at = rig.at(name)
  if (head < 0 || at == null) return
  const blend = options.blend ?? 0.04
  const n = positions.length / 3
  const smooth = (x: number, a: number, b: number) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)
  }
  for (let v = 0; v < n; v++) {
    const y = positions[v * 3 + 1]
    const z = positions[v * 3 + 2]
    // Above the head joint (which is at about nose height on hm08)...
    const above = smooth(y - at.y, 0, blend)
    // ...and the FACE below it: in front of the joint, down to under the chin.
    // The jaw is part of the head; left to the neck, the face sheared
    // whenever a clip turned the neck (Idle's look-around most).
    const face = smooth(z - at.z, 0.02, 0.045) * smooth(y - at.y, -0.1, -0.085)
    const k = Math.max(above, face)
    if (k === 0) continue
    // Scale the others down and give the head what they lose.
    let toHead = 0
    let slot = -1
    for (let i = 0; i < 4; i++) {
      if (weights.indices[v * 4 + i] === head) slot = i
      else {
        toHead += weights.weights[v * 4 + i] * k
        weights.weights[v * 4 + i] *= 1 - k
      }
    }
    if (slot < 0) {
      // The head was not among its four: take the weakest place.
      let weakest = 0
      for (let i = 1; i < 4; i++) {
        if (weights.weights[v * 4 + i] < weights.weights[v * 4 + weakest]) weakest = i
      }
      toHead += weights.weights[v * 4 + weakest]
      weights.weights[v * 4 + weakest] = 0
      weights.indices[v * 4 + weakest] = head
      slot = weakest
    }
    weights.weights[v * 4 + slot] += toHead
  }
}
