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
