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
import { b3d, b3dSun, b3dLight, slider3d, select3d, toggle3d, label3d, text3d, assetUrl, loadHumanPack, macroWeights, morphHuman, DEFAULT_HUMAN_BODY, humanRig, humanSkin, stiffenHead, armsOffTorso, skinMaterial, lipTint, humanFace, eyeGaze, eyeTexture, eyeMaterial, lashMaterial, loadHairLibrary, headScalp, hairMaterial, humanHair, skinThinness, vertexNormals, nearestWeights, coveredBy, skinAlbedo, stubbleTint, humanProxy, proxyMaterial, coverBody, fitProxy, drawnPositions, underCover, inflate, hairShading, HAIR_COLOURS, colorPicker3d, clothShading, clothRecipe, materialPicker3d, studioEnvironment, irisColor, faceDeltas, humanExpressions, blinker, lidsFollow, lipSync, babble, proxyDelta, skinSegments, boneHeat, buildRig, readSkeleton, retargetClip, cutGarment, mirrorOutline, outlineField3d, button3d, ui, bindGarment, writeGarmentGlb, writeGarmentObj, readGarment, garmentRigidity, unwrapGarment, smoothUnder, skirtGarment } from 'tosijs-3d'
import { tosi } from 'tosijs'

const { walker } = tosi({ walker: { ...DEFAULT_HUMAN_BODY, gender: 1, clip: 'Walk_Loop', tone: 0.3, redness: 0.5, iris: 0.2, irisColour: '#5a3519', hair: 'short02', beard: 'none', moustache: 'none', brows: 'eyebrow001', hairBase: HAIR_COLOURS.brown.base, hairHighlight: HAIR_COLOURS.brown.highlight, hairUp: 0, hairForward: 0, hairSize: 1, outfit: 'male_casualsuit02', bodysuit: 'none', armour: 'none', top: 'none', bottom: 'none', shoes: 'shoes01', hat: 'none', glasses: 'none', gloves: 'none', editing: 'outfit', look: 'as made', clothLook: clothRecipe({ fabric: 'cotton', colour: '#7a2e2e', recolour: 0 }), paused: false, stubble: 0, blink: true, talk: false, mic: false, smile: 0, browsUp: 0, frown: 0, tailorThickness: 0.005, tailorSkirt: false, tailorLook: clothRecipe({ fabric: 'cotton', colour: '#3b5b8a', recolour: 1 }), tailorAlone: false, tailorName: '', tailorSlot: 'top', exportBody: true } })
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
// A garment of your own, cut from the body along outlines you draw (the
// character's left; the right is its mirror). A rectangle from the waist to
// the ankles makes trousers.
let tailorShapes = []
let tailorBody = null
let tailorField = null
// Garments brought back from an editor (garment-file), worn alongside.
let imported = []
// Why the last import or save failed, shown under the buttons.
let importError = ''
let exportGarment = () => {}
let importGarment = () => {}
// Garments you named and saved (kept in this browser), worn from their slot.
const custom = new Map()
let saveGarment = () => {}
let forgetGarment = () => {}
let editGarment = () => {}
// A button that opens a popup: `open` is handed the panel host, for `showLayer`.
const popupButton = (label, open) => {
  let host = null
  const button = button3d({ label, handleClick: () => host && open(host) })
  const setHost = button.setHost
  button.setHost = (h) => { host = h; setHost?.call(button, h) }
  return button
}
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
      scenePanel: () => [
        label3d({ text: 'Body', collapsible: true, open: true }),
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
        ...(tailorBody
          ? [
              toggle3d({ label: 'hide other clothes', value: walker.tailorAlone }),
              // The outline in a popup of its own, so it can be big.
              popupButton('draw the outline…', (host) =>
                host.showLayer(
                  { anchor: { x: 0, y: 0, width: host.bounds.width, height: 0 }, side: 'right', width: 420, maxHeight: 720, chrome: true, title: 'Outline', handleClose: () => { tailorField = null } },
                  // The buttons first, so a tall outline never pushes them out of reach.
                  button3d({ label: 'delete point', handleClick: () => tailorField?.removeSelected() }),
                  button3d({ label: 'clear', handleClick: () => tailorField?.clear() }),
                  (tailorField = outlineField3d({ ...tailorBody, value: tailorShapes, maxHeight: 440, handleCommit: (v) => { tailorShapes = v; dress() } }))
                )
              ),
              slider3d({ label: 'thickness', value: walker.tailorThickness, min: 0.001, max: 0.02, step: 0.001 }),
              // Round the outline at each height: skirts, kilts, robes.
              toggle3d({ label: 'skirt', value: walker.tailorSkirt }),
              clothPicker('material', walker.tailorLook),
              // Name it and keep it: it becomes a choice in its slot, like MakeHuman's.
              ui.inputField({ value: walker.tailorName.value, placeholder: 'name the garment', handleChange: (v) => { walker.tailorName.value = v } }),
              select3d({ label: 'slot', value: walker.tailorSlot, options: SLOTS }),
              button3d({ label: 'save as an option', handleClick: () => saveGarment() }),
              ...(custom.has(walker[walker.tailorSlot.value].value)
                ? [
                    ...(custom.get(walker[walker.tailorSlot.value].value).cut ? [button3d({ label: `edit ${walker[walker.tailorSlot.value].value}`, handleClick: () => editGarment() })] : []),
                    button3d({ label: `forget ${walker[walker.tailorSlot.value].value}`, handleClick: () => forgetGarment() }),
                  ]
                : []),
              // Out to Blender (the garment and the body it was made on) and back.
              toggle3d({ label: 'include the body (a helper)', value: walker.exportBody }),
              button3d({ label: 'export glTF', handleClick: () => exportGarment('glb') }),
              button3d({ label: 'export OBJ', handleClick: () => exportGarment('obj') }),
              // The body alone, to model a garment from nothing beside it.
              button3d({ label: 'export the body alone', handleClick: () => exportGarment('glb', true) }),
              button3d({ label: 'import…', handleClick: () => importGarment() }),
              ...(importError ? [text3d({ text: importError })] : []),
              ...(imported.length ? [button3d({ label: `remove imported (${imported.length})`, handleClick: () => { imported = []; dress(); el.refreshScenePanel?.() } })] : []),
            ]
          : [label3d({ text: 'loading the body…' })]),
        label3d({ text: 'Ancestry', collapsible: true }),
        slider('african', 'african'),
        slider('asian', 'asian'),
        slider('caucasian', 'caucasian'),
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
        const retailor = () => {
          for (const name of ['tailored', ...imported.map((g) => g.name)]) clothes.get(proxyMaterials.get(`${name}:`))?.set({ recipe: walker.tailorLook.value })
        }
        // The body's slider values, which rebuild the shape a garment was made on.
        const bodyValues = () => Object.fromEntries(Object.keys(DEFAULT_HUMAN_BODY).map((k) => [k, Number(walker[k].value)]))
        let tailoredCut = null
        const save = (data, name, type) => {
          const a = document.createElement('a')
          a.href = URL.createObjectURL(new Blob([data], { type }))
          a.download = name
          a.click()
          setTimeout(() => URL.revokeObjectURL(a.href), 1000)
        }
        const baseMeta = () => ({ format: 'tosijs-garment', version: 1, base: pack.manifest.base, pack: pack.manifest.version, body: bodyValues(), name: 'tailored', slot: 'top' })
        const tailorLook = () => ({ material: walker.tailorLook.value })
        // The cut as worn on the body shown.
        // Unwrapped for an editor: a front and back per side, like a sewing pattern.
        const cutMesh = () => unwrapGarment({ positions: drawnPositions(tailoredCut, fitProxy(tailoredCut, clothBody)), triangles: tailoredCut.triangles })
        // The file's contents (a GLB's bytes or an OBJ's text), or null.
        const garmentFile = (format, bodyAlone = false) => {
          if (!tailoredCut && !bodyAlone) return null
          const garment = bodyAlone ? null : cutMesh()
          // The body it was made on, as a helper to model against (left out on import).
          const body = bodyAlone || walker.exportBody.value ? { positions: current, triangles: pack.triangles } : null
          const meta = baseMeta()
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
          custom.set(name, { proxy, cut: content.meta.cut, look: content.meta.look })
          if (!styles[slot].includes(name)) styles[slot].push(name)
          return content.meta
        }
        const say = (message) => { importError = message; el.refreshScenePanel?.() }
        saveGarment = async () => {
          const name = walker.tailorName.value.trim()
          const slot = walker.tailorSlot.value
          if (!name) return say('name the garment first')
          if (proxies[name] || name === 'none') return say(`"${name}" is taken by one of MakeHuman's; choose another name`)
          const last = imported[imported.length - 1]
          if (!tailoredCut && !last) return say('draw a garment or import one first')
          // The cut is kept with its outline, to edit again; an import as it came.
          const bytes = tailoredCut
            ? writeGarmentGlb({ garment: cutMesh(), meta: { ...baseMeta(), name, slot, look: tailorLook(), cut: { shapes: tailorShapes, thickness: walker.tailorThickness.value, skirt: walker.tailorSkirt.value } } })
            : writeGarmentGlb({ garment: last.file.garment, material: last.file.material, meta: { ...last.file.meta, name, slot, look: tailorLook() } })
          try {
            await garmentStore('readwrite', (s) => s.put(bytes, name))
          } catch (e) {
            console.warn('tailor: could not save', e)
            return say(`could not save: ${e?.message ?? e}`)
          }
          await addCustom(bytes)
          // It is worn from its slot now, not from the tailor.
          if (tailoredCut) { tailorShapes = []; tailorField?.setValue([]) }
          else imported.pop()
          importError = ''
          walker[slot].value = name
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
        // Back into the tailor: its outline, to change and save again.
        editGarment = () => {
          const slot = walker.tailorSlot.value
          const name = walker[slot].value
          const saved = custom.get(name)
          if (!saved?.cut) return
          tailorShapes = saved.cut.shapes
          tailorField?.setValue(tailorShapes)
          walker.tailorThickness.value = saved.cut.thickness
          walker.tailorSkirt.value = saved.cut.skirt === true
          walker.tailorName.value = name
          if (saved.look) walker.tailorLook.value = lookRecipe(saved.look)
          walker[slot].value = 'none'
          dress()
          el.refreshScenePanel?.()
        }
        exportGarment = (format, bodyAlone = false) => {
          const data = garmentFile(format, bodyAlone)
          if (data == null) return console.warn('tailor: draw a garment first')
          save(data, bodyAlone ? 'body.glb' : format === 'obj' ? 'garment.obj' : 'garment.glb', format === 'obj' ? 'text/plain' : 'model/gltf-binary')
        }
        const importFrom = async (data, fileName) => {
          const content = readGarment(data)
          // Bound to the body it was made on, where the file says what that
          // was; else to the body shown, which is then what it was made on.
          if (!content.meta) console.warn('tailor: no metadata in the file (export from Blender with custom properties); bound to the body shown')
          const meta = content.meta ?? baseMeta()
          if (content.materialCount > 1) console.warn(`tailor: the garment uses ${content.materialCount} materials; only the first is drawn`)
          const name = `imported-${imported.length}-${(meta.name ?? fileName).replace(/[^\w-]/g, '')}`
          const proxy = await asProxy({ ...content, meta }, name, meta.slot ?? 'top')
          imported.push({ ...proxy, file: { garment: content.garment, material: content.material, meta } })
          // A garment with its own maps keeps them: no fabric preset, no recolour.
          if (content.material?.baseColorTexture || content.material?.metallicRoughnessTexture) {
            walker.tailorLook.value = { type: 'cloth', inputs: { albedo: walker.tailorLook.value.inputs.albedo ?? '#7a2e2e', recolour: 0 } }
          }
          if (meta.name && !walker.tailorName.value) walker.tailorName.value = meta.name === 'tailored' ? '' : meta.name
          if (SLOTS.includes(meta.slot)) walker.tailorSlot.value = meta.slot
          dress()
          el.refreshScenePanel?.()
        }
        importGarment = () => {
          const input = document.createElement('input')
          input.type = 'file'
          input.accept = '.glb,.obj'
          input.onchange = async () => {
            const file = input.files?.[0]
            if (!file) return
            try {
              await importFrom(file.name.endsWith('.obj') ? await file.text() : await file.arrayBuffer(), file.name)
              importError = ''
            } catch (e) {
              console.warn('tailor: could not import', e)
              importError = `${file.name}: ${String(e?.message ?? e).replace(/^garment-file: /, '')}`
            }
            el.refreshScenePanel?.()
          }
          input.click()
        }
        walker.tailorThickness.observe(() => dress())
        walker.tailorSkirt.observe(() => dress())
        walker.tailorLook.observe(retailor)
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
        el.builder = { pack, hairLib, get scalp() { return scalp }, get built() { return built }, get positions() { return current }, get stubble() { return stubbleMask }, get tailor() { return tailorShapes }, set tailor(v) { tailorShapes = v; tailorField?.setValue(v); dress() }, garmentFile: (f, alone) => garmentFile(f, alone), importFrom: (d, n) => importFrom(d, n), get imported() { return imported }, save: () => saveGarment(), forget: () => forgetGarment(), edit: () => editGarment(), saved: custom, get message() { return importError } }
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
          // The garment cut from the outlines, bound like any other.
          const outline = mirrorOutline(tailorShapes.filter((s) => s.length >= 3))
          if (outline.length) {
            // Thicker cloth bridges more of the chest.
            const thickness = walker.tailorThickness.value
            const cutOn = nipples ? smoothUnder(current, pack.triangles, nipples, { bridge: thickness / 0.02 }) : clothBody
            const skirt = walker.tailorSkirt.value
            const cut = skirt
              ? skirtGarment(clothBody, pack.triangles, { front: outline, thickness, anchor: notArm })
              : cutGarment(cutOn, pack.triangles, { front: outline, thickness, ease: 6, fitOn: clothBody })
            tailoredCut = cut
            wearing.push({ ...cut, name: 'tailored', category: 'clothes', slot: 'top', material: { alpha: false, twoSided: skirt } })
          } else tailoredCut = null
          wearing.push(...imported)
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
          retailor()
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
        const body = () => {
          const b = {}
          for (const k of Object.keys(DEFAULT_HUMAN_BODY)) b[k] = Number(walker[k].value)
          return macroWeights(b, (n) => pack.has(n))
        }
        // The weights depend only on the topology: once, on the first body.
        const first = await morphHuman(pack, body())
        // The weights depend only on the topology: once, on the first body.
        const rig0 = humanRig(pack.manifest, first, undefined, { triangles: pack.triangles })
        const weights = boneHeat(skin.positions(first), skin.triangles, skinSegments(rig0))
        // The face moves with the head, or the lids slide over the eyes.
        stiffenHead(weights, skin.positions(first), rig0)
        // ...and the ribcage with the spine, not the arms.
        armsOffTorso(weights, skin.positions(first), rig0)
        // How thin the body is at each vertex (ears, nose, fingers), for the
        // skin's back-light: once, like the weights.
        const firstSkin = skin.positions(first)
        const thin = skinThinness(firstSkin, vertexNormals(firstSkin, skin.triangles))
        // Weights for every pack vertex, so clothes bound to helper vertices
        // (the tights and skirt shells, which carry no skin) bend too.
        const known = new Int32Array(pack.manifest.vertexCount).fill(-1)
        skin.vertices.forEach((v, i) => { known[v] = i })
        const allWeights = nearestWeights(first, known, weights)
        // The skin a skirt may go round: not the arms, which it cannot
        // follow without cloth simulation.
        const armBone = new Set(rig0.joints.map((j, i) => (/^(clavicle|upperarm|lowerarm|hand|thumb|index|middle|ring|pinky)/.test(j.name) ? i : -1)).filter((i) => i >= 0))
        const notArm = new Uint8Array(pack.manifest.vertexCount)
        for (let v = 0; v < notArm.length; v++) {
          let arm = 0
          for (let k = 0; k < 4; k++) if (armBone.has(allWeights.indices[v * 4 + k])) arm += allWeights.weights[v * 4 + k]
          notArm[v] = arm < 0.5 ? 1 : 0
        }
        let current = first
        // What clothes are fitted over: the body with its nipples smoothed,
        // because cloth bridges them (the skin keeps them).
        const smoothed = (p) => nipples ? smoothUnder(p, pack.triangles, nipples) : p
        let clothBody = smoothed(first)
        // The body as it is now, read when the outline opens: the cut is made
        // on the current body, so the view it is drawn over must be that one.
        tailorBody = { get positions() { return current }, indices: pack.triangles }
        void loadSaved()

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
        let playing = null
        let read = null
        // How far below the body's root its skin reaches while the clip plays
        // (null: at rest), and how far shoes reach below the bare foot.
        let clipLow = null
        let sole = 0
        // Stand on the floor: the body is grounded at rest, but a retargeted
        // clip carries the feet lower (Idle by ~4 cm), so it is measured.
        const ground = () => { stand.position.y = -(clipLow ?? built.rig.at('root').y) + sole }
        const measureClip = (group) => {
          const mesh = built.mesh
          const nodes = built.root.getChildTransformNodes(false)
          let low = Infinity
          for (let k = 0; k < 24; k++) {
            group.goToFrame(group.from + ((group.to - group.from) * k) / 24)
            for (const n of nodes) n.computeWorldMatrix(true)
            built.skeleton.prepare(true)
            mesh.refreshBoundingInfo({ applySkeleton: true, applyMorph: true })
            low = Math.min(low, mesh.getBoundingInfo().boundingBox.minimumWorld.y)
          }
          group.goToFrame(group.from)
          return low - stand.position.y
        }
        const play = () => {
          playing?.dispose()
          const clip = ual.animationGroups.find((g) => g.name === walker.clip.value)
          playing = clip ? retargetClip(clip, source, read, { scene }) : null
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
          const full = await morphHuman(pack, body())
          current = full
          clothBody = smoothed(full)
          stubbleMask = null
          const rig = humanRig(pack.manifest, full, undefined, { triangles: pack.triangles })
          face?.dispose()
          built?.dispose()
          built = buildRig(scene, 'walker', skin.positions(full), skin.triangles, rig, weights)
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
          read = readSkeleton(built.skeleton, built.root)
          play()
          busy = false
          if (again) { again = false; rebuild() }
        }
        await rebuild()
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

Open the settings (the owl): the body sliders reshape it
while it walks, since every body carries its own joints. The skin weights are
bone heat's, worked out from the mesh once when the page loads. The eyes
([human-face](/human-face/)) follow the camera, and the hair
([human-hair](/human-hair/)) is Quaternius' CC0 hairstyles, made for another
head and fitted to this one.

**Tailor** cuts a garment of your own out of the body. **Draw the outline**
opens the front view beside the panel; click out an outline over it (you draw the character's left, on your right; the other
side is its mirror), and the skin inside it, front and back, becomes cloth.
A rectangle from the waist to the ankles is a pair of trousers. Click the
first point to close a shape, drag a point to move it, press an edge to add
one ([garment-cut](/garment-cut/)).

A cut is a start, not a finished garment: **export** it (glTF or OBJ, the
garment and the body it was made on), shape it in Blender (a collar, pockets,
its own UV unwrap), and **import** it back. It is bound to the body again by
its shape, so it fits every body like the rest ([garment-file](/garment-file/)).
Or **export the body alone** and model a garment from nothing beside it.
In Blender, tick Include → Custom Properties when exporting, so the file still
says which body it was made on.

New objects come in as part of the garment. Anything hard (a knee pad, a
plate, a visor) gets a `rigid` custom property so it keeps its shape instead
of bulging with the body under it ([proxy-rigid](/proxy-rigid/)).

Its surface is made in Blender too: the garment's material comes back with
its base colour, normal, roughness and alpha maps, and its **material** set
to **as made** with **recolour** at 0 shows it untouched. Recolour above 0
tints the base colour map, read as grey.

**Hide other clothes** shows the garment on its own. **Name** it, pick its
**slot** and **save as an option**: it is kept in this browser and becomes a
choice in that slot like MakeHuman's own, with the material it was saved
with. A saved cut can be **edit**ed again from its outline; **forget**
removes it.

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
