/*#
# character builder

**Make a person, and watch them walk.** The first steps of the character
creator (CHARACTER-DESIGN.md): MakeHuman's CC0 body
([human-pack](/human-pack/)), reshaped by sliders for gender, age, muscle,
weight, height and ancestry ([human-morph](/human-morph/)), with UAL's
skeleton placed from its own joint cubes ([human-rig](/human-rig/)) so it
plays UAL's clips at any shape.

## Demo

```js
import { b3d, b3dSun, b3dLight, slider3d, select3d, toggle3d, label3d, text3d, assetUrl, loadHumanPack, macroWeights, morphHuman, DEFAULT_HUMAN_BODY, humanSkin, skinMaterial, lipTint, humanFace, eyeGaze, eyeTexture, eyeMaterial, lashMaterial, loadHairLibrary, headScalp, hairMaterial, humanHair, skinThinness, vertexNormals, nearestWeights, coveredBy, skinAlbedo, stubbleTint, humanProxy, proxyMaterial, coverBody, fitProxy, drawnPositions, underCover, inflate, hairShading, HAIR_COLOURS, colorPicker3d, clothShading, clothRecipe, materialPicker3d, studioEnvironment, irisColor, faceDeltas, humanExpressions, blinker, lidsFollow, lipSync, babble, proxyDelta, readSkeleton, retargetClip, button3d, ui, bindGarment, writeGarmentGlb, writeGarmentObj, readGarment, garmentRigidity, smoothUnder, loadRigTriangles, bodyFromMarkers, applyRigRecipe, writeCharacter, readCharacter, humanBodyMaker, buildBody, mountTailorTool, chooseFile } from 'tosijs-3d'
import { tosi } from 'tosijs'
import { mountRigTool } from 'tosijs-3d/rig-tool'

// Everything the panel sets, as it starts: what a saved character is read against.
const START = { ...DEFAULT_HUMAN_BODY, gender: 1, clip: 'Walk_Loop', tone: 0.3, redness: 0.5, iris: 0.2, irisColour: '#5a3519', hair: 'short02', beard: 'none', moustache: 'none', brows: 'eyebrow001', hairBase: HAIR_COLOURS.brown.base, hairHighlight: HAIR_COLOURS.brown.highlight, hairUp: 0, hairForward: 0, hairSize: 1, outfit: 'male_casualsuit02', bodysuit: 'none', armour: 'none', top: 'none', bottom: 'none', shoes: 'shoes01', hat: 'none', glasses: 'none', gloves: 'none', editing: 'outfit', look: 'as made', clothLook: clothRecipe({ fabric: 'cotton', colour: '#7a2e2e', recolour: 0 }), paused: false, stubble: 0, blink: true, talk: false, mic: false, smile: 0, browsUp: 0, frown: 0, tailorThickness: 0.005, tailorSkirt: false, tailorLook: clothRecipe({ fabric: 'cotton', colour: '#3b5b8a', recolour: 1 }), tailorAlone: false, tailorName: '', tailorSlot: 'top', exportBody: true, rigs: {}, source: 'MakeHuman', characterName: '', characterPick: '' }
const { walker } = tosi({ walker: structuredClone(START) })
// What a character file keeps: not the editor's view of one slot (that is in
// cloth), the microphone (it would ask on load), or the save controls.
const KEPT = Object.keys(START).filter((k) => !['editing', 'look', 'clothLook', 'mic', 'characterName', 'characterPick'].includes(k))
// Saving and loading characters, wired when the page is up.
const character = { save: () => {}, load: () => {}, forget: () => {}, exportJson: () => {}, importJson: () => {}, changed: () => {}, saved: [], note: '' }
const characterRows = () => [
  label3d({ text: 'Character', collapsible: true }),
  ui.inputField({ value: walker.characterName.value, placeholder: 'name the character', handleChange: (v) => { walker.characterName.value = v } }),
  button3d({ label: 'save', handleClick: () => character.save() }),
  ...(character.saved.length
    ? [
        select3d({ label: 'saved', value: walker.characterPick, options: character.saved }),
        button3d({ label: 'load', handleClick: () => character.load() }),
        button3d({ label: 'forget', handleClick: () => character.forget() }),
      ]
    : []),
  button3d({ label: 'export JSON', handleClick: () => character.exportJson() }),
  button3d({ label: 'import JSON…', handleClick: () => character.importJson() }),
  ...(character.note ? [text3d({ text: character.note })] : []),
]
let mat = null
let paint = () => {}
let eyes = null
let dress = () => {}
// The pack's proxies, once it has loaded (the panel lists an outfit's looks).
let packProxies = {}
// How far a hat is pushed out from the skull, over the hair (metres).
const HAT_LIFT = 0.012
// Filled when the hair library loads.
const styles = { hair: ['none'], beard: ['none'], moustache: ['none'], brows: ['none'] }
// What can be worn, one of each at a time; the pack says which slot each garment fills.
// A bodysuit is a base layer and armour goes over anything; an outfit replaces a top and bottom.
const SLOTS = ['outfit', 'bodysuit', 'armour', 'top', 'bottom', 'shoes', 'gloves', 'hat', 'mask', 'glasses']
for (const slot of SLOTS) styles[slot] = ['none']
// Each slot's colourway (look) and material, kept while another is being edited.
const cloth = Object.fromEntries(SLOTS.map((s) => [s, { look: 'as made', material: clothRecipe({ fabric: s === 'shoes' ? 'leather' : 'cotton', colour: '#7a2e2e', recolour: 0 }) }]))
// A saved look: a material recipe, or the fabric, colour and recolour saved before recipes.
const lookRecipe = (look) => look?.material ?? clothRecipe(look ?? {})
const clips = ['Idle_Loop', 'Walk_Loop', 'Jog_Fwd_Loop', 'Sprint_Loop', 'Dance_Loop', 'Crouch_Fwd_Loop']
let rebuild = () => {}
// Where the body comes from: MakeHuman's, which the sliders shape, or a mesh
// of anyone's, whose own skeleton (if it has one) is ignored: UAL's is fitted
// to it from its outline and the skin bound by bone heat (auto-rig).
const SOURCES = {
  'MakeHuman': null,
  'Blender: female, realistic': { url: assetUrl('blender/human-base-meshes/body-female-realistic.glb') },
  'Blender: male, realistic': { url: assetUrl('blender/human-base-meshes/body-male-realistic.glb') },
  'Quaternius: superhero, male': { url: assetUrl('quaternius/libraries/characters-superhero-male.glb'), pick: 'Superhero_Male_FullBody' },
  'Quaternius: superhero, female': { url: assetUrl('quaternius/libraries/characters-superhero-female.glb'), pick: 'Superhero_Female_FullBody' },
}
// A mesh opened from a file (a choice in the list once opened).
let openBody = () => {}
// The rig tool, mounted on the body while it is being rigged.
let rigging = null
let openRig = () => {}
// What the imported body is doing, or why it failed.
let sourceNote = ''
const madeHuman = () => walker.source.value === 'MakeHuman'
// A garment of your own, cut from the body along outlines you draw (the
// character's left; the right is its mirror). A rectangle from the waist to
// the ankles makes trousers.
let tailorShapes = []
// The body the tailor cuts from (the rigged body shown), and the tool, open.
let currentBody = null
let tailoring = null
let openTailor = () => {}
// Why the last import or save failed, shown under the buttons.
let importError = ''
let exportGarment = () => {}
let importGarment = () => {}
// Garments you named and saved (kept in this browser), worn from their slot.
const custom = new Map()
let forgetGarment = () => {}
let editGarment = () => {}
// One picker per garment: the fabrics as presets, plus 'as made', which
// leaves a garment's own surface (a file's roughness map) alone. A preset
// keeps the colour and recolour unless it brings its own (gold, copper).
const clothPicker = (label, value) => materialPicker3d({ label, value, types: ['cloth'], collections: ['fabrics'], presets: [{ name: 'as made', recipe: { type: 'cloth', inputs: {} } }], keep: ['albedo', 'recolour'] })

const slider = (label, key) =>
  slider3d({ label, value: walker[key], min: 0, max: 1, step: 0.01 })

preview.append(
  b3d(
    {
      clearColor: '#2a3340',
      panelTitle: 'Character Builder',
      scenePanel: () => madeHuman() ? [
        ...characterRows(),
        label3d({ text: 'Body', collapsible: true, open: true }),
        select3d({ label: 'source', value: walker.source, options: Object.keys(SOURCES), stayOpen: true }),
        button3d({ label: 'open a mesh…', handleClick: () => openBody() }),
        slider('gender', 'gender'),
        slider('age', 'age'),
        slider('muscle', 'muscle'),
        slider('weight', 'weight'),
        slider('waist', 'waist'),
        slider('height', 'height'),
        slider('chest depth', 'chestDepth'),
        slider('pecs', 'pecs'),
        slider('bust', 'bustSize'),
        slider('firmness', 'bustFirmness'),
        label3d({ text: 'Motion', collapsible: true }),
        select3d({ label: 'clip', value: walker.clip, options: clips, stayOpen: true }),
        toggle3d({ label: 'pause', value: walker.paused }),
        label3d({ text: 'Skin', collapsible: true }),
        slider3d({ label: 'tone', value: walker.tone, min: 0, max: 1, step: 0.01 }),
        slider3d({ label: 'redness', value: walker.redness, min: 0, max: 1, step: 0.01 }),
        label3d({ text: 'Eyes', collapsible: true }),
        colorPicker3d({ label: 'eye colour', value: walker.irisColour, alpha: false, defaultPresets: 'off', presets: [['dark brown', 0], ['brown', 0.15], ['amber', 0.3], ['hazel', 0.45], ['green', 0.6], ['blue-green', 0.72], ['blue', 0.85], ['grey', 1]].map(([name, t]) => { const c = irisColor(t); const h = (x) => Math.round(x * 255).toString(16).padStart(2, '0'); return { name, value: '#' + h(c.r) + h(c.g) + h(c.b) } }) }),
        label3d({ text: 'Face', collapsible: true }),
        toggle3d({ label: 'blink', value: walker.blink }),
        toggle3d({ label: 'talk', value: walker.talk }),
        toggle3d({ label: 'mic (lip sync)', value: walker.mic }),
        slider3d({ label: 'smile', value: walker.smile, min: 0, max: 1, step: 0.01 }),
        slider3d({ label: 'brows up', value: walker.browsUp, min: 0, max: 1, step: 0.01 }),
        slider3d({ label: 'frown', value: walker.frown, min: 0, max: 1, step: 0.01 }),
        label3d({ text: 'Hair', collapsible: true }),
        select3d({ label: 'hair', value: walker.hair, options: styles.hair, stayOpen: true }),
        select3d({ label: 'beard', value: walker.beard, options: styles.beard, stayOpen: true }),
        select3d({ label: 'moustache', value: walker.moustache, options: styles.moustache, stayOpen: true }),
        slider3d({ label: 'stubble', value: walker.stubble, min: 0, max: 1, step: 0.01 }),
        select3d({ label: 'brows', value: walker.brows, options: styles.brows, stayOpen: true }),
        // A base and a highlight, each a swatch that opens a picker with presets;
        // a base preset brings its usual highlight with it.
        colorPicker3d({ label: 'base', value: walker.hairBase, alpha: false, defaultPresets: 'off', presets: Object.entries(HAIR_COLOURS).map(([name, c]) => ({ name, value: c.base })) }),
        colorPicker3d({ label: 'highlights', value: walker.hairHighlight, alpha: false, defaultPresets: 'off', presets: Object.entries(HAIR_COLOURS).map(([name, c]) => ({ name, value: c.highlight })) }),
        // A hand adjustment, metres and a scale, after the fit.
        slider3d({ label: 'up', value: walker.hairUp, min: -0.02, max: 0.02, step: 0.001 }),
        slider3d({ label: 'forward', value: walker.hairForward, min: -0.02, max: 0.02, step: 0.001 }),
        slider3d({ label: 'size', value: walker.hairSize, min: 0.9, max: 1.1, step: 0.005 }),
        label3d({ text: 'Clothes', collapsible: true }),
        ...SLOTS.map((slot) => select3d({ label: slot, value: walker[slot], options: styles[slot], stayOpen: true })),
        // One editor for whichever worn thing is chosen: its colourway, and its
        // material (a fabric, a colour, and a recolour over its texture: 0
        // keeps the texture's own colours).
        select3d({ label: 'edit', value: walker.editing, options: SLOTS }),
        // Its colourways, where it has any (only some of MakeHuman's suits do).
        ...(Object.keys(packProxies[walker[walker.editing.value].value]?.material?.looks ?? {}).length
          ? [select3d({ label: 'look', value: walker.look, options: ['as made', ...Object.keys(packProxies[walker[walker.editing.value].value].material.looks)] })]
          : []),
        clothPicker('material', walker.clothLook),
        label3d({ text: 'Tailor', collapsible: true }),
        ...(currentBody
          ? [
              // The tailor is a tool of its own (scissors, on the bar): it
              // hands back the garment, which is kept as a choice in its slot.
              ...(tailoring
                ? [text3d({ text: 'Tailoring: in the Tailor panel (on the bar). Done there keeps the garment as a choice in its slot.' })]
                : [button3d({ label: tailorShapes.length ? 'tailor… (carry on)' : 'tailor…', handleClick: () => openTailor() })]),
              // A garment of your own, in its slot: open it again, forget it,
              // or take it to Blender (with the body it was made on) and back.
              select3d({ label: 'garment in', value: walker.tailorSlot, options: SLOTS }),
              ...(custom.has(walker[walker.tailorSlot.value].value)
                ? [
                    ...(custom.get(walker[walker.tailorSlot.value].value).cut && !tailoring ? [button3d({ label: `edit ${walker[walker.tailorSlot.value].value}`, handleClick: () => editGarment() })] : []),
                    button3d({ label: `forget ${walker[walker.tailorSlot.value].value}`, handleClick: () => forgetGarment() }),
                    toggle3d({ label: 'include the body (a helper)', value: walker.exportBody }),
                    button3d({ label: 'export glTF', handleClick: () => exportGarment('glb') }),
                    button3d({ label: 'export OBJ', handleClick: () => exportGarment('obj') }),
                  ]
                : []),
              // The body alone, to model a garment from nothing beside it.
              button3d({ label: 'export the body alone', handleClick: () => exportGarment('glb', true) }),
              button3d({ label: 'import a garment…', handleClick: () => importGarment() }),
              ...(importError ? [text3d({ text: importError })] : []),
            ]
          : [label3d({ text: 'loading the body…' })]),
        label3d({ text: 'Ancestry', collapsible: true }),
        slider('african', 'african'),
        slider('asian', 'asian'),
        slider('caucasian', 'caucasian'),
      ] : [
        // A body of anyone's: what MakeHuman's carries (shape, face, hair,
        // clothes) is not there; the clips and the skin are.
        ...characterRows(),
        label3d({ text: 'Body', collapsible: true, open: true }),
        select3d({ label: 'source', value: walker.source, options: Object.keys(SOURCES), stayOpen: true }),
        button3d({ label: 'open a mesh…', handleClick: () => openBody() }),
        ...(sourceNote ? [text3d({ text: sourceNote })] : []),
        // Its rig is the rig tool's: markers, tail, springs, arm space. The
        // recipe is kept with the character.
        ...(rigging
          ? [
              text3d({ text: 'Rigging: in the Rig panel (on the bar). Done there brings the body back.' }),
            ]
          : [button3d({ label: 'rig…', handleClick: () => openRig() })]),
        label3d({ text: 'Motion', collapsible: true, open: true }),
        select3d({ label: 'clip', value: walker.clip, options: clips, stayOpen: true }),
        toggle3d({ label: 'pause', value: walker.paused }),
        label3d({ text: 'Skin', collapsible: true }),
        slider3d({ label: 'tone', value: walker.tone, min: 0, max: 1, step: 0.01 }),
        slider3d({ label: 'redness', value: walker.redness, min: 0, max: 1, step: 0.01 }),
      ],
      async sceneCreated(el, BABYLON) {
        const scene = el.scene
        el.setLoading('loading the animations…')
        // Something for gloss and metal to reflect.
        studioEnvironment(scene)
        const cam = new BABYLON.ArcRotateCamera('c', Math.PI / 2 - 0.5, 1.35, 4, new BABYLON.Vector3(0, 0.9, 0), scene)
        cam.minZ = 0.05
        // Close enough for a face, far enough for the whole floor.
        cam.lowerRadiusLimit = 0.3
        cam.upperRadiusLimit = 10
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
        el.setLoading('loading the body…')
        ual.addAllToScene()
        for (const g of ual.animationGroups) g.stop()
        const ualRoot = ual.meshes.find((m) => m.name === '__root__')
        const source = readSkeleton(ual.skeletons[0], ualRoot)
        ualRoot.setEnabled(false)

        const pack = await loadHumanPack(assetUrl('makehuman/hm08/hm08.json', 17)).catch((e) => {
          el.setLoading(`could not load the body: ${e.message}`, { spin: false })
          throw e
        })
        // Quaternius' hairstyles, made for its own head, fitted to each body.
        const hairLib = await loadHairLibrary(scene, assetUrl('quaternius/libraries/hairstyles.glb', 2))
        const adult = (n) => !n.endsWith('_Teen')
        const facial = (n) => /Beard|Moustache|MuttonChops/.test(n)
        styles.hair.push(...hairLib.names('hair').filter((n) => adult(n) && !facial(n)))
        // Beards and moustaches are MakeHuman's, bound to this face. Quaternius'
        // are drawn for its own stylised mouth, and warped onto ours their ends
        // droop and tilt; the library still places them (fitFor 'face').
        styles.brows.push(...hairLib.names('eyebrows').filter(adult))
        // MakeHuman's own clothes, hair and brows, bound to this body (proxy-fit).
        const proxies = pack.manifest.proxies ?? {}
        packProxies = proxies
        const kinds = (cat, test) => Object.keys(proxies).filter((n) => proxies[n].category === cat && test(n))
        for (const slot of SLOTS) styles[slot].push(...Object.keys(proxies).filter((n) => proxies[n].slot === slot))
        // MakeHuman's hair and brows first: drawn for this head and bound to it.
        // Quaternius' follow, for the looks MakeHuman lacks.
        styles.hair.splice(1, 0, ...kinds('hair', () => true))
        styles.brows.splice(1, 0, ...kinds('eyebrows', () => true))
        // MakeHuman's beards come without moustaches: a moustache is its own choice.
        styles.beard.push(...kinds('beard', (n) => !/moustache/i.test(n)))
        styles.moustache.push(...kinds('beard', (n) => /moustache/i.test(n)))
        const proxyMaterials = new Map()
        // Each clothes material's shading (fabric and recolour), and which slot wears which.
        const clothes = new Map()
        const slotMaterial = {}
        const refabric = () => {
          for (const [slot, m] of Object.entries(slotMaterial)) clothes.get(m)?.set({ recipe: cloth[slot].material })
        }
        // The body's slider values, which rebuild the shape a garment was made on.
        const bodyValues = () => Object.fromEntries(Object.keys(DEFAULT_HUMAN_BODY).map((k) => [k, Number(walker[k].value)]))
        const save = (data, name, type) => {
          const a = document.createElement('a')
          a.href = URL.createObjectURL(new Blob([data], { type }))
          a.download = name
          a.click()
          setTimeout(() => URL.revokeObjectURL(a.href), 1000)
        }
        const baseMeta = () => ({ format: 'tosijs-garment', version: 1, base: pack.manifest.base, pack: pack.manifest.version, body: bodyValues(), name: 'tailored', slot: 'top' })
        // The garment to take to an editor: the one being tailored, else the
        // one of your own in the chosen slot. A GLB's bytes or an OBJ's text.
        const garmentFile = (format, bodyAlone = false) => {
          let garment = null
          let meta = baseMeta()
          if (!bodyAlone) {
            const own = custom.get(walker[walker.tailorSlot.value].value)
            const open = tailoring?.garment()
            if (open) garment = open
            else if (own) ({ garment, meta } = readGarment(own.bytes))
            else return null
          }
          // The body it was made on, as a helper to model against (left out on import).
          const body = bodyAlone || walker.exportBody.value ? { positions: current, triangles: pack.triangles } : null
          return format === 'obj' ? writeGarmentObj({ garment, body, meta }) : writeGarmentGlb({ garment, body, meta })
        }
        // A file's material as a proxy's: its images as object URLs.
        const imageUrl = (img) => (img ? URL.createObjectURL(new Blob([img.bytes], { type: img.mimeType })) : undefined)
        const fileLook = (m) =>
          m
            ? { diffuse: imageUrl(m.baseColorTexture), normal: imageUrl(m.normalTexture), metallicRoughness: imageUrl(m.metallicRoughnessTexture), roughness: m.roughness, metallic: m.metallic, baseColor: m.baseColor, normalScale: m.normalScale, alpha: m.alphaMode !== 'OPAQUE', blend: m.alphaMode === 'BLEND', alphaCutoff: m.alphaMode === 'MASK' ? m.alphaCutoff : undefined, twoSided: m.doubleSided }
            : { alpha: false, twoSided: false }
        // A garment from a file, bound to the body it was made on.
        const asProxy = async (content, name, slot) => {
          const { garment, meta, material } = content
          const on = meta?.body ? await morphHuman(pack, macroWeights({ ...DEFAULT_HUMAN_BODY, ...meta.body }, (n) => pack.has(n))) : current
          const binding = bindGarment(on, pack.triangles, garment.positions, garmentRigidity(garment))
          return { ...binding, triangles: garment.triangles, uvs: garment.uvs ?? new Float32Array(binding.rows * 2), delete: null, name, category: 'clothes', slot, material: { ...fileLook(material), ...(meta?.cut?.skirt ? { twoSided: true } : {}) } }
        }
        // The saved garments, in IndexedDB: per browser, nothing shared yet.
        const garmentStore = async (mode, fn) => {
          const db = await new Promise((ok, no) => {
            const r = indexedDB.open('tosijs-garments', 1)
            r.onupgradeneeded = () => r.result.createObjectStore('garments')
            r.onsuccess = () => ok(r.result)
            r.onerror = () => no(r.error)
          })
          return new Promise((ok, no) => {
            const t = db.transaction('garments', mode)
            const req = fn(t.objectStore('garments'))
            t.oncomplete = () => ok(req?.result)
            t.onerror = () => no(t.error)
          })
        }
        // Wear a saved garment's file as a choice in its slot.
        const addCustom = async (bytes) => {
          const content = readGarment(bytes)
          const { name } = content.meta
          // A slot this page has, or a top.
          const slot = SLOTS.includes(content.meta.slot) ? content.meta.slot : 'top'
          proxyMaterials.delete(`${name}:`)
          const proxy = await asProxy(content, name, slot)
          custom.set(name, { proxy, cut: content.meta.cut, look: content.meta.look, bytes: new Uint8Array(bytes) })
          if (!styles[slot].includes(name)) styles[slot].push(name)
          return content.meta
        }
        const say = (message) => { importError = message; el.refreshScenePanel?.() }
        // A name of its own: not MakeHuman's, and not another garment's
        // unless it is the one being replaced.
        const freeName = (wanted, replacing) => {
          const base = (wanted || 'garment').trim()
          const taken = (n) => n === 'none' || proxies[n] || (custom.has(n) && n !== replacing)
          let n = base
          for (let i = 2; taken(n); i++) n = `${base} ${i}`
          return n
        }
        // A garment file kept in this browser and worn from its slot.
        const keep = async (bytes, slot) => {
          await garmentStore('readwrite', (st) => st.put(bytes, readGarment(bytes).meta.name))
          const meta = await addCustom(bytes)
          importError = ''
          walker[slot].value = meta.name
          dress()
          el.refreshScenePanel?.()
        }
        forgetGarment = async () => {
          const slot = walker.tailorSlot.value
          const name = walker[slot].value
          if (!custom.has(name)) return
          await garmentStore('readwrite', (s) => s.delete(name)).catch((e) => console.warn('tailor: could not forget', e))
          custom.delete(name)
          styles[slot] = styles[slot].filter((n) => n !== name)
          walker[slot].value = 'none'
          el.refreshScenePanel?.()
        }
        // THE TAILOR (tailor-tool): opened on the body shown, it hands back
        // the garment, kept as a choice in its slot. What it is making is kept
        // with the character as it goes (the outlines and the tailor settings),
        // so it carries on where it was. Editing a saved garment opens it on
        // its cut, off the body meanwhile; cancel puts it back on.
        openTailor = (editing = null) => {
          if (tailoring || !currentBody) return
          const wasWearing = editing ? { slot: editing.slot, name: editing.name } : null
          if (wasWearing) walker[wasWearing.slot].value = 'none'
          tailoring = mountTailorTool(el, {
            body: currentBody,
            built,
            cut: { shapes: tailorShapes, thickness: walker.tailorThickness.value, skirt: walker.tailorSkirt.value },
            look: plain(walker.tailorLook.value),
            name: walker.tailorName.value,
            slot: walker.tailorSlot.value,
            slots: SLOTS,
            hideOthers: walker.tailorAlone.value,
            handleHideOthers: (v) => { walker.tailorAlone.value = v },
            handleChange: ({ cut, look, name, slot }) => {
              tailorShapes = cut.shapes
              walker.tailorThickness.value = cut.thickness
              walker.tailorSkirt.value = cut.skirt
              walker.tailorLook.value = look
              walker.tailorName.value = name
              walker.tailorSlot.value = slot
              character.changed()
            },
            handleDone: async ({ garment, cut, look, name, slot }) => {
              tailoring = null
              const kept = freeName(name, wasWearing?.name)
              const bytes = writeGarmentGlb({ garment, meta: { ...baseMeta(), name: kept, slot, look: { material: look }, cut } })
              // Done with: the next garment starts from nothing.
              tailorShapes = []
              walker.tailorName.value = ''
              try {
                await keep(bytes, slot)
              } catch (e) {
                console.warn('tailor: could not save', e)
                say(`could not save: ${e?.message ?? e}`)
              }
            },
            handleCancel: () => {
              tailoring = null
              if (wasWearing) walker[wasWearing.slot].value = wasWearing.name
              el.refreshScenePanel?.()
            },
          })
          el.refreshScenePanel?.()
        }
        // Back into the tailor: its outline, to change and save again.
        editGarment = () => {
          const slot = walker.tailorSlot.value
          const name = walker[slot].value
          const saved = custom.get(name)
          if (!saved?.cut || tailoring) return
          tailorShapes = saved.cut.shapes
          walker.tailorThickness.value = saved.cut.thickness
          walker.tailorSkirt.value = saved.cut.skirt === true
          walker.tailorName.value = name
          if (saved.look) walker.tailorLook.value = lookRecipe(saved.look)
          openTailor({ slot, name })
        }
        exportGarment = (format, bodyAlone = false) => {
          const data = garmentFile(format, bodyAlone)
          if (data == null) return say('choose a garment of your own to export')
          save(data, bodyAlone ? 'body.glb' : format === 'obj' ? 'garment.obj' : 'garment.glb', format === 'obj' ? 'text/plain' : 'model/gltf-binary')
        }
        // A garment from an editor: kept as a choice in its slot, named as
        // the file says (else after the file).
        const importFrom = async (data, fileName) => {
          const content = readGarment(data)
          // Bound to the body it was made on, where the file says what that
          // was; else to the body shown, which is then what it was made on.
          if (!content.meta) console.warn('tailor: no metadata in the file (export from Blender with custom properties); bound to the body shown')
          if (content.materialCount > 1) console.warn(`tailor: the garment uses ${content.materialCount} materials; only the first is drawn`)
          const meta = content.meta ?? baseMeta()
          const slot = SLOTS.includes(meta.slot) ? meta.slot : 'top'
          const wanted = meta.name && meta.name !== 'tailored' ? meta.name : fileName.replace(/\.[^.]*$/, '')
          const name = freeName(wanted, null)
          // A garment with its own maps keeps them: no fabric preset, no recolour.
          const look = content.material?.baseColorTexture || content.material?.metallicRoughnessTexture ? { material: { type: 'cloth', inputs: { recolour: 0 } } } : meta.look
          await keep(writeGarmentGlb({ garment: content.garment, material: content.material, meta: { ...meta, name, slot, ...(look ? { look } : {}) } }), slot)
        }
        importGarment = () => {
          chooseFile('.glb,.obj').then(async (file) => {
            if (!file) return
            try {
              await importFrom(file.name.endsWith('.obj') ? await file.text() : await file.arrayBuffer(), file.name)
            } catch (e) {
              console.warn('tailor: could not import', e)
              say(`${file.name}: ${String(e?.message ?? e).replace(/^garment-file: /, '')}`)
            }
          })
        }
        walker.tailorAlone.observe(() => dress())
        walker.tailorSlot.observe(() => el.refreshScenePanel?.())
        // What this browser has saved, once the body is up (see below).
        const loadSaved = async () => {
          try {
            const all = await garmentStore('readonly', (s) => s.getAll())
            for (const bytes of all ?? []) await addCustom(bytes).catch((e) => console.warn('tailor: a saved garment would not load', e))
            if (all?.length) el.refreshScenePanel?.()
          } catch (e) {
            console.warn('tailor: no saved garments (storage unavailable)', e)
          }
        }
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
        el.setLoading('binding the skin…')
        // Let the message paint before the binding takes the thread.
        await new Promise((r) => setTimeout(r, 50))
        const skin = humanSkin(pack)
        const [lips, nipples, eyePart, lashPart] = await Promise.all([pack.region('lips'), pack.region('nipples'), pack.part('eyes'), pack.part('eyelashes')])
        eyes = eyeTexture(scene, { iris: walker.iris.value })
        eyes.setIrisColour(walker.irisColour.value)
        const faceMaterials = { eye: eyeMaterial(scene, eyes), lashes: lashMaterial(scene) }
        let face = null
        let scalp = null
        // For poking at from the console: what this page built.
        el.builder = { pack, hairLib, get scalp() { return scalp }, get built() { return built }, get positions() { return current }, get stubble() { return stubbleMask }, get tailorShapes() { return tailorShapes }, set tailorShapes(v) { tailorShapes = v }, get tailor() { return tailoring }, openTailor: () => openTailor(), get body() { return currentBody }, garmentFile: (f, alone) => garmentFile(f, alone), importFrom: (d, n) => importFrom(d, n), forget: () => forgetGarment(), edit: () => editGarment(), saved: custom, get message() { return importError } }
        let hairMeshes = []
        let dressing = 0
        dress = async () => {
          if (!built || !scalp) return
          const token = ++dressing
          // What it wears from the pack (bound), fetched before anything changes.
          const slots = [...[...SLOTS, 'hair', 'brows', 'beard', 'moustache'].map((k) => walker[k].value), 'teeth_base', 'tongue01'].filter((n) => proxies[n] || custom.has(n))
          let wearing = await Promise.all(slots.map((n) => custom.get(n)?.proxy ?? pack.proxy(n)))
          if (token !== dressing) return
          // Only what the tailor is making, to see it on its own.
          if (walker.tailorAlone.value) wearing = wearing.filter((p) => p.category !== 'clothes')
          for (const m of hairMeshes) m.dispose()
          hairMeshes = []
          const nudge = { y: walker.hairUp.value, z: walker.hairForward.value, scale: walker.hairSize.value }
          for (const key of ['hair', 'beard', 'moustache', 'brows']) {
            const parts = hairLib.piece(walker[key].value)
            if (!parts) continue
            // Brows and beards follow the face; hair follows the skull.
            const style = walker[key].value
            const on = hairLib.fitFor(style)
            hairMeshes.push(...humanHair(scene, built, built.rig, scalp, parts, tint, { name: key, on, head: hairLib.headFor(style), centreY: key === 'brows' ? scalp.brow : undefined, nudge: key === 'hair' ? nudge : undefined }))
          }
          for (const k of Object.keys(slotMaterial)) delete slotMaterial[k]
          for (const proxy of wearing) {
            const slot = SLOTS.find((k) => walker[k].value === proxy.name) ?? null
            const look = slot && cloth[slot].look !== 'as made' ? cloth[slot].look : undefined
            const key = `${proxy.name}:${look ?? ''}`
            if (!proxyMaterials.has(key)) {
              const m = proxyMaterial(scene, proxy, look)
              // MakeHuman's hair, brows and beards take the hair colours too;
              // clothes take a fabric and a recolour.
              if (['hair', 'eyebrows', 'beard'].includes(proxy.category)) shades.push(hairShading(m, { desaturate: true, base: walker.hairBase.value, highlight: walker.hairHighlight.value }))
              else if (proxy.category === 'clothes') clothes.set(m, clothShading(m))
              proxyMaterials.set(key, m)
            }
            const m = proxyMaterials.get(key)
            // The cache is by name: the tailored garment turns skirt (two-sided) on and off.
            m.backFaceCulling = !proxy.material?.twoSided
            m.twoSidedLighting = proxy.material?.twoSided === true
            if (slot) slotMaterial[slot] = m
            // A hat sits a little out from the head, over the hair.
            const hatFit = slot === 'hat' ? { inflate: { centre: scalp.centre, by: HAT_LIFT } } : slot === 'armour' ? { lift: 0.005 } : {}
            const mesh = humanProxy(scene, built, proxy, clothBody, allWeights, m, hatFit)
            mesh.metadata = { category: proxy.category }
            hairMeshes.push(mesh)
          }
          // A hat hides the hair under its brim, or the hair pokes through it.
          const hat = wearing.find((p) => p.name === walker.hat.value)
          if (hat) {
            const crown = inflate(drawnPositions(hat, fitProxy(hat, current)), scalp.centre, HAT_LIFT)
            const at = built.rig.at('Head')
            for (const mesh of hairMeshes) {
              const hair = mesh.name.startsWith('hair-') || mesh.metadata?.category === 'hair'
              if (!hair) continue
              // Quaternius' hair hangs on the head, in its frame less the head joint.
              const p = Float32Array.from(mesh.getVerticesData('position'))
              if (mesh.name.startsWith('hair-')) {
                for (let i = 0; i < p.length; i += 3) { p[i] += at.x; p[i + 1] += at.y; p[i + 2] += at.z }
              }
              const tucked = Float32Array.from(p)
              mesh.setIndices(Array.from(underCover(crown, p, mesh.getIndices(), 24, tucked)))
              if (mesh.name.startsWith('hair-')) {
                for (let i = 0; i < tucked.length; i += 3) { tucked[i] -= at.x; tucked[i + 1] -= at.y; tucked[i + 2] -= at.z }
              }
              mesh.setVerticesData('position', tucked, true)
            }
          }
          refabric()
          // Stand on the soles: shoes reach below the bare foot by their sole.
          const shoe = wearing.find((p) => p.name === walker.shoes.value)
          sole = 0
          if (shoe) {
            const fitted = fitProxy(shoe, current)
            let low = Infinity
            for (let i = 1; i < fitted.length; i += 3) low = Math.min(low, fitted[i])
            sole = Math.max(0, built.rig.at('root').y - low)
          }
          // Skin under clothes is hidden, so it cannot show through.
          // The garments as fitted, for the skin they cover but do not list.
          const drawn = new Map(wearing.filter((p) => p.category === 'clothes').map((p) => [p.name, drawnPositions(p, fitProxy(p, clothBody))]))
          coverBody(built, skin.triangles, skin.vertices, wearing, { drawn })
          // Clothes tuck the skin they cover, so the feet are measured again.
          if (playing) clipLow = measureClip(playing)
          ground()
          // Everything that moves with the face, after the tuck (its rest).
          if (el.builder.expressions) {
            const expr = el.builder.expressions
            expr.attach(built.mesh, (d) => skin.positions(d))
            for (const m of face?.meshes ?? []) {
              const pv = m.metadata?.packVertices
              // The eyeballs turn; they never deform.
              if (!pv || m.name.startsWith('eye_')) continue
              expr.attach(m, (d) => {
                const out = new Float32Array(pv.length * 3)
                for (let i = 0; i < pv.length; i++) { out[i * 3] = d[pv[i] * 3]; out[i * 3 + 1] = d[pv[i] * 3 + 1]; out[i * 3 + 2] = d[pv[i] * 3 + 2] }
                return out
              })
            }
            for (const proxy of wearing) {
              const mesh = hairMeshes.find((m) => m.name === `proxy-${proxy.name}`)
              if (mesh) expr.attach(mesh, (d) => proxyDelta(proxy, d))
            }
          }
          el.register({ meshes: hairMeshes })
        }
        for (const key of ['hair', 'beard', 'moustache', 'brows', 'hairUp', 'hairForward', 'hairSize', ...SLOTS]) walker[key].observe(() => dress())
        // An outfit replaces a top and bottom, and either replaces an outfit.
        walker.outfit.observe(() => { if (walker.outfit.value !== 'none') { walker.top.value = 'none'; walker.bottom.value = 'none' } })
        for (const k of ['top', 'bottom']) walker[k].observe(() => { if (walker[k].value !== 'none') walker.outfit.value = 'none' })
        // The editor shows the chosen slot's settings and writes back to them.
        let loading = false
        const load = () => {
          loading = true
          const c = cloth[walker.editing.value]
          walker.look.value = c.look
          walker.clothLook.value = c.material
          loading = false
          el.refreshScenePanel?.()
        }
        walker.editing.observe(load)
        // Wearing something new: edit it, from its own colourway.
        for (const slot of SLOTS) walker[slot].observe(() => {
          if (walker[slot].value === 'none') return
          cloth[slot].look = 'as made'
          // A saved garment comes as it was saved.
          const saved = custom.get(walker[slot].value)?.look
          if (saved) cloth[slot].material = lookRecipe(saved)
          if (walker.editing.value === slot) load()
          else walker.editing.value = slot
        })
        walker.look.observe(() => { if (loading) return; cloth[walker.editing.value].look = walker.look.value; dress() })
        walker.clothLook.observe(() => {
          if (loading) return
          cloth[walker.editing.value].material = walker.clothLook.value
          refabric()
        })
        // Colours repaint whoever sets them: a picker, a preset, or code.
        const recolour = () => { for (const sh of shades) sh.setColours(walker.hairBase.value, walker.hairHighlight.value) }
        walker.hairBase.observe(recolour)
        walker.hairHighlight.observe(recolour)
        // Picking a base preset brings its usual highlight.
        walker.hairBase.observe(() => {
          const pair = Object.values(HAIR_COLOURS).find((c) => c.base === walker.hairBase.value)
          if (pair && walker.hairHighlight.value !== pair.highlight) walker.hairHighlight.value = pair.highlight
        })
        for (const key of Object.keys(DEFAULT_HUMAN_BODY)) walker[key].observe(() => rebuild())
        walker.tone.observe(() => paint())
        walker.stubble.observe(() => { if (stubbleMask == null) measureStubble(); else paint() })
        walker.hairBase.observe(() => paint())
        walker.redness.observe(() => paint())
        walker.iris.observe(() => eyes.setIris(walker.iris.value))
        walker.irisColour.observe(() => eyes.setIrisColour(walker.irisColour.value))
        // The eyes find the camera.
        eyeGaze(scene, { get eyes() { return face?.eyes ?? [] }, get forward() { return face?.forward ?? [] } }, () => scene.activeCamera?.globalPosition ?? cam.position)
        // MakeHuman makes rigged bodies (rigged-body): each shape the
        // sliders give, on UAL's skeleton, with weights bound once on the
        // first (they depend only on the topology).
        const sliders = () => Object.fromEntries(Object.keys(DEFAULT_HUMAN_BODY).map((k) => [k, Number(walker[k].value)]))
        const maker = await humanBodyMaker(pack, sliders())
        const first = maker.first.full
        const weights = maker.weights
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
        // What clothes are fitted over: the body with its nipples smoothed,
        // because cloth bridges them (the skin keeps them).
        const smoothed = (p) => nipples ? smoothUnder(p, pack.triangles, nipples) : p
        let clothBody = smoothed(first)
        // (the saved garments load below, before the working figure that may wear them)

        // The face: MakeHuman's face pose units as morph targets, in layers.
        const expr = humanExpressions(scene, await faceDeltas(pack))
        el.builder.expressions = expr
        let stopBlink = null
        const blinking = () => {
          stopBlink?.()
          stopBlink = walker.blink.value ? blinker(scene, expr) : null
        }
        walker.blink.observe(blinking)
        blinking()
        lidsFollow(scene, expr, () => face)
        let stopTalk = null
        walker.talk.observe(() => {
          stopTalk?.()
          stopTalk = walker.talk.value ? babble(scene, expr) : null
        })
        let stopMic = null
        walker.mic.observe(async () => {
          stopMic?.()
          stopMic = null
          if (!walker.mic.value) return
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const ctx = new AudioContext()
            const analyser = ctx.createAnalyser()
            ctx.createMediaStreamSource(stream).connect(analyser)
            const stop = lipSync(scene, expr, analyser, { gain: 1.5 })
            stopMic = () => { stop(); stream.getTracks().forEach((t) => t.stop()); ctx.close() }
          } catch (e) {
            walker.mic.value = false
            console.warn('lip sync: no microphone', e)
          }
        })
        const mood = expr.layer('mood')
        const feel = () => {
          const s = walker.smile.value
          const b = walker.browsUp.value
          const f = walker.frown.value
          mood.setMany({ MouthLeftPullUp: s, MouthRightPullUp: s, LeftCheekUp: s * 0.6, RightCheekUp: s * 0.6, LeftOuterBrowUp: b, RightOuterBrowUp: b, LeftInnerBrowUp: b, RightInnerBrowUp: b, LeftBrowDown: f, RightBrowDown: f })
        }
        for (const k of ['smile', 'browsUp', 'frown']) walker[k].observe(feel)

        mat = skinMaterial(scene, { tone: walker.tone.value, redness: walker.redness.value })
        // The skin's colour, and the lips' as vertex colours over it.
        // Where a full beard grows, as a mask over the skin, for stubble: the
        // skin MakeHuman's full beard (fitted to this body) lies on.
        let stubbleMask = null
        const linearHex = (hex) => {
          const n = parseInt(hex.slice(1, 7), 16)
          const lin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
          return { r: lin(((n >> 16) & 255) / 255), g: lin(((n >> 8) & 255) / 255), b: lin((n & 255) / 255) }
        }
        const proxyNamed = (re) => Object.keys(pack.manifest.proxies ?? {}).find((n) => re.test(n))
        const beardFor = proxyNamed(/scruffy_beard/)
        const tacheFor = proxyNamed(/moustache/)
        const measureStubble = async () => {
          if (!beardFor || !current) return
          const body = skin.positions(current)
          const normals = vertexNormals(body, skin.triangles)
          const grownOn = async (name) => {
            const p = await pack.proxy(name)
            return coveredBy(body, normals, drawnPositions(p, fitProxy(p, current)), 0.02)
          }
          // Where a full beard grows, and a moustache: the full beard has no
          // moustache part, so the upper lip was bare.
          const beard = await grownOn(beardFor)
          const tache = tacheFor ? await grownOn(tacheFor) : null
          // The beard below the cheekbones: up to a little above the upper lip,
          // faded (the full beard climbs the cheeks, and stubble there read as a bruise).
          let lipTop = -Infinity
          for (let v = 0; v < lips.length; v++) if (lips[v] > 0.5) lipTop = Math.max(lipTop, current[v * 3 + 1])
          const cap = lipTop + 0.03
          const smooth = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t) }
          const n = body.length / 3
          const mask = new Float32Array(n)
          for (let i = 0; i < n; i++) {
            const b = beard[i] === Infinity ? 0 : smooth((cap - body[i * 3 + 1]) / 0.015)
            const t = tache && tache[i] !== Infinity ? 1 : 0
            // Not on the lips themselves.
            mask[i] = Math.max(b, t) * (1 - smooth((lips[skin.vertices[i]] - 0.05) / 0.45))
          }
          // Down the neck: the full beard stops at the jaw, but stubble grows on
          // the throat and the sides of the neck, fading over 5 cm below the
          // beard's edge. Front and sides only (the normal faces forward or out).
          const edge = []
          let low = Infinity
          for (let i = 0; i < n; i++) if (mask[i] > 0.5 && body[i * 3 + 1] < lipTop) { edge.push(i); low = Math.min(low, body[i * 3 + 1]) }
          const REACH = 0.05
          for (let i = 0; i < n; i++) {
            const y = body[i * 3 + 1]
            if (mask[i] > 0.5 || y > lipTop || y < low - REACH || normals[i * 3 + 2] < -0.2) continue
            let d = Infinity
            for (const j of edge) {
              if (body[j * 3 + 1] < y) continue
              const dx = body[j * 3] - body[i * 3]
              const dy = body[j * 3 + 1] - y
              const dz = body[j * 3 + 2] - body[i * 3 + 2]
              d = Math.min(d, dx * dx + dy * dy + dz * dz)
            }
            mask[i] = Math.max(mask[i], smooth(1 - Math.sqrt(d) / REACH))
          }
          stubbleMask = mask
          paint()
        }
        paint = () => {
          mat.setSkin(walker.tone.value, walker.redness.value)
          if (lips && built) {
            const colours = lipTint(skin, lips, walker.tone.value, walker.redness.value, undefined, thin)
            if (stubbleMask) stubbleTint(colours, stubbleMask, walker.stubble.value, skinAlbedo(walker.tone.value, walker.redness.value), linearHex(walker.hairBase.value))
            built.mesh.setVerticesData('color', colours)
          }
        }
        const stand = new BABYLON.TransformNode('stand', scene)
        let built = null
        // The body the clip plays on and the floor holds up: MakeHuman's
        // (built) or an imported one.
        let shown = null
        let playing = null
        let read = null
        // How far below the body's root its skin reaches while the clip plays
        // (null: at rest), and how far shoes reach below the bare foot.
        let clipLow = null
        let sole = 0
        // Stand on the floor: the body is grounded at rest, but a retargeted
        // clip carries the feet lower (Idle by ~4 cm), so it is measured.
        const ground = () => { if (shown) stand.position.y = -(clipLow ?? shown.rig.at('root').y) + (shown === built ? sole : 0) }
        const measureClip = (group) => {
          const mesh = shown.mesh
          const nodes = shown.root.getChildTransformNodes(false)
          let low = Infinity
          for (let k = 0; k < 24; k++) {
            group.goToFrame(group.from + ((group.to - group.from) * k) / 24)
            for (const n of nodes) n.computeWorldMatrix(true)
            shown.skeleton.prepare(true)
            mesh.refreshBoundingInfo({ applySkeleton: true, applyMorph: true })
            low = Math.min(low, mesh.getBoundingInfo().boundingBox.minimumWorld.y)
          }
          group.goToFrame(group.from)
          return low - stand.position.y
        }
        const play = () => {
          playing?.dispose()
          const clip = ual.animationGroups.find((g) => g.name === walker.clip.value)
          playing = clip ? retargetClip(clip, source, read, { scene, armSpaceDeg: shown?.recipe?.armSpaceDeg }) : null
          playing?.start(true)
          clipLow = playing ? measureClip(playing) : null
          ground()
          if (walker.paused.value) playing?.pause()
        }
        let busy = false
        let again = false
        rebuild = async () => {
          if (busy) { again = true; return }
          busy = true
          const made = await maker.body(sliders())
          const full = made.full
          current = full
          clothBody = smoothed(full)
          stubbleMask = null
          const rig = made.rig
          face?.dispose()
          built?.dispose()
          built = buildBody(scene, 'walker', made)
          currentBody = made
          face = humanFace(scene, built, rig, pack.manifest, full, { eyes: eyePart, eyelashes: lashPart }, faceMaterials)
          built.rig = rig
          scalp = headScalp(pack.manifest, full, pack.triangles, { lips })
          dress()
          built.mesh.material = mat
          built.root.parent = stand
          clipLow = null
          ground()
          el.register({ meshes: [built.mesh, ...face.meshes] })
          if (walker.stubble.value > 0) measureStubble()
          paint()
          // A garment being cut is cut from the body as it is now.
          tailoring?.setBody(made, built)
          if (madeHuman()) {
            shown = built
            read = readSkeleton(built.skeleton, built.root)
            play()
          } else built.root.setEnabled(false)
          busy = false
          if (again) { again = false; rebuild() }
        }
        await rebuild()
        // An imported body: its triangles loaded once, then bound from its
        // rig recipe (the rig tool's markers, else a first guess off its
        // outline) and kept until the recipe changes.
        const plain = (v) => JSON.parse(JSON.stringify(v))
        const triangles = new Map()
        const rigged = new Map()
        let other = null
        let choosing = 0
        const recipeOf = (name) => plain(walker.rigs.value)[name] ?? null
        const keepRecipe = (name, recipe) => {
          walker.rigs.value = { ...plain(walker.rigs.value), [name]: plain(recipe) }
        }
        const rig = async (name) => {
          const from = SOURCES[name]
          if (!triangles.has(name)) triangles.set(name, await loadRigTriangles(scene, from.file ?? from.url, { pick: from.pick }))
          const tris = triangles.get(name)
          const kept = recipeOf(name)
          return wear(bodyFromMarkers(tris, { markers: kept?.binding?.markers, tail: kept?.binding?.tail, source: name }), kept)
        }
        // A rigged body on the stand in the builder's skin, with its recipe.
        const wear = (body, kept) => {
          const r = buildBody(scene, `body-${rigged.size}`, body)
          r.kept = JSON.stringify(kept)
          // A recipe always carries its binding, so the rig tool binds the
          // same mesh from the same markers (never its own skeleton).
          r.recipe = { version: 1, roles: {}, armSpaceDeg: 0, springs: [], ...kept, binding: { markers: body.made.markers, tail: body.made.tail ?? null } }
          r.mesh.material = mat
          r.root.parent = stand
          r.root.setEnabled(false)
          el.register({ meshes: [r.mesh] })
          return r
        }
        const hide = () => {
          other?.applied?.dispose()
          if (other) other.applied = null
          other?.root.setEnabled(false)
        }
        const choose = async () => {
          const token = ++choosing
          const name = walker.source.value
          // Another body: the rig tool on this one goes, its edits with it.
          if (rigging) { rigging.unmount(); rigging = null }
          // The tailor cuts from MakeHuman's body: it goes when that body does.
          if (tailoring && !madeHuman()) tailoring.cancel()
          hide()
          if (madeHuman()) {
            built.root.setEnabled(true)
            shown = built
            read = readSkeleton(built.skeleton, built.root)
            sourceNote = ''
            el.refreshScenePanel?.()
            play()
            return
          }
          built.root.setEnabled(false)
          if (!rigged.has(name)) {
            sourceNote = 'fitting the skeleton and binding the skin…'
            el.refreshScenePanel?.()
            el.setLoading(`rigging ${name}…`)
            // Let the message paint before the binding takes the thread.
            await new Promise((r) => setTimeout(r, 50))
            try {
              rigged.set(name, await rig(name))
              sourceNote = ''
            } catch (e) {
              console.warn('character builder: could not rig', name, e)
              sourceNote = `${name}: ${e?.message ?? e}`
            }
            el.setLoading(false)
          }
          if (token !== choosing) return
          other = rigged.get(name) ?? null
          if (!other) { el.refreshScenePanel?.(); return }
          other.root.setEnabled(true)
          shown = other
          // The recipe's springs (a tail, a ponytail) on the body shown.
          other.applied = applyRigRecipe(scene, other.root, other.skeleton, other.recipe)
          read = other.applied.read
          el.refreshScenePanel?.()
          play()
        }
        walker.source.observe(choose)
        openBody = () => {
          chooseFile('.glb,.gltf').then((file) => file && openFile(file))
        }
        // A mesh file becomes a body source (a choice in the list) and is shown.
        const openFile = (file) => {
          SOURCES[file.name] = { file }
          triangles.delete(file.name)
          rigged.get(file.name)?.dispose()
          rigged.delete(file.name)
          if (walker.source.value === file.name) choose()
          else walker.source.value = file.name
        }
        el.builder.openFile = openFile
        // THE RIG TOOL, on the body shown: the builder's body steps aside while
        // the tool shows the same mesh bound from the same recipe, and takes the
        // recipe back when you are done (bound again from its markers, its
        // springs hung). Cancel puts back the recipe it started with.
        openRig = () => {
          const name = walker.source.value
          const from = SOURCES[name]
          if (madeHuman() || !other || rigging) return
          hide()
          playing?.stop()
          const back = () => { rigging = null; if (walker.source.value === name) choose(); else el.refreshScenePanel?.() }
          rigging = mountRigTool(el, {
            models: [{ label: name, url: from.url ?? '', file: from.file, pick: from.pick }],
            recipe: plain(other.recipe),
            files: false,
            stage: false,
            camera: cam,
            // The rig it hands back is worn as it is: the body the tool bound,
            // its recipe kept with the character.
            handleDone: ({ recipe, body }) => {
              rigging = null
              delete recipe.model
              const old = rigged.get(name)
              if (old) {
                if (old === other) { hide(); other = null }
                old.dispose()
                rigged.delete(name)
              }
              if (body) rigged.set(name, wear(body, recipe))
              keepRecipe(name, recipe)
              if (walker.source.value === name) choose()
            },
            handleCancel: back,
          })
          el.refreshScenePanel?.()
        }
        el.builder.choose = choose
        el.builder.rigged = rigged
        el.builder.rigTool = () => rigging
        el.builder.openRig = () => openRig()

        // CHARACTERS (character-file): the figure you are working on is kept
        // in this browser as you change it and comes back when the page opens;
        // named ones are saved beside it; a file carries one anywhere.
        const WORKING = '(working)'
        const characterStore = async (mode, fn) => {
          const db = await new Promise((ok, no) => {
            const r = indexedDB.open('tosijs-characters', 1)
            r.onupgradeneeded = () => r.result.createObjectStore('characters')
            r.onsuccess = () => ok(r.result)
            r.onerror = () => no(r.error)
          })
          return new Promise((ok, no) => {
            const t = db.transaction('characters', mode)
            const req = fn(t.objectStore('characters'))
            t.oncomplete = () => ok(req?.result)
            t.onerror = () => no(t.error)
          })
        }
        const snapshot = (name) => {
          const settings = Object.fromEntries(KEPT.map((k) => [k, plain(walker[k].value)]))
          // The garments of your own it wears travel inside it.
          const garments = {}
          for (const slot of SLOTS) {
            const g = custom.get(walker[slot].value)
            if (g?.bytes) garments[walker[slot].value] = g.bytes
          }
          return writeCharacter({ name, settings, cloth: plain(cloth), tailor: plain(tailorShapes), garments }, { saved: new Date().toISOString() })
        }
        const tell = (message) => { character.note = message; el.refreshScenePanel?.() }
        let restoring = false
        const apply = async (doc) => {
          const { character: c, warnings } = readCharacter(doc, { settings: Object.fromEntries(KEPT.map((k) => [k, START[k]])), slots: cloth })
          restoring = true
          try {
            // Its own garments first, so the slots can wear them.
            for (const [name, bytes] of Object.entries(c.garments)) {
              if (custom.has(name)) continue
              await garmentStore('readwrite', (st) => st.put(bytes, name)).catch(() => {})
              await addCustom(bytes)
            }
            // A mesh opened from a file is not in the list here.
            if (!(c.settings.source in SOURCES)) {
              warnings.push(`body ${c.settings.source}: open that file again; MakeHuman's shown`)
              c.settings.source = 'MakeHuman'
            }
            // An outfit before a top and bottom (each clears the other).
            const keys = ['outfit', ...KEPT.filter((k) => k !== 'outfit')]
            for (const k of keys) walker[k].value = c.settings[k]
            // The slots' looks after the slots, which reset them as they change.
            for (const slot of SLOTS) cloth[slot] = c.cloth[slot]
            load()
            refabric()
            tailorShapes = c.tailor
            walker.characterName.value = c.name === WORKING ? '' : c.name
            dress()
          } finally {
            restoring = false
          }
          if (warnings.length) console.warn('character builder: loaded with changes', warnings)
          tell(warnings.length ? `loaded; ${warnings.length} setting(s) skipped (see the console)` : '')
        }
        const listSaved = async () => {
          const keys = await characterStore('readonly', (st) => st.getAllKeys()).catch(() => [])
          character.saved = (keys ?? []).filter((k) => k !== WORKING).sort()
          if (!character.saved.includes(walker.characterPick.value)) walker.characterPick.value = character.saved[0] ?? ''
          el.refreshScenePanel?.()
        }
        // Kept a moment after the last change, so a slider drag is one write.
        let pending = null
        character.changed = () => {
          if (restoring) return
          clearTimeout(pending)
          pending = setTimeout(() => {
            characterStore('readwrite', (st) => st.put(snapshot(WORKING), WORKING)).catch((e) => console.warn('character builder: could not keep the working figure', e))
          }, 800)
        }
        for (const k of [...KEPT, 'look', 'clothLook']) walker[k].observe(() => character.changed())
        character.save = async () => {
          const name = walker.characterName.value.trim()
          if (!name || name === WORKING) return tell('name the character first')
          try {
            await characterStore('readwrite', (st) => st.put(snapshot(name), name))
          } catch (e) {
            return tell(`could not save: ${e?.message ?? e}`)
          }
          walker.characterPick.value = name
          tell(`saved ${name}`)
          listSaved()
        }
        character.load = async () => {
          const name = walker.characterPick.value
          const doc = name && (await characterStore('readonly', (st) => st.get(name)).catch(() => null))
          if (!doc) return tell(`no character called ${name}`)
          await apply(doc).catch((e) => tell(`could not load: ${e?.message ?? e}`))
          character.changed()
        }
        character.forget = async () => {
          const name = walker.characterPick.value
          if (!name) return
          await characterStore('readwrite', (st) => st.delete(name)).catch(() => {})
          tell(`forgot ${name}`)
          listSaved()
        }
        character.exportJson = () => {
          const name = walker.characterName.value.trim() || 'character'
          save(JSON.stringify(snapshot(name), null, 1), `${name.replace(/[^\w-]/g, '_')}.character.json`, 'application/json')
        }
        character.importJson = () => {
          chooseFile('.json,application/json').then(async (file) => {
            if (!file) return
            try {
              await apply(await file.text())
              character.changed()
            } catch (e) {
              tell(`${file.name}: ${String(e?.message ?? e).replace(/^character-file: /, '')}`)
            }
          })
        }
        el.builder.character = { snapshot, apply, store: characterStore }
        // The figure you were working on, as you left it (after the saved garments it may wear).
        await loadSaved()
        const working = await characterStore('readonly', (st) => st.get(WORKING)).catch(() => null)
        if (working) await apply(working).catch((e) => console.warn('character builder: the working figure would not load', e))
        await listSaved()
        el.setLoading(false)
        walker.clip.observe(play)
        walker.paused.observe(() => (walker.paused.value ? playing?.pause() : playing?.play(true)))
      },
    },
    b3dSun({ timeOfDay: 16.5, shadowTextureSize: 2048, shadowMaxZ: 20, shadowNormalBias: 0.008 }),
    b3dLight({ intensity: 0.5 })
  )
)
```
```css
tosi-b3d { width: 100%; height: 100%; }
```

**Source** picks the body. MakeHuman's is the one the sliders shape and
the clothes, hair and face are made for. The others are meshes from
elsewhere (Blender Studio's Human Base Meshes, Quaternius' superheroes), or
your own with **open a mesh…** (GLB or glTF): any skeleton the file has is
ignored, and UAL's is fitted to the mesh's outline and the skin bound by bone
heat ([auto-rig](/rig-build/)), in a second or two. They walk and take the
skin; the rest of the panel is MakeHuman's and is hidden for them.

**Rig…** opens the [rig tool](/rig-tool/) on that body (its panel is on the
bar): drag the markers onto the joints and it is bound again on release; add
a tail, springs (a ponytail, a tail) or arm space. **Done** (at the top of the
Rig panel) brings the body back bound from that recipe, and the recipe is
saved with the character; **cancel** keeps the one it had. The first binding is a guess read
off the body's outline.

**Character** keeps your work. The figure you are working on is kept in this
browser as you change it and comes back when you open the page again. **Save**
it under a name to keep several, **load** or **forget** one, or **export
JSON** to take it elsewhere and **import JSON…** to bring one in. A file
carries everything the panel sets, and the garments of your own the character
wears travel inside it ([character-file](/character-file/)).

Open the settings (the owl): the body sliders reshape it
while it walks, since every body carries its own joints. The skin weights are
bone heat's, worked out from the mesh once when the page loads. The eyes
([human-face](/human-face/)) follow the camera, and the hair
([human-hair](/human-hair/)) is Quaternius' CC0 hairstyles, made for another
head and fitted to this one.

**Tailor…** opens the [tailor tool](/tailor-tool/) (scissors, on the bar):
click out an outline over the body's front view (you draw the character's
left, on your right; the other side is its mirror), and the skin inside it,
front and back, becomes cloth. A rectangle from the waist to the ankles is a
pair of trousers. Give it a thickness, a material, a **name** and a **slot**;
**done** keeps it in this browser as a choice in that slot, like MakeHuman's
own. What you are cutting is kept as you go, so **tailor…** carries on where
you left it. Choose the slot under **garment in** to **edit** a saved cut
again from its outline, or **forget** it.

A cut is a start, not a finished garment: **export** it (glTF or OBJ, the
garment and the body it was made on), shape it in Blender (a collar, pockets,
its own UV unwrap), and **import a garment** to bring it back as a choice in
its slot. It is bound to the body again by its shape, so it fits every body
like the rest ([garment-file](/garment-file/)). Or **export the body alone**
and model a garment from nothing beside it. In Blender, tick Include →
Custom Properties when exporting, so the file still says which body it was
made on.

New objects come in as part of the garment. Anything hard (a knee pad, a
plate, a visor) gets a `rigid` custom property so it keeps its shape instead
of bulging with the body under it ([proxy-rigid](/proxy-rigid/)).

Its surface is made in Blender too: the garment's material comes back with
its base colour, normal, roughness and alpha maps, and its **material** set
to **as made** with **recolour** at 0 shows it untouched. Recolour above 0
tints the base colour map, read as grey.

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
  m.roughness = 0.5
  // But it reflects its surroundings only faintly: at full strength a studio
  // environment made very dark skin look like polished stone.
  m.environmentIntensity = 0.3
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

/**
 * Stubble: multiply `colours` (RGBA per skin vertex, from `lipTint`) toward
 * a hair colour where `mask` (0..1 per skin vertex) says the beard grows,
 * by `amount` (0 clean-shaven, 1 a few days' growth). `skinRgb` and `hairRgb`
 * are linear; the result stays a ratio over the skin's own colour.
 */
