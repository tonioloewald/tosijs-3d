/*#
# human-face

Eyes and eyelashes for a [character builder](/character-builder/) body, and
a gaze that looks at something.

A pack's eyes are not a separate model fitted into the sockets: MakeHuman's
base mesh carries the eyeballs and eyelash cards as helper vertices, which
every shape target moves with the face, and the pack's `eyes` and
`eyelashes` PARTS are faces (and the eyes' UVs) over those vertices. So any
body has eyes that fit it, with nothing to fit.

`humanFace(scene, built, rig, pack, positions, parts)` hangs them on the
skeleton's head: each eye on its own pivot at the eyeball's centre (MakeHuman's
`eye` joint), so turning the pivot turns the eye. `eyeTexture` draws the eye
in code (sclera, a striated iris of any colour from `irisColor`, the pupil)
on MakeHuman's eye UV layout, so the iris is a dial and no image is shipped.

`eyeGaze(scene, face, target)` points both eyes at a world point every frame,
after the clip has posed the head: they converge on it, stop at `maxDeg`
from straight ahead, and make small saccades, the jumps eyes really make
(they never glide), so a held gaze looks alive.
*/
/*{ "parent": "character-builder", "order": 50 }*/

import * as BABYLON from '@babylonjs/core'
import type { HumanPackManifest, HumanPart } from './human-pack.js'
import type { BuiltRig } from './rig-build.js'
import type { FittedRig } from './rig-fit.js'
import { humanJoint } from './human-morph.js'
import { irisColor } from './skin-tone.js'
import { parseColor } from './color.js'
import { sceneDelta } from './b3d-utils.js'

/** Where MakeHuman's eye UVs put each iris (u, v from the bottom) and its radius. */
export const HM08_EYE_UV = Object.freeze({
  l: { u: 0.705, v: 0.701 },
  r: { u: 0.289, v: 0.289 },
  iris: 0.114,
})

export interface EyeTexture extends BABYLON.DynamicTexture {
  /** Repaint the iris: 0 dark brown to 1 grey (see `irisColor`). */
  setIris(t: number): void
  /** Repaint the iris any colour (sRGB, anything `parseColor` reads). */
  setIrisColour(colour: string): void
}

/** The eye drawn in code on MakeHuman's eye UV layout. */
export function eyeTexture(
  scene: BABYLON.Scene,
  options: { iris?: number; size?: number; layout?: typeof HM08_EYE_UV } = {}
): EyeTexture {
  const size = options.size ?? 512
  const layout = options.layout ?? HM08_EYE_UV
  const tex = new BABYLON.DynamicTexture(
    'eye',
    { width: size, height: size },
    scene,
    true
  ) as EyeTexture
  const ctx = tex.getContext() as CanvasRenderingContext2D
  // A fixed pattern of fibres, so a new colour keeps the same eye.
  const fibres = Array.from({ length: 140 }, (_, i) => {
    const h = Math.sin(i * 12.9898) * 43758.5453
    return { a: (i / 140) * Math.PI * 2, k: h - Math.floor(h) }
  })
  const paint = (c: { r: number; g: number; b: number }) => {
    const rgb = (k: number, a = 1) =>
      `rgba(${Math.round(Math.min(1, c.r * k) * 255)},${Math.round(
        Math.min(1, c.g * k) * 255
      )},${Math.round(Math.min(1, c.b * k) * 255)},${a})`
    ctx.fillStyle = '#d8cbc2'
    ctx.fillRect(0, 0, size, size)
    const R = layout.iris * size
    for (const e of [layout.l, layout.r]) {
      const x = e.u * size
      const y = (1 - e.v) * size
      // The sclera: white toward the iris, pinker and darker toward the back.
      const s = ctx.createRadialGradient(x, y, R, x, y, R * 3.2)
      s.addColorStop(0, '#f1ece6')
      s.addColorStop(0.6, '#e9ddd5')
      s.addColorStop(1, '#d8cbc2')
      ctx.fillStyle = s
      ctx.beginPath()
      ctx.arc(x, y, R * 3.2, 0, Math.PI * 2)
      ctx.fill()
      // The iris: lighter round the pupil, darker toward its rim.
      const g = ctx.createRadialGradient(x, y, R * 0.3, x, y, R)
      g.addColorStop(0, rgb(1.35))
      g.addColorStop(0.55, rgb(1))
      g.addColorStop(0.88, rgb(0.7))
      g.addColorStop(1, rgb(0.25))
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(x, y, R, 0, Math.PI * 2)
      ctx.fill()
      // Fibres, light and dark, from the pupil outward.
      ctx.lineWidth = Math.max(1, size / 512)
      for (const f of fibres) {
        ctx.strokeStyle = f.k > 0.5 ? rgb(1.6, 0.35) : rgb(0.45, 0.4)
        const r0 = R * (0.4 + 0.1 * f.k)
        const r1 = R * (0.75 + 0.2 * f.k)
        ctx.beginPath()
        ctx.moveTo(x + Math.cos(f.a) * r0, y + Math.sin(f.a) * r0)
        ctx.lineTo(x + Math.cos(f.a) * r1, y + Math.sin(f.a) * r1)
        ctx.stroke()
      }
      // The pupil.
      ctx.fillStyle = '#080605'
      ctx.beginPath()
      ctx.arc(x, y, R * 0.36, 0, Math.PI * 2)
      ctx.fill()
    }
    tex.update()
  }
  tex.setIris = (t) => paint(irisColor(t))
  tex.setIrisColour = (colour) => {
    const c = parseColor(colour)
    if (c) paint(c)
  }
  tex.setIris(options.iris ?? 0.2)
  return tex
}

