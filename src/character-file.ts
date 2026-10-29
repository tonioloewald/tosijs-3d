/*#
# character-file

**A character as one JSON document**: everything the
[character builder](/character-builder/) sets (where the body comes from, its
shape, skin, eyes, face, hair, clothes and their materials, the clip, the
tailor's work in progress) and the garments of your own it wears, so a file
opened on another machine dresses the same figure. The builder keeps the
figure you are working on in this browser (IndexedDB) and saves named ones
there too; **export** and **import** move them as files.

```javascript
import { writeCharacter, readCharacter } from 'tosijs-3d'

const doc = writeCharacter({ name: 'Ada', settings, cloth, tailor, garments })
const json = JSON.stringify(doc)
// …later, anywhere…
const { character, warnings } = readCharacter(json, defaults)
```

THE DOCUMENT IS VERSIONED. `format` is `tosijs-character` and `version` the
layout it was written in; `readCharacter` migrates an older one forward and
refuses one newer than it knows, rather than guess.

IT IS READ AGAINST THE PAGE'S DEFAULTS, so a document can never put the page
in a state it cannot draw: a setting the page does not have is dropped, one
of the wrong type is dropped, one that is missing keeps its default, and each
is listed in `warnings` (a document from a newer page, or a hand edit, then
loads as far as it can and says what it skipped).

GARMENTS TRAVEL INSIDE IT. A garment saved from the tailor lives in the
browser that saved it; the document carries each one the character wears as
its GLB (base64), so the figure is whole wherever it is opened.
*/
/*{ "parent": "character-builder", "order": 20 }*/

export const CHARACTER_FORMAT = 'tosijs-character'
/** The layout this module writes. */
export const CHARACTER_VERSION = 1

/** What a slot wears it in: a named colourway, and a material recipe. */
export interface SlotLook {
  look: string
  material: unknown
}

export interface Character {
  /** What the figure is called (the key it is saved under). */
  name: string
  /** The builder's settings, by key: numbers, strings, booleans, recipes. */
  settings: Record<string, unknown>
  /** Each clothing slot's look and material. */
  cloth: Record<string, SlotLook>
  /** The tailor's outlines in progress: half outlines, [x, y] in metres on the character's left. */
  tailor: Array<Array<[number, number]>>
  /** Garments of the wearer's own that it wears, by name, as GLB bytes. */
  garments: Record<string, Uint8Array>
}

export interface CharacterDoc {
  format: typeof CHARACTER_FORMAT
  version: number
  name: string
  /** When it was written (ISO 8601), if the writer says. */
  saved?: string
  settings: Record<string, unknown>
  cloth: Record<string, SlotLook>
  tailor: Array<Array<[number, number]>>
  /** name → GLB, base64. */
  garments: Record<string, string>
}

/** A character as a document, ready for `JSON.stringify`. */
export function writeCharacter(
  c: Character,
  options: { saved?: string } = {}
): CharacterDoc {
  return {
    format: CHARACTER_FORMAT,
    version: CHARACTER_VERSION,
    name: c.name,
    ...(options.saved != null ? { saved: options.saved } : {}),
    settings: { ...c.settings },
    cloth: Object.fromEntries(
      Object.entries(c.cloth).map(([k, v]) => [
        k,
        { look: v.look, material: v.material },
      ])
    ),
    tailor: c.tailor.map((shape) => shape.map((p) => [p[0], p[1]] as [number, number])),
    garments: Object.fromEntries(
      Object.entries(c.garments).map(([k, v]) => [k, toBase64(v)])
    ),
  }
}

export interface ReadCharacter {
  character: Character
  /** What was skipped or filled in, one line each. */
  warnings: string[]
}

/**
 * Read a document (parsed, or its JSON text) against the page's defaults:
 * `settings` (every key the page has, with its default value) and `slots`
 * (the clothing slots, with their default look). Throws when it is not a
 * character document, or is newer than this module.
 */
export function readCharacter(
  input: string | unknown,
  defaults: { settings: Record<string, unknown>; slots?: Record<string, SlotLook> }
): ReadCharacter {
  const raw = typeof input === 'string' ? JSON.parse(input) : input
  if (raw == null || typeof raw !== 'object' || (raw as any).format !== CHARACTER_FORMAT)
    throw new Error('character-file: not a character document')
  const doc = migrate(raw as any)
  const warnings: string[] = []

  const settings: Record<string, unknown> = {}
  const given = isObject(doc.settings) ? doc.settings : {}
  for (const [key, fallback] of Object.entries(defaults.settings)) {
    if (!(key in given)) {
      settings[key] = fallback
      continue
    }
    const v = given[key]
    if (sameKind(v, fallback)) settings[key] = v
    else {
      settings[key] = fallback
      warnings.push(`${key}: expected ${kind(fallback)}, got ${kind(v)}; kept the default`)
    }
  }
  for (const key of Object.keys(given))
    if (!(key in defaults.settings)) warnings.push(`${key}: not a setting here; skipped`)

  const cloth: Record<string, SlotLook> = {}
  const looks = isObject(doc.cloth) ? doc.cloth : {}
  for (const [slot, fallback] of Object.entries(defaults.slots ?? {})) {
    const v = looks[slot]
    cloth[slot] =
      isObject(v) && typeof v.look === 'string' && isObject(v.material)
        ? { look: v.look, material: v.material }
        : fallback
  }

  const tailor = Array.isArray(doc.tailor)
    ? doc.tailor
        .filter(Array.isArray)
        .map((shape: unknown[]) =>
          shape
            .filter((p: any) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]))
            .map((p: any) => [p[0], p[1]] as [number, number])
        )
    : []

  const garments: Record<string, Uint8Array> = {}
  for (const [name, b64] of Object.entries(isObject(doc.garments) ? doc.garments : {})) {
    try {
      if (typeof b64 !== 'string') throw new Error('not base64')
      garments[name] = fromBase64(b64)
    } catch {
      warnings.push(`garment ${name}: unreadable; skipped`)
    }
  }

  return {
    character: {
      name: typeof doc.name === 'string' ? doc.name : '',
      settings,
      cloth,
      tailor,
      garments,
    },
    warnings,
  }
}

/** An older layout brought forward, one version at a time. */
function migrate(doc: any): any {
  const version = Number(doc.version)
  if (!Number.isInteger(version) || version < 1)
    throw new Error(`character-file: no version (${doc.version})`)
  if (version > CHARACTER_VERSION)
    throw new Error(
      `character-file: version ${version} is newer than this page reads (${CHARACTER_VERSION})`
    )
  // Version 1 is the first: nothing to bring forward yet. A layout change
  // adds a step here (if (doc.version === 1) doc = { ...doc, …, version: 2 }).
  return doc
}

const isObject = (v: unknown): v is Record<string, any> =>
  v != null && typeof v === 'object' && !Array.isArray(v)

const kind = (v: unknown) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v)

/** A value can stand in for the default when it is the same kind of thing. */
const sameKind = (v: unknown, fallback: unknown) =>
  fallback == null ? true : kind(v) === kind(fallback) && (typeof v !== 'number' || Number.isFinite(v))

function toBase64(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000)
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

function fromBase64(b64: string): Uint8Array {
  const s = atob(b64)
  const out = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i)
  return out
}
