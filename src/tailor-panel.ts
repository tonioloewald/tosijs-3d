/*#
# tailor panel

**The tailor, always on the system bar, and the wardrobe it keeps.** This is
the [character builder](/character-builder/)'s tailor as a piece any page
with a character can mount: a scissors button opens a panel with a slot and a
garment picker. A garment of your own made on the body shown opens on its
outline in the [tailor tool](/tailor-tool/); **(new garment)** starts one;
anything else is worn and the panel says why it cannot be cut. There is no
done or cancel: switching slot or garment, or closing the panel, keeps a
closed outline as a garment file (kept in a store, worn in its slot), and
undo covers the edits. Forget, export (GLB or OBJ, with the body as a helper
or alone) and import (a GLB or OBJ from Blender) are at the bottom.

```
const tailor = tailorPanel(b3dEl, {
  character: () => ch,
  target: () => ch.shown ?? 'loading the body…',
  slots: CHARACTER_SLOTS,
  choices: (slot) => ch.choices(slot),
  worn: (slot) => ch.settings[slot],
  wear: (slot, name) => ch.set({ [slot]: name }),
  madeOn: (source) => ({ format: 'tosijs-garment', version: 1, source }),
  draft: { get: () => draft, set: (d) => { draft = d } },
  save: (data, name, type) => download(data, name, type),
})
```

The host keeps what outlives the panel: the new garment's DRAFT (its outline,
thickness, mode, look and name, which a character file carries), the slot,
and what each slot wears. The store keeps garment files by name; the default,
`garmentStore()`, is this browser's IndexedDB (`tosijs-garments`), shared by
every page on the site.

The host also tells the tailor when to step aside: `keep()` before the body
changes under it (another source, the rig tool), `begin()` when it is back,
and the tool's `setBody` after a reshape (`editing.source` says which body it
was cutting). `tool` is the tailor tool while one is open, for undo and redo.
*/
/*{ "parent": "tailor-tool" }*/

import { b3dPanel } from './b3d-panel.js'
import {
  panel3d,
  select3d,
  button3d,
  toggle3d,
  text3d,
  type Widget3d,
} from './widgets3d.js'
import {
  mountTailorTool,
  type TailorTool,
  type TailorState,
} from './tailor-tool.js'
import {
  readGarment,
  writeGarmentGlb,
  writeGarmentObj,
  type GarmentMeta,
} from './garment-file.js'
import { clothRecipe, type MaterialRecipe } from './material-recipe.js'
import { chooseFile } from './choose-file.js'
import type { RiggedBody } from './rigged-body.js'

/** What the garment picker offers to start a garment from nothing. */
export const NEW_GARMENT = '(new garment)'

/** A new garment's work in progress, kept by the host between sessions. */
export interface TailorDraft {
  cut: TailorState['cut']
  look: MaterialRecipe
  name: string
}

/** Where garment files are kept, by name. */
export interface GarmentStore {
  put(name: string, bytes: Uint8Array): Promise<void>
  delete(name: string): Promise<void>
  /** Every file kept. */
  all(): Promise<Uint8Array[]>
}

/** This browser's garment files (IndexedDB `tosijs-garments`). */
export function garmentStore(): GarmentStore {
  const run = async <T>(
    mode: IDBTransactionMode,
    fn: (st: IDBObjectStore) => IDBRequest | void
  ): Promise<T> => {
    const db = await new Promise<IDBDatabase>((ok, no) => {
      const r = indexedDB.open('tosijs-garments', 1)
      r.onupgradeneeded = () => r.result.createObjectStore('garments')
      r.onsuccess = () => ok(r.result)
      r.onerror = () => no(r.error)
    })
    return new Promise((ok, no) => {
      const t = db.transaction('garments', mode)
      const req = fn(t.objectStore('garments'))
      t.oncomplete = () => ok((req as IDBRequest | undefined)?.result)
      t.onerror = () => no(t.error)
    })
  }
  return {
    put: (name, bytes) => run('readwrite', (st) => st.put(bytes, name)),
    delete: (name) => run('readwrite', (st) => st.delete(name)),
    all: () => run('readonly', (st) => st.getAll()),
  }
}

