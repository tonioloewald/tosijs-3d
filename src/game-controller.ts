/*#
# game-controller

Input component that maps keyboard/mouse to a virtual gamepad and optionally
merges with a hardware gamepad. Produces `ControlInput` via an `InputMapping`.

Keyboard/mouse listening is built-in. For standalone keyboard-only or
hardware-only sources, see `KeyboardGamepadSource` and `HardwareGamepadSource`.

## Default Key Map

| VirtualGamepad | Keys |
|----------------|------|
| leftStick Y | W (+) / S (-) |
| leftStick X | D (+) / A (-) |
| rightStick X | ArrowRight (+) / ArrowLeft (-) |
| buttonA | Space |
| buttonB | F |
| buttonX | E |
| leftBumper | ShiftLeft |
| leftTrigger | Q |
| rightTrigger | R |
| dpadDown | G (toggle) |

Mouse wheel adjusts rightStick Y (for camera zoom).

## Usage

```javascript
import { gameController, b3dBiped, inputFocus, b3d } from 'tosijs-3d'

document.body.append(
  b3d({},
    inputFocus(
      gameController(),
      b3dBiped({ url: '/model.glb', player: true, cameraType: 'follow' })
    )
  )
)
```

## InputProvider

Call `getInputProvider(mapping?)` to get a `MappedInputProvider`. Default mapping is `bipedMapping`.
*/
/*{ "parent": "Input" }*/

import { Component } from 'tosijs'
import type {
  VirtualGamepad,
  GamepadSource,
  InputMapping,
} from './virtual-gamepad.js'
import {
  emptyGamepad,
  MappedInputProvider,
  bipedMapping,
} from './virtual-gamepad.js'
import { HardwareGamepadSource } from './hardware-gamepad.js'

function keycode(evt: KeyboardEvent): string {
  return evt.code.replace(/Key|Digit/, '')
}

function clamp(min: number, x: number, max: number): number {
  return x < min ? min : x > max ? max : x
}

type AxisDef = {
  field: keyof VirtualGamepad
  positiveKeys: string[]
  negativeKeys: string[]
  attack: number
  decay: number
}

type ButtonDef = {
  field: keyof VirtualGamepad
  keys: string[]
  attack: number
  decay: number
  type?: 'toggle'
}

const DEFAULT_AXES: AxisDef[] = [
  {
    field: 'leftStickY',
    positiveKeys: ['W'],
    negativeKeys: ['S'],
    attack: 2,
    decay: 5,
  },
  {
    field: 'leftStickX',
    positiveKeys: ['D'],
    negativeKeys: ['A'],
    attack: 2,
    decay: 5,
  },
  {
    field: 'rightStickX',
    positiveKeys: ['ArrowRight'],
    negativeKeys: ['ArrowLeft'],
    attack: 2,
    decay: 5,
  },
  /*
  LOOK UP AND DOWN, which this source simply did not have.

  There were three axes here and the right stick's Y was taken by the mouse
  WHEEL instead, so on a keyboard there was no way to pitch the view at all —
  and since aim follows the view, no way to aim at anything above or below the
  horizon. Tonio: "I can't aim with q... when I fire it just fires into my feet."

  `keyboard-gamepad.ts` already carries the fix and the reasoning ("the stick
  became LOOK, and the wheel came along with it"), which it learned from
  swimming being "horribly broken" because a scroll tipped the swimmer. This
  module is the one `inputFocus` builds by default, so it was the one that
  mattered and the one nobody had revisited.
  */
  {
    field: 'rightStickY',
    positiveKeys: ['ArrowUp'],
    negativeKeys: ['ArrowDown'],
    attack: 2,
    decay: 5,
  },
]

// Mouse buttons map to the three "fire" pad buttons via pseudo-keycodes (added to
// `pressedKeys` on a canvas click): LEFT = primary (buttonA), RIGHT = secondary
// (buttonB), MIDDLE = tertiary (rightBumper) — matching A / B / right-bumper.
const DEFAULT_BUTTONS: ButtonDef[] = [
  { field: 'buttonA', keys: ['Space', 'Mouse0'], attack: 5, decay: 10 },
  { field: 'buttonB', keys: ['F', 'Mouse2'], attack: 5, decay: 10 },
  { field: 'buttonX', keys: ['E'], attack: 5, decay: 10 },
  { field: 'leftBumper', keys: ['ShiftLeft'], attack: 5, decay: 10 },
  {
    field: 'rightBumper',
    keys: ['ShiftRight', 'Mouse1'],
    attack: 5,
    decay: 10,
  },
  { field: 'leftTrigger', keys: ['Q'], attack: 5, decay: 10 },
  { field: 'rightTrigger', keys: ['R'], attack: 5, decay: 10 },
  { field: 'dpadDown', keys: ['G'], attack: 5, decay: 10, type: 'toggle' },
]

