/*#
# tailor tool

**Cut a garment out of a body, and hand it back.** Draw an outline over the
body's front view and the skin inside it, front and back, becomes cloth:
a rectangle from the waist to the ankles is a pair of trousers. The tool
works on any [rigged body](/rigged-body/) (MakeHuman's, or a mesh the
[rig tool](/rig-tool/) bound), previews the cut on the body as it moves, and
on **done** hands your callback the garment. The
[character builder](/character-builder/)'s **tailor…** opens it.

```javascript
import { mountTailorTool } from 'tosijs-3d'

const tailor = mountTailorTool(scene, {
  body, // a RiggedBody: what it cuts from
  built, // the body on screen (buildBody): what the cut is shown on
  slots: ['top', 'bottom', 'outfit'],
  handleDone: ({ garment, name, slot, look, cut }) => wardrobe.add(garment, { name, slot, look, cut }),
  handleCancel: () => {},
})
```

**Its panel is a system panel** (scissors, on the bar). A bar pinned to its
top carries **undo**, **redo**, **cancel** and **done**; below it:

- **the outline**: you draw the character's left, on your right, and the
  other side is its mirror. Click out points, click the first to close a
  shape, drag a point to move it, press an edge to add one;
- **cloth mesh**: the cloth is cut from an even surface laid over the body
  ([remesh](/remesh/)), **coarse**, **medium** (the default) or **fine**
  (edges about 3, 2 or 1.2 cm), whatever the body's own triangles are; **as
  the body** cuts the body's triangles themselves;
- **thickness** (thicker cloth bridges more of the chest, where the body
  says where its nipples are);
- **made by**: **cutting the skin** (the cloth follows the body),
  **draping cloth** (a front and a back piece laid over the body, sewn where
  the outline runs up and down past its edge and settled under gravity, so
  it bridges hollows and hangs: dresses, tunics, robes; see
  [cloth drape](/cloth-drape/)), or **rings** (round the outline at each
  height: skirts, kilts);
- **material**, **name** and **slot**.

**Undo and redo** (and ⌘Z / ⇧⌘Z through `undo()` / `redo()`, which a host's
keys call while the tool is open): each settled edit, a point dropped or a
slider let go, is a step.

WHAT DONE HANDS BACK is the garment as a mesh at rest, on the body it was
cut from (`garment`: positions, triangles, UVs unwrapped like a sewing
pattern), with what it was cut from (`cut`: the outlines, thickness, how it was made)
so it can be opened again, and the name, slot and material recipe. Binding it
to a body to wear (`bindGarment`) is the host's: a garment file carries the
same mesh.

A host that keeps the garment itself passes `persistent` (no cancel or
done), its own system panel as `panel`, and rows of its own above and below
(`rows: { top, bottom }`); the character builder does, so its tailor is
always on the bar.

`handleChange` hears every edit (a work in progress to keep); `setBody`
moves the cut onto a body reshaped while the tool is open; `unmount` (or
done, or cancel) removes everything it added.
*/
/*{ "parent": "character-builder", "order": 30 }*/

import type * as BABYLON from '@babylonjs/core'
import type { RiggedBody } from './rigged-body.js'
import type { BuiltRig } from './rig-build.js'
import {
  mirrorOutline,
  type GarmentCut,
  type ViewPoint,
} from './garment-cut.js'
import { outlineField3d, type OutlineField } from './outline-field.js'
import {
  cutWith,
  fitCut,
  tailorBody,
  TAILOR_MESH_EDGE,
  type TailorCut,
  type TailorMesh,
} from './tailor-recipe.js'
import { fitProxy, drawnPositions } from './proxy-fit.js'
import { remesh, remeshSteps, type Remeshed } from './remesh.js'
import { drapeGarmentAsync, runSliced } from './cloth-drape.js'
import { humanProxy, proxyMaterial } from './human-proxy.js'
import type { HumanProxy } from './human-pack.js'
import { clothShading, clothRecipe } from './cloth-shading.js'
import { unwrapGarment, type GarmentMesh } from './garment-file.js'
import { materialPicker3d } from './material-picker.js'
import type { MaterialRecipe } from './material-recipe.js'
import { inputField } from './keyboard.js'
import { b3dPanel } from './b3d-panel.js'
import { undoHistory } from './undo-history.js'
import {
  button3d,
  iconBar3d,
  label3d,
  panel3d,
  row3d,
  select3d,
  slider3d,
  toggle3d,
  type Widget3d,
} from './widgets3d.js'

