/*#
# retarget

**One humanoid's animation on another humanoid's body.** The Universal
Animation Library's clips are authored on the UE mannequin; a Mixamo
character, a Kenney chibi or a model of your own has different bone names,
a different number of bones, a different rest pose and different
proportions. This makes the clips play anyway.

## Demo

```js
import { b3d, b3dLight, assetUrl, readSkeleton, retargetClip, select3d } from 'tosijs-3d'
import { tosi } from 'tosijs'

const { rt } = tosi({ rt: { clip: 'Walk_Loop' } })
const clips = ['Idle_Loop', 'Walk_Loop', 'Jog_Fwd_Loop', 'Sprint_Loop', 'Dance_Loop', 'Crouch_Fwd_Loop', 'Swim_Fwd_Loop', 'Pistol_Idle_Loop']

preview.append(
  b3d(
    {
      clearColor: '#2a3340',
      panelTitle: 'Retarget',
      scenePanel: () => [select3d({ label: 'clip', value: rt.clip, options: clips })],
      async sceneCreated(el, BABYLON) {
        const scene = el.scene
        const cam = new BABYLON.ArcRotateCamera('c', Math.PI / 2, 1.35, 7, new BABYLON.Vector3(0, 0.8, 0), scene)
        cam.attachControl(el.querySelector('canvas'), true)
        el.setActiveCamera(cam)
        const ground = BABYLON.MeshBuilder.CreateGround('g', { width: 12, height: 6 }, scene)
        ground.position.y = -0.01

        const load = async (url) => {
          const c = await BABYLON.LoadAssetContainerAsync(url, scene)
          c.addAllToScene()
          for (const g of c.animationGroups) g.stop()
          return c
        }
        const rootOf = (c) => c.meshes.find((m) => m.name === '__root__')
        // One character out of a library file: hide the rest, find its skin.
        const pick = (c, name) => {
          const top = c.transformNodes.find((n) => n.name === name) || c.meshes.find((n) => n.name === name)
          for (const m of c.meshes) if (m.name !== '__root__' && top && !m.isDescendantOf(top) && m !== top) m.setEnabled(false)
          if (top) top.position.set(0, 0, 0)
          return c.skeletons.find((s) => s.bones.some((b) => { const t = b.getTransformNode(); return t && top && t.isDescendantOf(top) }))
        }

        const ual = await load(assetUrl('quaternius/UAL1_core.glb', 2))
        const source = readSkeleton(ual.skeletons[0], rootOf(ual))
        const bodies = [{ root: rootOf(ual), skeleton: null, x: 2.4 }]
        const hero = await load(assetUrl('quaternius/libraries/characters-superhero-male.glb'))
        bodies.push({ root: rootOf(hero), skeleton: pick(hero, 'Superhero_Male_FullBody'), x: 0.8 })
        const omni = await load('/omnidude.glb')
        bodies.push({ root: rootOf(omni), skeleton: omni.skeletons[0], x: -0.8 })
        const mini = await load(assetUrl('kenney/libraries/mini-characters.glb'))
        const miniSkin = pick(mini, 'character-female-a')
        rootOf(mini).scaling.scaleInPlace(3)
        bodies.push({ root: rootOf(mini), skeleton: miniSkin, x: -2.4, armSpaceDeg: 55 })

        for (const b of bodies) {
          b.root.position.x = b.x
          if (b.skeleton) b.read = readSkeleton(b.skeleton, b.root)
        }
        // Retarget each clip once per body, the first time it is asked for.
        const made = new Map()
        let playing = []
        const play = (name) => {
          for (const g of playing) g.stop()
          const clip = ual.animationGroups.find((g) => g.name === name)
          if (!clip) return
          playing = bodies.map((b, i) => {
            if (!b.read) return clip
            const key = name + i
            if (!made.has(key)) made.set(key, retargetClip(clip, source, b.read, { scene, armSpaceDeg: b.armSpaceDeg }))
            return made.get(key)
          })
          for (const g of playing) g.start(true)
        }
        play(rt.clip.value)
        rt.clip.observe(() => play(rt.clip.value))
      },
    },
    b3dLight({ intensity: 0.9 })
  )
)
```

One clip, four bodies. On the right, UAL's own mannequin plays the original;
then the same clip retargeted onto a Quaternius superhero (the same 65 bones,
other proportions), omnidude (Mixamo's bones, 0.88 m tall) and a Kenney
chibi (seven bones: one for each whole leg, arm and the torso; shown three
times its size). Pick a clip in the panel.

A chibi's arms are long for its height: hanging where the clip's hang, its
hands would go through the floor. `armSpaceDeg` (Mixamo's "Character
Arm-Space") turns the upper arms out from the body, and the chibi takes 55°.

## How it works

1. **Roles.** `humanoidRoles(bones)` says which bone is the hips, the chest,
   the left forearm, … from the names and the hierarchy, across the common
   spellings (UE `upperarm_l`, Mixamo `mixamorig:LeftArm`, Kenney `arm-left`,
   Blender `forearm.L`), and each finger's three joints (`index_01_l`,
   `LeftHandIndex1`, `thumb.01.L`). Twist, IK and end bones are left alone.
2. **Rotations, not positions.** `retargeter(source, target).pose` gives each target bone the
   world-space rotation its source bone made since ITS rest, so bone
   lengths are the target's own: a long-legged clip on a short-legged body
   bends the same joints by the same angles.
3. **Rest poses that disagree.** A clip authored on an A-pose rig, played on
   a T-pose one, must still put the arms where the clip shows them, not 45°
   higher. Each target bone is first lined up with its source bone's rest
   direction (toward the next joint down the limb; a hand toward a finger
   both rigs have), so poses come across as the clip shows them, whatever
   rest pose either rig was bound in.
4. **The hips move in proportion.** Their translation is scaled by the ratio
   of hip heights, so a short character's stride is shorter, not stretched.

Babylon-free and deterministic (plain `{x, y, z, w}` quaternions), like
`fly-by-wire`: the Babylon side (`retarget-babylon`) reads the skeletons and
writes the result.

A mesh with no skeleton at all can be rigged for these clips too: the
[rig tool](/rig-tool/) fits a skeleton from eight markers dragged over the
mesh, as Mixamo's auto-rigger does, and binds the mesh to it
([auto-rig](/rig-build/) is the code underneath).
*/
/*{ "parent": "b3d-biped", "order": 70 }*/

