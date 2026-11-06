/*#
# character

**A character from its settings, ready to animate.** The
[character builder](/character-builder/) is a panel over this: what it sets is
a character's SETTINGS (a body, a skin, hair, clothes, a face, a rig), and
`makeCharacter` turns them into a dressed, rigged body in a scene. The same
settings, read from a [character file](/character-file/), make the same
character anywhere: a game puts it under a biped and plays clips on it.

## Demo

```js
import { b3d, b3dBiped, b3dSun, b3dLight, b3dGround, inputFocus, ualAnimationStates } from 'tosijs-3d'

preview.append(
  b3d(
    { style: 'width:100%;height:100%', gamepad: 'left_stick,right_stick' },
    b3dSun({ timeOfDay: 15, shadowTextureSize: 2048 }),
    b3dLight({ intensity: 0.5 }),
    b3dGround({ width: 40, height: 40, color: '#5d6672' }),
    inputFocus(
      b3dBiped({
        character: '/characters/casual.character.json',
        animationStates: ualAnimationStates(),
        player: true,
        cameraType: 'follow',
      })
    )
  )
)
```
```css
tosi-b3d { width: 100%; height: 100%; }
```

A character file exported from the [character builder](/character-builder/)
(**export JSON**), walking under a `<tosi-b3d-biped character="…">`: move with
WASD or the left stick, look with the mouse or the right stick. The biped
makes the character from the file and retargets UAL's clips onto it, so its
states are UAL's (`ualAnimationStates`). Making it takes a few seconds: the
body's skin is bound when it is made.

## In code

```
const assets = await loadCharacterAssets(scene)
const character = await makeCharacter(scene, assets, {
  settings: readCharacter(doc).character.settings,
  gaze: () => camera.position,
})
character.root.parent = someNode           // move it by this
const walk = retargetClip(ualWalk, ualSkeleton, character.skeleton, {
  scene, armSpaceDeg: character.recipe?.armSpaceDeg,
})
walk.start(true)
character.set({ smile: 0.6, hair: 'short02' })  // change it live
```

The body is MakeHuman's, shaped by its sliders, or a mesh from a file (a
`source`: Blender's Human Base Meshes, Quaternius' characters, your own),
rigged from its rig recipe (`rigs`, the [rig tool](/rig-tool/)'s) or its own
skin when it is skinned to UAL's skeleton. MakeHuman's body wears MakeHuman's
clothes, hair and face; any body wears the garments made on it
(`addGarment`, from the [tailor](/tailor-tool/) or Blender).

`set(changes)` applies only what changed: a slider reshapes the body, a slot
dresses it again, a colour repaints. The work is in `ready()`.

## The settings

`DEFAULT_CHARACTER` lists them with their defaults: MakeHuman's macro sliders
(`DEFAULT_HUMAN_BODY`), `tone` and `redness` (the skin), `iris` and
`irisColour`, `eyeStyle` (Tonio's eye art, `basic` or `anime`, or `drawn` in
code), `stubble`, the hair (`hair`, `beard`, `moustache`, `brows`,
`hairBase`, `hairHighlight`, and `hairUp`, `hairForward`, `hairSize` to
nudge it), one setting per clothes slot (`CHARACTER_SLOTS`, a garment's name
or `none`), the face (`smile`, `browsUp`, `frown`, and `blink`, `talk`),
`source` (`MakeHuman` or a mesh's name), `rigs` (each mesh's rig recipe) and
`surfaces` (each mesh's materials, `as made` or `skin`). `hideClothes` takes
everything worn off for a moment (the tailor's "hide other clothes").

Each slot's material is separate (`setCloth(slot, { look, material })`): a
garment's colourway and a material recipe over it.
*/
/*{ "parent": "character-builder" }*/

import * as BABYLON from '@babylonjs/core'
import { loadHumanPack, type HumanPack } from './human-pack.js'
import { macroWeights, morphHuman, DEFAULT_HUMAN_BODY } from './human-morph.js'
import { humanBodyMaker, bodyDetailProxy } from './human-rig.js'
import { skinMaterial } from './character-builder.js'
import {
  lipTint,
  stubbleMask as stubbleMask_,
  stubbleTint,
} from './skin-paint.js'
import {
  humanFace,
  bodyEyes,
  eyeGaze,
  eyeTexture,
  eyeMaterial,
  lashMaterial,
  type EyeTextureStyle,
} from './human-face.js'
import { eyeStyle } from './eye-art.js'
import {
  loadHairLibrary,
  headScalp,
  hairMaterial,
  humanHair,
  type HairLibrary,
} from './human-hair.js'
import { skinThinness } from './skin-shading.js'
import { vertexNormals } from './hair-fit.js'
import {
  nearestWeights,
  fitProxy,
  drawnPositions,
  underCover,
  inflate,
  proxyDelta,
  smoothUnder,
} from './proxy-fit.js'
import { skinAlbedo } from './skin-tone.js'
import { humanProxy, proxyMaterial, coverBody } from './human-proxy.js'
import { hairShading } from './hair-shading.js'
import { clothShading, clothRecipe } from './cloth-shading.js'
import {
  faceDeltas,
  humanExpressions,
  blinker,
  lidsFollow,
  babble,
  type HumanExpressions,
} from './human-expression.js'
import { readSkeleton, type ReadSkeleton } from './retarget-babylon.js'
import { bindGarment } from './garment-bind.js'
import { readGarment, garmentRigidity } from './garment-file.js'
import {
  loadRigTriangles,
  loadSkinnedBody,
  buildBody,
  soleVertices,
  lowestOf,
  surfaceMaterial,
  type BuiltBody,
} from './rig-build.js'
import { bodyFromMarkers, lidBlink, type RiggedBody } from './rigged-body.js'
import { applyRigRecipe } from './rig-recipe-babylon.js'
import type { RigRecipe } from './rig-recipe.js'
import type { HandMode } from './rig-fit.js'
import { assetUrl } from './asset-url.js'
import type { SlotLook } from './character-file.js'
import {
  CHARACTER_SLOTS,
  DEFAULT_CHARACTER,
  hm08PackUrl,
} from './character-settings.js'

export { CHARACTER_SLOTS, DEFAULT_CHARACTER } from './character-settings.js'

/** A character's `eyeStyle` setting as an eye texture's style. */
const eyeLook = (v: unknown): EyeTextureStyle =>
  v === 'drawn' ? 'drawn' : eyeStyle(v)

/** Where a mesh's body comes from: a URL or a file, and the node to take. */
export interface CharacterSource {
  url?: string
  file?: File
  pick?: string
  /** Its rig, when none is saved for it: hand-placed markers, say. */
  recipe?: Partial<RigRecipe>
}

// A hosted body: its URL is read when it is used, after the page has set
// the asset base (computed at import, it came out relative to the page).
const hosted = (
  path: string,
  pick?: string,
  recipe?: Partial<RigRecipe>
): CharacterSource => ({
  get url() {
    return assetUrl(path)
  },
  ...(pick != null ? { pick } : {}),
  ...(recipe != null ? { recipe } : {}),
})

