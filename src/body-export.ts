/*#
# body export

**A rigged body out as a GLB, from a panel.** The rows the rig tool and the
character builder put in their **Export** section: which joint names, which
rest pose, how tall, and a button that writes the body shown with
[rigged-body-glb](/rigged-body-glb/) (its springs too, from the rig recipe)
and downloads it. The file plays UAL's clips by name in three.js, Unity,
Godot and Blender; a tail or a strand swings in any VRM loader. With
**animation** set to the clip playing, that clip goes in too, retargeted onto
the skeleton as written (from UAL's file, a GLB's animations or a BVH
capture: `clip` on the target says which).

The body on screen was read through Babylon, so its materials are Babylon's.
For the file, the model it came from is read again from its bytes
([glb-rig](/glb-rig/)), and its materials go out as glTF with their
pictures. A model that is not a GLB (an OBJ) goes out in plain grey.

**Pictures** scales the file's textures down to a longest side (2048, 1024
or 512), and **compress pictures** turns opaque PNGs into JPEGs at its
**quality** ([glb textures](/glb-textures/)). With neither, every picture
goes out exactly as made.

```javascript
import { exportBodyRows } from 'tosijs-3d/body-export'
panel.push(...exportBodyRows(() => ({ body, recipe, source: { url } }), say))
```

`exportForm(pop, { name, target, say, formats })` is the same as a modal: the
file's name, its format (a GLB, or a format the host adds, such as a
character file) and the GLB's options. The character builder opens it from
its Character menu.
*/
/*{ "parent": "rigged-body-glb", "order": 2 }*/

import {
  button3d,
  label3d,
  select3d,
  slider3d,
  toggle3d,
  type Widget3d,
} from './widgets3d.js'
import { glbNodePosition, glbRigTriangles } from './glb-rig.js'
import type { Grip } from './hand-socket.js'
import type { GarmentProxy } from './garment-proxy.js'
import {
  riggedBodyGlb,
  type HeldItem,
  type RigNaming,
  type RigRestPose,
} from './rigged-body-glb.js'
import type { RiggedBody } from './rigged-body.js'
import type { RigRecipe } from './rig-recipe.js'
import { readGlbClips, type GlbClipSource } from './glb-clips.js'
import { readBvh } from './bvh.js'
import {
  changesPictures,
  compactGlbTextures,
  type PictureOptions,
  type TextureLevel,
} from './glb-textures.js'
import { inputField } from './keyboard.js'
import { bakeClothLook } from './cloth-bake.js'
import type { ClipOut } from './rigged-body-glb.js'

/** What an export writes: the body, its recipe, and the model it came from. */
export interface BodyExportTarget {
  body: RiggedBody
  recipe?: RigRecipe | null
  /** The model file, for its materials: a URL or a File, and the node picked. */
  source?: { url?: string; file?: File; pick?: string } | null
  /** The file's name, without `.glb`. */
  name: string
  /**
   * What the right hand holds: a library model (`url`, its `model` node and
   * its `gripNode`, `_grip`), placed by `grip`; `extras` (its licence) go on
   * its mesh. See riggedBodyGlb's `held`.
   */
  /** Garments bound to `body` (a character's `wornGarments()`). */
  garments?: GarmentProxy[]
  held?: {
    grip: Grip
    url: string
    model: string
    gripNode?: string
    extras?: Record<string, unknown>
  } | null
  /** The clip playing, for **animation**: its file and its name there. */
  clip?: ExportClip | null
  /** The eyes' picture (see riggedBodyGlb's `eyeTexture`). */
  eyeTexture?: { bytes: Uint8Array; mimeType: string } | null
  /** Written into `asset.extras` (the builder puts its settings there). */
  extras?: Record<string, unknown>
}

/** A clip as its file: a GLB's animation by name, or a BVH capture. */
export interface ExportClip {
  /** Its name in the file (a BVH holds one, whatever it is called). */
  name: string
  kind: 'glb' | 'bvh'
  /** The file's bytes, or where to fetch them. */
  bytes?: Uint8Array
  url?: string
  /** Spread the arms (the body's recipe's `armSpaceDeg`). */
  armSpaceDeg?: number
  /** Turn the feet (the body's recipe's `footTurnDeg`). */
  footTurnDeg?: number
  /** Left to right (see retarget's `mirror`); named "<name> (mirrored)". */
  mirror?: boolean
  /** The animation's `extras`: its licence. */
  extras?: Record<string, unknown>
}

