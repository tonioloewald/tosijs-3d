/*#
# touch-gamepad

Touch/pointer-driven virtual gamepad backed by an SVG. Elements are identified
by `data-part` attributes (not IDs, so multiple instances work).

## How it works

Load any SVG with elements whose `data-part` values match the standard layout:

| `data-part` | VirtualGamepad | Type |
|-------------|---------------|------|
| `left_stick` / `left_stick_travel` | `leftStickX/Y` | stick |
| `right_stick` / `right_stick_travel` | `rightStickX/Y` | stick |
| `A`, `B`, `X`, `Y` | `buttonA/B/X/Y` | button |
| `left_bumper`, `right_bumper` | `leftBumper`, `rightBumper` | button |
| `left_trigger`, `right_trigger` | `leftTrigger`, `rightTrigger` | button |
| `dpad_up/down/left/right` | `dpadUp/Down/Left/Right` | button |

### Sticks

Touch inside a `*_stick_travel` region to grab the stick. The travel circle
recenters to your touch point and the knob tracks your drag. Release snaps
everything back. Deadzone and max-zone are applied so you don't need pixel
precision.

### Buttons

Touch a button element to set its value to 1 and add an `active` CSS class.
Release sets it back to 0. Elements with `data-part` values not in the table
above (e.g. `menu`, `view`) still get the `active` class and fire the optional
`handleButton(part, pressed)` callback.

## Demo

```js
import { gamepadSvg, TouchGamepadSource } from 'tosijs-3d'
import { elements } from 'tosijs'
const { div, pre } = elements

const pad = gamepadSvg()
const customBtns = new Set()
const source = new TouchGamepadSource(pad, {
  handleButton(part, pressed) {
    if (pressed) customBtns.add(part)
    else customBtns.delete(part)
  },
})
const readout = pre({ class: 'readout' })

function update() {
  const s = source.poll()
  const lines = []
  if (s.leftStickX || s.leftStickY)
    lines.push(`L stick: ${s.leftStickX.toFixed(2)}, ${s.leftStickY.toFixed(2)}`)
  if (s.rightStickX || s.rightStickY)
    lines.push(`R stick: ${s.rightStickX.toFixed(2)}, ${s.rightStickY.toFixed(2)}`)
  const btns = ['buttonA','buttonB','buttonX','buttonY',
    'leftBumper','rightBumper','leftTrigger','rightTrigger',
    'dpadUp','dpadDown','dpadLeft','dpadRight']
    .filter(k => s[k] > 0)
  if (btns.length) lines.push(`Buttons: ${btns.join(', ')}`)
  if (customBtns.size) lines.push(`Custom: ${[...customBtns].join(', ')}`)
  readout.textContent = lines.join('\n') || 'Touch or click the gamepad'
  requestAnimationFrame(update)
}
update()

preview.append(div({ class: 'gamepad-demo' }, pad, readout))
```
```css
.gamepad-demo {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.gamepad-demo svg {
  width: 100%;
  max-width: 400px;
  cursor: pointer;
}
.gamepad-demo .readout {
  font-family: ui-monospace, monospace;
  font-size: 12px;
  color: #222;
  min-height: 2.5em;
  margin: 0;
}
.gamepad-demo [data-part].active {
  stroke-width: 24;
  filter: brightness(1.3);
}
```

## Usage

```typescript
import { TouchGamepadSource } from 'tosijs-3d'

const svg = document.querySelector('svg.gamepad')
const source = new TouchGamepadSource(svg)

// Add to a MappedInputProvider alongside keyboard/hardware gamepad
provider.addSource(source)
```
*/
/*{ "parent": "Input" }*/

import type {
  GamepadSource,
  VirtualGamepad,
  MappingLabels,
} from './virtual-gamepad'
import { emptyGamepad } from './virtual-gamepad'

// data-part value → VirtualGamepad button field
const BUTTON_MAP: Record<string, keyof VirtualGamepad> = {
  A: 'buttonA',
  B: 'buttonB',
  X: 'buttonX',
  Y: 'buttonY',
  left_bumper: 'leftBumper',
  right_bumper: 'rightBumper',
  left_trigger: 'leftTrigger',
  right_trigger: 'rightTrigger',
  dpad_up: 'dpadUp',
  dpad_down: 'dpadDown',
  dpad_left: 'dpadLeft',
  dpad_right: 'dpadRight',
  menu: 'menu',
  view: 'view',
}

