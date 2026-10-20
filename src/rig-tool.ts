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

It opens standing still in its REST pose (a T or an A), with a dot on the
bone each role uses: tap a dot to choose that role (it turns yellow), then
tap the body where that bone is to give the role to it. A tap on the body
does nothing until a dot has been chosen, and only the first one counts, so
orbiting on a phone cannot reassign a bone. Set `clicking sets` to the chain
and that tap hangs the chosen spring chain there instead. A
strand's path is a row of orange handles: drag them along the tail or the
ponytail, `+ point` for another one beyond the tip. `view` snaps to front,
side or top, which is how you line a point up with the flesh. Turn on
`animate` (or pick a clip) to see it move.

The panel has four sections.

- **Model.** A demo character, or `load model file…` for a GLB of your own
  (a single file: a `.gltf` with separate buffers cannot be opened this
  way). A model needs a skeleton; one without can be rigged on the
  [auto-rig](/rig-build/) page first.
- **Roles.** Which bone is the hips, the head, the left forearm, each finger
  joint. They are guessed from the names; fix one by tapping, as above, or
  pick a role and then the bone that plays it, or `(none)` to leave it out. `arm space` turns the arms out
  from the body, for a character whose arms are long for its height.
- **Springs.** `+ strand` hangs a new chain with a tube from a bone (a
  ponytail): lay out its path with the handles (add points for a curve),
  choose how many `links` it has (they are spaced evenly along the path),
  size it, and tune how it swings. A straight one can also be set by
  `offset`, `yaw`, `pitch` and `length`. `+ bone chain` simulates bones the model already has (a
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
  row3d,
  select3d,
  slider3d,
  toggle3d,
  type Widget3d,
} from './widgets3d.js'
import { vector3d } from './vector-field.js'
import { pointerClaimedByPanel } from './frame-panel.js'
import { touchOrbit } from './touch-orbit.js'
import {
  inspectView,
  seamOverlay,
  INSPECT_FACES,
  type InspectFace,
} from './inspect-view.js'
import { viewMenu } from './bar-menu.js'
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
  strandPath,
  setStrandPath,
  pathLength,
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
    /** How many bones the tail chain has (default 5). */
    tailBones?: number
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

/**
 * A weasel's tail as a spring: the tail chain the auto-rig gives it. Stiff
 * enough to carry itself: at 0.25 it swung about three times as far on a walk.
 */
