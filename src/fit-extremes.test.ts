import { describe, expect, test } from 'bun:test'
import { existsSync } from 'fs'
import { join } from 'path'
import type { FittedRig } from './rig-fit.js'
import { meshSdf } from './mesh-sdf.js'
import { sweepCorners, cornerId } from './extremes-corners.js'
import {
  penetration,
  triangleTuck,
  visibleMask,
} from './extremes-penetration.js'
import { boneReference, checkBones } from './extremes-bones.js'
import { summarise, fails, describeCorner } from './extremes-report.js'
import { readHairLibrary } from './hair-place.js'
import type { SweepResult } from './extremes-sweep.js'
import { writeGlb } from './glb-chunks.js'

/** A unit-radius icosphere, counter-clockwise outward. */
function sphere(
  subdivisions = 3,
  r = 1
): { positions: number[]; triangles: number[] } {
  const t = (1 + Math.sqrt(5)) / 2
  const v: number[][] = [
    [-1, t, 0],
    [1, t, 0],
    [-1, -t, 0],
    [1, -t, 0],
    [0, -1, t],
    [0, 1, t],
    [0, -1, -t],
    [0, 1, -t],
    [t, 0, -1],
    [t, 0, 1],
    [-t, 0, -1],
    [-t, 0, 1],
  ].map((p) => {
    const l = Math.hypot(p[0]!, p[1]!, p[2]!)
    return p.map((x) => x / l)
  })
  let f = [
    [0, 11, 5],
    [0, 5, 1],
    [0, 1, 7],
    [0, 7, 10],
    [0, 10, 11],
    [1, 5, 9],
    [5, 11, 4],
    [11, 10, 2],
    [10, 7, 6],
    [7, 1, 8],
    [3, 9, 4],
    [3, 4, 2],
    [3, 2, 6],
    [3, 6, 8],
    [3, 8, 9],
    [4, 9, 5],
    [2, 4, 11],
    [6, 2, 10],
    [8, 6, 7],
    [9, 8, 1],
  ]
  for (let s = 0; s < subdivisions; s++) {
    const mid = new Map<string, number>()
    const m = (a: number, b: number) => {
      const k = a < b ? `${a},${b}` : `${b},${a}`
      let i = mid.get(k)
      if (i === undefined) {
        const p = [0, 1, 2].map((c) => (v[a]![c]! + v[b]![c]!) / 2)
        const l = Math.hypot(p[0]!, p[1]!, p[2]!)
        i = v.push(p.map((x) => x / l)) - 1
        mid.set(k, i)
      }
      return i
    }
    f = f.flatMap(([a, b, c]) => {
      const ab = m(a!, b!)
      const bc = m(b!, c!)
      const ca = m(c!, a!)
      return [
        [a!, ab, ca],
        [b!, bc, ab],
        [c!, ca, bc],
        [ab, bc, ca],
      ]
    })
  }
  return { positions: v.flat().map((x) => x * r), triangles: f.flat() }
}

