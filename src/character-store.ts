/*#
# character-store

**The characters this browser keeps**: the [character builder](/character-builder/)
saves here (the figure you are working on, and named ones), and any page on
the same site reads them back, so a game can offer the characters you built
(the [biped playground](/playground/) does).

```javascript
import { characterStore } from 'tosijs-3d'

const store = characterStore()
const names = await store.list()          // named saves, sorted
const doc = await store.get(names[0])     // a character document, whole
biped.characterDoc = doc
```

A MESH IS KEPT ONCE. What a document carries as bytes (a body opened from a
file, garments of your own) is stored apart, keyed by a hash of its content,
and each save keeps a reference to it; `get` puts the bytes back, so what
comes out is the same self-contained document that went in. Ten saves of one
figure on your own mesh hold that mesh once, and a mesh no save refers to
any more is let go. Saves made before this (the whole document in one
record) read as they are.

It lives in IndexedDB (`tosijs-characters`), so it is this browser's: a
character saved on one device is on another only if you export the file and
open it there.
*/
/*{ "parent": "character-file", "order": 10 }*/

import type { CharacterDoc } from './character-file.js'

export const CHARACTER_DB = 'tosijs-characters'
/** The figure the builder is working on, kept as it changes. */
export const WORKING_CHARACTER = '(working)'

/** Where in a document a run of bytes is: `garments/<name>` or `bodies/<name>`. */
type BlobPath = string

/** A stored record: the document without its bytes, and where they went. */
interface StoredCharacter {
  stored: 2
  doc: CharacterDoc
  refs: Record<BlobPath, string>
}

/**
 * A document's bytes taken out (pure): the document left, and each base64
 * run by where it was.
 */
export function splitBlobs(doc: CharacterDoc): {
  doc: CharacterDoc
  blobs: Record<BlobPath, string>
} {
  const blobs: Record<BlobPath, string> = {}
  const garments: Record<string, string> = {}
  for (const [name, b64] of Object.entries(doc.garments ?? {})) {
    blobs[`garments/${name}`] = b64
    garments[name] = ''
  }
  const bodies = doc.bodies
    ? Object.fromEntries(
        Object.entries(doc.bodies).map(([name, b]) => {
          if (typeof b.data !== 'string') return [name, b]
          blobs[`bodies/${name}`] = b.data
          const { data: _, ...rest } = b
          return [name, rest]
        })
      )
    : undefined
  return {
    doc: { ...doc, garments, ...(bodies ? { bodies } : {}) },
    blobs,
  }
}

/** The bytes put back (pure): the inverse of `splitBlobs`. A missing one is left out. */
export function joinBlobs(
  doc: CharacterDoc,
  blobs: Record<BlobPath, string | undefined>
): CharacterDoc {
  const garments: Record<string, string> = {}
  for (const name of Object.keys(doc.garments ?? {})) {
    const b64 = blobs[`garments/${name}`]
    if (b64 != null) garments[name] = b64
  }
  const bodies = doc.bodies
    ? Object.fromEntries(
        Object.entries(doc.bodies).map(([name, b]) => {
          const data = blobs[`bodies/${name}`]
          return [name, data != null ? { ...b, data } : b]
        })
      )
    : undefined
  return { ...doc, garments, ...(bodies ? { bodies } : {}) }
}

// The working figure is saved on every change, mostly with the same mesh:
// a few recent hashes save hashing it again.
const recent = new Map<string, string>()
async function hashOf(text: string): Promise<string> {
  const known = recent.get(text)
  if (known != null) return known
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(text)
  )
  const hex = Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, '0')
  ).join('')
  recent.set(text, hex)
  if (recent.size > 8) recent.delete(recent.keys().next().value!)
  return hex
}

const isStored = (r: any): r is StoredCharacter =>
  r != null && r.stored === 2 && r.doc != null