export class GameController extends Component implements GamepadSource {
  static preferredTagName = 'tosi-game-controller'

  static initAttributes = {
    wheelSensitivity: 1,
    updateIntervalMs: 33,
    /**
     * How the mouse looks around: `'drag'`, `'lock'` or `'off'`.
     *
     * `'drag'` is the default because the danger with mouse look is not mouse
     * look, it is CAPTURE: a page that grabs the pointer is a page you cannot
     * use, and these demos live in a document alongside a scrollbar, a sidebar
     * and nine other demos. Holding a button to look is unmodal, needs no
     * escape hatch, and cannot strand anybody.
     *
     * `'lock'` is the right default for a real game and is one attribute away.
     */
    /*
    OFF while the rest of the aiming chain is being sorted out. Tonio: "We might
    want to toggle off mouse look until we have everything else working" — which
    is right, because it is one more thing moving the view while we are trying
    to find out why the view and the shot disagree. `'drag'` is the intended
    default once they agree.
    */
    mouseLook: 'off' as 'drag' | 'lock' | 'off',
    /** Degrees of view per 100px of mouse movement, roughly. */
    mouseSensitivity: 1,
  }
  declare mouseLook: 'drag' | 'lock' | 'off'
  declare mouseSensitivity: number
  /** Accumulated mouse movement since the last poll, and the time it took. */
  private _lookDx = 0
  private _lookDy = 0
  private _lookAt = 0
  private _lastPoll = 0
  private _dragging = false

  hardwareSource = new HardwareGamepadSource()
  private provider: MappedInputProvider | null = null

  private axes = DEFAULT_AXES
  private buttons = DEFAULT_BUTTONS
  private pressedKeys = new Set<string>()
  private axisState: Record<string, number> = {}
  private buttonState: Record<string, number> = {}
  private wheelAccum = 0
  private interval = 0
  private lastUpdate = 0

  /** Poll keyboard/mouse state as a VirtualGamepad. */
  poll(): VirtualGamepad {
    const pad = emptyGamepad()
    for (const axis of this.axes) {
      pad[axis.field] = this.axisState[axis.field] ?? 0
    }
    for (const btn of this.buttons) {
      ;(pad as any)[btn.field] = this.buttonState[btn.field] ?? 0
    }
    /*
    THE WHEEL IS ZOOM, not look — the d-pad axis, exactly as
    `keyboard-gamepad.ts` already does it.

    It used to write `rightStickY` directly, which was right while the right
    stick WAS zoom and became a trap when the stick turned into look: scrolling
    a page pitched the character's view, and there is nowhere less likely to be
    searched for that than the mouse wheel. Merged by magnitude so keys and
    wheel both work.
    */
    const wheel = clamp(-1, this.wheelAccum, 1)
    if (wheel > Math.abs(pad.dpadUp)) pad.dpadUp = wheel
    else if (-wheel > Math.abs(pad.dpadDown)) pad.dpadDown = -wheel
    this.wheelAccum *= 0.8
    /*
    MOUSE LOOK, fed in as a RATE rather than a position.

    A stick is a position you hold — full deflection turns forever. A mouse is a
    delta: move it and the view moves, stop and it stops. Feeding the delta in
    as a stick value gets that right for free, because it returns to zero the
    moment the mouse stops, which is what look should do. Divided by `dt` so a
    given hand movement turns the same amount however fast the frames come.

    `mouseLook` chooses how the mouse is CAPTURED, which is where the UX danger
    actually is:
    - `drag` (default) — hold a button to look. No capture, nothing modal,
      cannot eat the scrollbar on a page that has ten demos on it.
    - `lock` — pointer lock, click to enter and Escape to leave. The real
      first-person feel, and the wrong default for something embedded in a
      document.
    - `off` — keys only.
    */
    /*
    SCALED BY THE FRAME, not by the gap between mouse events.

    The consumer integrates `lookY * lookRate * dt`, so to turn a fixed number
    of PIXELS into a fixed number of DEGREES the stick value has to be divided
    by that same `dt` — pixels this frame ÷ how long the frame was. `poll()` is
    called once per frame by the consumer, so the interval between polls IS
    that frame, and it is the only clock here that measures the right thing.

    The first attempt divided by the time between mouse MOVES instead, which is
    a different and mostly meaningless quantity: it made a fast flick weak and a
    slow drag strong, and after a pause it produced almost nothing at all (a
    stale 15.8s gap scaled a full-strength movement down to 0.002, which is how
    this was found).
    */
    const now = Date.now()
    const frameDt = this._lastPoll > 0 ? (now - this._lastPoll) / 1000 : 1 / 60
    this._lastPoll = now
    if (this._lookDx !== 0 || this._lookDy !== 0) {
      // Degrees per pixel, against a nominal 120°/s look rate. `mouseSensitivity`
      // is the dial; the 0.15 is a middle-of-the-road starting point.
      const perPixel = (0.15 * this.mouseSensitivity) / 120
      const k = 1 / Math.max(1 / 240, Math.min(0.25, frameDt))
      const sx = clamp(-1, this._lookDx * perPixel * k, 1)
      const sy = clamp(-1, -this._lookDy * perPixel * k, 1)
      if (Math.abs(sx) > Math.abs(pad.rightStickX)) pad.rightStickX = sx
      if (Math.abs(sy) > Math.abs(pad.rightStickY)) pad.rightStickY = sy
      this._lookDx = 0
      this._lookDy = 0
    }
    return pad
  }

