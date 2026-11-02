import { describe, expect, test } from 'bun:test'
import { validateBytes } from 'gltf-validator'
import { readGlb } from './glb-chunks.js'
import {
  normaliseInfluences,
  type SkinnedGlb,
  unitNormals,
  writeSkinnedGlb,
} from './skinned-glb.js'

const PNG_1X1 = Uint8Array.from(
  atob(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=='
  ),
  (c) => c.charCodeAt(0)
)

/** Two joints, a quad skinned across them, one morph, a textured material. */
function scene(over: Partial<SkinnedGlb> = {}): SkinnedGlb {
  const positions = Float32Array.from([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0])
  return {
    asset: {
      generator: 'test',
      copyright: 'nobody: CC0-1.0',
      extras: { a: 1 },
    },
    joints: [
      {
        name: 'root',
        parent: -1,
        translation: [0, 0, 0],
        rotation: [0, 0, 0, 1],
      },
      {
        name: 'top',
        parent: 0,
        translation: [0, 1, 0],
        rotation: [0, 0, 0, 1],
      },
    ],
    skinName: 'skeleton',
    skeletonRoot: 0,
    // Inverse binds: identity, and a move down by 1.
    inverseBindMatrices: Float32Array.from([
      1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0,
      0, 1, 0, 0, -1, 0, 1,
    ]),
    meshes: [
      {
        name: 'quad',
        targetNames: ['JawDrop'],
        primitives: [
          {
            positions,
            normals: Float32Array.from([0, 0, 2, 0, 0, 1, 0, 0, 0, 0, 0, 1]),
            uvs: Float32Array.from([0, 1, 1, 1, 1, 0, 0, 0]),
            // A duplicate joint, unnormalised weights, an empty vertex.
            joints: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0],
            weights: [0.5, 0.5, 1, 0, 1, 1, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0],
            indices: [0, 1, 2, 0, 2, 3],
            material: 0,
            targets: [
              {
                positions: Float32Array.from([
                  0, 0, 0, 0, 0, 0, 0, -0.1, 0, 0, 0, 0,
                ]),
              },
            ],
          },
        ],
      },
    ],
    materials: [
      {
        name: 'quad',
        baseColorFactor: [1, 1, 1, 1],
        baseColorTexture: { image: 0 },
        metallicFactor: 0,
        roughnessFactor: 0.5,
        alphaMode: 'MASK',
        alphaCutoff: 0.4,
        doubleSided: true,
        sheen: { colorFactor: [1, 1, 1], roughnessFactor: 0.5 },
      },
    ],
    images: [{ name: 'pixel', mimeType: 'image/png', bytes: PNG_1X1 }],
    ...over,
  }
}

