/*#
# auto-rig

**Binding a mesh to a skeleton, with no rig to start from.** Eight markers on
a mesh's front view (chin, groin, wrists, elbows, knees) place UAL's 65-bone
skeleton (`fitSkeleton`), bone heat binds the skin to it (`boneHeat`), and
`buildRig` makes a Babylon skeleton of the result, so `retargetClip` plays
UAL's clips on it and `springNodes` swings a tail.

To do this by hand, use the [rig tool](/rig-tool/): load a GLB or OBJ with
no skeleton (or turn on `bind from markers` to ignore the one it has), drag
the markers onto its joints, and it is bound again each time you let go. The
markers are saved in its recipe. This page is the code underneath, for doing
the same in your own page or pipeline.

## Usage

```
import {
  objTriangles, guessMarkers, rigSilhouette, fitSkeleton, meshQuery,
  skinSegments, boneHeat, buildRig, readSkeleton, retargetClip,
} from 'tosijs-3d'

// The mesh as triangles, in its file's own (right-handed) frame,
// facing +Z with its left on +X.
const { positions, indices } = objTriangles(await (await fetch(url)).text())

// Markers: guessed from the outline, or from a rig tool recipe's `binding`.
const markers = recipe?.binding?.markers ??
  guessMarkers(rigSilhouette(positions, indices, 'front'))

const rig = fitSkeleton(markers, meshQuery(positions, indices), {
  tail: recipe?.binding?.tail ?? undefined,
})
const weights = boneHeat(positions, indices, skinSegments(rig))
const built = buildRig(scene, 'weasel', positions, indices, rig, weights)
built.root.parent = stand // move it by a parent of root, never root itself

// ualWalk, ualSkin and ualRoot: a clip, skeleton and __root__ from UAL's GLB.
const walk = retargetClip(ualWalk, readSkeleton(ualSkin, ualRoot),
  readSkeleton(built.skeleton, built.root), { scene })
walk.start(true)
```

For a model file, `loadRigTriangles(scene, urlOrFile, { pick })` reads its
triangles (its own skeleton ignored), and `autoRig(scene, name, tris)` does
the rest in one call (markers guessed unless you pass them), returning the
built rig with its `rig` and `markers`:

```
const body = autoRig(scene, 'body', await loadRigTriangles(scene, url))
body.root.parent = stand
```

A tail, when `fitSkeleton` is given its tip, is the bone chain `tail_01` …
`tail_leaf`: hand `built.node(name)` for each to `springNodes` and it swings.
Binding takes about 0.1 to 0.3 s for 1,000 to 6,000 vertices, so do it once
and keep the result.

## How it is built

AUTO-RIG, THE BABYLON SIDE: a fitted skeleton (`rig-fit`) and its skin
weights (`bone-heat`) become a real Babylon skeleton on a mesh, built the way
the glTF loader builds one, so everything that works on a loaded character
works on it: `readSkeleton` and `retargetClip` play UAL clips on it, and
`springNodes` simulates its tail.

The joints are TransformNodes under one container (`root`), each bone LINKED
to its node, with the mesh under the same container: Babylon then reads each
bone from its node, and the skin and the nodes share a frame.

THE DATA IS RIGHT-HANDED, as OBJ and glTF files are (and as `rig-fit`
assumes: a character facing +Z has its left on +X). Babylon is left-handed,
so the container carries the same mirror glTF's `__root__` does (a half turn
about Y and z scaled by -1). Pass `root` to `readSkeleton` as you would
`__root__`: both measure in the file's own frame. Move the character by a
parent of `root`, not `root` itself.

*/
/*{ "parent": "b3d-biped", "order": 71 }*/

import * as BABYLON from '@babylonjs/core'
import type { FittedRig, Markers } from './rig-fit.js'
import type { SkinWeights } from './bone-heat.js'
import { bodyFromMarkers, surfaceOf, type BodySurface, type RiggedBody } from './rigged-body.js'
import { materialConventions } from './b3d-utils.js'

