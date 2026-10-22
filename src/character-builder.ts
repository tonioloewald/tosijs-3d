/*#
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
import { b3d, b3dSun, b3dLight, slider3d, select3d, toggle3d, label3d, assetUrl, loadHumanPack, macroWeights, morphHuman, DEFAULT_HUMAN_BODY, humanRig, humanSkin, skinMaterial, lipTint, humanFace, eyeGaze, eyeTexture, eyeMaterial, lashMaterial, loadHairLibrary, headScalp, hairMaterial, humanHair, skinThinness, vertexNormals, nearestWeights, humanProxy, proxyMaterial, coverBody, fitProxy, drawnPositions, underCover, hairShading, HAIR_COLOURS, color3d, skinSegments, boneHeat, buildRig, readSkeleton, retargetClip } from 'tosijs-3d'
import { tosi, elements } from 'tosijs'
const { div } = elements

const status = div({ class: 'status' }, 'loading the animations…')
const { walker } = tosi({ walker: { ...DEFAULT_HUMAN_BODY, gender: 1, clip: 'Walk_Loop', tone: 0.3, redness: 0.5, iris: 0.2, hair: 'Hair_SimpleParted', beard: 'none', brows: 'Eyebrows_Regular', hairPreset: 'brown', hairBase: HAIR_COLOURS.brown.base, hairHighlight: HAIR_COLOURS.brown.highlight, hairUp: 0, hairForward: 0, hairSize: 1, beardUp: 0, beardForward: 0, outfit: 'male_casualsuit02', shoes: 'shoes01', hat: 'none', paused: false } })
let mat = null
let paint = () => {}
let eyes = null
let dress = () => {}
// Filled when the hair library loads.
const styles = { hair: ['none'], beard: ['none'], brows: ['none'], outfit: ['none'], shoes: ['none'], hat: ['none'] }
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
        label3d({ text: 'Eyes' }),
        slider3d({ label: 'eye colour', value: walker.iris, min: 0, max: 1, step: 0.01 }),
        label3d({ text: 'Hair' }),
        select3d({ label: 'hair', value: walker.hair, options: styles.hair }),
        select3d({ label: 'beard', value: walker.beard, options: styles.beard }),
        select3d({ label: 'brows', value: walker.brows, options: styles.brows }),
        // A base and a highlight; a preset sets both, the pickers go anywhere.
        select3d({ label: 'colour', value: walker.hairPreset, options: Object.keys(HAIR_COLOURS) }),
        color3d({ label: 'base', value: walker.hairBase.value, alpha: false, aspect: 0.4, handleChange: (hex) => { walker.hairBase.value = hex } }),
        color3d({ label: 'highlights', value: walker.hairHighlight.value, alpha: false, aspect: 0.4, handleChange: (hex) => { walker.hairHighlight.value = hex } }),
        // A hand adjustment, metres and a scale, after the fit.
        slider3d({ label: 'up', value: walker.hairUp, min: -0.02, max: 0.02, step: 0.001 }),
        slider3d({ label: 'forward', value: walker.hairForward, min: -0.02, max: 0.02, step: 0.001 }),
        slider3d({ label: 'size', value: walker.hairSize, min: 0.9, max: 1.1, step: 0.005 }),
        slider3d({ label: 'beard up', value: walker.beardUp, min: -0.02, max: 0.02, step: 0.001 }),
        slider3d({ label: 'beard forward', value: walker.beardForward, min: -0.02, max: 0.02, step: 0.001 }),
        label3d({ text: 'Clothes' }),
        select3d({ label: 'outfit', value: walker.outfit, options: styles.outfit }),
        select3d({ label: 'shoes', value: walker.shoes, options: styles.shoes }),
        select3d({ label: 'hat', value: walker.hat, options: styles.hat }),
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
        // A floor with a metre grid (and faint quarters), which takes the sun's shadow.
        const floor = BABYLON.MeshBuilder.CreateGround('floor_nocast', { width: 12, height: 12 }, scene)
        const tile = new BABYLON.DynamicTexture('floor-grid', { width: 256, height: 256 }, scene, true)
        const ctx = tile.getContext()
        ctx.fillStyle = '#5d6672'
        ctx.fillRect(0, 0, 256, 256)
        ctx.strokeStyle = 'rgba(255,255,255,0.12)'
        ctx.lineWidth = 2
        for (const at of [64, 128, 192]) {
          ctx.beginPath(); ctx.moveTo(at, 0); ctx.lineTo(at, 256); ctx.moveTo(0, at); ctx.lineTo(256, at); ctx.stroke()
        }
        ctx.strokeStyle = 'rgba(255,255,255,0.45)'
        ctx.lineWidth = 4
        ctx.strokeRect(0, 0, 256, 256)
        tile.update()
        tile.wrapU = tile.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE
        tile.uScale = tile.vScale = 12
        tile.anisotropicFilteringLevel = 8
        const floorMat = new BABYLON.StandardMaterial('floor', scene)
        floorMat.diffuseTexture = tile
        floorMat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05)
        floor.material = floorMat
        el.register({ meshes: [floor] })

        // UAL's mannequin is only the clips' source: it stays hidden.
        const ual = await BABYLON.LoadAssetContainerAsync(assetUrl('quaternius/UAL1_core.glb', 2), scene)
        status.textContent = 'loading the body…'
        ual.addAllToScene()
        for (const g of ual.animationGroups) g.stop()
        const ualRoot = ual.meshes.find((m) => m.name === '__root__')
        const source = readSkeleton(ual.skeletons[0], ualRoot)
        ualRoot.setEnabled(false)

        const pack = await loadHumanPack(assetUrl('makehuman/hm08/hm08.json', 6)).catch((e) => {
          status.textContent = `could not load the body: ${e.message}`
          throw e
        })
        // Quaternius' hairstyles, made for its own head, fitted to each body.
        const hairLib = await loadHairLibrary(scene, assetUrl('quaternius/libraries/hairstyles.glb', 2))
        const adult = (n) => !n.endsWith('_Teen')
        const facial = (n) => /Beard|Moustache|MuttonChops/.test(n)
        styles.hair.push(...hairLib.names('hair').filter((n) => adult(n) && !facial(n)))
        styles.beard.push(...hairLib.names('hair').filter((n) => adult(n) && facial(n)))
        styles.brows.push(...hairLib.names('eyebrows').filter(adult))
        // MakeHuman's own clothes, hair and brows, bound to this body (proxy-fit).
        const proxies = pack.manifest.proxies ?? {}
        const kinds = (cat, test) => Object.keys(proxies).filter((n) => proxies[n].category === cat && test(n))
        styles.outfit.push(...kinds('clothes', (n) => !/^shoes|fedora/.test(n)))
        styles.shoes.push(...kinds('clothes', (n) => n.startsWith('shoes')))
        styles.hat.push(...kinds('clothes', (n) => n.startsWith('fedora')))
        styles.hair.push(...kinds('hair', () => true))
        styles.brows.push(...kinds('eyebrows', () => true))
        styles.beard.push(...kinds('beard', () => true))
        const proxyMaterials = new Map()
        const tints = new Map()
        // Every hair material's colouring (Quaternius' and MakeHuman's).
        const shades = []
        const tint = (part) => {
          const from = part.material
          if (!tints.has(from)) {
            const m = hairMaterial(scene, from, `hair-${tints.size}`)
            shades.push(hairShading(m, { base: walker.hairBase.value, highlight: walker.hairHighlight.value }))
            tints.set(from, m)
          }
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
        let dressing = 0
        dress = async () => {
          if (!built || !scalp) return
          const token = ++dressing
          // What it wears from the pack (bound), fetched before anything changes.
          const slots = ['outfit', 'shoes', 'hat', 'hair', 'brows', 'beard'].map((k) => walker[k].value).filter((n) => proxies[n])
          const wearing = await Promise.all(slots.map((n) => pack.proxy(n)))
          if (token !== dressing) return
          for (const m of hairMeshes) m.dispose()
          hairMeshes = []
          const nudge = { y: walker.hairUp.value, z: walker.hairForward.value, scale: walker.hairSize.value }
          const beardNudge = { y: walker.beardUp.value, z: walker.beardForward.value }
          for (const key of ['hair', 'beard', 'brows']) {
            const parts = hairLib.piece(walker[key].value)
            if (!parts) continue
            // Brows and beards follow the face; hair follows the skull.
            const style = walker[key].value
            const on = hairLib.fitFor(style)
            hairMeshes.push(...humanHair(scene, built, built.rig, scalp, parts, tint, { name: key, on, head: hairLib.headFor(style), centreY: key === 'brows' ? scalp.brow : undefined, nudge: key === 'hair' ? nudge : key === 'beard' ? beardNudge : undefined }))
          }
          for (const proxy of wearing) {
            if (!proxyMaterials.has(proxy.name)) {
              const m = proxyMaterial(scene, proxy)
              // MakeHuman's hair, brows and beards take the hair colours too.
              if (proxy.category !== 'clothes') shades.push(hairShading(m, { desaturate: true, base: walker.hairBase.value, highlight: walker.hairHighlight.value }))
              proxyMaterials.set(proxy.name, m)
            }
            const mesh = humanProxy(scene, built, proxy, current, allWeights, proxyMaterials.get(proxy.name))
            mesh.metadata = { category: proxy.category }
            hairMeshes.push(mesh)
          }
          // A hat hides the hair under its brim, or the hair pokes through it.
          const hat = wearing.find((p) => p.name === walker.hat.value)
          if (hat) {
            const crown = drawnPositions(hat, fitProxy(hat, current))
            const at = built.rig.at('Head')
            for (const mesh of hairMeshes) {
              const hair = mesh.name.startsWith('hair-') || mesh.metadata?.category === 'hair'
              if (!hair) continue
              // Quaternius' hair hangs on the head, in its frame less the head joint.
              const p = Float32Array.from(mesh.getVerticesData('position'))
              if (mesh.name.startsWith('hair-')) {
                for (let i = 0; i < p.length; i += 3) { p[i] += at.x; p[i + 1] += at.y; p[i + 2] += at.z }
              }
              mesh.setIndices(Array.from(underCover(crown, p, mesh.getIndices())))
            }
          }
          // Skin under clothes is hidden, so it cannot show through.
          coverBody(built, skin.triangles, skin.vertices, wearing)
          el.register({ meshes: hairMeshes })
        }
        for (const key of ['hair', 'beard', 'brows', 'hairUp', 'hairForward', 'hairSize', 'beardUp', 'beardForward', 'outfit', 'shoes', 'hat']) walker[key].observe(() => dress())
        // Colours repaint whoever sets them: a picker, a preset, or code.
        const recolour = () => { for (const sh of shades) sh.setColours(walker.hairBase.value, walker.hairHighlight.value) }
        walker.hairBase.observe(recolour)
        walker.hairHighlight.observe(recolour)
        walker.hairPreset.observe(() => {
          const p = HAIR_COLOURS[walker.hairPreset.value]
          if (!p) return
          walker.hairBase.value = p.base
          walker.hairHighlight.value = p.highlight
          el.refreshScenePanel?.()
        })
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
        // How thin the body is at each vertex (ears, nose, fingers), for the
        // skin's back-light: once, like the weights.
        const firstSkin = skin.positions(first)
        const thin = skinThinness(firstSkin, vertexNormals(firstSkin, skin.triangles))
        // Weights for every pack vertex, so clothes bound to helper vertices
        // (the tights and skirt shells, which carry no skin) bend too.
        const known = new Int32Array(pack.manifest.vertexCount).fill(-1)
        skin.vertices.forEach((v, i) => { known[v] = i })
        const allWeights = nearestWeights(first, known, weights)
        let current = first

        mat = skinMaterial(scene, { tone: walker.tone.value, redness: walker.redness.value })
        // The skin's colour, and the lips' as vertex colours over it.
        paint = () => {
          mat.setSkin(walker.tone.value, walker.redness.value)
          if (lips && built) {
            built.mesh.setVerticesData('color', lipTint(skin, lips, walker.tone.value, walker.redness.value, undefined, thin))
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
          current = full
          const rig = humanRig(pack.manifest, full)
          face?.dispose()
          built?.dispose()
          built = buildRig(scene, 'walker', skin.positions(full), skin.triangles, rig, weights)
          face = humanFace(scene, built, rig, pack.manifest, full, { eyes: eyePart, eyelashes: lashPart }, faceMaterials)
          built.rig = rig
          scalp = headScalp(pack.manifest, full, pack.triangles, { lips })
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
    b3dSun({ timeOfDay: 16.5, shadowTextureSize: 2048, shadowMaxZ: 20, shadowNormalBias: 0.008 }),
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
*/
/*{ "parent": "b3d-biped", "order": 80 }*/

