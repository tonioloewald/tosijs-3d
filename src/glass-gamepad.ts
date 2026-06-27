/*#
# glass-gamepad

A **split** on-screen ("glass") gamepad for touch contexts. Instead of one
controller body, the controls are grouped into independently-anchored clusters,
each a small SVG pinned to a corner of the view:

| Cluster | Default anchor | Controls |
| --- | --- | --- |
| `left` | bottom-left | left stick, d-pad, left bumper/trigger |
| `right` | bottom-right | A/B/X/Y, right stick, right bumper/trigger |
| `top` | top-center | view, menu |

Each cluster is loaded from a self-contained SVG (default `/gamepad-left.svg`,
`/gamepad-right.svg`, `/gamepad-top.svg`) whose paths are labelled by `id`
(copied to `data-part` on load). There's no outer shell — just the clusters.

A `GlassGamepad` is a [[virtual-gamepad]] `GamepadSource`: drop its `.element`
over the scene and add it to a `MappedInputProvider` alongside keyboard / XR.
Each cluster runs its own `TouchGamepadSource`; their disjoint outputs are
merged, so the left cluster reports the left stick and the right the right.

```js
import { glassGamepad } from 'tosijs-3d'
import { elements } from 'tosijs'
const { div, pre } = elements

const pad = glassGamepad()
const readout = pre({ class: 'readout' })

function update() {
  const s = pad.poll()
  const lines = []
  if (s.leftStickX || s.leftStickY)
    lines.push(`L: ${s.leftStickX.toFixed(2)}, ${s.leftStickY.toFixed(2)}`)
  if (s.rightStickX || s.rightStickY)
    lines.push(`R: ${s.rightStickX.toFixed(2)}, ${s.rightStickY.toFixed(2)}`)
  const btns = ['buttonA','buttonB','buttonX','buttonY','leftBumper','rightBumper',
    'leftTrigger','rightTrigger','dpadUp','dpadDown','dpadLeft','dpadRight']
    .filter((k) => s[k] > 0)
  if (btns.length) lines.push(btns.join(', '))
  readout.textContent = lines.join('\n') || 'Touch or drag the controls'
  requestAnimationFrame(update)
}
update()

preview.append(div({ class: 'glass-stage' }, pad.element, readout))
```
```css
.glass-stage {
  position: relative;
  height: 70vh;
  background: radial-gradient(circle at 50% 30%, #20303a, #0b0f14);
  border-radius: 8px;
  overflow: hidden;
}
.glass-stage .readout {
  position: absolute;
  top: 12px;
  left: 12px;
  margin: 0;
  font-family: ui-monospace, monospace;
  font-size: 13px;
  color: #cfe;
  white-space: pre;
}
.glass-stage [data-part] {
  transition: stroke-width 0.08s, filter 0.08s;
}
.glass-stage [data-part].active {
  stroke-width: 32;
  filter: brightness(1.4);
}
```
*/
/*{ "parent": "Input" }*/

import { elements } from 'tosijs'
import { TouchGamepadSource, type TouchGamepadOptions } from './touch-gamepad'
import {
  type GamepadSource,
  type VirtualGamepad,
  emptyGamepad,
  mergeGamepads,
} from './virtual-gamepad'

const { div } = elements

export type ClusterAnchor =
  | 'bottom-left'
  | 'bottom-right'
  | 'bottom-center'
  | 'top-left'
  | 'top-right'
  | 'top-center'

const ANCHOR_CSS: Record<ClusterAnchor, string> = {
  'bottom-left': 'left:2vmin;bottom:2vmin',
  'bottom-right': 'right:2vmin;bottom:2vmin',
  'bottom-center': 'left:50%;bottom:2vmin;transform:translateX(-50%)',
  'top-left': 'left:2vmin;top:2vmin',
  'top-right': 'right:2vmin;top:2vmin',
  'top-center': 'left:50%;top:2vmin;transform:translateX(-50%)',
}

// The static cluster SVGs label paths by `id`; copy these (only) to `data-part`
// so TouchGamepadSource finds them — and so multiple instances don't clash on a
// global id.
const PART_IDS = new Set([
  'A',
  'B',
  'X',
  'Y',
  'left_bumper',
  'right_bumper',
  'left_trigger',
  'right_trigger',
  'dpad_up',
  'dpad_down',
  'dpad_left',
  'dpad_right',
  'menu',
  'view',
  'left_stick',
  'left_stick_travel',
  'right_stick',
  'right_stick_travel',
])

