/*#
# balloon layout

Where a speech balloon's caption and replies go ([[b3d-conversation]]): the
caption wrapped to the balloon's width, the replies as numbered rows under
it, the balloon standing on the bottom of its drawing so its tail meets the
speaker's head, and which row a point is on. A caption too long for the room
the replies leave is cut with an ellipsis. Pure.
*/
/*{ "parent": "b3d-conversation" }*/

/** The balloon's drawing area (viewBox units); the plane keeps this aspect. */
export const BALLOON_W = 480
export const BALLOON_H = 340
export const BALLOON_PAD = 18
export const BALLOON_FONT = 22
const PAD = BALLOON_PAD
const FONT = BALLOON_FONT
const LINE_H = 28
const ROW_H = 38
const TAIL = 22

/** Words wrapped to lines of at most `chars` characters. */
export function wrapText(value: string, chars: number): string[] {
  const out: string[] = []
  let line = ''
  for (const word of value.split(/\s+/).filter(Boolean)) {
    if (line && line.length + 1 + word.length > chars) {
      out.push(line)
      line = word
    } else line = line ? `${line} ${word}` : word
  }
  if (line) out.push(line)
  return out
}

export interface BalloonLayout {
  /** The balloon's box, viewBox units; its tail hangs below it to the bottom. */
  box: { x: number; y: number; w: number; h: number }
  lines: { text: string; y: number }[]
  rows: { id: string; label: string; y: number; h: number }[]
}

/**
 * Where a balloon's caption and replies go: the balloon sits on the bottom of
 * the drawing (its tail on the speaker's head), as tall as it needs. Pure.
 */
export function balloonLayout(
  caption: string,
  replies: { id: string; label: string }[]
): BalloonLayout {
  const chars = Math.floor((BALLOON_W - PAD * 2) / (FONT * 0.52))
  const room = Math.floor(
    (BALLOON_H - TAIL - PAD * 2 - replies.length * ROW_H) / LINE_H
  )
  let wrapped = caption ? wrapText(caption, chars) : []
  if (wrapped.length > Math.max(1, room)) {
    wrapped = wrapped.slice(0, Math.max(1, room))
    wrapped[wrapped.length - 1] += '…'
  }
  const h =
    PAD * 2 +
    wrapped.length * LINE_H +
    replies.length * ROW_H +
    (wrapped.length > 0 && replies.length > 0 ? 8 : 0)
  const box = { x: 4, y: BALLOON_H - TAIL - h, w: BALLOON_W - 8, h }
  let y = box.y + PAD
  const lines = wrapped.map((t) => {
    const at = { text: t, y: y + FONT }
    y += LINE_H
    return at
  })
  if (lines.length > 0 && replies.length > 0) y += 8
  const rows = replies.map((r, i) => {
    const row = { id: r.id, label: `${i + 1}. ${r.label}`, y, h: ROW_H - 4 }
    y += ROW_H
    return row
  })
  return { box, lines, rows }
}

/** The reply row under a point, if any. Pure. */
export function rowAt(
  layout: BalloonLayout,
  x: number,
  y: number
): string | null {
  const { box } = layout
  if (x < box.x || x > box.x + box.w) return null
  return layout.rows.find((r) => y >= r.y && y <= r.y + r.h)?.id ?? null
}

/** How far the view's edges are from the speaker's head, in metres in the view's plane there. */
export interface BalloonRoom {
  left: number
  right: number
  up: number
  down: number
}

export interface BalloonFit {
  /** The balloon's bottom middle (its tail's tip) from the top of the head, along the view's right and up. */
  dx: number
  dy: number
  /** Which side it went to when it had to move aside: -1 left, 1 right. */
  side: -1 | 1
  /** Where the tail points along the balloon's bottom: 0 its left end, 1 its right. */
  tail: number
}

const smoothstep = (t: number) => {
  const x = Math.max(0, Math.min(1, t))
  return x * x * (3 - 2 * x)
}

