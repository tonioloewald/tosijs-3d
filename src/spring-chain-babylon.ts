/*#
# spring bones

**Hair, tails and cloaks that follow the body.** A chain of bones nobody
animates — a ponytail, a tail, a strand of a cape — swings, trails and
settles on its own, after the body's animation has posed it each frame. The
body is animated; the hair is simulated.

## Demo

A UAL mannequin with a ponytail it was not made with: six bones hung from
the head, a tube skinned to them by bone heat, and the chain simulated.
Change the clip, or the stiffness and damping, in the panel.

```js
import { b3d, b3dLight, assetUrl, select3d, slider3d, springBones, boneHeat, sceneDelta } from 'tosijs-3d'
import { tosi } from 'tosijs'

const { hair } = tosi({ hair: { clip: 'Jog_Fwd_Loop', stiffness: 0.1, damping: 0.6 } })
const clips = ['Idle_Loop', 'Walk_Loop', 'Jog_Fwd_Loop', 'Sprint_Loop', 'Dance_Loop']
const speeds = { Idle_Loop: 0, Walk_Loop: 1.4, Jog_Fwd_Loop: 3, Sprint_Loop: 5.5, Dance_Loop: 0 }

preview.append(
  b3d(
    {
      clearColor: '#2a3340',
      scenePanelOpen: true,
      panelTitle: 'Ponytail',
      scenePanel: () => [
        select3d({ label: 'clip', value: hair.clip, options: clips }),
        slider3d({ label: 'stiffness', value: hair.stiffness, min: 0, max: 1, step: 0.01 }),
        slider3d({ label: 'damping', value: hair.damping, min: 0, max: 0.99, step: 0.01 }),
      ],
      async sceneCreated(el, BABYLON) {
        const scene = el.scene
        const cam = new BABYLON.ArcRotateCamera('c', Math.PI / 3, 1.3, 3.2, new BABYLON.Vector3(0, 1, 0), scene)
        cam.attachControl(el.querySelector('canvas'), true)
        el.setActiveCamera(cam)
        BABYLON.MeshBuilder.CreateGround('g', { width: 12, height: 12 }, scene)

        const ual = await BABYLON.LoadAssetContainerAsync(assetUrl('quaternius/UAL1_core.glb', 2), scene)
        ual.addAllToScene()
        for (const g of ual.animationGroups) g.stop()
        const root = ual.meshes.find((m) => m.name === '__root__')
        const node = (n) => ual.transformNodes.find((t) => t.name === n)
        const head = node('Head')

        // Where the ponytail hangs, measured off the body in its rest pose:
        // forward is from the heel to the toes, up the back of the skull.
        root.computeWorldMatrix(true)
        for (const t of ual.transformNodes) t.computeWorldMatrix(true)
        const at = (n) => node(n).getAbsolutePosition().clone()
        const fwd = at('ball_leaf_l').subtract(at('foot_l')).multiplyByFloats(1, 0, 1).normalize()
        const up = new BABYLON.Vector3(0, 1, 0)
        const start = at('Head').add(up.scale(0.13)).subtract(fwd.scale(0.1))
        const dir = fwd.scale(-0.45).add(up.scale(-0.9)).normalize()
        const points = [0, 1, 2, 3, 4, 5, 6].map((i) => start.add(dir.scale(0.075 * i)))

        const pony = springBones(scene, head, points, {
          colliders: [
            { node: head, radius: 0.12, offset: up.scale(0.09) },
            { node: node('spine_03'), radius: 0.17 },
            { node: node('clavicle_l'), radius: 0.09 },
            { node: node('clavicle_r'), radius: 0.09 },
          ],
          params: { stiffness: hair.stiffness.value, damping: hair.damping.value },
        })
        hair.stiffness.observe(() => (pony.params.stiffness = hair.stiffness.value))
        hair.damping.observe(() => (pony.params.damping = hair.damping.value))

        // A tube around the chain, skinned to it by bone heat.
        const tube = pony.skinTube({ radius: 0.035, tipRadius: 0.012, sides: 8, boneHeat })
        const mat = new BABYLON.StandardMaterial('hair', scene)
        mat.diffuseColor = new BABYLON.Color3(0.45, 0.25, 0.1)
        mat.backFaceCulling = false
        tube.material = mat

        // Run round a circle at the clip's own speed, so the hair trails.
        // (A node above glTF's root, whose mirror and turn stay as loaded.)
        const runner = new BABYLON.TransformNode('runner', scene)
        root.parent = runner
        const yaw0 = Math.atan2(fwd.x, fwd.z)
        // The camera follows the runner, at head height.
        const look = new BABYLON.TransformNode('look', scene)
        look.parent = runner
        look.position.y = 1.35
        cam.setTarget(look)
        let angle = 0
        const radius = 2.2
        scene.onBeforeAnimationsObservable.add(() => {
          angle += ((speeds[hair.clip.value] ?? 0) * sceneDelta(scene)) / radius
          runner.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius)
          runner.rotation.y = Math.atan2(-Math.sin(angle), Math.cos(angle)) - yaw0
        })
        let playing = null
        const play = (name) => {
          playing?.stop()
          playing = ual.animationGroups.find((g) => g.name === name)
          playing?.start(true)
        }
        play(hair.clip.value)
        hair.clip.observe(() => play(hair.clip.value))
      },
    },
    b3dLight({ intensity: 0.9 })
  )
)
```

## Use

`springBones(scene, anchor, points, options)` hangs a chain from `anchor` (any
TransformNode: a glTF bone's node, or a mesh) through `points` (world, in the
rest pose), makes a TransformNode per joint under the anchor, and simulates
them every frame after animations run. Options:

| option | |
| --- | --- |
| `params` | `stiffness` (0 hangs free, 1 holds its rest shape), `damping` (velocity lost per second), `gravity`, `radius` |
| `colliders` | spheres the chain stays out of: `{ node, radius, offset? }` |

It returns `{ nodes, params, skinTube(options), reset(), dispose() }`.
`nodes` are the chain's joints, to parent your own meshes to; `skinTube`
builds a tube skinned to them (pass `boneHeat` to weight it). Call `reset()`
after a teleport. The pure model is `spring-chain`: Verlet at a fixed 120 Hz
step, lengths solved from the root with Müller's follow-the-leader damping
(otherwise the tip cracks like a whip for seconds).
*/
/*{ "parent": "b3d-biped", "order": 72 }*/