export interface CharacterStore {
  /** The named saves, sorted (not the working figure). */
  list(): Promise<string[]>
  /** A save as a whole document, or null. */
  get(name: string): Promise<CharacterDoc | null>
  /** Save a document under a name (its bytes kept once). */
  put(name: string, doc: CharacterDoc): Promise<void>
  delete(name: string): Promise<void>
}

/** This browser's characters. */
export function characterStore(): CharacterStore {
  let opened: Promise<IDBDatabase> | null = null
  const db = () =>
    (opened ??= new Promise<IDBDatabase>((ok, no) => {
      const r = indexedDB.open(CHARACTER_DB, 2)
      r.onupgradeneeded = () => {
        const d = r.result
        if (!d.objectStoreNames.contains('characters'))
          d.createObjectStore('characters')
        if (!d.objectStoreNames.contains('blobs')) d.createObjectStore('blobs')
      }
      r.onsuccess = () => ok(r.result)
      r.onerror = () => no(r.error)
    }))
  const run = async <T>(
    stores: string[],
    mode: IDBTransactionMode,
    fn: (t: IDBTransaction) => Promise<T> | T
  ): Promise<T> => {
    const t = (await db()).transaction(stores, mode)
    const done = new Promise<void>((ok, no) => {
      t.oncomplete = () => ok()
      t.onerror = () => no(t.error)
      t.onabort = () => no(t.error)
    })
    const result = await fn(t)
    await done
    return result
  }
  const req = <T>(r: IDBRequest<T>) =>
    new Promise<T>((ok, no) => {
      r.onsuccess = () => ok(r.result)
      r.onerror = () => no(r.error)
    })
  // Blobs no record refers to go (after a save replaces one, or a delete).
  const sweep = (t: IDBTransaction) => {
    const records = t.objectStore('characters').getAll()
    records.onsuccess = () => {
      const used = new Set<string>()
      for (const r of records.result)
        if (isStored(r)) for (const h of Object.values(r.refs)) used.add(h)
      const keys = t.objectStore('blobs').getAllKeys()
      keys.onsuccess = () => {
        for (const k of keys.result)
          if (!used.has(String(k))) t.objectStore('blobs').delete(k)
      }
    }
  }
  return {
    async list() {
      const keys = await run(['characters'], 'readonly', (t) =>
        req(t.objectStore('characters').getAllKeys())
      )
      return keys
        .map(String)
        .filter((k) => k !== WORKING_CHARACTER)
        .sort()
    },
    async get(name) {
      const record = await run(['characters'], 'readonly', (t) =>
        req(t.objectStore('characters').get(name))
      )
      if (record == null) return null
      if (!isStored(record)) return record as CharacterDoc
      const blobs: Record<string, string | undefined> = {}
      await run(['blobs'], 'readonly', async (t) => {
        await Promise.all(
          Object.entries(record.refs).map(async ([path, hash]) => {
            blobs[path] = await req(t.objectStore('blobs').get(hash))
          })
        )
      })
      return joinBlobs(record.doc, blobs)
    },
    async put(name, whole) {
      // Hashed before the transaction: one left waiting on a promise closes.
      const { doc, blobs } = splitBlobs(whole)
      const refs: Record<string, string> = {}
      const texts: Record<string, string> = {}
      for (const [path, b64] of Object.entries(blobs)) {
        const h = await hashOf(b64)
        refs[path] = h
        texts[h] = b64
      }
      const record: StoredCharacter = { stored: 2, doc, refs }
      await run(['characters', 'blobs'], 'readwrite', (t) => {
        // A mesh already kept is not written again.
        for (const [h, b64] of Object.entries(texts)) {
          const there = t.objectStore('blobs').getKey(h)
          there.onsuccess = () => {
            if (there.result == null) t.objectStore('blobs').put(b64, h)
          }
        }
        t.objectStore('characters').put(record, name)
        sweep(t)
      })
    },
    async delete(name) {
      await run(['characters', 'blobs'], 'readwrite', (t) => {
        t.objectStore('characters').delete(name)
        sweep(t)
      })
    },
  }
}