describe('writeSkinnedGlb', () => {
  test('the Khronos validator reports nothing at all', async () => {
    const report = await validateBytes(writeSkinnedGlb(scene()), {
      maxIssues: 100,
    })
    expect(
      report.issues.messages.map((m) => `${m.code}: ${m.message}`)
    ).toEqual([])
  })

  test('vertex colours go out as COLOR_0, clean, and Babylon reads them', async () => {
    const g = scene()
    const colors = Float32Array.from([
      1, 1, 1, 0.8, 0.5, 0.5, 1, 1, 1, 0.7, 0.6, 0.6,
    ])
    g.meshes[0]!.primitives[0]!.colors = colors
    const bytes = writeSkinnedGlb(g)
    const report = await validateBytes(bytes, { maxIssues: 100 })
    expect(
      report.issues.messages.map((m) => `${m.code}: ${m.message}`)
    ).toEqual([])
    const { json } = readGlb(bytes)
    const color =
      json.accessors[json.meshes[0].primitives[0].attributes.COLOR_0]
    expect([color.type, color.count]).toEqual(['VEC3', 4])
    const BABYLON = await import('@babylonjs/core')
    await import('@babylonjs/loaders')
    const engine = new BABYLON.NullEngine()
    const babylon = new BABYLON.Scene(engine)
    const container = await BABYLON.LoadAssetContainerAsync(
      'data:;base64,' + Buffer.from(bytes).toString('base64'),
      babylon,
      { pluginExtension: '.glb' }
    )
    const mesh = container.meshes.find((m) => m.skeleton != null)!
    const read = mesh.getVerticesData(BABYLON.VertexBuffer.ColorKind)!
    // RGB, three per vertex, as written.
    expect(read.length).toBe(12)
    expect(read[3]).toBeCloseTo(0.8, 5)
    expect(read[5]).toBeCloseTo(0.5, 5)
    engine.dispose()
    expect(() => {
      g.meshes[0]!.primitives[0]!.colors = new Float32Array(5)
      writeSkinnedGlb(g)
    }).toThrow('colors are not RGB or RGBA')
  })

  test('joints are nodes first, meshes after, with no transform; one skin', () => {
    const { json } = readGlb(writeSkinnedGlb(scene()))
    expect(json.nodes.map((n: { name: string }) => n.name)).toEqual([
      'root',
      'top',
      'quad',
    ])
    expect(json.nodes[0].children).toEqual([1])
    expect(json.nodes[2]).toEqual({ name: 'quad', mesh: 0, skin: 0 })
    expect(json.scenes[0].nodes).toEqual([0, 2])
    expect(json.skins).toEqual([
      { name: 'skeleton', inverseBindMatrices: 0, skeleton: 0, joints: [0, 1] },
    ])
    expect(json.meshes[0].extras.targetNames).toEqual(['JawDrop'])
    expect(json.meshes[0].weights).toEqual([0])
    expect(json.extensionsUsed).toEqual(['KHR_materials_sheen'])
    expect(json.extensionsRequired).toBeUndefined()
    expect(json.asset.extras).toEqual({ a: 1 })
    // The morph is sparse: one vertex moved.
    const target =
      json.accessors[json.meshes[0].primitives[0].targets[0].POSITION]
    expect(target.sparse.count).toBe(1)
    expect(target.min).toEqual([0, -0.10000000149011612, 0])
    expect(target.max).toEqual([0, 0, 0])
  })

  test('Babylon loads it as a skinned mesh with its morph', async () => {
    // Babylon's own glTF loader, headless: what this library draws with.
    const BABYLON = await import('@babylonjs/core')
    await import('@babylonjs/loaders')
    const engine = new BABYLON.NullEngine()
    const babylon = new BABYLON.Scene(engine)
    const b64 = Buffer.from(writeSkinnedGlb(scene())).toString('base64')
    const container = await BABYLON.LoadAssetContainerAsync(
      'data:;base64,' + b64,
      babylon,
      { pluginExtension: '.glb' }
    )
    const mesh = container.meshes.find((m) => m.skeleton != null)
    expect(mesh).toBeDefined()
    const morphs = mesh!.morphTargetManager
    expect(morphs?.numTargets).toBe(1)
    expect(morphs!.getTarget(0).name).toBe('JawDrop')
    expect(mesh!.skeleton!.bones.map((b) => b.name)).toEqual(['root', 'top'])
    engine.dispose()
  })

  test('over 65,534 vertices the indices are 32-bit', async () => {
    const n = 70000
    const positions = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) positions[i * 3] = i / n
    positions[3 * (n - 1) + 1] = 1
    const g = scene()
    const mesh = g.meshes[0]!
    g.meshes = [
      {
        ...mesh,
        targetNames: [],
        primitives: [
          {
            ...mesh.primitives[0]!,
            positions,
            normals: new Float32Array(n * 3),
            uvs: new Float32Array(n * 2),
            joints: new Uint8Array(n * 4),
            weights: new Float32Array(n * 4).fill(0.25),
            indices: [0, n - 2, n - 1],
            targets: [],
          },
        ],
      },
    ]
    const bytes = writeSkinnedGlb(g)
    const { json } = readGlb(bytes)
    expect(
      json.accessors[json.meshes[0].primitives[0].indices].componentType
    ).toBe(5125)
    const report = await validateBytes(bytes, { maxIssues: 10 })
    expect(
      report.issues.messages
        .filter((m) => m.severity === 0)
        .map((m) => `${m.code}: ${m.message}`)
    ).toEqual([])
  })

  test('refuses what glTF cannot say', () => {
    const still = scene()
    still.meshes[0]!.primitives[0]!.targets = [
      { positions: new Float32Array(12) },
    ]
    expect(() => writeSkinnedGlb(still)).toThrow('moves no vertex')
    const backwards = scene()
    backwards.joints = [
      backwards.joints[1]!,
      { ...backwards.joints[0]!, parent: -1 },
    ]
    backwards.joints[0] = { ...backwards.joints[0]!, parent: 1 }
    expect(() => writeSkinnedGlb(backwards)).toThrow('comes after it')
    const names = scene()
    names.meshes[0]!.targetNames = []
    expect(() => writeSkinnedGlb(names)).toThrow('1 targets, 0 names')
    const far = scene()
    far.meshes[0]!.primitives[0]!.indices = [0, 1, 4]
    expect(() => writeSkinnedGlb(far)).toThrow('index 4 past 4 vertices')
    const bare = scene()
    bare.meshes[0]!.primitives[0]!.uvs = null
    expect(() => writeSkinnedGlb(bare)).toThrow('textured but has no uvs')
  })
})

describe('influences and normals', () => {
  test('duplicates merge, weights sum to 1 in float32, empty goes to the fallback', () => {
    const r = normaliseInfluences(
      [3, 3, 1, 0, 0, 0, 0, 0],
      [0.25, 0.25, 0.3, 0, 0, 0, 0, 0],
      2
    )
    expect([...r.joints.slice(0, 4)]).toEqual([3, 1, 0, 0])
    expect(r.weights[0]! + r.weights[1]!).toBeCloseTo(1, 7)
    expect(r.weights[2]).toBe(0)
    expect([...r.joints.slice(4)]).toEqual([2, 0, 0, 0])
    expect([...r.weights.slice(4)]).toEqual([1, 0, 0, 0])
    expect(r.joints).toBeInstanceOf(Uint8Array)
    expect(
      normaliseInfluences([300, 0, 0, 0], [1, 0, 0, 0]).joints
    ).toBeInstanceOf(Uint16Array)
  })

  test('normals are unit, a zero one is +Y', () => {
    expect([...unitNormals([0, 0, 3, 0, 0, 0])]).toEqual([0, 0, 1, 0, 1, 0])
  })
})
