/*#
# Playback

**A clip's transport on ONE row**: play or pause, a scrub bar you can drag to
any moment, and the playback speed. A [[widgets3d|Widget3d]], so it sits in a
`panel3d` beside the rest of a panel and works the same flat, in a scene and in
a headset.

## Demo

```js
import { b3d, b3dLight, panelScene, panel3d, label3d, playback3d } from 'tosijs-3d'
import { elements } from 'tosijs'
const { div, pre } = elements

// A pretend clip, four seconds long, run by the page.
const clip = { time: 0, duration: 4, playing: true, speed: 1 }
const readout = pre({ style: 'margin:8px 16px;color:#8ea;font:12px ui-monospace,monospace' }, '')
setInterval(() => {
  if (clip.playing) clip.time = (clip.time + 0.05 * clip.speed) % clip.duration
  readout.textContent = `${clip.time.toFixed(2)} s of ${clip.duration} s  ·  ${clip.playing ? 'playing' : 'paused'}  ·  ×${clip.speed}`
}, 50)

const panel = panel3d(
  { width: 320 },
  label3d({ text: 'Walk_Loop', muted: true, compact: true }),
  playback3d({
    read: () => clip,
    handlePlay: (on) => { clip.playing = on },
    handleSeek: (t) => { clip.time = t },
    handleSpeed: (s) => { clip.speed = s },
  })
)

const { plane, sceneCreated } = panelScene({ svg: panel, target: panel, width: 2.4, camera: { radius: 3.2 } })
const scene = b3d({ style: 'border-radius:8px;overflow:hidden', sceneCreated }, b3dLight({ intensity: 1 }), plane)

preview.append(
  div(
    { style: 'display:flex;flex-direction:column;height:100%;background:#0c0e14' },
    div(
      { style: 'display:flex;gap:24px;flex:1;min-height:0;padding:16px 16px 4px' },
      div({ style: 'color:#9ab;font:12px system-ui;display:flex;flex-direction:column;gap:6px;flex:1;min-width:0' }, 'DOM', panel),
      div({ style: 'color:#9ab;font:12px system-ui;display:flex;flex-direction:column;gap:6px;flex:1;min-width:0' }, '3D texture', scene)
    ),
    readout
  )
)
```
```css
.preview {
  height: 100%;
}
```

Press the button to pause, drag the bar to any moment (it pauses there, so
you can look), and pick a speed from the menu.

## The clip is the host's

The widget holds no clock. It asks `read()` what the clip is doing (its
`time` and `duration` in seconds, whether it is `playing`, its `speed`) a few
times a second while it is on screen, and reports what a hand does through
`handlePlay`, `handleSeek` and `handleSpeed`. So it follows a clip however
the clip is driven, and a pause in the scene shows in the button.

Scrubbing pauses the clip, since a moment you drag to is one you want to see
held. Press play to carry on from there.

`speeds` sets the menu (default 0.1, 0.25, 0.5, 0.75, 1, 1.5 and 2).
*/
/*{ "parent": "widgets3d", "order": 30 }*/

import { svgElements } from 'tosijs'
import { w3dTheme } from './w3d-theme.js'
import { slider3d, select3d } from './widgets3d.js'
import type { PointerKind, Widget3d } from './widgets3d.js'

const { g, rect, path } = svgElements

/** What the host's clip is doing now. */
export interface PlaybackState {
  /** Where it is, in seconds. */
  time: number
  /** Its length, in seconds. */
  duration: number
  playing: boolean
  /** Its playback speed, 1 = as made. */
  speed: number
}

export interface Playback3dOptions {
  /** Its accessible name (default `playback`). */
  name?: string
  /** The clip as it is now; asked a few times a second while shown. */
  read: () => PlaybackState | null
  /** Play (true) or pause (false), from the button. */
  handlePlay?: (playing: boolean) => void
  /** Go to this time, in seconds, from the scrub bar. The clip is paused first. */
  handleSeek?: (time: number) => void
  /** A speed from the menu. */
  handleSpeed?: (speed: number) => void
  /** The speeds offered. */
  speeds?: number[]
  /** How often the row reads the clip, per second (default 12). */
  rate?: number
}

export interface PlaybackField extends Widget3d {
  /** Read the clip now and redraw. */
  refresh(): void
}

/** A value as a slider's `Bindable`: the row pushes the clip's time into it. */
function box<T>(initial: T) {
  let v = initial
  const subs = new Set<() => void>()
  return {
    get value() {
      return v
    },
    set value(n: T) {
      v = n
    },
    observe(cb: () => void) {
      subs.add(cb)
      return () => subs.delete(cb)
    },
    push(n: T) {
      if (n === v) return
      v = n
      for (const cb of subs) cb()
    },
  }
}

const SPEEDS = [0.1, 0.25, 0.5, 0.75, 1, 1.5, 2]

/**
 * A clip's transport: play/pause, a scrub bar and a speed menu, on one row.
 *
 * ```js
 * playback3d({ read: () => ({ time, duration, playing, speed }), handlePlay, handleSeek, handleSpeed })
 * ```
 */