import {
  quatConjugate,
  quatMul,
  rotateVector,
  sub,
  type Quat,
  type Vec3,
} from './spatial-transform.js'

export type Side = 'l' | 'r'
export type Limb =
  | 'clavicle'
  | 'upperArm'
  | 'lowerArm'
  | 'hand'
  | 'upperLeg'
  | 'lowerLeg'
  | 'foot'
  | 'toes'
export type Finger = 'thumb' | 'index' | 'middle' | 'ring' | 'pinky'
export const FINGERS: readonly Finger[] = [
  'thumb',
  'index',
  'middle',
  'ring',
  'pinky',
]
/** A finger joint: 1 at the knuckle (the thumb's at the wrist), 3 at the tip. */
export type FingerJoint = `${Finger}${1 | 2 | 3}`
/** What a bone IS in a humanoid, whatever it is called. */
export type Role =
  | 'hips'
  | 'spine'
  | 'midSpine'
  | 'chest'
  | 'neck'
  | 'head'
  | `${Side}-${Limb}`
  | `${Side}-${FingerJoint}`

export const ROLES: readonly Role[] = [
  'hips',
  'spine',
  'midSpine',
  'chest',
  'neck',
  'head',
  ...(['l', 'r'] as const).flatMap((s) =>
    (
      [
        'clavicle',
        'upperArm',
        'lowerArm',
        'hand',
        'upperLeg',
        'lowerLeg',
        'foot',
        'toes',
      ] as const
    ).map((l) => `${s}-${l}` as Role)
  ),
  ...(['l', 'r'] as const).flatMap((s) =>
    FINGERS.flatMap((f) => [1, 2, 3].map((n) => `${s}-${f}${n}` as Role))
  ),
]