const TAIL: SpringRecipe = {
  kind: 'bones',
  name: 'tail',
  root: 'tail_01',
  params: { stiffness: 0.6, damping: 0.85, gravity: 9.8 },
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
        markers: markers(
          [0, 1.259],
          [0, 0.64],
          [0.657, 1.154],
          [0.404, 1.14],
          [0.106, 0.34]
        ),
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
        markers: markers(
          [0, 0.967],
          [0, 0.358],
          [0.51, 0.763],
          [0.397, 0.763],
          [0.142, 0.174]
        ),
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
        markers: markers(
          [0, 3.594],
          [0, 1.656],
          [1.966, 2.937],
          [1.18, 3.064],
          [0.388, 0.943]
        ),
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

/**
 * Where the camera looks from: a face of the character, orthographic and
 * held (see `inspectView`), or `free` to orbit.
 */
export type RigView = InspectFace | 'free'

/** `rigTool()`'s element carries this as `.rig`. */
export interface RigToolApi {
  /** A copy of the working recipe; set one to apply it. */
  recipe: RigRecipe
  /** What is on the character now: the read skeleton and live springs. */
  readonly applied: AppliedRig | null
  /** The status line: what was loaded, set or went wrong. */
  readonly status: string
  /** The role being edited (a tap on its dot, or the panel, chooses it). */
  readonly role: Role
  /** Where the camera looks from: a face (orthographic, held) or `free`. */
  view: RigView
  /** Play a clip (the current one if none is named); `null` stands it at rest. */
  play(clip?: string | null): void
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
  const url = URL.createObjectURL(
    new Blob([text], { type: 'application/json' })
  )
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
    tailBones: a.tailBones,
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
const roleLabel = (r: Role) =>
  r.replace(/^l-/, 'left ').replace(/^r-/, 'right ')

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
    /** `rest`: stood still in its rest pose, targets shown, click to set. */
    pose: 'rest' as 'rest' | 'animate',
    /** What clicking the body sets, in the rest pose. */
    clickSets: 'role' as 'role' | 'chain',
    /**
     * A tap on the body sets a bone only right after a dot (or the role) was
     * chosen. Unarmed, every press that did not travel set the head: on a
     * phone that is every attempt to orbit, and it was remembered.
     */
    armed: false,
    /** Snapped to a view (orthographic), or `free` to orbit. */
    /** The rest pose opens on the front, orthographic; animating orbits. */
    view: 'front' as RigView,
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
    view(v: RigView): void
    /** Redraw the targets and handles (the selection changed). */
    targets(): void
  } | null = null

  const changed = (clipsToo = false) => {
    remember(ui.model, recipe)
    tool?.rebuild(clipsToo)
  }
  const current = (): SpringRecipe | undefined => recipe.springs?.[ui.spring]

  const panel = (): Widget3d[] => {
    const w: Widget3d[] = [
      toggle3d({
        label: 'animate',
        value: ui.pose === 'animate',
        handleChange: (v) => {
          ui.pose = v ? 'animate' : 'rest'
          tool?.play()
          refresh()
        },
      }),
      select3d({
        label: 'clip',
        value: ui.clip,
        options: clips.length ? clips : [ui.clip],
        handleChange: (v) => {
          ui.clip = String(v)
          ui.pose = 'animate'
          tool?.play()
          refresh()
        },
      }),
      ...(ui.pose === 'rest'
        ? [
            select3d({
              label: 'clicking sets',
              value: ui.clickSets,
              options: [
                { label: "the role's bone", value: 'role' },
                { label: "the chain's bone", value: 'chain' },
              ],
              handleChange: (v) => {
                ui.clickSets = v as 'role' | 'chain'
                ui.armed = true
                refresh()
              },
            }),
            label3d({
              text: !ui.armed
                ? 'tap a dot, then its bone'
                : ui.clickSets === 'role'
                  ? `now tap the ${roleLabel(ui.role)}'s bone`
                  : 'now tap where the chain hangs from',
              muted: true,
              compact: true,
            }),
          ]
        : []),
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
      select3d({
        label: 'view',
        value: ui.view,
        options: [...INSPECT_FACES, 'free'],
        handleChange: (v) => tool?.view((ui.view = v as RigView)),
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
      label3d({ text: 'Roles', collapsible: true, open: true }),
      select3d({
        label: 'role',
        value: ui.role,
        options: ROLES.map((r) => ({
          label: `${roleLabel(r)}${guessed[r] ? '' : ' –'}`,
          value: r,
        })),
        handleChange: (v) => {
          ui.role = v as Role
          ui.clickSets = 'role'
          ui.armed = true
          tool?.targets()
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
      label3d({ text: 'Springs', collapsible: true, open: true }),
      button3d({
        label: '+ strand',
        handleClick: () => {
          const anchor = applied?.read.roles.head ?? boneNames[0]
          if (anchor == null) return
          springs.push({
            ...JSON.parse(JSON.stringify(STRAND_DEFAULTS)),
            anchor,
          })
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
            tool?.targets()
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
        // An auto-rigged tail is ours to lay out: how many links it has.
        const model = models.find((m) => m.label === ui.model)
        if (model?.autorig?.tail != null && s.root.startsWith('tail_'))
          w.push(
            slider3d({
              label: 'tail links',
              value: model.autorig.tailBones ?? 5,
              min: 2,
              max: 16,
              step: 1,
              handleChange: (v) => {
                const n = Math.round(v)
                if (n === (model.autorig!.tailBones ?? 5)) return
                model.autorig!.tailBones = n
                void tool?.load(model)
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
      /*
      THE PATH (Tonio: map out the tail or the ponytail, do not place one
      stub). Its points are the orange handles: drag them onto the tail;
      `+ point` adds one beyond the tip, `− point` takes the last away. The
      links are spaced evenly along it, however many there are.
      */
      label3d({
        text: `${strandPath(s).length} points, ${pathLength(strandPath(s)).toFixed(2)} m: drag the orange handles`,
        muted: true,
        compact: true,
      }),
      row3d(
        {},
        button3d({
          label: '+ point',
          handleClick: () => {
            const path = strandPath(s)
            const a = path[path.length - 2]
            const b = path[path.length - 1]
            path.push({ x: 2 * b.x - a.x, y: 2 * b.y - a.y, z: 2 * b.z - a.z })
            setStrandPath(s, path)
            s.segments = Math.max(s.segments, path.length - 1)
            rebuild()
          },
        }),
        button3d({
          label: '− point',
          handleClick: () => {
            const path = strandPath(s)
            if (path.length <= 2) return
            path.pop()
            setStrandPath(s, path)
            rebuild()
          },
        })
      ),
      slider3d({
        label: 'links',
        value: s.segments,
        min: 1,
        max: 24,
        step: 1,
        handleChange: (v) => {
          s.segments = Math.round(v)
          rebuild()
        },
      }),
      // A straight strand can also be set by numbers; a bent one by its handles.
      ...(s.path != null && s.path.length > 2
        ? []
        : [
          label3d({ text: 'offset from the bone', compact: true }),
          vector3d({
            value: s.offset,
            step: 0.01,
            handleChange: (v) => {
              s.offset = { ...v }
              delete s.path
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
              delete s.path
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
              delete s.path
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
              delete s.path
              rebuild()
            },
          }),
          ]),
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
        touchOrbit(cam)
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
        let height = 1.8
        const UAL_HEIGHT = 1.83
        /*
        HELD VIEWS (Tonio: snap to overhead, front and side; then: an
        orthographic camera with fixed views while it stands still, since a
        drag that orbits cannot also move a handle). `inspectView` holds the
        camera to a face, orthographic, and the camera on the system bar
        picks which; seams are drawn on the model while it does.
        */
        let restFace: InspectFace = 'front'
        /*
        THE VIEW IS THE POSE (Tonio: "it animates in perspective view and not
        in the orthographic views"): a face stands it at rest, perspective
        plays the clip, and the animate toggle moves the view the other way.
        */
        const inspect = inspectView(cam, {
          handleChange: (f) => {
            ui.view = f
            if (f !== 'free') restFace = f
            const pose = f === 'free' ? 'animate' : 'rest'
            if (pose !== ui.pose) {
              ui.pose = pose
              play()
            } else frame()
            menu?.update()
            seams()
            refresh()
          },
        })
        const menu: ReturnType<typeof viewMenu> | null = viewMenu(
          inspect,
          owner,
          { always: true }
        )
        let seamed: Array<{ dispose(): void }> = []
        /** The model's polygons drawn over a flat fill, while a face is held. */
        function seams() {
          for (const x of seamed) x.dispose()
          seamed = []
          if (inspect.face === 'free' || model == null) return
          for (const m of model.root.getChildMeshes(false))
            if (m.getTotalVertices() > 0 && m.isEnabled())
              seamed.push(seamOverlay(m))
        }
        function snapView(v: RigView) {
          inspect.face = v
        }
        /*
        FRAMING: the mannequin is scaled to the character's height and stands
        on its left (the screen's right), and the camera looks a little left
        of them both so the panel does not cover them. The radius is the zoom
        in a held view too (it sizes the orthographic box).
        */
        const frame = () => {
          // Arms out at rest need more room than arms down.
          const gap = height * (ui.pose === 'rest' ? 1.1 : 0.6)
          ualStand.scaling.setAll(height / UAL_HEIGHT)
          const middle = ui.compare ? -gap / 2 : 0
          // Seen from a side, beside it rather than in front of it: on the
          // screen's right (-Z seen from the left, +Z from the right).
          if (inspect.face === 'left' || inspect.face === 'right') {
            const right = inspect.face === 'left' ? -1 : 1
            ualStand.position.set(0, 0, right * gap)
            const mid = ui.compare ? (right * gap) / 2 : 0
            cam.target.set(0, height * 0.5, mid - right * height * 0.6)
          } else {
            ualStand.position.set(-gap, 0, 0)
            cam.target.set(middle + height * 0.6, height * 0.5, 0)
          }
          cam.radius = height * (ui.pose === 'rest' ? 3.1 : 2.6)
          if (inspect.face === 'free') cam.minZ = height * 0.01
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
          // Standing still: a held face (the one last used); moving: orbit.
          inspect.face = ui.pose === 'rest' ? restFace : 'free'
          frame()
          for (const sp of applied?.springs ?? [])
            sp.bones.paused = ui.pose === 'rest'
          if (ui.pose === 'rest') {
            // Stood still: both at rest, the springs in their rest shape.
            ual.skeletons[0].returnToRest()
            if (model != null) rebuildAtRest()
            return
          }
          targets()
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
        /** The recipe on the character, at rest (springs held there). */
        const rebuildAtRest = () => {
          if (model == null) return
          applied?.dispose()
          viewer?.dispose()
          viewer = null
          applied = applyRigRecipe(scene, model.root, model.skeleton, recipe)
          for (const sp of applied.springs) sp.bones.paused = true
          ui.status = applied.problems.length
            ? applied.problems.join('; ')
            : `${model.skeleton.bones.length} bones, ${
                Object.keys(applied.read.roles).length
              } roles`
          if (ui.bones) showBones(true)
          targets()
        }
        const rebuild = (clipsToo: boolean) => {
          if (model == null) return
          stop()
          if (clipsToo) forgetClips()
          if (ui.pose === 'rest') {
            rebuildAtRest()
            return
          }
          rebuildAtRest()
          play()
        }

        /*
        THE TARGETS, in the rest pose: a dot on each role's bone (drawn over
        the body, so the hidden ones show), the chosen role's bigger and
        yellow; a strand's path points as handles you drag (its links marked
        along it when it is the chosen one); a bone chain's
        first bone in blue. Nothing in the animated view.
        */
        scene.setRenderingAutoClearDepthStencil(1, true, true, false)
        const dotMat = (name: string, hex: string) => {
          const m = new BABYLON.StandardMaterial(name, scene)
          m.disableLighting = true
          m.emissiveColor = BABYLON.Color3.FromHexString(hex)
          return m
        }
        const roleMat = dotMat('rig-role', '#4cd964')
        const pickedMat = dotMat('rig-role-picked', '#ffd60a')
        const springMat = dotMat('rig-spring', '#5ac8fa')
        const springPickedMat = dotMat('rig-spring-picked', '#ff9f0a')
        let dots: BABYLON.Mesh[] = []
        const dot = (
          at: BABYLON.Vector3,
          size: number,
          mat: BABYLON.Material,
          meta: Record<string, unknown>
        ) => {
          const d = BABYLON.MeshBuilder.CreateSphere(
            'rig-dot',
            { diameter: size, segments: 8 },
            scene
          )
          d.position.copyFrom(at)
          d.material = mat
          d.renderingGroupId = 1
          d.metadata = meta
          dots.push(d)
          return d
        }
        function targets() {
          for (const d of dots) d.dispose()
          dots = []
          if (ui.pose !== 'rest' || applied == null) return
          const r = height * 0.022
          for (const role of Object.keys(applied.read.roles) as Role[]) {
            const node = applied.read.nodes.get(applied.read.roles[role]!)
            if (node == null) continue
            const finger = /\d$/.test(role)
            const picked = role === ui.role
            dot(
              node.getAbsolutePosition(),
              r * (finger ? 0.45 : 1) * (picked ? 1.8 : 1),
              picked ? pickedMat : roleMat,
              { rigRole: role }
            )
          }
          applied.springs.forEach((sp) => {
            const i = (recipe.springs ?? []).indexOf(sp.recipe)
            const picked = i === ui.spring
            const mat = picked ? springPickedMat : springMat
            const size = r * (picked ? 1.5 : 1.1)
            const nodes = sp.bones.nodes
            if (sp.recipe.kind === 'bones') {
              // The whole chain, so it reads as a tail and not one stub.
              nodes.forEach((n, k) =>
                dot(n.getAbsolutePosition(), k === 0 ? size : size * 0.55, mat, {
                  rigSpring: i,
                })
              )
              return
            }
            // A handle on every point of its path, and a small mark where
            // each link's joint falls along it.
            const anchor = applied!.read.nodes.get(sp.recipe.anchor)
            if (anchor == null) return
            const a = anchor.getAbsolutePosition()
            strandPath(sp.recipe).forEach((p, k) =>
              dot(new BABYLON.Vector3(a.x + p.x, a.y + p.y, a.z + p.z), size, mat, {
                rigSpring: i,
                handle: k,
              })
            )
            if (picked)
              for (const n of nodes)
                dot(n.getAbsolutePosition(), size * 0.45, springMat, {
                  rigSpring: i,
                  link: true,
                })
          })
        }

        /*
        DRAGGING A STRAND'S END, on the canvas's own pointer events: Babylon's
        PointerDragBehavior was ended mid-drag by its click detection (a
        delayed pointer-up while the button was still down). The handle moves
        on a plane facing the camera; let go and the strand is rebuilt there.
        */
        const canvas = scene.getEngine().getRenderingCanvas()!
        // CSS pixels from the canvas corner: what scene.pick and
        // createPickingRay take (they apply the hardware scaling).
        const toRender = (e: PointerEvent) => {
          const r = canvas.getBoundingClientRect()
          return { x: e.clientX - r.left, y: e.clientY - r.top }
        }
        /*
        After Babylon's own listener (this one is added later, and not in
        the capture phase): a panel has claimed its presses by then, and
        those are the panel's. Taking a handle stops the camera for the
        drag, as Babylon's drag behaviour does.
        */
        canvas.addEventListener('pointerdown', (e) => {
          if (ui.pose !== 'rest' || e.button !== 0 || applied == null) return
          if (pointerClaimedByPanel(e)) return
          const at = toRender(e)
          const hit = scene.pick(
            at.x,
            at.y,
            (m) =>
              dots.includes(m as BABYLON.Mesh) && m.metadata?.handle != null
          )
          const handle = hit?.pickedMesh as BABYLON.Mesh | undefined
          if (handle == null) {
            // Not a handle: the camera may orbit, and a press that does
            // not travel is a tap. (Babylon's own POINTERTAP fires on a
            // timer, even in the middle of a drag, so it is not used.)
            const done = (ev: PointerEvent) => {
              window.removeEventListener('pointerup', done, true)
              const p = toRender(ev)
              if (Math.hypot(p.x - at.x, p.y - at.y) < 6) tap(p.x, p.y)
            }
            window.addEventListener('pointerup', done, true)
            return
          }
          const i = handle.metadata.rigSpring as number
          const strand = recipe.springs?.[i]
          if (strand?.kind !== 'strand') return
          ui.spring = i
          cam.detachControl()
          const plane = BABYLON.Plane.FromPositionAndNormal(
            handle.position,
            cam.getForwardRay().direction
          )
          const move = (ev: PointerEvent) => {
            const p = toRender(ev)
            const ray = scene.createPickingRay(
              p.x,
              p.y,
              BABYLON.Matrix.Identity(),
              cam
            )
            const d = ray.intersectsPlane(plane)
            if (d != null)
              handle.position.copyFrom(ray.origin.add(ray.direction.scale(d)))
          }
          const up = () => {
            window.removeEventListener('pointermove', move, true)
            window.removeEventListener('pointerup', up, true)
            cam.attachControl(canvas, true)
            const handles = dots
              .filter(
                (d) =>
                  d.metadata?.rigSpring === i &&
                  typeof d.metadata.handle === 'number'
              )
              .sort((p, q) => p.metadata.handle - q.metadata.handle)
            const anchor = applied?.read.nodes.get(strand.anchor)
            if (anchor == null) return
            const a = anchor.getAbsolutePosition()
            const path = handles.map((d) => ({
              x: d.position.x - a.x,
              y: d.position.y - a.y,
              z: d.position.z - a.z,
            }))
            if (pathLength(path) < 1e-4) return
            setStrandPath(strand, path)
            changed()
            refresh()
          }
          window.addEventListener('pointermove', move, true)
          window.addEventListener('pointerup', up, true)
        })

        /** The bone a point on the body belongs to: the nearest bone's length. */
        const nearestBone = (p: BABYLON.Vector3): string | null => {
          if (applied == null) return null
          const nodes = new Set(applied.read.nodes.values())
          let best: string | null = null
          let bestD = Infinity
          for (const [name, node] of applied.read.nodes) {
            const a = node.getAbsolutePosition()
            const kids = node
              .getChildren()
              .filter((c) => nodes.has(c as BABYLON.TransformNode))
            const ends = kids.length
              ? kids.map((k) =>
                  (k as BABYLON.TransformNode).getAbsolutePosition()
                )
              : [a]
            for (const b of ends) {
              const ab = b.subtract(a)
              const t =
                ab.lengthSquared() > 1e-12
                  ? Math.max(
                      0,
                      Math.min(
                        1,
                        BABYLON.Vector3.Dot(p.subtract(a), ab) /
                          ab.lengthSquared()
                      )
                    )
                  : 0
              const dist = BABYLON.Vector3.Distance(p, a.add(ab.scale(t)))
              if (dist < bestD) {
                bestD = dist
                best = name
              }
            }
          }
          return best
        }

        // A tap in the rest pose: a dot picks, the body sets.
        const tap = (x: number, y: number) => {
          if (ui.pose !== 'rest' || model == null || applied == null) return
          const onDot = scene.pick(x, y, (m) =>
            dots.includes(m as BABYLON.Mesh)
          )
          const meta = onDot?.pickedMesh?.metadata
          if (meta?.rigRole != null) {
            ui.role = meta.rigRole
            ui.clickSets = 'role'
            ui.armed = true
            targets()
            refresh()
            return
          }
          if (meta?.rigSpring != null) {
            ui.spring = meta.rigSpring
            ui.clickSets = 'chain'
            ui.armed = true
            targets()
            refresh()
            return
          }
          const root = model.root
          const onBody = scene.pick(
            x,
            y,
            (m) => m.isEnabled() && m.isDescendantOf(root)
          )
          const at = onBody?.pickedPoint
          if (at == null) return
          const bone = nearestBone(at)
          if (bone == null) return
          if (!ui.armed) {
            ui.status = 'tap a dot first, then its bone'
            refresh()
            return
          }
          ui.armed = false
          if (ui.clickSets === 'role') {
            ;(recipe.roles ??= {})[ui.role] = bone
            ui.status = `${roleLabel(ui.role)}: ${bone}`
            changed(true)
          } else {
            const sp = current()
            if (sp == null) {
              ui.status = 'add a chain first'
            } else if (sp.kind === 'bones') {
              sp.root = bone
              changed()
            } else {
              // A strand starts where you clicked, on the bone you clicked.
              const a = applied.read.nodes.get(bone)!.getAbsolutePosition()
              sp.anchor = bone
              sp.offset = { x: at.x - a.x, y: at.y - a.y, z: at.z - a.z }
              changed()
            }
          }
          refresh()
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
          for (const x of seamed) x.dispose()
          seamed = []
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
            inspect.face = ui.view
            seams()
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
          view: snapView,
          targets,
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
    get status(): string {
      return ui.status
    },
    get role(): Role {
      return ui.role
    },
    get view(): RigView {
      return ui.view
    },
    set view(v: RigView) {
      ui.view = v
      tool?.view(v)
      refresh()
    },
    play(clip?: string | null) {
      if (clip != null) ui.clip = clip
      ui.pose = clip === null ? 'rest' : 'animate'
      tool?.play()
      refresh()
    },
    load: (m: RigModel | File) => tool?.load(m),
  }
  return el
}