// VirtualGamepad field → data-part name (reverse of BUTTON_MAP + sticks)
const FIELD_TO_PART: Record<string, string> = {}
for (const [part, field] of Object.entries(BUTTON_MAP)) {
  FIELD_TO_PART[field] = part
}
// Stick fields map to their knob elements
FIELD_TO_PART['leftStickX'] = 'left_stick'
FIELD_TO_PART['leftStickY'] = 'left_stick'
FIELD_TO_PART['rightStickX'] = 'right_stick'
FIELD_TO_PART['rightStickY'] = 'right_stick'

interface StickState {
  /** Which gamepad stick this is — set from its data-part, NOT array order, so
   * a cluster containing only the right stick still reports it correctly. */
  side: 'left' | 'right'
  travel: SVGGraphicsElement
  knob: SVGGraphicsElement
  /** Center of travel area in SVG coords */
  cx: number
  cy: number
  /** Radius of travel area */
  radius: number
  /** Original knob transform */
  knobOriginalTransform: string
  /** Active pointer ID tracking this stick, or -1 */
  pointerId: number
  /** Touch origin in SVG coords (where the user first touched) */
  originX: number
  originY: number
  /** Current normalized output -1..1 */
  x: number
  y: number
  /** Translation applied to travel group for recentering */
  offsetX: number
  offsetY: number
}

function applyDeadzone(
  value: number,
  deadzone: number,
  maxZone: number
): number {
  const abs = Math.abs(value)
  if (abs < deadzone) return 0
  if (abs > maxZone) return Math.sign(value)
  return (Math.sign(value) * (abs - deadzone)) / (maxZone - deadzone)
}

function svgPoint(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number
): { x: number; y: number } {
  const pt = svg.createSVGPoint()
  pt.x = clientX
  pt.y = clientY
  const ctm = svg.getScreenCTM()
  if (ctm == null) return { x: clientX, y: clientY }
  const transformed = pt.matrixTransform(ctm.inverse())
  return { x: transformed.x, y: transformed.y }
}

/** Pointer phase for the coordinate-based (in-scene/VR) input path. */
export type GamepadPointerKind = 'down' | 'move' | 'up'

export type TouchGamepadOptions = {
  deadzone?: number
  maxZone?: number
  /** Handler called when an unmapped data-part element is pressed/released */
  handleButton?: (part: string, pressed: boolean) => void
}

export class TouchGamepadSource implements GamepadSource {
  private svg: SVGSVGElement
  private state: VirtualGamepad = emptyGamepad()
  private sticks: StickState[] = []
  private sticksInitialized = false
  private buttonPointers = new Map<string, number>() // data-part → pointerId
  private customPointers = new Map<string, number>() // unmapped data-part → pointerId
  // Cached viewBox-space rects for coordinate hit-testing (the in-scene/VR path,
  // which has no DOM target to walk). Computed once the SVG has laid out.
  private buttonBounds = new Map<
    string,
    { x: number; y: number; w: number; h: number }
  >()
  private boundsReady = false
  private deadzone: number
  private maxZone: number
  private handleButton?: (part: string, pressed: boolean) => void
  private boundPointerDown: (e: PointerEvent) => void
  private boundPointerMove: (e: PointerEvent) => void
  private boundPointerUp: (e: PointerEvent) => void

  constructor(svgElement: SVGSVGElement, options?: TouchGamepadOptions) {
    this.svg = svgElement
    this.deadzone = options?.deadzone ?? 0.15
    this.maxZone = options?.maxZone ?? 0.85
    this.handleButton = options?.handleButton

    // Sticks are initialized lazily on first interaction because
    // getBBox() returns zeros until the SVG is in the DOM.
    this.initButtons()

    this.boundPointerDown = this.onPointerDown.bind(this)
    this.boundPointerMove = this.onPointerMove.bind(this)
    this.boundPointerUp = this.onPointerUp.bind(this)

    this.svg.addEventListener('pointerdown', this.boundPointerDown)
    this.svg.addEventListener('pointermove', this.boundPointerMove)
    this.svg.addEventListener('pointerup', this.boundPointerUp)
    this.svg.addEventListener('pointercancel', this.boundPointerUp)

    // Prevent default touch actions on the SVG to avoid scrolling/zooming
    this.svg.style.touchAction = 'none'
  }