/** A bone as `humanoidRoles` needs it: its name and its parent's. */
export interface NamedBone {
  name: string
  parent: string | null
}

/** Split a bone name into its side (if any) and the rest, lower case, no separators. */
function readName(name: string): { side: Side | null; base: string } {
  // Drop a namespace (`mixamorig:`) and anything Blender appends (`.001`).
  let n = name.replace(/^.*:/, '').replace(/\.\d+$/, '')
  let side: Side | null = null
  const sided: Array<[RegExp, Side]> = [
    [/^left[_.\-\s]?/i, 'l'],
    [/^right[_.\-\s]?/i, 'r'],
    [/[_.\-\s]left$/i, 'l'],
    [/[_.\-\s]right$/i, 'r'],
    [/[_.\-\s]l$/i, 'l'],
    [/[_.\-\s]r$/i, 'r'],
    [/^l[_.\-\s]/i, 'l'],
    [/^r[_.\-\s]/i, 'r'],
  ]
  for (const [re, s] of sided) {
    if (re.test(n)) {
      side = s
      n = n.replace(re, '')
      break
    }
  }
  return { side, base: n.toLowerCase().replace(/[_.\-\s]/g, '') }
}

const SKIP =
  /(thumb|index|middle|ring|pinky|finger|twist|ik|end|top|nub|roll|corrective|helper|pole)/

/*
A FINGER JOINT: the finger's name and its joint number, 1 to 3, with
whatever the rig puts between (UE `index_01`, Mixamo `HandIndex1`, Rigify
`f_index.01`). A fourth joint is the tip's end bone (UE `index_04_leaf`,
Mixamo `HandIndex4`) and a metacarpal has no number, so neither is taken.
*/
function fingerOf(base: string): FingerJoint | null {
  const m = /(thumb|index|middle|ring|pinky)[a-z]*?0?([1-3])$/.exec(base)
  return m != null ? (`${m[1]}${m[2]}` as FingerJoint) : null
}

/** The limb a (sided) base name is, or null. `leg` is decided later. */
function limbOf(base: string): Limb | 'leg' | null {
  if (/^(clavicle|shoulder|collar)/.test(base)) return 'clavicle'
  if (/^(upperarm|uparm|arm)\d*$/.test(base)) return 'upperArm'
  if (/^(lowerarm|forearm|elbow)\d*$/.test(base)) return 'lowerArm'
  if (/^(hand|wrist)\d*$/.test(base)) return 'hand'
  if (/^(thigh|upleg|upperleg)\d*$/.test(base)) return 'upperLeg'
  if (/^(calf|shin|lowerleg|knee)\d*$/.test(base)) return 'lowerLeg'
  if (/^leg\d*$/.test(base)) return 'leg'
  if (/^(foot|ankle)\d*$/.test(base)) return 'foot'
  if (/^(toes?|toebase|ball)\d*$/.test(base)) return 'toes'
  return null
}

/**
 * Which bone is which, by name and hierarchy. Returns role → bone name for
 * every role it found; a rig with fewer bones simply has fewer roles (a
 * Kenney chibi has no forearms). `overrides` wins over the guess.
 */
