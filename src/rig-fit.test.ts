import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import {
  fitSkeleton,
  fittedRestBones,
  meshQuery,
  skinSegments,
  type Markers,
  type MeshQuery,
} from './rig-fit.js'
import { humanoidRoles, retargeter } from './retarget.js'
import { boneHeat } from './bone-heat.js'

/** Axis-aligned boxes as one triangle soup. */
function boxes(list: Array<[number, number, number, number, number, number]>): MeshQuery {
  const pos: number[] = []
  const idx: number[] = []
  for (const [x0, x1, y0, y1, z0, z1] of list) {
    const b = pos.length / 3
    for (const z of [z0, z1])
      for (const y of [y0, y1]) for (const x of [x0, x1]) pos.push(x, y, z)
    // corners: i = x + 2y + 4z
    const quads = [
      [0, 1, 3, 2], [4, 6, 7, 5], [0, 4, 5, 1],
      [2, 3, 7, 6], [0, 2, 6, 4], [1, 5, 7, 3],
    ]
    for (const [a, c, d, e] of quads) idx.push(b + a, b + c, b + d, b + a, b + d, b + e)
  }
  return meshQuery(pos, idx)
}

// A blocky figure, 1.85 tall, with a tail standing off its back.
const figure = boxes([
  [-0.2, 0.2, 0.9, 1.5, -0.1, 0.1], // torso
  [-0.05, 0.05, 1.5, 1.55, -0.05, 0.05], // neck
  [-0.12, 0.12, 1.55, 1.85, -0.1, 0.12], // head
  [0.2, 0.75, 1.38, 1.46, -0.05, 0.05], // left arm
  [-0.75, -0.2, 1.38, 1.46, -0.05, 0.05], // right arm
  [0.75, 0.9, 1.39, 1.45, -0.06, 0.06], // left hand
  [-0.9, -0.75, 1.39, 1.45, -0.06, 0.06], // right hand
  [0.05, 0.17, 0.08, 0.9, -0.06, 0.06], // left leg
  [-0.17, -0.05, 0.08, 0.9, -0.06, 0.06], // right leg
  [0.05, 0.17, 0, 0.08, -0.06, 0.2], // left foot
  [-0.17, -0.05, 0, 0.08, -0.06, 0.2], // right foot
  [-0.05, 0.05, 0.85, 1.0, -0.6, -0.15], // tail
])
const figureMarkers: Markers = {
  chin: { x: 0, y: 1.55 },
  groin: { x: 0, y: 0.9 },
  wristL: { x: 0.75, y: 1.42 },
  wristR: { x: -0.75, y: 1.42 },
  elbowL: { x: 0.48, y: 1.42 },
  elbowR: { x: -0.48, y: 1.42 },
  kneeL: { x: 0.11, y: 0.5 },
  kneeR: { x: -0.11, y: 0.5 },
}

describe('meshQuery', () => {
  test('a ray through the torso finds it first and the tail behind it', () => {
    const s = figure.spans(0, 0.95)
    expect(s.length).toBe(2)
    expect(s[0].front).toBeCloseTo(0.1)
    expect(s[0].back).toBeCloseTo(-0.1)
    expect(s[1].front).toBeCloseTo(-0.15)
  })
  test('a ray past the silhouette finds nothing', () => {
    expect(figure.spans(0.5, 1.0)).toEqual([])
    expect(figure.spans(5, 5)).toEqual([])
  })
})