  /** Returns a MappedInputProvider that merges keyboard + hardware gamepad. */
  getInputProvider(mapping?: InputMapping): MappedInputProvider {
    if (!this.provider) {
      this.provider = new MappedInputProvider(
        mapping ?? bipedMapping,
        this,
        this.hardwareSource
      )
    } else if (mapping) {
      this.provider.setMapping(mapping)
    }
    return this.provider
  }

  private _handleKeyDown = (event: KeyboardEvent) => {
    this.pressedKeys.add(keycode(event))
    for (const btn of this.buttons) {
      if (btn.type !== 'toggle') continue
      if (btn.keys.some((k) => k === keycode(event))) {
        this.buttonState[btn.field] = 1 - (this.buttonState[btn.field] ?? 0)
      }
    }
  }

  private _handleKeyUp = (event: KeyboardEvent) => {
    this.pressedKeys.delete(keycode(event))
  }

  private _handleWheel = (event: WheelEvent) => {
    this.wheelAccum = clamp(
      -1,
      this.wheelAccum + event.deltaY * (this as any).wheelSensitivity * 0.01,
      1
    )
  }

  // Mouse fire buttons — pressed only when the click STARTS on a scene canvas, so
  // clicking UI (gear, panels, glass gamepad, doc links) never fires. Release is
  // ungated so dragging off the canvas can't stick a button on. Middle/right also
  // preventDefault (autoscroll / context menu).
  /**
   * The element actually under the pointer — NOT `event.target`.
   *
   * `<tosi-b3d>` renders its canvas inside a shadow root, and the DOM retargets
   * an event crossing that boundary: a listener on `window` is told the target
   * is `TOSI-B3D`, because that is the outermost node in the tree it can see.
   * So `event.target instanceof HTMLCanvasElement` is not merely unreliable
   * here, it is ALWAYS FALSE — which quietly disabled every mouse button on the
   * scene, the context-menu suppression that lets right-click be secondary
   * fire, and (when it was added) mouse look.
   *
   * `composedPath()[0]` is the node the event really started on, retargeting or
   * not, and it is what all three of those tests should always have used.
   */
  private _hitCanvas(event: Event): HTMLCanvasElement | null {
    const first = event.composedPath?.()[0]
    return first instanceof HTMLCanvasElement ? first : null
  }

  private _handleMouseDown = (event: MouseEvent) => {
    const canvas = this._hitCanvas(event)
    if (canvas == null) return
    this.pressedKeys.add('Mouse' + event.button)
    if (event.button !== 0) event.preventDefault()
    /*
    ON THE CANVAS ONLY, which is the whole safety property.

    Both modes start from a press that landed on the scene, so nothing about
    the surrounding page changes behaviour: the scrollbar still scrolls, links
    still click, and a reader who never touches a demo never notices any of
    this exists.

    Lock is requested rather than assumed, and the browser will refuse it
    outside a user gesture — which is exactly the guarantee wanted here.
    */
    if (this.mouseLook === 'drag') {
      this._dragging = true
      this._lookAt = 0
    } else if (this.mouseLook === 'lock' && document.pointerLockElement == null) {
      void canvas.requestPointerLock?.()
    }
  }

