# character builder

**Make a person, and watch them walk.** The first steps of the character
creator (CHARACTER-DESIGN.md): MakeHuman's CC0 body
([human-pack](/human-pack/)), reshaped by sliders for gender, age, muscle,
weight, height and ancestry ([human-morph](/human-morph/)), with UAL's
skeleton placed from its own joint cubes ([human-rig](/human-rig/)) so it
plays UAL's clips at any shape.

## Demo

Open the settings (the owl): the body sliders reshape it
while it walks, since every body carries its own joints. The skin weights are
bone heat's, worked out from the mesh once when the page loads. The eyes
([human-face](/human-face/)) follow the camera, and the hair
([human-hair](/human-hair/)) is Quaternius' CC0 hairstyles, made for another
head and fitted to this one.

```js
import { b3d, b3dSun, b3dLight, slider3d, select3d, toggle3d, label3d, assetUrl, loadHumanPack, macroWeights, morphHuman, DEFAULT_HUMAN_BODY, humanRig, humanSkin, skinMaterial, lipTint, humanFace, eyeGaze, eyeTexture, eyeMaterial, lashMaterial, loadHairLibrary, headScalp, hairMaterial, humanHair, skinSegments, boneHeat, buildRig, readSkeleton, retargetClip } from 'tosijs-3d'
import { tosi, elements } from 'tosijs'
const { div } = elements

const status = div({ class: 'status' }, 'loading the animations…')
const { walker } = tosi({ walker: { ...DEFAULT_HUMAN_BODY, gender: 1, clip: 'Walk_Loop', tone: 0.3, redness: 0.5, iris: 0.2, hair: 'Hair_SimpleParted', beard: 'none', brows: 'Eyebrows_Regular', hairLight: 0.25, hairRed: 0.15, paused: false } })
let mat = null
let paint = () => {}
let eyes = null
let dress = () => {}
// Filled when the hair library loads.
const styles = { hair: ['none'], beard: ['none'], brows: ['none'] }
const clips = ['Idle_Loop', 'Walk_Loop', 'Jog_Fwd_Loop', 'Sprint_Loop', 'Dance_Loop', 'Crouch_Fwd_Loop']
let rebuild = () => {}

const slider = (label, key) =>
  slider3d({ label, value: walker[key], min: 0, max: 1, step: 0.01 })

preview.append(
  b3d(
    {
      clearColor: '#2a3340',
      panelTitle: 'Walker',
      scenePanel: () => [
        select3d({ label: 'clip', value: walker.clip, options: clips }),
        toggle3d({ label: 'pause', value: walker.paused }),
        slider('gender', 'gender'),
        slider('age', 'age'),
        slider('muscle', 'muscle'),
        slider('weight', 'weight'),
        slider('height', 'height'),
        label3d({ text: 'Skin' }),
        slider3d({ label: 'tone', value: walker.tone, min: 0, max: 1, step: 0.01 }),
        slider3d({ label: 'redness', value: walker.redness, min: 0, max: 1, step: 0.01 }),
        slider3d({ label: 'eyes', value: walker.iris, min: 0, max: 1, step: 0.01 }),
        label3d({ text: 'Hair' }),
        select3d({ label: 'hair', value: walker.hair, options: styles.hair }),
        select3d({ label: 'beard', value: walker.beard, options: styles.beard }),
        select3d({ label: 'brows', value: walker.brows, options: styles.brows }),
        slider3d({ label: 'light', value: walker.hairLight, min: 0, max: 1, step: 0.01 }),
        slider3d({ label: 'red', value: walker.hairRed, min: 0, max: 1, step: 0.01 }),
        label3d({ text: 'Ancestry' }),
        slider('african', 'african'),
        slider('asian', 'asian'),
        slider('caucasian', 'caucasian'),
      ],
      async sceneCreated(el, BABYLON) {
        const scene = el.scene
        const cam = new BABYLON.ArcRotateCamera('c', Math.PI / 2 - 0.5, 1.35, 4, new BABYLON.Vector3(0, 0.9, 0), scene)
        cam.minZ = 0.05
        cam.attachControl(el.querySelector('canvas'), true)
        el.setActiveCamera(cam)
        BABYLON.MeshBuilder.CreateGround('g', { width: 8, height: 8 }, scene)

        // UAL's mannequin is only the clips' source: it stays hidden.
        const ual = await BABYLON.LoadAssetContainerAsync(assetUrl('quaternius/UAL1_core.glb', 2), scene)
        status.textContent = 'loading the body…'
        ual.addAllToScene()
        for (const g of ual.animationGroups) g.stop()
        const ualRoot = ual.meshes.find((m) => m.name === '__root__')
        const source = readSkeleton(ual.skeletons[0], ualRoot)
        ualRoot.setEnabled(false)

        const pack = await loadHumanPack(assetUrl('makehuman/hm08/hm08.json', 4)).catch((e) => {
          status.textContent = `could not load the body: ${e.message}`
          throw e
        })
        // Quaternius' hairstyles, made for its own head, fitted to each body.
        const hairLib = await loadHairLibrary(scene, assetUrl('quaternius/libraries/hairstyles.glb'))
        const adult = (n) => !n.endsWith('_Teen')
        const facial = (n) => /Beard|Moustache|MuttonChops/.test(n)
        styles.hair.push(...hairLib.names('hair').filter((n) => adult(n) && !facial(n)))
        styles.beard.push(...hairLib.names('hair').filter((n) => adult(n) && facial(n)))
        styles.brows.push(...hairLib.names('eyebrows').filter(adult))
        const tints = new Map()
        const tint = (part) => {
          const from = part.material
          if (!tints.has(from)) tints.set(from, hairMaterial(scene, from, `hair-${tints.size}`))
          return tints.get(from)
        }
        status.textContent = 'binding the skin…'
        // Let the message paint before the binding takes the thread.
        await new Promise((r) => setTimeout(r, 50))
        const skin = humanSkin(pack)
        const [lips, eyePart, lashPart] = await Promise.all([pack.region('lips'), pack.part('eyes'), pack.part('eyelashes')])
        eyes = eyeTexture(scene, { iris: walker.iris.value })
        const faceMaterials = { eye: eyeMaterial(scene, eyes), lashes: lashMaterial(scene) }
        let face = null
        let scalp = null
        let hairMeshes = []
        dress = () => {
          for (const m of tints.values()) m.setHair(walker.hairLight.value, walker.hairRed.value)
          if (!built || !scalp) return
          for (const m of hairMeshes) m.dispose()
          hairMeshes = []
          for (const key of ['hair', 'beard', 'brows']) {
            const parts = hairLib.piece(walker[key].value)
            if (!parts) continue
            // Brows lie on the skin; hair stands a little off it.
            const margin = key === 'brows' ? 0.0015 : 0.003
            const centreY = key === 'brows' ? scalp.brow : undefined
            hairMeshes.push(...humanHair(scene, built, built.rig, scalp, parts, tint, { margin, name: key, centreY }))
          }
          el.register({ meshes: hairMeshes })
        }
        for (const key of ['hair', 'beard', 'brows']) walker[key].observe(() => dress())
        // Colours repaint whoever sets them: a slider, or code.
        const recolour = () => { for (const m of tints.values()) m.setHair(walker.hairLight.value, walker.hairRed.value) }
        walker.hairLight.observe(recolour)
        walker.hairRed.observe(recolour)
        for (const key of Object.keys(DEFAULT_HUMAN_BODY)) walker[key].observe(() => rebuild())
        walker.tone.observe(() => paint())
        walker.redness.observe(() => paint())
        walker.iris.observe(() => eyes.setIris(walker.iris.value))
        // The eyes find the camera.
        eyeGaze(scene, { get eyes() { return face?.eyes ?? [] }, get forward() { return face?.forward ?? [] } }, () => cam.position)
        const body = () => {
          const b = {}
          for (const k of Object.keys(DEFAULT_HUMAN_BODY)) b[k] = Number(walker[k].value)
          return macroWeights(b, (n) => pack.has(n))
        }
        // The weights depend only on the topology: once, on the first body.
        const first = await morphHuman(pack, body())
        // The weights depend only on the topology: once, on the first body.
        const rig0 = humanRig(pack.manifest, first)
        const weights = boneHeat(skin.positions(first), skin.triangles, skinSegments(rig0))

        mat = skinMaterial(scene, { tone: walker.tone.value, redness: walker.redness.value })
        // The skin's colour, and the lips' as vertex colours over it.
        paint = () => {
          mat.setSkin(walker.tone.value, walker.redness.value)
          if (lips && built) {
            built.mesh.setVerticesData('color', lipTint(skin, lips, walker.tone.value, walker.redness.value))
          }
        }
        const stand = new BABYLON.TransformNode('stand', scene)
        let built = null
        let playing = null
        let read = null
        const play = () => {
          playing?.dispose()
          const clip = ual.animationGroups.find((g) => g.name === walker.clip.value)
          playing = clip ? retargetClip(clip, source, read, { scene }) : null
          playing?.start(true)
          if (walker.paused.value) playing?.pause()
        }
        let busy = false
        let again = false
        rebuild = async () => {
          if (busy) { again = true; return }
          busy = true
          const full = await morphHuman(pack, body())
          const rig = humanRig(pack.manifest, full)
          face?.dispose()
          built?.dispose()
          built = buildRig(scene, 'walker', skin.positions(full), skin.triangles, rig, weights)
          face = humanFace(scene, built, rig, pack.manifest, full, { eyes: eyePart, eyelashes: lashPart }, faceMaterials)
          built.rig = rig
          scalp = headScalp(pack.manifest, full, pack.triangles, hairLib.reference)
          dress()
          built.mesh.material = mat
          built.root.parent = stand
          stand.position.y = -rig.at('root').y
          el.register({ meshes: [built.mesh, ...face.meshes] })
          paint()
          read = readSkeleton(built.skeleton, built.root)
          play()
          busy = false
          if (again) { again = false; rebuild() }
        }
        await rebuild()
        status.remove()
        walker.clip.observe(play)
        walker.paused.observe(() => (walker.paused.value ? playing?.pause() : playing?.play(true)))
      },
    },
    b3dSun({ timeOfDay: 15 }),
    b3dLight({ intensity: 0.5 })
  ),
  status
)
```
```css
tosi-b3d { width: 100%; height: 100%; }
.status { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.6); color: white; padding: 6px 12px; border-radius: 6px; font: 13px sans-serif; }
```

## humanBody

`humanBody(scene, pack)` draws a pack's body as one unrigged mesh, and
`update(positions)` reshapes it in place: for a body that only needs to be
looked at.


The pack is RIGHT-HANDED (as OBJ and glTF are), so the body sits under a
container that mirrors it the way glTF's `__root__` does, and stands with its
feet at the container's origin. Move the body by moving `root`. The mesh keeps
every vertex the targets move (helpers and joint cubes too), but draws only the
body's triangles.