/**
 * A rig placed by hand in the rig tool, as a body's default: the five front
 * markers on the left (chin, groin, wrist, elbow, knee; mirrored to the
 * right) and any joints moved by hand, also on the left and mirrored, and
 * any on the centre line (a neck) as they are; `hands` how much hand is
 * rigged (a glove is a mitten: its thumb and middle finger are enough).
 */
function bindFrom(
  [chin, groin, wrist, elbow, knee]: Array<[number, number]>,
  joints: Record<string, [number, number, number]> = {},
  centre: Record<string, [number, number, number]> = {},
  hands?: HandMode
): Partial<RigRecipe> {
  const at = ([x, y]: [number, number], s = 1) => ({ x: x * s, y })
  const moved: Record<string, { x: number; y: number; z: number }> = {}
  for (const [name, [x, y, z]] of Object.entries(centre))
    moved[name] = { x, y, z }
  for (const [name, [x, y, z]] of Object.entries(joints)) {
    moved[`${name}_l`] = { x, y, z }
    moved[`${name}_r`] = { x: -x, y, z }
  }
  return {
    binding: {
      markers: {
        chin: at(chin),
        groin: at(groin),
        wristL: at(wrist),
        wristR: at(wrist, -1),
        elbowL: at(elbow),
        elbowR: at(elbow, -1),
        kneeL: at(knee),
        kneeR: at(knee, -1),
      },
      tail: null,
      joints: moved,
      ...(hands != null ? { hands } : {}),
    },
  } as Partial<RigRecipe>
}

/**
 * Tonio's AI-generated characters (CC0, `tonio/ai` on the asset CDN): one
 * mesh each, unrigged, rigged from markers placed by hand where a recipe is
 * given here, else guessed off their outline.
 */
export const AI_CHARACTER_SOURCES: Record<string, CharacterSource> = {
  'african-american-female': hosted(
    'tonio/ai/african-american-female-10k.glb',
    undefined,
    bindFrom(
      [
        [0, 0.6107],
        [0, -0.1016],
        [0.4565, 0.0243],
        [0.3338, 0.206],
        [0.1177, -0.4581],
      ],
      {
        thumb_01: [0.4798, 0.0089, 0.071],
        thumb_02: [0.4555, -0.0154, 0.0883],
        thumb_03: [0.4558, -0.039, 0.0986],
        thumb_04_leaf: [0.4571, -0.0542, 0.1083],
        index_01: [0.5017, -0.0296, 0.0698],
        index_02: [0.512, -0.0638, 0.0728],
        index_03: [0.5174, -0.0871, 0.0746],
        index_04_leaf: [0.5246, -0.1041, 0.0767],
        middle_03: [0.5227, -0.0987, 0.054],
        middle_04_leaf: [0.5309, -0.1203, 0.0561],
        ring_03: [0.5211, -0.0936, 0.0299],
        ring_04_leaf: [0.5271, -0.1136, 0.0316],
      }
    )
  ),
  'african-american-female-spacesuit': hosted(
    'tonio/ai/african-american-female-spacesuit-10k.glb',
    undefined,
    bindFrom(
      [
        [0, 0.5879],
        [0, -0.22],
        [0.4761, 0.0743],
        [0.3273, 0.2678],
        [0.1397, -0.5268],
      ],
      {
        clavicle: [0.0297, 0.4345, 0.0038],
        upperarm: [0.1958, 0.4719, -0.0164],
        thumb_01: [0.4756, 0.0702, 0.1598],
        thumb_02: [0.476, 0.0518, 0.1852],
        thumb_03: [0.4773, 0.0269, 0.2042],
        thumb_04_leaf: [0.4775, 0.0037, 0.2148],
        middle_01: [0.5366, 0.0429, 0.1344],
        middle_02: [0.549, 0.005, 0.1591],
        middle_03: [0.551, -0.0291, 0.17],
        middle_04_leaf: [0.5501, -0.059, 0.1792],
      },
      { neck_01: [0.0011, 0.4738, 0.0212] },
      'mitten'
    )
  ),
  'eurasian-male': hosted(
    'tonio/ai/eurasian-male-10k.glb',
    undefined,
    bindFrom(
      [
        [0, 0.6324],
        [0, -0.1614],
        [0.5217, 0.105],
        [0.3631, 0.2801],
        [0.1217, -0.4923],
      ],
      {
        thumb_01: [0.5421, 0.0598, 0.0834],
        thumb_02: [0.5399, 0.0357, 0.0961],
        thumb_03: [0.5407, 0.0149, 0.105],
        thumb_04_leaf: [0.5397, 0.0033, 0.1169],
      }
    )
  ),
  'eurasian-male-spacesuit': hosted(
    'tonio/ai/eurasian-male-spacesuit-10k.glb',
    undefined,
    {
      armSpaceDeg: -1,
      ...bindFrom(
        [
          [0, 0.5937],
          [0, -0.2082],
          [0.4971, 0.0854],
          [0.3628, 0.2618],
          [0.1484, -0.5198],
        ],
        {
          thumb_01: [0.4974, 0.0666, 0.1361],
          thumb_02: [0.4914, 0.0479, 0.157],
          thumb_03: [0.4871, 0.028, 0.1682],
          thumb_04_leaf: [0.4866, 0.0039, 0.1737],
          middle_01: [0.5402, 0.0395, 0.0991],
          middle_02: [0.55, 0.0002, 0.1135],
          middle_03: [0.5571, -0.0295, 0.1183],
          middle_04_leaf: [0.5586, -0.0559, 0.1235],
        },
        {},
        'mitten'
      ),
    }
  ),
}

/** The bodies a character can have besides MakeHuman's. */
export const CHARACTER_SOURCES: Record<string, CharacterSource> = {
  ...AI_CHARACTER_SOURCES,
  'Blender: female, realistic': hosted(
    'blender/human-base-meshes/body-female-realistic.glb'
  ),
  'Blender: male, realistic': hosted(
    'blender/human-base-meshes/body-male-realistic.glb'
  ),
  'Quaternius: superhero, male': hosted(
    'quaternius/libraries/characters-superhero-male.glb',
    'Superhero_Male_FullBody'
  ),
  'Quaternius: superhero, female': hosted(
    'quaternius/libraries/characters-superhero-female.glb',
    'Superhero_Female_FullBody'
  ),
}

/** What every character in a scene shares: MakeHuman's pack, the hair. */
export interface CharacterAssets {
  pack: HumanPack
  hair: HairLibrary
}

/** Load the pack and the hair library (once per scene). */
export async function loadCharacterAssets(
  scene: BABYLON.Scene,
  options: { pack?: string; hair?: string } = {}
): Promise<CharacterAssets> {
  const [pack, hair] = await Promise.all([
    loadHumanPack(options.pack ?? hm08PackUrl()),
    loadHairLibrary(
      scene,
      options.hair ?? assetUrl('quaternius/libraries/hairstyles.glb', 2)
    ),
  ])
  return { pack, hair }
}