export type ClusterConfig = {
  /** SVG to load for this cluster. */
  url?: string
  /** Which corner to pin it to. */
  anchor?: ClusterAnchor
  /** CSS width of the cluster overlay (height follows the SVG aspect). */
  width?: string
}

export type GlassGamepadConfig = {
  /** Set a cluster to `false` to omit it, or override its url/anchor/width. */
  left?: ClusterConfig | false
  right?: ClusterConfig | false
  top?: ClusterConfig | false
  deadzone?: number
  maxZone?: number
  onButton?: (part: string, pressed: boolean) => void
}

const DEFAULTS: Record<'left' | 'right' | 'top', Required<ClusterConfig>> = {
  left: { url: '/gamepad-left.svg', anchor: 'bottom-left', width: '32vmin' },
  right: { url: '/gamepad-right.svg', anchor: 'bottom-right', width: '32vmin' },
  top: { url: '/gamepad-top.svg', anchor: 'top-center', width: '22vmin' },
}

async function loadCluster(url: string): Promise<SVGSVGElement> {
  const res = await fetch(url)
  const text = await res.text()
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml')
  const svg = doc.documentElement as unknown as SVGSVGElement
  for (const el of Array.from(svg.querySelectorAll('*'))) {
    // id → data-part (known parts only): so the source binds, and so global ids
    // don't collide if two gamepads are mounted.
    const id = el.getAttribute('id')
    if (id != null && PART_IDS.has(id)) {
      el.setAttribute('data-part', id)
      el.removeAttribute('id')
    }
    // Inline style → presentation attributes. The exported art bakes
    // fill/stroke/stroke-width into `style`, and inline style outranks every
    // stylesheet — so the `.active` highlight (and any themed/dynamic stroke)
    // could never override it. As attributes they're overridable, matching how
    // gamepad-svg.ts builds its themeable paths.
    const style = el.getAttribute('style')
    if (style != null) {
      for (const decl of style.split(';')) {
        const i = decl.indexOf(':')
        if (i < 0) continue
        const prop = decl.slice(0, i).trim()
        const val = decl.slice(i + 1).trim()
        if (prop !== '' && val !== '' && !el.hasAttribute(prop)) {
          el.setAttribute(prop, val)
        }
      }
      el.removeAttribute('style')
    }
  }
  return svg
}

/**
 * A split touch gamepad. `element` is a full-bleed overlay (`pointer-events`
 * pass through except on the clusters themselves); `poll()` merges all loaded
 * clusters into one `VirtualGamepad`.
 */
export class GlassGamepad implements GamepadSource {
  readonly element: HTMLDivElement
  private sources: TouchGamepadSource[] = []
  private disposed = false

  constructor(config: GlassGamepadConfig = {}) {
    this.element = div({ class: 'glass-gamepad' }) as HTMLDivElement
    this.element.setAttribute(
      'style',
      'position:absolute;inset:0;pointer-events:none;z-index:15'
    )
    const opts: TouchGamepadOptions = {
      deadzone: config.deadzone,
      maxZone: config.maxZone,
      onButton: config.onButton,
    }
    for (const key of ['left', 'right', 'top'] as const) {
      const c = config[key]
      if (c === false) continue
      void this.mountCluster({ ...DEFAULTS[key], ...c }, opts)
    }
  }

  private async mountCluster(
    cfg: Required<ClusterConfig>,
    opts: TouchGamepadOptions
  ): Promise<void> {
    let svg: SVGSVGElement
    try {
      svg = await loadCluster(cfg.url)
    } catch (err) {
      console.warn('glassGamepad: failed to load', cfg.url, err)
      return
    }
    if (this.disposed) return
    svg.setAttribute(
      'style',
      `position:absolute;${ANCHOR_CSS[cfg.anchor]};width:${cfg.width};` +
        `height:auto;pointer-events:auto;touch-action:none;` +
        `user-select:none;-webkit-user-select:none`
    )
    this.element.appendChild(svg)
    this.sources.push(new TouchGamepadSource(svg, opts))
  }

  poll(): VirtualGamepad {
    let merged = emptyGamepad()
    for (const s of this.sources) merged = mergeGamepads(merged, s.poll())
    return merged
  }

  /** Mirror external gamepad state (hardware/keyboard) onto untouched controls. */
  reflectState(pad: VirtualGamepad): void {
    for (const s of this.sources) s.reflectState(pad)
  }

  dispose(): void {
    this.disposed = true
    for (const s of this.sources) s.dispose()
    this.sources = []
    this.element.remove()
  }
}

export function glassGamepad(config?: GlassGamepadConfig): GlassGamepad {
  return new GlassGamepad(config)
}