/** A glossy eye material on an `eyeTexture`. */
export function eyeMaterial(
  scene: BABYLON.Scene,
  texture: BABYLON.BaseTexture
): BABYLON.PBRMaterial {
  const m = new BABYLON.PBRMaterial('eye', scene)
  m.albedoTexture = texture
  m.metallic = 0
  // The cornea is wet: a sharp highlight over the iris.
  m.roughness = 0.12
  return m
}

/** A material for eyelashes: dark, two-sided, faded by vertex alpha. */
export function lashMaterial(scene: BABYLON.Scene): BABYLON.PBRMaterial {
  const m = new BABYLON.PBRMaterial('lashes', scene)
  m.transparencyMode = BABYLON.PBRMaterial.PBRMATERIAL_ALPHABLEND
  m.albedoColor = new BABYLON.Color3(0.02, 0.015, 0.012)
  m.metallic = 0
  m.roughness = 0.6
  m.backFaceCulling = false
  return m
}

export interface HumanFace {
  /** The eyes' pivots (left, right): turn one to turn that eye. */
  eyes: BABYLON.TransformNode[]
  /** Each eye's rest gaze, in its pivot's frame. */
  forward: BABYLON.Vector3[]
  meshes: BABYLON.Mesh[]
  dispose(): void
}

/** A part's faces over `positions` less `origin`, as a mesh under `parent`. */
function partMesh(
  scene: BABYLON.Scene,
  name: string,
  part: HumanPart,
  positions: ArrayLike<number>,
  origin: { x: number; y: number; z: number },
  keep: (v: number) => boolean,
  parent: BABYLON.Node
): BABYLON.Mesh {
  const remap = new Int32Array(part.vertices.length).fill(-1)
  const source: number[] = []
  const pos: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  const t = part.triangles
  for (let i = 0; i < t.length; i += 3) {
    if (!keep(part.vertices[t[i]])) continue
    for (let k = 0; k < 3; k++) {
      const c = t[i + k]
      if (remap[c] < 0) {
        remap[c] = pos.length / 3
        source.push(part.vertices[c])
        const v = part.vertices[c] * 3
        pos.push(
          positions[v] - origin.x,
          positions[v + 1] - origin.y,
          positions[v + 2] - origin.z
        )
        if (part.uvs) uvs.push(part.uvs[c * 2], part.uvs[c * 2 + 1])
      }
      indices.push(remap[c])
    }
  }
  const mesh = new BABYLON.Mesh(name, scene)
  // Which pack vertex each of its vertices is (expressions move them).
  mesh.metadata = { packVertices: Uint32Array.from(source) }
  const data = new BABYLON.VertexData()
  data.positions = pos
  data.indices = indices
  if (part.uvs) data.uvs = uvs
  const normals: number[] = []
  // Counter-clockwise, outward: the file's handedness, under the rig's mirror.
  BABYLON.VertexData.ComputeNormals(pos, indices, normals, {
    useRightHandedSystem: true,
  })
  data.normals = normals
  data.applyToMesh(mesh)
  mesh.sideOrientation = BABYLON.Material.ClockWiseSideOrientation
  mesh.parent = parent
  return mesh
}