describe('the inside test', () => {
  const s = sphere()
  const sdf = meshSdf(s.positions, s.triangles, { cell: 0.25 })

  test('a closed sphere has no open edges', () => {
    expect(sdf.boundaryEdges).toBe(0)
  })

  test('signed distance matches the sphere near and far, inside and out', () => {
    for (const [p, d] of [
      [[0, 0, 0], -1],
      [[0.5, 0, 0], -0.5],
      [[0, 0.98, 0], -0.02],
      [[0, 0, 1.03], 0.03],
      [[2, 0, 0], 1],
      [[0.6, 0.6, 0.6], Math.hypot(0.6, 0.6, 0.6) - 1],
    ] as Array<[[number, number, number], number]>) {
      // The icosphere's faces sit a little inside the true sphere.
      expect(Math.abs(sdf.distance(...p) - d)).toBeLessThan(0.02)
    }
  })

  test('a point far outside the mesh box is outside', () => {
    expect(sdf.distance(10, -7, 3)).toBeGreaterThan(9)
  })

  test('the cap classifies without measuring', () => {
    expect(sdf.distance(0, 0, 0, 0.05)).toBe(-0.05)
    expect(sdf.distance(0, 0, 3, 0.05)).toBe(0.05)
  })

  test('the ray vote agrees with the pseudo-normal deep inside and outside', () => {
    expect(sdf.insideByVote(0.1, -0.2, 0.05)).toBe(true)
    expect(sdf.insideByVote(1.5, 0.2, 0.05)).toBe(false)
  })

  test('a hole in the mesh does not turn a deep point inside out', () => {
    // Drop the triangles around the +y pole: a mouth in the sphere.
    const kept: number[] = []
    for (let t = 0; t < s.triangles.length; t += 3) {
      const ys = [0, 1, 2].map((k) => s.positions[s.triangles[t + k]! * 3 + 1]!)
      if (Math.min(...ys) < 0.95)
        kept.push(s.triangles[t]!, s.triangles[t + 1]!, s.triangles[t + 2]!)
    }
    const open = meshSdf(s.positions, kept, { cell: 0.25 })
    expect(open.boundaryEdges).toBeGreaterThan(0)
    expect(open.distance(0, -0.3, 0)).toBeLessThan(0)
    expect(open.distance(0.3, 0, 0.2)).toBeLessThan(0)
  })
})

describe('the corners', () => {
  const all = sweepCorners()
  test('133 bodies, unique ids, the default among them, no child ages', () => {
    expect(all.length).toBe(133)
    expect(new Set(all.map((c) => c.id)).size).toBe(all.length)
    expect(all.filter((c) => c.group === 'default').map((c) => c.id)).toEqual([
      'default',
    ])
    expect(all.every((c) => c.body.age >= 0.5)).toBe(true)
    expect(all.filter((c) => c.group === 'macro').length).toBe(64)
  })
  test('quick is the default and the 32 macro corners at 25', () => {
    const q = sweepCorners({ quick: true })
    expect(q.length).toBe(33)
    expect(q.every((c) => c.body.age === 0.5)).toBe(true)
  })
  test('ids say what differs from the default', () => {
    const c = all.find((x) => x.group === 'ancestry')!
    expect(c.id).toBe(cornerId(c.body))
    expect(describeCorner('g0-m1-w1-h1-p0')).toBe(
      'female, max, max, tall, uncommon'
    )
  })
})

describe('penetration', () => {
  const s = sphere()
  const sdf = meshSdf(s.positions, s.triangles, { cell: 0.25 })
  // A shell of points at radius 1.01, with four pushed 5 mm inside.
  const shell = sphere(2, 1.01).positions
  for (const i of [0, 1, 2, 3]) {
    const k = 0.995 / 1.01
    shell[i * 3] = shell[i * 3]! * k
    shell[i * 3 + 1] = shell[i * 3 + 1]! * k
    shell[i * 3 + 2] = shell[i * 3 + 2]! * k
  }

  test('counts what is inside, and how deep', () => {
    const r = penetration(sdf, shell, null)
    expect(r.raw).toBe(4)
    expect(r.visible).toBe(4)
    expect(r.rawDepth).toBeGreaterThan(0.003)
    expect(r.rawDepth).toBeLessThan(0.008)
    expect(r.worst.length).toBe(4)
    expect(
      Array.from(visibleMask(sdf, shell, null)).filter(Boolean).length
    ).toBe(4)
  })

  test('skin tucked deeper than the cloth hides it; dropped skin hides anything', () => {
    const nv = s.positions.length / 3
    const tucked = triangleTuck(
      s.triangles,
      new Float32Array(nv).fill(0.01),
      null
    )
    expect(penetration(sdf, shell, tucked).visible).toBe(0)
    const all = Uint32Array.from({ length: nv }, (_, i) => i)
    const dropped = triangleTuck(s.triangles, new Float32Array(nv), all)
    expect(dropped.every((t) => t === Infinity)).toBe(true)
    expect(penetration(sdf, shell, dropped).visible).toBe(0)
    expect(penetration(sdf, shell, dropped).raw).toBe(4)
  })
})