export interface BuiltRig {
  /** The container: move, turn and scale the character by this. */
  root: BABYLON.TransformNode
  mesh: BABYLON.Mesh
  skeleton: BABYLON.Skeleton
  /** A joint's node by name. */
  node(name: string): BABYLON.TransformNode | undefined
  dispose(): void
}

/**
 * Skin a mesh (positions xyz and indices in threes, in the fitted rig's
 * space) to a fitted rig. `weights` are bone heat's, indexed by `rig.joints`.
 */
export function buildRig(
  scene: BABYLON.Scene,
  name: string,
  positions: ArrayLike<number>,
  indices: ArrayLike<number>,
  rig: FittedRig,
  weights: SkinWeights,
  options: {
    normals?: ArrayLike<number>
    uvs?: ArrayLike<number>
    colors?: ArrayLike<number>
    /** Runs of triangles, one sub-mesh each (material index = its place). */
    surfaces?: BodySurface[]
  } = {}
): BuiltRig {
  const root = new BABYLON.TransformNode(name, scene)
  root.rotationQuaternion = new BABYLON.Quaternion(0, 1, 0, 0)
  root.scaling = new BABYLON.Vector3(1, 1, -1)
  const nodes = new Map<string, BABYLON.TransformNode>()
  const skeleton = new BABYLON.Skeleton(
    `${name}-skeleton`,
    `${name}-skeleton`,
    scene
  )
  const bones = new Map<string, BABYLON.Bone>()
  for (const j of rig.joints) {
    const parentAt = j.parent != null ? rig.at(j.parent) : undefined
    const n = new BABYLON.TransformNode(j.name, scene)
    n.parent = j.parent != null ? nodes.get(j.parent)! : root
    n.position = new BABYLON.Vector3(
      j.position.x - (parentAt?.x ?? 0),
      j.position.y - (parentAt?.y ?? 0),
      j.position.z - (parentAt?.z ?? 0)
    )
    n.rotationQuaternion = BABYLON.Quaternion.Identity()
    nodes.set(j.name, n)
    const local = BABYLON.Matrix.Translation(
      n.position.x,
      n.position.y,
      n.position.z
    )
    const b = new BABYLON.Bone(
      j.name,
      skeleton,
      j.parent != null ? bones.get(j.parent)! : null,
      local,
      local.clone()
    )
    b.linkTransformNode(n)
    bones.set(j.name, b)
  }

  const mesh = new BABYLON.Mesh(`${name}-skin`, scene)
  const data = new BABYLON.VertexData()
  data.positions = Array.from(positions)
  data.indices = Array.from(indices)
  if (options.normals != null) data.normals = Array.from(options.normals)
  else {
    // Counter-clockwise, outward: the file's handedness, not Babylon's.
    const normals: number[] = []
    BABYLON.VertexData.ComputeNormals(data.positions, data.indices, normals, {
      useRightHandedSystem: true,
    })
    data.normals = normals
  }
  if (options.uvs != null) data.uvs = Array.from(options.uvs)
  if (options.colors != null) data.colors = Array.from(options.colors)
  data.applyToMesh(mesh)
  if (options.surfaces != null && options.surfaces.length > 1) {
    const vertices = mesh.getTotalVertices()
    mesh.subMeshes = []
    options.surfaces.forEach(
      (s, i) => new BABYLON.SubMesh(i, 0, vertices, s.start, s.count, mesh)
    )
  }
  // As the glTF loader does for its mirrored root: the mirror turns the
  // file's counter-clockwise faces clockwise, which is Babylon's front.
  mesh.sideOrientation = BABYLON.Material.ClockWiseSideOrientation
  mesh.setVerticesData(
    BABYLON.VertexBuffer.MatricesIndicesKind,
    weights.indices
  )
  mesh.setVerticesData(
    BABYLON.VertexBuffer.MatricesWeightsKind,
    weights.weights
  )
  mesh.parent = root
  mesh.skeleton = skeleton

  return {
    root,
    mesh,
    skeleton,
    node: (n) => nodes.get(n),
    dispose() {
      mesh.dispose()
      skeleton.dispose()
      root.dispose()
    },
  }
}