/** What is on show: the body, built, and what it was made from. */
export interface ShownBody {
  /** `MakeHuman` or a mesh's name. */
  source: string
  body: RiggedBody
  built: BuiltBody
  /** Its rig recipe (springs, arm space), when it has one. */
  recipe: RigRecipe | null
}

export interface CharacterOptions {
  settings?: Record<string, any>
  /** Each slot's look and material (default: as made, cotton). */
  cloth?: Record<string, SlotLook>
  /** Bodies besides MakeHuman's, by name (default `CHARACTER_SOURCES`). */
  sources?: Record<string, CharacterSource>
  /** Garment files (GLB bytes) it may wear, by name. */
  garments?: Iterable<Uint8Array>
  /**
   * Built out of sight: `root` starts disabled, so nothing is seen while the
   * body is made, rigged and dressed at the origin. Enable `root` when it is
   * where it belongs.
   */
  hidden?: boolean
  /** Where the eyes look (none: ahead). */
  gaze?: () => BABYLON.Vector3 | null
  /** What it is doing, for a loading message (false: done). */
  handleStatus?: (message: string | false) => void
  /** The body on show changed (another source, reshaped, rigged again). */
  handleShown?: (shown: ShownBody | null) => void
  /** Called for every mesh it adds, to register shadows and the like. */
  handleMeshes?: (meshes: BABYLON.AbstractMesh[]) => void
}

/** A garment of your own, as the character holds it. */
export interface CharacterGarment {
  name: string
  slot: string
  /** `MakeHuman` or the mesh's body it was made on. */
  source: string
  bytes: Uint8Array
  meta: any
  cut?: any
  look?: any
}

export interface SceneCharacter {
  /** Move, turn and parent the character by this. It stands on y = 0. */
  readonly root: BABYLON.TransformNode
  /** The current settings (a copy). */
  readonly settings: Record<string, any>
  /** Change settings: only what changed is applied. */
  set(changes: Record<string, any>): void
  /** Resolves when every change so far has been applied. */
  ready(): Promise<void>
  /** A slot's look and material. */
  cloth(slot: string): SlotLook
  setCloth(slot: string, look: Partial<SlotLook>): void
  /** The choices each setting has: hair, beards, brows and each slot. */
  choices(key: string): string[]
  /** The body on show (null while one is being rigged, or when it failed). */
  readonly shown: ShownBody | null
  /** Its skeleton, read for `retargetClip`. */
  readonly skeleton: ReadSkeleton | null
  /** Its rig recipe, when it has one. */
  readonly recipe: RigRecipe | null
  /** The face's expression layers (MakeHuman's body). */
  readonly expressions: HumanExpressions
  /** Garments of your own. */
  readonly garments: Map<string, CharacterGarment>
  addGarment(bytes: Uint8Array): Promise<CharacterGarment>
  forgetGarment(name: string): void
  /** Bodies besides MakeHuman's, by name. */
  readonly sources: Record<string, CharacterSource>
  /** Add (or replace) a body source; its loaded copy is dropped. */
  addSource(name: string, source: CharacterSource): void
  /** Take a body rigged elsewhere (the rig tool) as this source's. */
  adopt(name: string, body: RiggedBody, recipe: RigRecipe): void
  /** Hide what is on show (while a tool shows the body its own way). */
  hide(hidden: boolean): void
  /** A mesh's body's materials, each `as made` or `skin` (none for MakeHuman's). */
  surfaces(): Array<{ name: string; choice: string }>
  /** Dress the body on show again (a garment's file changed). */
  redress(): void
  /** How far to raise `root` so the soles touch y = 0 while `clip` plays. */
  groundFor(clip: BABYLON.AnimationGroup | null): number
  /** Why the body on show could not be made, if it could not. */
  readonly problem: string
  /** MakeHuman's body as it is (every pack vertex, helpers too). */
  readonly human: { pack: HumanPack; positions: Float32Array } | null
  dispose(): void
}

const plain = (v: any) => JSON.parse(JSON.stringify(v))
const linearHex = (hex: string) => {
  const n = parseInt(hex.slice(1, 7), 16)
  const lin = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  return {
    r: lin(((n >> 16) & 255) / 255),
    g: lin(((n >> 8) & 255) / 255),
    b: lin((n & 255) / 255),
  }
}
// A saved look: a material recipe, or the fabric, colour and recolour saved before recipes.
const lookRecipe = (look: any): any => look?.material ?? clothRecipe(look ?? {})
// How far a hat is pushed out from the skull, over the hair (metres).
const HAT_LIFT = 0.012

/**
 * Make a character in a scene from its settings. Resolves once the body is
 * built and dressed.
 */
