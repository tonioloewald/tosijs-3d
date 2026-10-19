/*#
# Rig tool

**Put a character on our animations, give it hair or a tail, and save the
result.** Pick one of the demo characters or load your own GLB. Check which
bone plays which role, hang spring chains on it, and try it with any of the
Universal Animation Library's clips, beside the mannequin they were made on.
Save the recipe: `applyRigRecipe` puts the same rig on the same model in a
game.

```js
import { rigTool } from 'tosijs-3d/rig-tool'

preview.closest('tosi-example')?.style.setProperty('--tosi-example-height', '600px')
preview.append(rigTool())
```

## Using it

The panel has four sections.

- **Model.** A demo character, or `load model file…` for a GLB of your own
  (a single file: a `.gltf` with separate buffers cannot be opened this
  way). A model needs a skeleton; one without can be rigged on the
  [auto-rig](/rig-build/) page first.
- **Roles.** Which bone is the hips, the head, the left forearm, each finger
  joint. They are guessed from the names; pick a role, then the bone that
  plays it, or `(none)` to leave it out. `arm space` turns the arms out
  from the body, for a character whose arms are long for its height.
- **Springs.** `+ strand` hangs a new chain with a tube from a bone (a
  ponytail): place it with `offset`, `yaw` and `pitch`, size it, and tune
  how it swings. `+ bone chain` simulates bones the model already has (a
  tail): pick the chain's first bone. Stiffness and damping change live;
  the rest rebuild the chain.
- **Recipe.** `save` downloads the recipe as JSON, `load` reads one back,
  `copy` puts it on the clipboard. The working recipe is also kept in this
  browser, per model, so a reload does not lose it.

Pick a clip at the top. `compare` shows UAL's mannequin playing the
original beside it; `bones` draws the skeleton.

## A recipe in a game

```
import { applyRigRecipe, readSkeleton, retargetClip } from 'tosijs-3d'

const rig = applyRigRecipe(scene, root, skeleton, recipe)
const walk = retargetClip(ualWalk, readSkeleton(ualSkeleton, ualRoot), rig.read, {
  scene,
  armSpaceDeg: recipe.armSpaceDeg,
})
walk.start(true)
```

The element `rigTool()` returns carries `.rig`: `recipe` (get a copy, set
one to apply it), `applied` and `load(model)`, for a page or an editor
driving the tool.

`rig.problems` lists anything in the recipe the model does not have (a bone
renamed since it was saved), and `rig.springs` the live chains, whose
`bones.params` can be changed while it runs.
*/
/*{ "parent": "demos", "order": 35 }*/

import * as BABYLON from '@babylonjs/core'
import { b3d } from './tosi-b3d.js'
import { b3dLight } from './b3d-light.js'
import { assetUrl } from './asset-url.js'
import {
  button3d,
  label3d,
  select3d,
  slider3d,
  toggle3d,
  type Widget3d,
} from './widgets3d.js'
import { vector3d } from './vector-field.js'
import { readSkeleton, retargetClip } from './retarget-babylon.js'
import { ROLES, type Role } from './retarget.js'
import {
  fitSkeleton,
  meshQuery,
  objTriangles,
  skinSegments,
  type Markers,
} from './rig-fit.js'
import { boneHeat } from './bone-heat.js'
import { buildRig } from './rig-build.js'
import type { Vec3 } from './spatial-transform.js'
import { applyRigRecipe, type AppliedRig } from './rig-recipe-babylon.js'
import {
  RIG_RECIPE_VERSION,
  STRAND_DEFAULTS,
  validateRigRecipe,
  type RigRecipe,
  type SpringRecipe,
  type StrandSpringRecipe,
} from './rig-recipe.js'

/** A character the tool offers. */
export interface RigModel {
  label: string
  url: string
  /** In a library file of several characters, the one to use. */
  pick?: string
  /** Shown this much bigger (a Kenney chibi is 0.6 m). */
  scale?: number
  /** A recipe to start from. */
  recipe?: Partial<RigRecipe>
  /**
   * A mesh with no skeleton (an OBJ, or a GLB's `mesh`): rig it from these
   * markers, as the auto-rig page does. `url` is the mesh file.
   */
  autorig?: {
    markers: Markers
    /** Where a tail's tip is (from the side view), for a tail chain. */
    tail?: Vec3
    /** An OBJ's objects to use. */
    objects?: string[]
    /** A GLB's mesh to use. */
    mesh?: string
    color?: string
  }
}

