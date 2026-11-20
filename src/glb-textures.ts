/*#
# glb textures

**A GLB's pictures scaled down, after it is written.** A character's export
carries its skin, eyes, garments and their scans at the size they were made,
which can be most of the file. `compactGlbTextures(bytes, level)` scales each
picture whose longest side is over the limit (`2048`, `1024` or `512`; `as
made` leaves them all) and writes it again: a JPEG (quality 0.9) where it is
opaque, a PNG where any pixel is see-through (lashes, hair cards, a lace
hem), since a JPEG has no alpha.

A picture already within the limit is left exactly as it is: re-encoding it
at the same size would only lose detail. The rest of the file is copied
untouched; only the images' buffer views change, and the binary chunk is
packed again around them.

A character file (character-file) carries GLBs of its own (the garments you
made, a body opened from a file) and the pictures you picked from disk;
`compactCharacterTextures(doc, level)` scales those the same way, so a
character saved as a file takes the same choice as its GLB.

`replaceGlbImages(bytes, replace)` is the pure half (no DOM), which any
other rewrite can use: `replace` gets each embedded image and returns new
bytes and type, or null to keep it. The shrinking needs a browser
(`createImageBitmap` and a canvas).
*/
/*{ "parent": "rigged-body-glb" }*/

import { readGlb, writeGlb } from './glb-chunks.js'

/** How far an export's pictures are shrunk. */
export type TextureLevel = 'as made' | '2048' | '1024' | '512'

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

/** The export with its pictures scaled to `level` (a browser is needed). */
export async function compactGlbTextures(
  bytes: Uint8Array,
  level: TextureLevel
): Promise<Uint8Array> {
  const size = Number(level)
  if (!(size > 0)) return bytes
  return replaceGlbImages(bytes, (image) => shrinkImage(image, size, 0.9))
}

async function shrinkImage(
  image: GlbImage,
  size: number,
  quality: number
): Promise<{ bytes: Uint8Array; mimeType: string } | null> {
  const blob = new Blob([image.bytes as BlobPart], { type: image.mimeType })
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(blob)
  } catch {
    return null
  }
  const k = size / Math.max(bitmap.width, bitmap.height)
  // Within the limit: kept exactly as made, never re-encoded.
  if (k >= 1) {
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
  const px = ctx.getImageData(0, 0, w, h).data
  let clear = false
  for (let i = 3; i < px.length; i += 4)
    if (px[i] < 255) {
      clear = true
      break
    }
  const type = clear ? 'image/png' : 'image/jpeg'
  const out = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, type, clear ? undefined : quality)
  )
  if (out == null) return null
  return { bytes: new Uint8Array(await out.arrayBuffer()), mimeType: type }
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
 * carries scaled to `level`: garments, a body from a GLB file, and pictures
 * picked from disk. A copy; the document given is not changed.
 */
export async function compactCharacterTextures<
  D extends {
    garments?: Record<string, string>
    bodies?: Record<string, { file?: string; data?: string }>
    pictures?: Record<string, string>
  }
>(doc: D, level: TextureLevel): Promise<D> {
  const size = Number(level)
  if (!(size > 0)) return doc
  const out = JSON.parse(JSON.stringify(doc)) as D
  const glb = async (data: string) =>
    b64.encode(await compactGlbTextures(b64.decode(data), level))
  for (const [k, v] of Object.entries(out.garments ?? {}))
    out.garments![k] = await glb(v)
  for (const body of Object.values(out.bodies ?? {}))
    if (body.data != null && /\.glb$/i.test(body.file ?? ''))
      body.data = await glb(body.data)
  for (const [k, v] of Object.entries(out.pictures ?? {})) {
    const bytes = b64.decode(v)
    const small = await shrinkImage(
      { index: 0, bytes, mimeType: sniff(bytes) },
      size,
      0.9
    )
    if (small != null) out.pictures![k] = b64.encode(small.bytes)
  }
  return out
}