/** A mesh as triangles, in its file's own (right-handed) frame. */
export interface RigTriangles {
  positions: number[]
  indices: number[]
  /** Texture coordinates, when any of the meshes has them. */
  uvs?: number[]
  /** Vertex colours (RGBA), when any of the meshes has them. */
  colors?: number[]
  /** The triangles in runs, one per material, with the file's materials. */
  surfaces?: BodySurface[]
}

/**
 * Meshes' triangles in the frame of the file's root (a glTF's `__root__`
 * carries the handedness mirror, which the binding must not see).
 */
export function gatherTriangles(
  root: BABYLON.TransformNode,
  meshes: BABYLON.AbstractMesh[]
): RigTriangles {
  root.computeWorldMatrix(true)
  const toRoot = root.getWorldMatrix().clone().invert()
  const positions: number[] = []
  const indices: number[] = []
  const v = new BABYLON.Vector3()
  const uvs: number[] = []
  const colors: number[] = []
  let hasUvs = false
  let hasColors = false
  const surfaces: BodySurface[] = []
  const names = new Map<BABYLON.Material | null, string>()
  const used = new Set<string>()
  const nameOf = (m: BABYLON.Material | null) => {
    let name = names.get(m)
    if (name == null) {
      const base = m?.name || 'surface'
      name = base
      for (let k = 2; used.has(name); k++) name = `${base} ${k}`
      used.add(name)
      names.set(m, name)
    }
    return name
  }
  for (const mesh of meshes) {
    /*
    A SKINNED MESH IS WHERE ITS SKELETON PUTS IT: its own vertices can be in
    other units (omnidude's are centimetres, sized by the armature), so take
    them skinned, at rest.
    */
    const skin = mesh.skeleton
    if (skin != null) {
      skin.returnToRest()
      for (const b of skin.bones) b.getTransformNode()?.computeWorldMatrix(true)
      skin.prepare(true)
    }
    const p =
      skin != null
        ? mesh.getPositionData(true, true)
        : mesh.getVerticesData('position')
    const ix = mesh.getIndices()
    if (p == null || ix == null) continue
    const m = mesh.computeWorldMatrix(true).multiply(toRoot)
    const base = positions.length / 3
    const count = p.length / 3
    const uv = mesh.getVerticesData('uv')
    const col = mesh.getVerticesData('color')
    if (uv != null && !hasUvs) {
      hasUvs = true
      uvs.push(...new Array(base * 2).fill(0))
    }
    if (hasUvs) for (let i = 0; i < count * 2; i++) uvs.push(uv?.[i] ?? 0)
    if (col != null && !hasColors) {
      hasColors = true
      colors.push(...new Array(base * 4).fill(1))
    }
    if (hasColors) {
      const k = col != null ? col.length / count : 0
      for (let i = 0; i < count; i++)
        for (let c = 0; c < 4; c++) colors.push(c < k ? col![i * k + c] : 1)
    }
    // Its triangles by material: one run per sub-mesh.
    const at = indices.length
    const parts = mesh.subMeshes?.length ? mesh.subMeshes : null
    const own = mesh.material
    if (parts == null) surfaces.push({ start: at, count: ix.length, name: '', material: own ?? undefined })
    else
      for (const sm of parts) {
        const mat = own instanceof BABYLON.MultiMaterial ? own.subMaterials[sm.materialIndex] ?? null : own
        surfaces.push({ start: at + sm.indexStart, count: sm.indexCount, name: '', material: mat ?? undefined })
      }
    for (let i = 0; i < p.length; i += 3) {
      BABYLON.Vector3.TransformCoordinatesFromFloatsToRef(
        p[i],
        p[i + 1],
        p[i + 2],
        m,
        v
      )
      positions.push(v.x, v.y, v.z)
    }
    for (const i of ix) indices.push(base + i)
  }
  for (const s of surfaces) s.name = nameOf(s.material ?? null)
  return {
    positions,
    indices,
    ...(hasUvs ? { uvs } : {}),
    ...(hasColors ? { colors } : {}),
    ...(surfaces.length ? { surfaces: mergeRuns(surfaces) } : {}),
  }
}