  private part(name: string): SVGGraphicsElement | null {
    return this.svg.querySelector(`[data-part="${name}"]`)
  }

  private ensureSticks() {
    if (this.sticksInitialized) return

    for (const prefix of ['left_stick', 'right_stick']) {
      const travel = this.part(`${prefix}_travel`)
      const knob = this.part(prefix)
      if (travel == null || knob == null) continue

      const bbox = travel.getBBox()
      if (bbox.width === 0 || bbox.height === 0) continue

      this.sticks.push({
        side: prefix === 'left_stick' ? 'left' : 'right',
        travel,
        knob,
        cx: bbox.x + bbox.width / 2,
        cy: bbox.y + bbox.height / 2,
        radius: Math.min(bbox.width, bbox.height) / 2,
        knobOriginalTransform: knob.getAttribute('transform') || '',
        pointerId: -1,
        originX: 0,
        originY: 0,
        x: 0,
        y: 0,
        offsetX: 0,
        offsetY: 0,
      })
    }

    // Only mark initialized if we actually found sticks (getBBox returns
    // zeros before the SVG is in the DOM, so we need to retry later)
    if (this.sticks.length > 0) {
      this.sticksInitialized = true
    }
  }

  private initButtons() {
    for (const name of Object.keys(BUTTON_MAP)) {
      const el = this.part(name)
      if (el != null) {
        el.classList.add('touch-button')
      }
    }
  }

  private findStickForElement(target: Element): StickState | undefined {
    for (const stick of this.sticks) {
      if (
        stick.travel === target ||
        stick.knob === target ||
        stick.travel.contains(target) ||
        stick.knob.contains(target)
      ) {
        return stick
      }
    }
    return undefined
  }

  private findAnyPart(target: Element): string | undefined {
    // Walk up from target to find any interactive element with a data-part
    let el: Element | null = target
    while (el != null && el !== this.svg) {
      const part = (el as HTMLElement).dataset?.part
      if (part != null && part !== 'controller') return part
      el = el.parentElement
    }
    return undefined
  }

  // --- Shared grab/press/move/release logic --------------------------------
  // Used by BOTH the DOM pointer path (flat overlay) and the coordinate-based
  // handlePointer path (in-scene/VR), so behaviour is identical on both.

  private grabStick(
    stick: StickState,
    x: number,
    y: number,
    pointerId: number
  ) {
    stick.pointerId = pointerId
    stick.originX = x
    stick.originY = y
    // Recenter the travel+knob group to the grab point
    stick.offsetX = x - stick.cx
    stick.offsetY = y - stick.cy
    this.updateStickVisual(stick, 0, 0)
    stick.x = 0
    stick.y = 0
  }

