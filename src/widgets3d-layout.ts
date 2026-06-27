/*#
# widgets3d-layout

Pure layout math for [[widgets3d]] — no tosijs, no DOM, no Babylon, so it is
directly unit-testable. The widget collection imports these helpers to stack
its children and decide when a panel must scroll.

The layout model: a container has a fixed content width. It hands that width to
each child, each child reports the height it needs, and the container stacks
them top-to-bottom with a gap. If the stack is taller than the viewport, the
container scrolls.
*/

/** Vertical stack result: the y offset of each child and the total height. */
export type StackLayout = { offsets: number[]; total: number }

/**
 * Stack `heights` top-to-bottom separated by `gap`. offsets[i] is the y of
 * child i; total is the full content height (no trailing gap).
 */
export function stackLayout(heights: number[], gap: number): StackLayout {
  const offsets: number[] = []
  let y = 0
  for (let i = 0; i < heights.length; i++) {
    offsets.push(y)
    y += heights[i]
    if (i < heights.length - 1) y += gap
  }
  return { offsets, total: y }
}

/** Clamp a scroll offset to [0, max] where max = content beyond the viewport. */
export function clampScroll(
  offset: number,
  contentHeight: number,
  viewportHeight: number
): number {
  const max = Math.max(0, contentHeight - viewportHeight)
  return Math.min(Math.max(offset, 0), max)
}

/**
 * Greedy word-wrap. Returns the lines that fit `maxWidth` given an average
 * `charWidth` (px). A single word longer than the line is left whole (it'll
 * overflow rather than vanish). Always returns at least one line.
 */
export function wrapText(
  text: string,
  maxWidth: number,
  charWidth: number
): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length === 0) return ['']
  const fits = (s: string) => s.length * charWidth <= maxWidth
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (current === '' || fits(candidate)) {
      current = candidate
    } else {
      lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  return lines
}

/** Map a value in [min, max] to a 0..1 fraction (clamped, step-snapped). */
export function valueToFraction(
  value: number,
  min: number,
  max: number
): number {
  if (max <= min) return 0
  return Math.min(1, Math.max(0, (value - min) / (max - min)))
}

/** Inverse of valueToFraction, snapped to `step` (0 = continuous). */
export function fractionToValue(
  fraction: number,
  min: number,
  max: number,
  step = 0
): number {
  const clamped = Math.min(1, Math.max(0, fraction))
  const raw = min + clamped * (max - min)
  if (step <= 0) return raw
  return Math.round((raw - min) / step) * step + min
}
