# retarget

**One humanoid's animation on another humanoid's body.** The Universal
Animation Library's clips are authored on the UE mannequin; a Mixamo
character, a Kenney chibi or a model of your own has different bone names,
a different number of bones, a different rest pose and different
proportions. This makes the clips play anyway.

## Demo

One clip, four bodies. On the right, UAL's own mannequin plays the original;
then the same clip retargeted onto a Quaternius superhero (the same 65 bones,
other proportions), omnidude (Mixamo's bones, 0.88 m tall) and a Kenney
chibi (seven bones: one for each whole leg, arm and the torso; shown three
times its size). Pick a clip in the panel.

A chibi's arms are long for its height: hanging where the clip's hang, its
hands would go through the floor. `armSpaceDeg` (Mixamo's "Character
Arm-Space") turns the upper arms out from the body, and the chibi takes 55°.

```js
import { b3d, b3dLight, assetUrl, readSkeleton, retargetClip, select3d } from 'tosijs-3d'
import { tosi } from 'tosijs'

const { rt } = tosi({ rt: { clip: 'Walk_Loop' } })
const clips = ['Idle_Loop', 'Walk_Loop', 'Jog_Fwd_Loop', 'Sprint_Loop', 'Dance_Loop', 'Crouch_Fwd_Loop', 'Swim_Fwd_Loop', 'Pistol_Idle_Loop']

preview.append(
  b3d(
    {
      clearColor: '#2a3340',
      panelTitle: 'Retarget',
      scenePanel: () => [select3d({ label: 'clip', value: rt.clip, options: clips })],
      async sceneCreated(el, BABYLON) {
        const scene = el.scene
        const cam = new BABYLON.ArcRotateCamera('c', Math.PI / 2, 1.35, 7, new BABYLON.Vector3(0, 0.8, 0), scene)
        cam.attachControl(el.querySelector('canvas'), true)
        el.setActiveCamera(cam)
        const ground = BABYLON.MeshBuilder.CreateGround('g', { width: 12, height: 6 }, scene)
        ground.position.y = -0.01

        const load = async (url) => {
          const c = await BABYLON.LoadAssetContainerAsync(url, scene)
          c.addAllToScene()
          for (const g of c.animationGroups) g.stop()
          return c
        }
        const rootOf = (c) => c.meshes.find((m) => m.name === '__root__')
        // One character out of a library file: hide the rest, find its skin.
        const pick = (c, name) => {
          const top = c.transformNodes.find((n) => n.name === name) || c.meshes.find((n) => n.name === name)
          for (const m of c.meshes) if (m.name !== '__root__' && top && !m.isDescendantOf(top) && m !== top) m.setEnabled(false)
          if (top) top.position.set(0, 0, 0)
          return c.skeletons.find((s) => s.bones.some((b) => { const t = b.getTransformNode(); return t && top && t.isDescendantOf(top) }))
        }

        const ual = await load(assetUrl('quaternius/UAL1_core.glb', 2))
        const source = readSkeleton(ual.skeletons[0], rootOf(ual))
        const bodies = [{ root: rootOf(ual), skeleton: null, x: 2.4 }]
        const hero = await load(assetUrl('quaternius/libraries/characters-superhero-male.glb'))
        bodies.push({ root: rootOf(hero), skeleton: pick(hero, 'Superhero_Male_FullBody'), x: 0.8 })
        const omni = await load('/omnidude.glb')
        bodies.push({ root: rootOf(omni), skeleton: omni.skeletons[0], x: -0.8 })
        const mini = await load(assetUrl('kenney/libraries/mini-characters.glb'))
        const miniSkin = pick(mini, 'character-female-a')
        rootOf(mini).scaling.scaleInPlace(3)
        bodies.push({ root: rootOf(mini), skeleton: miniSkin, x: -2.4, armSpaceDeg: 55 })

        for (const b of bodies) {
          b.root.position.x = b.x
          if (b.skeleton) b.read = readSkeleton(b.skeleton, b.root)
        }
        // Retarget each clip once per body, the first time it is asked for.
        const made = new Map()
        let playing = []
        const play = (name) => {
          for (const g of playing) g.stop()
          const clip = ual.animationGroups.find((g) => g.name === name)
          if (!clip) return
          playing = bodies.map((b, i) => {
            if (!b.read) return clip
            const key = name + i
            if (!made.has(key)) made.set(key, retargetClip(clip, source, b.read, { scene, armSpaceDeg: b.armSpaceDeg }))
            return made.get(key)
          })
          for (const g of playing) g.start(true)
        }
        play(rt.clip.value)
        rt.clip.observe(() => play(rt.clip.value))
      },
    },
    b3dLight({ intensity: 0.9 })
  )
)
```

## How it works

1. **Roles.** `humanoidRoles(bones)` says which bone is the hips, the chest,
   the left forearm, … from the names and the hierarchy, across the common
   spellings (UE `upperarm_l`, Mixamo `mixamorig:LeftArm`, Kenney `arm-left`,
   Blender `forearm.L`), and each finger's three joints (`index_01_l`,
   `LeftHandIndex1`, `thumb.01.L`). Twist, IK and end bones are left alone.
2. **Rotations, not positions.** `retargeter(source, target).pose` gives each target bone the
   world-space rotation its source bone made since ITS rest, so bone
   lengths are the target's own: a long-legged clip on a short-legged body
   bends the same joints by the same angles.
3. **Rest poses that disagree.** A clip authored on an A-pose rig, played on
   a T-pose one, must still put the arms where the clip shows them, not 45°
   higher. Each target bone is first lined up with its source bone's rest
   direction (toward the next joint down the limb; a hand toward a finger
   both rigs have), so poses come across as the clip shows them, whatever
   rest pose either rig was bound in.
4. **The hips move in proportion.** Their translation is scaled by the ratio
   of hip heights, so a short character's stride is shorter, not stretched.

Babylon-free and deterministic (plain `{x, y, z, w}` quaternions), like
`fly-by-wire`: the Babylon side (`retarget-babylon`) reads the skeletons and
writes the result.

A mesh with no skeleton at all can be rigged for these clips too: see
[auto-rig](/rig-build/), which fits a skeleton from eight markers dragged
over the mesh, as Mixamo's auto-rigger does, and binds the mesh to it.
