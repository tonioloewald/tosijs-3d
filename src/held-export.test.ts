import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { validateBytes } from 'gltf-validator'
import { readGlb } from './glb-chunks.js'
import { glbRigTriangles } from './glb-rig.js'
import { bodyFromMarkers } from './rigged-body.js'
import { riggedBodyGlb } from './rigged-body-glb.js'

// b3d-launcher (whose handSocket the builder holds items on) defines a tosijs
// Component at load: the few globals it touches, as b3d-launcher.spawn.test does.
const g = globalThis as any
const noopEl = () => ({
  style: {},
  append() {},
  appendChild() {},
  addEventListener() {},
  setAttribute() {},
  querySelector: () => null,
})
g.HTMLElement ??= class {}
g.customElements ??= { define() {}, get() {} }
g.document ??= {
  head: noopEl(),
  body: noopEl(),
  createElement: noopEl,
  addEventListener() {},
  removeEventListener() {},
  querySelector: () => null,
}
g.addEventListener ??= () => {}
g.window ??= g

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

const WEAPONS = join(
  import.meta.dir,
  '..',
  '..',
  'static-assets',
  'assets',
  'tonio',
  'weapons-classic',
  'weapons.glb'
)

describe.skipIf(!existsSync(AI) || !existsSync(WEAPONS))(
  'rigged-body-glb: a held item',
  () => {
    test('weapon_r sits where the builder puts the grip, the item on it', async () => {
      const { holdGrip } = await import('./hold-grip.js')
      const { glbNodePosition } = await import('./glb-rig.js')
      const { gripMatrix, mat4Multiply } = await import('./hand-socket.js')
      const body = bodyFromMarkers(
        glbRigTriangles(new Uint8Array(readFileSync(AI)))
      )
      const lib = new Uint8Array(readFileSync(WEAPONS))
      const pick = 'Long Sword.model'
      const item = glbRigTriangles(lib, { pick })
      const gp = glbNodePosition(lib, 'Long Sword_grip', { pick })!
      const grip = { ...holdGrip('Long Sword'), scale: 1.25 }
      const bytes = riggedBodyGlb(body, {
        held: { grip, item, gripPoint: gp, extras: { licence: 'CC-BY-4.0' } },
      })
      const { json } = readGlb(bytes)
      const names = json.skins[0].joints.map((j: number) => json.nodes[j].name)
      expect(names.length).toBe(66)
      expect(names[65]).toBe('weapon_r')
      const held = json.meshes.find((m: any) => m.name === 'held')
      expect(held.extras).toEqual({ licence: 'CC-BY-4.0' })

      const report = await validateBytes(bytes, { maxIssues: 50 })
      expect(
        report.issues.messages.filter(
          (m: { code: string; severity: number }) =>
            m.severity === 0 &&
            m.code !== 'MESH_PRIMITIVE_GENERATED_TANGENT_SPACE'
        )
      ).toEqual([])

      // Loaded as the builder loads a body: the launcher's own socket on the
      // file's skeleton, the grip composed on it, is where weapon_r is.
      const BABYLON = await import('@babylonjs/core')
      await import('@babylonjs/loaders')
      const { handSocket } = await import('./b3d-launcher.js')
      const engine = new BABYLON.NullEngine()
      const scene = new BABYLON.Scene(engine)
      const c = await BABYLON.LoadAssetContainerAsync(
        'data:;base64,' + Buffer.from(bytes).toString('base64'),
        scene,
        { pluginExtension: '.glb' }
      )
      c.addAllToScene()
      const skeleton = c.skeletons[0]
      const handNode = skeleton.bones
        .find((b) => b.name === 'hand_r')!
        .getTransformNode()!
      for (const m of scene.transformNodes) m.computeWorldMatrix(true)
      const socket = handSocket(skeleton, 'hand_r', 'r', handNode)!
      socket.computeWorldMatrix(true)
      const expected = mat4Multiply(
        gripMatrix(grip),
        Array.from(socket.getWorldMatrix().m)
      )
      const weapon = scene.transformNodes.find((n) => n.name === 'weapon_r')!
      const got = Array.from(weapon.computeWorldMatrix(true).m)
      for (let k = 0; k < 16; k++) expect(got[k]).toBeCloseTo(expected[k], 4)

      // The item: its grip point on the joint, at the grip's scale.
      const mesh = c.meshes.find((m) => m.name.startsWith('held'))!
      const p = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind)!
      const inv = BABYLON.Matrix.Invert(weapon.getWorldMatrix())
      // Bind pose: the mesh's vertices in the scene's frame, then into the joint's.
      const toScene = mesh.computeWorldMatrix(true)
      let hiY = -Infinity
      let loY = Infinity
      for (let i = 0; i < p.length; i += 3) {
        const v = BABYLON.Vector3.TransformCoordinates(
          BABYLON.Vector3.TransformCoordinates(
            new BABYLON.Vector3(p[i], p[i + 1], p[i + 2]),
            toScene
          ),
          inv
        )
        hiY = Math.max(hiY, v.y)
        loY = Math.min(loY, v.y)
      }
      let srcHi = -Infinity
      let srcLo = Infinity
      for (let i = 1; i < item.positions.length; i += 3) {
        srcHi = Math.max(srcHi, item.positions[i] - gp.y)
        srcLo = Math.min(srcLo, item.positions[i] - gp.y)
      }
      expect(hiY).toBeCloseTo(srcHi * 1.25, 3)
      expect(loY).toBeCloseTo(srcLo * 1.25, 3)
      engine.dispose()
    }, 120000)

    test('read back as a body, the export is its skin and eyes, not the item', async () => {
      const { holdGrip } = await import('./hold-grip.js')
      const { glbNodePosition } = await import('./glb-rig.js')
      const body = bodyFromMarkers(
        glbRigTriangles(new Uint8Array(readFileSync(AI)))
      )
      const lib = new Uint8Array(readFileSync(WEAPONS))
      const pick = 'Long Sword.model'
      const item = glbRigTriangles(lib, { pick })
      const gripPoint = glbNodePosition(lib, 'Long Sword_grip', { pick })!
      const bare = riggedBodyGlb(body)
      const holding = riggedBodyGlb(body, {
        held: { grip: holdGrip('Long Sword'), item, gripPoint },
      })
      const a = glbRigTriangles(bare)
      const b = glbRigTriangles(holding)
      expect(b.positions.length).toBe(a.positions.length)
      expect(b.indices.length).toBe(a.indices.length)

      // The builder's own reader takes the same.
      const BABYLON = await import('@babylonjs/core')
      await import('@babylonjs/loaders')
      const { loadSkinnedBody } = await import('./rig-build.js')
      const engine = new BABYLON.NullEngine()
      const scene = new BABYLON.Scene(engine)
      const url = (bytes: Uint8Array) =>
        'data:;base64,' + Buffer.from(bytes).toString('base64')
      const loaded = async (bytes: Uint8Array) => {
        const r = await loadSkinnedBody(scene, url(bytes))
        return r!.indices.length
      }
      expect(await loaded(holding)).toBe(await loaded(bare))
      engine.dispose()
    }, 120000)

    test('the socket alone, with no item', () => {
      const body = bodyFromMarkers(
        glbRigTriangles(new Uint8Array(readFileSync(AI)))
      )
      const { json } = readGlb(
        riggedBodyGlb(body, {
          held: {
            grip: { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 },
            side: 'l',
            name: 'socket_l',
          },
        })
      )
      const names = json.skins[0].joints.map((j: number) => json.nodes[j].name)
      expect(names[65]).toBe('socket_l')
      expect(json.nodes[json.skins[0].joints[65]].name).toBe('socket_l')
      expect(json.meshes.some((m: any) => m.name === 'held')).toBe(false)
    }, 60000)
  }
)
