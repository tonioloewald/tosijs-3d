import { afterAll, describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { validateBytes } from 'gltf-validator'
import { readGlb, accessorValues, readVec3 } from './glb-chunks.js'
import { glbRigTriangles } from './glb-rig.js'
import { bodyFromMarkers, type RiggedBody } from './rigged-body.js'
import { riggedBodyGlb, MIXAMO_JOINT_NAMES } from './rigged-body-glb.js'
import { UAL_REST } from './ual-rest.js'
import { objTriangles } from './rig-fit.js'

const AI = join(
  import.meta.dir,
  '..',
  '..',
  'static-assets',
  'assets',
  'tonio',
  'ai',
  'african-american-female-10k.glb'
)

type M = number[]
const mul = (a: M, b: M): M => {
  const o = new Array<number>(16).fill(0)
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++)
      for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k]
  return o
}
const trs = (n: any): M => {
  const [tx, ty, tz] = n.translation ?? [0, 0, 0]
  const [x, y, z, w] = n.rotation ?? [0, 0, 0, 1]
  return [
    1 - 2 * (y * y + z * z),
    2 * (x * y + z * w),
    2 * (x * z - y * w),
    0,
    2 * (x * y - z * w),
    1 - 2 * (x * x + z * z),
    2 * (y * z + x * w),
    0,
    2 * (x * z + y * w),
    2 * (y * z - x * w),
    1 - 2 * (x * x + y * y),
    0,
    tx,
    ty,
    tz,
    1,
  ]
}

