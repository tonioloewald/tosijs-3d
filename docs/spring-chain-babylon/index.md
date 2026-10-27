# spring bones

**Hair, tails and cloaks that follow the body.** A chain of bones nobody
animates — a ponytail, a tail, a strand of a cape — swings, trails and
settles on its own, after the body's animation has posed it each frame. The
body is animated; the hair is simulated.

## Demo

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

A UAL mannequin with a ponytail it was not made with: six bones hung from
the head, a tube skinned to them by bone heat, and the chain simulated.
Change the clip, or the stiffness and damping, in the panel.

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