/*
MakeHuman's lash cards are drawn with an alpha texture of separate hairs; as
solid cards they read as heavy eyeliner. So they fade by vertex alpha: from
the lid (the vertices nearest the eyeball) to clear at the tips, and the lower
lashes, which are sparse on a real eye, much fainter than the upper.
*/
/*
The cards also stand far off the lid (the texture's hairs are short against
them), and drawn plain the upper ones read as a second pair of brows. So each
vertex is drawn toward the lid: its distance from its eyeball past the
nearest root is scaled by `k`.
*/
function shortenLashes(
  local: Float32Array,
  eyes: BABYLON.TransformNode[],
  k: number
): void {
  const centres = eyes.map((e) => e.position)
  if (centres.length === 0) return
  const n = local.length / 3
  const near = new Int32Array(n)
  const dist = new Float32Array(n)
  let lo = Infinity
  for (let i = 0; i < n; i++) {
    let best = Infinity
    centres.forEach((c, j) => {
      const d = Math.hypot(
        local[i * 3] - c.x,
        local[i * 3 + 1] - c.y,
        local[i * 3 + 2] - c.z
      )
      if (d < best) {
        best = d
        near[i] = j
      }
    })
    dist[i] = best
    lo = Math.min(lo, best)
  }
  for (let i = 0; i < n; i++) {
    const c = centres[near[i]]
    const f = (lo + (dist[i] - lo) * k) / dist[i]
    local[i * 3] = c.x + (local[i * 3] - c.x) * f
    local[i * 3 + 1] = c.y + (local[i * 3 + 1] - c.y) * f
    local[i * 3 + 2] = c.z + (local[i * 3 + 2] - c.z) * f
  }
}

function lashAlpha(
  local: ArrayLike<number>,
  eyes: BABYLON.TransformNode[]
): Float32Array {
  const n = local.length / 3
  const centres = eyes.map((e) => e.position)
  const near = new Float32Array(n)
  const above = new Uint8Array(n)
  let lo = Infinity
  let hi = 0
  for (let i = 0; i < n; i++) {
    const p = new BABYLON.Vector3(
      local[i * 3],
      local[i * 3 + 1],
      local[i * 3 + 2]
    )
    let best = Infinity
    let c = centres[0]
    for (const e of centres) {
      const d = BABYLON.Vector3.Distance(p, e)
      if (d < best) {
        best = d
        c = e
      }
    }
    near[i] = best
    above[i] = c != null && p.y > c.y ? 1 : 0
    lo = Math.min(lo, best)
    hi = Math.max(hi, best)
  }
  const out = new Float32Array(n * 4)
  for (let i = 0; i < n; i++) {
    const t = hi > lo ? (near[i] - lo) / (hi - lo) : 0
    out[i * 4] = out[i * 4 + 1] = out[i * 4 + 2] = 1
    out[i * 4 + 3] = (above[i] ? 1 : 0.45) * (1 - 0.6 * t)
  }
  return out
}

/**
 * Eyes and eyelashes on a built body. `positions` are the morphed pack
 * positions (every vertex) the body was built from, `rig` its fitted rig.
 */
export function humanFace(
  scene: BABYLON.Scene,
  built: BuiltRig,
  rig: FittedRig,
  manifest: HumanPackManifest,
  positions: ArrayLike<number>,
  parts: { eyes?: HumanPart | null; eyelashes?: HumanPart | null },
  materials: { eye?: BABYLON.Material; lashes?: BABYLON.Material } = {},
  options: { head?: string } = {}
): HumanFace {
  const headName = options.head ?? 'Head'
  const head = built.node(headName)
  const at = rig.at(headName)
  if (head == null || at == null) {
    throw new Error(`human-face: the rig has no ${headName}`)
  }
  const meshes: BABYLON.Mesh[] = []
  const eyes: BABYLON.TransformNode[] = []
  const forward: BABYLON.Vector3[] = []
  if (parts.eyes) {
    for (const [side, S, sign] of [
      ['l', 'L', 1],
      ['r', 'R', -1],
    ] as const) {
      const [cx, cy, cz] = humanJoint(
        positions,
        manifest.joints[`eye.${S}____head`]
      )
      const [tx, ty, tz] = humanJoint(
        positions,
        manifest.joints[`eye.${S}____tail`]
      )
      const pivot = new BABYLON.TransformNode(`eye_${side}`, scene)
      pivot.parent = head
      pivot.position = new BABYLON.Vector3(cx - at.x, cy - at.y, cz - at.z)
      pivot.rotationQuaternion = BABYLON.Quaternion.Identity()
      const mesh = partMesh(
        scene,
        `eye_${side}`,
        parts.eyes,
        positions,
        { x: cx, y: cy, z: cz },
        // Left is +X.
        (v) => positions[v * 3] * sign > 0,
        pivot
      )
      if (materials.eye) mesh.material = materials.eye
      meshes.push(mesh)
      eyes.push(pivot)
      forward.push(new BABYLON.Vector3(tx - cx, ty - cy, tz - cz).normalize())
    }
  }
  if (parts.eyelashes) {
    const mesh = partMesh(
      scene,
      'eyelashes',
      parts.eyelashes,
      positions,
      at,
      () => true,
      head
    )
    const local = Float32Array.from(mesh.getVerticesData('position')!)
    shortenLashes(local, eyes, 0.35)
    mesh.setVerticesData(BABYLON.VertexBuffer.PositionKind, local)
    const normals: number[] = []
    BABYLON.VertexData.ComputeNormals(local, mesh.getIndices(), normals, {
      useRightHandedSystem: true,
    })
    mesh.setVerticesData(BABYLON.VertexBuffer.NormalKind, normals)
    mesh.setVerticesData(BABYLON.VertexBuffer.ColorKind, lashAlpha(local, eyes))
    mesh.hasVertexAlpha = true
    if (materials.lashes) mesh.material = materials.lashes
    meshes.push(mesh)
  }
  return {
    eyes,
    forward,
    meshes,
    dispose() {
      for (const m of meshes) m.dispose()
      for (const e of eyes) e.dispose()
    },
  }
}

