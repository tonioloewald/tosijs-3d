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
 * A general set: greys, the spectrum at one strength, and the earths and
 * skies a scene keeps reaching for.
 */
export const COLOR_PRESETS: string[] = [
  '#ffffff',
  '#c8c8c8',
  '#808080',
  '#383838',
  '#000000',
  '#e53935',
  '#fb8c00',
  '#fdd835',
  '#43a047',
  '#00acc1',
  '#1e88e5',
  '#5e35b1',
  '#d81b60',
  '#8d6e63',
  '#d7c4a0',
  '#6b8e4e',
  '#87b5e8',
  '#1a2a4a',
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