/**
 * Where a balloon goes in a flat view. Over the head when there is room;
 * when the top of the view is in the way it slides down, and as it comes
 * down over the head it moves aside (to the side with more room, staying
 * there unless the other has a good deal more), so it never covers the face;
 * always inside the view's edges, the top first if it cannot all fit. Its
 * tail turns to the head. `width` and `height` are the drawn balloon's,
 * tail included; `head` is the head's height; all in metres. Pure.
 */
export function fitBalloon(
  room: BalloonRoom,
  width: number,
  height: number,
  options: { gap?: number; margin?: number; head?: number; side?: -1 | 1 } = {}
): BalloonFit {
  const gap = options.gap ?? 0.1
  const margin = options.margin ?? 0
  const head = options.head ?? 0.3
  const prefer: -1 | 1 = room.right >= room.left ? 1 : -1
  const prev = options.side
  const roomOn = (s: -1 | 1) => (s > 0 ? room.right : room.left)
  const side: -1 | 1 =
    prev != null && roomOn(prev) >= 0.8 * roomOn(-prev as -1 | 1) ? prev : prefer
  const down = Math.max(0, gap + height - (room.up - margin))
  let dy = gap - down
  let dx = side * smoothstep(down / head) * (width / 2 + head * 0.6)
  const xMin = -(room.left - margin - width / 2)
  const xMax = room.right - margin - width / 2
  dx = xMin > xMax ? (xMin + xMax) / 2 : Math.max(xMin, Math.min(xMax, dx))
  dy = Math.min(Math.max(dy, -(room.down - margin)), room.up - margin - height)
  const tail = Math.max(0, Math.min(1, 0.5 - dx / width))
  return { dx, dy, side, tail }
}

/**
 * Where a balloon placed at `at` (`dx`, `dy` as `fitBalloon` gives them)
 * should go now, given the fit for this frame: where it is, while it still
 * fits inside the view's edges and is not beside the head when there is now
 * plenty of room over it; else the fit. So a camera that follows you does
 * not carry the balloon round the head: it moves only when it must, or
 * when it can go back over the head. Pure.
 */
export function holdBalloon(
  at: { dx: number; dy: number },
  fit: BalloonFit,
  room: BalloonRoom,
  width: number,
  height: number,
  options: { gap?: number; margin?: number } = {}
): { dx: number; dy: number } {
  const gap = options.gap ?? 0.1
  const margin = options.margin ?? 0
  const fits =
    at.dx - width / 2 >= -(room.left - margin) &&
    at.dx + width / 2 <= room.right - margin &&
    at.dy + height <= room.up - margin &&
    at.dy >= -(room.down - margin)
  // Over the head again once there is room for it and a fifth to spare.
  const aside = Math.abs(at.dx - fit.dx) > 1e-6 && Math.abs(fit.dx) < 1e-6
  const roomOver = room.up - margin >= gap + height * 1.2
  if (fits && !(aside && roomOver)) return { dx: at.dx, dy: at.dy }
  return { dx: fit.dx, dy: fit.dy }
}

/** A point, for `followHead`. */
export interface BalloonPoint {
  x: number
  y: number
  z: number
}

/**
 * Where a balloon hangs from, given where the head is now: it follows the
 * head slowly (`tau` seconds) and is dragged along when the head gets more
 * than `dead` metres away, so a speaker talking, nodding or breathing does
 * not carry the balloon about, while one who walks off takes it along.
 * Returns a new point.
 */
export function followHead(
  anchor: BalloonPoint,
  head: BalloonPoint,
  dt: number,
  { dead = 0.12, tau = 1.5 }: { dead?: number; tau?: number } = {}
): BalloonPoint {
  const k = 1 - Math.exp(-Math.max(0, dt) / tau)
  const p = {
    x: anchor.x + (head.x - anchor.x) * k,
    y: anchor.y + (head.y - anchor.y) * k,
    z: anchor.z + (head.z - anchor.z) * k,
  }
  const dx = head.x - p.x
  const dy = head.y - p.y
  const dz = head.z - p.z
  const far = Math.hypot(dx, dy, dz)
  if (far <= dead) return p
  const pull = (far - dead) / far
  return { x: p.x + dx * pull, y: p.y + dy * pull, z: p.z + dz * pull }
}