import * as BABYLON from '@babylonjs/core'
import type { HumanPack } from './human-pack.js'
import { lipAlbedo, skinAlbedo } from './skin-tone.js'
import { skinShading, type SkinShadingPlugin } from './skin-shading.js'
import type { HumanSkin } from './human-rig.js'

export interface HumanBody {
  /** Move, turn and scale the body by this. */
  root: BABYLON.TransformNode
  mesh: BABYLON.Mesh
  /** Reshape the body from new positions (xyz per vertex, the pack's frame). */
  update(positions: Float32Array): void
  dispose(): void
}

export function humanBody(
  scene: BABYLON.Scene,
  pack: HumanPack,
  name = 'human'
): HumanBody {
  const root = new BABYLON.TransformNode(name, scene)
  // The file's mirror, as glTF's `__root__` carries it.
  const mirror = new BABYLON.TransformNode(`${name}-frame`, scene)
  mirror.rotationQuaternion = new BABYLON.Quaternion(0, 1, 0, 0)
  mirror.scaling = new BABYLON.Vector3(1, 1, -1)
  mirror.parent = root

  const mesh = new BABYLON.Mesh(`${name}-body`, scene)
  const indices = Array.from(pack.triangles)
  const normals = new Float32Array(pack.positions.length)
  const data = new BABYLON.VertexData()
  data.positions = new Float32Array(pack.positions)
  data.indices = indices
  data.normals = normals
  data.applyToMesh(mesh, true)
  // As the glTF loader does for its mirrored root: the mirror turns the
  // file's counter-clockwise faces clockwise, which is Babylon's front.
  mesh.sideOrientation = BABYLON.Material.ClockWiseSideOrientation
  mesh.parent = mirror
  const material = new BABYLON.StandardMaterial(`${name}-grey`, scene)
  material.diffuseColor = new BABYLON.Color3(0.62, 0.62, 0.64)
  material.specularColor = new BABYLON.Color3(0.08, 0.08, 0.08)
  mesh.material = material

  // Feet on the floor: the pack is centred near its middle.
  const used = new Uint8Array(pack.manifest.vertexCount)
  for (const i of pack.triangles) used[i] = 1

  function update(positions: Float32Array): void {
    let foot = Infinity
    for (let i = 0; i < used.length; i++) {
      if (used[i] && positions[i * 3 + 1] < foot) foot = positions[i * 3 + 1]
    }
    mirror.position.y = -foot
    // Counter-clockwise, outward: the file's handedness, not Babylon's.
    BABYLON.VertexData.ComputeNormals(positions, indices, normals, {
      useRightHandedSystem: true,
    })
    mesh.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions)
    mesh.updateVerticesData(BABYLON.VertexBuffer.NormalKind, normals)
    mesh.refreshBoundingInfo()
  }
  update(pack.positions)

  return {
    root,
    mesh,
    update,
    dispose() {
      material.dispose()
      mesh.dispose()
      mirror.dispose()
      root.dispose()
    },
  }
}

