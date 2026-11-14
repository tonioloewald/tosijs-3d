import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { validateBytes } from 'gltf-validator'
import { readGlbClips, clipPose, bakeClip, sampleChannel } from './glb-clips.js'
import { readGlb } from './glb-chunks.js'

const ASSETS = join(import.meta.dir, '..', '..', 'static-assets', 'assets')
const UAL = join(ASSETS, 'quaternius', 'UAL1.glb')
const OMNI = join(import.meta.dir, '..', 'static', 'omnidude.glb')
const AI = join(ASSETS, 'tonio', 'ai', 'african-american-female-10k.glb')

/** The same file through Babylon's loader and readSkeleton, for comparison. */
async function viaBabylon(file: string) {
  const BABYLON = await import('@babylonjs/core')
  await import('@babylonjs/loaders')
  const { readSkeleton } = await import('./retarget-babylon.js')
  const engine = new BABYLON.NullEngine()
  const scene = new BABYLON.Scene(engine)
  const c = await BABYLON.LoadAssetContainerAsync(
    'data:;base64,' + readFileSync(file).toString('base64'),
    scene,
    { pluginExtension: '.glb' }
  )
  c.addAllToScene()
  const root = c.meshes.find((m) => m.name === '__root__')!
  const read = readSkeleton(c.skeletons[0], root)
  return { BABYLON, engine, c, read }
}

const sameTurn = (a: any, b: any) =>
  Math.abs(a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w)

describe('glb clips: read as Babylon reads them', () => {
  for (const [label, file] of [
    ['UAL', UAL],
    ['Mixamo (an armature, centimetres under a 0.01)', OMNI],
  ] as const)
    test.skipIf(!existsSync(file))(
      `${label}: rest, roles and a sampled pose`,
      async () => {
        const pure = readGlbClips(new Uint8Array(readFileSync(file)))
        const { engine, c, read } = await viaBabylon(file)
        const byName = new Map(read.bones.map((b) => [b.name, b]))
        expect(pure.bones.length).toBe(read.bones.length)
        for (const b of pure.bones) {
          const o = byName.get(b.name)!
          expect(b.parent).toBe(o.parent)
          expect(sameTurn(b.rotation, o.rotation)).toBeGreaterThan(0.9999)
          expect(
            Math.hypot(
              b.position.x - o.position.x,
              b.position.y - o.position.y,
              b.position.z - o.position.z
            )
          ).toBeLessThan(1e-4)
        }
        expect(pure.roles).toEqual(read.roles)
        // A pose, mid-clip, against Babylon's own evaluation of the same keys.
        const clip = pure.clips[0]
        const group = c.animationGroups.find((g) => g.name === clip.name)!
        const t = clip.start + (clip.end - clip.start) * 0.37
        const pose = clipPose(pure, clip, t)
        let checked = 0
        for (const ta of group.targetedAnimations) {
          if (ta.animation.targetProperty !== 'rotationQuaternion') continue
          const name = (ta.target as any).name
          const want = ta.animation.evaluate(t * ta.animation.framePerSecond)
          let w = { x: want.x, y: want.y, z: want.z, w: want.w }
          const a = read.above.get(name)
          if (a) {
            // above · local, as retargetClip composes it
            w = {
              x: a.w * w.x + a.x * w.w + a.y * w.z - a.z * w.y,
              y: a.w * w.y - a.x * w.z + a.y * w.w + a.z * w.x,
              z: a.w * w.z + a.x * w.y - a.y * w.x + a.z * w.w,
              w: a.w * w.w - a.x * w.x - a.y * w.y - a.z * w.z,
            }
          }
          const got = pose.rotations.get(name)
          if (!got) continue
          expect(sameTurn(got, w)).toBeGreaterThan(0.9995)
          checked++
        }
        expect(checked).toBeGreaterThan(20)
        engine.dispose()
      },
      60000
    )
})