/** Mixamo's eight front-view markers, given for the left and mirrored. */
const markers = (
  chin: [number, number],
  groin: [number, number],
  wrist: [number, number],
  elbow: [number, number],
  knee: [number, number]
): Markers => {
  const p = ([x, y]: [number, number]) => ({ x, y })
  const m = ([x, y]: [number, number]) => ({ x: -x, y })
  return {
    chin: p(chin),
    groin: p(groin),
    wristL: p(wrist),
    wristR: m(wrist),
    elbowL: p(elbow),
    elbowR: m(elbow),
    kneeL: p(knee),
    kneeR: m(knee),
  }
}

/** A weasel's tail as a spring: the tail chain the auto-rig gives it. */
const TAIL: SpringRecipe = {
  kind: 'bones',
  name: 'tail',
  root: 'tail_01',
  params: { stiffness: 0.25, damping: 0.6, gravity: 9.8 },
  colliders: 'none',
}

export function rigToolModels(): RigModel[] {
  // Tonio's meshes (CC BY 4.0) with the auto-rig page's markers.
  const tonio = (f: string) => assetUrl('tonio/rigging/' + f)
  return [
    {
      label: 'skinny weasel',
      url: tonio('weasel-skinny.obj'),
      autorig: {
        objects: ['Body', 'Head', 'Tail'],
        color: '#cc8040',
        tail: { x: 0, y: 0.77, z: -0.95 },
        markers: markers([0, 1.259], [0, 0.64], [0.657, 1.154], [0.404, 1.14], [0.106, 0.34]),
      },
      recipe: { springs: [TAIL] },
    },
    {
      label: 'weasel',
      url: tonio('weasel.obj'),
      autorig: {
        objects: ['Weasel'],
        color: '#996b40',
        tail: { x: 0, y: 0.5, z: -0.95 },
        markers: markers([0, 0.967], [0, 0.358], [0.51, 0.763], [0.397, 0.763], [0.142, 0.174]),
      },
      recipe: { springs: [TAIL] },
    },
    {
      label: 'space marine',
      url: tonio('space-marine.glb'),
      scale: 0.42,
      autorig: {
        mesh: 'EvilMarineBody',
        color: '#4d664d',
        markers: markers([0, 3.594], [0, 1.656], [1.966, 2.937], [1.18, 3.064], [0.388, 0.943]),
      },
    },
    {
      label: 'superhero',
      url: assetUrl('quaternius/libraries/characters-superhero-male.glb'),
      pick: 'Superhero_Male_FullBody',
    },
    {
      label: 'superhero (female)',
      url: assetUrl('quaternius/libraries/characters-superhero-female.glb'),
      pick: 'Superhero_Female_FullBody',
    },
    { label: 'omnidude', url: '/omnidude.glb' },
    {
      label: 'Kenney chibi',
      url: assetUrl('kenney/libraries/mini-characters.glb'),
      pick: 'character-female-a',
      scale: 3,
      recipe: { armSpaceDeg: 55 },
    },
    { label: 'UAL mannequin', url: assetUrl('quaternius/UAL1_core.glb', 2) },
  ]
}

/** `rigTool()`'s element carries this as `.rig`. */
export interface RigToolApi {
  /** A copy of the working recipe; set one to apply it. */
  recipe: RigRecipe
  /** What is on the character now: the read skeleton and live springs. */
  readonly applied: AppliedRig | null
  load(model: RigModel | File): Promise<void> | undefined
}

const COLORS: Record<string, string> = {
  brown: '#73401a',
  black: '#1c1714',
  blonde: '#c9a35b',
  red: '#8f2e14',
  grey: '#8a8580',
  blue: '#2f5fa8',
  green: '#3f7a35',
}

const NONE = '(none)'
const GUESS = '(guess)'
const STORE = 'tosijs-3d:rig-tool:'

const fresh = (r: Partial<RigRecipe> = {}): RigRecipe => ({
  version: RIG_RECIPE_VERSION,
  roles: {},
  armSpaceDeg: 0,
  springs: [],
  ...JSON.parse(JSON.stringify(r)),
})