/** A get/set pair: a value the host keeps. */
export interface Kept<T> {
  get(): T
  set(value: T): void
}

export interface TailorPanelOptions {
  /** The character dressed (`makeCharacter`), or null while it is made. */
  character: () => any
  /**
   * The body to cut from (`{ body, built, source }`, a character's `shown`),
   * or why there is none just now (said in the panel).
   */
  target: () => { body: RiggedBody; built: any; source: string } | string
  slots: readonly string[]
  /** What a slot can wear, by name. */
  choices: (slot: string) => string[]
  /** What a slot wears now, and wear something in it. */
  worn: (slot: string) => string
  wear: (slot: string, name: string) => void
  /** What a new garment says it was made on (`base`, `pack`, `body`; or `source`). */
  madeOn: (source: string) => GarmentMeta
  /** A name no garment may take (MakeHuman's own clothes). */
  reserved?: (name: string) => boolean
  /** Where garment files go (default `garmentStore()`). */
  store?: GarmentStore
  /** The new garment's draft. */
  draft: Kept<TailorDraft>
  /** The slot the tailor is on (default its own, starting at `top`). */
  slot?: Kept<string>
  /** "Hide other clothes" (default its own). */
  hideOthers?: Kept<boolean>
  /** Export with the body as a helper (default its own, on). */
  includeBody?: Kept<boolean>
  /** The body as a helper in an exported garment. */
  helperBody: () => {
    positions: ArrayLike<number>
    triangles: ArrayLike<number>
  } | null
  /** Save a file: a GLB's bytes or an OBJ's text. */
  save: (data: Uint8Array | string, name: string, type: string) => void
  /** The draft or the wardrobe changed: the host's autosave. */
  handleChange?: () => void
  /** A garment was kept or forgotten: the host's panels list them. */
  handleWardrobe?: () => void
  /** A message for the user (also shown in the panel). */
  handleMessage?: (message: string) => void
}

export interface TailorPanelHandle {
  /** The `<tosi-b3d-panel>` on the system bar. */
  readonly panel: HTMLElement
  readonly open: boolean
  /** The tailor tool while it is cutting. */
  readonly tool: TailorTool | null
  /** What is being cut: its slot, its name (null for a new one), its body's source. */
  readonly editing: { slot: string; name: string | null; source: string } | null
  readonly message: string
  /** Cut the picked garment (or a new one), or say why not. */
  begin(): void
  /** Keep a closed outline as a garment and put the tool away. */
  keep(): Promise<void>
  /** Forget the picked garment of your own, its file too. */
  forget(): Promise<void>
  refresh(): void
  say(message: string): void
  /** The garment to take to an editor (the one being cut, else the slot's own), or null. */
  garmentFile(
    format: 'glb' | 'obj',
    bodyAlone?: boolean
  ): Uint8Array | string | null
  /** Keep a garment file from an editor, worn in its slot. */
  importFrom(
    data: ArrayBuffer | Uint8Array | string,
    fileName: string
  ): Promise<void>
}

const own = <T>(v: T): Kept<T> => ({
  get: () => v,
  set: (x) => {
    v = x
  },
})
const plain = <T>(v: T): T => JSON.parse(JSON.stringify(v))