describe('fitSkeleton', () => {
  const rig = fitSkeleton(figureMarkers, figure)
  const p = (n: string) => rig.at(n)!

  test("places UAL's 65 joints, one root, every parent known", () => {
    expect(rig.joints.length).toBe(65)
    expect(rig.joints.filter((j) => j.parent == null).map((j) => j.name)).toEqual(['root'])
    for (const j of rig.joints) if (j.parent) expect(rig.at(j.parent)).toBeDefined()
  })

  test('markers become joints, centred in the thickness', () => {
    expect(p('lowerarm_l').x).toBe(0.48)
    expect(p('lowerarm_l').z).toBeCloseTo(0)
    expect(p('hand_r').x).toBe(-0.75)
    expect(p('calf_l').z).toBeCloseTo(0)
    expect(p('Head').y).toBe(1.55)
  })

  test('the tail behind the body is not the body', () => {
    expect(p('pelvis').z).toBeCloseTo(0)
    expect(p('spine_01').z).toBeCloseTo(0)
  })

  test('inferred joints land where a body has them', () => {
    const sh = p('upperarm_l')
    expect(sh.x).toBeGreaterThan(0.1)
    expect(sh.x).toBeLessThan(0.48)
    expect(p('foot_l').y).toBeGreaterThan(0)
    expect(p('foot_l').y).toBeLessThan(0.5)
    expect(p('ball_leaf_l').z).toBeCloseTo(0.2)
    expect(p('middle_04_leaf_l').x).toBeGreaterThan(0.88)
    expect(p('index_01_l').z).toBeGreaterThan(p('pinky_01_l').z)
    expect(rig.joints.find((j) => j.name === 'Head')!.end!.y).toBeGreaterThan(1.83)
    expect(p('neck_01').y).toBeLessThan(1.55)
    expect(p('spine_03').y).toBeLessThan(p('neck_01').y)
  })

  test('retarget reads every role off it, and it reproduces itself', () => {
    const bones = fittedRestBones(rig)
    const roles = humanoidRoles(bones)
    for (const r of ['hips', 'chest', 'neck', 'head', 'l-upperArm', 'r-hand', 'l-foot', 'r-toes'] as const)
      expect(roles[r]).toBeDefined()
    const sk = { bones, roles }
    const out = retargeter(sk, sk).pose(new Map())
    for (const [, q] of out.rotations) expect(Math.abs(q.w)).toBeCloseTo(1)
  })
})

/*
THE REAL MESHES (Tonio's, in ../static-assets/assets/rigging-tests; local
only, not published, so these skip where it is not checked out). Markers were
placed by eye on front views, as someone would drag them.
*/
const DIR = join(import.meta.dir, '../../static-assets/assets/rigging-tests')

type Soup = { pos: number[]; idx: number[] }

function readObj(file: string, keep?: string[]): Soup {
  const pos: number[] = []
  const idx: number[] = []
  const all: number[] = []
  let obj = ''
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const p = line.trim().split(/\s+/)
    if (p[0] === 'o') obj = p[1]
    else if (p[0] === 'v') all.push(+p[1], +p[2], +p[3])
    else if (p[0] === 'f' && (!keep || keep.includes(obj))) {
      const ix = p.slice(1).map((s) => parseInt(s) - 1)
      for (let k = 1; k + 1 < ix.length; k++) idx.push(ix[0], ix[k], ix[k + 1])
    }
  }
  pos.push(...all)
  // Bounds from the kept faces only (omnidude's file holds a whole scene).
  const used = new Set(idx)
  const kept: number[] = []
  const remap = new Map<number, number>()
  for (const i of used) {
    remap.set(i, kept.length / 3)
    kept.push(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2])
  }
  return { pos: kept, idx: idx.map((i) => remap.get(i)!) }
}

function readGlb(file: string): Soup {
  const d = readFileSync(file)
  const jl = d.readUInt32LE(12)
  const j = JSON.parse(d.subarray(20, 20 + jl).toString())
  const bin = d.subarray(20 + jl + 8)
  const dv = new DataView(bin.buffer, bin.byteOffset, bin.byteLength)
  const read = (i: number) => {
    const a = j.accessors[i]
    const bv = j.bufferViews[a.bufferView]
    const n = a.type === 'VEC3' ? 3 : 1
    const size = a.componentType === 5126 || a.componentType === 5125 ? 4 : 2
    const stride = bv.byteStride ?? size * n
    const base = (bv.byteOffset ?? 0) + (a.byteOffset ?? 0)
    const out: number[] = []
    for (let k = 0; k < a.count; k++)
      for (let c = 0; c < n; c++) {
        const o = base + k * stride + c * size
        out.push(
          a.componentType === 5126
            ? dv.getFloat32(o, true)
            : a.componentType === 5125
              ? dv.getUint32(o, true)
              : dv.getUint16(o, true)
        )
      }
    return out
  }
  const p = j.meshes[0].primitives[0]
  return { pos: read(p.attributes.POSITION), idx: read(p.indices) }
}

