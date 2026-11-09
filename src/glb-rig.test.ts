import { afterAll, describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { glbRigTriangles, type GltfSurfaceMaterial } from './glb-rig.js'
import { bodyFromMarkers } from './rigged-body.js'
import { writeGlb, BinBuilder } from './glb-chunks.js'

const ASSETS = join(import.meta.dir, '..', '..', 'static-assets', 'assets')
const FILES = [
  join(import.meta.dir, '..', 'static', 'omnidude.glb'), // skinned, centimetres
  join(ASSETS, 'quaternius', 'Mannequin_F.glb'), // skinned, two primitives
  join(ASSETS, 'tonio', 'ai', 'african-american-female-10k.glb'), // AI mesh, textured
  join(ASSETS, 'tonio', 'rigging', 'space-marine.glb'), // several nodes
].filter(existsSync)

/** A one-triangle GLB, built here: the reader's own cases need no files. */
function tinyGlb(json: Record<string, unknown>, floats: number[]): Uint8Array {
  const bin = new BinBuilder()
  bin.add(new Uint8Array(new Float32Array(floats).buffer))
  return writeGlb(
    {
      asset: { version: '2.0' },
      buffers: [{ byteLength: bin.bytes().byteLength }],
      bufferViews: bin.views,
      ...json,
    },
    bin.bytes()
  )
}

describe('glb-rig, by itself', () => {
  const triangle = [0, 0, 0, 1, 0, 0, 0, 1, 0]
  const accessors = [
    { bufferView: 0, componentType: 5126, count: 3, type: 'VEC3' },
  ]

  test('applies node transforms, and pick drops the picked node’s own translation', () => {
    const bytes = tinyGlb(
      {
        accessors,
        meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
        nodes: [
          { name: 'Library', translation: [0, 0, 5], children: [1] },
          { name: 'Hero', translation: [10, 0, 0], scale: [2, 2, 2], mesh: 0 },
        ],
        scenes: [{ nodes: [0] }],
      },
      triangle
    )
    const all = glbRigTriangles(bytes)
    expect(Array.from(all.positions).slice(0, 3)).toEqual([10, 0, 5])
    expect(Array.from(all.positions).slice(3, 6)).toEqual([12, 0, 5])
    // Picked, its own translation goes; its parent's still applies.
    const hero = glbRigTriangles(bytes, { pick: 'Hero' })
    expect(Array.from(hero.positions).slice(0, 6)).toEqual([0, 0, 5, 2, 0, 5])
    expect(() => glbRigTriangles(bytes, { pick: 'Villain' })).toThrow(
      'no "Villain"'
    )
  })

  test('a material comes as data, its picture as bytes', () => {
    const png = [137, 80, 78, 71]
    const bytes = tinyGlb(
      {
        accessors,
        meshes: [
          { primitives: [{ attributes: { POSITION: 0 }, material: 0 }] },
        ],
        materials: [
          {
            pbrMetallicRoughness: {
              baseColorFactor: [0.5, 0.25, 1, 1],
              roughnessFactor: 0.3,
              baseColorTexture: { index: 0 },
            },
            doubleSided: true,
          },
        ],
        textures: [{ source: 0 }],
        images: [
          {
            uri:
              'data:image/png;base64,' +
              Buffer.from(new Uint8Array(png)).toString('base64'),
          },
        ],
        nodes: [{ mesh: 0 }],
        scenes: [{ nodes: [0] }],
      },
      triangle
    )
    const { surfaces } = glbRigTriangles(bytes)
    expect(surfaces).toHaveLength(1)
    const m = surfaces![0].material as GltfSurfaceMaterial
    expect(surfaces![0].name).toBe('material0')
    expect(m.baseColorFactor).toEqual([0.5, 0.25, 1, 1])
    expect(m.roughnessFactor).toBe(0.3)
    expect(m.metallicFactor).toBe(1)
    expect(m.doubleSided).toBe(true)
    expect(m.baseColorTexture?.mimeType).toBe('image/png')
    expect(Array.from(m.baseColorTexture!.bytes!)).toEqual(png)
  })

  test('eyes are split out, one per side', () => {
    const left = [0.1, 0, 0, 0.2, 0, 0, 0.1, 0.1, 0]
    const right = left.map((v, i) => (i % 3 === 0 ? -v : v))
    const bytes = tinyGlb(
      {
        accessors: [
          ...accessors,
          {
            bufferView: 0,
            byteOffset: 36,
            componentType: 5126,
            count: 6,
            type: 'VEC3',
          },
        ],
        meshes: [
          { primitives: [{ attributes: { POSITION: 0 } }] },
          { primitives: [{ attributes: { POSITION: 1 } }] },
        ],
        nodes: [
          { name: 'Body', mesh: 0 },
          { name: 'Eyes', mesh: 1 },
        ],
        scenes: [{ nodes: [0, 1] }],
      },
      [...triangle, ...left, ...right]
    )
    const tris = glbRigTriangles(bytes)
    expect(tris.positions.length).toBe(9)
    expect(tris.eyes).toHaveLength(2)
    expect(tris.eyes![0].positions[0]).toBeGreaterThan(0) // left first (+X)
  })

  test('compressed geometry is refused by name', () => {
    const bytes = tinyGlb(
      {
        accessors,
        extensionsRequired: ['KHR_draco_mesh_compression'],
        meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
        nodes: [{ mesh: 0 }],
        scenes: [{ nodes: [0] }],
      },
      triangle
    )
    expect(() => glbRigTriangles(bytes)).toThrow('KHR_draco_mesh_compression')
  })
})

/*
rig-build reaches tosijs (through b3d-utils), which defines components at
load: stub the few globals it touches, as b3d-launcher.spawn.test does.
*/
const STUBBED: string[] = []
function stubDom() {
  const g = globalThis as any
  for (const k of [
    'HTMLElement',
    'customElements',
    'document',
    'addEventListener',
    'window',
  ])
    if (g[k] === undefined) STUBBED.push(k)
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
}

describe.skipIf(FILES.length === 0)('glb-rig against the Babylon path', () => {
  afterAll(() => {
    for (const k of STUBBED) delete (globalThis as any)[k]
  })

  for (const file of FILES) {
    test(`${file
      .split('/')
      .pop()}: the same triangles, frame, uvs and surfaces`, async () => {
      const BABYLON = await import('@babylonjs/core')
      await import('@babylonjs/loaders')
      stubDom()
      const { loadRigTriangles } = await import('./rig-build.js')
      const bytes = new Uint8Array(readFileSync(file))
      const ours = glbRigTriangles(bytes)
      const engine = new BABYLON.NullEngine()
      const scene = new BABYLON.Scene(engine)
      const theirs = await loadRigTriangles(
        scene,
        'data:;base64,' + Buffer.from(bytes).toString('base64')
      )
      expect(ours.indices.length).toBe(theirs.indices.length)
      expect(Array.from(ours.indices)).toEqual(theirs.indices)
      expect(ours.positions.length).toBe(theirs.positions.length)
      // Babylon works in float32; the size of the model sets the tolerance.
      let size = 0
      for (const v of theirs.positions) size = Math.max(size, Math.abs(v))
      let worst = 0
      for (let i = 0; i < theirs.positions.length; i++)
        worst = Math.max(
          worst,
          Math.abs(ours.positions[i] - theirs.positions[i])
        )
      expect(worst).toBeLessThan(size * 1e-5)
      expect(ours.uvs != null).toBe(theirs.uvs != null)
      if (ours.uvs && theirs.uvs) {
        let uvWorst = 0
        for (let i = 0; i < theirs.uvs.length; i++)
          uvWorst = Math.max(uvWorst, Math.abs(ours.uvs[i] - theirs.uvs[i]))
        expect(uvWorst).toBeLessThan(1e-5)
      }
      const runs = (s?: { start: number; count: number; name: string }[]) =>
        s?.map(({ start, count, name }) => ({ start, count, name }))
      expect(runs(ours.surfaces)).toEqual(runs(theirs.surfaces))
      expect(ours.eyes?.length ?? 0).toBe(theirs.eyes?.length ?? 0)
      engine.dispose()
    }, 60000)
  }

  test('deterministic: the same bytes and markers bind the same weights', () => {
    const file = FILES.find((f) => f.includes('african')) ?? FILES[0]
    const bytes = new Uint8Array(readFileSync(file))
    const a = bodyFromMarkers(glbRigTriangles(bytes))
    const b = bodyFromMarkers(glbRigTriangles(bytes), {
      markers: a.made.by === 'markers' ? a.made.markers : undefined,
    })
    expect(Array.from(b.weights.indices)).toEqual(Array.from(a.weights.indices))
    expect(Array.from(b.weights.weights)).toEqual(Array.from(a.weights.weights))
    expect(b.rig.joints).toEqual(a.rig.joints.map((j) => ({ ...j })))
  }, 120000)
})

describe('ownExportNames', () => {
  test("riggedBodyGlb's names, and nobody else's", async () => {
    const { ownExportNames } = await import('./glb-rig.js')
    expect(ownExportNames(['body', 'eyes', 'held', 'top: Shirt'])).toBe(true)
    expect(ownExportNames(['body'])).toBe(true)
    // Someone's own file with a body and its hair: taken whole.
    expect(ownExportNames(['body', 'hair'])).toBe(false)
    expect(ownExportNames(['Omnidude', 'HumanBase'])).toBe(false)
  })
})
