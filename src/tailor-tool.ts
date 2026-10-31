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

**Its panel is a system panel** (scissors, on the bar), with **cancel** and
**done** at its top, then:

- **the outline**: you draw the character's left, on your right, and the
  other side is its mirror. Click out points, click the first to close a
  shape, drag a point to move it, press an edge to add one;
- **thickness** (thicker cloth bridges more of the chest, where the body
  says where its nipples are) and **skirt** (rings round the outline at each
  height: skirts, kilts, robes; never the arms, which it cannot follow
  without cloth simulation);
- **material**, **name** and **slot**.

WHAT DONE HANDS BACK is the garment as a mesh at rest, on the body it was
cut from (`garment`: positions, triangles, UVs unwrapped like a sewing
pattern), with what it was cut from (`cut`: the outlines, thickness, skirt)
so it can be opened again, and the name, slot and material recipe. Binding it
to a body to wear (`bindGarment`) is the host's: a garment file carries the
same mesh.

`handleChange` hears every edit (a work in progress to keep); `setBody`
moves the cut onto a body reshaped while the tool is open; `unmount` (or
done, or cancel) removes everything it added.
*/
/*{ "parent": "character-builder", "order": 30 }*/

import type * as BABYLON from '@babylonjs/core'
import type { RiggedBody } from './rigged-body.js'
import type { BuiltRig } from './rig-build.js'
import {
  cutGarment,
  skirtGarment,
  mirrorOutline,
  type GarmentCut,
  type ViewPoint,
} from './garment-cut.js'
import { outlineField3d, type OutlineField } from './outline-field.js'
import { smoothUnder, fitProxy, drawnPositions } from './proxy-fit.js'
import { humanProxy, proxyMaterial } from './human-proxy.js'
import type { HumanProxy } from './human-pack.js'
import { clothShading, clothRecipe } from './cloth-shading.js'
import { unwrapGarment, type GarmentMesh } from './garment-file.js'
import { materialPicker3d } from './material-picker.js'
import type { MaterialRecipe } from './material-recipe.js'
import { inputField } from './keyboard.js'
import { b3dPanel } from './b3d-panel.js'
import {
  button3d,
  label3d,
  panel3d,
  row3d,
  select3d,
  slider3d,
  toggle3d,
  type Widget3d,
} from './widgets3d.js'

/** What the tailor is making: enough to open it again. */
export interface TailorCut {
  /** Half outlines, [x, y] in metres on the character's left. */
  shapes: ViewPoint[][]
  /** Metres. */
  thickness: number
  skirt: boolean
}

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
}