describe('glb clips: sampling', () => {
  test('linear, step and the ends', () => {
    const ch = {
      node: 'n',
      path: 'translation' as const,
      interpolation: 'LINEAR' as const,
      times: Float64Array.from([0, 1]),
      values: Float64Array.from([0, 0, 0, 2, 4, 6]),
    }
    expect(sampleChannel(ch, 0.5)).toEqual([1, 2, 3])
    expect(sampleChannel(ch, -1)).toEqual([0, 0, 0])
    expect(sampleChannel(ch, 9)).toEqual([2, 4, 6])
    expect(sampleChannel({ ...ch, interpolation: 'STEP' }, 0.9)).toEqual([
      0, 0, 0,
    ])
    const r = sampleChannel(
      {
        ...ch,
        path: 'rotation',
        values: Float64Array.from([0, 0, 0, 1, 0, 1, 0, 0]),
      },
      0.5
    )
    expect(r[1]).toBeCloseTo(Math.SQRT1_2, 6)
    expect(r[3]).toBeCloseTo(Math.SQRT1_2, 6)
  })
})

describe.skipIf(!existsSync(UAL) || !existsSync(AI))(
  'glb clips in an exported body',
  () => {
    test("UAL's walk retargeted onto a body and written as a glTF animation", async () => {
      const { glbRigTriangles } = await import('./glb-rig.js')
      const { bodyFromMarkers } = await import('./rigged-body.js')
      const { riggedBodyGlb } = await import('./rigged-body-glb.js')
      const ual = readGlbClips(new Uint8Array(readFileSync(UAL)))
      expect(ual.clips.some((c) => c.name === 'Walk_Loop')).toBe(true)
      const body = bodyFromMarkers(
        glbRigTriangles(new Uint8Array(readFileSync(AI)))
      )
      const bytes = riggedBodyGlb(body, {
        height: 1.7,
        clips: [
          { from: ual, clip: 'Walk_Loop', extras: { license: 'CC0 1.0' } },
        ],
      })
      const { json } = readGlb(bytes)
      expect(json.animations).toHaveLength(1)
      const walk = json.animations[0]
      expect(walk.name).toBe('Walk_Loop')
      expect(walk.extras).toEqual({ license: 'CC0 1.0' })
      expect(walk.channels.length).toBeGreaterThan(20)
      const paths = walk.channels.map(
        (c: any) => json.nodes[c.target.node].name + '.' + c.target.path
      )
      expect(paths).toContain('pelvis.translation')
      expect(paths).toContain('thigh_l.rotation')
      const report = await validateBytes(bytes, { maxIssues: 50 })
      expect(
        report.issues.messages.filter(
          (m: { code: string; severity: number }) =>
            m.severity === 0 &&
            m.code !== 'MESH_PRIMITIVE_GENERATED_TANGENT_SPACE'
        )
      ).toEqual([])

      // The walk on the written skeleton is UAL's walk: a thigh swings through
      // the same arc (the export's rest frames are UAL's, so its keys match).
      const bones = json.skins[0].joints.map((j: number) => {
        const n = json.nodes[j]
        const p = json.nodes.findIndex((x: any) => x.children?.includes(j))
        return {
          name: n.name,
          parent: p >= 0 ? json.nodes[p].name : null,
          rotation: {
            x: n.rotation[0],
            y: n.rotation[1],
            z: n.rotation[2],
            w: n.rotation[3],
          },
          position: {
            x: n.translation[0],
            y: n.translation[1],
            z: n.translation[2],
          },
        }
      })
      const { humanoidRoles } = await import('./retarget.js')
      const baked = bakeClip(ual, 'Walk_Loop', {
        bones,
        roles: humanoidRoles(bones),
      })
      const src = ual.clips.find((c) => c.name === 'Walk_Loop')!
      const k = Math.floor(baked.times.length / 3)
      const got = baked.rotations.get('thigh_l')!.slice(k * 4, k * 4 + 4)
      const want = clipPose(ual, src, src.start + baked.times[k]).rotations.get(
        'thigh_l'
      )!
      expect(
        sameTurn({ x: got[0], y: got[1], z: got[2], w: got[3] }, want)
      ).toBeGreaterThan(0.995)
    }, 120000)
  }
)

