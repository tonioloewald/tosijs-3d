/*#
# bar-menu

**A button on the system bar that is a menu.** Press it and a short list
opens under the bar; pick one and the list closes. It is the select you would
put in a panel, one press shorter, and the same flat and in a headset. The
camera mode of [inspect-view](/inspect-view/) uses one to pick its view:
`viewMenu(inspect)`.

```js
import { b3d, barMenu, b3dLight, b3dGround } from 'tosijs-3d'

const weather = barMenu({
  icon: 'sun',
  title: 'Weather',
  options: ['clear', 'cloudy', 'storm'],
  value: 'clear',
  handleChange: (v) => console.log(v),
})
preview.append(
  b3d(
    {},
    b3dLight({ intensity: 1 }),
    b3dGround({ width: 20, height: 20, texture: 'checker', textureTiles: 10 }),
    weather
  )
)
```
```css
tosi-b3d { width: 100%; height: 100%; }
```

It returns the `<tosi-b3d-panel>`: put it in the scene to show the button,
take it out to hide it. `menu.value` reads or sets the choice (the list marks
it).

## A menu of actions

An option can be an action, not a choice (`handleSelect`, with a tick when
`checked`), a submenu (`items`, opened by a press, beside the list level with
the row that opened it, lifted to end no lower than that list; the lists are all one surface,
so in a headset there is no gap to aim across), a
rule (`separator: true`) or `disabled`. `options` may be a function, read each
time the menu opens, so a list of saved things is always current. The
character builder's **Character** menu is one:

```
barMenu({
  icon: 'character',
  title: 'Character',
  options: () => [
    { label: 'Select', items: () => saved.map((n) => ({ label: n, checked: n === current, handleSelect: () => load(n) })) },
    { label: 'Save', handleSelect: save },
    { separator: true },
    { label: 'Export JSON', handleSelect: exportJson },
  ],
})
```

`layout: 'list'` draws a row per option, its icon beside its caption; by
default a menu whose options all have icons is a toolbar of icons instead.
`viewMenu` uses the list, so "front" is not mistaken for "back".
*/
/*{ "parent": "system-bar", "order": 10 }*/
import { svgElements } from 'tosijs'
import type { PointerKind } from './box.js'
import { panelRim } from './panel-rim.js'
import { iconGlyph } from './svg-icons.js'
import { b3dPanel, type B3dPanel } from './b3d-panel.js'
import {
  INSPECT_FACES,
  type InspectFace,
  type InspectView,
} from './inspect-view.js'

export interface BarMenuOption {
  /** What picking it chooses (a select's option); defaults to `label`. */
  value?: string
  label?: string
  /**
   * Its icon (an `svgIcons` name). When every option has one and the layout
   * is not `list`, the menu is a TOOLBAR: one row of icons, each named by its
   * tooltip. In a list, the icon sits beside the caption.
   */
  icon?: string
  /** An ACTION: called when picked (it is not a choice, so no tick). */
  handleSelect?: () => void
  /** A SUBMENU, opened beside the list by a press on this row. */
  items?: Array<string | BarMenuOption> | (() => Array<string | BarMenuOption>)
  /** A rule between groups. */
  separator?: boolean
  /** Shown, but not pickable. */
  disabled?: boolean
  /** An action with a tick (the character on screen in a list of saves). */
  checked?: boolean
}

export interface BarMenuConfig {
  /** The button's icon (an `svgIcons` name). */
  icon: string
  /** Its name: the tooltip, and what a screen reader says. */
  title: string
  /** Its options, or a function read each time the menu opens. */
  options: Array<string | BarMenuOption> | (() => Array<string | BarMenuOption>)
  value?: string
  handleChange?: (value: string) => void
  /**
   * `list`: one row per option, icon and caption. `toolbar`: a row of icons.
   * Default: a toolbar when every option has an icon, else a list.
   */
  layout?: 'list' | 'toolbar'
}

export type BarMenu = B3dPanel & { value: string }

const ROW = 36
const RULE = 11
const LIST_WIDTH = 168
const PAD = 6
/** A toolbar's cell, and its icon. */
const CELL = 44
const GLYPH = 32
const CELL_BG = '#161a22'
const CELL_ON = '#24364d'
const CELL_HOT = '#2f5786'
const INK = '#c8d2e0'
const INK_ON = '#ffffff'

type Opt = Required<Pick<BarMenuOption, 'label'>> & BarMenuOption

const normal = (list: Array<string | BarMenuOption>): Opt[] =>
  list.map((o) =>
    typeof o === 'string'
      ? { value: o, label: o }
      : { label: o.value ?? '', ...o }
  )
