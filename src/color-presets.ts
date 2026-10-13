/*
The pure half of colorPicker3d: which presets are offered and where each
square goes. Its own module because the picker imports tosijs, which needs a
DOM, and these are worth testing without one.
*/
import { formatColor, parseColor } from './color.js'

export interface ColorPreset {
  name?: string
  value: string
}

/**
 * A small general set: five greys from whitish to blackish, then seven dull,
 * greyed colours in the order of the spectrum. No pure white and no pure
 * black: a lit surface that is already at the limit has nowhere to go, so
 * white blows out under any light and black shows no shading at all. Muted on purpose: a scene's colours are mostly
 * earths and hazes, and a saturated swatch is rarely the one you want but
 * always the one that catches the eye. The picker above is one tap away for
 * anything brighter, and `+` keeps what you make.
 */
export const COLOR_PRESETS: string[] = [
  '#e8e8e8', // whitish
  '#b4b4b4',
  '#808080',
  '#4c4c4c',
  '#1c1c1c', // blackish
  '#9c4a44', // dull red
  '#a8703e', // dull orange
  '#a89a4a', // ochre
  '#5c8a50', // dull green
  '#458a86', // dull teal
  '#4a6a9c', // dull blue
  '#74559c', // dull purple
]

/** Normalise, drop what does not parse, and keep the first of any repeat. */
export function presetList(
  own: Array<string | ColorPreset> | undefined,
  withDefaults: boolean
): ColorPreset[] {
  const out: ColorPreset[] = []
  const seen = new Set<string>()
  const all: Array<string | ColorPreset> = [
    ...(own ?? []),
    ...(withDefaults ? COLOR_PRESETS : []),
  ]
  for (const p of all) {
    const raw = typeof p === 'string' ? p : p?.value
    const rgb = parseColor(String(raw ?? ''))
    if (rgb == null) continue
    const value = formatColor(rgb)
    if (seen.has(value)) continue
    seen.add(value)
    out.push({ name: typeof p === 'string' ? undefined : p.name, value })
  }
  return out
}

/** Where each preset square goes: `columns` across, wrapping. */
export function presetCells(
  count: number,
  width: number,
  size = 24,
  gap = 6
): {
  columns: number
  height: number
  at: (i: number) => { x: number; y: number }
} {
  const columns = Math.max(1, Math.floor((width + gap) / (size + gap)))
  const rows = Math.ceil(count / columns)
  return {
    columns,
    height: rows === 0 ? 0 : rows * (size + gap) - gap,
    at: (i) => ({
      x: (i % columns) * (size + gap),
      y: Math.floor(i / columns) * (size + gap),
    }),
  }
}

/*
THE USER'S OWN SWATCHES, shared by every picker on the page.

A colour you saved while setting a planet's bands is one you will want when
you set its rings, so the saved ones are not a picker's private list. Kept as
two small lists: colours ADDED, and colours REMOVED (which is how a preset the
caller or the general set supplied can be taken out: it is hidden, since it
is not ours to delete). Persisted when there is somewhere to persist to.
*/
export interface SwatchStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export interface SwatchStore {
  /** The caller's, then the saved ones, then the general set; less the removed. */
  list(own?: Array<string | ColorPreset>, withDefaults?: boolean): ColorPreset[]
  /** Save a colour. False if it was already offered or does not parse. */
  add(hex: string): boolean
  /** Take a colour out of what is offered, whoever supplied it. */
  remove(hex: string): void
  readonly added: string[]
  readonly removed: string[]
  /** Told after every change. Returns its unsubscribe. */
  subscribe(cb: () => void): () => void
}

export const SWATCH_KEY = 'tosijs-3d:color-swatches'

const canonHex = (v: unknown): string | null => {
  const rgb = parseColor(String(v ?? ''))
  return rgb == null ? null : formatColor(rgb)
}

export function createSwatchStore(
  storage: SwatchStorage | null = null,
  key = SWATCH_KEY
): SwatchStore {
  let added: string[] = []
  let removed: string[] = []
  const listeners = new Set<() => void>()
  try {
    const saved = JSON.parse(storage?.getItem(key) ?? 'null')
    const clean = (a: unknown): string[] =>
      Array.isArray(a)
        ? (a.map(canonHex).filter((v) => v != null) as string[])
        : []
    added = clean(saved?.added)
    removed = clean(saved?.removed)
  } catch {
    // Unreadable or absent: start empty.
  }
  const changed = (): void => {
    try {
      storage?.setItem(key, JSON.stringify({ added, removed }))
    } catch {
      // Private mode or a full quota: the session keeps them.
    }
    for (const cb of listeners) cb()
  }
  return {
    get added() {
      return [...added]
    },
    get removed() {
      return [...removed]
    },
    list(own, withDefaults = true) {
      const gone = new Set(removed)
      return presetList(
        [...(own ?? []), ...added, ...(withDefaults ? COLOR_PRESETS : [])],
        false
      ).filter((p) => !gone.has(p.value))
    },
    add(hex) {
      const value = canonHex(hex)
      if (value == null) return false
      // Adding one that was removed puts it back where it was.
      if (removed.includes(value)) {
        removed = removed.filter((v) => v !== value)
        if (!added.includes(value) && !COLOR_PRESETS.includes(value))
          added.push(value)
        changed()
        return true
      }
      if (added.includes(value)) return false
      added.push(value)
      changed()
      return true
    },
    remove(hex) {
      const value = canonHex(hex)
      if (value == null) return
      if (added.includes(value)) added = added.filter((v) => v !== value)
      // Someone else may still supply it (the caller, the general set).
      if (!removed.includes(value)) removed.push(value)
      changed()
    },
    subscribe(cb) {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
  }
}

let shared: SwatchStore | null = null
/** The page's one store, kept in `localStorage` where there is one. */
export function sharedSwatches(): SwatchStore {
  if (shared == null) {
    let storage: SwatchStorage | null
    try {
      storage = (globalThis as any).localStorage ?? null
    } catch {
      storage = null
    }
    shared = createSwatchStore(storage)
  }
  return shared
}
