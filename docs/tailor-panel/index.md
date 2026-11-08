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