/** Cloth over the body: the cut is fitted a little out from the skin. */
const EASE = 6

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
  const cut: TailorCut = {
    shapes: options.cut?.shapes ?? [],
    thickness: options.cut?.thickness ?? 0.005,
    skirt: options.cut?.skirt ?? false,
  }
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
  const changed = () => options.handleChange?.(state())

  /*
  THE BODY, as the cut needs it: fitted over with its nipples smoothed (cloth
  bridges them), cut from a body smoothed more for thicker cloth, and the skin
  a skirt may go round (not the arms).
  */
  let fitOn: Float32Array = body.positions
  let notArm: Uint8Array = new Uint8Array(0)
  // The triangles cloth is cut from: not a tail's (behind the body, inside
  // any outline drawn round the hips, and swung by its spring).
  let cutFrom: Uint32Array = body.indices
  const readBody = () => {
    const nipples = body.regions.nipples
    fitOn = nipples
      ? smoothUnder(body.positions, body.indices, nipples)
      : body.positions
    const arm = new Set(
      body.rig.joints
        .map((j, i) =>
          /^(clavicle|upperarm|lowerarm|hand|thumb|index|middle|ring|pinky)/.test(
            j.name
          )
            ? i
            : -1
        )
        .filter((i) => i >= 0)
    )
    const n = body.positions.length / 3
    notArm = new Uint8Array(n)
    const w = body.weights
    for (let v = 0; v < n; v++) {
      let a = 0
      for (let k = 0; k < 4; k++)
        if (arm.has(w.indices[v * 4 + k])) a += w.weights[v * 4 + k]
      notArm[v] = a < 0.5 ? 1 : 0
    }
    const tail = new Set(
      body.rig.joints
        .map((j, i) => (/^tail_/.test(j.name) ? i : -1))
        .filter((i) => i >= 0)
    )
    if (tail.size === 0) cutFrom = body.indices
    else {
      const onTail = new Uint8Array(n)
      for (let v = 0; v < n; v++) {
        let t = 0
        for (let k = 0; k < 4; k++)
          if (tail.has(w.indices[v * 4 + k])) t += w.weights[v * 4 + k]
        onTail[v] = t >= 0.5 ? 1 : 0
      }
      const kept: number[] = []
      const I = body.indices
      for (let i = 0; i < I.length; i += 3)
        if (!onTail[I[i]] && !onTail[I[i + 1]] && !onTail[I[i + 2]])
          kept.push(I[i], I[i + 1], I[i + 2])
      cutFrom = Uint32Array.from(kept)
    }
  }
  readBody()

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
    material: { alpha: false, twoSided: cut.skirt },
  })
  let material: BABYLON.PBRMaterial | null = null
  let shading: { set(l: { recipe: MaterialRecipe }): void } | null = null
  const recut = () => {
    if (disposed) return
    mesh?.dispose()
    mesh = null
    made = null
    const outline = mirrorOutline(cut.shapes.filter((s) => s.length >= 3))
    if (outline.length) {
      try {
        const nipples = body.regions.nipples
        // Thicker cloth bridges more of the chest.
        const cutOn = nipples
          ? smoothUnder(body.positions, body.indices, nipples, {
              bridge: cut.thickness / 0.02,
            })
          : fitOn
        made = cut.skirt
          ? skirtGarment(fitOn, cutFrom, {
              front: outline,
              thickness: cut.thickness,
              anchor: notArm,
            })
          : cutGarment(cutOn, cutFrom, {
              front: outline,
              thickness: cut.thickness,
              ease: EASE,
              fitOn,
            })
        const proxy = shell(made)
        if (material == null) {
          material = proxyMaterial(scene, proxy)
          shading = clothShading(material)
          shading.set({ recipe: look })
        }
        material.backFaceCulling = !cut.skirt
        material.twoSidedLighting = cut.skirt
        mesh = humanProxy(scene, built, proxy, fitOn, body.weights, material)
        owner.register?.({ meshes: [mesh] })
        status = ''
      } catch (e) {
        status = `could not cut: ${(e as Error).message}`
        made = null
      }
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
  const widgets = (): Widget3d[] => [
    row3d(
      {},
      button3d({ label: 'cancel', handleClick: () => finish(false) }),
      button3d({ label: 'done', handleClick: () => finish(true) })
    ),
    ...(status ? [label3d({ text: status, muted: true, compact: true })] : []),
    (field = outlineField3d({
      positions: body.positions,
      indices: body.indices,
      value: cut.shapes,
      maxHeight: 400,
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
    toggle3d({
      label: 'skirt',
      value: cut.skirt,
      handleChange: (v: boolean) => {
        cut.skirt = v
        recut()
        changed()
      },
    }),
    materialPicker3d({
      label: 'material',
      value: look,
      types: ['cloth'],
      collections: ['fabrics'],
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
  ]
  const panelEl = b3dPanel({
    icon: 'scissors',
    title: 'Tailor',
    exclusive: 'off',
    open: true,
  }) as unknown as HTMLElement & { svg: SVGSVGElement | null }
  const panelSvg = () =>
    panel3d(
      { width: 340, height: 'fit', maxHeight: 720 },
      ...widgets()
    ) as unknown as SVGSVGElement
  function refresh() {
    if (!disposed) panelEl.svg = panelSvg()
  }
  panelEl.svg = panelSvg()
  owner.append(panelEl)
  recut()
  if (status) refresh()

  function unmount() {
    if (disposed) return
    disposed = true
    if (hideOthers) options.handleHideOthers?.(false)
    mesh?.dispose()
    material?.dispose()
    owner._closeSystemPanel?.(panelEl)
    panelEl.remove()
  }
  function finish(done: boolean) {
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
      readBody()
      recut()
      // The outline is drawn over this body now.
      refresh()
    },
    done: () => finish(true),
    cancel: () => finish(false),
    unmount,
  }
}
