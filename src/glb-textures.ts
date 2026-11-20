/*#
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
*/
/*{ "parent": "rigged-body-glb" }*/

import { readGlb, writeGlb } from './glb-chunks.js'

/** The longest side an export's pictures may have. */
export type TextureLevel = 'as made' | '2048' | '1024' | '512'

/** What happens to an export's pictures (see the page). */
export interface PictureOptions {
  size?: TextureLevel
  compress?: boolean
  /** JPEG quality, 0 to 1 (default 0.85). */
  quality?: number
}

/** Does `options` change anything at all? */
export const changesPictures = (o: PictureOptions = {}): boolean =>
  Number(o.size) > 0 || o.compress === true

/** An image embedded in a GLB, as `replaceGlbImages` hands it over. */
export interface GlbImage {
  index: number
  bytes: Uint8Array
  mimeType: string
}

/**
 * The GLB with its embedded images replaced where `replace` returns new
 * ones (null keeps an image). Every buffer view is copied in order, 4-byte
 * aligned, so offsets stay valid. Images by URI are left alone.
 */
export async function replaceGlbImages(
  bytes: Uint8Array,
  replace: (
    image: GlbImage
  ) =>
    | Promise<{ bytes: Uint8Array; mimeType: string } | null>
    | { bytes: Uint8Array; mimeType: string }
    | null
): Promise<Uint8Array> {
  const glb = readGlb(bytes)
  const json = glb.json
  const bin = glb.bin
  const views: any[] = json.bufferViews ?? []
  if (bin == null || !(json.images ?? []).length) return bytes
  const viewOf = (i: number) => {
    const v = views[i]
    return bin.subarray(v.byteOffset ?? 0, (v.byteOffset ?? 0) + v.byteLength)
  }
  const swapped = new Map<number, Uint8Array>()
  let changed = false
  for (const [index, image] of (json.images as any[]).entries()) {
    if (image.bufferView == null) continue
    const out = await replace({
      index,
      bytes: viewOf(image.bufferView),
      mimeType: image.mimeType ?? 'image/png',
    })
    if (out == null) continue
    swapped.set(image.bufferView, out.bytes)
    image.mimeType = out.mimeType
    changed = true
  }
  if (!changed) return bytes
  const parts: Uint8Array[] = views.map((_, i) => swapped.get(i) ?? viewOf(i))
  let size = 0
  for (const p of parts) size += Math.ceil(p.byteLength / 4) * 4
  const packed = new Uint8Array(size)
  let at = 0
  parts.forEach((p, i) => {
    packed.set(p, at)
    views[i].byteOffset = at
    views[i].byteLength = p.byteLength
    at += Math.ceil(p.byteLength / 4) * 4
  })
  json.buffers[0].byteLength = packed.byteLength
  return writeGlb(json, packed)
}

/** The export with its pictures scaled and compressed as asked (a browser is needed). */
export async function compactGlbTextures(
  bytes: Uint8Array,
  options: PictureOptions
): Promise<Uint8Array> {
  if (!changesPictures(options)) return bytes
  return replaceGlbImages(bytes, (image) => shrinkImage(image, options))
}

async function shrinkImage(
  image: GlbImage,
  options: PictureOptions
): Promise<{ bytes: Uint8Array; mimeType: string } | null> {
  const limit = Number(options.size) > 0 ? Number(options.size) : Infinity
  const compress = options.compress === true
  const quality = options.quality ?? 0.85
  const png = image.mimeType === 'image/png'
  const blob = new Blob([image.bytes as BlobPart], { type: image.mimeType })
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(blob)
  } catch {
    return null
  }
  const k = Math.min(1, limit / Math.max(bitmap.width, bitmap.height))
  // Unscaled, only a lossless picture being compressed changes.
  if (k === 1 && !(compress && png)) {
    bitmap.close?.()
    return null
  }
  const w = Math.max(1, Math.round(bitmap.width * k))
  const h = Math.max(1, Math.round(bitmap.height * k))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (ctx == null) return null
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close?.()
  // See-through anywhere: a PNG, or the alpha is lost.
  let clear = false
  if (png) {
    const px = ctx.getImageData(0, 0, w, h).data
    for (let i = 3; i < px.length; i += 4)
      if (px[i] < 255) {
        clear = true
        break
      }
  }
  if (k === 1 && clear) return null
  // A scaled PNG stays a PNG unless compressed; a JPEG stays a JPEG.
  const type = png && (clear || !compress) ? 'image/png' : 'image/jpeg'
  const out = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(
      resolve,
      type,
      type === 'image/jpeg' ? (compress ? quality : 0.92) : undefined
    )
  )
  if (out == null) return null
  const next = new Uint8Array(await out.arrayBuffer())
  // Kept only when it is smaller than what it replaces.
  if (next.byteLength >= image.bytes.byteLength) return null
  return { bytes: next, mimeType: type }
}

const b64 = {
  encode(bytes: Uint8Array): string {
    let s = ''
    for (let i = 0; i < bytes.length; i += 0x8000)
      s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
    return btoa(s)
  },
  decode(text: string): Uint8Array {
    const s = atob(text)
    const out = new Uint8Array(s.length)
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i)
    return out
  },
}

/** The picture types a character file's pictures are, by their first bytes. */
const sniff = (bytes: Uint8Array): string =>
  bytes[0] === 0xff && bytes[1] === 0xd8 ? 'image/jpeg' : 'image/png'

/**
 * A character document (`writeCharacter`'s) with the GLBs and pictures it
 * carries made smaller: garments, a body from a GLB file, and pictures
 * picked from disk, as `options` say. A copy; the document given is not changed.
 */
export async function compactCharacterTextures<
  D extends {
    garments?: Record<string, string>
    bodies?: Record<string, { file?: string; data?: string }>
    pictures?: Record<string, string>
  }
>(doc: D, options: PictureOptions): Promise<D> {
  if (!changesPictures(options)) return doc
  const out = JSON.parse(JSON.stringify(doc)) as D
  const glb = async (data: string) =>
    b64.encode(await compactGlbTextures(b64.decode(data), options))
  for (const [k, v] of Object.entries(out.garments ?? {}))
    out.garments![k] = await glb(v)
  for (const body of Object.values(out.bodies ?? {}))
    if (body.data != null && /\.glb$/i.test(body.file ?? ''))
      body.data = await glb(body.data)
  for (const [k, v] of Object.entries(out.pictures ?? {})) {
    const bytes = b64.decode(v)
    const small = await shrinkImage(
      { index: 0, bytes, mimeType: sniff(bytes) },
      options
    )
    if (small != null) out.pictures![k] = b64.encode(small.bytes)
  }
  return out
}