export function humanoidRoles(
  bones: readonly NamedBone[],
  overrides: Partial<Record<Role, string>> = {}
): Partial<Record<Role, string>> {
  const roles: Partial<Record<Role, string>> = {}
  const spines: string[] = []
  const legs: Record<Side, string[]> = { l: [], r: [] }
  for (const b of bones) {
    const { side, base } = readName(b.name)
    const finger = side != null ? fingerOf(base) : null
    if (finger != null && !/(twist|ik|end|leaf|nub|meta)/.test(base)) {
      roles[`${side}-${finger}` as Role] ??= b.name
      continue
    }
    if (SKIP.test(base)) continue
    if (side == null) {
      if (/^(pelvis|hips?)$/.test(base)) roles.hips ??= b.name
      else if (/^(spine\d*|chest|upperchest|torso|body)$/.test(base))
        spines.push(b.name)
      else if (/^neck\d*$/.test(base)) roles.neck ??= b.name
      else if (/^head$/.test(base)) roles.head ??= b.name
      continue
    }
    const limb = limbOf(base)
    if (limb == null) continue
    if (limb === 'leg') {
      legs[side].push(b.name)
      continue
    }
    const role = `${side}-${limb}` as Role
    roles[role] ??= b.name
  }
  // A plain `leg` is the lower leg when there is an upper one (Mixamo's
  // LeftUpLeg / LeftLeg), else the whole leg (Kenney's `leg-left`).
  for (const side of ['l', 'r'] as const) {
    for (const name of legs[side]) {
      const upper = `${side}-upperLeg` as Role
      const lower = `${side}-lowerLeg` as Role
      if (roles[upper] != null && roles[upper] !== name) roles[lower] ??= name
      else roles[upper] ??= name
    }
  }
  // The spine chain in hierarchy order: lowest is `spine`, highest `chest`.
  if (spines.length > 0) {
    const depth = (name: string) => {
      let d = 0
      let at: string | null = name
      const parentOf = new Map(bones.map((b) => [b.name, b.parent]))
      while (at != null && d < 256) {
        at = parentOf.get(at) ?? null
        d++
      }
      return d
    }
    spines.sort((a, b) => depth(a) - depth(b))
    roles.chest = spines[spines.length - 1]
    if (spines.length > 1) roles.spine = spines[0]
    /*
    THE MIDDLE OF A THREE-BONE SPINE TOO. With only \`spine\` and \`chest\`, UAL's
    \`spine_02\` was never driven: the clip's mid-back bend was dropped and the
    bones either side bent harder to make the shape, which creased the skin
    across the lower back in a crouch (Tonio, #3475).
    */
    if (spines.length > 2)
      roles.midSpine = spines[Math.floor(spines.length / 2)]
  }
  return { ...roles, ...overrides }
}

/** A bone in its rest pose: local rotation and position, relative to its parent. */
export interface RestBone {
  name: string
  parent: string | null
  rotation: Quat
  position: Vec3
  /**
   * Where the bone points, in the same space as the skeleton's root (a
   * world position at rest), for a bone with no joint below it: a Kenney
   * chibi's whole arm, say. The Babylon side takes it from the middle of
   * the vertices the bone drives. Optional: without it, such a bone takes
   * only its source's turn since rest.
   */
  end?: Vec3
}

/** A skeleton as `retargetPose` reads it: bones in any order. */
export interface Skeleton {
  bones: readonly RestBone[]
  roles: Partial<Record<Role, string>>
}

const IDENTITY: Quat = { x: 0, y: 0, z: 0, w: 1 }

/** Bones ordered so every parent comes before its children. */
function ordered(bones: readonly RestBone[]): RestBone[] {
  const byName = new Map(bones.map((b) => [b.name, b]))
  const out: RestBone[] = []
  const seen = new Set<string>()
  const visit = (b: RestBone) => {
    if (seen.has(b.name)) return
    if (b.parent != null) {
      const p = byName.get(b.parent)
      if (p != null) visit(p)
    }
    seen.add(b.name)
    out.push(b)
  }
  for (const b of bones) visit(b)
  return out
}

interface World {
  rotation: Map<string, Quat>
  position: Map<string, Vec3>
}