export function playback3d(config: Playback3dOptions): PlaybackField {
  const speeds = config.speeds ?? SPEEDS
  const now = () =>
    config.read() ?? { time: 0, duration: 0, playing: false, speed: 1 }
  const first = now()
  // The bar is 0..1 of the clip; seconds only cross the boundary.
  const where = box(first.duration > 0 ? first.time / first.duration : 0)
  const speed = box<number>(first.speed)
  let playing = first.playing

  const scrub = slider3d({
    value: where,
    min: 0,
    max: 1,
    step: 0.01,
    // The moment held, in seconds: what the bar means to a person.
    format: (f: number) => `${(f * now().duration).toFixed(2)} s`,
    handleChange: (f: number) => {
      const s = now()
      if (s.playing) config.handlePlay?.(false)
      config.handleSeek?.(Math.max(0, Math.min(1, f)) * s.duration)
      api.refresh()
    },
  })
  const pick = select3d({
    value: speed,
    options: speeds.map((s) => ({ label: `×${s}`, value: s })),
    handleChange: (v) => {
      config.handleSpeed?.(Number(v))
      api.refresh()
    },
  })

  // THE BUTTON is drawn here: its glyph changes with the clip, which a
  // button3d's fixed label cannot.
  const el = g()
  const button = g()
  const bg = rect({ rx: 6, ry: 6, fill: w3dTheme.buttonBg })
  const glyph = path({ fill: w3dTheme.text })
  button.append(bg, glyph)
  const scrubWrap = g()
  scrubWrap.appendChild(scrub.el)
  const pickWrap = g()
  pickWrap.appendChild(pick.el)
  el.append(button, scrubWrap, pickWrap)

  let rowH = 0
  let cols: Array<{ x: number; width: number; w: Widget3d | null }> = []
  let hovered = false
  let pressed = false

  const drawButton = () => {
    const s = rowH
    const c = s / 2
    const r = s * 0.22
    glyph.setAttribute(
      'd',
      playing
        ? // Pause: two bars.
          `M${c - r} ${c - r}h${r * 0.7}v${2 * r}h${-r * 0.7}z` +
            `M${c + r * 0.3} ${c - r}h${r * 0.7}v${2 * r}h${-r * 0.7}z`
        : // Play: a triangle, nudged right to look centred.
          `M${c - r * 0.7} ${c - r}L${c + r * 1.1} ${c}L${c - r * 0.7} ${c + r}z`
    )
    bg.setAttribute(
      'fill',
      pressed
        ? w3dTheme.buttonActive
        : hovered
        ? w3dTheme.buttonHover
        : w3dTheme.buttonBg
    )
  }

  const toggle = () => {
    playing = !now().playing
    config.handlePlay?.(playing)
    drawButton()
  }

  const at = (x: number) => {
    for (const c of cols) if (x >= c.x && x <= c.x + c.width) return c
    return null
  }
  let held: { x: number; width: number; w: Widget3d | null } | null = null

  // Follows the clip while shown; `dispose` (the panel's) stops it.
  const timer = setInterval(() => api.refresh(), 1000 / (config.rate ?? 12))

  const api: PlaybackField = {
    el,
    refresh() {
      const s = now()
      if (s.playing !== playing) {
        playing = s.playing
        drawButton()
      }
      // While the bar is held, the hand says where it is.
      if (held?.w !== scrub)
        where.push(s.duration > 0 ? (s.time % s.duration) / s.duration : 0)
      speed.push(s.speed)
    },
    layout(width: number) {
      const pickW = Math.max(64, Math.round(w3dTheme.fontSize * 4.2))
      const gap = 6
      rowH = Math.max(scrub.layout(10), 28)
      const buttonW = rowH
      const scrubW = Math.max(40, width - buttonW - pickW - gap * 2)
      scrub.layout(scrubW)
      const pickH = pick.layout(pickW)
      rowH = Math.max(rowH, pickH)
      bg.setAttribute('width', String(buttonW))
      bg.setAttribute('height', String(rowH))
      scrubWrap.setAttribute('transform', `translate(${buttonW + gap}, 0)`)
      pickWrap.setAttribute(
        'transform',
        `translate(${buttonW + gap + scrubW + gap}, 0)`
      )
      cols = [
        { x: 0, width: buttonW, w: null },
        { x: buttonW + gap, width: scrubW, w: scrub },
        { x: buttonW + gap + scrubW + gap, width: pickW, w: pick },
      ]
      drawButton()
      return rowH
    },
    handle(kind: PointerKind, x: number, y: number) {
      // A drag stays with what it started on, as a slider's does.
      const c = kind === 'down' || held == null ? at(x) : held
      if (kind === 'down') held = c
      if (c == null) return
      if (c.w == null) {
        if (kind === 'down') {
          pressed = true
          drawButton()
        } else if (kind === 'up') {
          pressed = false
          toggle()
        }
      } else c.w.handle?.(kind, x - c.x, y)
      if (kind === 'up') {
        held = null
        pressed = false
        drawButton()
      }
    },
    hitTest(x: number, y: number) {
      const c = at(x)
      if (c == null) return false
      if (c.w == null) return true
      return c.w.hitTest ? c.w.hitTest(x - c.x, y) : true
    },
    setHost(h) {
      scrub.setHost?.(h)
      pick.setHost?.(h)
    },
    setState(state) {
      hovered = state.hovered
      drawButton()
    },
    dispose() {
      clearInterval(timer)
      scrub.dispose?.()
      pick.dispose?.()
    },
    semantics: () => ({
      role: 'group',
      name: config.name ?? 'playback',
      children: [
        {
          handle: true,
          semantics: () => ({
            role: 'button',
            name: playing ? 'pause' : 'play',
            activate: toggle,
          }),
        },
        {
          handle: true,
          semantics: () => ({ ...scrub.semantics!(), name: 'time' }),
        },
        {
          handle: true,
          semantics: () => ({ ...pick.semantics!(), name: 'speed' }),
        },
      ],
    }),
  }
  drawButton()
  return api
}
