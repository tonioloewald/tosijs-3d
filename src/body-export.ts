/*#
# body export

**A rigged body out as a GLB, from a panel.** The rows the rig tool and the
character builder put in their **Export** section: which joint names, which
rest pose, how tall, and a button that writes the body shown with
[rigged-body-glb](/rigged-body-glb/) (its springs too, from the rig recipe)
and downloads it. The file plays UAL's clips by name in three.js, Unity,
Godot and Blender; a tail or a strand swings in any VRM loader.

The body on screen was read through Babylon, so its materials are Babylon's.
For the file, the model it came from is read again from its bytes
([glb-rig](/glb-rig/)), and its materials go out as glTF with their
pictures. A model that is not a GLB (an OBJ) goes out in plain grey.

```javascript
import { exportBodyRows } from 'tosijs-3d/body-export'
panel.push(...exportBodyRows(() => ({ body, recipe, source: { url } }), say))
```
*/
/*{ "parent": "rigged-body-glb", "order": 2 }*/

import { button3d, label3d, select3d, type Widget3d } from './widgets3d.js'
import { glbRigTriangles } from './glb-rig.js'
import {
  riggedBodyGlb,
  type RigNaming,
  type RigRestPose,
} from './rigged-body-glb.js'
import type { RiggedBody } from './rigged-body.js'
import type { RigRecipe } from './rig-recipe.js'

/** What an export writes: the body, its recipe, and the model it came from. */
export interface BodyExportTarget {
  body: RiggedBody
  recipe?: RigRecipe | null
  /** The model file, for its materials: a URL or a File, and the node picked. */
  source?: { url?: string; file?: File; pick?: string } | null
  /** The file's name, without `.glb`. */
  name: string
}

/** How the file is written (the panel's choices). */
export interface BodyExportSettings {
  naming: RigNaming
  restPose: RigRestPose
  /** Metres, or 0 for the body's own height. */
  height: number
}

const HEIGHTS = [
  'as made',
  '1.5 m',
  '1.6 m',
  '1.7 m',
  '1.8 m',
  '1.9 m',
  '2.0 m',
]

async function sourceBytes(
  source: BodyExportTarget['source']
): Promise<Uint8Array | null> {
  if (source == null) return null
  const buffer =
    source.file != null
      ? await source.file.arrayBuffer()
      : source.url
      ? await (await fetch(source.url)).arrayBuffer()
      : null
  return buffer != null ? new Uint8Array(buffer) : null
}

/**
 * The body as GLB bytes, with the model's own materials where its file is a
 * GLB of the same mesh. `note` says what was left out.
 */
export async function exportBody(
  target: BodyExportTarget,
  settings: BodyExportSettings
): Promise<{ bytes: Uint8Array; note: string }> {
  let body = target.body
  let note = ''
  const bytes = await sourceBytes(target.source).catch(() => null)
  // Not a GLB (an OBJ, a glTF with its buffers elsewhere): the reader says so.
  const tris = (() => {
    try {
      return bytes != null
        ? glbRigTriangles(bytes, { pick: target.source?.pick })
        : null
    } catch {
      return null
    }
  })()
  if (
    tris != null &&
    tris.indices.length === body.indices.length &&
    tris.surfaces
  )
    body = { ...body, surfaces: tris.surfaces }
  else if (tris != null)
    note = 'its materials did not match the mesh: plain grey'
  else if (target.body.surfaces?.length) note = 'not from a GLB: plain grey'
  const out = riggedBodyGlb(body, {
    naming: settings.naming,
    restPose: settings.restPose,
    ...(settings.height > 0 ? { height: settings.height } : {}),
    ...(target.recipe ? { recipe: target.recipe } : {}),
    generator: 'tosijs-3d',
  })
  return { bytes: out, note }
}

/** Save bytes as a file. */
export function downloadBytes(
  name: string,
  bytes: Uint8Array,
  type = 'model/gltf-binary'
): void {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const settings: BodyExportSettings = {
  naming: 'ue',
  restPose: 't-pose',
  height: 0,
}

/**
 * An Export section: names, rest pose, height and the button. `target`
 * gives what to write when pressed (null: nothing to export, and why);
 * `say` reports what happened.
 */
export function exportBodyRows(
  target: () => Promise<BodyExportTarget | string> | BodyExportTarget | string,
  say: (message: string) => void
): Widget3d[] {
  return [
    label3d({ text: 'Export', collapsible: true }),
    select3d({
      label: 'joint names',
      value: settings.naming === 'ue' ? 'UE (UAL)' : 'Mixamo',
      options: ['UE (UAL)', 'Mixamo'],
      handleChange: (v) => {
        settings.naming = v === 'Mixamo' ? 'mixamo' : 'ue'
      },
    }),
    select3d({
      label: 'rest pose',
      value: settings.restPose === 't-pose' ? 'T-pose' : 'as rigged',
      options: ['T-pose', 'as rigged'],
      handleChange: (v) => {
        settings.restPose = v === 'T-pose' ? 't-pose' : 'source'
      },
    }),
    select3d({
      label: 'height',
      value:
        settings.height > 0 ? `${settings.height.toFixed(1)} m` : 'as made',
      options: HEIGHTS,
      handleChange: (v) => {
        settings.height = v === 'as made' ? 0 : parseFloat(String(v))
      },
    }),
    button3d({
      label: 'export GLB',
      handleClick: () => {
        void (async () => {
          const t = await target()
          if (typeof t === 'string') {
            say(t)
            return
          }
          say(`exporting ${t.name}…`)
          try {
            const { bytes, note } = await exportBody(t, settings)
            downloadBytes(`${t.name}.glb`, bytes)
            say(
              `exported ${t.name}.glb (${(bytes.byteLength / 1e6).toFixed(
                1
              )} MB)${note ? `; ${note}` : ''}`
            )
          } catch (e) {
            say(`could not export: ${(e as Error).message}`)
          }
        })()
      },
    }),
  ]
}