export {
  TAILOR_MESH_EDGE,
  type TailorCut,
  type TailorMesh,
} from './tailor-recipe.js'

/** The work in progress, as `handleChange` hears it. */
export interface TailorState {
  cut: TailorCut
  look: MaterialRecipe
  name: string
  slot: string
}

/** What `handleDone` is handed. */
export interface TailoredGarment extends TailorState {
  /** The garment at rest on the body it was cut from, unwrapped. */
  garment: GarmentMesh
}

export interface TailorToolOptions {
  /** What it cuts from. */
  body: RiggedBody
  /** The body on screen (built from `body`): the cut is shown on it. */
  built: BuiltRig
  /** Where to start: a cut to open again, its material, name and slot. */
  cut?: Partial<TailorCut>
  look?: MaterialRecipe
  name?: string
  slot?: string
  /** The slots to choose from (none: no slot choice). */
  slots?: string[]
  /** Given: a "hide other clothes" toggle that calls this. */
  handleHideOthers?: (hide: boolean) => void
  hideOthers?: boolean
  /** Every edit. */
  handleChange?: (state: TailorState) => void
  /** Done: the tool unmounts and hands this the garment. */
  handleDone?: (garment: TailoredGarment) => void
  /** Cancelled: the tool unmounts and this is called. */
  handleCancel?: () => void
  /**
   * A system panel of the host's (a `<tosi-b3d-panel>` with an icon) to draw
   * in, instead of one of its own. The host keeps it: unmounting leaves it
   * in place for the host to fill, and leaves hiding other clothes to the
   * host too.
   */
  panel?: HTMLElement & { svg: SVGSVGElement | null }
  /**
   * No cancel or done: the host keeps the garment as it goes (when the
   * person switches garment or closes the panel). Undo and redo stay.
   */
  persistent?: boolean
  /** The host's own rows: above the outline, and at the end. */
  rows?: { top?: () => Widget3d[]; bottom?: () => Widget3d[] }
}

export interface TailorTool {
  readonly state: TailorState
  /** The garment as it is now (null with no closed outline). */
  garment(): GarmentMesh | null
  /** The body was reshaped (or rebuilt): cut and show on this one. */
  setBody(body: RiggedBody, built: BuiltRig): void
  done(): void
  cancel(): void
  unmount(): void
  /** Draw the panel again (the host's rows changed). */
  refresh(): void
  /** Step back through the edits made since it opened. */
  undo(): void
  redo(): void
  readonly canUndo: boolean
  readonly canRedo: boolean
}

/**
 * Open the tailor in a `<tosi-b3d>`: a system panel, a preview on `built`,
 * and the garment handed to `handleDone`.
 */