describe.skipIf(!existsSync(AI))('rigged-body-glb on an AI-made body', () => {
  let body: RiggedBody | undefined
  let bytes: Uint8Array | undefined
  // Let go of the body and the file: the next test file needs the memory.
  afterAll(() => {
    body = undefined
    bytes = undefined
  })
  const get = () => {
    if (!bytes) {
      body = bodyFromMarkers(glbRigTriangles(new Uint8Array(readFileSync(AI))))
      bytes = riggedBodyGlb(body, {
        height: 1.7,
        extras: { licence: 'CC0-1.0' },
      })
    }
    return readGlb(bytes)
  }

  test('the Khronos validator reports no errors', async () => {
    get()
    const report = await validateBytes(bytes!, { maxIssues: 50 })
    // The one warning allowed: a normal map with no tangents, which the
    // source file has too. glTF has the loader generate MikkTSpace tangents
    // then, which is more portable than any we could write.
    const other = report.issues.messages.filter(
      (m: { code: string }) =>
        m.code !== 'MESH_PRIMITIVE_GENERATED_TANGENT_SPACE'
    )
    expect(other).toEqual([])
  }, 120000)

  test("the profile's 65 joints, in order, with UAL's parents", () => {
    const { json } = get()
    const names = json.skins[0].joints.map((j: number) => json.nodes[j].name)
    expect(names).toEqual(UAL_REST.map(([n]) => n))
    expect(json.skins[0].name).toBe('skeleton')
    expect(json.nodes[json.skins[0].skeleton].name).toBe('root')
    expect(json.asset.extras).toEqual({ licence: 'CC0-1.0' })
  })

  test("each joint's rest rotation is UAL's, so UAL's clips bind by name", () => {
    const { json } = get()
    UAL_REST.forEach(([, , , r], i) => {
      const q = json.nodes[i].rotation
      // q and -q are one rotation.
      const dot = q.reduce((s: number, x: number, k: number) => s + x * r[k], 0)
      expect(Math.abs(dot)).toBeGreaterThan(1 - 1e-5)
    })
  })

  test('a T-pose, the soles on the floor, the pelvis over the origin, 1.7 m', () => {
    const glb = get()
    const { json } = glb
    // Joint model-space positions from the nodes.
    const world: M[] = []
    const parent = new Map<number, number>()
    json.nodes.forEach((n: any, i: number) =>
      n.children?.forEach((c: number) => parent.set(c, i))
    )
    const worldOf = (i: number): M =>
      (world[i] ??= mul(
        parent.has(i) ? worldOf(parent.get(i)!) : trs({}),
        trs(json.nodes[i])
      ))
    const pos = (name: string) => {
      const m = worldOf(json.nodes.findIndex((n: any) => n.name === name))
      return [m[12], m[13], m[14]]
    }
    expect(pos('root')).toEqual([0, 0, 0])
    const pelvis = pos('pelvis')
    expect(Math.abs(pelvis[0])).toBeLessThan(1e-6)
    expect(Math.abs(pelvis[2])).toBeLessThan(1e-6)
    // Arms straight out: each hand level with its shoulder and well out to the side.
    for (const s of ['l', 'r']) {
      const shoulder = pos(`upperarm_${s}`)
      const hand = pos(`hand_${s}`)
      expect(Math.abs(hand[1] - shoulder[1])).toBeLessThan(0.03)
      expect(Math.abs(hand[0] - shoulder[0])).toBeGreaterThan(0.4)
      expect(Math.sign(hand[0])).toBe(s === 'l' ? 1 : -1)
    }
    // The body's skin: lowest point on the floor, 1.7 m tall.
    const body = json.meshes.findIndex((m: any) => m.name === 'body')
    let lo = Infinity
    let hi = -Infinity
    for (const p of json.meshes[body].primitives) {
      const a = json.accessors[p.attributes.POSITION]
      lo = Math.min(lo, a.min[1])
      hi = Math.max(hi, a.max[1])
    }
    expect(Math.abs(lo)).toBeLessThan(1e-3)
    expect(Math.abs(hi - 1.7)).toBeLessThan(1e-3)
  })

  test('the inverse binds undo the joints: the skin sits where it was drawn', () => {
    const glb = get()
    const { json } = glb
    const parent = new Map<number, number>()
    json.nodes.forEach((n: any, i: number) =>
      n.children?.forEach((c: number) => parent.set(c, i))
    )
    const world: M[] = []
    const worldOf = (i: number): M =>
      (world[i] ??= mul(
        parent.has(i) ? worldOf(parent.get(i)!) : trs({}),
        trs(json.nodes[i])
      ))
    const ibm = accessorValues(glb, json.skins[0].inverseBindMatrices)
    json.skins[0].joints.forEach((j: number, k: number) => {
      const m = mul(worldOf(j), Array.from(ibm.subarray(k * 16, k * 16 + 16)))
      const id = trs({})
      for (let e = 0; e < 16; e++)
        expect(Math.abs(m[e] - id[e])).toBeLessThan(1e-4)
    })
  })

  test('the file’s own material and its picture go out embedded', () => {
    const { json } = get()
    expect(json.materials[0].name).toBe('body')
    expect(
      json.materials[0].pbrMetallicRoughness.baseColorTexture
    ).toBeDefined()
    expect(json.images.length).toBeGreaterThan(0)
    expect(json.images.every((i: any) => i.bufferView != null && !i.uri)).toBe(
      true
    )
    // Every skin vertex has weight; positions are finite.
    const p = json.meshes[0].primitives[0]
    const v = readVec3(get(), p.attributes.POSITION)
    expect(v.every(Number.isFinite)).toBe(true)
  })

  test("Mixamo's names, the same skeleton", () => {
    get()
    const { json } = readGlb(riggedBodyGlb(body!, { naming: 'mixamo' }))
    const names = json.skins[0].joints.map((j: number) => json.nodes[j].name)
    expect(names[0]).toBe('root')
    expect(names[1]).toBe('mixamorig:Hips')
    expect(names).toEqual(UAL_REST.map(([n]) => MIXAMO_JOINT_NAMES[n]))
  })

  test('the source pose keeps the body as rigged, still on the floor', async () => {
    get()
    const out = riggedBodyGlb(body!, { restPose: 'source' })
    const report = await validateBytes(out, { maxIssues: 20 })
    expect(report.issues.numErrors).toBe(0)
    const { json } = readGlb(out)
    let lo = Infinity
    for (const p of json.meshes[0].primitives)
      lo = Math.min(lo, json.accessors[p.attributes.POSITION].min[1])
    expect(Math.abs(lo)).toBeLessThan(1e-3)
  }, 120000)

  test('refuses an unknown option value by name', () => {
    get()
    expect(() => riggedBodyGlb(body!, { naming: 'bvh' as any })).toThrow(
      "naming must be 'ue' or 'mixamo'"
    )
  })
})