const read = (o: BarMenuConfig['options'] | BarMenuOption['items']) =>
  normal((typeof o === 'function' ? o() : o) ?? [])

export function barMenu(config: BarMenuConfig): BarMenu {
  const { svg, g, rect, text, title, line } = svgElements
  let value =
    config.value ?? read(config.options).find((o) => !o.separator)?.value ?? ''
  /*
  WHAT IS OPEN: the top list, then each submenu opened from it, CASCADING to
  its right with its first row level with the row that opened it. All of it
  is ONE surface (one SVG, one plane), so in a headset there is no gap
  between planes to aim across. A submenu opens on a press, not on hover: a
  ray drifting over a row does not throw a list open.
  */
  type Col = { options: Opt[]; open: number }
  let cols: Col[] = []
  /** The hovered and the pressed row, as `[column, row]`. */
  let hover: [number, number] | null = null
  let pressed: [number, number] | null = null
  let root: SVGSVGElement
  const same = (a: [number, number] | null, b: [number, number] | null) =>
    a != null && b != null && a[0] === b[0] && a[1] === b[1]

  type Row = { y: number; h: number; opt: Opt }
  const rowsOf = (opts: Opt[]): Row[] => {
    const rows: Row[] = []
    let y = PAD
    for (const o of opts) {
      const h = o.separator ? RULE : ROW
      rows.push({ y, h, opt: o })
      y += h
    }
    return rows
  }
  /** A gap between a list and the submenu beside it. */
  const COL_GAP = 4

  const make = () => {
    const top = cols[0].options
    const toolbar =
      cols.length === 1 &&
      config.layout !== 'list' &&
      top.length > 0 &&
      top.every((o) => o.icon != null && !o.separator)
    // Each column: its rows, its size and where it sits.
    const laid: Array<{
      col: Col
      rows: Row[]
      icons: boolean
      x: number
      y: number
      w: number
      h: number
    }> = []
    let x = 0
    for (let k = 0; k < cols.length; k++) {
      const col = cols[k]
      const opts = col.options
      const rows = rowsOf(opts)
      const icons = opts.some((o) => o.icon != null)
      // Wide enough for its longest caption (about half an em a letter).
      const longest = Math.max(
        0,
        ...opts.map((o) =>
          o.separator ? 0 : o.label.length + (o.items ? 2 : 0)
        )
      )
      const w = toolbar
        ? PAD * 2 + opts.length * CELL
        : Math.min(
            320,
            Math.max(LIST_WIDTH, (icons ? 48 : 40) + longest * 8.6 + 34)
          )
      const h = toolbar
        ? PAD * 2 + CELL
        : PAD * 2 + rows.reduce((t, r) => t + r.h, 0)
      // Level with its opener, but lifted so it ends no lower than the list
      // it came from when it fits: a submenu off the last row would hang off
      // the screen.
      const prev = laid[k - 1]
      const y = prev
        ? Math.max(
            0,
            Math.min(
              prev.y + prev.rows[prev.col.open].y - PAD,
              prev.y + prev.h - h
            )
          )
        : 0
      laid.push({ col, rows, icons, x, y, w, h })
      x += w + COL_GAP
    }
    const WIDTH = x - COL_GAP
    const height = Math.max(...laid.map((c) => c.y + c.h))
    root = svg({
      xmlns: 'http://www.w3.org/2000/svg',
      viewBox: `0 0 ${WIDTH} ${height}`,
      width: WIDTH,
      height,
    }) as unknown as SVGSVGElement
    const draw = () => {
      root.textContent = ''
      root.append(title(config.title))
      for (const c of laid)
        root.append(
          g(
            { transform: `translate(${c.x} ${c.y})` },
            rect({
              x: 0,
              y: 0,
              width: c.w,
              height: c.h,
              rx: 14,
              fill: 'rgba(20,24,32,0.88)',
            }),
            panelRim(c.w, c.h, 14)
          )
        )
      if (toolbar) {
        top.forEach((o, i) => {
          const x = PAD + i * CELL
          const on = o.value === value
          const hot = same(pressed, [0, i]) || same(hover, [0, i])
          const bg = hot ? CELL_HOT : on ? CELL_ON : CELL_BG
          root.append(
            g(
              {},
              title(o.label),
              rect({
                x: x + 2,
                y: PAD + 2,
                width: CELL - 4,
                height: CELL - 4,
                rx: 9,
                fill: bg,
              }),
              iconGlyph(o.icon!, {
                color: on ? INK_ON : INK,
                size: GLYPH,
                x: x + (CELL - GLYPH) / 2,
                y: PAD + (CELL - GLYPH) / 2,
              })
            )
          )
        })
        return
      }
      laid.forEach((c, k) => {
        const W = c.w
        const parts: Element[] = []
        c.rows.forEach((r, i) => {
          const o = r.opt
          if (o.separator) {
            parts.push(
              line({
                x1: PAD + 8,
                x2: W - PAD - 8,
                y1: r.y + r.h / 2,
                y2: r.y + r.h / 2,
                stroke: 'rgba(200,210,224,0.25)',
                'stroke-width': 1,
              })
            )
            return
          }
          const choice = !o.handleSelect && !o.items
          const on = choice ? o.value === value : o.checked === true
          const off = o.disabled === true
          const hot = !off && (same(pressed, [k, i]) || same(hover, [k, i]))
          // The row whose submenu is open beside it.
          const opener = o.items != null && cols[k + 1] && c.col.open === i
          const textX = c.icons ? 48 : 40
          parts.push(
            g(
              { opacity: off ? '0.4' : '1' },
              rect({
                x: PAD,
                y: r.y,
                width: W - PAD * 2,
                height: r.h,
                rx: 9,
                fill: hot
                  ? 'rgba(74,158,255,0.55)'
                  : opener
                  ? 'rgba(74,158,255,0.3)'
                  : 'rgba(255,255,255,0)',
              }),
              ...(o.icon
                ? [
                    iconGlyph(o.icon, {
                      color: on ? INK_ON : INK,
                      size: 24,
                      x: 14,
                      y: r.y + 6,
                    }),
                  ]
                : []),
              // The tick: at the left with no icons, at the right beside them.
              ...(on
                ? [
                    iconGlyph('check', {
                      color: '#e8eef8',
                      size: 18,
                      x: c.icons ? W - PAD - 26 : 14,
                      y: r.y + 9,
                    }),
                  ]
                : []),
              text(
                {
                  x: textX,
                  y: r.y + ROW / 2 + 6,
                  fill: on ? INK_ON : INK,
                  'font-size': 16,
                  'font-family': 'system-ui, sans-serif',
                },
                o.label
              ),
              ...(o.items
                ? [
                    text(
                      {
                        x: W - PAD - 20,
                        y: r.y + ROW / 2 + 6,
                        fill: INK,
                        'font-size': 16,
                        'font-family': 'system-ui, sans-serif',
                      },
                      '▸'
                    ),
                  ]
                : [])
            )
          )
        })
        root.append(
          g({ transform: `translate(${c.x} ${c.y})` }, ...parts)
        )
      })
    }
    const indexAt = (px: number, py: number): [number, number] | null => {
      if (toolbar) {
        const i = Math.floor((px - PAD) / CELL)
        return py >= 0 && py <= height && i >= 0 && i < top.length
          ? [0, i]
          : null
      }
      for (let k = laid.length - 1; k >= 0; k--) {
        const c = laid[k]
        if (px < c.x || px > c.x + c.w || py < c.y || py > c.y + c.h) continue
        const i = c.rows.findIndex(
          (r) => py - c.y >= r.y && py - c.y < r.y + r.h
        )
        return i >= 0 ? [k, i] : null
      }
      return null
    }
    const handlePointer = (kind: PointerKind, px: number, py: number) => {
      const at = kind === 'leave' ? null : indexAt(px, py)
      if (kind === 'down') pressed = at
      else if (kind === 'up') {
        const hit = at != null && same(at, pressed) ? at : null
        pressed = null
        const o = hit ? laid[hit[0]].rows[hit[1]].opt : null
        if (hit != null && o != null && !o.separator && !o.disabled) {
          const [k, i] = hit
          if (o.items) {
            // Open it beside this list (closing anything deeper), or close
            // it if it is the one already open.
            const wasOpen = cols[k + 1] != null && cols[k].open === i
            cols = cols.slice(0, k + 1)
            if (!wasOpen) {
              cols[k].open = i
              cols.push({ options: read(o.items), open: -1 })
            }
            return show()
          }
          if (o.handleSelect) o.handleSelect()
          else {
            value = o.value ?? o.label
            config.handleChange?.(value)
          }
          // Done: the menu goes (the scene closes a panel that says so).
          root.dispatchEvent(
            new CustomEvent('panelfocus', { detail: { focus: false } })
          )
          return
        }
      } else if (kind === 'leave') pressed = null
      if (!same(at, hover) || kind !== 'move') {
        hover = at
        draw()
      }
    }
    ;(
      root as unknown as { handlePointer: typeof handlePointer }
    ).handlePointer = handlePointer
    draw()
    return { root, draw }
  }

  const el = b3dPanel({
    icon: config.icon,
    title: config.title,
    chrome: 'none',
  }) as BarMenu
  let drawNow: () => void = () => {}
  // A new level is a new size: a new SVG, swapped into the same panel.
  const show = () => {
    hover = null
    pressed = null
    const made = make()
    drawNow = made.draw
    el.svg = made.root
  }
  // Each opening starts at the top, with the options as they are now.
  const reset = () => {
    cols = [{ options: read(config.options), open: -1 }]
    show()
  }
  el.addEventListener('paneltoggle', (e: Event) => {
    if ((e as CustomEvent).detail?.open) reset()
  })
  reset()
  Object.defineProperty(el, 'value', {
    get: () => value,
    set: (v: string) => {
      if (v === value) return
      value = v
      drawNow()
    },
  })
  return el
}