/** Runs that follow one another with the same material, as one. */
function mergeRuns(surfaces: BodySurface[]): BodySurface[] {
  const out: BodySurface[] = []
  for (const s of surfaces) {
    const last = out[out.length - 1]
    if (last && last.name === s.name && last.start + last.count === s.start) last.count += s.count
    else out.push({ ...s })
  }
  return out
}

/*
A FILE'S OWN MATERIALS outlive the file: the loaded container is disposed,
so the materials its surfaces use (and their textures) are taken out of it
and into the scene first, with the loader's translucency rules applied
(near-opaque snapped to opaque; translucent sorted with a depth pre-pass).
*/
function keepMaterials(
  container: BABYLON.AssetContainer,
  scene: BABYLON.Scene,
  surfaces: BodySurface[] | undefined
): void {
  const kept = new Set(surfaces?.map((s) => s.material).filter((m) => m != null))
  for (const mat of kept) {
    const i = container.materials.indexOf(mat!)
    if (i >= 0) container.materials.splice(i, 1)
    scene.addMaterial(mat!)
    for (const t of mat!.getActiveTextures()) {
      const j = container.textures.indexOf(t)
      if (j >= 0) container.textures.splice(j, 1)
      if (!scene.textures.includes(t)) scene.addTexture(t)
    }
    materialConventions(mat!)
  }
}

/**
 * A material for a built body, chosen per surface: `pick` is given each of
 * the body's surfaces (or null when it has none) and returns its material.
 * Several surfaces make a MultiMaterial (dispose it without its children).
 */
export function surfaceMaterial(
  scene: BABYLON.Scene,
  name: string,
  body: RiggedBody,
  pick: (surface: BodySurface | null) => BABYLON.Material
): BABYLON.Material {
  const surfaces = body.surfaces ?? []
  if (surfaces.length === 0) return pick(null)
  if (surfaces.length === 1) return pick(surfaces[0])
  const multi = new BABYLON.MultiMaterial(`${name}-surfaces`, scene)
  multi.subMaterials = surfaces.map(pick)
  return multi
}

/**
 * A model file's triangles, its skeleton (if any) ignored: a URL or a File
 * (GLB or glTF), and optionally the one node in it to take (`pick`, with its
 * children; a library holds many characters).
 */
export async function loadRigTriangles(
  scene: BABYLON.Scene,
  source: string | File,
  options: { pick?: string } = {}
): Promise<RigTriangles> {
  const file = source instanceof File
  const container = await BABYLON.LoadAssetContainerAsync(
    source,
    scene,
    file
      ? {
          pluginExtension: source.name.toLowerCase().endsWith('.gltf')
            ? '.gltf'
            : '.glb',
        }
      : undefined
  )
  try {
    const root = (container.meshes.find((n) => n.name === '__root__') ??
      container.transformNodes[0]) as BABYLON.TransformNode
    const top =
      options.pick != null
        ? container.transformNodes.find((n) => n.name === options.pick) ??
          container.meshes.find((n) => n.name === options.pick)
        : undefined
    if (options.pick != null && top == null)
      throw new Error(`no "${options.pick}" in the file`)
    if (top != null) top.position.set(0, 0, 0)
    const meshes = container.meshes.filter(
      (n) =>
        n.getTotalVertices() > 0 &&
        (top == null || n === top || n.isDescendantOf(top))
    )
    const tris = gatherTriangles(root, meshes)
    if (tris.indices.length === 0) throw new Error('the file has no meshes')
    keepMaterials(container, scene, tris.surfaces)
    return tris
  } finally {
    container.dispose()
  }
}