function remember(key: string, recipe: RigRecipe): void {
  try {
    localStorage.setItem(STORE + key, JSON.stringify(recipe))
  } catch {
    /* private window: the recipe is still in the page */
  }
}
function recall(key: string): RigRecipe | null {
  try {
    const s = localStorage.getItem(STORE + key)
    const r = s != null ? JSON.parse(s) : null
    return r != null && validateRigRecipe(r).length === 0 ? r : null
  } catch {
    return null
  }
}

function chooseFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.addEventListener('change', () => resolve(input.files?.[0] ?? null))
    input.addEventListener('cancel', () => resolve(null))
    input.click()
  })
}

function download(name: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

interface Opened {
  root: BABYLON.TransformNode
  skeleton: BABYLON.Skeleton
  mesh: BABYLON.AbstractMesh
  dispose(): void
}

/** A GLB with a skeleton: the character in it (`pick`), and its biggest skin. */
async function openGlb(
  scene: BABYLON.Scene,
  m: RigModel | File
): Promise<Opened | string> {
  const container = await BABYLON.LoadAssetContainerAsync(
    m instanceof File ? m : m.url,
    scene,
    m instanceof File
      ? {
          pluginExtension: m.name.toLowerCase().endsWith('.gltf')
            ? '.gltf'
            : '.glb',
        }
      : undefined
  )
  container.addAllToScene()
  for (const g of container.animationGroups) g.stop()
  const root = (container.meshes.find((n) => n.name === '__root__') ??
    container.transformNodes[0]) as BABYLON.TransformNode
  const pick = m instanceof File ? undefined : m.pick
  const top =
    pick != null
      ? container.transformNodes.find((n) => n.name === pick) ??
        container.meshes.find((n) => n.name === pick)
      : undefined
  if (top != null) {
    for (const n of container.meshes)
      if (n !== root && n !== top && !n.isDescendantOf(top)) n.setEnabled(false)
    top.position.set(0, 0, 0)
  }
  const under = (s: BABYLON.Skeleton) =>
    top == null ||
    s.bones.some((b) => b.getTransformNode()?.isDescendantOf(top))
  const skeleton = [...container.skeletons]
    .filter(under)
    .sort((a, b) => b.bones.length - a.bones.length)[0]
  if (skeleton == null) {
    container.dispose()
    return 'has no skeleton: give it markers on the auto-rig page first'
  }
  const mesh = container.meshes.find(
    (n) => n.skeleton === skeleton && n.isEnabled()
  )!
  return { root, skeleton, mesh, dispose: () => container.dispose() }
}

/*
A MESH WITH NO SKELETON, rigged as the auto-rig page does: its triangles,
a skeleton fitted from the eight markers (and a tail tip, for a tail), bone
heat for the weights, and a Babylon skeleton built on it. Its tail, if any,
is `tail_01` … `tail_leaf`: a bone chain for the springs.
*/
async function autoRig(
  scene: BABYLON.Scene,
  name: string,
  url: string,
  a: NonNullable<RigModel['autorig']>
): Promise<Opened> {
  let positions: number[]
  let indices: number[]
  if (url.toLowerCase().endsWith('.obj')) {
    ;({ positions, indices } = objTriangles(
      await (await fetch(url)).text(),
      a.objects
    ))
  } else {
    const glb = await BABYLON.LoadAssetContainerAsync(url, scene)
    const m = glb.meshes.find((m) => m.name === a.mesh) ?? glb.meshes[1]
    positions = Array.from(m.getVerticesData('position') ?? [])
    indices = Array.from(m.getIndices() ?? [])
    glb.dispose()
  }
  const rig = fitSkeleton(a.markers, meshQuery(positions, indices), {
    tail: a.tail,
  })
  const weights = boneHeat(positions, indices, skinSegments(rig))
  const built = buildRig(scene, name, positions, indices, rig, weights)
  const mat = new BABYLON.StandardMaterial(`${name}-skin`, scene)
  mat.diffuseColor = BABYLON.Color3.FromHexString(a.color ?? '#8a8f99')
  built.mesh.material = mat
  return {
    root: built.root,
    skeleton: built.skeleton,
    mesh: built.mesh,
    dispose() {
      mat.dispose()
      built.dispose()
    },
  }
}

/** The panel's view of a role: what it is set to, and what was guessed. */
const roleLabel = (r: Role) => r.replace(/^l-/, 'left ').replace(/^r-/, 'right ')

/**
 * The rig tool: a `<tosi-b3d>` with its panel. `models` replaces the demo
 * characters (a URL the page can fetch, and the character to pick in it).
 */
export function rigTool(
  options: { models?: RigModel[] } = {}
): HTMLElement & { rig: RigToolApi } {
  const models = options.models ?? rigToolModels()
  const ui = {
    model: models[0].label,
    clip: 'Walk_Loop',
    compare: true,
    bones: false,
    role: 'head' as Role,
    spring: 0,
    status: 'loading…',
  }
  let recipe = fresh()
  let el: any = null
  let clips: string[] = []
  let boneNames: string[] = []
  let applied: AppliedRig | null = null

  const refresh = () => el?.refreshScenePanel()

  // The live tool, once the scene is up.
  let tool: {
    rebuild(clipsToo: boolean): void
    load(m: RigModel | File): Promise<void>
    play(): void
    compare(on: boolean): void
    bones(on: boolean): void
  } | null = null

  const changed = (clipsToo = false) => {
    remember(ui.model, recipe)
    tool?.rebuild(clipsToo)
  }
  const current = (): SpringRecipe | undefined => recipe.springs?.[ui.spring]

  const panel = (): Widget3d[] => {
    const w: Widget3d[] = [
      select3d({
        label: 'clip',
        value: ui.clip,
        options: clips.length ? clips : [ui.clip],
        handleChange: (v) => {
          ui.clip = String(v)
          tool?.play()
        },
      }),
      toggle3d({
        label: 'compare',
        value: ui.compare,
        handleChange: (v) => tool?.compare((ui.compare = v)),
      }),
      toggle3d({
        label: 'bones',
        value: ui.bones,
        handleChange: (v) => tool?.bones((ui.bones = v)),
      }),
      label3d({ text: ui.status, muted: true, compact: true }),

      label3d({ text: 'Model', collapsible: true, open: true }),
      select3d({
        label: 'model',
        value: ui.model,
        options: [...new Set([...models.map((m) => m.label), ui.model])],
        handleChange: (v) => {
          const m = models.find((m) => m.label === v)
          if (m) void tool?.load(m)
        },
      }),
      button3d({
        label: 'load model file…',
        handleClick: () =>
          void chooseFile('.glb,.gltf').then((f) => f && tool?.load(f)),
      }),
    ]

    // Roles.
    const guessed = applied?.read.roles ?? {}
    const set = recipe.roles?.[ui.role]
    w.push(
      label3d({ text: 'Roles', collapsible: true }),
      select3d({
        label: 'role',
        value: ui.role,
        options: ROLES.map((r) => ({
          label: `${roleLabel(r)}${guessed[r] ? '' : ' –'}`,
          value: r,
        })),
        handleChange: (v) => {
          ui.role = v as Role
          refresh()
        },
      }),
      select3d({
        label: 'bone',
        value: set == null ? GUESS : set === '' ? NONE : set,
        options: [GUESS, NONE, ...boneNames],
        handleChange: (v) => {
          const roles = (recipe.roles ??= {})
          if (v === GUESS) delete roles[ui.role]
          else roles[ui.role] = v === NONE ? '' : String(v)
          changed(true)
          refresh()
        },
      }),
      label3d({
        text: `plays it: ${guessed[ui.role] ?? 'nothing'}`,
        muted: true,
        compact: true,
      }),
      slider3d({
        label: 'arm space',
        value: recipe.armSpaceDeg ?? 0,
        min: -30,
        max: 90,
        step: 1,
        format: (v) => `${v}°`,
        handleChange: (v) => {
          recipe.armSpaceDeg = v
          changed(true)
        },
      })
    )

    // Springs.
    const springs = recipe.springs ?? []
    w.push(
      label3d({ text: 'Springs', collapsible: true }),
      button3d({
        label: '+ strand',
        handleClick: () => {
          const anchor = applied?.read.roles.head ?? boneNames[0]
          if (anchor == null) return
          springs.push({ ...JSON.parse(JSON.stringify(STRAND_DEFAULTS)), anchor })
          recipe.springs = springs
          ui.spring = springs.length - 1
          changed()
          refresh()
        },
      }),
      button3d({
        label: '+ bone chain',
        handleClick: () => {
          const root =
            boneNames.find((n) => /tail|hair|pony|braid/i.test(n)) ??
            boneNames[0]
          if (root == null) return
          springs.push({
            kind: 'bones',
            name: 'chain',
            root,
            params: { stiffness: 0.25, damping: 0.6, gravity: 9.8 },
            colliders: 'auto',
          })
          recipe.springs = springs
          ui.spring = springs.length - 1
          changed()
          refresh()
        },
      })
    )
    const s = current()
    if (s != null) {
      w.push(
        select3d({
          label: 'chain',
          value: ui.spring,
          options: springs.map((c, i) => ({
            label: `${i + 1}. ${c.name ?? c.kind}`,
            value: i,
          })),
          handleChange: (v) => {
            ui.spring = Number(v)
            refresh()
          },
        })
      )
      if (s.kind === 'bones') {
        w.push(
          select3d({
            label: 'first bone',
            value: s.root,
            options: boneNames,
            handleChange: (v) => {
              s.root = String(v)
              changed()
            },
          })
        )
      } else {
        w.push(...strandWidgets(s, () => changed()))
      }
      const live = () => applied?.springs.find((a) => a.recipe === s)?.bones
      const params = (s.params ??= {})
      w.push(
        slider3d({
          label: 'stiffness',
          value: params.stiffness ?? 0.15,
          min: 0,
          max: 1,
          step: 0.01,
          handleChange: (v) => {
            params.stiffness = v
            const b = live()
            if (b) b.params.stiffness = v
            remember(ui.model, recipe)
          },
        }),
        slider3d({
          label: 'damping',
          value: params.damping ?? 0.6,
          min: 0,
          max: 0.99,
          step: 0.01,
          handleChange: (v) => {
            params.damping = v
            const b = live()
            if (b) b.params.damping = v
            remember(ui.model, recipe)
          },
        }),
        slider3d({
          label: 'gravity',
          value: params.gravity ?? 9.8,
          min: 0,
          max: 20,
          step: 0.1,
          handleChange: (v) => {
            params.gravity = v
            const b = live()
            if (b) b.params.gravity = { x: 0, y: -v, z: 0 }
            remember(ui.model, recipe)
          },
        }),
        select3d({
          label: 'colliders',
          value: typeof s.colliders === 'string' ? s.colliders : 'auto',
          options: ['auto', 'none'],
          handleChange: (v) => {
            s.colliders = v as 'auto' | 'none'
            changed()
          },
        }),
        button3d({
          label: 'remove chain',
          handleClick: () => {
            springs.splice(ui.spring, 1)
            ui.spring = Math.max(0, ui.spring - 1)
            changed()
            refresh()
          },
        })
      )
    }

    // Recipe.
    w.push(
      label3d({ text: 'Recipe', collapsible: true }),
      button3d({
        label: 'save',
        handleClick: () =>
          download(
            `${ui.model.replace(/\.[^.]*$/, '').replace(/\W+/g, '-')}.rig.json`,
            JSON.stringify(recipe, null, 2)
          ),
      }),
      button3d({
        label: 'load',
        handleClick: () =>
          void chooseFile('.json').then(async (f) => {
            if (f == null) return
            try {
              const r = JSON.parse(await f.text())
              const problems = validateRigRecipe(r)
              if (problems.length) {
                ui.status = `not a recipe: ${problems[0]}`
              } else {
                recipe = fresh(r)
                ui.spring = 0
                const m = models.find((m) => m.url === r.model?.url)
                if (m != null && m.label !== ui.model) {
                  await tool?.load(m)
                  recipe = fresh(r)
                }
                changed(true)
              }
            } catch (e) {
              ui.status = `could not read it: ${(e as Error).message}`
            }
            refresh()
          }),
      }),
      button3d({
        label: 'copy',
        handleClick: () =>
          void navigator.clipboard
            ?.writeText(JSON.stringify(recipe, null, 2))
            .then(() => {
              ui.status = 'recipe copied'
              refresh()
            }),
      }),
      button3d({
        label: 'start over',
        handleClick: () => {
          const m = models.find((m) => m.label === ui.model)
          recipe = fresh({ ...m?.recipe, model: recipe.model })
          ui.spring = 0
          changed(true)
          refresh()
        },
      })
    )
    return w
  }

  /** A strand's shape: where it starts, which way it hangs, how big. */
  function strandWidgets(
    s: StrandSpringRecipe,
    rebuild: () => void
  ): Widget3d[] {
    return [
      select3d({
        label: 'hangs from',
        value: s.anchor,
        options: boneNames,
        handleChange: (v) => {
          s.anchor = String(v)
          rebuild()
        },
      }),
      label3d({ text: 'offset from the bone', compact: true }),
      vector3d({
        value: s.offset,
        step: 0.01,
        handleChange: (v) => {
          s.offset = { ...v }
          rebuild()
        },
      }) as unknown as Widget3d,
      slider3d({
        label: 'yaw',
        value: s.yawDeg,
        min: -180,
        max: 180,
        step: 1,
        format: (v) => `${v}°`,
        handleChange: (v) => {
          s.yawDeg = v
          rebuild()
        },
      }),
      slider3d({
        label: 'pitch',
        value: s.pitchDeg,
        min: -90,
        max: 90,
        step: 1,
        format: (v) => `${v}°`,
        handleChange: (v) => {
          s.pitchDeg = v
          rebuild()
        },
      }),
      slider3d({
        label: 'length',
        value: s.length,
        min: 0.05,
        max: 1.5,
        step: 0.01,
        handleChange: (v) => {
          s.length = v
          rebuild()
        },
      }),
      slider3d({
        label: 'segments',
        value: s.segments,
        min: 2,
        max: 16,
        step: 1,
        handleChange: (v) => {
          s.segments = Math.round(v)
          rebuild()
        },
      }),
      slider3d({
        label: 'thickness',
        value: s.radius,
        min: 0.005,
        max: 0.12,
        step: 0.001,
        handleChange: (v) => {
          s.radius = v
          rebuild()
        },
      }),
      slider3d({
        label: 'tip',
        value: s.tipRadius ?? s.radius * 0.3,
        min: 0.001,
        max: 0.12,
        step: 0.001,
        handleChange: (v) => {
          s.tipRadius = v
          rebuild()
        },
      }),
      select3d({
        label: 'colour',
        value:
          Object.keys(COLORS).find((k) => COLORS[k] === s.color) ?? 'brown',
        options: Object.keys(COLORS),
        handleChange: (v) => {
          s.color = COLORS[String(v)]
          rebuild()
        },
      }),
    ]
  }

  el = b3d(
    {
      style: { width: '100%', height: '100%' },
      clearColor: '#2a3340',
      panelTitle: 'Rig',
      scenePanelOpen: true,
      scenePanel: panel,
      async sceneCreated(owner: any) {
        const scene: BABYLON.Scene = owner.scene
        const cam = new BABYLON.ArcRotateCamera(
          'rig-cam',
          Math.PI / 2,
          1.35,
          3.6,
          new BABYLON.Vector3(-0.5, 0.9, 0),
          scene
        )
        cam.wheelPrecision = 60
        cam.minZ = 0.02
        cam.attachControl(owner.querySelector('canvas'), true)
        owner.setActiveCamera(cam)
        BABYLON.MeshBuilder.CreateGround(
          'rig-ground',
          { width: 12, height: 12 },
          scene
        ).position.y = -0.01

        // The clips' source, beside the character when comparing.
        const ual = await BABYLON.LoadAssetContainerAsync(
          assetUrl('quaternius/UAL1_core.glb', 2),
          scene
        )
        ual.addAllToScene()
        for (const g of ual.animationGroups) g.stop()
        const ualRoot = ual.meshes.find((m) => m.name === '__root__')!
        const source = readSkeleton(ual.skeletons[0], ualRoot)
        const ualStand = new BABYLON.TransformNode('rig-ual', scene)
        ualRoot.parent = ualStand
        ualStand.setEnabled(ui.compare)
        clips = ual.animationGroups.map((g) => g.name).sort()

        const stand = new BABYLON.TransformNode('rig-stand', scene)
        /*
        FRAMING: the mannequin is scaled to the character's height and stands
        on its left (the screen's right), and the camera looks a little left
        of them both so the panel does not cover them.
        */
        let height = 1.8
        const UAL_HEIGHT = 1.83
        const frame = () => {
          const gap = height * 0.6
          ualStand.scaling.setAll(height / UAL_HEIGHT)
          ualStand.position.x = -gap
          const middle = ui.compare ? -gap / 2 : 0
          cam.target.set(middle + height * 0.6, height * 0.5, 0)
          cam.radius = height * 2.6
          cam.minZ = height * 0.01
        }
        let model: {
          dispose(): void
          root: BABYLON.TransformNode
          skeleton: BABYLON.Skeleton
          mesh: BABYLON.AbstractMesh
        } | null = null
        let viewer: BABYLON.SkeletonViewer | null = null
        const made = new Map<string, BABYLON.AnimationGroup>()
        let playing: BABYLON.AnimationGroup[] = []

        const stop = () => {
          for (const g of playing) g.stop()
          playing = []
        }
        const play = () => {
          stop()
          const clip = ual.animationGroups.find((g) => g.name === ui.clip)
          if (clip == null) return
          playing.push(clip)
          if (applied != null) {
            if (!made.has(ui.clip))
              made.set(
                ui.clip,
                retargetClip(clip, source, applied.read, {
                  scene,
                  armSpaceDeg: recipe.armSpaceDeg,
                })
              )
            playing.push(made.get(ui.clip)!)
          }
          // Start together, so the two stay in step.
          for (const g of playing) g.start(true)
        }
        const forgetClips = () => {
          for (const g of made.values()) g.dispose()
          made.clear()
        }
        const rebuild = (clipsToo: boolean) => {
          if (model == null) return
          stop()
          if (clipsToo) forgetClips()
          applied?.dispose()
          viewer?.dispose()
          viewer = null
          applied = applyRigRecipe(scene, model.root, model.skeleton, recipe)
          ui.status = applied.problems.length
            ? applied.problems.join('; ')
            : `${model.skeleton.bones.length} bones, ${
                Object.keys(applied.read.roles).length
              } roles`
          if (ui.bones) showBones(true)
          play()
        }
        const showBones = (on: boolean) => {
          viewer?.dispose()
          viewer = null
          if (on && model != null)
            viewer = new BABYLON.SkeletonViewer(
              model.skeleton,
              model.mesh,
              scene,
              false,
              3,
              { displayMode: 0 }
            )
        }

        const load = async (m: RigModel | File) => {
          const label = m instanceof File ? m.name : m.label
          ui.status = `loading ${label}…`
          refresh()
          stop()
          forgetClips()
          applied?.dispose()
          applied = null
          viewer?.dispose()
          viewer = null
          model?.dispose()
          model = null
          try {
            const opened =
              !(m instanceof File) && m.autorig != null
                ? await autoRig(scene, m.label, m.url, m.autorig)
                : await openGlb(scene, m)
            if (typeof opened === 'string') {
              ui.status = `${label} ${opened}`
              refresh()
              return
            }
            const { root, skeleton } = opened
            const pick = m instanceof File ? undefined : m.pick
            root.parent = stand
            stand.scaling.setAll(m instanceof File ? 1 : m.scale ?? 1)
            model = opened
            boneNames = skeleton.bones.map(
              (b) => b.getTransformNode()?.name ?? b.name
            )
            ui.model = label
            const url = m instanceof File ? undefined : m.url
            recipe = recall(label) ?? fresh(m instanceof File ? {} : m.recipe)
            recipe.model = { url, name: m instanceof File ? m.name : pick }
            ui.spring = 0
            // Its height, from the meshes shown (a library holds others),
            // with the stand's scale in the world matrices first.
            stand.computeWorldMatrix(true)
            for (const n of root.getDescendants(false))
              (n as BABYLON.TransformNode).computeWorldMatrix?.(true)
            const box = root.getHierarchyBoundingVectors(
              true,
              (n) => n.isEnabled() && n.skeleton != null
            )
            height = Math.max(0.2, box.max.y - box.min.y)
            frame()
            rebuild(true)
          } catch (e) {
            ui.status = `could not load ${label}: ${(e as Error).message}`
          }
          refresh()
        }

        tool = {
          rebuild,
          load,
          play,
          compare(on) {
            ualStand.setEnabled(on)
            frame()
          },
          bones: showBones,
        }
        await load(models[0])
      },
    },
    b3dLight({ intensity: 0.9 })
  )
  /*
  THE TOOL AS AN API, for a page or an editor driving it: read the recipe,
  hand it one (applied as if loaded), or load a model.
  */
  el.rig = {
    get recipe(): RigRecipe {
      return JSON.parse(JSON.stringify(recipe))
    },
    set recipe(r: RigRecipe) {
      const problems = validateRigRecipe(r)
      if (problems.length) throw new Error(`not a rig recipe: ${problems[0]}`)
      recipe = fresh({ ...r, model: recipe.model })
      ui.spring = 0
      changed(true)
      refresh()
    },
    get applied(): AppliedRig | null {
      return applied
    },
    load: (m: RigModel | File) => tool?.load(m),
  }
  return el
}