/**
 * Each view's icon: Tonio's biped seen from that side (the right is the left
 * mirrored), and for the perspective the biped walking in a turning arc.
 */
const FACE_ICONS: Record<InspectFace | 'free', string> = {
  free: 'bipedPreview',
  front: 'bipedFront',
  back: 'bipedBack',
  left: 'bipedSide',
  right: 'bipedSide0f',
  top: 'bipedTop',
  bottom: 'bipedBottom',
}

const FACE_LABELS: Record<InspectFace | 'free', string> = {
  free: 'perspective',
  front: 'front',
  back: 'back',
  left: 'left side',
  right: 'right side',
  top: 'top',
  bottom: 'bottom',
}

export interface ViewMenuOptions {
  /** The views it offers, in order (default: all six faces, then `free`). */
  faces?: Array<InspectFace | 'free'>
  /** What each is called (default: `front`, `left side`, … `perspective`). */
  labels?: Partial<Record<InspectFace | 'free', string>>
  /**
   * Shown in the perspective view too, so the faces can be reached from it.
   * Off (the default), it appears only while a face is held.
   */
  always?: boolean
  icon?: string
  title?: string
  /**
   * Views of the page's own beside the faces (the character builder's hand
   * view): `select` enters one, `leave` is called when another view is
   * picked, `active` says whether it is the view shown now.
   */
  extras?: ViewMenuExtra[]
}