/** The bones a skin needs to be taken as UAL's skeleton (its core; fingers optional). */
const UAL_CORE = [
  'root', 'pelvis', 'spine_01', 'spine_02', 'spine_03', 'neck_01', 'Head',
  ...['l', 'r'].flatMap((s) =>
    ['clavicle', 'upperarm', 'lowerarm', 'hand', 'thigh', 'calf', 'foot', 'ball'].map((b) => `${b}_${s}`)
  ),
]

/*
A FILE ALREADY SKINNED TO UAL'S SKELETON: Quaternius' characters come that
way (UAL is Quaternius' own library), and anyone can bind a mesh to it in a
modeller. Its joints and weights are the artist's, so it is taken as it is:
no markers, no bone heat. Its thumbs, toes and shoulders bend as made.
*/
/**
 * A file's character as a rigged body from its OWN skin, or null when its
 * skeleton is not UAL's (then bind it from markers). `pick` chooses one
 * character in a library file.
 */
export async function loadSkinnedBody(
  scene: BABYLON.Scene,
  source: string | File,
  options: { pick?: string } = {}
): Promise<RiggedBody | null> {
  const file = source instanceof File
  const container = await BABYLON.LoadAssetContainerAsync(
    source,
    scene,
    file
      ? { pluginExtension: source.name.toLowerCase().endsWith('.gltf') ? '.gltf' : '.glb' }
      : undefined
  )
  try {
    const root = (container.meshes.find((n) => n.name === '__root__') ??
      container.transformNodes[0]) as BABYLON.TransformNode
    const top =
      options.pick != null
        ? container.transformNodes.find((n) => n.name === options.pick) ??
          container.meshes.find((n) => n.name === options.pick)
        : undefined
    if (options.pick != null && top == null) return null
    if (top != null) top.position.set(0, 0, 0)
    const under = (n: BABYLON.Node) => top == null || n === top || n.isDescendantOf(top)
    const nameOf = (b: BABYLON.Bone) => b.getTransformNode()?.name ?? b.name
    const skeleton = container.skeletons
      .filter((sk) => sk.bones.some((b) => { const t = b.getTransformNode(); return t != null && under(t) }) || top == null)
      .sort((a, b) => b.bones.length - a.bones.length)[0]
    if (skeleton == null) return null
    const names = new Set(skeleton.bones.map(nameOf))
    if (!UAL_CORE.every((n) => names.has(n))) return null
    const meshes = container.meshes.filter(
      (m) => m.skeleton === skeleton && m.getTotalVertices() > 0 && under(m)
    )
    if (!meshes.length) return null
    // The skin at rest, in the file's frame (gatherTriangles returns it to rest).
    const tris = gatherTriangles(root, meshes)
    const toRoot = root.getWorldMatrix().clone().invert()

    // Its joints where its skeleton puts them, parents first.
    const bones = [...skeleton.bones]
    const depth = (b: BABYLON.Bone): number => (b.getParent() ? 1 + depth(b.getParent()!) : 0)
    bones.sort((a, b) => depth(a) - depth(b))
    const joints = bones.map((b) => {
      const t = b.getTransformNode()
      t?.computeWorldMatrix(true)
      const w = t != null ? t.getAbsolutePosition() : b.getAbsolutePosition()
      const p = BABYLON.Vector3.TransformCoordinates(w, toRoot)
      return { name: nameOf(b), parent: b.getParent() ? nameOf(b.getParent()!) : null, position: { x: p.x, y: p.y, z: p.z } }
    })
    const index = new Map(joints.map((j, i) => [j.name, i]))
    const byName = new Map(joints.map((j) => [j.name, j.position]))
    const rig: FittedRig = {
      joints,
      at: (name) => byName.get(name),
      fingers: {
        l: ['thumb', 'index', 'middle', 'ring', 'pinky'].filter((f) => index.has(`${f}_01_l`)),
        r: ['thumb', 'index', 'middle', 'ring', 'pinky'].filter((f) => index.has(`${f}_01_r`)),
      },
    }

    // Its weights, onto those joints: the four strongest, summing to one.
    const n = tris.positions.length / 3
    const weights: SkinWeights = { indices: new Float32Array(n * 4), weights: new Float32Array(n * 4) }
    const boneJoint = skeleton.bones.map((b) => index.get(nameOf(b)) ?? 0)
    let v0 = 0
    for (const m of meshes) {
      const count = m.getTotalVertices()
      if (m.getIndices() == null) continue
      const mi = m.getVerticesData('matricesIndices') ?? []
      const mw = m.getVerticesData('matricesWeights') ?? []
      const xi = m.getVerticesData('matricesIndicesExtra')
      const xw = m.getVerticesData('matricesWeightsExtra')
      for (let v = 0; v < count; v++) {
        const pairs: Array<[number, number]> = []
        for (let k = 0; k < 4; k++) pairs.push([mi[v * 4 + k], mw[v * 4 + k]])
        if (xi && xw) for (let k = 0; k < 4; k++) pairs.push([xi[v * 4 + k], xw[v * 4 + k]])
        pairs.sort((a, b) => b[1] - a[1])
        const top4 = pairs.slice(0, 4)
        const sum = top4.reduce((s, p) => s + p[1], 0) || 1
        for (let k = 0; k < 4; k++) {
          const [bi, w] = top4[k] ?? [0, 0]
          weights.indices[(v0 + v) * 4 + k] = boneJoint[bi] ?? 0
          weights.weights[(v0 + v) * 4 + k] = w / sum
        }
      }
      v0 += count
    }
    if (v0 !== n) return null
    keepMaterials(container, scene, tris.surfaces)
    return {
      positions: Float32Array.from(tris.positions),
      indices: Uint32Array.from(tris.indices),
      rig,
      weights,
      regions: {},
      ...surfaceOf(tris),
      made: { by: 'skin', source: file ? source.name : source },
    }
  } finally {
    container.dispose()
  }
}