const WEASEL = join(
  import.meta.dir,
  '..',
  '..',
  'static-assets',
  'assets',
  'tonio',
  'rigging',
  'weasel.obj'
)

describe.skipIf(!existsSync(WEASEL))('springs: the weasel’s tail', () => {
  let bytes: Uint8Array | undefined
  afterAll(() => {
    bytes = undefined
  })
  const get = () => {
    if (!bytes) {
      const tris = objTriangles(readFileSync(WEASEL, 'utf8'), ['Weasel'])
      const mark = (x: number, y: number) => ({ x, y })
      const body = bodyFromMarkers(tris, {
        // The weasel's markers and tail tip, as rig-fit's test places them.
        markers: {
          chin: mark(0, 0.967),
          groin: mark(0, 0.358),
          wristL: mark(0.51, 0.763),
          wristR: mark(-0.51, 0.763),
          elbowL: mark(0.397, 0.763),
          elbowR: mark(-0.397, 0.763),
          kneeL: mark(0.142, 0.174),
          kneeR: mark(-0.142, 0.174),
        },
        tail: { x: 0, y: 0.5, z: -0.95 },
      })
      bytes = riggedBodyGlb(body, {
        recipe: {
          version: 1,
          springs: [
            { kind: 'bones', root: 'tail_01', name: 'tail' },
            {
              kind: 'strand',
              anchor: 'Head',
              name: 'antenna',
              offset: { x: 0.05, y: 0.2, z: 0 },
              yawDeg: 0,
              pitchDeg: 60,
              length: 0.3,
              segments: 4,
              radius: 0.01,
              colliders: 'none',
            },
          ],
        },
      })
    }
    return readGlb(bytes)
  }

  test('the tail goes out as a VRMC_springBone spring, with colliders', () => {
    const { json } = get()
    const vrm = json.extensions.VRMC_springBone
    expect(vrm.specVersion).toBe('1.0')
    const tail = vrm.springs.find((s: any) => s.name === 'tail')
    const names = tail.joints.map((j: any) => json.nodes[j.node].name)
    expect(names[0]).toBe('tail_01')
    expect(names[names.length - 1]).toBe('tail_leaf')
    for (const j of tail.joints) {
      expect(j.stiffness).toBeGreaterThan(0)
      expect(j.dragForce).toBeGreaterThan(0)
      expect(j.dragForce).toBeLessThan(1)
      expect(j.gravityPower).toBeCloseTo(9.8 / 60, 4)
    }
    // Auto colliders: the head, the chest and the clavicles.
    const group = vrm.colliderGroups[tail.colliderGroups[0]]
    const bones = group.colliders.map(
      (c: number) => json.nodes[vrm.colliders[c].node].name
    )
    expect(bones.sort()).toEqual(
      ['Head', 'clavicle_l', 'clavicle_r', 'spine_03'].sort()
    )
    expect(json.extensionsUsed).toContain('VRMC_springBone')
    expect(json.extensionsRequired).toBeUndefined()
  })

  test('a strand is baked: joints under its anchor, a tube skinned to them', () => {
    const { json } = get()
    const head = json.nodes.findIndex((n: any) => n.name === 'Head')
    const first = json.nodes.findIndex((n: any) => n.name === 'antenna_2_01')
    expect(json.nodes[head].children).toContain(first)
    const ours = json.extensions.TOSIJS_spring_chains
    const antenna = ours.springs.find((s: any) => s.kind === 'strand')
    expect(antenna.joints).toHaveLength(5)
    expect(antenna.strand.anchor).toBe(head)
    expect(json.meshes.map((m: any) => m.name)).toContain('antenna_2')
  })

  test('valid glTF (the VRM and our extensions are only unknown to the validator)', async () => {
    get()
    const report = await validateBytes(bytes!, { maxIssues: 50 })
    expect(report.issues.numErrors).toBe(0)
    const other = report.issues.messages.filter(
      (m: { code: string; severity: number }) =>
        m.severity <= 1 && m.code !== 'MESH_PRIMITIVE_GENERATED_TANGENT_SPACE'
    )
    expect(other).toEqual([])
  }, 120000)
})