/** World rotations and positions from local ones (rest, or a pose over rest). */
function toWorld(
  bones: readonly RestBone[],
  rotations?: ReadonlyMap<string, Quat>,
  positions?: ReadonlyMap<string, Vec3>
): World {
  const rotation = new Map<string, Quat>()
  const position = new Map<string, Vec3>()
  for (const b of ordered(bones)) {
    const local = rotations?.get(b.name) ?? b.rotation
    const pos = positions?.get(b.name) ?? b.position
    const pr = b.parent != null ? rotation.get(b.parent) : undefined
    const pp = b.parent != null ? position.get(b.parent) : undefined
    if (pr == null || pp == null) {
      rotation.set(b.name, local)
      position.set(b.name, pos)
    } else {
      rotation.set(b.name, quatMul(pr, local))
      const off = rotateVector(pr, pos)
      position.set(b.name, {
        x: pp.x + off.x,
        y: pp.y + off.y,
        z: pp.z + off.z,
      })
    }
  }
  return { rotation, position }
}

const normalize = (v: Vec3): Vec3 => {
  const l = Math.hypot(v.x, v.y, v.z)
  return l > 1e-9
    ? { x: v.x / l, y: v.y / l, z: v.z / l }
    : { x: 0, y: 0, z: 0 }
}

/** The shortest rotation taking unit vector `a` onto unit vector `b`. */
export function rotationBetween(a: Vec3, b: Vec3): Quat {
  const d = a.x * b.x + a.y * b.y + a.z * b.z
  if (d < -0.999999) {
    // Opposite: half a turn about any axis at right angles to `a`.
    const axis = normalize(
      Math.abs(a.x) < 0.9
        ? { x: 0, y: -a.z, z: a.y }
        : { x: a.z, y: 0, z: -a.x }
    )
    return { x: axis.x, y: axis.y, z: axis.z, w: 0 }
  }
  const c = {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  }
  const w = 1 + d
  const l = Math.hypot(c.x, c.y, c.z, w)
  return { x: c.x / l, y: c.y / l, z: c.z / l, w: w / l }
}

/*
WHERE A ROLE POINTS: from its joint toward the next role down the limb (the
elbow for an upper arm, the knee for a thigh), or toward its first child.
Roles, not children, so a twist bone or a finger cannot decide the direction.
*/
const NEXT: Partial<Record<string, string>> = {
  hips: 'spine',
  spine: 'midSpine',
  midSpine: 'chest',
  chest: 'neck',
  neck: 'head',
  clavicle: 'upperArm',
  upperArm: 'lowerArm',
  lowerArm: 'hand',
  upperLeg: 'lowerLeg',
  lowerLeg: 'foot',
  foot: 'toes',
  ...Object.fromEntries(
    FINGERS.flatMap((f) => [
      [`${f}1`, `${f}2`],
      [`${f}2`, `${f}3`],
    ])
  ),
}

/**
 * Bones whose rest direction is the body's SHAPE, not a pose (see
 * ALIGNMENT): the axis, and the collarbones. UAL's collarbone runs from the
 * front of the chest back 38° to the shoulder, as a real one does, and
 * MakeHuman's lies flat; lined up, it swung 38° and every clip shrugged the
 * shoulders up and forward, folding a V into the upper back (Tonio).
 */
const AXIAL: ReadonlySet<Role> = new Set<Role>([
  'hips',
  'spine',
  'midSpine',
  'chest',
  'neck',
  'head',
  'l-clavicle',
  'r-clavicle',
])

/** The fingers a hand is aimed along, best first: the middle runs down its centre. */
const HAND_AIM: readonly Finger[] = ['middle', 'index', 'ring', 'pinky']