describe.skipIf(!existsSync(UAL) || !existsSync(OMNI))(
  'retargetSourceClip: a clip held as data plays as a loaded one does',
  () => {
    test("UAL's walk from the pure reader matches retargetClip from Babylon's group", async () => {
      const { retargetClip, retargetSourceClip } = await import(
        './retarget-babylon.js'
      )
      const ual = await viaBabylon(UAL)
      const omni = await viaBabylon(OMNI)
      const pure = readGlbClips(new Uint8Array(readFileSync(UAL)))
      const clip = pure.clips.find((c) => c.name === 'Walk_Loop')!
      const group = ual.c.animationGroups.find((g) => g.name === 'Walk_Loop')!
      const a = retargetClip(group, ual.read, omni.read, { fps: 30 })
      const b = retargetSourceClip(pure, clip, omni.read, { fps: 30 })
      const byTarget = (g: any) =>
        new Map<string, any>(
          g.targetedAnimations
            .filter(
              (t: any) => t.animation.targetProperty === 'rotationQuaternion'
            )
            .map((t: any) => [t.target.name, t.animation])
        )
      const ka = byTarget(a)
      const kb = byTarget(b)
      expect(kb.size).toBe(ka.size)
      expect(kb.size).toBeGreaterThan(15)
      let worst = 0
      for (const [name, anim] of ka) {
        const other = kb.get(name)!
        const keys = anim.getKeys()
        const okeys = other.getKeys()
        expect(okeys.length).toBe(keys.length)
        for (let k = 0; k < keys.length; k += 5) {
          const d = sameTurn(keys[k].value, okeys[k].value)
          worst = Math.max(
            worst,
            (2 * Math.acos(Math.min(1, d)) * 180) / Math.PI
          )
        }
      }
      expect(worst).toBeLessThan(0.5)
      ual.engine.dispose()
      omni.engine.dispose()
    }, 60000)
  }
)

const PACK = join(ASSETS, 'makehuman', 'hm08', 'hm08.json')

describe('glb clips: foot IK on a straight leg', () => {
  test.skipIf(!existsSync(UAL) || !existsSync(PACK))(
    "MakeHuman's idle: the legs turn smoothly, frame to frame",
    async () => {
      // The right leg is nearly straight in UAL's idle: bending it in the
      // plane of a knee a few millimetres off the line twisted it 6° to 12°
      // in a frame near the end of the loop.
      const { humanoidRoles } = await import('./retarget.js')
      const { fittedRestBones } = await import('./rig-fit.js')
      const { humanBodyMaker } = await import('./human-rig.js')
      const { loadHumanPack } = await import('./human-pack.js')
      const fromDisk = async (url: string) => {
        const b = readFileSync(url)
        return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)
      }
      const ual = readGlbClips(new Uint8Array(readFileSync(UAL)))
      const maker = await humanBodyMaker(await loadHumanPack(PACK, fromDisk))
      const bones = fittedRestBones(maker.first.rig)
      const target = { bones, roles: humanoidRoles(bones) }
      const baked = bakeClip(ual, 'Idle_Loop', target, { fps: 60 })
      let worst = 0
      for (const role of [
        'l-upperLeg',
        'r-upperLeg',
        'l-lowerLeg',
        'r-lowerLeg',
      ] as const) {
        const q = baked.rotations.get(target.roles[role]!)!
        for (let i = 4; i < q.length; i += 4) {
          const d = Math.abs(
            q[i] * q[i - 4] +
              q[i + 1] * q[i - 3] +
              q[i + 2] * q[i - 2] +
              q[i + 3] * q[i - 1]
          )
          worst = Math.max(
            worst,
            (2 * Math.acos(Math.min(1, d)) * 180) / Math.PI
          )
        }
      }
      expect(worst).toBeLessThan(2)
    },
    60000
  )
})