export interface SkinMaterial extends BABYLON.PBRMaterial {
  /** Re-colour: tone 0 (very fair) to 1 (very dark), redness 0.5 neutral. */
  setSkin(tone: number, redness?: number): void
  /** Its [skin-shading](/skin-shading/) (scatter, rim, back-light), unless turned off. */
  shading: SkinShadingPlugin | null
}

/**
 * A skin material from [skin-tone](/skin-tone/)'s dials: dielectric, fairly
 * rough, the albedo the tone gives. One flat colour for now: lips, nails and
 * a texture's detail need the mesh's UVs, which the pack does not carry yet.
 */
export function skinMaterial(
  scene: BABYLON.Scene,
  options: {
    tone?: number
    redness?: number
    name?: string
    /** `false` for plain PBR, without skin-shading's scatter, rim and back-light. */
    shading?: boolean
  } = {}
): SkinMaterial {
  const m = new BABYLON.PBRMaterial(
    options.name ?? 'skin',
    scene
  ) as SkinMaterial
  m.metallic = 0
  // A little gloss: skin's oil gives it a soft sheen, not a matte finish.
  m.roughness = 0.42
  m.setSkin = (tone, redness = 0.5) => {
    const c = skinAlbedo(tone, redness)
    // PBR's albedo is linear, as glTF's base colour is.
    m.albedoColor = new BABYLON.Color3(c.r, c.g, c.b)
  }
  m.setSkin(options.tone ?? 0.3, options.redness ?? 0.5)
  m.shading = options.shading === false ? null : skinShading(m)
  return m
}