export interface BuiltBody extends BuiltRig {
  /** The rigged body it was built from. */
  body: RiggedBody
  /** Its skeleton (`rig.at(name)` for a joint's rest position). */
  rig: FittedRig
}

/**
 * A rigged body (rig-tool or MakeHuman, see rigged-body) as a Babylon
 * skeleton on its mesh, normals shared across the mesh's split vertices.
 */
export function buildBody(
  scene: BABYLON.Scene,
  name: string,
  body: RiggedBody
): BuiltBody {
  const built = buildRig(scene, name, body.positions, body.indices, body.rig, body.weights, {
    normals: weldedNormals(body.positions, body.indices),
    uvs: body.uvs,
    colors: body.colors,
    surfaces: body.surfaces,
  })
  return { ...built, body, rig: body.rig }
}

/*
WHAT IT STANDS ON. A body is grounded by the lowest point of its skin while
a clip plays, but not all of the skin: a tail on a spring hangs wherever the
simulation left it when the clip is sampled, and lifted the weasel until its
drooping tail touched the floor (Tonio: "floats in the air"). So only the
soles count: the vertices skinned mostly to a foot or its toes.
*/
/** The vertices a rigged body stands on: skinned mostly to a foot or its toes. */
export function soleVertices(body: RiggedBody): Uint32Array {
  const feet = new Set<number>()
  body.rig.joints.forEach((j, i) => {
    if (/^(foot|ball)_[lr]$/.test(j.name)) feet.add(i)
  })
  const out: number[] = []
  const n = body.positions.length / 3
  for (let v = 0; v < n; v++) {
    let w = 0
    for (let k = 0; k < 4; k++)
      if (feet.has(body.weights.indices[v * 4 + k])) w += body.weights.weights[v * 4 + k]
    if (w > 0.5) out.push(v)
  }
  return Uint32Array.from(out)
}