describe('bone sanity', () => {
  const s = sphere(2, 1)
  const sdf = meshSdf(s.positions, s.triangles, { cell: 0.25 })
  const rig = (
    j: Record<string, [string | null, number, number, number]>
  ): FittedRig => {
    const joints = Object.entries(j).map(([name, [parent, x, y, z]]) => ({
      name,
      parent,
      position: { x, y, z },
    }))
    return { joints, at: (n) => joints.find((x) => x.name === n)?.position }
  }
  const base = {
    pelvis: [null, 0, 0, 0],
    thigh_l: ['pelvis', 0.2, -0.1, 0],
    calf_l: ['thigh_l', 0.2, -0.4, 0],
    thigh_r: ['pelvis', -0.2, -0.1, 0],
    calf_r: ['thigh_r', -0.2, -0.4, 0],
  } as Record<string, [string | null, number, number, number]>
  const ref = boneReference(rig(base), 1, sdf)

  test('the default is clean', () => {
    expect(checkBones(rig(base), 1, sdf, ref).issues).toEqual([])
  })
  test('a stretched, lopsided, folded, escaped leg is flagged', () => {
    const bad = {
      ...base,
      calf_l: ['thigh_l', 0.2, 0.8, 0] as [string, number, number, number],
    }
    const kinds = checkBones(rig(bad), 1, sdf, ref).issues.map(
      (i) => `${i.kind}:${i.joint}`
    )
    expect(kinds).toContain('scale:calf_l')
    expect(kinds).toContain('asymmetric:calf_l')
    expect(kinds).toContain('order:calf_l')
  })
  test('a joint outside the skin, inside on the default, is flagged', () => {
    const out = {
      ...base,
      calf_r: ['thigh_r', -0.2, -0.4, 1.5] as [string, number, number, number],
    }
    const kinds = checkBones(rig(out), 1, sdf, ref).issues.map(
      (i) => `${i.kind}:${i.joint}`
    )
    expect(kinds).toContain('outside:calf_r')
  })
})

describe('the report', () => {
  const corner = (id: string, group: 'default' | 'macro') => ({
    id,
    group,
    body: {
      gender: 0.5,
      age: 0.5,
      muscle: 0.5,
      weight: 0.5,
      height: 0.5,
      proportions: 0.5,
      african: 1 / 3,
      asian: 1 / 3,
      caucasian: 1 / 3,
    },
  })
  const pen = (visible: number) => ({
    vertices: 1000,
    raw: visible,
    rawDepth: 0.005,
    visible,
    visibleDepth: visible ? 0.004 : 0,
    visibleBeyond: [visible, 0, 0] as [number, number, number],
  })
  const item = (name: string) => ({
    id: `makehuman:proxy/${name}`,
    name,
    source: 'makehuman' as const,
    category: 'clothes',
    slot: 'top',
    licence: { licence: 'CC0-1.0', author: 'a', source: 's' },
    vertices: 1000,
  })
  const result: SweepResult = {
    items: [item('good'), item('extreme'), item('broken')],
    boneBaseline: [],
    boundaryEdges: 0,
    corners: [
      {
        corner: corner('default', 'default'),
        height: 1.7,
        bones: [],
        ms: 1,
        items: {
          'makehuman:proxy/good': pen(0),
          'makehuman:proxy/extreme': pen(1),
          'makehuman:proxy/broken': pen(50),
        },
      },
      {
        corner: corner('g1-w1', 'macro'),
        height: 1.8,
        bones: [],
        ms: 1,
        items: {
          'makehuman:proxy/good': pen(2),
          'makehuman:proxy/extreme': pen(30),
          'makehuman:proxy/broken': pen(50),
        },
      },
    ],
  }
  test('verdicts, and the candidates are what holds up', () => {
    const s = summarise(result)
    const v = Object.fromEntries(s.items.map((i) => [i.item.name, i.verdict]))
    expect(v).toEqual({
      good: 'holds',
      extreme: 'fails-at-extremes',
      broken: 'broken-at-default',
    })
    expect(s.candidates).toEqual({ top: ['good'] })
    expect(s.worstCases[0]!.item).toBe('makehuman:proxy/broken')
    expect(fails(3, 1000)).toBe(false)
    expect(fails(4, 1000)).toBe(true)
    expect(fails(2, 1000)).toBe(false)
    expect(fails(4, 100)).toBe(true)
  })
})