/**
 * Per-vertex colours (RGBA, the skin's vertices) that turn a skin material's
 * colour into the lips' where `lips` (a pack region, every vertex) says so.
 * They multiply the material's albedo, so they are the ratio lip / skin.
 * Their alpha carries `thin` (per skin vertex, from `skinThinness`), which
 * skin-shading's back-light reads; without it, alpha is 0 (nothing glows).
 */
export function lipTint(
  skin: HumanSkin,
  lips: Float32Array,
  tone: number,
  redness = 0.5,
  into?: Float32Array,
  thin?: ArrayLike<number>
): Float32Array {
  const s = skinAlbedo(tone, redness)
  const l = lipAlbedo(tone, redness)
  const ratio = [l.r / s.r, l.g / s.g, l.b / s.b]
  const out = into ?? new Float32Array(skin.vertices.length * 4)
  skin.vertices.forEach((v, i) => {
    // The mask is how far the lip targets move a vertex, so the lips' own
    // edges are faint in it: anything past half is all lip.
    const m = Math.min(1, Math.max(0, (lips[v] - 0.05) / 0.45))
    const t = m * m * (3 - 2 * m)
    out[i * 4] = 1 + (ratio[0] - 1) * t
    out[i * 4 + 1] = 1 + (ratio[1] - 1) * t
    out[i * 4 + 2] = 1 + (ratio[2] - 1) * t
    out[i * 4 + 3] = thin ? thin[i] : 0
  })
  return out
}
