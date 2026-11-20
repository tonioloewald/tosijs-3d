# glb textures

**A GLB's pictures made smaller, after it is written.** A character's export
carries its skin, eyes, garments and their scans as they were made, which
can be most of the file. `compactGlbTextures(bytes, options)` does two
separate things, each chosen on its own:

- **`size`** scales a picture whose longest side is over the limit (`2048`,
  `1024` or `512`; `as made` scales none). A scaled picture keeps its format
  unless it is compressed.
- **`compress`** turns an opaque PNG (lossless) into a JPEG at `quality`
  (0 to 1, default 0.85), kept only when that is smaller: its first lossy
  step. A scaled JPEG is written at `quality` too.

A JPEG within the limit is never re-encoded (it would only lose detail
again), nor is a see-through PNG (lashes, hair cards, a lace hem: a JPEG has
no alpha). The rest of the file is copied untouched; only the images' buffer
views change, and the binary chunk is packed again around them.

A character file (character-file) carries GLBs of its own (the garments you
made, a body opened from a file) and the pictures you picked from disk;
`compactCharacterTextures(doc, options)` treats those the same way, so a
character saved as a file takes the same choices as its GLB.

`replaceGlbImages(bytes, replace)` is the pure half (no DOM), which any
other rewrite can use: `replace` gets each embedded image and returns new
bytes and type, or null to keep it. The rest needs a browser
(`createImageBitmap` and a canvas).