const soupQuery = (s: Soup) => meshQuery(s.pos, s.idx)

const m = (
  chin: [number, number],
  groin: [number, number],
  wrist: [number, number],
  elbow: [number, number],
  knee: [number, number]
): Markers => ({
  chin: { x: chin[0], y: chin[1] },
  groin: { x: groin[0], y: groin[1] },
  wristL: { x: wrist[0], y: wrist[1] },
  wristR: { x: -wrist[0], y: wrist[1] },
  elbowL: { x: elbow[0], y: elbow[1] },
  elbowR: { x: -elbow[0], y: elbow[1] },
  kneeL: { x: knee[0], y: knee[1] },
  kneeR: { x: -knee[0], y: knee[1] },
})

const REAL: Array<{ name: string; mesh: () => Soup; markers: Markers; tail?: { x: number; y: number; z: number } }> = [
  {
    name: 'omnidude',
    mesh: () => readObj(join(DIR, 'omnidude.obj'), ['Omnidude', 'Head']),
    markers: m([0, 1.338], [0, 0.467], [0.74, 1.075], [0.47, 1.095], [0.152, 0.258]),
  },
  {
    name: 'weasel (a tail, a short arm)',
    mesh: () => readObj(join(DIR, 'weasel.obj'), ['Weasel']),
    markers: m([0, 0.967], [0, 0.358], [0.51, 0.763], [0.397, 0.763], [0.142, 0.174]),
    tail: { x: 0, y: 0.5, z: -0.95 },
  },
  {
    name: 'skinny weasel',
    mesh: () => readObj(join(DIR, 'weasel-skinny.obj'), ['Body', 'Head', 'Tail']),
    markers: m([0, 1.259], [0, 0.64], [0.657, 1.154], [0.404, 1.14], [0.106, 0.34]),
    tail: { x: 0, y: 0.77, z: -0.95 },
  },
  {
    name: 'space marine (arms down, claws)',
    mesh: () => readGlb(join(DIR, 'space-marine.glb')),
    markers: m([0, 3.594], [0, 1.656], [1.966, 2.937], [1.18, 3.064], [0.388, 0.943]),
  },
]

describe.skipIf(!existsSync(DIR))('fitSkeleton on real meshes', () => {
  for (const r of REAL)
    test(r.name, () => {
      const mesh = soupQuery(r.mesh())
      const rig = fitSkeleton(r.markers, mesh)
      const p = (n: string) => rig.at(n)!
      const height = mesh.max.y - mesh.min.y
      // Every joint a body has is inside the body's silhouette.
      for (const n of ['pelvis', 'spine_02', 'neck_01', 'Head', 'upperarm_l', 'lowerarm_r', 'hand_l', 'calf_r', 'foot_l', 'thigh_r'])
        expect(mesh.spans(p(n).x, p(n).y).length).toBeGreaterThan(0)
      // And within its depth, in the front-most span (the tail is behind):
      // the pelvis sits forward of the deepest point at its height.
      for (const n of ['spine_02', 'calf_l', 'lowerarm_r']) {
        const spans = mesh.spans(p(n).x, p(n).y)
        expect(p(n).z).toBeLessThanOrEqual(spans[0].front)
        expect(p(n).z).toBeGreaterThanOrEqual(spans[0].back)
      }
      expect(p('pelvis').z).toBeGreaterThan((mesh.min.z + mesh.max.z) / 2 - 0.05 * height)
      // A body's order, bottom to top.
      expect(p('foot_l').y).toBeLessThan(p('calf_l').y)
      expect(p('calf_l').y).toBeLessThan(p('thigh_l').y)
      expect(p('thigh_l').y).toBeLessThan(p('spine_01').y)
      expect(p('spine_03').y).toBeLessThan(p('Head').y)
      // The toes point forward, the hand reaches past the wrist.
      expect(p('ball_leaf_l').z).toBeGreaterThan(p('foot_l').z)
      expect(Math.abs(p('middle_04_leaf_r').x)).toBeGreaterThan(Math.abs(p('hand_r').x))
      // The shoulders are between the neck and the elbows.
      expect(p('upperarm_l').x).toBeGreaterThan(p('neck_01').x)
      expect(p('upperarm_l').x).toBeLessThan(p('lowerarm_l').x)
      expect(p('foot_l').y - mesh.min.y).toBeLessThan(0.2 * height)
    })
})