import * as BABYLON from '@babylonjs/core'
import {
  resetSpringChain,
  springChain,
  stepSpringChain,
  SPRING_DEFAULTS,
  type SpringChain,
  type SpringCollider,
  type SpringParams,
} from './spring-chain.js'
import type { HeatBone, SkinWeights } from './bone-heat.js'
import type { Vec3 } from './spatial-transform.js'
import { sceneDelta } from './b3d-utils.js'

export interface SpringBoneCollider {
  node: BABYLON.TransformNode
  radius: number
  /** World-space offset from the node (e.g. up to the middle of a skull). */
  offset?: BABYLON.Vector3
}

export interface SpringBones {
  /** The chain's joints, one per point; the last is the tip. */
  nodes: BABYLON.TransformNode[]
  /** Live: change and the next frame uses it. */
  params: SpringParams
  chain: SpringChain
  /** A tube around the chain, skinned to it. */
  skinTube(options?: {
    radius?: number
    tipRadius?: number
    sides?: number
    boneHeat?: (
      p: ArrayLike<number>,
      i: ArrayLike<number>,
      b: HeatBone[]
    ) => SkinWeights
  }): BABYLON.Mesh
  /** Back to the rest shape (after a teleport). */
  reset(): void
  dispose(): void
}

const v3 = (v: BABYLON.Vector3): Vec3 => ({ x: v.x, y: v.y, z: v.z })

/** World matrices fresh from the top down (animation has just moved them). */
function freshen(node: BABYLON.Node): void {
  const line: BABYLON.Node[] = []
  for (let n: BABYLON.Node | null = node; n != null; n = n.parent)
    line.unshift(n)
  for (const n of line) n.computeWorldMatrix(true)
}

/**
 * Hang a simulated chain from `anchor` through `points` (world, rest pose):
 * one new TransformNode per point, each under the one before.
 */
export function springBones(
  scene: BABYLON.Scene,
  anchor: BABYLON.TransformNode,
  points: readonly BABYLON.Vector3[],
  options: {
    params?: Partial<SpringParams>
    colliders?: SpringBoneCollider[]
  } = {}
): SpringBones {
  freshen(anchor)
  const nodes: BABYLON.TransformNode[] = []
  let parentWorldInv = anchor.getWorldMatrix().clone().invert()
  for (let i = 0; i < points.length; i++) {
    const n = new BABYLON.TransformNode(`${anchor.name}-spring-${i}`, scene)
    n.parent = i === 0 ? anchor : nodes[i - 1]
    n.position = BABYLON.Vector3.TransformCoordinates(points[i], parentWorldInv)
    n.rotationQuaternion = BABYLON.Quaternion.Identity()
    n.computeWorldMatrix(true)
    parentWorldInv = n.getWorldMatrix().clone().invert()
    nodes.push(n)
  }
  const made = springNodes(scene, nodes, options)
  const dispose = made.dispose
  made.dispose = () => {
    dispose()
    for (const n of [...nodes].reverse()) n.dispose()
  }
  return made
}