describe.skipIf(!existsSync(UAL))('glb clips: mirror', () => {
  const deg = (a: any, b: any) =>
    (2 * Math.acos(Math.min(1, sameTurn(a, b))) * 180) / Math.PI
  const mul = (a: any, b: any) => ({
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
  })
  const conj = (q: any) => ({ x: -q.x, y: -q.y, z: -q.z, w: q.w })
  const at = (baked: any, name: string, k: number) => {
    const q = baked.rotations.get(name)
    return q
      ? { x: q[k * 4], y: q[k * 4 + 1], z: q[k * 4 + 2], w: q[k * 4 + 3] }
      : null
  }
  /** Each bone's model-space rotation in frame k. */
  const worldAt = (ual: any, baked: any, k: number) => {
    const out = new Map<string, any>()
    for (const b of ual.bones) {
      const local = at(baked, b.name, k) ?? b.rotation
      const p = b.parent != null ? out.get(b.parent) : null
      out.set(b.name, p ? mul(p, local) : local)
    }
    return out
  }
  const restWorld = (ual: any) => {
    const out = new Map<string, any>()
    for (const b of ual.bones) {
      const p = b.parent != null ? out.get(b.parent) : null
      out.set(b.name, p ? mul(p, b.rotation) : b.rotation)
    }
    return out
  }
  const reflect = (q: any) => ({ x: q.x, y: -q.y, z: -q.z, w: q.w })

  test("a mirrored clip turns each bone as its partner turned, reflected", () => {
    const ual = readGlbClips(new Uint8Array(readFileSync(UAL)))
    const plain = bakeClip(ual, 'Walk_Loop', ual, { fps: 30, footIk: false })
    const mirrored = bakeClip(ual, 'Walk_Loop', ual, {
      fps: 30,
      footIk: false,
      mirror: true,
    })
    const rest = restWorld(ual)
    const k = Math.floor(plain.times.length / 3)
    const a = worldAt(ual, plain, k)
    const b = worldAt(ual, mirrored, k)
    let worst = 0
    for (const [l, r] of [
      ['upperarm_l', 'upperarm_r'],
      ['hand_l', 'hand_r'],
      ['thigh_l', 'thigh_r'],
      ['calf_r', 'calf_l'],
      ['spine_03', 'spine_03'],
      ['Head', 'Head'],
    ]) {
      // The turn since rest of one side, reflected, is the other's.
      const want = reflect(mul(a.get(l), conj(rest.get(l))))
      const got = mul(b.get(r), conj(rest.get(r)))
      worst = Math.max(worst, deg(want, got))
    }
    expect(worst).toBeLessThan(1)
    // The hips go the other way sideways.
    const hx = plain.hips![k * 3]
    const mx = mirrored.hips![k * 3]
    const rx = ual.bones.find((b) => b.name === 'pelvis')!.position.x
    expect(mx - rx).toBeCloseTo(-(hx - rx), 3)
  })

  test("UAL's mirrored walk is its walk half a step on", () => {
    const ual = readGlbClips(new Uint8Array(readFileSync(UAL)))
    const plain = bakeClip(ual, 'Walk_Loop', ual, { fps: 30, footIk: false })
    const mirrored = bakeClip(ual, 'Walk_Loop', ual, {
      fps: 30,
      footIk: false,
      mirror: true,
    })
    const n = plain.times.length - 1
    const half = Math.round(n / 2)
    // On average: UAL's walk is itself a little lopsided (about 20° at one
    // moment), so the worst frame says more about the clip than the mirror.
    let sum = 0
    let count = 0
    for (const name of ['thigh_l', 'thigh_r', 'calf_l', 'calf_r']) {
      for (let k = 0; k < n; k++) {
        sum += deg(at(mirrored, name, k), at(plain, name, (k + half) % n))
        count++
      }
    }
    expect(sum / count).toBeLessThan(5)
  })
})