function restDirection(
  role: Role,
  sk: Skeleton,
  world: World,
  toward?: Role
): Vec3 | null {
  const name = sk.roles[role]
  if (name == null) return null
  const at = world.position.get(name)
  if (at == null) return null
  // A joint the caller chose (a hand toward a finger both rigs have).
  const t = toward != null ? sk.roles[toward] : undefined
  const tp = t != null ? world.position.get(t) : undefined
  if (tp != null) {
    const d = sub(tp, at)
    if (Math.hypot(d.x, d.y, d.z) > 1e-6) return normalize(d)
  }
  const [side, limb] = role.includes('-') ? role.split('-') : [null, role]
  // Down the limb, skipping roles this rig does not have.
  let next = NEXT[limb as string]
  while (next != null) {
    const r = (side != null ? `${side}-${next}` : next) as Role
    const n = sk.roles[r]
    const p = n != null ? world.position.get(n) : undefined
    if (p != null) {
      const d = sub(p, at)
      if (Math.hypot(d.x, d.y, d.z) > 1e-6) return normalize(d)
    }
    next = NEXT[next]
  }
  // A fingertip: toward its end bone, which every rig with fingers has.
  if (fingerOf(limb as string) != null) {
    const child = sk.bones.find((b) => b.parent === name)
    const cp = child != null ? world.position.get(child.name) : undefined
    if (cp != null) {
      const d = sub(cp, at)
      if (Math.hypot(d.x, d.y, d.z) > 1e-6) return normalize(d)
    }
  }
  // No joint below it: where the bone's own flesh is, if we know.
  const end = sk.bones.find((b) => b.name === name)?.end
  if (end != null) {
    const d = sub(end, at)
    if (Math.hypot(d.x, d.y, d.z) > 1e-6) return normalize(d)
  }
  return null
}

/**
 * How far down its limb a role's bone reaches in this rig: the next role it
 * has (an upper arm reaches the forearm), `'end'` when nothing below it is
 * mapped (a Kenney chibi's whole leg), or null for a role it lacks.
 */
function reach(role: Role, sk: Skeleton): Role | 'end' | null {
  if (sk.roles[role] == null) return null
  const [side, limb] = role.includes('-') ? role.split('-') : [null, role]
  let next = NEXT[limb as string]
  while (next != null) {
    const r = (side != null ? `${side}-${next}` : next) as Role
    if (sk.roles[r] != null) return r
    next = NEXT[next]
  }
  return 'end'
}

/**
 * The last joint of a role's chain that this rig has, stopping at the hand,
 * foot or head (a toe is not where a leg ends).
 */
function chainEnd(role: Role, sk: Skeleton): Role | null {
  const [side, limb] = role.includes('-') ? role.split('-') : [null, role]
  let last: Role | null = null
  let next = NEXT[limb as string]
  while (next != null && next !== 'toes' && fingerOf(next) == null) {
    const r = (side != null ? `${side}-${next}` : next) as Role
    if (sk.roles[r] != null) last = r
    next = NEXT[next]
  }
  return last
}

/** The height of the hips above the lowest foot, in rest pose. */
function hipHeight(sk: Skeleton, world: World): number {
  const hips = sk.roles.hips != null ? world.position.get(sk.roles.hips) : null
  if (hips == null) return 0
  let low = hips.y
  for (const r of ['l-foot', 'r-foot', 'l-toes', 'r-toes'] as Role[]) {
    const n = sk.roles[r]
    const p = n != null ? world.position.get(n) : undefined
    if (p != null && p.y < low) low = p.y
  }
  return hips.y - low
}

/** A prepared mapping from one skeleton to another; reuse it every frame. */
export interface Retargeter {
  /** The roles both skeletons have, which are the ones that move. */
  roles: Role[]
  /** Target hip height ÷ source hip height (1 when either is unknown). */
  scale: number
  /**
   * Target local rotations (by bone name) for a source pose, given as the
   * source's local rotations; bones absent from `rotations` are at rest.
   * `hips` is the source hips' local position, if it moves.
   */
  pose(
    rotations: ReadonlyMap<string, Quat>,
    hips?: Vec3
  ): { rotations: Map<string, Quat>; hips?: Vec3 }
}