/** A view of the page's own in a `viewMenu`. */
export interface ViewMenuExtra {
  value: string
  label: string
  icon: string
  select(): void
  leave(): void
  active(): boolean
}

/**
 * A camera on the system bar that picks an `inspectView`'s face, or
 * `perspective` to leave it: give it the `<tosi-b3d>` to live in. Call
 * `update()` when the face is changed some other way.
 */
export function viewMenu(
  inspect: InspectView,
  host: Element,
  options: ViewMenuOptions = {}
): { update(): void; dispose(): void } {
  const labels = { ...FACE_LABELS, ...options.labels }
  const extras = options.extras ?? []
  const menu = barMenu({
    icon: options.icon ?? 'camera',
    title: options.title ?? 'View',
    // A list: each view its icon and its name ("front" is not mistaken for
    // "back").
    layout: 'list',
    options: [
      ...(options.faces ?? [...INSPECT_FACES, 'free']).map((v) => ({
        value: v as string,
        label: labels[v],
        icon: FACE_ICONS[v],
      })),
      ...extras.map(({ value, label, icon }) => ({ value, label, icon })),
    ],
    value: inspect.face,
    handleChange: (v) => {
      const extra = extras.find((x) => x.value === v)
      for (const x of extras) if (x !== extra && x.active()) x.leave()
      if (extra) extra.select()
      else inspect.face = v as InspectFace | 'free'
      update()
    },
  })
  // In a headset the camera is your head: there is no view to pick, so the
  // menu leaves the bar for the session.
  const b3d = host as Element & {
    xrActive?: boolean
    scene?: {
      onBeforeRenderObservable: {
        add(f: () => void): unknown
        remove(o: unknown): void
      }
    }
    whenReady?: (cb: () => void) => void
  }
  let inXr = false
  const update = () => {
    const extra = extras.find((x) => x.active())
    menu.value = extra?.value ?? inspect.face
    if (inXr || (inspect.face === 'free' && !extra && !options.always))
      menu.remove()
    else if (menu.parentElement == null) host.append(menu)
  }
  update()
  // Declared before `whenReady`, which runs at once when the scene is up.
  let watch: unknown = null
  let disposed = false
  b3d.whenReady?.(() => {
    const scene = b3d.scene
    if (scene == null || disposed) return
    watch = scene.onBeforeRenderObservable.add(() => {
      const now = b3d.xrActive === true
      if (now === inXr) return
      inXr = now
      update()
    })
  })
  return {
    update,
    dispose() {
      disposed = true
      if (watch != null) b3d.scene?.onBeforeRenderObservable.remove(watch)
      menu.remove()
    },
  }
}
