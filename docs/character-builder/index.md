# character builder

**Make a person, and watch them walk.** The first steps of the character
creator (CHARACTER-DESIGN.md): MakeHuman's CC0 body
([human-pack](/human-pack/)), reshaped by sliders for gender, age, muscle,
weight, height and ancestry ([human-morph](/human-morph/)), with UAL's
skeleton placed from its own joint cubes ([human-rig](/human-rig/)) so it
plays UAL's clips at any shape.

## Demo

```js
import { b3d, b3dSun, b3dLight, row3d, slider3d, select3d, toggle3d, label3d, text3d, assetUrl, DEFAULT_HUMAN_BODY, HAIR_COLOURS, colorPicker3d, clothRecipe, materialPicker3d, studioEnvironment, irisColor, lipSync, readSkeleton, retargetClip, retargetSourceClip, readBvh, clipStore, clipKind, button3d, ui, writeGarmentGlb, writeGarmentObj, readGarment, writeCharacter, readCharacter, tailorPanel, garmentStore, barMenu, fitPanel, chooseFile, b3dPanel, panel3d, makeCharacter, loadCharacterAssets, undoHistory, holdGrip, holdClassOf, HOLD_CLASS_LABELS, picturesIn, pictureData, registerPicture, DEFAULT_CHARACTER, CHARACTER_SLOTS, CHARACTER_SOURCES, AI_CHARACTER_SOURCES, characterStore, WORKING_CHARACTER, nameCharacter, inspectView, viewMenu, b3dLibrary, handSocket, heldGrip, vector3d, euler3d, b3dManipulator, playback3d } from 'tosijs-3d'
import { tosi } from 'tosijs'
import { mountRigTool } from 'tosijs-3d/rig-tool'
import { exportBodyRows } from 'tosijs-3d/body-export'

// Everything the panel sets, as it starts: what a saved character is read against.
const START = { ...DEFAULT_HUMAN_BODY, gender: 1, clip: 'Walk_Loop', tone: 0.3, redness: 0.5, iris: 0.2, irisColour: '#5a3519', eyeStyle: 'basic', hair: 'short02', beard: 'none', moustache: 'none', brows: 'eyebrow001', hairBase: HAIR_COLOURS.brown.base, hairHighlight: HAIR_COLOURS.brown.highlight, hairUp: 0, hairForward: 0, hairSize: 1, outfit: 'male_casualsuit02', bodysuit: 'none', armour: 'none', top: 'none', bottom: 'none', shoes: 'shoes01', hat: 'none', glasses: 'none', gloves: 'none', mask: 'none', paused: false, stubble: 0, blink: true, talk: false, mic: false, smile: 0, browsUp: 0, frown: 0, tailorThickness: 0.005, tailorSkirt: false, tailorDrape: false, tailorMesh: 'body', tailorLook: clothRecipe({ fabric: 'cotton', colour: '#3b5b8a', recolour: 1 }), tailorAlone: false, tailorName: '', tailorSlot: 'top', exportBody: true, rigs: {}, surfaces: {}, held: 'none', grips: {}, source: 'MakeHuman', bodyDetail: 'medium', characterName: '' }
const { walker } = tosi({ walker: structuredClone(START) })
// What a character file keeps: not the editor's view of one slot (that is in
// cloth), the microphone (it would ask on load), or the save controls.
const KEPT = Object.keys(START).filter((k) => !['mic', 'characterName'].includes(k))
// Saving and loading characters, wired when the page is up.
const character = { save: () => {}, rename: () => {}, load: () => {}, remove: () => {}, exportJson: () => {}, play: () => {}, importJson: () => {}, changed: () => {}, undo: () => {}, redo: () => {}, canUndo: () => false, canRedo: () => false, saved: [], note: '' }
// A name asked for in a popup (works in a headset too): refused with its
// reason, and a confirm before it replaces ANOTHER saved character.
const namePopup = (pop, { prompt, initial, current, verb, act }) => {
  let typed = initial
  const go = () => {
    const d = nameCharacter(typed, character.saved, current)
    if (!d.ok) return pop.show(form(d.message))
    if (!d.replaces) {
      pop.close()
      return act(d.name)
    }
    pop.show([
      text3d({ text: `${d.name} is already saved. Replace it?` }),
      button3d({ label: 'replace', handleClick: () => { pop.close(); act(d.name) } }),
      button3d({ label: 'cancel', handleClick: () => pop.close() }),
    ])
  }
  const form = (message) => [
    text3d({ text: message }),
    ui.inputField({ value: typed, placeholder: 'name', autofocus: true, handleChange: (v) => { typed = v }, handleEnter: (v) => { typed = v; go() } }),
    button3d({ label: verb, handleClick: go }),
    button3d({ label: 'cancel', handleClick: () => pop.close() }),
  ]
  return form(prompt)
}
// The character (character.ts): what the panel sets, made in the scene.
let ch = null
// The pack's proxies, once it has loaded (the panel lists an outfit's looks).
let packProxies = {}
// What can be worn, one of each at a time; the pack says which slot each garment fills.
// A bodysuit is a base layer and armour goes over anything; an outfit replaces a top and bottom.
const SLOTS = CHARACTER_SLOTS
// The everyday clips first; the rest of the library (shoot, sword, interact…)
// follows once it has loaded.
const EVERYDAY = ['Idle_Loop', 'Walk_Loop', 'Jog_Fwd_Loop', 'Sprint_Loop', 'Dance_Loop', 'Crouch_Fwd_Loop']
let clips = [...EVERYDAY]
// Clips from a file (a Mixamo or Meshy character's GLB, or a BVH capture):
// name → the clip and the skeleton it was made on, retargeted like UAL's when
// played. Kept in this browser (clip-store), so they are here next visit.
const fileClips = new Map()
// Which kept file each clip came from, to forget it.
const clipFiles = new Map()
// Each file's kind and bytes, so a character file can carry the one it plays.
const clipBytes = new Map()
let openClips = () => {}
let forgetClip = () => {}
// Where the body comes from: MakeHuman's, which the sliders shape, or a mesh
// of anyone's (CHARACTER_SOURCES, and files opened here).
const SOURCES = { ...CHARACTER_SOURCES }
const sourceNames = () => ['MakeHuman', ...Object.keys(SOURCES)]
// A file's bytes, read once, so a character file can carry the body.
const fileBytes = new Map()
const keepBytes = (file) => {
  if (!fileBytes.has(file)) fileBytes.set(file, file.arrayBuffer().then((b) => void fileBytes.set(file, new Uint8Array(b))))
  return Promise.resolve(fileBytes.get(file))
}
// Where a mesh body comes from, as a character file says it.
const bodyOf = (name) => {
  const from = SOURCES[name]
  if (!from) return null
  const pick = from.pick != null ? { pick: from.pick } : {}
  if (from.url) return { url: from.url, ...pick }
  const bytes = from.file && fileBytes.get(from.file)
  return bytes instanceof Uint8Array ? { file: { name: from.file.name, bytes }, ...pick } : null
}
// A setting's choices (hair, beards, each slot), once the character is made.
const choices = (key) => ch?.choices(key) ?? ['none']
// A mesh opened from a file (a choice in the list once opened).
let openBody = () => {}
// The rig tool, mounted on the body while it is being rigged.
let rigging = null
let openRig = (file = null) => {}
const madeHuman = () => walker.source.value === 'MakeHuman'
// The imported body's surfaces (its file's materials), each as made or skin.
const surfaceRows = () => {
  const surfaces = ch?.surfaces() ?? []
  if (!surfaces.length) return []
  const source = walker.source.value
  return [
    label3d({ text: 'surfaces', collapsible: true, level: 2 }),
    ...surfaces.map(({ name, choice }) =>
      select3d({
        label: name,
        value: choice,
        options: ['as made', 'skin'],
        handleChange: (v) => {
          const all = JSON.parse(JSON.stringify(walker.surfaces.value))
          walker.surfaces.value = { ...all, [source]: { ...all[source], [name]: v } }
        },
      })
    ),
  ]
}
// A garment of your own, cut from the body along outlines you draw (the
// character's left; the right is its mirror). A rectangle from the waist to
// the ankles makes trousers.
let tailorShapes = []
// The tailor on the bar (tailor-panel), made with the scene; here because the
// character's first show can run before that code does.
let tailor = null
// What the tailor cuts from: the body shown, once it is there (and not while
// the rig tool has it).
const tailorTarget = () => (!rigging && ch?.shown?.source === walker.source.value ? ch.shown : null)
// Why the last import or save failed, shown under the buttons.
let importError = ''
let refreshPanel = () => {}

// A garment of your own worn in a slot, if it was made on the body shown.
const ownIn = (slot) => {
  const g = ch?.garments.get(walker[slot].value)
  return g && g.source === walker.source.value ? g : null
}
// Each slot is one row: what is worn, and beside it what it is made of (a
// swatch; tap it for fabrics, a colour, a picture). The fabrics are presets,
// plus 'as made', which leaves a garment's own surface (a file's roughness
// map) alone; a preset keeps the colour and recolour unless it brings its
// own (gold, copper). A worn suit with colourways has them on a row below.
const copy = (v) => JSON.parse(JSON.stringify(v))
const slotMaterial = (slot) =>
  materialPicker3d({
    name: slot,
    value: copy(ch.cloth(slot).material),
    types: ['cloth'],
    collections: ['fabrics', 'textiles'],
    presets: [{ name: 'as made', recipe: { type: 'cloth', inputs: {} } }],
    keep: ['albedo', 'recolour'],
    handleChange: (r) => {
      ch.setCloth(slot, { material: copy(r) })
      character.changed?.()
    },
  })
const looksOf = (slot) => Object.keys(packProxies[walker[slot].value]?.material?.looks ?? {})
const clothesRows = () => [
  label3d({ text: 'Clothes', icon: 'clothing', collapsible: true }),
  ...SLOTS.flatMap((slot) => {
    const garment = select3d({ label: slot, value: walker[slot], options: choices(slot), stayOpen: true })
    // Not worn (or not one this body can wear): no swatch.
    if (ch == null || walker[slot].value === 'none' || !choices(slot).includes(walker[slot].value)) return [garment]
    return [
      row3d({ weights: [4, 1] }, garment, slotMaterial(slot)),
      ...(looksOf(slot).length
        ? [select3d({
            label: `${slot} look`,
            value: ch.cloth(slot).look,
            options: ['as made', ...looksOf(slot)],
            handleChange: (v) => {
              ch.setCloth(slot, { look: v })
              character.changed?.()
            },
          })]
        : []),
    ]
  }),
]
// SOMETHING IN THE HAND: an item from the weapon library on the right hand's
// socket (its frame is the hand's anatomy, so one grip fits any rig's hand),
// placed by its grip and kept with the character, one grip per class of item.
let heldNames = ['none']
let applyGrip = () => {}
// THE CLIP'S TRANSPORT: play or pause, scrub, speed. The scene sets how to
// read and move the clip once it has one.
let clipSpeed = 1
let clipState = () => null
let seekClip = (t) => {}
let speedClip = (s) => {}
const playbackRow = () =>
  playback3d({
    name: 'clip playback',
    read: () => clipState(),
    handlePlay: (on) => { walker.paused.value = !on },
    handleSeek: (t) => seekClip(t),
    handleSpeed: (s) => { clipSpeed = s; speedClip(s) },
  })
// A manipulator on the held item's grip, to drag rather than type. Off until
// asked for; turning it on pauses the clip, so the hand holds still.
let gripHandles = false
let showGripHandles = (on) => { gripHandles = on }
// The same for the hair, on the head.
let hairHandles = false
let showHairHandles = (on) => { hairHandles = on }
// Every item in Tonio's library is made the same way (origin at the grip, +Y
// up the grip, +Z forward, real size), so a grip is set per CLASS of item
// (hold-grip: pistols, rifles, one- and two-handed blades…): placing it on
// one sword places every one-handed blade.
const gripsKept = () => JSON.parse(JSON.stringify(walker.grips.value))
const gripOf = (name) => {
  const kept = gripsKept()
  // A character saved before grips were per class kept them per item.
  const own = kept[holdClassOf(name)] ?? kept[name]
  return holdGrip(name, own ? { [holdClassOf(name)]: own } : {})
}
const setGrip = (patch) => {
  const name = walker.held.value
  const kept = gripsKept()
  delete kept[name]
  walker.grips.value = { ...kept, [holdClassOf(name)]: { ...gripOf(name), ...patch } }
  applyGrip()
}
// Export: the body on show as a GLB that plays UAL's clips by name (its
// springs too, and the clip playing if asked), in its clothes, skin and
// eyes. Hair, brows and lashes stay here for now.
// The clip playing as its file: one of your own, else UAL's.
const playingClip = (recipe) => {
  const name = walker.clip.value
  const file = clipFiles.get(name)
  const kept = file != null ? clipBytes.get(file) : null
  const armSpaceDeg = recipe?.armSpaceDeg
  if (kept) return { name, kind: kept.kind, bytes: kept.bytes, armSpaceDeg }
  return {
    name,
    kind: 'glb',
    url: assetUrl('quaternius/UAL_builder.glb'),
    armSpaceDeg,
    extras: { credit: 'Quaternius', license: 'CC0 (https://creativecommons.org/publicdomain/zero/1.0/)', source: 'quaternius/UAL_builder.glb' },
  }
}
const exportRows = () =>
  exportBodyRows(
    async () => {
      const shown = ch?.shown
      if (shown == null) return 'nothing to export yet'
      const name = walker.characterName.value || shown.source
      const out = await ch.exportCharacter()
      return {
        body: out?.body ?? shown.body,
        eyeTexture: out?.eyeTexture ?? null,
        recipe: shown.recipe,
        source: shown.source === 'MakeHuman' ? null : ch.sources[shown.source] ?? null,
        name: String(name).replace(/\W+/g, '-').replace(/^-|-$/g, '') || 'character',
        // What it wears: MakeHuman's clothes and garments of your own.
        garments: out?.garments ?? [],
        clip: playingClip(shown.recipe),
        // What the right hand holds goes out with it, where it is held.
        held:
          walker.held.value === 'none'
            ? null
            : {
                grip: gripOf(walker.held.value),
                url: assetUrl('tonio/weapons-classic/weapons.glb', 2),
                model: `${walker.held.value}.model`,
                gripNode: `${walker.held.value}_grip`,
                // As static-assets' metadata for the library says it.
                extras: { credit: 'Tonio Loewald', license: 'CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)', source: 'tonio/weapons-classic/weapons.glb' },
              },
      }
    },
    (message) => {
      importError = message
      refreshPanel()
    }
  )

const holdRows = () => {
  const name = walker.held.value
  const g = gripOf(name)
  return [
    label3d({ text: 'Hold', icon: 'bipedHandgun', collapsible: true }),
    select3d({ label: 'right hand', value: walker.held, options: heldNames, stayOpen: true }),
    ...(name === 'none'
      ? []
      : [
          toggle3d({
            label: 'manipulator',
            value: gripHandles,
            handleChange: (v) => {
              if (v && !walker.paused.value) walker.paused.value = true
              showGripHandles(v)
            },
          }),
          label3d({ text: `grip for all ${HOLD_CLASS_LABELS[holdClassOf(name)]}: from the hand (metres)`, muted: true }),
          vector3d({ value: { x: g.x, y: g.y, z: g.z }, step: 0.01, scrub: 0.002, handleChange: (v) => setGrip({ x: v.x, y: v.y, z: v.z }) }),
          label3d({ text: 'turned (degrees)', muted: true }),
          euler3d({ value: { x: g.rx, y: g.ry, z: g.rz }, step: 5, scrub: 0.5, handleChange: (v) => setGrip({ rx: v.x, ry: v.y, rz: v.z }) }),
          slider3d({ label: 'scale', value: g.scale, min: 0.4, max: 1.6, step: 0.01, handleChange: (v) => setGrip({ scale: v }) }),
          button3d({
            label: 'reset grip',
            handleClick: () => {
              const all = gripsKept()
              delete all[name]
              delete all[holdClassOf(name)]
              walker.grips.value = all
              applyGrip()
            },
          }),
        ]),
  ]
}
const slider = (label, key) =>
  slider3d({ label, value: walker[key], min: 0, max: 1, step: 0.01 })

preview.append(
  b3d(
    {
      clearColor: '#2a3340',
      panelTitle: 'Character Builder',
      // The panel is the builder: its button is the body, not the owl.
      panelIcon: 'body',
      // A tab per section, each its icon.
      panelSections: 'tabs',
      // Undo and redo, every change to the character as it settles: on the
      // panel's icon bar, at its right end.
      panelActions: () => [
        { icon: 'rotateCcw', title: 'undo (⌘Z)', dim: !character.canUndo(), handleClick: () => character.undo() },
        { icon: 'rotateCw', title: 'redo (⇧⌘Z)', dim: !character.canRedo(), handleClick: () => character.redo() },
      ],
      scenePanel: () => madeHuman() ? [
        label3d({ text: 'Body', icon: 'mesh', collapsible: true, open: true }),
        select3d({ label: 'source', value: walker.source, options: sourceNames(), stayOpen: true }),
        button3d({ label: 'open a mesh…', handleClick: () => openBody() }),
        // How much of the body is drawn: MakeHuman's lighter skins, or its base mesh.
        select3d({ label: 'detail', value: walker.bodyDetail, options: ['low', 'medium', 'high', 'full'] }),
        // Sub-sections fold inside the tab, one open at a time.
        // The most basic, least changeable first, here and in the tabs: who
        // you are (gender, age, height) before what you have made of it
        // (weight, muscle); face before hair, hair before clothes.
        label3d({ text: 'shape', collapsible: true, level: 2 }),
        slider('gender', 'gender'),
        slider('age', 'age'),
        slider('height', 'height'),
        // MakeHuman's own, so only here.
        label3d({ text: 'ancestry', collapsible: true, level: 2 }),
        slider('african', 'african'),
        slider('asian', 'asian'),
        slider('caucasian', 'caucasian'),
        label3d({ text: 'figure', collapsible: true, level: 2 }),
        slider('weight', 'weight'),
        slider('muscle', 'muscle'),
        slider('waist', 'waist'),
        slider('chest depth', 'chestDepth'),
        slider('pecs', 'pecs'),
        slider('bust', 'bustSize'),
        slider('firmness', 'bustFirmness'),
        label3d({ text: 'Skin', icon: 'skin', collapsible: true }),
        slider3d({ label: 'tone', value: walker.tone, min: 0, max: 1, step: 0.01 }),
        slider3d({ label: 'redness', value: walker.redness, min: 0, max: 1, step: 0.01 }),
        label3d({ text: 'Eyes', icon: 'eyes', collapsible: true }),
        select3d({ label: 'eye style', value: walker.eyeStyle, options: ['basic', 'anime', 'drawn'] }),
        colorPicker3d({ label: 'eye colour', value: walker.irisColour, alpha: false, defaultPresets: 'off', presets: [['dark brown', 0], ['brown', 0.15], ['amber', 0.3], ['hazel', 0.45], ['green', 0.6], ['blue-green', 0.72], ['blue', 0.85], ['grey', 1]].map(([name, t]) => { const c = irisColor(t); const h = (x) => Math.round(x * 255).toString(16).padStart(2, '0'); return { name, value: '#' + h(c.r) + h(c.g) + h(c.b) } }) }),
        label3d({ text: 'Face', icon: 'face', collapsible: true }),
        toggle3d({ label: 'blink', value: walker.blink }),
        toggle3d({ label: 'talk', value: walker.talk }),
        toggle3d({ label: 'mic (lip sync)', value: walker.mic }),
        slider3d({ label: 'smile', value: walker.smile, min: 0, max: 1, step: 0.01 }),
        slider3d({ label: 'brows up', value: walker.browsUp, min: 0, max: 1, step: 0.01 }),
        slider3d({ label: 'frown', value: walker.frown, min: 0, max: 1, step: 0.01 }),
        label3d({ text: 'Hair', icon: 'hair', collapsible: true }),
        select3d({ label: 'brows', value: walker.brows, options: choices('brows'), stayOpen: true }),
        select3d({ label: 'hair', value: walker.hair, options: choices('hair'), stayOpen: true }),
        // A base and a highlight, each a swatch that opens a picker with presets;
        // a base preset brings its usual highlight with it.
        colorPicker3d({ label: 'base', value: walker.hairBase, alpha: false, defaultPresets: 'off', presets: Object.entries(HAIR_COLOURS).map(([name, c]) => ({ name, value: c.base })) }),
        colorPicker3d({ label: 'highlights', value: walker.hairHighlight, alpha: false, defaultPresets: 'off', presets: Object.entries(HAIR_COLOURS).map(([name, c]) => ({ name, value: c.highlight })) }),
        // A hand adjustment after the fit: dragged up and forward on the head
        // (no turn, no sideways: hair stays symmetrical), and a scale. For the
        // library's styles; MakeHuman's own hair is bound to the body.
        ...(walker.hair.value === 'none' || packProxies[walker.hair.value] ? [] : [toggle3d({
          label: 'manipulator',
          value: hairHandles,
          handleChange: (v) => {
            if (v && !walker.paused.value) walker.paused.value = true
            showHairHandles(v)
          },
        }),
        slider3d({ label: 'scale', value: walker.hairSize, min: 0.9, max: 1.1, step: 0.005 })]),
        select3d({ label: 'beard', value: walker.beard, options: choices('beard'), stayOpen: true }),
        select3d({ label: 'moustache', value: walker.moustache, options: choices('moustache'), stayOpen: true }),
        slider3d({ label: 'stubble', value: walker.stubble, min: 0, max: 1, step: 0.01 }),
        ...clothesRows(),
        ...holdRows(),
        label3d({ text: 'Motion', icon: 'motion', collapsible: true }),
        select3d({ label: 'clip', value: walker.clip, options: clips, stayOpen: true }),
        playbackRow(),
        button3d({ label: 'clips from a file…', handleClick: () => openClips() }),
        ...(clipFiles.has(walker.clip.value) ? [button3d({ label: `forget ${walker.clip.value}`, handleClick: () => forgetClip() })] : []),
        ...exportRows(),
      ] : [
        // A body of anyone's: what MakeHuman's carries (shape, face, hair,
        // clothes) is not there; the clips and the skin are.
        label3d({ text: 'Body', icon: 'mesh', collapsible: true, open: true }),
        select3d({ label: 'source', value: walker.source, options: sourceNames(), stayOpen: true }),
        button3d({ label: 'open a mesh…', handleClick: () => openBody() }),
        ...(ch?.problem ? [text3d({ text: ch.problem })] : []),
        // Its rig is the rig tool's: markers, tail, springs, arm space. The
        // recipe is kept with the character.
        ...(rigging
          ? [
              text3d({ text: 'Rigging: in the Rig panel (on the bar). Done there brings the body back.' }),
            ]
          : [button3d({ label: 'rig…', handleClick: () => openRig() })]),
        // Its file's materials, each as made or the skin.
        ...surfaceRows(),
        label3d({ text: 'Skin', icon: 'skin', collapsible: true }),
        slider3d({ label: 'tone', value: walker.tone, min: 0, max: 1, step: 0.01 }),
        slider3d({ label: 'redness', value: walker.redness, min: 0, max: 1, step: 0.01 }),
        ...clothesRows(),
        ...holdRows(),
        label3d({ text: 'Motion', icon: 'motion', collapsible: true }),
        select3d({ label: 'clip', value: walker.clip, options: clips, stayOpen: true }),
        playbackRow(),
        button3d({ label: 'clips from a file…', handleClick: () => openClips() }),
        ...(clipFiles.has(walker.clip.value) ? [button3d({ label: `forget ${walker.clip.value}`, handleClick: () => forgetClip() })] : []),
        ...exportRows(),
      ],
      async sceneCreated(el, BABYLON) {
        const scene = el.scene
        refreshPanel = () => el.refreshScenePanel?.()
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
        // THE VIEWS: the body square on from each side, and the right hand
        // close up, followed through the clip (is the item held right?). The
        // hand view orbits like the perspective one, round the hand.
        let views = null
        const inspect = inspectView(cam, { handleChange: () => views?.update() })
        const home = { target: cam.target.clone(), radius: cam.radius }
        let handNode = null
        let knuckleNode = null
        let handOf = null
        const rightHand = () => {
          const shown = ch?.shown
          if (shown !== handOf) {
            handOf = shown
            // The shown body's own hand: the node its skeleton's bone is
            // linked to (other skeletons, the clips' source, have one too).
            const bones = shown?.built?.skeleton?.bones ?? []
            const node = (name) => bones.find((b) => b.name === name)?.getTransformNode() ?? null
            handNode = node('hand_r')
            knuckleNode = node('middle_01_r')
          }
          // The palm, where a grip is: between the wrist and the middle
          // finger's knuckle (the wrist alone when there are no fingers).
          const a = handNode?.getAbsolutePosition()
          if (a == null) return null
          const b = knuckleNode?.getAbsolutePosition()
          return b == null ? a : a.add(b).scaleInPlace(0.5)
        }
        // THE CHARACTER is the document, not a tab: a menu on the system bar,
        // beside the panel's button (save, select, rename… like a File menu).
        // Its name prompts are the scene's modal.
        const modal = (build) => {
          let close = null
          const pop = {
            show(ws) {
              close?.()
              const { svg, height } = fitPanel(ws, { width: 320 })
              close = el.showModal(svg, height)
            },
            close() {
              close?.()
              close = null
            },
          }
          pop.show(build(pop))
        }
        const saveAs = (initial, current) => modal((pop) => namePopup(pop, { prompt: 'save as', initial, current, verb: 'save', act: (name) => character.save(name) }))
        el.append(barMenu({
          icon: 'character',
          title: 'Character',
          layout: 'list',
          options: () => {
            const current = walker.characterName.value
            const saved = character.saved
            return [
              {
                label: 'Select',
                items: () => saved.length
                  ? saved.map((n) => ({ label: n, checked: n === current, handleSelect: () => { if (n !== current) character.load(n) } }))
                  : [{ label: 'nothing saved yet', disabled: true }],
              },
              {
                label: 'Delete',
                disabled: saved.length === 0,
                // A name, then a second step to confirm: it cannot be undone.
                items: () => saved.map((n) => ({ label: n, items: [{ label: `delete ${n}`, handleSelect: () => character.remove(n) }] })),
              },
              { label: current ? `Save ${current}` : 'Save…', handleSelect: () => (current ? character.save(current) : saveAs('', '')) },
              { label: 'Save as…', handleSelect: () => saveAs(current, current) },
              {
                label: 'Rename…',
                disabled: !current,
                handleSelect: () => modal((pop) => namePopup(pop, { prompt: `rename ${current} to`, initial: current, current, verb: 'rename', act: (name) => character.rename(current, name) })),
              },
              { separator: true },
              { label: 'Export JSON', handleSelect: () => character.exportJson() },
              { label: 'Load JSON…', handleSelect: () => character.importJson() },
              { separator: true },
              { label: 'Go to Playground', handleSelect: () => character.play() },
              ...(character.note ? [{ separator: true }, { label: character.note, disabled: true }] : []),
            ]
          },
        }))
        let onHand = false
        views = viewMenu(inspect, el, {
          always: true,
          extras: [{
            value: 'hand',
            label: 'right hand',
            icon: 'bipedHandgun',
            active: () => onHand,
            select: () => {
              onHand = true
              inspect.face = 'free'
              inspect.follow = rightHand
              // From the outside of the hand (the character's right is +X).
              cam.alpha = 0
              cam.beta = 1.3
              cam.radius = 0.6
            },
            leave: () => {
              onHand = false
              inspect.follow = null
              cam.target.copyFrom(home.target)
              cam.radius = home.radius
            },
          }],
        })
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

        // UAL's mannequin is only the clips' source: it stays hidden. The
        // builder's own pack: the loops that test a rig (locomotion, crouch,
        // the pistol, sword, shield and bow), not the bipeds' set.
        const ual = await BABYLON.LoadAssetContainerAsync(assetUrl('quaternius/UAL_builder.glb'), scene)
        el.setLoading('loading the body…')
        ual.addAllToScene()
        for (const g of ual.animationGroups) g.stop()
        // The everyday clips, then a file's, then the rest of UAL's.
        const listClips = () => {
          const mine = [...fileClips.keys()]
          clips = [...EVERYDAY, ...mine, ...ual.animationGroups.map((g) => g.name).filter((n) => !EVERYDAY.includes(n) && !fileClips.has(n)).sort()]
        }
        listClips()
        const ualRoot = ual.meshes.find((m) => m.name === '__root__')
        const source = readSkeleton(ual.skeletons[0], ualRoot)
        ualRoot.setEnabled(false)
        // THE HELD ITEM: an instance of the library's model on the shown
        // body's right-hand socket, made again when the item or body changes.
        const weapons = el.querySelector('tosi-b3d-library')
        let held = null
        applyGrip = () => {
          const name = walker.held.value
          const shown = ch?.shown
          if (held && (held.name !== name || held.shown !== shown || rigging)) {
            held.node.dispose()
            held = null
            gizmo.node = null
          }
          if (name === 'none' || !shown || rigging) return
          if (!held) {
            const skeleton = shown.built?.skeleton
            const hand = skeleton?.bones.find((b) => b.name === 'hand_r')?.getTransformNode()
            const node = hand && weapons?.instantiate?.(name, { canonical: true })
            if (!node) return
            node.parent = handSocket(skeleton, 'hand_r', 'r', hand) ?? hand
            // Its grip (a pistol's handle), measured once: that point, not
            // its origin, goes where the numbers say, as on a launcher.
            held = { node, name, shown, grip: heldGrip(node) ?? BABYLON.Vector3.Zero() }
          }
          placeHeld(gripOf(name))
        }
        // The item at a grip: that point and turn in the hand's socket frame.
        const placeHeld = (g, handle = true) => {
          const d = Math.PI / 180
          const turn = BABYLON.Quaternion.FromEulerAngles(g.rx * d, g.ry * d, g.rz * d)
          // Scaled with the item, so its grip point stays on the grip.
          const spun = held.grip.scale(g.scale).applyRotationQuaternion(turn)
          held.node.position.set(g.x - spun.x, g.y - spun.y, g.z - spun.z)
          held.node.rotationQuaternion = turn
          held.node.scaling.setAll(g.scale)
          // THE GRIP'S HANDLES: a node at the grip, in the same frame, for
          // the manipulator to drag; the item follows it.
          gripNode.parent = held.node.parent
          if (handle) {
            gripNode.position.set(g.x, g.y, g.z)
            gripNode.rotationQuaternion = turn.clone()
          }
          gizmo.node = gripHandles ? gripNode : null
        }
        const gripNode = new BABYLON.TransformNode('grip-handle', el.scene)
        const fromHandle = () => {
          const p = gripNode.position
          const e = gripNode.rotationQuaternion.toEulerAngles()
          const mm = (v) => Math.round(v * 1000) / 1000
          const deg = (v) => Math.round((v * 1800) / Math.PI) / 10
          return { x: mm(p.x), y: mm(p.y), z: mm(p.z), rx: deg(e.x), ry: deg(e.y), rz: deg(e.z) }
        }
        const gizmo = b3dManipulator({
          move: 'on',
          turn: 'on',
          size: 0.09,
          // Live: the item follows; kept (and the numbers shown) on release.
          whenChange: () => held && placeHeld({ ...gripOf(held.name), ...fromHandle() }, false),
          whenCommit: () => {
            setGrip(fromHandle())
            el.refreshScenePanel?.()
          },
        })
        el.append(gizmo)
        showGripHandles = (on) => {
          gripHandles = on
          gizmo.node = on && held ? gripNode : null
        }
        // THE HAIR'S HANDLE: a node on the Head bone at the skull's middle plus
        // the adjustment. Dragging moves the hair's meshes as they are; the
        // adjustment is kept, and the hair placed again, on release.
        const hairNode = new BABYLON.TransformNode('hair-handle', el.scene)
        let hairDrag = null
        let hairFrom = null
        const placeHairHandle = () => {
          const anchor = hairHandles ? ch?.hairAnchor?.() : null
          hairGizmo.node = null
          if (!anchor) return
          const c = anchor.centre
          hairNode.parent = anchor.node
          hairNode.rotationQuaternion = BABYLON.Quaternion.Identity()
          hairNode.position.set(c.x, c.y + walker.hairUp.value, c.z + walker.hairForward.value)
          hairFrom = hairNode.position.clone()
          hairGizmo.node = hairNode
        }
        const hairGizmo = b3dManipulator({
          move: 'on',
          // Up and forward: no sideways (it shows the y and z arrows and the
          // pad between them).
          lockMove: 'x',
          turn: 'off',
          size: 0.09,
          whenChange: () => {
            const anchor = ch?.hairAnchor?.()
            if (!anchor) return
            hairDrag ??= { meshes: anchor.meshes, at: anchor.meshes.map((m) => m.position.clone()) }
            const d = hairNode.position.subtract(hairFrom ?? hairNode.position)
            hairDrag.meshes.forEach((m, i) => m.position.copyFrom(hairDrag.at[i].add(d)))
          },
          whenCommit: () => {
            const anchor = ch?.hairAnchor?.()
            hairDrag = null
            if (!anchor) return
            const mm = (v) => Math.round(v * 1000) / 1000
            walker.hairUp.value = mm(hairNode.position.y - anchor.centre.y)
            walker.hairForward.value = mm(hairNode.position.z - anchor.centre.z)
          },
        })
        el.append(hairGizmo)
        showHairHandles = (on) => {
          hairHandles = on
          placeHairHandle()
        }
        // Undo, a loaded character or a new body puts the handle back.
        walker.hairUp.observe(() => placeHairHandle())
        walker.hairForward.observe(() => placeHairHandle())
        weapons?.ready.then(() => {
          heldNames = ['none', ...weapons.getNames().filter((n) => !n.startsWith('ammo')).sort()]
          applyGrip()
          el.refreshScenePanel?.()
        })
        walker.held.observe(() => {
          applyGrip()
          el.refreshScenePanel?.()
        })
        // An undo (or a loaded character) puts the grip back: the item moves.
        walker.grips.observe(() => applyGrip())

        // CLIPS FROM A FILE: any skinned GLB with animations (Mixamo's,
        // Meshy's), its skeleton read like UAL's, or a BVH motion capture;
        // its clips listed and retargeted onto the body shown, and the file
        // kept in this browser (restored quietly on the next visit).
        const keptClips = clipStore()
        const addClips = async (file, restoring = false, keep = !restoring) => {
          const kind = clipKind(file.name)
          if (!kind) return console.warn(`character builder: ${file.name} is not a GLB or BVH`)
          try {
            const bytes = new Uint8Array(await file.arrayBuffer())
            let names = []
            if (kind === 'bvh') {
              const from = readBvh(await file.text(), { name: file.name.replace(/\.bvh$/i, '') })
              fileClips.set(from.clips[0].name, { source: from, clip: from.clips[0] })
              names = [from.clips[0].name]
            } else {
              const c = await BABYLON.LoadAssetContainerAsync(file, scene)
              const skeleton = c.skeletons[0]
              if (!skeleton || c.animationGroups.length === 0) {
                console.warn(`character builder: ${file.name} has no skeleton or no animations`)
                c.dispose()
                return
              }
              const from = readSkeleton(skeleton, c.rootNodes[0])
              for (const g of c.animationGroups) {
                g.stop()
                fileClips.set(g.name, { group: g, from })
              }
              names = c.animationGroups.map((g) => g.name)
            }
            for (const n of names) clipFiles.set(n, file.name)
            clipBytes.set(file.name, { kind, bytes })
            if (keep) keptClips.put({ name: file.name, kind, bytes }).catch((e) => console.warn('character builder: could not keep the clips', e))
            listClips()
            if (!restoring) walker.clip.value = names[0]
            el.refreshScenePanel?.()
          } catch (e) {
            console.warn('character builder: could not read the clips', e)
          }
        }
        openClips = () => chooseFile('.glb,.gltf,.bvh').then((file) => file && addClips(file))
        forgetClip = () => {
          const file = clipFiles.get(walker.clip.value)
          if (file == null) return
          for (const [n, f] of [...clipFiles]) if (f === file) { clipFiles.delete(n); fileClips.delete(n) }
          clipBytes.delete(file)
          keptClips.delete(file).catch(() => {})
          listClips()
          walker.clip.value = 'Walk_Loop'
          el.refreshScenePanel?.()
        }
        keptClips.all().then((list) => Promise.all(list.map((c) => addClips(new File([c.bytes], c.name), true)))).then(() => {
          // A character saved playing one of them plays it again.
          if (fileClips.has(walker.clip.value)) play()
        }).catch(() => {})
        // The forget button comes and goes with whether the clip is your own.
        let ownClip = false
        walker.clip.observe(() => {
          if (clipFiles.has(walker.clip.value) === ownClip) return
          ownClip = !ownClip
          el.refreshScenePanel?.()
        })

        // MakeHuman's pack and Quaternius' hairstyles, shared by any character.
        const assets = await loadCharacterAssets(scene).catch((e) => {
          el.setLoading(`could not load the body: ${e.message}`, { spin: false })
          throw e
        })
        const pack = assets.pack
        packProxies = pack.manifest.proxies ?? {}
        const plain = (v) => JSON.parse(JSON.stringify(v))
        const save = (data, name, type) => {
          const a = document.createElement('a')
          a.href = URL.createObjectURL(new Blob([data], { type }))
          a.download = name
          a.click()
          setTimeout(() => URL.revokeObjectURL(a.href), 1000)
        }

        // THE CLIP, on whatever body is shown, standing on the floor.
        let playing = null
        const play = () => {
          playing?.dispose()
          playing = null
          if (!ch?.skeleton || rigging) return
          // A file's clip (gone after a reload: the walk instead), or UAL's.
          const own = fileClips.get(walker.clip.value)
          const clip = own?.group ?? ual.animationGroups.find((g) => g.name === walker.clip.value) ?? ual.animationGroups.find((g) => g.name === 'Walk_Loop')
          playing = own?.source
            ? retargetSourceClip(own.source, own.clip, ch.skeleton, { scene, armSpaceDeg: ch.recipe?.armSpaceDeg })
            : clip ? retargetClip(clip, own?.from ?? source, ch.skeleton, { scene, armSpaceDeg: ch.recipe?.armSpaceDeg }) : null
          playing?.start(true, clipSpeed)
          ch.groundFor(playing)
          if (walker.paused.value) playing?.pause()
        }
        // The transport reads and moves the clip playing now.
        const clipFps = () => playing?.targetedAnimations[0]?.animation.framePerSecond || 30
        clipState = () => {
          if (!playing) return null
          const fps = clipFps()
          const frame = playing.animatables[0]?.masterFrame ?? playing.from
          return { time: (frame - playing.from) / fps, duration: (playing.to - playing.from) / fps, playing: !walker.paused.value, speed: clipSpeed }
        }
        seekClip = (t) => playing?.goToFrame(playing.from + t * clipFps())
        speedClip = (s) => { if (playing) playing.speedRatio = s }

        // The saved garments, in IndexedDB: per browser, nothing shared yet.
        const garmentFiles = garmentStore()
        const savedGarments = await garmentFiles.all().catch((e) => {
          console.warn('tailor: no saved garments (storage unavailable)', e)
          return []
        })

        // THE CHARACTER: everything the panel sets that is about it (not the
        // clip, the tailor's work or the save controls).
        // A first visit (nothing kept) starts on one of the AI bodies, at
        // random; after that the working figure says which.
        if (!(await characterStore().get(WORKING_CHARACTER).catch(() => null))) {
          const first = Object.keys(AI_CHARACTER_SOURCES)
          walker.source.value = first[Math.floor(Math.random() * first.length)]
        }
        const OWN = Object.keys(DEFAULT_CHARACTER).filter((k) => k in START)
        const settings = () => ({ ...Object.fromEntries(OWN.map((k) => [k, plain(walker[k].value)])), hideClothes: walker.tailorAlone.value })
        ch = await makeCharacter(scene, assets, {
          settings: settings(),
          sources: SOURCES,
          garments: savedGarments ?? [],
          gaze: () => scene.activeCamera?.globalPosition ?? cam.position,
          handleStatus: (m) => el.setLoading(m),
          handleMeshes: (meshes) => el.register({ meshes }),
          handleShown: (shown) => {
            // A garment being cut is cut from the body as it is now.
            if (shown && tailor?.tool && tailor.editing?.source === shown.source) tailor.tool.setBody(shown.body, shown.built)
            else if (tailor?.open && !tailor.tool) tailor.begin()
            applyGrip()
            showHairHandles(hairHandles)
            el.refreshScenePanel?.()
            play()
          },
        })
        el.builder = {
          character: null,
          pack,
          get ch() { return ch },
          get built() { return ch.shown?.built },
          get body() { return ch.shown?.body },
          get tailorShapes() { return tailorShapes },
          set tailorShapes(v) { tailorShapes = v },
          get tailor() { return tailor?.tool ?? null },
          get tailorPanel() { return tailor?.panel },
          openTailor: () => tailor?.panel.show?.(),
          garmentFile: (f, alone) => tailor?.garmentFile(f, alone) ?? null,
          importFrom: (d, n) => tailor?.importFrom(d, n),
          forget: () => tailor?.forget(),
          saved: ch.garments,
          get message() { return importError || tailor?.message || '' },
          get expressions() { return ch.expressions },
        }
        // Each of the character's settings goes to it as it changes.
        for (const k of OWN) walker[k].observe(() => ch.set({ [k]: plain(walker[k].value) }))
        walker.tailorAlone.observe(() => ch.set({ hideClothes: walker.tailorAlone.value }))
        // An outfit replaces a top and bottom, and either replaces an outfit.
        walker.outfit.observe(() => { if (walker.outfit.value !== 'none') { walker.top.value = 'none'; walker.bottom.value = 'none' } })
        for (const k of ['top', 'bottom']) walker[k].observe(() => { if (walker[k].value !== 'none') walker.outfit.value = 'none' })
        // Picking a base preset brings its usual highlight.
        walker.hairBase.observe(() => {
          const pair = Object.values(HAIR_COLOURS).find((c) => c.base === walker.hairBase.value)
          if (pair && walker.hairHighlight.value !== pair.highlight) walker.hairHighlight.value = pair.highlight
        })
        // Wearing something else: its row gets its swatch (the character
        // resets its look).
        for (const slot of SLOTS) walker[slot].observe(() => el.refreshScenePanel?.())
        // MakeHuman's own hair has no hand adjustment: its rows go, and the handle.
        walker.hair.observe(() => {
          if (walker.hair.value === 'none' || packProxies[walker.hair.value]) showHairHandles(false)
          el.refreshScenePanel?.()
        })
        // The microphone drives the lips (it asks first, so it is never saved).
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
            const stop = lipSync(scene, ch.expressions, analyser, { gain: 1.5 })
            stopMic = () => { stop(); stream.getTracks().forEach((t) => t.stop()); ctx.close() }
          } catch (e) {
            walker.mic.value = false
            console.warn('lip sync: no microphone', e)
          }
        })
        // Another body: the rig tool on this one goes, and the tailor when it
        // was cutting from the one before.
        walker.source.observe(() => {
          if (rigging) { rigging.unmount(); rigging = null; ch.hide(false) }
          // The tailor keeps what it was making on the body before.
          if (tailor?.open) void tailor.keep().then(() => tailor.open && tailor.begin())
        })

        // GARMENTS OF YOUR OWN: what a garment was made on (MakeHuman's body,
        // its slider values; or a mesh's, its source, the only body it is
        // worn on), and the files kept in this browser.
        const bodyValues = () => Object.fromEntries(Object.keys(DEFAULT_HUMAN_BODY).map((k) => [k, Number(walker[k].value)]))
        const baseMeta = (from = walker.source.value) =>
          from === 'MakeHuman'
            ? { format: 'tosijs-garment', version: 1, base: pack.manifest.base, pack: pack.manifest.version, body: bodyValues(), name: 'tailored', slot: 'top' }
            : { format: 'tosijs-garment', version: 1, source: from, name: 'tailored', slot: 'top' }
        // THE TAILOR, always on the bar (tailor-panel): this page keeps its
        // draft, its slot and what each slot wears.
        const kept = (key) => ({ get: () => walker[key].value, set: (v) => { walker[key].value = v } })
        tailor = tailorPanel(el, {
          character: () => ch,
          target: () => tailorTarget() ?? (rigging ? 'The rig tool has the body: done or cancel in the Rig panel, then tailor it.' : 'loading the body…'),
          slots: SLOTS,
          choices: (slot) => choices(slot),
          worn: (slot) => walker[slot].value,
          wear: (slot, name) => { walker[slot].value = name },
          madeOn: (from) => baseMeta(from),
          reserved: (name) => !!packProxies[name],
          store: garmentFiles,
          draft: {
            get: () => ({
              cut: { shapes: tailorShapes, thickness: walker.tailorThickness.value, skirt: walker.tailorSkirt.value, drape: walker.tailorDrape.value, mesh: walker.tailorMesh.value },
              look: plain(walker.tailorLook.value),
              name: walker.tailorName.value,
            }),
            set: ({ cut, look, name }) => {
              tailorShapes = cut.shapes
              walker.tailorThickness.value = cut.thickness
              walker.tailorSkirt.value = cut.skirt
              walker.tailorDrape.value = cut.drape === true
              walker.tailorMesh.value = cut.mesh ?? 'body'
              walker.tailorLook.value = look
              walker.tailorName.value = name
            },
          },
          slot: kept('tailorSlot'),
          hideOthers: kept('tailorAlone'),
          includeBody: kept('exportBody'),
          helperBody: () =>
            madeHuman() ? { positions: ch.human.positions, triangles: pack.triangles } : ch.shown && { positions: ch.shown.body.positions, triangles: ch.shown.body.indices },
          save: (data, name, type) => save(data, name, type),
          handleChange: () => character.changed?.(),
          handleWardrobe: () => el.refreshScenePanel?.(),
          handleMessage: () => el.refreshScenePanel?.(),
        })

        // A MESH FILE becomes a body source (a choice in the list) and is shown.
        openBody = () => {
          chooseFile('.glb,.gltf').then((file) => file && openFile(file))
        }
        const openFile = (file) => {
          ch.addSource(file.name, { file })
          SOURCES[file.name] = { file }
          // Kept again once it can carry the file.
          keepBytes(file).then(() => character.changed?.())
          if (walker.source.value !== file.name) walker.source.value = file.name
        }
        el.builder.openFile = openFile
        // THE RIG TOOL'S BUTTON is always on the bar: it rigs the body shown
        // (a mesh's), or a mesh file opened in it, and done makes what it
        // rigged the builder's body (a choice under source). The character's
        // body steps aside while the tool shows the same mesh bound from the
        // same recipe; cancel puts it back as it was.
        const rigPanel = b3dPanel({ icon: 'rig', title: 'Rig', exclusive: 'off' })
        const idleRig = () =>
          panel3d(
            { width: 300 },
            label3d({ text: 'rig a mesh to play the clips', muted: true, compact: true }),
            ...(madeHuman() ? [] : [button3d({ label: `rig ${walker.source.value}`, handleClick: () => openRig() })]),
            button3d({ label: 'open a mesh file…', handleClick: () => chooseFile('.glb,.gltf,.obj').then((f) => f && openRig(f)) })
          )
        rigPanel.svg = idleRig()
        el.append(rigPanel)
        walker.source.observe(() => { if (!rigging) rigPanel.svg = idleRig() })
        openRig = (file = null) => {
          if (rigging) return
          if (!file && (madeHuman() || !ch.recipe)) return
          // The tailor keeps what it made and waits for the body back.
          if (tailor.tool) void tailor.keep().then(() => tailor.begin())
          const opened = file ? file.name : walker.source.value
          const from = file ? { file } : SOURCES[opened]
          ch.hide(true)
          playing?.stop()
          // The hand view follows the builder's character, which is hidden.
          if (onHand) { onHand = false; inspect.follow = null; cam.target.copyFrom(home.target); cam.radius = home.radius; views.update() }
          const done = () => {
            rigging = null
            ch.hide(false)
            if (tailor.open && !tailor.tool) tailor.begin()
            applyGrip()
            rigPanel.svg = idleRig()
            rigPanel.hide?.()
            // The Body and Tailor sections wait on it.
            el.refreshScenePanel?.()
          }
          rigging = mountRigTool(el, {
            models: [{ label: opened, url: from.url ?? '', file: from.file, pick: from.pick }],
            // A file starts from nothing: bound from markers, or on its own
            // skeleton when it has one.
            recipe: file ? undefined : plain(ch.recipe),
            // The body it already wears: shown as it is, not bound again.
            body: file ? undefined : ch.shown?.body,
            files: false,
            stage: false,
            camera: cam,
            // One view menu: the builder's, which the rig tool follows.
            inspect,
            panel: rigPanel,
            // The rig it hands back is worn as it is: the body the tool bound,
            // its recipe kept with the character.
            handleDone: ({ recipe, body, model }) => {
              done()
              delete recipe.model
              // What it rigged: the model it opened on, or a file loaded in it.
              const loaded = model instanceof File ? model : model?.file ?? null
              const name = model instanceof File ? model.name : model?.label ?? opened
              // A file new to the builder only: re-adding the one it already
              // has would dispose the materials the body handed back wears.
              if (loaded && SOURCES[name]?.file !== loaded) {
                SOURCES[name] = { file: loaded }
                ch.addSource(name, { file: loaded })
                keepBytes(loaded).then(() => character.changed?.())
              }
              if (body) ch.adopt(name, body, recipe)
              walker.rigs.value = { ...plain(walker.rigs.value), [name]: plain(recipe) }
              if (walker.source.value !== name) walker.source.value = name
              else play()
            },
            handleCancel: () => {
              done()
              play()
            },
          })
          // The item goes while the rig tool has the body.
          applyGrip()
          el.refreshScenePanel?.()
        }
        el.builder.rigTool = () => rigging
        el.builder.addClips = (file) => addClips(file)
        el.builder.openRig = (file) => openRig(file)

        // CHARACTERS (character-file): the figure you are working on is kept
        // in this browser as you change it and comes back when the page opens;
        // named ones are saved beside it; a file carries one anywhere.
        // In this browser's character store, which keeps a mesh once
        // however many saves wear it, and which other pages read too.
        const WORKING = WORKING_CHARACTER
        const store = characterStore()
        const snapshot = (name) => {
          const kept = Object.fromEntries(KEPT.map((k) => [k, plain(walker[k].value)]))
          // The garments of your own it wears travel inside it.
          const garments = {}
          for (const slot of SLOTS) {
            const g = ch.garments.get(walker[slot].value)
            if (g?.bytes) garments[walker[slot].value] = g.bytes
          }
          const cloth = Object.fromEntries(SLOTS.map((slot) => [slot, plain(ch.cloth(slot))]))
          // And its body, when it is a mesh: where it comes from, or the file.
          const body = bodyOf(kept.source)
          const bodies = body ? { [kept.source]: body } : {}
          // The pictures its materials use (chosen from disk), by key.
          const pictures = Object.fromEntries(picturesIn({ kept, cloth }).map((k) => [k, pictureData(k)]).filter(([, b]) => b))
          // The clip it plays, when that is one of your own: its file.
          const clipFile = clipFiles.get(kept.clip)
          const clips = clipFile && clipBytes.has(clipFile) ? { [clipFile]: clipBytes.get(clipFile) } : {}
          return writeCharacter({ name, settings: kept, cloth, tailor: plain(tailorShapes), garments, bodies, pictures, clips }, { saved: new Date().toISOString() })
        }
        const tell = (message) => { character.note = message; el.refreshScenePanel?.() }
        let restoring = false
        const apply = async (doc) => {
          // What the tailor was making is kept before another character comes.
          if (tailor?.tool) await tailor.keep()
          const slotLooks = Object.fromEntries(SLOTS.map((slot) => [slot, plain(ch.cloth(slot))]))
          const { character: c, warnings } = readCharacter(doc, { settings: Object.fromEntries(KEPT.map((k) => [k, START[k]])), slots: slotLooks })
          restoring = true
          try {
            // Its pictures first, so its materials find them.
            for (const [key, b64] of Object.entries(c.pictures ?? {})) registerPicture(key, b64)
            // Its own garments first, so the slots can wear them.
            for (const [name, bytes] of Object.entries(c.garments)) {
              if (ch.garments.has(name)) continue
              await garmentFiles.put(name, bytes).catch(() => {})
              await ch.addGarment(bytes)
            }
            // A body the file carries and this page does not have becomes a source.
            for (const [name, b] of Object.entries(c.bodies ?? {})) {
              if (name in SOURCES) continue
              const file = b.file ? new File([b.file.bytes], b.file.name) : null
              if (file) fileBytes.set(file, b.file.bytes)
              const from = { ...(file ? { file } : { url: b.url }), ...(b.pick != null ? { pick: b.pick } : {}) }
              SOURCES[name] = from
              ch.addSource(name, from)
            }
            // A clip file it carries and this browser does not have: read and kept.
            for (const [name, clip] of Object.entries(c.clips ?? {})) {
              if (!clipBytes.has(name)) await addClips(new File([clip.bytes], name), true, true)
            }
            if (c.settings.source !== 'MakeHuman' && !(c.settings.source in SOURCES)) {
              warnings.push(`body ${c.settings.source}: open that file again; MakeHuman's shown`)
              c.settings.source = 'MakeHuman'
            }
            // An outfit before a top and bottom (each clears the other).
            const keys = ['outfit', ...KEPT.filter((k) => k !== 'outfit')]
            for (const k of keys) walker[k].value = c.settings[k]
            // The character takes them now, then the slots' looks (which
            // wearing something new resets).
            ch.set(Object.fromEntries(OWN.map((k) => [k, plain(c.settings[k])])))
            for (const slot of SLOTS) ch.setCloth(slot, c.cloth[slot])
            await ch.ready()
            tailorShapes = c.tailor
            walker.characterName.value = c.name === WORKING ? '' : c.name
          } finally {
            restoring = false
          }
          if (warnings.length) console.warn('character builder: loaded with changes', warnings)
          tell(warnings.length ? `loaded; ${warnings.length} setting(s) skipped (see the console)` : '')
        }
        const listSaved = async () => {
          character.saved = await store.list().catch(() => [])
          // Deleted (here or in another tab): the figure is no longer saved.
          if (!character.saved.includes(walker.characterName.value)) walker.characterName.value = ''
          el.refreshScenePanel?.()
        }
        // Kept a moment after the last change, so a slider drag is one write.
        let pending = null
        const keepWorking = () => {
          clearTimeout(pending)
          pending = setTimeout(() => {
            // Under the name it is being edited as, so a reload knows which
            // saved character this is (the key, not the name, marks it working).
            store.put(WORKING, snapshot(walker.characterName.value || WORKING)).catch((e) => console.warn('character builder: could not keep the working figure', e))
          }, 800)
        }
        character.changed = () => {
          if (restoring) return
          keepWorking()
          awaitStep()
        }

        // UNDO (#3878): the character recorded as each change settles, a
        // slider drag or a placed grip being one step. A step is the snapshot
        // without its files' bytes (garments and bodies stay loaded, so a step
        // only names them), and undo applies it as loading a character does.
        // Not the clip or playback: watching is not editing.
        const TRANSIENT = ['paused', 'clip', 'talk', 'blink', 'exportBody', 'tailorAlone']
        const undoable = () => ({
          settings: Object.fromEntries(KEPT.filter((k) => !TRANSIENT.includes(k)).map((k) => [k, plain(walker[k].value)])),
          cloth: Object.fromEntries(SLOTS.map((slot) => [slot, plain(ch.cloth(slot))])),
          tailor: plain(tailorShapes),
        })
        const history = undoHistory({ limit: 100 })
        let stepTimer = null
        const buttons = () => `${character.canUndo()}${character.canRedo()}`
        const record = () => {
          const was = buttons()
          clearTimeout(stepTimer)
          stepTimer = null
          history.record(undoable())
          if (buttons() !== was) el.refreshScenePanel?.()
        }
        const awaitStep = () => {
          const was = buttons()
          clearTimeout(stepTimer)
          stepTimer = setTimeout(record, 400)
          if (buttons() !== was) el.refreshScenePanel?.()
        }
        let stepping = false
        const restore = async (step) => {
          if (!step) return
          stepping = true
          const name = walker.characterName.value
          const settings = { ...Object.fromEntries(KEPT.map((k) => [k, plain(walker[k].value)])), ...step.settings }
          try {
            await apply(writeCharacter({ name: name || WORKING, settings, cloth: step.cloth, tailor: step.tailor, garments: {}, bodies: {} }))
          } catch (e) {
            tell(`could not undo: ${e?.message ?? e}`)
          } finally {
            stepping = false
          }
          walker.characterName.value = name
          // Kept, but not a new step (redo stays).
          keepWorking()
          el.refreshScenePanel?.()
        }
        // Not while a tool has the body: the rig tool undoes its own edits.
        const idle = () => !stepping && !rigging && !tailor?.tool
        character.canUndo = () => idle() && (history.canUndo || stepTimer != null)
        character.canRedo = () => idle() && stepTimer == null && history.canRedo
        character.undo = () => {
          if (!character.canUndo()) return
          // A change still settling is a step of its own.
          if (stepTimer != null) record()
          return restore(history.undo())
        }
        character.redo = () => character.canRedo() && restore(history.redo())
        const onKey = (e) => {
          if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return
          if (e.target?.closest?.('input, textarea, [contenteditable]')) return
          // The tailor, while it is open, undoes its own edits.
          if (tailor?.tool && !stepping) {
            e.preventDefault()
            if (e.shiftKey) tailor.tool.redo()
            else tailor.tool.undo()
            return
          }
          if (!idle()) return
          e.preventDefault()
          if (e.shiftKey) character.redo()
          else character.undo()
        }
        window.addEventListener('keydown', onKey)
        el.whenDisposed?.(() => window.removeEventListener('keydown', onKey))
        for (const k of KEPT) walker[k].observe(() => character.changed())
        character.save = async (name) => {
          try {
            await store.put(name, snapshot(name))
          } catch (e) {
            return tell(`could not save: ${e?.message ?? e}`)
          }
          walker.characterName.value = name
          tell(`saved ${name}`)
          listSaved()
          character.changed()
        }
        // Put under the new name, then the old one goes.
        character.rename = async (from, to) => {
          if (to === from) return
          try {
            const doc = await store.get(from)
            if (!doc) return tell(`no character called ${from}`)
            await store.put(to, { ...doc, name: to })
            await store.delete(from)
          } catch (e) {
            return tell(`could not rename: ${e?.message ?? e}`)
          }
          if (walker.characterName.value === from) walker.characterName.value = to
          tell(`renamed ${from} to ${to}`)
          listSaved()
          character.changed()
        }
        character.load = async (name) => {
          const doc = name && (await store.get(name).catch(() => null))
          if (!doc) return tell(`no character called ${name}`)
          await apply(doc).catch((e) => tell(`could not load: ${e?.message ?? e}`))
          character.changed()
        }
        // The saved copy goes; the figure stays, unsaved, as the working one.
        character.remove = async (name) => {
          if (!name) return
          try {
            await store.delete(name)
          } catch (e) {
            return tell(`could not delete: ${e?.message ?? e}`)
          }
          if (walker.characterName.value === name) walker.characterName.value = ''
          tell(`deleted ${name}`)
          character.changed()
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
        // Straight into the playground as this figure: kept now (not after
        // the autosave's pause), then the playground loads it by name.
        character.play = async () => {
          clearTimeout(pending)
          try {
            await store.put(WORKING, snapshot(walker.characterName.value || WORKING))
          } catch (e) {
            return tell(`could not keep it: ${e?.message ?? e}`)
          }
          location.href = `/playground/?character=${encodeURIComponent(WORKING)}`
        }
        el.builder.character = { snapshot, apply, store }
        // The figure you were working on, as you left it.
        const working = await store.get(WORKING).catch(() => null)
        if (working) await apply(working).catch((e) => console.warn('character builder: the working figure would not load', e))
        // Undo starts from the figure as it opened.
        history.clear(undoable())
        await listSaved()
        el.setLoading(false)
        play()
        el.refreshScenePanel?.()
        walker.clip.observe(play)
        walker.paused.observe(() => (walker.paused.value ? playing?.pause() : playing?.play(true)))
      },
    },
    // Things to hold: Tonio's weapons (CC BY 4.0), each with its grip at its origin.
    b3dLibrary({ url: assetUrl('tonio/weapons-classic/weapons.glb', 2), type: 'weapons' }),
    b3dSun({ timeOfDay: 16.5, shadowTextureSize: 2048, shadowMaxZ: 20, shadowNormalBias: 0.008 }),
    b3dLight({ intensity: 0.5 })
  )
)
```
```css
tosi-b3d { width: 100%; height: 100%; }
```

**Undo and redo** are the arrows at the top of the panel (⌘Z and ⇧⌘Z):
every change to the character as it settles, so a slider drag or a placed
grip is one step ([undo-history](/undo-history/)). The clip and its playback
are not steps. While the rig tool has the body, they undo the rig tool's
edits, and while the tailor is open, the tailor's.

**Source** picks the body. A first visit starts on one of four AI-made
characters at random (a woman and a man, each in underwear and in a
spacesuit; CC0, rigged when they load); after that the builder keeps the one
you chose. MakeHuman's is the one the sliders shape and the clothes, hair and
face are made for. The others are meshes from elsewhere (Blender Studio's
Human Base Meshes, Quaternius' superheroes), or
your own with **open a mesh…** (GLB or glTF). A file skinned to UAL's
skeleton already, as Quaternius' characters are, is taken as it is: its own
joints and weights ([rigged-body](/rigged-body/)). Bind your own mesh to that
skeleton in Blender and it is too; it comes with Quaternius'
[Universal Animation Library](https://quaternius.itch.io/universal-animation-library)
and [Universal Base Characters](https://quaternius.itch.io/universal-base-characters)
(CC0, pay what you want). Any other mesh has UAL's skeleton fitted to its
outline and its skin bound by bone heat ([auto-rig](/rig-build/)), in a
second or two. They walk, wear their own materials or the skin, and take
the tailor (below); the rest of the panel is MakeHuman's and is hidden for
them.

**Rig…** opens the [rig tool](/rig-tool/) on that body (its panel is on the
bar): drag the markers onto the joints and it is bound again on release; add
a tail, springs (a ponytail, a tail) or arm space. **Done** (at the top of the
Rig panel) brings the body back bound from that recipe, and the recipe is
saved with the character; **cancel** keeps the one it had. The first binding is a guess read
off the body's outline.

**Motion** plays a clip on whatever body is shown: UAL's library (the
everyday clips first), retargeted. **Clips from a file…** adds the clips of
any skinned GLB (a Mixamo or Meshy character's, say) or a BVH motion capture
([bvh](/bvh/)), retargeted the same way and listed after the everyday ones.
They are kept in this browser ([clip-store](/clip-store/)) and come back on
the next visit; **forget** drops the file a clip came from.

**View** (the camera on the bar) holds the body square on from any side, or
follows the **right hand** close up through the clip, to see how an item sits
in it. The rig tool uses the same menu.

**Hold** puts an item from Tonio's textured weapons
(`tonio/weapons-classic/weapons.glb`, CC BY 4.0: guns, blades, a plasma
blade, a spear, a buckler) in the right hand, on the hand's
socket (a frame normalised to the hand's anatomy, so one grip fits any
body's hand). Every item is made the same way, its origin at its grip (a
`_grip` node), +Y up the grip and +Z forward, at its real size, so one grip
holds them all. Its **grip** says where the item's grip point goes, turned
and scaled, and is set per class of item ([[hold-grip|hold grips]]: pistols,
rifles, heavy weapons, one- and two-handed blades, bows, shields), so
placing it on one sword places every one-handed blade; the grips are kept
with the character. Play a clip
made for it (`Pistol_Idle_Loop`, the shoot loops) and check it in the hand
view. The numbers are a launcher's: `b3dLauncher({ socket: 'right-hand', x,
y, z, rx, ry, rz, modelScale })` holds it the same way on a biped.

**Character** (on the system bar, beside the body button) keeps your work,
as a File menu does. The figure you are working on is kept in this browser as
you change it and comes back when you open the page again. **Save** keeps it
under its name, asking for one the first time; **Save as…** under another
(asking first before replacing a saved character); **Rename…** renames it.
**Select ▸** lists the saved characters (the one on screen ticked): pick one
and it loads. **Delete ▸** picks one, then asks again. **Export JSON** takes
it elsewhere and **Load JSON…** brings one in: a file carries everything the
panel sets, and the garments of your own the character wears travel inside
it ([character-file](/character-file/)). **Go to Playground** plays it in the
biped playground.

Open the panel (the body button): the body sliders reshape it
while it walks, since every body carries its own joints. The skin weights are
bone heat's, worked out from the mesh once when the page loads. The eyes
([human-face](/human-face/)) follow the camera, and the hair
([human-hair](/human-hair/)) is Quaternius' CC0 hairstyles, made for another
head and fitted to this one.

**The tailor** is always on the bar (scissors). Open it, pick a **slot**
and a **garment** for it: one you cut before opens on its outline, ready to
edit; **(new garment)** starts one; anything else (MakeHuman's clothes, an
import with no outline) is simply worn. Click out an outline over the body's
front view (you draw the character's left, on your right; the other side is
its mirror), and the skin inside it, front and back, becomes cloth. A
rectangle from the waist to the ankles is a pair of trousers. Give it a
thickness, a material and a **name**. There is no done or cancel: what you
make is kept as you go, in this browser and worn in its slot, when you switch
slot or garment or close the panel, and **undo** and **redo** on the
tailor's bar (⌘Z / ⇧⌘Z) step through the edits. A new garment's outline is
kept with the character until it is closed, so the tailor carries on where
you left it. **Forget** removes one of your own.

A cut is a start, not a finished garment: **export** it (GLB or OBJ, the
garment and the body it was made on), shape it in Blender (a collar, pockets,
its own UV unwrap), and **import a garment** to bring it back as a choice in
its slot. It is bound to the body again by its shape, so it fits every body
like the rest ([garment-file](/garment-file/)). Or **export the body alone**
and model a garment from nothing beside it. In Blender, tick Include →
Custom Properties when exporting, so the file still says which body it was
made on.

A mesh's body (a file, the Blender or Quaternius bodies) has a tailor and a
wardrobe of its own: a garment cut or imported on it is worn on that body
only, and MakeHuman's clothes are MakeHuman's. Its **surfaces** (under the
source, on the Body tab) set each of the file's materials **as made** (its
textures, metal, glass) or in the
**skin**. Rig a tail before cutting round the hips: cloth is not cut from a
tail's skin.

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