/** The tailor on the system bar of `el` (a `<tosi-b3d>`). */
export function tailorPanel(
  el: any,
  options: TailorPanelOptions
): TailorPanelHandle {
  const store = options.store ?? garmentStore()
  const slotOf = options.slot ?? own('top')
  const hideOthers = options.hideOthers ?? own(false)
  const includeBody = options.includeBody ?? own(true)
  const ch = () => options.character()
  const source = () => ch()?.settings?.source ?? 'MakeHuman'

  let tool: TailorTool | null = null
  let editing: (TailorPanelHandle['editing'] & { start: string }) | null = null
  let open = false
  let pick = NEW_GARMENT
  let message = ''
  let idleMessage = 'open to tailor'

  const panel = b3dPanel({
    icon: 'scissors',
    title: 'Tailor',
    exclusive: 'off',
  })
  el.append(panel)

  const say = (m: string) => {
    message = m
    options.handleMessage?.(m)
    refresh()
  }
  // A name of its own: not reserved, and not another garment's unless it is
  // the one being replaced.
  const freeName = (wanted: string, replacing: string | null) => {
    const base = (wanted || 'garment').trim()
    const taken = (n: string) =>
      n === 'none' ||
      options.reserved?.(n) === true ||
      (ch()?.garments.has(n) && n !== replacing)
    let n = base
    for (let i = 2; taken(n); i++) n = `${base} ${i}`
    return n
  }
  // A garment file kept and worn from its slot.
  const keepFile = async (bytes: Uint8Array, slot: string) => {
    await store.put(readGarment(bytes).meta!.name!, bytes)
    const g = await ch().addGarment(bytes)
    message = ''
    if (options.worn(slot) === g.name) ch().redress()
    else options.wear(slot, g.name)
    options.handleWardrobe?.()
    options.handleChange?.()
  }
  // A garment of your own, made on this body, with an outline to edit.
  const tailored = (name: string) => {
    const g = ch()?.garments.get(name)
    return g && g.source === source() && g.cut ? g : null
  }
  // Opening on a slot: what it wears; an empty slot, or one wearing what this
  // body cannot (MakeHuman's shoes while another body is shown), starts a new
  // garment. (The menu would show its first choice for a value not in it.)
  const defaultPick = () => {
    const slot = slotOf.get()
    const worn = options.worn(slot)
    return worn !== 'none' && options.choices(slot).includes(worn)
      ? worn
      : NEW_GARMENT
  }
  const top = (): Widget3d[] => {
    const slot = slotOf.get()
    return [
      select3d({
        label: 'slot',
        value: slot,
        options: [...options.slots],
        handleChange: (v) => {
          if (v === slotOf.get()) return
          void keep().then(() => {
            slotOf.set(String(v))
            pick = defaultPick()
            begin()
          })
        },
      }),
      select3d({
        label: 'garment',
        value: pick,
        options: [
          ...options.choices(slot).filter((n) => n !== 'none'),
          NEW_GARMENT,
        ],
        handleChange: (v) => {
          if (v === pick) return
          void keep().then(() => {
            pick = String(v)
            // Something to wear (anything but a new one) is worn.
            if (pick !== NEW_GARMENT) options.wear(slot, pick)
            begin()
          })
        },
      }),
    ]
  }
  const bottom = (): Widget3d[] => {
    const mine = pick !== NEW_GARMENT && ch()?.garments.get(pick)
    return [
      ...(mine
        ? [
            button3d({
              label: `forget ${pick}`,
              handleClick: () => void forget(),
            }),
            toggle3d({
              label: 'include the body (a helper)',
              value: includeBody.get(),
              handleChange: (v: boolean) => includeBody.set(v),
            }),
            button3d({
              label: 'export GLB',
              handleClick: () => exportGarment('glb'),
            }),
            button3d({
              label: 'export OBJ',
              handleClick: () => exportGarment('obj'),
            }),
          ]
        : []),
      // The body alone, to model a garment from nothing beside it.
      button3d({
        label: 'export the body alone',
        handleClick: () => exportGarment('glb', true),
      }),
      button3d({
        label: 'import a garment…',
        handleClick: () => importGarment(),
      }),
      ...(message ? [text3d({ text: message })] : []),
    ]
  }
  // The panel with nothing to cut: what the slot wears, or why not.
  const idle = (m: string) => {
    idleMessage = m
    panel.svg = panel3d(
      {
        width: 340,
        height: 'fit',
        maxHeight: Math.min(720, el.panelRoom?.(panel) ?? 720),
      },
      ...top(),
      text3d({ text: m }),
      ...bottom()
    )
  }
  const refresh = () => (tool ? tool.refresh() : idle(idleMessage))

  const begin = () => {
    if (!open || tool) return
    const slot = slotOf.get()
    const target = options.target()
    if (typeof target === 'string') {
      ch()?.set({ hideSlot: '' })
      return idle(target)
    }
    const saved = pick === NEW_GARMENT ? null : tailored(pick)
    if (pick !== NEW_GARMENT && !saved) {
      ch().set({ hideSlot: '' })
      return idle(
        `${pick} has no outline to edit here. Pick ${NEW_GARMENT} to cut one for this slot.`
      )
    }
    ch().set({ hideSlot: slot })
    const draft = options.draft.get()
    const cut = saved
      ? {
          ...saved.cut,
          skirt: saved.cut.skirt === true,
          drape: saved.cut.drape === true,
          mesh: saved.cut.mesh ?? 'medium',
        }
      : draft.cut
    const look: MaterialRecipe = saved
      ? saved.look?.material ?? clothRecipe(saved.look ?? {})
      : plain(draft.look)
    const name = saved ? pick : draft.name
    editing = {
      slot,
      name: saved ? pick : null,
      source: target.source,
      start: JSON.stringify({ cut, look, name }),
    }
    tool = mountTailorTool(el, {
      body: target.body,
      built: target.built,
      cut,
      look,
      name,
      slot,
      panel,
      persistent: true,
      rows: { top, bottom },
      hideOthers: hideOthers.get(),
      handleHideOthers: (v: boolean) => hideOthers.set(v),
      // A new garment's outline is kept with the character as it goes, so
      // it carries on where it was; one of your own keeps its file.
      handleChange: ({ cut, look, name }) => {
        if (editing?.name != null) return
        options.draft.set(plain({ cut, look, name }))
        options.handleChange?.()
      },
    })
    options.handleWardrobe?.()
  }

  const keep = async () => {
    const t = tool
    const ed = editing
    tool = null
    editing = null
    ch()?.set({ hideSlot: '' })
    if (!t || !ed) return
    const garment = t.garment()
    const { cut, look, name } = t.state
    t.unmount()
    if (!garment) return
    // One of your own, unchanged: nothing to write.
    if (ed.name != null && JSON.stringify({ cut, look, name }) === ed.start)
      return
    const kept = freeName(name || ed.name || 'garment', ed.name)
    const bytes = writeGarmentGlb({
      garment,
      meta: {
        ...options.madeOn(ed.source),
        name: kept,
        slot: ed.slot,
        look: { material: look } as any,
        cut: cut as any,
      },
    })
    if (ed.name == null) {
      // Kept: the next new garment starts from nothing.
      const d = options.draft.get()
      options.draft.set({
        ...d,
        cut: { ...d.cut, shapes: [] as any },
        name: '',
      })
    }
    try {
      await keepFile(bytes, ed.slot)
      // Renamed: the old file goes.
      if (ed.name != null && kept !== ed.name) {
        await store.delete(ed.name).catch(() => {})
        ch().forgetGarment(ed.name)
      }
      if (pick === NEW_GARMENT || pick === ed.name) pick = kept
    } catch (e: any) {
      console.warn('tailor: could not save', e)
      say(`could not save: ${e?.message ?? e}`)
    }
  }

  panel.addEventListener('paneltoggle', (e: any) => {
    open = e.detail.open
    if (open) {
      pick = defaultPick()
      begin()
    } else {
      void keep()
      if (hideOthers.get()) hideOthers.set(false)
    }
  })

  const forget = async () => {
    const name = pick
    const slot = slotOf.get()
    if (name === NEW_GARMENT || !ch()?.garments.get(name)) return
    if (tool) {
      tool.unmount()
      tool = null
      editing = null
    }
    await store
      .delete(name)
      .catch((e) => console.warn('tailor: could not forget', e))
    ch().forgetGarment(name)
    if (options.worn(slot) === name) options.wear(slot, 'none')
    pick = NEW_GARMENT
    begin()
    options.handleWardrobe?.()
    options.handleChange?.()
  }

  // The garment to take to an editor: the one being cut, else the slot's own.
  const garmentFile = (format: 'glb' | 'obj', bodyAlone = false) => {
    let garment = null
    let meta: GarmentMeta = options.madeOn(source())
    if (!bodyAlone) {
      const name = options.worn(slotOf.get())
      const g = ch()?.garments.get(name)
      const mine = g && g.source === source() ? g : null
      const cutting = tool?.garment()
      if (cutting) garment = cutting
      else if (mine) ({ garment, meta } = readGarment(mine.bytes) as any)
      else return null
    }
    const body = bodyAlone || includeBody.get() ? options.helperBody() : null
    return format === 'obj'
      ? writeGarmentObj({ garment, body, meta } as any)
      : writeGarmentGlb({ garment, body, meta } as any)
  }
  const exportGarment = (format: 'glb' | 'obj', bodyAlone = false) => {
    const data = garmentFile(format, bodyAlone)
    if (data == null) return say('choose a garment of your own to export')
    options.save(
      data,
      bodyAlone ? 'body.glb' : format === 'obj' ? 'garment.obj' : 'garment.glb',
      format === 'obj' ? 'text/plain' : 'model/gltf-binary'
    )
  }
  // A garment from an editor: kept as a choice in its slot, named as the
  // file says (else after the file).
  const importFrom = async (
    data: ArrayBuffer | Uint8Array | string,
    fileName: string
  ) => {
    const content = readGarment(data)
    // Bound to the body it was made on, where the file says; else to the
    // body shown, which is then what it was made on.
    if (!content.meta)
      console.warn(
        'tailor: no metadata in the file (export from Blender with custom properties); bound to the body shown'
      )
    if ((content.materialCount ?? 0) > 1)
      console.warn(
        `tailor: the garment uses ${content.materialCount} materials; only the first is drawn`
      )
    const known = content.meta?.source || content.meta?.body
    const meta: GarmentMeta = known
      ? content.meta!
      : { ...options.madeOn(source()), ...content.meta }
    const slot = options.slots.includes(meta.slot ?? '') ? meta.slot! : 'top'
    const wanted =
      meta.name && meta.name !== 'tailored'
        ? meta.name
        : fileName.replace(/\.[^.]*$/, '')
    const name = freeName(wanted, null)
    // A garment with its own maps keeps them: no fabric preset, no recolour.
    const look =
      content.material?.baseColorTexture ||
      content.material?.metallicRoughnessTexture
        ? { material: { type: 'cloth', inputs: { recolour: 0 } } }
        : meta.look
    await keepFile(
      writeGarmentGlb({
        garment: content.garment,
        material: content.material,
        meta: { ...meta, name, slot, ...(look ? { look: look as any } : {}) },
      }),
      slot
    )
  }
  const importGarment = () => {
    void chooseFile('.glb,.obj').then(async (file) => {
      if (!file) return
      try {
        await importFrom(
          file.name.endsWith('.obj')
            ? await file.text()
            : await file.arrayBuffer(),
          file.name
        )
      } catch (e: any) {
        console.warn('tailor: could not import', e)
        say(`${file.name}: ${e?.message ?? e}`)
      }
    })
  }

  idle('open to tailor')
  return {
    panel,
    get open() {
      return open
    },
    get tool() {
      return tool
    },
    get editing() {
      return (
        editing && {
          slot: editing.slot,
          name: editing.name,
          source: editing.source,
        }
      )
    },
    get message() {
      return message
    },
    begin,
    keep,
    forget,
    refresh,
    say,
    garmentFile,
    importFrom,
  }
}