/*
BINDING THE FITTED RIG (bone heat). What a skin must get right, checked at
places named by the markers: a hand's flesh follows the hand, a foot's the
foot, the head's the head, and no vertex is left without a bone.
*/
describe.skipIf(!existsSync(DIR))('boneHeat on real meshes', () => {
  for (const r of REAL)
    test(r.name, () => {
      const soup = r.mesh()
      const mesh = soupQuery(soup)
      const rig = fitSkeleton(r.markers, mesh, { tail: r.tail })
      const skin = boneHeat(soup.pos, soup.idx, skinSegments(rig))
      const names = rig.joints.map((j) => j.name)
      const n = soup.pos.length / 3
      // The vertex nearest a point, and its strongest bone.
      const strongest = (p: { x: number; y: number; z: number }) => {
        let best = 0
        let bd = Infinity
        for (let v = 0; v < n; v++) {
          const d = Math.hypot(soup.pos[v * 3] - p.x, soup.pos[v * 3 + 1] - p.y, soup.pos[v * 3 + 2] - p.z)
          if (d < bd) {
            bd = d
            best = v
          }
        }
        let k = 0
        for (let s = 1; s < 4; s++) if (skin.weights[best * 4 + s] > skin.weights[best * 4 + k]) k = s
        return names[skin.indices[best * 4 + k]]
      }
      const P = (name: string) => rig.at(name)!
      const mid = (a: string, b: string) => {
        const p = P(a)
        const q = P(b)
        return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2, z: (p.z + q.z) / 2 }
      }
      expect(strongest(mid('hand_l', 'middle_04_leaf_l'))).toBe('hand_l')
      expect(strongest(mid('hand_r', 'middle_04_leaf_r'))).toBe('hand_r')
      expect(strongest(mid('lowerarm_l', 'hand_l'))).toBe('lowerarm_l')
      expect(strongest(mid('thigh_r', 'calf_r'))).toBe('thigh_r')
      expect(strongest(mid('calf_l', 'foot_l'))).toBe('calf_l')
      expect(['foot_l', 'ball_l']).toContain(strongest(P('ball_leaf_l')))
      const head = rig.joints.find((j) => j.name === 'Head')!
      expect(strongest(head.end!)).toBe('Head')
      for (let v = 0; v < n; v++) {
        let s = 0
        for (let k = 0; k < 4; k++) s += skin.weights[v * 4 + k]
        expect(Math.abs(s - 1)).toBeLessThan(1e-4)
      }
      if (r.tail != null) {
        // The tail's flesh follows the tail, not a thigh (the skinny
        // weasel's tail is a separate object, which took the left thigh
        // before it had bones of its own).
        const t = r.tail
        expect(strongest({ x: t.x, y: t.y, z: t.z * 0.8 })).toMatch(/^tail_/)
        expect(strongest({ x: t.x, y: t.y, z: t.z * 0.5 })).toMatch(/^tail_/)
        // A tail is not a role: the humanoid still reads the same.
        const roles = humanoidRoles(fittedRestBones(rig))
        expect(roles.hips).toBe('pelvis')
        expect(roles.chest).toBe('spine_03')
        expect(rig.at('tail_leaf')).toEqual(t)
      }
    })
})