/** Compute a node's world matrix from the top down, so it is this frame's. */
function freshWorld(node: BABYLON.Node): BABYLON.Matrix {
  const chain: BABYLON.Node[] = []
  for (let n: BABYLON.Node | null = node; n != null; n = n.parent)
    chain.unshift(n)
  for (const n of chain) n.computeWorldMatrix(true)
  return node.getWorldMatrix()
}

/**
 * Point a face's eyes at `target()` (a world point, or null to look ahead)
 * every frame, after the animations. Returns a function that stops it.
 */
export function eyeGaze(
  scene: BABYLON.Scene,
  face: HumanFace,
  target: () => BABYLON.Vector3 | null,
  options: { maxDeg?: number; saccadeDeg?: number } = {}
): () => void {
  const max = ((options.maxDeg ?? 30) * Math.PI) / 180
  const saccade = ((options.saccadeDeg ?? 1.2) * Math.PI) / 180
  let next = 0
  let jitter = new BABYLON.Vector3(0, 0, 0)
  let clock = 0
  const inv = new BABYLON.Matrix()
  const local = new BABYLON.Vector3()
  const q = new BABYLON.Quaternion()
  const obs = scene.onAfterAnimationsObservable.add(() => {
    const dt = sceneDelta(scene)
    clock += dt
    const aim = target()
    if (aim != null && clock >= next) {
      // A saccade: a small jump, then a hold of a few tenths to a few seconds.
      next = clock + 0.3 + Math.random() * 2.2
      const d = BABYLON.Vector3.Distance(
        aim,
        face.eyes[0]?.getAbsolutePosition() ?? aim
      )
      const r = Math.tan(saccade) * d
      jitter = new BABYLON.Vector3(
        (Math.random() * 2 - 1) * r,
        (Math.random() * 2 - 1) * r * 0.6,
        (Math.random() * 2 - 1) * r
      )
    }
    // Both eyes' turns first: the pair looks together or not at all.
    const turns = face.eyes.map((eye, i) => {
      const fwd = face.forward[i]
      let dir = fwd
      if (aim != null) {
        freshWorld(eye).invertToRef(inv)
        // The pivot's own rotation is in its world matrix: undo it.
        const rot = eye.rotationQuaternion ?? BABYLON.Quaternion.Identity()
        BABYLON.Vector3.TransformCoordinatesToRef(aim.add(jitter), inv, local)
        local.rotateByQuaternionToRef(rot, local)
        if (local.lengthSquared() > 1e-8) dir = local.normalize()
      }
      const angle = Math.acos(
        Math.min(1, Math.max(-1, BABYLON.Vector3.Dot(fwd, dir)))
      )
      return { angle, axis: BABYLON.Vector3.Cross(fwd, dir) }
    })
    // Too far round for EITHER eye, and both go back to ahead (the head would
    // turn). Deciding per eye left one tracking while the other gave up.
    const ahead = turns.some((t) => t.angle > max)
    face.eyes.forEach((eye, i) => {
      const { angle, axis } = turns[i]
      if (ahead || axis.lengthSquared() < 1e-10 || angle === 0)
        q.copyFromFloats(0, 0, 0, 1)
      else BABYLON.Quaternion.RotationAxisToRef(axis.normalize(), angle, q)
      eye.rotationQuaternion = q.clone()
    })
  })
  return () => scene.onAfterAnimationsObservable.remove(obs)
}