/**
 * The lowest of `vertices` in the world as the mesh is posed now (its
 * skeleton prepared): the soles' height. Infinity with none.
 */
export function lowestOf(mesh: BABYLON.AbstractMesh, vertices: ArrayLike<number>): number {
  if (vertices.length === 0 || !(mesh instanceof BABYLON.Mesh)) return Infinity
  const p = mesh.getPositionData(true, true)
  if (p == null) return Infinity
  const m = mesh.computeWorldMatrix(true)
  const v = new BABYLON.Vector3()
  let low = Infinity
  for (let i = 0; i < vertices.length; i++) {
    const k = vertices[i] * 3
    BABYLON.Vector3.TransformCoordinatesFromFloatsToRef(p[k], p[k + 1], p[k + 2], m, v)
    if (v.y < low) low = v.y
  }
  return low
}

export interface AutoRigged extends BuiltBody {
  /** The markers it was fitted from: guessed, unless they were given. */
  markers: Markers
}

/**
 * The whole auto-rig on a mesh's triangles in one call: `bodyFromMarkers`
 * (markers guessed unless given) then `buildBody`.
 */
export function autoRig(
  scene: BABYLON.Scene,
  name: string,
  tris: RigTriangles,
  options: { markers?: Markers } = {}
): AutoRigged {
  const body = bodyFromMarkers(tris, options)
  const made = body.made as { markers: Markers }
  return { ...buildBody(scene, name, body), markers: made.markers }
}

/*
NORMALS ACROSS SEAMS. A file splits a vertex wherever its UVs or materials
do, and normals worked out per vertex then differ on the two sides of every
seam: the body is lit in bands (Tonio saw them across a Blender body's chest,
waist and arms). Vertices at the same place share one normal here, the area-
weighted mean of every face round that place. Right-handed, as the data is.
*/
export function weldedNormals(
  positions: ArrayLike<number>,
  indices: ArrayLike<number>
): Float32Array {
  const n = positions.length / 3
  const id = new Int32Array(n)
  const at = new Map<string, number>()
  for (let i = 0; i < n; i++) {
    const key = `${Math.round(positions[i * 3] * 1e5)},${Math.round(
      positions[i * 3 + 1] * 1e5
    )},${Math.round(positions[i * 3 + 2] * 1e5)}`
    let w = at.get(key)
    if (w == null) at.set(key, (w = at.size))
    id[i] = w
  }
  const sum = new Float64Array(at.size * 3)
  for (let t = 0; t < indices.length; t += 3) {
    const a = indices[t] * 3
    const b = indices[t + 1] * 3
    const c = indices[t + 2] * 3
    const ux = positions[b] - positions[a]
    const uy = positions[b + 1] - positions[a + 1]
    const uz = positions[b + 2] - positions[a + 2]
    const vx = positions[c] - positions[a]
    const vy = positions[c + 1] - positions[a + 1]
    const vz = positions[c + 2] - positions[a + 2]
    // Twice the face's area, outward for counter-clockwise faces.
    const nx = uy * vz - uz * vy
    const ny = uz * vx - ux * vz
    const nz = ux * vy - uy * vx
    for (const v of [indices[t], indices[t + 1], indices[t + 2]]) {
      const w = id[v] * 3
      sum[w] += nx
      sum[w + 1] += ny
      sum[w + 2] += nz
    }
  }
  const out = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    const w = id[i] * 3
    const len = Math.hypot(sum[w], sum[w + 1], sum[w + 2]) || 1
    out[i * 3] = sum[w] / len
    out[i * 3 + 1] = sum[w + 1] / len
    out[i * 3 + 2] = sum[w + 2] / len
  }
  return out
}