/**
 * Simulate an EXISTING chain of nodes (a tail or hair a rig already has):
 * each node the parent of the next, the first's parent the anchor the chain
 * hangs from, the last the tip. Rest rotations are kept: the simulation
 * only swings each bone away from its own rest direction.
 */
export function springNodes(
  scene: BABYLON.Scene,
  nodes: BABYLON.TransformNode[],
  options: {
    params?: Partial<SpringParams>
    colliders?: SpringBoneCollider[]
  } = {}
): SpringBones {
  const anchor = nodes[0].parent as BABYLON.TransformNode
  freshen(nodes[nodes.length - 1])
  const points = nodes.map((n) => n.getAbsolutePosition().clone())
  // Directions between world and the anchor's frame (mirror-safe).
  const dirTo =
    (m: BABYLON.Matrix) =>
    (v: Vec3): Vec3 => {
      const r = BABYLON.Vector3.TransformNormal(
        new BABYLON.Vector3(v.x, v.y, v.z),
        m
      ).normalize()
      return { x: r.x, y: r.y, z: r.z }
    }
  const toLocal = anchor.getWorldMatrix().clone().invert()
  const chain = springChain(
    points.map(v3),
    { x: 0, y: 0, z: 0, w: 1 },
    dirTo(toLocal)
  )
  const params: SpringParams = { ...SPRING_DEFAULTS, ...options.params }

  const colliders = (): SpringCollider[] =>
    (options.colliders ?? []).map((c) => {
      const p = c.node.getAbsolutePosition()
      return {
        center: {
          x: p.x + (c.offset?.x ?? 0),
          y: p.y + (c.offset?.y ?? 0),
          z: p.z + (c.offset?.z ?? 0),
        },
        radius: c.radius,
      }
    })

  // Each joint's rest rotation, and its rest direction to the next joint as
  // its parent sees it (the rest rotation applied to the child's offset).
  const restRot = nodes.map((n) =>
    (
      n.rotationQuaternion ?? BABYLON.Quaternion.FromEulerVector(n.rotation)
    ).clone()
  )
  const restDir = nodes.map((n, i) =>
    i + 1 < nodes.length
      ? nodes[i + 1].position
          .clone()
          .normalize()
          .applyRotationQuaternion(restRot[i])
      : null
  )

  const apply = () => {
    for (let i = 0; i + 1 < nodes.length; i++) {
      const n = nodes[i]
      const parent = n.parent as BABYLON.TransformNode
      const want = chain.points[i + 1]
      const from = chain.points[i]
      // Where the next point is, seen from this joint's parent.
      const inv = parent.getWorldMatrix().clone().invert()
      const d = BABYLON.Vector3.TransformNormal(
        new BABYLON.Vector3(want.x - from.x, want.y - from.y, want.z - from.z),
        inv
      ).normalize()
      const swing = new BABYLON.Quaternion()
      BABYLON.Quaternion.FromUnitVectorsToRef(restDir[i]!, d, swing)
      n.rotationQuaternion = swing.multiply(restRot[i])
      n.computeWorldMatrix(true)
    }
    nodes[nodes.length - 1].computeWorldMatrix(true)
  }

  let first = true
  const obs = scene.onAfterAnimationsObservable.add(() => {
    freshen(anchor)
    nodes[0].computeWorldMatrix(true)
    const a = nodes[0].getAbsolutePosition()
    const orient = dirTo(anchor.getWorldMatrix())
    if (first) {
      resetSpringChain(chain, v3(a), orient)
      first = false
    }
    const dt = Math.min(0.1, sceneDelta(scene))
    stepSpringChain(chain, v3(a), orient, dt, params, colliders())
    apply()
  })

  return {
    nodes,
    params,
    chain,
    skinTube(o = {}) {
      return skinTube(scene, anchor, nodes, points, o)
    },
    reset() {
      first = true
    },
    dispose() {
      scene.onAfterAnimationsObservable.remove(obs)
    },
  }
}

