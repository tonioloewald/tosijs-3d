/*#
# glass-gamepad (b3dGamepad)

A **split** on-screen ("glass") gamepad for touch contexts, as a Component (so
it's both the overlay element *and* a [[virtual-gamepad]] `GamepadSource`, like
`gameController`/`keyboardGamepad`). Instead of one controller body, the controls
are grouped into independently-anchored clusters, each a small SVG pinned to a
corner of the view:

| Cluster | Default anchor | Controls |
| --- | --- | --- |
| `left` | bottom-left | left stick, d-pad, left bumper/trigger |
| `right` | bottom-right | A/B/X/Y, right stick, right bumper/trigger |
| `top` | top-center | view, menu |

Each cluster is loaded from a self-contained SVG (default `/gamepad-left.svg`,
`/gamepad-right.svg`, `/gamepad-top.svg`) whose paths are labelled by `id`
(copied to `data-part` on load). There's no outer shell — just the clusters.

Usually you don't place this yourself: set the `gamepad` attribute on
[[tosi-b3d]] and it mounts one and wires it into the active input system. Placed
directly, it's a `GamepadSource` whose `poll()` merges all clusters.

```js
import { b3dGamepad } from 'tosijs-3d'
import { elements } from 'tosijs'
const { div, pre } = elements

const pad = b3dGamepad()
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

// height:100% so the vmin-scaled clusters are exercised at the card's real size.
preview.append(div({ class: 'glass-stage' }, pad, readout))
```
```css
.glass-stage {
  position: relative;
  height: 100%;
  min-height: 240px;
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
  pointer-events: none;
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

import { Component, elements } from 'tosijs'
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
  /** Base width of the cluster overlay in vmin (multiplied by `scale`). */
  vmin?: number
}

const DEFAULTS: Record<'left' | 'right' | 'top', Required<ClusterConfig>> = {
  left: { url: '/gamepad-left.svg', anchor: 'bottom-left', vmin: 30 },
  right: { url: '/gamepad-right.svg', anchor: 'bottom-right', vmin: 30 },
  top: { url: '/gamepad-top.svg', anchor: 'top-center', vmin: 20 },
}

// Which controls each cluster owns — used to skip empty clusters and to hide
// controls that weren't requested. Sticks list both knob and travel.
const CLUSTER_PARTS: Record<'left' | 'right' | 'top', string[]> = {
  left: [
    'left_stick',
    'left_stick_travel',
    'dpad_up',
    'dpad_down',
    'dpad_left',
    'dpad_right',
    'left_bumper',
    'left_trigger',
  ],
  right: [
    'A',
    'B',
    'X',
    'Y',
    'right_stick',
    'right_stick_travel',
    'right_bumper',
    'right_trigger',
  ],
  top: ['menu', 'view'],
}

const NAME_ALIASES: Record<string, string[]> = {
  a: ['A'],
  b: ['B'],
  x: ['X'],
  y: ['Y'],
  dpad: ['dpad_up', 'dpad_down', 'dpad_left', 'dpad_right'],
}

/**
 * Parse a gamepad spec — e.g. `"a,b,right_stick(40,0),menu"` — into the controls
 * to show and any per-piece offsets. `''` / `'true'` → all controls. `a/b/x/y`
 * map to `A/B/X/Y`; `dpad` expands to the four directions.
 */
export function parseGamepadControls(spec: string): {
  controls?: string[]
  offsets: Record<string, { x: number; y: number }>
} {
  const offsets: Record<string, { x: number; y: number }> = {}
  const s = spec.trim()
  if (s === '' || s === 'true') return { offsets } // all controls
  const controls: string[] = []
  for (const token of s.split(',')) {
    const m = token
      .trim()
      .match(
        /^([A-Za-z_]+)(?:\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\))?$/
      )
    if (m == null) continue
    const names = NAME_ALIASES[m[1].toLowerCase()] ?? [m[1].toLowerCase()]
    for (const n of names) {
      controls.push(n)
      if (m[2] != null) offsets[n] = { x: Number(m[2]), y: Number(m[3]) }
    }
  }
  return { controls, offsets }
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
 * The split touch gamepad as a Component: the element is a full-bleed overlay
 * (pointer-events pass through except on the clusters), and the element *is* the
 * `GamepadSource` — `poll()` merges every loaded cluster. b3dInputFocus finds it
 * and adds it to the active input provider.
 */
export class B3dGamepad extends Component implements GamepadSource {
  static initAttributes = {
    /** Spec string: `''`/`true` = full layout, else e.g. `"a,b,left_stick"`. */
    controls: '',
    /** Scale all clusters while keeping them anchored. */
    scale: 1,
    deadzone: 0.15,
    maxZone: 0.85,
  }

  static styleSpec = {
    ':host': {
      position: 'absolute',
      inset: '0',
      pointerEvents: 'none',
      zIndex: '15',
    },
    ':host .pad-clusters': {
      position: 'absolute',
      inset: '0',
      pointerEvents: 'none',
    },
  }

  content = [div({ class: 'pad-clusters', part: 'clusters' })]

  declare controls: string
  declare scale: number
  declare deadzone: number
  declare maxZone: number

  /** Advanced: per-cluster url/anchor/vmin overrides, or `false` to omit one. */
  clusters?: {
    left?: ClusterConfig | false
    right?: ClusterConfig | false
    top?: ClusterConfig | false
  }
  onButton?: (part: string, pressed: boolean) => void

  private sources: TouchGamepadSource[] = []
  private built = false

  connectedCallback(): void {
    super.connectedCallback()
    if (!this.built) {
      this.built = true
      void this._build()
    }
  }

  private async _build(): Promise<void> {
    const host = this.parts.clusters as HTMLElement
    const { controls } = parseGamepadControls(String(this.controls ?? ''))
    const scale = this.scale ?? 1
    const opts: TouchGamepadOptions = {
      deadzone: this.deadzone,
      maxZone: this.maxZone,
      onButton: this.onButton,
    }
    // The set of controls to show (undefined = all). A stick implies its travel.
    let want: Set<string> | undefined
    if (controls != null) {
      want = new Set(controls)
      if (want.has('left_stick')) want.add('left_stick_travel')
      if (want.has('right_stick')) want.add('right_stick_travel')
    }
    for (const key of ['left', 'right', 'top'] as const) {
      const c = this.clusters?.[key]
      if (c === false) continue
      if (want != null && !CLUSTER_PARTS[key].some((p) => want!.has(p)))
        continue
      const cfg = { ...DEFAULTS[key], ...c }
      let svg: SVGSVGElement
      try {
        svg = await loadCluster(cfg.url)
      } catch (err) {
        console.warn('b3dGamepad: failed to load', cfg.url, err)
        continue
      }
      if (!this.isConnected) return
      if (want != null) {
        for (const el of Array.from(svg.querySelectorAll('[data-part]'))) {
          const p = el.getAttribute('data-part')
          if (p != null && !want.has(p)) el.setAttribute('display', 'none')
        }
      }
      svg.setAttribute(
        'style',
        `position:absolute;${ANCHOR_CSS[cfg.anchor]};` +
          `width:${cfg.vmin * scale}vmin;height:auto;pointer-events:auto;` +
          `touch-action:none;user-select:none;-webkit-user-select:none`
      )
      host.appendChild(svg)
      this.sources.push(new TouchGamepadSource(svg, opts))
    }
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

  disconnectedCallback(): void {
    for (const s of this.sources) s.dispose()
    this.sources = []
    super.disconnectedCallback()
  }
}

export const b3dGamepad = B3dGamepad.elementCreator({
  tag: 'tosi-b3d-gamepad',
})