describe('the hair library reader', () => {
  test('reads top-level pieces in the file frame, through node transforms', () => {
    const pos = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0])
    const idx = new Uint16Array([0, 1, 2, 0])
    const bin = new Uint8Array(pos.byteLength + idx.byteLength)
    bin.set(new Uint8Array(pos.buffer), 0)
    bin.set(new Uint8Array(idx.buffer), pos.byteLength)
    const json = {
      asset: { version: '2.0' },
      scene: 0,
      scenes: [{ nodes: [0] }],
      nodes: [
        {
          name: 'Hair_Test',
          extras: { category: 'hair' },
          children: [1],
          translation: [0, 1, 0],
        },
        { mesh: 0, scale: [2, 2, 2] },
      ],
      meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }],
      accessors: [
        { bufferView: 0, componentType: 5126, count: 3, type: 'VEC3' },
        { bufferView: 1, componentType: 5123, count: 3, type: 'SCALAR' },
      ],
      bufferViews: [
        { buffer: 0, byteOffset: 0, byteLength: pos.byteLength },
        { buffer: 0, byteOffset: pos.byteLength, byteLength: 6 },
      ],
      buffers: [{ byteLength: bin.byteLength }],
    }
    const pieces = readHairLibrary(writeGlb(json, bin))
    expect(pieces.length).toBe(1)
    expect(pieces[0]!.name).toBe('Hair_Test')
    expect(pieces[0]!.category).toBe('hair')
    expect(Array.from(pieces[0]!.parts[0]!.positions)).toEqual([
      0, 1, 0, 2, 1, 0, 0, 3, 0,
    ])
    expect(Array.from(pieces[0]!.parts[0]!.indices)).toEqual([0, 1, 2])
  })
})

// The real thing, when the pack is on this machine (it is not in CI).
const STATIC = [join(import.meta.dir, '../../static-assets')].find((d) =>
  existsSync(join(d, 'assets/makehuman/hm08/hm08.json'))
)
describe('on the hm08 pack', () => {
  const t = STATIC ? test : test.skip
  t(
    `${
      STATIC ? '' : 'NOT RUN (no ../static-assets): '
    }a MakeHuman garment on two corners`,
    async () => {
      const { loadHumanPack } = await import('./human-pack.js')
      const { runSweep } = await import('./extremes-sweep.js')
      const pack = await loadHumanPack(
        join(STATIC!, 'assets/makehuman/hm08/hm08.json'),
        async (u: string) => await Bun.file(u).arrayBuffer()
      )
      const corners = sweepCorners({ quick: true }).slice(0, 2)
      const r = await runSweep({
        pack,
        corners,
        proxies: ['male_casualsuit02', 'short03'],
      })
      expect(r.boundaryEdges).toBe(0)
      expect(r.corners.length).toBe(2)
      const d = r.corners[0]!
      expect(d.corner.id).toBe('default')
      expect(d.bones).toEqual([])
      expect(
        d.items['makehuman:proxy/male_casualsuit02']!.vertices
      ).toBeGreaterThan(1000)
      // The default body's pelvis and spine are inside the skin.
      expect(r.boneBaseline).not.toContain('pelvis')
      expect(r.boneBaseline).not.toContain('spine_02')
    },
    60000
  )
})