export function mountTailorTool(
  owner: any,
  options: TailorToolOptions
): TailorTool {
  const scene: BABYLON.Scene = owner.scene
  let body = options.body
  let built = options.built
  // Its outlines carried onto this body, if it was drawn on another.
  const cut: TailorCut = fitCut(
    {
      shapes: options.cut?.shapes ?? [],
      thickness: options.cut?.thickness ?? 0.005,
      skirt: options.cut?.skirt ?? false,
      drape: options.cut?.drape ?? false,
      mesh: options.cut?.mesh ?? 'medium',
      on: options.cut?.on,
    },
    body.rig
  )
  let look: MaterialRecipe =
    options.look ??
    clothRecipe({ fabric: 'cotton', colour: '#3b5b8a', recolour: 1 })
  let name = options.name ?? ''
  let slot = options.slot ?? options.slots?.[0] ?? 'top'
  let hideOthers = options.hideOthers ?? false
  let status = ''
  let disposed = false

  const state = (): TailorState => ({
    cut: JSON.parse(JSON.stringify(cut)),
    look: JSON.parse(JSON.stringify(look)),
    name,
    slot,
  })
  /*
  UNDO: the state recorded as each edit settles (a slider drag is one step),
  and restored as opening with it would.
  */
  const history = undoHistory<TailorState>({ limit: 100 })
  history.record(state())
  let stepTimer: ReturnType<typeof setTimeout> | null = null
  let restoring = false
  const buttons = () => `${canUndo()}${canRedo()}`
  const record = () => {
    const was = buttons()
    if (stepTimer != null) clearTimeout(stepTimer)
    stepTimer = null
    history.record(state())
    if (buttons() !== was) refresh()
  }
  // A shape being clicked out is undone point by point first: its points are
  // not a cut yet, so the history has not seen them.
  const canUndo = () =>
    field?.canUndoPoint === true || history.canUndo || stepTimer != null
  const canRedo = () =>
    field?.canRedoPoint === true || (stepTimer == null && history.canRedo)
  const changed = () => {
    options.handleChange?.(state())
    if (restoring) return
    // The buttons are redrawn when the step is recorded, not mid-drag.
    if (stepTimer != null) clearTimeout(stepTimer)
    stepTimer = setTimeout(record, 400)
  }
  const restore = (st: TailorState | undefined) => {
    if (st == null) return
    restoring = true
    const c = JSON.parse(JSON.stringify(st.cut)) as TailorCut
    Object.assign(cut, fitCut(c, body.rig))
    look = JSON.parse(JSON.stringify(st.look))
    name = st.name
    slot = st.slot
    shading?.set({ recipe: look })
    // The outline starts afresh: its selection was in the shapes undone.
    field = null
    recut()
    changed()
    restoring = false
    refresh()
  }
  const undo = () => {
    if (field?.canUndoPoint) return field.undoPoint()
    if (!canUndo()) return
    if (stepTimer != null) record()
    restore(history.undo())
  }
  const redo = () => {
    if (field?.canRedoPoint) return field.redoPoint()
    if (canRedo()) restore(history.redo())
  }

  /*
  THE BODY, as the cut needs it: fitted over with its nipples smoothed (cloth
  bridges them), cut from a body smoothed more for thicker cloth, and the skin
  a skirt may go round (not the arms).
  */
  let fitOn: Float32Array = body.positions
  let notArm: Uint8Array = new Uint8Array(0)
  // The triangles cloth is cut from: not a tail's.
  let cutFrom: Uint32Array = body.indices
  const readBody = () => {
    ;({ fitOn, cutFrom, notArm } = tailorBody(body))
  }
  readBody()

  /*
  THE DUMMY: an even surface over the body to cut cloth from, made once per
  density (half a second or so) and again when the body changes.
  */
  let dummies = new Map<string, Remeshed>()
  const dummy = (mesh: Exclude<TailorMesh, 'body'>): Remeshed => {
    let d = dummies.get(mesh)
    if (!d) {
      d = remesh(fitOn, cutFrom, { edge: TAILOR_MESH_EDGE[mesh] })
      dummies.set(mesh, d)
    }
    return d
  }

  /*
  THE PREVIEW: the cut bound to the body like any garment and drawn on the
  body shown, in its material.
  */
  let made: GarmentCut | null = null
  let mesh: BABYLON.Mesh | null = null
  const shell = (c: GarmentCut): HumanProxy => ({
    ...c,
    name: 'tailored',
    category: 'clothes',
    slot,
    material: { alpha: false, twoSided: cut.skirt || cut.drape === true },
  })
  let material: BABYLON.PBRMaterial | null = null
  let shading: { set(l: { recipe: MaterialRecipe }): void } | null = null
  /** The cut on show: drawn on the body, in its material (null clears it). */
  const show = (next: GarmentCut | null) => {
    mesh?.dispose()
    mesh = null
    made = next
    if (next == null) return
    const proxy = shell(next)
    if (material == null) {
      material = proxyMaterial(scene, proxy)
      shading = clothShading(material)
      shading.set({ recipe: look })
    }
    // Skirts and draped cloth are open: their inside shows.
    const open = cut.skirt || cut.drape === true
    material.backFaceCulling = !open
    material.twoSidedLighting = open
    mesh = humanProxy(scene, built, proxy, fitOn, body.weights, material)
    owner.register?.({ meshes: [mesh] })
  }

  /*
  A DRAPE IS SETTLED IN THE BACKGROUND. It is a simulation (a second or more
  on a fine mesh), so it runs in time slices after the edits pause, the cloth
  as it was stays on show meanwhile, and the next edit stops it: moving a point
  never waits for a drape it has already made stale.
  */
  let draping: AbortController | null = null
  let drapeSoon: ReturnType<typeof setTimeout> | null = null
  /** Done (or cancel) pressed while a drape was settling: finished after it. */
  let finishAfter: boolean | null = null
  const stopDrape = () => {
    draping?.abort()
    draping = null
    if (drapeSoon != null) clearTimeout(drapeSoon)
    drapeSoon = null
  }
  const drapeLater = (outline: ViewPoint[][]) => {
    const density = cut.mesh === 'body' ? 'medium' : cut.mesh ?? 'medium'
    const say = (next: string) => {
      if (next === status) return
      status = next
      refresh()
    }
    say('draping…')
    drapeSoon = setTimeout(() => {
      drapeSoon = null
      const run = (draping = new AbortController())
      // Draped over the even surface (as the body: medium), made in slices
      // too the first time (half a second or more at once).
      const made = dummies.get(density)
      const surface = made
        ? Promise.resolve(made)
        : runSliced(
            remeshSteps(fitOn, cutFrom, { edge: TAILOR_MESH_EDGE[density] }),
            { signal: run.signal }
          ).then((d) => {
            // Not if the body changed meanwhile (that stops this run).
            if (run === draping) dummies.set(density, d)
            return d
          })
      surface
        .then((d) =>
          drapeGarmentAsync(
            d,
            fitOn,
            {
              front: outline,
              thickness: cut.thickness,
              edge: TAILOR_MESH_EDGE[density],
            },
            { signal: run.signal }
          )
        )
        .then(
          (g) => {
            if (run !== draping || disposed) return
            draping = null
            show(g)
            say('')
            if (finishAfter != null) finish(finishAfter)
          },
          (e: Error) => {
            if (run !== draping || disposed || e.name === 'AbortError') return
            draping = null
            show(null)
            say(`could not cut: ${e.message}`)
            finishAfter = null
          }
        )
    }, 200)
  }

  const recut = () => {
    if (disposed) return
    stopDrape()
    const outline = mirrorOutline(cut.shapes.filter((s) => s.length >= 3))
    if (!outline.length) return show(null)
    if (cut.drape && !cut.skirt) return drapeLater(outline)
    try {
      const next = cutWith(body, { fitOn, cutFrom, notArm }, cut, dummy)
      show(next)
      status = ''
    } catch (e) {
      status = `could not cut: ${(e as Error).message}`
      show(null)
    }
  }

  const garment = (): GarmentMesh | null =>
    made == null
      ? null
      : unwrapGarment({
          positions: drawnPositions(made, fitProxy(made, fitOn)),
          triangles: made.triangles,
        })

  /*
  THE PANEL: a system panel of its own, done and cancel first.
  */
  let field: OutlineField | null = null
  // The undo and redo buttons as last drawn.
  let shownButtons = ''
  // Pinned above the scrolling rows: they must not scroll out of reach.
  const header = (): Widget3d[] => {
    shownButtons = buttons()
    return [
      iconBar3d({
        items: [
          {
            icon: 'rotateCcw',
            title: 'undo (⌘Z)',
            dim: !canUndo(),
            handleClick: undo,
          },
          {
            icon: 'rotateCw',
            title: 'redo (⇧⌘Z)',
            dim: !canRedo(),
            handleClick: redo,
          },
          ...(options.persistent
            ? []
            : [
                { spacer: true as const },
                {
                  icon: 'close',
                  title: 'cancel',
                  handleClick: () => finish(false),
                },
                {
                  icon: 'check',
                  title: 'done: keep the garment',
                  handleClick: () => finish(true),
                },
              ]),
        ],
      }),
    ]
  }
  const widgets = (): Widget3d[] => [
    ...(options.rows?.top?.() ?? []),
    ...(status ? [label3d({ text: status, muted: true, compact: true })] : []),
    (field = outlineField3d({
      positions: body.positions,
      indices: body.indices,
      value: cut.shapes,
      // The panel is rebuilt as the status changes (a drape starting and
      // settling): the outline carries on with its selection and open shape.
      editing: field?.editing,
      maxHeight: 400,
      // A drape pins its cloth where the outline is over the body.
      anchors: cut.drape === true && !cut.skirt,
      // The undo buttons light as the open shape gains its first point (and
      // dim as it loses its last); redrawn after the press, not inside it.
      handleOpen: () => {
        setTimeout(() => {
          if (!disposed && buttons() !== shownButtons) refresh()
        })
      },
      handleCommit: (v) => {
        cut.shapes = v
        recut()
        changed()
        if (status) refresh()
      },
    })),
    row3d(
      {},
      button3d({
        label: 'delete point',
        handleClick: () => field?.removeSelected(),
      }),
      button3d({ label: 'clear', handleClick: () => field?.clear() })
    ),
    slider3d({
      label: 'thickness',
      value: cut.thickness,
      min: 0.001,
      max: 0.02,
      step: 0.001,
      handleChange: (v: number) => {
        cut.thickness = v
        recut()
        changed()
      },
    }),
    select3d({
      label: 'cloth mesh',
      value: cut.mesh ?? 'medium',
      options: [
        'coarse',
        'medium',
        'fine',
        { label: 'as the body', value: 'body' },
      ],
      handleChange: (v) => {
        cut.mesh = v as TailorMesh
        recut()
        changed()
      },
    }),
    select3d({
      label: 'made by',
      value: cut.skirt ? 'skirt' : cut.drape ? 'drape' : 'cut',
      options: [
        { label: 'cutting the skin', value: 'cut' },
        { label: 'draping cloth', value: 'drape' },
        { label: 'rings (skirt)', value: 'skirt' },
      ],
      handleChange: (v) => {
        cut.skirt = v === 'skirt'
        cut.drape = v === 'drape'
        recut()
        changed()
        // The outline shows what a drape anchors, and only in drape mode.
        refresh()
      },
    }),
    materialPicker3d({
      label: 'material',
      value: look,
      types: ['cloth'],
      collections: ['fabrics', 'textiles'],
      keep: ['albedo', 'recolour'],
      handleChange: (r) => {
        look = r
        shading?.set({ recipe: look })
        changed()
      },
    }),
    inputField({
      value: name,
      placeholder: 'name the garment',
      handleChange: (v: string) => {
        name = v
        changed()
      },
    }) as unknown as Widget3d,
    ...(options.slots?.length
      ? [
          select3d({
            label: 'slot',
            value: slot,
            options: options.slots,
            handleChange: (v) => {
              slot = String(v)
              changed()
            },
          }),
        ]
      : []),
    ...(options.handleHideOthers
      ? [
          toggle3d({
            label: 'hide other clothes',
            value: hideOthers,
            handleChange: (v: boolean) => {
              hideOthers = v
              options.handleHideOthers?.(v)
            },
          }),
        ]
      : []),
    ...(options.rows?.bottom?.() ?? []),
  ]
  const ownPanel = options.panel == null
  const panelEl =
    options.panel ??
    (b3dPanel({
      icon: 'scissors',
      title: 'Tailor',
      exclusive: 'off',
      open: true,
    }) as unknown as HTMLElement & { svg: SVGSVGElement | null })
  const panelSvg = () =>
    panel3d(
      {
        width: 340,
        height: 'fit',
        maxHeight: Math.min(720, owner.panelRoom?.(panelEl) ?? 720),
        header: header(),
      },
      ...widgets()
    ) as unknown as SVGSVGElement
  function refresh() {
    if (!disposed) panelEl.svg = panelSvg()
  }
  panelEl.svg = panelSvg()
  if (ownPanel) owner.append(panelEl)
  // Redrawn to the view's height once a resize settles.
  owner.addEventListener?.('resizeend', refresh)
  recut()
  if (status) refresh()

  function unmount() {
    if (disposed) return
    if (stepTimer != null) clearTimeout(stepTimer)
    stopDrape()
    disposed = true
    owner.removeEventListener?.('resizeend', refresh)
    mesh?.dispose()
    material?.dispose()
    if (!ownPanel) return
    if (hideOthers) options.handleHideOthers?.(false)
    owner._closeSystemPanel?.(panelEl)
    panelEl.remove()
  }
  function finish(done: boolean) {
    // Done waits for the drape settling now (it is the garment); cancel does not.
    if (done && (draping != null || drapeSoon != null)) {
      finishAfter = true
      return
    }
    finishAfter = null
    const g = done ? garment() : null
    if (done && g == null) {
      status = 'close an outline first'
      refresh()
      return
    }
    const s = state()
    unmount()
    if (done) options.handleDone?.({ ...s, garment: g! })
    else options.handleCancel?.()
  }

  return {
    get state() {
      return state()
    },
    garment,
    setBody(b, k) {
      body = b
      built = k
      // The outlines follow the body: drawn at the knee, still at the knee.
      Object.assign(cut, fitCut(cut, b.rig))
      field = null
      readBody()
      dummies = new Map()
      recut()
      // The outline is drawn over this body now.
      refresh()
    },
    done: () => finish(true),
    cancel: () => finish(false),
    unmount,
    refresh,
    undo,
    redo,
    get canUndo() {
      return canUndo()
    },
    get canRedo() {
      return canRedo()
    },
  }
}