/*
A TUBE SKINNED TO THE CHAIN. The mesh hangs under the anchor with the
vertices in the anchor's frame, and its skeleton's bones are LINKED to the
chain's nodes (Babylon then reads each bone from its node), so the root bone's
frame is the anchor's, as glTF skins are built.
*/
function skinTube(
  scene: BABYLON.Scene,
  anchor: BABYLON.TransformNode,
  nodes: BABYLON.TransformNode[],
  points: readonly BABYLON.Vector3[],
  o: {
    radius?: number
    tipRadius?: number
    sides?: number
    boneHeat?: (
      p: ArrayLike<number>,
      i: ArrayLike<number>,
      b: HeatBone[]
    ) => SkinWeights
  }
): BABYLON.Mesh {
  const r0 = o.radius ?? 0.04
  const r1 = o.tipRadius ?? r0 * 0.3
  const sides = o.sides ?? 8
  freshen(anchor)
  const inv = anchor.getWorldMatrix().clone().invert()
  const local = points.map((p) => BABYLON.Vector3.TransformCoordinates(p, inv))
  const pos: number[] = []
  const idx: number[] = []
  // Rings at every point and halfway between, so bends have vertices.
  const rings: BABYLON.Vector3[] = []
  const radii: number[] = []
  const n = local.length
  for (let i = 0; i < n; i++) {
    for (const t of i + 1 < n ? [0, 0.5] : [0]) {
      const p =
        i + 1 < n ? BABYLON.Vector3.Lerp(local[i], local[i + 1], t) : local[i]
      rings.push(p)
      radii.push(r0 + (r1 - r0) * ((i + t) / (n - 1)))
    }
  }
  for (let k = 0; k < rings.length; k++) {
    const a = rings[Math.max(0, k - 1)]
    const b = rings[Math.min(rings.length - 1, k + 1)]
    const t = b.subtract(a).normalize()
    const side =
      Math.abs(t.y) < 0.9 ? BABYLON.Vector3.Up() : BABYLON.Vector3.Right()
    const u = BABYLON.Vector3.Cross(t, side).normalize()
    const w = BABYLON.Vector3.Cross(t, u).normalize()
    for (let s = 0; s < sides; s++) {
      const ang = (2 * Math.PI * s) / sides
      const p = rings[k]
        .add(u.scale(Math.cos(ang) * radii[k]))
        .add(w.scale(Math.sin(ang) * radii[k]))
      pos.push(p.x, p.y, p.z)
    }
  }
  for (let k = 0; k + 1 < rings.length; k++)
    for (let s = 0; s < sides; s++) {
      const a = k * sides + s
      const b = k * sides + ((s + 1) % sides)
      idx.push(a, a + sides, b + sides, a, b + sides, b)
    }
  // Caps.
  const c0 = pos.length / 3
  pos.push(rings[0].x, rings[0].y, rings[0].z)
  const last = rings[rings.length - 1]
  pos.push(last.x, last.y, last.z)
  const lastRing = (rings.length - 1) * sides
  for (let s = 0; s < sides; s++) {
    idx.push(c0, (s + 1) % sides, s)
    idx.push(c0 + 1, lastRing + s, lastRing + ((s + 1) % sides))
  }

  const mesh = new BABYLON.Mesh(`${anchor.name}-spring-tube`, scene)
  const data = new BABYLON.VertexData()
  data.positions = pos
  data.indices = idx
  const normals: number[] = []
  BABYLON.VertexData.ComputeNormals(pos, idx, normals)
  data.normals = normals
  data.applyToMesh(mesh)
  mesh.parent = anchor

  const skeleton = new BABYLON.Skeleton(
    `${anchor.name}-spring-skeleton`,
    `${anchor.name}-spring-skeleton`,
    scene
  )
  const bones: BABYLON.Bone[] = []
  nodes.forEach((node, i) => {
    const b = new BABYLON.Bone(
      node.name,
      skeleton,
      i === 0 ? null : bones[i - 1],
      BABYLON.Matrix.Compose(
        node.scaling,
        node.rotationQuaternion!,
        node.position
      )
    )
    b.linkTransformNode(node)
    bones.push(b)
  })
  // Weights: bone heat if given, else each vertex to the nearer joint's bone.
  const segs: HeatBone[] = []
  for (let i = 0; i + 1 < n; i++)
    segs.push({ index: i, a: v3(local[i]), b: v3(local[i + 1]) })
  let skin: SkinWeights
  if (o.boneHeat != null) skin = o.boneHeat(pos, idx, segs)
  else {
    const count = pos.length / 3
    skin = {
      indices: new Float32Array(count * 4),
      weights: new Float32Array(count * 4),
    }
    for (let v = 0; v < count; v++) {
      skin.indices[v * 4] = Math.min(n - 2, Math.floor(v / sides / 2))
      skin.weights[v * 4] = 1
    }
  }
  mesh.setVerticesData(BABYLON.VertexBuffer.MatricesIndicesKind, skin.indices)
  mesh.setVerticesData(BABYLON.VertexBuffer.MatricesWeightsKind, skin.weights)
  mesh.skeleton = skeleton
  return mesh
}