/** How the file is written (the panel's choices). */
export interface BodyExportSettings {
  naming: RigNaming
  restPose: RigRestPose
  /** Metres, or 0 for the body's own height. */
  height: number
  /** Whether the clip playing goes in (default not). */
  animation?: 'none' | 'playing'
  /** The longest side its pictures may have (see glb-textures; default as made). */
  textures?: TextureLevel
  /** Opaque PNGs become JPEGs at `quality` (default off). */
  compressPictures?: boolean
  /** JPEG quality, 0 to 1 (default 0.85). */
  pictureQuality?: number
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

// A clip library (UAL's is megabytes) is read once a page.
const clipSources = new Map<string, Promise<GlbClipSource>>()

/** A clip from its file, as riggedBodyGlb's `clips` takes it (null: not in the file). */
export async function exportClip(c: ExportClip): Promise<ClipOut | null> {
  const read = async () => {
    const bytes =
      c.bytes ?? new Uint8Array(await (await fetch(c.url!)).arrayBuffer())
    return c.kind === 'bvh'
      ? readBvh(new TextDecoder().decode(bytes), { name: c.name })
      : readGlbClips(bytes)
  }
  let from: GlbClipSource
  if (c.url != null && c.bytes == null) {
    if (!clipSources.has(c.url)) clipSources.set(c.url, read())
    from = await clipSources.get(c.url)!.catch((e) => {
      clipSources.delete(c.url!)
      throw e
    })
  } else from = await read()
  const clip =
    c.kind === 'bvh' ? from.clips[0] : from.clips.find((k) => k.name === c.name)
  if (clip == null) return null
  return {
    from,
    clip,
    name: c.mirror ? `${c.name} (mirrored)` : c.name,
    ...(c.mirror ? { mirror: true } : {}),
    ...(c.armSpaceDeg ? { armSpaceDeg: c.armSpaceDeg } : {}),
    ...(c.footTurnDeg ? { footTurnDeg: c.footTurnDeg } : {}),
    ...(c.extras ? { extras: c.extras } : {}),
  }
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
  else if (
    target.body.surfaces?.length &&
    !target.body.surfaces.some((s) =>
      Array.isArray((s.material as any)?.baseColorFactor)
    )
  )
    // A body that brings its own glTF materials (MakeHuman's skin) keeps them.
    note = 'not from a GLB: plain grey'
  const held = target.held
    ? await heldItem(target.held).catch(() => {
        note = [
          note,
          `the ${target.held!.model} could not be read: hand socket only`,
        ]
          .filter(Boolean)
          .join('; ')
        return { grip: target.held!.grip }
      })
    : undefined
  const clip =
    settings.animation === 'playing' && target.clip
      ? await exportClip(target.clip).catch(() => null)
      : null
  if (settings.animation === 'playing' && clip == null)
    note = [note, 'no clip to put in'].filter(Boolean).join('; ')
  const out = riggedBodyGlb(body, {
    ...(held ? { held } : {}),
    ...(clip ? { clips: [clip] } : {}),
    ...(target.eyeTexture ? { eyeTexture: target.eyeTexture } : {}),
    ...(target.garments?.length
      ? { garments: target.garments, bake: bakeClothLook }
      : {}),
    naming: settings.naming,
    restPose: settings.restPose,
    ...(settings.height > 0 ? { height: settings.height } : {}),
    ...(target.recipe ? { recipe: target.recipe } : {}),
    ...(target.extras ? { extras: target.extras } : {}),
    generator: 'tosijs-3d',
  })
  const pictures = pictureOptions(settings)
  const written = !changesPictures(pictures)
    ? out
    : await compactGlbTextures(out, pictures).catch((e) => {
        note = [note, `pictures kept as made: ${(e as Error).message}`]
          .filter(Boolean)
          .join('; ')
        return out
      })
  return { bytes: written, note }
}

/** A library model as riggedBodyGlb's `held`: its mesh and grip point, read from its file. */
async function heldItem(
  h: NonNullable<BodyExportTarget['held']>
): Promise<HeldItem> {
  const bytes = new Uint8Array(await (await fetch(h.url)).arrayBuffer())
  const pick = h.model
  return {
    grip: h.grip,
    item: glbRigTriangles(bytes, { pick }),
    gripPoint:
      (h.gripNode && glbNodePosition(bytes, h.gripNode, { pick })) || undefined,
    ...(h.extras ? { extras: h.extras } : {}),
  }
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
  animation: 'none',
  textures: 'as made',
  compressPictures: false,
  pictureQuality: 0.85,
}

/** An export's settings as glb-textures' options. */
export function pictureOptions(
  s: Readonly<BodyExportSettings>
): PictureOptions {
  return {
    size: s.textures ?? 'as made',
    compress: s.compressPictures === true,
    quality: s.pictureQuality ?? 0.85,
  }
}

const TEXTURES: Record<TextureLevel, string> = {
  'as made': 'as made',
  '2048': 'up to 2048',
  '1024': 'up to 1024',
  '512': 'up to 512',
}

/** The GLB's rig options as rows: joint names, rest pose, height, animation. */
function glbOptionRows(): Widget3d[] {
  return [
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
    select3d({
      label: 'animation',
      value: settings.animation === 'playing' ? 'the clip playing' : 'none',
      options: ['none', 'the clip playing'],
      handleChange: (v) => {
        settings.animation = v === 'none' ? 'none' : 'playing'
      },
    }),
  ]
}

/** The pictures' options as rows: size limit, compress, quality. */
function pictureRows(): Widget3d[] {
  return [
    select3d({
      label: 'pictures',
      value: TEXTURES[settings.textures ?? 'as made'],
      options: Object.values(TEXTURES),
      handleChange: (v) => {
        settings.textures =
          (Object.keys(TEXTURES) as TextureLevel[]).find(
            (k) => TEXTURES[k] === v
          ) ?? 'as made'
      },
    }),
    toggle3d({
      label: 'compress pictures',
      value: settings.compressPictures === true,
      handleChange: (v) => {
        settings.compressPictures = v === true
      },
    }),
    slider3d({
      label: 'quality',
      value: settings.pictureQuality ?? 0.85,
      min: 0.5,
      max: 1,
      step: 0.05,
      handleChange: (v) => {
        settings.pictureQuality = Number(v)
      },
    }),
  ]
}

/** Write a GLB of `t` with the current settings and download it. */
async function exportAndSave(
  t: BodyExportTarget,
  say: (message: string) => void
): Promise<void> {
  say(`exporting ${t.name}…`)
  try {
    const { bytes, note } = await exportBody(t, settings)
    downloadBytes(`${t.name}.glb`, bytes)
    say(
      `exported ${t.name}.glb (${(bytes.byteLength / 1e6).toFixed(1)} MB)${
        note ? `; ${note}` : ''
      }`
    )
  } catch (e) {
    say(`could not export: ${(e as Error).message}`)
  }
}

/** Where an export form is shown: a modal's `show` and `close`. */
export interface ExportPop {
  show(widgets: Widget3d[]): void
  close(): void
}

/** A format an export form offers besides the GLB (a character file, say). */
export interface ExportFormat {
  label: string
  /** Writes it under `name` with the form's settings (it closes first). */
  write: (
    name: string,
    settings: Readonly<BodyExportSettings>
  ) => void | Promise<void>
}

/**
 * THE EXPORT AS A MODAL: the file's name, its format (`GLB`, then any
 * `formats` the host adds) and, for a GLB, its options (joint names, rest
 * pose, height, animation, pictures). `target(name, settings)` gives what to
 * write (or why not); `say` reports what happened. A format's `write` gets
 * the settings too, so a character file can scale its pictures the same way.
 */
export function exportForm(
  pop: ExportPop,
  options: {
    name: string
    target: (
      name: string,
      settings: Readonly<BodyExportSettings>
    ) => Promise<BodyExportTarget | string> | BodyExportTarget | string
    say: (message: string) => void
    formats?: ExportFormat[]
  }
): Widget3d[] {
  let name = options.name
  let format = 'GLB'
  const others = options.formats ?? []
  const clean = (n: string) =>
    n
      .trim()
      .replace(/[^\w-]+/g, '-')
      .replace(/^-|-$/g, '') || 'character'
  const go = () => {
    const file = clean(name)
    pop.close()
    const other = others.find((f) => f.label === format)
    if (other != null) {
      void other.write(file, { ...settings })
      return
    }
    void (async () => {
      const t = await options.target(file, { ...settings })
      if (typeof t === 'string') return options.say(t)
      await exportAndSave({ ...t, name: file }, options.say)
    })()
  }
  const form = (): Widget3d[] => [
    label3d({ text: 'Export', icon: 'download' }),
    inputField({
      value: name,
      placeholder: 'file name',
      handleChange: (v) => {
        name = v
      },
      handleEnter: (v) => {
        name = v
        go()
      },
    }),
    ...(others.length
      ? [
          select3d({
            label: 'format',
            value: format,
            options: ['GLB', ...others.map((f) => f.label)],
            handleChange: (v) => {
              format = String(v)
              pop.show(form())
            },
          }),
        ]
      : []),
    ...(format === 'GLB' ? glbOptionRows() : []),
    ...pictureRows(),
    button3d({ label: 'export', default: true, handleClick: go }),
    button3d({ label: 'cancel', handleClick: () => pop.close() }),
  ]
  return form()
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
    label3d({ text: 'Export', icon: 'download', collapsible: true }),
    ...glbOptionRows(),
    ...pictureRows(),
    button3d({
      label: 'export GLB',
      handleClick: () => {
        void (async () => {
          const t = await target()
          if (typeof t === 'string') return say(t)
          await exportAndSave(t, say)
        })()
      },
    }),
  ]
}