export async function makeCharacter(
  scene: BABYLON.Scene,
  assets: CharacterAssets,
  options: CharacterOptions = {}
): Promise<SceneCharacter> {
  const { pack, hair: hairLib } = assets
  const SLOTS: readonly string[] = CHARACTER_SLOTS
  const s: Record<string, any> = {
    ...plain(DEFAULT_CHARACTER),
    ...plain(options.settings ?? {}),
  }
  const sources: Record<string, CharacterSource> = {
    ...(options.sources ?? CHARACTER_SOURCES),
  }
  const status = (m: string | false) => options.handleStatus?.(m)
  const register = (meshes: BABYLON.AbstractMesh[]) =>
    options.handleMeshes?.(meshes)
  const cloth: Record<string, SlotLook> = Object.fromEntries(
    SLOTS.map((slot) => [
      slot,
      options.cloth?.[slot]
        ? plain(options.cloth[slot])
        : {
            look: 'as made',
            material: clothRecipe({
              fabric: slot === 'shoes' ? 'leather' : 'cotton',
              colour: '#7a2e2e',
              recolour: 0,
            }),
          },
    ])
  )
  const madeHuman = () => s.source === 'MakeHuman'
  let disposed = false
  // The work in hand: changes are applied one after another.
  let work: Promise<void> = Promise.resolve()
  const queue = (fn: () => any) => {
    work = work.then(fn).catch((e) => console.warn('character:', e))
    return work
  }

  /*
  THE CHOICES: MakeHuman's own hair, brows, beards and clothes first (drawn
  for this body and bound to it), Quaternius' hairstyles after (fitted).
  */
  const proxies: Record<string, any> = pack.manifest.proxies ?? {}
  const kinds = (cat: string, test: (n: string) => boolean) =>
    Object.keys(proxies).filter((n) => proxies[n].category === cat && test(n))
  const adult = (n: string) => !n.endsWith('_Teen')
  const facial = (n: string) => /Beard|Moustache|MuttonChops/.test(n)
  const styles: Record<string, string[]> = {
    hair: [
      'none',
      ...kinds('hair', () => true),
      ...hairLib.names('hair').filter((n) => adult(n) && !facial(n)),
    ],
    // MakeHuman's beards come without moustaches: a moustache is its own
    // choice. Quaternius' are drawn for its own stylised mouth.
    beard: ['none', ...kinds('beard', (n) => !/moustache/i.test(n))],
    moustache: ['none', ...kinds('beard', (n) => /moustache/i.test(n))],
    brows: [
      'none',
      ...kinds('eyebrows', () => true),
      ...hairLib.names('eyebrows').filter(adult),
    ],
  }
  for (const slot of SLOTS)
    styles[slot] = [
      'none',
      ...Object.keys(proxies).filter((n) => proxies[n].slot === slot),
    ]

  /*
  MATERIALS: one per worn thing and colourway, shared; clothes take a
  fabric and a recolour, hair the hair colours.
  */
  const proxyMaterials = new Map<string, BABYLON.Material>()
  const clothes = new Map<BABYLON.Material, any>()
  const slotMaterial: Record<string, BABYLON.Material> = {}
  const refabric = () => {
    for (const [slot, m] of Object.entries(slotMaterial))
      clothes.get(m)?.set({ recipe: cloth[slot].material })
  }
  const shades: any[] = []
  const tints = new Map<any, BABYLON.Material>()
  const tint = (part: any) => {
    const from = part.material
    if (!tints.has(from)) {
      const m = hairMaterial(scene, from, `hair-${tints.size}`)
      shades.push(
        hairShading(m as any, { base: s.hairBase, highlight: s.hairHighlight })
      )
      tints.set(from, m)
    }
    return tints.get(from)!
  }
  const garmentMaterial = (proxy: any, slot: string | null) => {
    const look =
      slot && cloth[slot].look !== 'as made' ? cloth[slot].look : undefined
    const key = `${proxy.name}:${look ?? ''}`
    if (!proxyMaterials.has(key)) {
      const m = proxyMaterial(scene, proxy, look)
      if (['hair', 'eyebrows', 'beard'].includes(proxy.category))
        shades.push(
          hairShading(m, {
            desaturate: true,
            base: s.hairBase,
            highlight: s.hairHighlight,
          })
        )
      else if (proxy.category === 'clothes') clothes.set(m, clothShading(m))
      proxyMaterials.set(key, m)
    }
    const m = proxyMaterials.get(key)!
    // The cache is by name: a tailored garment turns skirt (two-sided) on and off.
    m.backFaceCulling = !proxy.material?.twoSided
    ;(m as any).twoSidedLighting = proxy.material?.twoSided === true
    if (slot) slotMaterial[slot] = m
    return m
  }

  /*
  GARMENTS OF YOUR OWN: a file each. One made on MakeHuman's body is bound to
  it (on the slider values it was made on, when the file says); one made on
  a mesh's body is bound to that body when it is shown.
  */
  const garments = new Map<string, any>()
  const imageUrl = (img: any) =>
    img
      ? URL.createObjectURL(new Blob([img.bytes], { type: img.mimeType }))
      : undefined
  const fileLook = (m: any) =>
    m
      ? {
          diffuse: imageUrl(m.baseColorTexture),
          normal: imageUrl(m.normalTexture),
          metallicRoughness: imageUrl(m.metallicRoughnessTexture),
          roughness: m.roughness,
          metallic: m.metallic,
          baseColor: m.baseColor,
          normalScale: m.normalScale,
          alpha: m.alphaMode !== 'OPAQUE',
          blend: m.alphaMode === 'BLEND',
          alphaCutoff: m.alphaMode === 'MASK' ? m.alphaCutoff : undefined,
          twoSided: m.doubleSided,
        }
      : { alpha: false, twoSided: false }
  const proxyFrom = (
    binding: any,
    content: any,
    name: string,
    slot: string
  ) => {
    const { garment, meta, material } = content
    return {
      ...binding,
      triangles: garment.triangles,
      uvs: garment.uvs ?? new Float32Array(binding.rows * 2),
      delete: null,
      name,
      category: 'clothes',
      slot,
      material: {
        ...fileLook(material),
        ...(meta?.cut?.skirt || meta?.cut?.drape ? { twoSided: true } : {}),
      },
    }
  }
  const proxyOn = (g: any, r: any) => {
    if (!g.bound.has(r)) {
      const { garment } = g.content
      g.bound.set(
        r,
        proxyFrom(
          bindGarment(
            r.body.positions,
            r.body.indices,
            garment.positions,
            garmentRigidity(garment)
          ),
          g.content,
          g.name,
          g.slot
        )
      )
    }
    return g.bound.get(r)
  }
  const addGarment = async (bytes: Uint8Array) => {
    const content = readGarment(bytes)
    const meta = content.meta ?? ({} as any)
    const name = meta.name ?? 'garment'
    const slot = SLOTS.includes(meta.slot) ? meta.slot : 'top'
    const source = meta.source ?? 'MakeHuman'
    proxyMaterials.delete(`${name}:`)
    let proxy = null
    if (source === 'MakeHuman') {
      const on = meta.body
        ? await morphHuman(
            pack,
            macroWeights({ ...DEFAULT_HUMAN_BODY, ...meta.body }, (n) =>
              pack.has(n)
            )
          )
        : current
      const { garment } = content
      proxy = proxyFrom(
        bindGarment(
          on,
          pack.triangles,
          garment.positions,
          garmentRigidity(garment)
        ),
        content,
        name,
        slot
      )
      if (!styles[slot].includes(name)) styles[slot].push(name)
    }
    const g = {
      name,
      slot,
      source,
      proxy,
      content,
      bound: new WeakMap(),
      bytes: new Uint8Array(bytes),
      meta,
      cut: meta.cut,
      look: meta.look,
    }
    garments.set(name, g)
    return g as CharacterGarment
  }
  // A garment of your own worn in a slot, if it was made on the body shown.
  const ownIn = (slot: string) => {
    const g = garments.get(s[slot])
    return g && g.source === s.source ? g : null
  }

  /*
  MAKEHUMAN'S BODY: shaped by the sliders, with weights bound once on the
  first shape (they depend only on the topology).
  */
  status('binding the skin…')
  // Let a message paint before the binding takes the thread.
  await new Promise((r) => setTimeout(r, 50))
  const [lips, nipples, eyePart, lashPart] = await Promise.all([
    pack.region('lips'),
    pack.region('nipples'),
    pack.part('eyes'),
    pack.part('eyelashes'),
  ])
  const eyes = eyeTexture(scene, { iris: s.iris, style: eyeLook(s.eyeStyle) })
  eyes.setIrisColour(s.irisColour)
  const faceMaterials = {
    eye: eyeMaterial(scene, eyes),
    lashes: lashMaterial(scene),
  }
  const sliders = () =>
    Object.fromEntries(
      Object.keys(DEFAULT_HUMAN_BODY).map((k) => [k, Number(s[k])])
    )
  /*
  BODY DETAIL: the skin drawn is MakeHuman's base mesh or a lighter proxy
  over it (human-rig's `bodyDetailProxy`, picked by the detail and which way
  the gender leans). A new skin is bound again; the rest follows from it.
  */
  let maker: any = null
  let skin: any = null
  let thin: Float32Array = new Float32Array(0)
  let allWeights: any = null
  let detailOf: string | null | undefined
  const detailed = async () => {
    const want = bodyDetailProxy(s.bodyDetail ?? 'full', Number(s.gender))
    if (maker != null && want === detailOf) return
    const proxy = want != null ? await pack.proxy(want) : null
    maker = await humanBodyMaker(pack, sliders(), { proxy })
    detailOf = want
    skin = maker.skin
    const first = maker.first.full
    // How thin the body is at each vertex (ears, nose, fingers), for the
    // skin's back-light: once per skin, like the weights.
    const firstSkin = skin.positions(first)
    thin = skinThinness(firstSkin, vertexNormals(firstSkin, skin.triangles))
    // Weights for every pack vertex, so clothes bound to helper vertices (the
    // tights and skirt shells, which carry no skin) bend too.
    const known = new Int32Array(pack.manifest.vertexCount).fill(-1)
    skin.vertices.forEach((v: number, i: number) => {
      known[v] = i
    })
    allWeights = nearestWeights(first, known, maker.weights)
  }
  await detailed()
  let current: Float32Array = maker.first.full
  // What clothes are fitted over: the body with its nipples smoothed,
  // because cloth bridges them (the skin keeps them).
  const smoothed = (p: Float32Array) =>
    nipples ? smoothUnder(p, pack.triangles, nipples) : p
  let clothBody = smoothed(current)
  let human: RiggedBody | null = null
  let built: any = null
  let face: any = null
  let scalp: any = null
  let hairMeshes: BABYLON.AbstractMesh[] = []

  // The face: MakeHuman's face pose units as morph targets, in layers.
  const expressions = humanExpressions(scene, await faceDeltas(pack))
  let stopBlink: (() => void) | null = null
  // Bodies with lids made from their shape blink with the same timer.
  const lidded = new Set<any>()
  const blinking = () => {
    stopBlink?.()
    stopBlink = s.blink ? blinker(scene, expressions) : null
    for (const r of lidded) {
      r.stopBlink?.()
      r.stopBlink = s.blink ? blinker(scene, r.lids) : null
    }
  }
  blinking()
  const stopLids = lidsFollow(scene, expressions, () => face)
  let stopTalk: (() => void) | null = null
  const talking = () => {
    stopTalk?.()
    stopTalk = s.talk ? babble(scene, expressions) : null
  }
  talking()
  const mood = expressions.layer('mood')
  const feel = () => {
    const { smile: sm, browsUp: b, frown: f } = s
    mood.setMany({
      MouthLeftPullUp: sm,
      MouthRightPullUp: sm,
      LeftCheekUp: sm * 0.6,
      RightCheekUp: sm * 0.6,
      LeftOuterBrowUp: b,
      RightOuterBrowUp: b,
      LeftInnerBrowUp: b,
      RightInnerBrowUp: b,
      LeftBrowDown: f,
      RightBrowDown: f,
    })
  }
  feel()
  // Whose eyes look (set once what is shown is known; frames run before that).
  let eyesShown: () => any = () => face
  const stopGaze = eyeGaze(
    scene,
    // The shown body's eyes: MakeHuman's, or a file's own eyeballs.
    {
      get eyes() {
        return eyesShown()?.eyes ?? []
      },
      get forward() {
        return eyesShown()?.forward ?? []
      },
    } as any,
    () => options.gaze?.() ?? null
  )

  /*
  THE SKIN: its colour from two dials, the lips as vertex colours over it,
  and stubble where a full beard grows.
  */
  const mat = skinMaterial(scene, { tone: s.tone, redness: s.redness })
  let stubbleMask: Float32Array | null = null
  const proxyNamed = (re: RegExp) =>
    Object.keys(proxies).find((n) => re.test(n))
  const beardFor = proxyNamed(/scruffy_beard/)
  const tacheFor = proxyNamed(/moustache/)
  const paint = () => {
    mat.setSkin(s.tone, s.redness)
    if (lips && built) {
      const colours = lipTint(skin, lips, s.tone, s.redness, undefined, thin)
      if (stubbleMask)
        stubbleTint(
          colours,
          stubbleMask,
          s.stubble,
          skinAlbedo(s.tone, s.redness),
          linearHex(s.hairBase)
        )
      built.mesh.setVerticesData('color', colours)
    }
  }
  const measureStubble = async () => {
    if (!beardFor || !current) return
    const body = skin.positions(current)
    const normals = vertexNormals(body, skin.triangles)
    const drawn = async (name: string) => {
      const p = (await pack.proxy(name))!
      return drawnPositions(p, fitProxy(p, current!))
    }
    stubbleMask = stubbleMask_({
      skin: body,
      normals,
      vertices: skin.vertices,
      positions: current,
      lips: lips!,
      beard: await drawn(beardFor),
      tache: tacheFor ? await drawn(tacheFor) : null,
    })
    paint()
  }

  /*
  DRESSING MAKEHUMAN'S BODY: what it wears from the pack and of your own,
  bound; hair fitted from Quaternius' heads; a hat tucks the hair under it;
  the skin under clothes is tucked in.
  */
  let sole = 0
  let dressing = 0
  const dress = async () => {
    if (!built || !scalp) return
    const token = ++dressing
    const names = [
      ...[...SLOTS, 'hair', 'brows', 'beard', 'moustache'].map((k) => s[k]),
      'teeth_base',
      'tongue01',
    ].filter((n) => proxies[n] || garments.get(n)?.proxy)
    let wearing: any[] = await Promise.all(
      names.map((n) =>
        garments.has(n) ? garments.get(n).proxy : pack.proxy(n)
      )
    )
    if (token !== dressing || disposed) return
    if (s.hideClothes) wearing = wearing.filter((p) => p.category !== 'clothes')
    for (const m of hairMeshes) m.dispose()
    hairMeshes = []
    const nudge = { y: s.hairUp, z: s.hairForward, scale: s.hairSize }
    for (const key of ['hair', 'beard', 'moustache', 'brows']) {
      const parts = hairLib.piece(s[key])
      if (!parts) continue
      // Brows and beards follow the face; hair follows the skull.
      const style = s[key]
      hairMeshes.push(
        ...humanHair(scene, built, built.rig, scalp, parts, tint, {
          name: key,
          on: hairLib.fitFor(style),
          head: hairLib.headFor(style),
          centreY: key === 'brows' ? scalp.brow : undefined,
          nudge: key === 'hair' ? nudge : undefined,
        })
      )
    }
    for (const k of Object.keys(slotMaterial)) delete slotMaterial[k]
    for (const proxy of wearing) {
      const slot = SLOTS.find((k) => s[k] === proxy.name) ?? null
      const m = garmentMaterial(proxy, slot)
      // A hat sits a little out from the head, over the hair.
      const fit =
        slot === 'hat'
          ? { inflate: { centre: scalp.centre, by: HAT_LIFT } }
          : slot === 'armour'
          ? { lift: 0.005 }
          : {}
      const mesh = humanProxy(
        scene,
        built,
        proxy,
        clothBody,
        allWeights,
        m,
        fit
      )
      mesh.metadata = { category: proxy.category }
      hairMeshes.push(mesh)
    }
    // A hat hides the hair under its brim, or the hair pokes through it.
    const hat = wearing.find((p) => p.name === s.hat)
    if (hat) {
      const crown = inflate(
        drawnPositions(hat, fitProxy(hat, current)),
        scalp.centre,
        HAT_LIFT
      )
      const at = built.rig.at('Head')
      for (const mesh of hairMeshes) {
        const isHair =
          mesh.name.startsWith('hair-') || mesh.metadata?.category === 'hair'
        if (!isHair || !(mesh instanceof BABYLON.Mesh)) continue
        // Quaternius' hair hangs on the head, in its frame less the head joint.
        const p = Float32Array.from(mesh.getVerticesData('position')!)
        if (mesh.name.startsWith('hair-'))
          for (let i = 0; i < p.length; i += 3) {
            p[i] += at.x
            p[i + 1] += at.y
            p[i + 2] += at.z
          }
        const tucked = Float32Array.from(p)
        mesh.setIndices(
          Array.from(underCover(crown, p, mesh.getIndices()!, 24, tucked))
        )
        if (mesh.name.startsWith('hair-'))
          for (let i = 0; i < tucked.length; i += 3) {
            tucked[i] -= at.x
            tucked[i + 1] -= at.y
            tucked[i + 2] -= at.z
          }
        mesh.setVerticesData('position', tucked, true)
      }
    }
    refabric()
    // Stand on the soles: shoes reach below the bare foot by their sole.
    const shoe = wearing.find((p) => p.name === s.shoes)
    sole = 0
    if (shoe) {
      const fitted = fitProxy(shoe, current)
      let low = Infinity
      for (let i = 1; i < fitted.length; i += 3) low = Math.min(low, fitted[i])
      sole = Math.max(0, built.rig.at('root').y - low)
    }
    // Skin under clothes is hidden, so it cannot show through: the garments
    // as fitted, for the skin they cover but do not list.
    const drawn = new Map(
      wearing
        .filter((p) => p.category === 'clothes')
        .map((p) => [p.name, drawnPositions(p, fitProxy(p, clothBody))])
    )
    coverBody(built, skin.triangles, skin.vertices, wearing, { drawn })
    // Everything that moves with the face, after the tuck (its rest).
    expressions.attach(built.mesh, (d: Float32Array) => skin.deltas(d))
    for (const m of face?.meshes ?? []) {
      const pv = m.metadata?.packVertices
      // The eyeballs turn; they never deform.
      if (!pv || m.name.startsWith('eye_')) continue
      expressions.attach(m, (d: Float32Array) => {
        const out = new Float32Array(pv.length * 3)
        for (let i = 0; i < pv.length; i++) {
          out[i * 3] = d[pv[i] * 3]
          out[i * 3 + 1] = d[pv[i] * 3 + 1]
          out[i * 3 + 2] = d[pv[i] * 3 + 2]
        }
        return out
      })
    }
    for (const proxy of wearing) {
      const mesh = hairMeshes.find((m) => m.name === `proxy-${proxy.name}`)
      if (mesh)
        expressions.attach(mesh as BABYLON.Mesh, (d: Float32Array) =>
          proxyDelta(proxy, d)
        )
    }
    register(hairMeshes)
    placeRoot()
  }

  const root = new BABYLON.TransformNode('character', scene)
  if (options.hidden) root.setEnabled(false)
  // Raised so the soles are on y = 0 (a clip may carry them lower: groundFor).
  const body = new BABYLON.TransformNode('character-body', scene)
  body.parent = root
  let clipLow: number | null = null
  let shownNow: any = null
  const placeRoot = () => {
    if (!shownNow) return
    body.position.y =
      -(clipLow ?? shownNow.rig.at('root').y) + (shownNow === built ? sole : 0)
  }

  const rebuild = async () => {
    await detailed()
    const made = await maker.body(sliders())
    if (disposed) return
    const full = made.full
    current = full
    clothBody = smoothed(full)
    stubbleMask = null
    face?.dispose()
    built?.dispose()
    built = buildBody(scene, 'character-human', made)
    human = made
    face = humanFace(
      scene,
      built,
      made.rig,
      pack.manifest,
      full,
      { eyes: eyePart, eyelashes: lashPart },
      faceMaterials
    )
    built.rig = made.rig
    scalp = headScalp(pack.manifest, full, pack.triangles, { lips })
    built.mesh.material = mat
    built.root.parent = body
    register([built.mesh, ...face.meshes])
    await dress()
    if (s.stubble > 0) await measureStubble()
    paint()
    if (madeHuman()) show(built)
    else built.root.setEnabled(false)
  }

  /*
  A MESH'S BODY: its triangles (or its own skin) loaded once, rigged from
  its recipe (the rig tool's markers, else a first guess off its outline),
  kept until the recipe changes. It wears its own materials, or the skin.
  */
  const triangles = new Map<string, any>()
  const skinned = new Map<string, any>()
  const rigged = new Map<string, any>()
  let other: any = null
  let problem = ''
  const recipeOf = (name: string) =>
    plain(s.rigs ?? {})[name] ?? sources[name]?.recipe ?? null
  const rig = async (name: string) => {
    const from = sources[name]
    if (!from) throw new Error('no such body')
    const kept0 = recipeOf(name)
    if (!kept0?.binding) {
      if (!skinned.has(name))
        skinned.set(
          name,
          await loadSkinnedBody(scene, from.file ?? from.url!, {
            pick: from.pick,
          })
        )
      const own = skinned.get(name)
      if (own) return wear(own, kept0, name)
    }
    if (!triangles.has(name))
      triangles.set(
        name,
        await loadRigTriangles(scene, from.file ?? from.url!, {
          pick: from.pick,
        })
      )
    const kept = recipeOf(name)
    const b = kept?.binding
    return wear(
      bodyFromMarkers(triangles.get(name), {
        markers: b?.markers,
        tail: b?.tail,
        tailBase: b?.tailBase,
        joints: b?.joints,
        hands: b?.hands,
        source: name,
      }),
      kept,
      name
    )
  }
  // A rigged body on the stand, with its recipe.
  const wear = (made: RiggedBody, kept: any, name: string) => {
    const r: any = buildBody(scene, `character-${name}`, made)
    r.kept = JSON.stringify(kept)
    r.source = name
    // A body bound from markers carries them in its recipe, so the rig tool
    // binds the same mesh from the same markers; one with its own skin opens
    // on its own skeleton.
    const m: any = made.made
    r.recipe = {
      version: 1,
      roles: {},
      armSpaceDeg: 0,
      springs: [],
      ...kept,
      ...(m.by === 'markers'
        ? {
            binding: {
              markers: m.markers,
              tail: m.tail ?? null,
              ...(m.tailBase ? { tailBase: m.tailBase } : {}),
              ...(m.joints ? { joints: m.joints } : {}),
              ...(m.hands ? { hands: m.hands } : {}),
            },
          }
        : {}),
    }
    dressSurfaces(r)
    // Its own eyeballs, if the file has them: on pivots, in the eye material.
    if (made.eyes?.length) {
      r.face = bodyEyes(scene, r, made.rig, made.eyes, faceMaterials.eye)
      register(r.face.meshes)
      // And lids that close over them, if the skin opens round them: on a
      // body rigged from markers (Blender's base meshes, your own). A file
      // that comes skinned is an artist's character, and Quaternius' big
      // stylised eyes stand proud of the face, so a lid turned over them
      // leaves a line of white.
      const [left, right] =
        made.made.by === 'markers'
          ? made.eyes.map((eye) => lidBlink(made.positions, eye))
          : []
      const units = new Map<string, Float32Array>()
      if (left) units.set('LeftUpperLidClosed', left)
      if (right) units.set('RightUpperLidClosed', right)
      if (units.size) {
        r.lids = humanExpressions(scene, units)
        r.lids.attach(r.mesh, (d: Float32Array) => d)
        r.stopLids = lidsFollow(scene, r.lids, () => r.face)
        r.stopBlink = s.blink ? blinker(scene, r.lids) : null
        lidded.add(r)
      }
    }
    const dispose = r.dispose
    r.dispose = () => {
      lidded.delete(r)
      r.stopBlink?.()
      r.stopLids?.()
      r.lids?.dispose()
      r.face?.dispose()
      r.applied?.dispose()
      r.multi?.dispose(false, false, false)
      for (const c of r.clothes ?? []) c.dispose()
      dispose()
    }
    r.root.parent = body
    r.root.setEnabled(false)
    register([r.mesh])
    return r
  }
  // Each surface as made or in the skin: a plain mesh of one untextured
  // material takes the skin; anything with textures or several materials is
  // shown as made.
  const surfaceChoice = (r: any, surface: any) => {
    const kept = plain(s.surfaces ?? {})[r.source]?.[surface.name]
    if (kept) return kept
    const made = surface.material
    const textured = (made?.getActiveTextures().length ?? 0) > 0
    return made && (textured || r.body.surfaces.length > 1) ? 'as made' : 'skin'
  }
  const dressSurfaces = (r: any) => {
    r.multi?.dispose(false, false, false)
    const m = surfaceMaterial(scene, r.mesh.name, r.body, (surface) =>
      surface?.material && surfaceChoice(r, surface) === 'as made'
        ? (surface.material as BABYLON.Material)
        : mat
    )
    r.multi = m instanceof BABYLON.MultiMaterial ? m : null
    r.mesh.material = m
  }
  // Dressed: the garments made on it, bound to its skin; the skin under them tucked.
  const dressOther = () => {
    const r = other
    if (!r) return
    for (const m of r.clothes ?? []) m.dispose()
    r.clothes = []
    for (const k of Object.keys(slotMaterial)) delete slotMaterial[k]
    const worn = s.hideClothes
      ? []
      : SLOTS.filter((slot) => ownIn(slot)?.slot === slot)
    const wearing = worn.map((slot) => proxyOn(ownIn(slot), r))
    worn.forEach((slot, i) => {
      const mesh = humanProxy(
        scene,
        r,
        wearing[i],
        r.body.positions,
        r.body.weights,
        garmentMaterial(wearing[i], slot),
        slot === 'armour' ? { lift: 0.005 } : {}
      )
      mesh.metadata = { category: 'clothes' }
      r.clothes.push(mesh)
    })
    refabric()
    const drawn = new Map(
      wearing.map((p: any) => [
        p.name,
        drawnPositions(p, fitProxy(p, r.body.positions)),
      ])
    )
    r.everyVertex ??= Uint32Array.from(
      { length: r.body.positions.length / 3 },
      (_, i) => i
    )
    coverBody(r, r.body.indices, r.everyVertex, wearing, { drawn })
    // The lids again, over the tucked skin (a target holds whole positions).
    r.lids?.attach(r.mesh, (d: Float32Array) => d)
    register(r.clothes)
  }
  const hideOther = () => {
    other?.applied?.dispose()
    if (other) other.applied = null
    other?.root.setEnabled(false)
  }

  /*
  WHAT IS ON SHOW, and its skeleton read for clips.
  */
  let read: ReadSkeleton | null = null
  let hidden = false
  const show = (r: any) => {
    shownNow = r
    if (r === built) read = readSkeleton(built.skeleton, built.root)
    else {
      // The recipe's springs (a tail, a ponytail) on the body shown.
      r.applied = applyRigRecipe(scene, r.root, r.skeleton, r.recipe)
      read = r.applied.read
    }
    r.root.setEnabled(!hidden)
    clipLow = null
    placeRoot()
    options.handleShown?.(shown())
  }
  eyesShown = () =>
    shownNow == null ? null : shownNow === built ? face : shownNow.face ?? null
  const shown = (): ShownBody | null =>
    shownNow == null
      ? null
      : shownNow === built
      ? { source: 'MakeHuman', body: human!, built, recipe: null }
      : {
          source: shownNow.source,
          body: shownNow.body,
          built: shownNow,
          recipe: shownNow.recipe,
        }
  let choosing = 0
  const choose = async () => {
    const token = ++choosing
    const name = s.source
    hideOther()
    problem = ''
    if (madeHuman()) {
      other = null
      if (built) {
        await dress()
        show(built)
      }
      return
    }
    built?.root.setEnabled(false)
    shownNow = null
    if (!rigged.has(name)) {
      status(`rigging ${name}…`)
      await new Promise((r) => setTimeout(r, 50))
      try {
        rigged.set(name, await rig(name))
      } catch (e: any) {
        console.warn('character: could not rig', name, e)
        problem = `${name}: ${e?.message ?? e}`
      }
      status(false)
    }
    if (token !== choosing || disposed) return
    other = rigged.get(name) ?? null
    if (!other) {
      options.handleShown?.(null)
      return
    }
    dressOther()
    show(other)
  }
  // A body bound from a recipe that is no longer the character's is bound again.
  const rebind = () => {
    let again = false
    for (const [name, r] of [...rigged]) {
      if (r.kept === JSON.stringify(recipeOf(name))) continue
      if (r === other) {
        hideOther()
        other = null
        again = s.source === name
      }
      r.dispose()
      rigged.delete(name)
    }
    return again ? choose() : undefined
  }

  /*
  CHANGES: each setting to what it touches.
  */
  const BODY = new Set(Object.keys(DEFAULT_HUMAN_BODY))
  const HAIR = new Set([
    'hair',
    'beard',
    'moustache',
    'brows',
    'hairUp',
    'hairForward',
    'hairSize',
  ])
  const dressShown = () => (madeHuman() ? dress() : dressOther())
  const recolour = () => {
    for (const sh of shades) sh.setColours(s.hairBase, s.hairHighlight)
  }
  const set = (changes: Record<string, any>) => {
    const changed = Object.keys(changes).filter(
      (k) => JSON.stringify(s[k]) !== JSON.stringify(changes[k])
    )
    if (!changed.length) return
    for (const k of changed) s[k] = plain(changes[k])
    const has = (k: string) => changed.includes(k)
    // Wearing something new: from its own colourway, a saved garment as saved.
    for (const slot of SLOTS)
      if (has(slot) && s[slot] !== 'none') {
        cloth[slot].look = 'as made'
        const saved = garments.get(s[slot])?.look
        if (saved) cloth[slot].material = lookRecipe(saved)
      }
    if (has('blink')) blinking()
    if (has('talk')) talking()
    if (['smile', 'browsUp', 'frown'].some(has)) feel()
    if (has('iris')) eyes.setIris(s.iris)
    if (has('irisColour')) eyes.setIrisColour(s.irisColour)
    if (has('eyeStyle')) eyes.setStyle(eyeLook(s.eyeStyle))
    if (has('hairBase') || has('hairHighlight')) recolour()
    queue(async () => {
      if (changed.some((k) => BODY.has(k)) || has('bodyDetail')) await rebuild()
      if (has('rigs')) await rebind()
      if (has('surfaces')) for (const r of rigged.values()) dressSurfaces(r)
      if (has('source')) await choose()
      else if (has('hideClothes') || SLOTS.some(has)) await dressShown()
      else if (changed.some((k) => HAIR.has(k))) await dress()
      if (has('stubble') && stubbleMask == null && s.stubble > 0)
        await measureStubble()
      if (['tone', 'redness', 'stubble', 'hairBase'].some(has)) paint()
    })
  }

  await rebuild()
  for (const bytes of options.garments ?? [])
    await addGarment(bytes).catch((e) =>
      console.warn('character: a garment would not load', e)
    )
  if (options.garments) await dress()
  if (!madeHuman()) await choose()
  status(false)

  return {
    root,
    get settings() {
      return plain(s)
    },
    set,
    ready: () => work,
    cloth: (slot) => cloth[slot],
    setCloth(slot, look) {
      const was = cloth[slot].look
      if (look.material) cloth[slot].material = plain(look.material)
      if (look.look != null) cloth[slot].look = look.look
      if (cloth[slot].look !== was) queue(dressShown)
      else refabric()
    },
    choices: (key) =>
      SLOTS.includes(key) && !madeHuman()
        ? [
            'none',
            ...[...garments.values()]
              .filter((g) => g.source === s.source && g.slot === key)
              .map((g) => g.name),
          ]
        : SLOTS.includes(key)
        ? styles[key].filter(
            (n) => (garments.get(n)?.source ?? 'MakeHuman') === 'MakeHuman'
          )
        : styles[key] ?? [],
    get shown() {
      return shown()
    },
    get skeleton() {
      return read
    },
    get recipe() {
      return shownNow && shownNow !== built ? shownNow.recipe : null
    },
    expressions,
    garments,
    async addGarment(bytes) {
      const g = await addGarment(bytes)
      return g
    },
    forgetGarment(name) {
      const g = garments.get(name)
      if (!g) return
      garments.delete(name)
      styles[g.slot] = styles[g.slot].filter((n) => n !== name)
    },
    sources,
    addSource(name, source) {
      sources[name] = source
      // A file opened again: the copy loaded before, its materials with it.
      for (const sf of [
        ...(triangles.get(name)?.surfaces ?? []),
        ...(skinned.get(name)?.surfaces ?? []),
      ])
        sf.material?.dispose(false, true)
      triangles.delete(name)
      skinned.delete(name)
      const old = rigged.get(name)
      if (old) {
        if (old === other) {
          hideOther()
          other = null
        }
        old.dispose()
        rigged.delete(name)
      }
      // The body on show, opened again: shown again from the new file.
      if (s.source === name) queue(choose)
    },
    adopt(name, made, recipe) {
      const old = rigged.get(name)
      if (old) {
        if (old === other) {
          hideOther()
          other = null
        }
        old.dispose()
      }
      s.rigs = { ...plain(s.rigs ?? {}), [name]: plain(recipe) }
      rigged.set(name, wear(made, recipe, name))
      if (s.source === name) queue(choose)
    },
    hide(h) {
      hidden = h
      shownNow?.root.setEnabled(!h)
    },
    surfaces() {
      const r = shownNow && shownNow !== built ? shownNow : null
      // One per material, however many runs of triangles use it.
      const byName = new Map<string, any>()
      for (const sf of r?.body.surfaces ?? [])
        if (sf.material) byName.set(sf.name, sf)
      return [...byName.values()].map((sf) => ({
        name: sf.name,
        choice: surfaceChoice(r, sf),
      }))
    },
    redress: () => {
      queue(dressShown)
    },
    groundFor(clip) {
      /*
      Only a height that was measured. A body swapped mid-change (a rig
      handed back by the rig tool) can be measured after its mesh was
      disposed: no vertices, an infinite lowest point, and the body sent to
      -Infinity, after which every skeleton read under it was NaN and the
      character vanished.
      */
      const low = clip && shownNow ? measureClip(clip) : null
      clipLow = low != null && Number.isFinite(low) ? low : null
      placeRoot()
      return body.position.y
    },
    get problem() {
      return problem
    },
    get human() {
      return { pack, positions: current }
    },
    dispose() {
      disposed = true
      stopBlink?.()
      stopTalk?.()
      stopLids()
      stopGaze()
      for (const m of hairMeshes) m.dispose()
      face?.dispose()
      built?.dispose()
      for (const r of rigged.values()) r.dispose()
      root.dispose()
    },
  }

  // How far below the body's root its soles reach while `group` plays.
  function measureClip(group: BABYLON.AnimationGroup): number | null {
    const r = shownNow
    const mesh = r.mesh
    if (mesh == null || mesh.isDisposed()) return null
    const nodes = r.root.getChildTransformNodes(false)
    // The soles only: a tail on a spring hangs anywhere while sampled.
    r.soles ??= soleVertices(r === built ? human! : r.body)
    let low = Infinity
    for (let k = 0; k < 24; k++) {
      group.goToFrame(group.from + ((group.to - group.from) * k) / 24)
      for (const n of nodes) n.computeWorldMatrix(true)
      r.skeleton.prepare(true)
      if (r.soles.length) low = Math.min(low, lowestOf(mesh, r.soles))
      else {
        mesh.refreshBoundingInfo({ applySkeleton: true, applyMorph: true })
        low = Math.min(low, mesh.getBoundingInfo().boundingBox.minimumWorld.y)
      }
    }
    group.goToFrame(group.from)
    return low - body.position.y - root.getAbsolutePosition().y
  }
}