  private moveStick(stick: StickState, x: number, y: number) {
    let dx = x - stick.originX
    let dy = y - stick.originY
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist > stick.radius) {
      dx = (dx / dist) * stick.radius
      dy = (dy / dist) * stick.radius
    }
    const nx = dx / stick.radius
    const ny = dy / stick.radius
    stick.x = applyDeadzone(nx, this.deadzone, this.maxZone)
    stick.y = applyDeadzone(-ny, this.deadzone, this.maxZone) // up = positive
    this.updateStickVisual(stick, dx, dy)
  }

  private pressPart(part: string, pointerId: number) {
    const field = BUTTON_MAP[part]
    if (field) {
      this.buttonPointers.set(part, pointerId)
      ;(this.state as any)[field] = 1
    } else {
      this.customPointers.set(part, pointerId)
      this.handleButton?.(part, true)
    }
    this.part(part)?.classList.add('active')
  }

  /** Release whatever (stick or button) a pointer id currently holds. */
  private releasePointer(pointerId: number): boolean {
    for (const stick of this.sticks) {
      if (stick.pointerId !== pointerId) continue
      stick.pointerId = -1
      stick.x = 0
      stick.y = 0
      stick.offsetX = 0
      stick.offsetY = 0
      stick.knob.setAttribute('transform', stick.knobOriginalTransform)
      stick.travel.setAttribute('transform', '')
      return true
    }
    for (const [part, pid] of this.buttonPointers) {
      if (pid !== pointerId) continue
      this.buttonPointers.delete(part)
      ;(this.state as any)[BUTTON_MAP[part]] = 0
      this.part(part)?.classList.remove('active')
      return true
    }
    for (const [part, pid] of this.customPointers) {
      if (pid !== pointerId) continue
      this.customPointers.delete(part)
      this.handleButton?.(part, false)
      this.part(part)?.classList.remove('active')
      return true
    }
    return false
  }

  // --- DOM pointer path (flat-screen overlay) ------------------------------
  // Hit-tests by event target (accurate for irregular shapes), converts
  // clientX/Y → viewBox via the CTM (valid on-screen), then drives the shared
  // helpers above.

  private onPointerDown(e: PointerEvent) {
    const target = e.target as Element
    if (target == null) return
    this.ensureSticks() // getBBox needs the SVG in the DOM
    const pt = svgPoint(this.svg, e.clientX, e.clientY)

    const stick = this.findStickForElement(target)
    if (stick != null && stick.pointerId === -1) {
      e.preventDefault()
      this.svg.setPointerCapture(e.pointerId)
      this.grabStick(stick, pt.x, pt.y, e.pointerId)
      return
    }
    const buttonPart = this.findAnyPart(target)
    if (buttonPart != null) {
      e.preventDefault()
      this.svg.setPointerCapture(e.pointerId)
      this.pressPart(buttonPart, e.pointerId)
    }
  }

  private onPointerMove(e: PointerEvent) {
    for (const stick of this.sticks) {
      if (stick.pointerId !== e.pointerId) continue
      const pt = svgPoint(this.svg, e.clientX, e.clientY)
      this.moveStick(stick, pt.x, pt.y)
      return
    }
  }

  private onPointerUp(e: PointerEvent) {
    this.releasePointer(e.pointerId)
  }

  // --- Coordinate path (in-scene / VR) -------------------------------------
  // Same input via viewBox coords + a pointer id — no DOM events, no CTM. Fed by
  // a textured plane's pick (UV → viewBox), exactly like panel3d.handlePointer.
  // Hit-tests by cached geometry since there's no DOM target to walk.

  handlePointer(
    kind: GamepadPointerKind,
    x: number,
    y: number,
    pointerId = 0
  ): void {
    if (kind === 'move') {
      for (const stick of this.sticks) {
        if (stick.pointerId === pointerId) this.moveStick(stick, x, y)
      }
      return
    }
    if (kind === 'up') {
      this.releasePointer(pointerId)
      return
    }
    // down — sticks first (point in travel circle), then buttons (point in rect)
    this.ensureSticks()
    this.ensureBounds()
    for (const stick of this.sticks) {
      if (stick.pointerId !== -1) continue
      const dx = x - stick.cx
      const dy = y - stick.cy
      if (dx * dx + dy * dy <= stick.radius * stick.radius) {
        this.grabStick(stick, x, y, pointerId)
        return
      }
    }
    for (const [part, r] of this.buttonBounds) {
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        this.pressPart(part, pointerId)
        return
      }
    }
  }

  /** Cache button rects (viewBox space) for coordinate hit-testing. */
  private ensureBounds() {
    if (this.boundsReady) return
    const skip = new Set([
      'controller',
      'left_stick',
      'right_stick',
      'left_stick_travel',
      'right_stick_travel',
    ])
    let any = false
    for (const el of Array.from(
      this.svg.querySelectorAll<SVGGraphicsElement>('[data-part]')
    )) {
      const part = el.dataset.part
      if (part == null || skip.has(part)) continue
      const b = el.getBBox()
      if (b.width === 0 && b.height === 0) continue
      this.buttonBounds.set(part, { x: b.x, y: b.y, w: b.width, h: b.height })
      any = true
    }
    if (any) this.boundsReady = true
  }

  private updateStickVisual(stick: StickState, knobDx: number, knobDy: number) {
    // Move the travel circle to recentered position
    stick.travel.setAttribute(
      'transform',
      `translate(${stick.offsetX}, ${stick.offsetY})`
    )
    // Move the knob relative to the recentered travel center
    const knobTranslate = `translate(${stick.offsetX + knobDx}, ${
      stick.offsetY + knobDy
    })`
    stick.knob.setAttribute(
      'transform',
      stick.knobOriginalTransform
        ? `${stick.knobOriginalTransform} ${knobTranslate}`
        : knobTranslate
    )
  }

  poll(): VirtualGamepad {
    // Copy stick values into state, keyed by side (a cluster may have only one).
    for (const stick of this.sticks) {
      if (stick.side === 'left') {
        this.state.leftStickX = stick.x
        this.state.leftStickY = stick.y
      } else {
        this.state.rightStickX = stick.x
        this.state.rightStickY = stick.y
      }
    }
    return { ...this.state }
  }

  /**
   * Update SVG visuals to reflect external VirtualGamepad state.
   * Sticks and buttons not currently being touched will mirror the
   * provided values — useful for showing hardware gamepad or keyboard input.
   */
  reflectState(pad: VirtualGamepad) {
    this.ensureSticks()

    // Reflect each stick (keyed by side; skip if currently being touched)
    for (const s of this.sticks) {
      if (s.pointerId !== -1) continue
      const dx =
        (s.side === 'left' ? pad.leftStickX : pad.rightStickX) * s.radius
      const dy =
        -(s.side === 'left' ? pad.leftStickY : pad.rightStickY) * s.radius
      const knobTranslate = `translate(${dx}, ${dy})`
      s.knob.setAttribute(
        'transform',
        s.knobOriginalTransform
          ? `${s.knobOriginalTransform} ${knobTranslate}`
          : knobTranslate
      )
      s.travel.setAttribute('transform', '')
    }

    // Reflect buttons (skip if being touched)
    for (const [partName, field] of Object.entries(BUTTON_MAP)) {
      if (this.buttonPointers.has(partName)) continue
      const el = this.part(partName)
      if (el == null) continue
      if ((pad as any)[field] > 0) {
        el.classList.add('active')
      } else {
        el.classList.remove('active')
      }
    }
  }

  /**
   * Overlay text labels on gamepad elements showing mapped action names.
   * Call with new labels when the mapping changes.
   */
  showLabels(labels: MappingLabels) {
    // Remove previous labels
    for (const old of Array.from(this.svg.querySelectorAll('.mapping-label'))) {
      old.remove()
    }

    for (const [field, label] of Object.entries(labels)) {
      const partName = FIELD_TO_PART[field]
      if (!partName) continue
      const el = this.part(partName)
      if (el == null) continue

      const bbox = el.getBBox()
      const cx = bbox.x + bbox.width / 2
      const cy = bbox.y + bbox.height / 2

      const text = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'text'
      )
      text.setAttribute('x', String(cx))
      text.setAttribute('y', String(cy))
      text.setAttribute('text-anchor', 'middle')
      text.setAttribute('dominant-baseline', 'central')
      text.setAttribute('font-size', '18')
      text.setAttribute('font-family', 'sans-serif')
      text.setAttribute('fill', '#000')
      text.setAttribute('pointer-events', 'none')
      text.classList.add('mapping-label')
      text.textContent = label
      this.svg.appendChild(text)
    }
  }

  dispose() {
    this.svg.removeEventListener('pointerdown', this.boundPointerDown)
    this.svg.removeEventListener('pointermove', this.boundPointerMove)
    this.svg.removeEventListener('pointerup', this.boundPointerUp)
    this.svg.removeEventListener('pointercancel', this.boundPointerUp)

    // Reset all visuals
    for (const stick of this.sticks) {
      stick.knob.setAttribute('transform', stick.knobOriginalTransform)
      stick.travel.setAttribute('transform', '')
    }
    for (const [buttonPart] of this.buttonPointers) {
      this.part(buttonPart)?.classList.remove('active')
    }
    for (const [buttonPart] of this.customPointers) {
      this.part(buttonPart)?.classList.remove('active')
    }
    this.sticks = []
    this.buttonPointers.clear()
    this.customPointers.clear()
    this.state = emptyGamepad()
  }
}
