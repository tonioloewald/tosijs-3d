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
`onButton(part, pressed)` callback.

## Demo

```js
import { gamepadSvg, TouchGamepadSource } from 'tosijs-3d'
import { elements } from 'tosijs'
const { div, pre } = elements

const pad = gamepadSvg()
const customBtns = new Set()
const source = new TouchGamepadSource(pad, {
  onButton(part, pressed) {
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

import type { GamepadSource, VirtualGamepad } from './virtual-gamepad'
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
}

interface StickState {
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

export type TouchGamepadOptions = {
  deadzone?: number
  maxZone?: number
  /** Handler called when an unmapped data-part element is pressed/released */
  onButton?: (part: string, pressed: boolean) => void
}

export class TouchGamepadSource implements GamepadSource {
  private svg: SVGSVGElement
  private state: VirtualGamepad = emptyGamepad()
  private sticks: StickState[] = []
  private sticksInitialized = false
  private buttonPointers = new Map<string, number>() // data-part → pointerId
  private customPointers = new Map<string, number>() // unmapped data-part → pointerId
  private deadzone: number
  private maxZone: number
  private onButton?: (part: string, pressed: boolean) => void
  private boundPointerDown: (e: PointerEvent) => void
  private boundPointerMove: (e: PointerEvent) => void
  private boundPointerUp: (e: PointerEvent) => void

  constructor(svgElement: SVGSVGElement, options?: TouchGamepadOptions) {
    this.svg = svgElement
    this.deadzone = options?.deadzone ?? 0.15
    this.maxZone = options?.maxZone ?? 0.85
    this.onButton = options?.onButton

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
    this.sticksInitialized = true

    for (const prefix of ['left_stick', 'right_stick']) {
      const travel = this.part(`${prefix}_travel`)
      const knob = this.part(prefix)
      if (travel == null || knob == null) continue

      const bbox = travel.getBBox()
      if (bbox.width === 0 || bbox.height === 0) continue

      this.sticks.push({
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

  private onPointerDown(e: PointerEvent) {
    const target = e.target as Element
    if (target == null) return

    // Lazy-init sticks (getBBox needs SVG in DOM)
    this.ensureSticks()

    // Check sticks first
    const stick = this.findStickForElement(target)
    if (stick != null && stick.pointerId === -1) {
      e.preventDefault()
      ;(e.target as Element).setPointerCapture(e.pointerId)
      stick.pointerId = e.pointerId

      const pt = svgPoint(this.svg, e.clientX, e.clientY)
      stick.originX = pt.x
      stick.originY = pt.y

      // Recenter the travel+knob group to the touch point
      stick.offsetX = pt.x - stick.cx
      stick.offsetY = pt.y - stick.cy
      this.updateStickVisual(stick, 0, 0)

      stick.x = 0
      stick.y = 0
      return
    }

    // Check buttons (mapped and unmapped)
    const buttonPart = this.findAnyPart(target)
    if (buttonPart != null) {
      e.preventDefault()
      ;(e.target as Element).setPointerCapture(e.pointerId)
      const field = BUTTON_MAP[buttonPart]
      if (field) {
        this.buttonPointers.set(buttonPart, e.pointerId)
        ;(this.state as any)[field] = 1
      } else {
        this.customPointers.set(buttonPart, e.pointerId)
        this.onButton?.(buttonPart, true)
      }
      this.part(buttonPart)?.classList.add('active')
    }
  }

  private onPointerMove(e: PointerEvent) {
    for (const stick of this.sticks) {
      if (stick.pointerId !== e.pointerId) continue

      const pt = svgPoint(this.svg, e.clientX, e.clientY)
      let dx = pt.x - stick.originX
      let dy = pt.y - stick.originY

      // Constrain to travel radius
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > stick.radius) {
        dx = (dx / dist) * stick.radius
        dy = (dy / dist) * stick.radius
      }

      // Normalize to -1..1 with deadzone
      const nx = dx / stick.radius
      const ny = dy / stick.radius
      stick.x = applyDeadzone(nx, this.deadzone, this.maxZone)
      stick.y = applyDeadzone(-ny, this.deadzone, this.maxZone) // Y inverted: up = positive

      this.updateStickVisual(stick, dx, dy)
      return
    }
  }

  private onPointerUp(e: PointerEvent) {
    // Release sticks
    for (const stick of this.sticks) {
      if (stick.pointerId !== e.pointerId) continue

      stick.pointerId = -1
      stick.x = 0
      stick.y = 0
      stick.offsetX = 0
      stick.offsetY = 0

      // Snap back visuals
      stick.knob.setAttribute('transform', stick.knobOriginalTransform)
      stick.travel.setAttribute('transform', '')
      return
    }

    // Release mapped buttons
    for (const [buttonPart, pid] of this.buttonPointers) {
      if (pid !== e.pointerId) continue
      this.buttonPointers.delete(buttonPart)
      const field = BUTTON_MAP[buttonPart]
      ;(this.state as any)[field] = 0
      this.part(buttonPart)?.classList.remove('active')
      return
    }

    // Release unmapped buttons
    for (const [buttonPart, pid] of this.customPointers) {
      if (pid !== e.pointerId) continue
      this.customPointers.delete(buttonPart)
      this.onButton?.(buttonPart, false)
      this.part(buttonPart)?.classList.remove('active')
      return
    }
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
    // Copy stick values into state
    if (this.sticks.length > 0) {
      this.state.leftStickX = this.sticks[0].x
      this.state.leftStickY = this.sticks[0].y
    }
    if (this.sticks.length > 1) {
      this.state.rightStickX = this.sticks[1].x
      this.state.rightStickY = this.sticks[1].y
    }
    return { ...this.state }
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