export function stubbleTint(
  colours: Float32Array,
  mask: ArrayLike<number>,
  amount: number,
  skinRgb: { r: number; g: number; b: number },
  hairRgb: { r: number; g: number; b: number }
): Float32Array {
  if (amount <= 0) return colours
  /*
  Short hairs over skin read as a SHADOW: the hair seen through the skin is
  darker than the hair itself, and a little cool (a five o'clock shadow is
  blue-grey on fair skin). So the skin goes most of the way to a darkened
  hair colour with a touch of blue. Mixing toward the hair colour itself was
  too faint to see at full, worst on light-brown hair.
  */
  const dark = {
    r: hairRgb.r * 0.45,
    g: hairRgb.g * 0.5,
    b: hairRgb.b * 0.6 + 0.01,
  }
  const ratio = [
    (dark.r * 0.6 + skinRgb.r * 0.4) / Math.max(1e-4, skinRgb.r),
    (dark.g * 0.6 + skinRgb.g * 0.4) / Math.max(1e-4, skinRgb.g),
    (dark.b * 0.6 + skinRgb.b * 0.4) / Math.max(1e-4, skinRgb.b),
  ]
  for (let i = 0; i < mask.length; i++) {
    const k = mask[i] * Math.min(1, amount)
    if (k <= 0) continue
    for (let c = 0; c < 3; c++) {
      colours[i * 4 + c] *= 1 + (Math.min(1, ratio[c]) - 1) * k
    }
  }
  return colours
}
