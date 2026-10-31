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
  value: string
  label?: string
  /**
   * Its icon (an `svgIcons` name). When every option has one, the menu is
   * a TOOLBAR: one row of icons, each named by its tooltip.
   */
  icon?: string
}

export interface BarMenuConfig {
  /** The button's icon (an `svgIcons` name). */
  icon: string
  /** Its name: the tooltip, and what a screen reader says. */
  title: string
  options: Array<string | BarMenuOption>
  value?: string
  handleChange?: (value: string) => void
}

export type BarMenu = B3dPanel & { value: string }

const ROW = 36
const LIST_WIDTH = 168
const PAD = 6
/** A toolbar's cell, and its icon. */
const CELL = 44
const GLYPH = 32
// Opaque, so a `stroked filled` icon's knockout matches what is behind it.
const CELL_BG = '#161a22'
const CELL_ON = '#24364d'
const CELL_HOT = '#2f5786'

export function barMenu(config: BarMenuConfig): BarMenu {
  const { svg, g, rect, text, title } = svgElements
  const options = config.options.map((o) =>
    typeof o === 'string'
      ? { value: o, label: o, icon: undefined as string | undefined }
      : { label: o.value, ...o }
  )
  const toolbar = options.length > 0 && options.every((o) => o.icon != null)
  let value = config.value ?? options[0]?.value ?? ''
  let hover = -1
  let pressed = -1
  const WIDTH = toolbar ? PAD * 2 + options.length * CELL : LIST_WIDTH
  const height = toolbar ? PAD * 2 + CELL : PAD * 2 + options.length * ROW
  const root = svg({
    xmlns: 'http://www.w3.org/2000/svg',
    viewBox: `0 0 ${WIDTH} ${height}`,
    width: WIDTH,
    height,
  }) as unknown as SVGSVGElement

  const build = () => {
    root.textContent = ''
    root.append(
      title(config.title),
      rect({
        x: 0,
        y: 0,
        width: WIDTH,
        height,
        rx: 14,
        fill: 'rgba(20,24,32,0.88)',
      }),
      panelRim(WIDTH, height, 14)
    )
    if (toolbar) {
      options.forEach((o, i) => {
        const x = PAD + i * CELL
        const on = o.value === value
        const bg =
          i === pressed || i === hover ? CELL_HOT : on ? CELL_ON : CELL_BG
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
              color: on ? '#ffffff' : '#c8d2e0',
              knockout: bg,
              size: GLYPH,
              x: x + (CELL - GLYPH) / 2,
              y: PAD + (CELL - GLYPH) / 2,
            })
          )
        )
      })
      return
    }
    options.forEach((o, i) => {
      const y = PAD + i * ROW
      const on = o.value === value
      root.append(
        g(
          {},
          rect({
            x: PAD,
            y,
            width: WIDTH - PAD * 2,
            height: ROW,
            rx: 9,
            fill:
              i === pressed || i === hover
                ? 'rgba(74,158,255,0.55)'
                : 'rgba(255,255,255,0)',
          }),
          ...(on
            ? [
                iconGlyph('check', {
                  color: '#e8eef8',
                  size: 18,
                  x: 14,
                  y: y + 9,
                }),
              ]
            : []),
          text(
            {
              x: 40,
              y: y + ROW / 2 + 6,
              fill: on ? '#ffffff' : '#c8d2e0',
              'font-size': 16,
              'font-family': 'system-ui, sans-serif',
            },
            o.label
          )
        )
      )
    })
  }

  const indexAt = (x: number, y: number) => {
    if (toolbar) {
      const i = Math.floor((x - PAD) / CELL)
      return y >= 0 && y <= height && i >= 0 && i < options.length ? i : -1
    }
    const i = Math.floor((y - PAD) / ROW)
    return x >= 0 && x <= WIDTH && i >= 0 && i < options.length ? i : -1
  }
  const handlePointer = (kind: PointerKind, x: number, y: number) => {
    const i = kind === 'leave' ? -1 : indexAt(x, y)
    if (kind === 'down') pressed = i
    else if (kind === 'up') {
      const chosen = i >= 0 && i === pressed ? options[i] : null
      pressed = -1
      if (chosen != null) {
        value = chosen.value
        build()
        config.handleChange?.(value)
        // Chosen: the menu goes (the scene closes a panel that says so).
        root.dispatchEvent(
          new CustomEvent('panelfocus', { detail: { focus: false } })
        )
        return
      }
    } else if (kind === 'leave') pressed = -1
    if (i !== hover || kind !== 'move') {
      hover = i
      build()
    }
  }
  ;(root as unknown as { handlePointer: typeof handlePointer }).handlePointer =
    handlePointer
  build()

  const el = b3dPanel({
    icon: config.icon,
    title: config.title,
    chrome: 'none',
  }) as BarMenu
  el.svg = root
  Object.defineProperty(el, 'value', {
    get: () => value,
    set: (v: string) => {
      if (v === value) return
      value = v
      build()
    },
  })
  return el
}

/**
 * Each view's icon: Tonio's biped seen from that side (the right is the left
 * mirrored), and an orbit for the perspective.
 */
const FACE_ICONS: Record<InspectFace | 'free', string> = {
  free: 'rotateCw',
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
  const menu = barMenu({
    icon: options.icon ?? 'camera',
    title: options.title ?? 'View',
    // A toolbar: each view its icon, named by its tooltip.
    options: (options.faces ?? [...INSPECT_FACES, 'free']).map((v) => ({
      value: v,
      label: labels[v],
      icon: FACE_ICONS[v],
    })),
    value: inspect.face,
    handleChange: (v) => {
      inspect.face = v as InspectFace | 'free'
      update()
    },
  })
  const update = () => {
    menu.value = inspect.face
    if (inspect.face === 'free' && !options.always) menu.remove()
    else if (menu.parentElement == null) host.append(menu)
  }
  update()
  return {
    update,
    dispose() {
      menu.remove()
    },
  }
}