export interface RetargetOptions {
  /**
   * ARM SPACE (Mixamo's "Character Arm-Space"): turn each upper arm this many
   * degrees away from the body, about the forward axis, after retargeting.
   * A body whose arms are long against its shoulder height (a chibi's reach
   * below its feet) or that is wide at the hips drives its arms through the
   * floor or its own sides when they hang where the clip's do. The forearm
   * and hand follow the upper arm, so the clip's elbow and wrist are kept.
   * Negative brings them in. Default 0.
   */
  armSpaceDeg?: number
}

/**
 * Map `source`'s poses onto `target`. Both skeletons should face the same
 * way in their rest pose (glTF: +Z forward, +Y up, left on +X); their rest
 * POSES may differ (A-pose against T-pose), which the alignment absorbs.
 */
export function retargeter(
  source: Skeleton,
  target: Skeleton,
  options: RetargetOptions = {}
): Retargeter {
  // Rotations about +Z (forward): positive swings a hanging left arm (+X) out.
  const spread = ((options.armSpaceDeg ?? 0) * Math.PI) / 180
  const armOut = new Map<Role, Quat>()
  if (spread !== 0) {
    for (const [role, sign] of [
      ['l-upperArm', 1],
      ['r-upperArm', -1],
    ] as Array<[Role, number]>) {
      const h = (sign * spread) / 2
      armOut.set(role, { x: 0, y: 0, z: Math.sin(h), w: Math.cos(h) })
    }
  }
  const sRest = toWorld(source.bones)
  const tRest = toWorld(target.bones)
  const roles = ROLES.filter(
    (r) => source.roles[r] != null && target.roles[r] != null
  )
  /*
  ALIGNMENT, per role: the rotation that turns the target's rest direction
  onto the source's, so "the arm moved 30° from rest" means the same arm
  either side even when one rest pose has the arms out and the other down.
  */
  const align = new Map<Role, Quat>()
  /*
  A COLLAPSED CHAIN: one target bone standing for several source bones (a
  chibi's leg is thigh and shin; its torso is spine and neck). Giving it the
  first source bone's turn aims it at the source's KNEE, and a rod from hip
  to foot aimed at a knee kicks out in front. So such a bone is aimed along
  the source's chain to the joint the target bone actually reaches: the
  hand, the foot, the head. (It loses the twist about its own length, which
  a bone without a joint below it cannot show anyway.)
  */
  const aimAt = new Map<Role, { from: string; to: string; rest: Vec3 }>()
  for (const r of roles) {
    /*
    A HAND is aimed along a finger both rigs have (its flesh's middle is
    pulled about by the thumb), so the twist of the wrist comes across.
    */
    let toward: Role | undefined
    if (r.endsWith('-hand')) {
      const side = r[0]
      const f = HAND_AIM.find(
        (f) =>
          source.roles[`${side}-${f}1` as Role] != null &&
          target.roles[`${side}-${f}1` as Role] != null
      )
      if (f != null) toward = `${side}-${f}1` as Role
    }
    const tReach = reach(r, target)
    const sReach = reach(r, source)
    const dt = restDirection(r, target, tRest)
    if (tReach !== sReach && dt != null) {
      const end =
        tReach !== 'end' && tReach != null && source.roles[tReach] != null
          ? tReach
          : chainEnd(r, source)
      if (end != null) {
        aimAt.set(r, {
          from: source.roles[r]!,
          to: source.roles[end]!,
          rest: dt,
        })
        continue
      }
    }
    /*
    THE BODY'S AXIS IS NOT LINED UP. A limb's rest direction is a POSE (arms
    out or down), so lining it up is right; how the hips, spine, neck and
    head lean at rest is the body's SHAPE. A weasel's neck leans forward to
    a chin under its snout, and lined up with the mannequin's upright one it
    was pulled back, tipping the head up through every clip (Tonio). They
    take the clip's turn as it is.
    */
    if (AXIAL.has(r)) {
      align.set(r, IDENTITY)
      continue
    }
    const ds = restDirection(r, source, sRest, toward)
    const dt2 = toward != null ? restDirection(r, target, tRest, toward) : dt
    align.set(
      r,
      ds != null && dt2 != null ? rotationBetween(dt2, ds) : IDENTITY
    )
  }
  const sh = hipHeight(source, sRest)
  const th = hipHeight(target, tRest)
  const scale = sh > 1e-6 && th > 1e-6 ? th / sh : 1
  const tOrder = ordered(target.bones)
  const roleOfTarget = new Map<string, Role>()
  for (const r of roles) roleOfTarget.set(target.roles[r]!, r)
  const sHips = source.roles.hips
  const tHips = target.roles.hips
  const tHipsBone =
    tHips != null ? target.bones.find((b) => b.name === tHips) : undefined

  return {
    roles,
    scale,
    pose(rotations, hips) {
      const sNow = toWorld(
        source.bones,
        rotations,
        hips != null && sHips != null ? new Map([[sHips, hips]]) : undefined
      )
      const out = new Map<string, Quat>()
      const tWorld = new Map<string, Quat>()
      for (const b of tOrder) {
        const parentWorld =
          b.parent != null ? tWorld.get(b.parent) ?? null : null
        const r = roleOfTarget.get(b.name)
        let world: Quat
        if (r == null) {
          world =
            parentWorld != null ? quatMul(parentWorld, b.rotation) : b.rotation
        } else if (aimAt.has(r)) {
          // A collapsed chain: aim along the source's chain, as it is now.
          const a = aimAt.get(r)!
          const from = sNow.position.get(a.from)!
          const to = sNow.position.get(a.to)!
          const now = normalize(sub(to, from))
          world = quatMul(
            rotationBetween(a.rest, now),
            tRest.rotation.get(b.name)!
          )
        } else {
          const sName = source.roles[r]!
          // How the source bone turned since its rest, in world space…
          const delta = quatMul(
            sNow.rotation.get(sName)!,
            quatConjugate(sRest.rotation.get(sName)!)
          )
          // …applied to the target bone, first lined up with the source's rest.
          world = quatMul(
            delta,
            quatMul(align.get(r)!, tRest.rotation.get(b.name)!)
          )
        }
        const out2 = r != null ? armOut.get(r) : undefined
        if (out2 != null) world = quatMul(out2, world)
        tWorld.set(b.name, world)
        out.set(
          b.name,
          parentWorld != null
            ? quatMul(quatConjugate(parentWorld), world)
            : world
        )
      }
      /*
      THE HIPS MOVE IN THE MODEL'S SPACE, not in their parent's. Rigs keep
      the hips under different parents (UAL's pelvis under a Z-up root
      bone, Mixamo's at the top under an armature in centimetres), so a
      local delta from one means nothing to the other. The source hips'
      travel since rest is taken in model space, scaled by hip height,
      added to the target's rest there, and brought back into the target
      hips' parent frame. (Mixed spaces put omnidude's hips about a hundred
      times too low: a crouch.)
      */
      let hipsOut: Vec3 | undefined
      if (hips != null && sHips != null && tHips != null && tHipsBone) {
        const now = sNow.position.get(sHips)
        const rest = sRest.position.get(sHips)
        const tRestW = tRest.position.get(tHips)
        if (now != null && rest != null && tRestW != null) {
          const w = {
            x: tRestW.x + (now.x - rest.x) * scale,
            y: tRestW.y + (now.y - rest.y) * scale,
            z: tRestW.z + (now.z - rest.z) * scale,
          }
          const parent = tHipsBone.parent
          const pr = parent != null ? tWorld.get(parent) : undefined
          const pp = parent != null ? tRest.position.get(parent) : undefined
          hipsOut =
            pr != null && pp != null
              ? rotateVector(quatConjugate(pr), sub(w, pp))
              : w
        }
      }
      return { rotations: out, hips: hipsOut }
    },
  }
}
