/*#
# material pictures

**A picture chosen from disk, as a material input.** A material recipe names
its pictures by URL; a picture someone picked from their own files has no URL
that survives a reload, so it is kept here under a KEY (`picture:` + a hash
of its bytes + its file name) and the recipe carries only the key. Recipes
stay small (they are copied into undo steps, autosaves and preview caches),
and the same picture picked twice is one picture.

```javascript
import { addPicture, pictureUrl } from 'tosijs-3d'

const file = await chooseFile('image/*')
const key = await addPicture(new Uint8Array(await file.arrayBuffer()), file.name, file.type)
recipe.inputs.albedo = { image: key }   // applyMaterial resolves it
```

A character file carries the pictures its materials use (`picturesIn` finds
them, `pictureData` gives each one's bytes as base64), and reading it puts them
back (`registerPicture`), so a character made on one page wears its prints on
another. `pictureUrl` turns a key into something a texture can load (an
object URL) and passes any other URL through.
*/
/*{ "parent": "material-picker" }*/

const PREFIX = 'picture:'

interface Picture {
  base64: string
  type: string
  url: string | null
}

const pictures = new Map<string, Picture>()

/** A key `addPicture` made (or a file carried). */
export const isPictureKey = (ref: string): boolean => ref.startsWith(PREFIX)

const b64 = (bytes: Uint8Array): string => {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000)
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

const typeOf = (name: string, type?: string): string =>
  type ||
  ({ png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' }[
    name.split('.').pop()?.toLowerCase() ?? ''
  ] ??
    'image/png')

/** Keep a picture's bytes; the key to put in a recipe. */
export async function addPicture(
  bytes: Uint8Array,
  name: string,
  type?: string
): Promise<string> {
  const digest = new Uint8Array(
    await crypto.subtle.digest('SHA-256', bytes as Uint8Array<ArrayBuffer>)
  )
  const hash = Array.from(digest.subarray(0, 6), (b) =>
    b.toString(16).padStart(2, '0')
  ).join('')
  const file = name.split(/[/\\]/).pop()!.replace(/[^\w.-]+/g, '_')
  const key = `${PREFIX}${hash}/${file}`
  registerPicture(key, b64(bytes), typeOf(file, type))
  return key
}

/** Put back a picture a file carried (its key and base64 bytes). */
export function registerPicture(key: string, base64: string, type?: string): void {
  if (!isPictureKey(key) || pictures.has(key)) return
  pictures.set(key, { base64, type: typeOf(key, type), url: null })
}

/** What a texture loads for a recipe's picture: a kept picture's URL, any other URL as it is, null for a key not kept here. */
export function pictureUrl(ref: string): string | null {
  if (!isPictureKey(ref)) return ref
  const p = pictures.get(ref)
  if (p == null) return null
  if (p.url == null) {
    const bin = atob(p.base64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    p.url =
      typeof URL.createObjectURL === 'function'
        ? URL.createObjectURL(new Blob([bytes], { type: p.type }))
        : `data:${p.type};base64,${p.base64}`
  }
  return p.url
}

/** A kept picture's bytes as base64, for a file to carry. */
export function pictureData(key: string): string | undefined {
  return pictures.get(key)?.base64
}

/** Every picture key anywhere in a value (a recipe, a character's settings). */
export function picturesIn(value: unknown): string[] {
  const found = new Set<string>()
  const re = /"(picture:[0-9a-f]+\/[^"\\]+)"/g
  for (const m of JSON.stringify(value ?? null).matchAll(re)) found.add(m[1])
  return [...found]
}