  private _handleMouseUp = (event: MouseEvent) => {
    this.pressedKeys.delete('Mouse' + event.button)
    if (this._dragging) {
      this._dragging = false
      // Drop whatever was in flight, or the view coasts on after you let go.
      this._lookDx = 0
      this._lookDy = 0
    }
  }

  private _handleContextMenu = (event: MouseEvent) => {
    // Suppress the browser menu so right-click can be "secondary fire" over the
    // scene. `_hitCanvas`, not `event.target` — see the note there.
    if (this._hitCanvas(event) != null) event.preventDefault()
  }

  private _updateSmoothing = () => {
    const now = Date.now()
    const dt = (now - this.lastUpdate) * 0.001
    this.lastUpdate = now

    for (const axis of this.axes) {
      const posPressed = axis.positiveKeys.some((k) => this.pressedKeys.has(k))
      const negPressed = axis.negativeKeys.some((k) => this.pressedKeys.has(k))

      let target = 0
      if (posPressed && !negPressed) target = 1
      else if (negPressed && !posPressed) target = -1

      const current = this.axisState[axis.field] ?? 0
      if (
        Math.abs(target) > Math.abs(current) ||
        Math.sign(target) !== Math.sign(current)
      ) {
        const step = axis.attack * dt
        if (Math.abs(target - current) < step) {
          this.axisState[axis.field] = target
        } else {
          this.axisState[axis.field] =
            current + Math.sign(target - current) * step
        }
      } else {
        const step = axis.decay * dt
        if (Math.abs(target - current) < step) {
          this.axisState[axis.field] = target
        } else {
          this.axisState[axis.field] =
            current + Math.sign(target - current) * step
        }
      }
    }

    for (const btn of this.buttons) {
      if (btn.type === 'toggle') continue
      const pressed = btn.keys.some((k) => this.pressedKeys.has(k))
      const current = this.buttonState[btn.field] ?? 0
      if (pressed) {
        this.buttonState[btn.field] = Math.min(1, current + btn.attack * dt)
      } else {
        this.buttonState[btn.field] = Math.max(0, current - btn.decay * dt)
      }
    }
  }

  /**
   * Movement in, as a delta. `movementX/Y` rather than client coordinates,
   * because under pointer lock there are no client coordinates to speak of and
   * a delta is what both modes have in common.
   */
  private _handleMouseMove = (event: MouseEvent): void => {
    const mode = this.mouseLook
    if (mode === 'off') return
    const locked = document.pointerLockElement != null
    if (mode === 'lock' ? !locked : !this._dragging) return
    const k = this.mouseSensitivity
    this._lookDx += event.movementX * k
    this._lookDy += event.movementY * k
  }

  /**
   * Losing the lock must STOP the view, not leave it coasting.
   *
   * Escape releases pointer lock and the browser does not send a final
   * `mousemove`, so whatever delta was in flight would be the last thing the
   * mapping saw — a character left slowly spinning after you tried to get out.
   */
  private _handleLockChange = (): void => {
    if (document.pointerLockElement == null) {
      this._lookDx = 0
      this._lookDy = 0
      this._dragging = false
    }
  }

  connectedCallback() {
    super.connectedCallback()
    this.pressedKeys = new Set()
    this.axisState = {}
    this.buttonState = {}
    this.lastUpdate = Date.now()
    this.interval = window.setInterval(
      this._updateSmoothing,
      (this as any).updateIntervalMs
    )
    window.addEventListener('keydown', this._handleKeyDown)
    window.addEventListener('keyup', this._handleKeyUp)
    window.addEventListener('wheel', this._handleWheel, { passive: false })
    window.addEventListener('mousedown', this._handleMouseDown)
    window.addEventListener('mouseup', this._handleMouseUp)
    window.addEventListener('contextmenu', this._handleContextMenu)
    window.addEventListener('mousemove', this._handleMouseMove)
    document.addEventListener('pointerlockchange', this._handleLockChange)
  }

  disconnectedCallback() {
    clearInterval(this.interval)
    this.interval = 0
    window.removeEventListener('keydown', this._handleKeyDown)
    window.removeEventListener('keyup', this._handleKeyUp)
    window.removeEventListener('wheel', this._handleWheel)
    window.removeEventListener('mousedown', this._handleMouseDown)
    window.removeEventListener('mouseup', this._handleMouseUp)
    window.removeEventListener('contextmenu', this._handleContextMenu)
    window.removeEventListener('mousemove', this._handleMouseMove)
    document.removeEventListener('pointerlockchange', this._handleLockChange)
    super.disconnectedCallback()
  }
}

export const gameController = GameController.elementCreator()
