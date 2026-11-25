/*
THE RADIAL MENU IN A SCENE: `<tosi-b3d>`'s `setDpad` and `openRadialMenu`
(the doc is radial-menu's). One per scene, ticked once a frame.

It reads the pad itself (raw, as the pad UI does), takes what it needs into
`padMenuOwns` so the game reads those controls as up, and gives them back the
moment it is done with them. Shown through the scene's modal presentation
(centred flat, ahead in a headset), without being a modal: nothing goes inert.
*/

import type { VirtualGamepad } from './virtual-gamepad.js'
import { HardwareGamepadSource, padMenuOwns } from './hardware-gamepad.js'
import { realNow } from './clock.js'
import {
  pressState,
  pressStep,
  radialPick,
  type PressState,
} from './radial-layout.js'
import {
  radialMenuSvg,
  RADIAL_SIZE,
  type RadialItem,
  type RadialMenuSvg,
} from './radial-menu.js'

export type DpadDirection = 'down' | 'left' | 'right'

export interface DpadAction {
  /** A quick press. */
  tap?: () => void
  /** What a hold opens: read each time. Empty or absent: a hold is a tap. */
  menu?: () => RadialItem[]
  /** Shown in the middle of the ring. */
  title?: string
  /** An item was picked from the ring. */
  handleSelect?: (item: RadialItem, index: number) => void
}

export interface HoldAction extends DpadAction {
  /** A keyboard key (a `KeyboardEvent.code`) that does the same. */
  key?: string
}

export interface RadialMenuOptions {
  items: RadialItem[]
  title?: string
  handleSelect?: (item: RadialItem, index: number) => void
  /** Told when it closes, picked or not. */
  handleClose?: () => void
}

/** What holds a ring open: letting go of it picks. */
export interface RadialHold {
  button?: keyof VirtualGamepad
  key?: string
}

/** What the host needs from its scene. */
export interface RadialScene {
  readonly hasInputFocus: boolean
  readonly xrActive: boolean
  /** Show an SVG over the scene; returns its close. */
  present(svg: SVGSVGElement, height: number): (() => void) | null
  /** The canvas (pointer picking, flat). */
  canvas(): HTMLCanvasElement | null
  /** The headset's RIGHT controller's gamepad, if any. */
  xrGamepads(): Gamepad[]
  rumble(name: 'tick'): void
}

const PAD_KEY: Record<DpadDirection, keyof VirtualGamepad> = {
  down: 'dpadDown',
  left: 'dpadLeft',
  right: 'dpadRight',
}
const DIR_KEY: Record<DpadDirection, string> = {
  down: 'KeyM',
  left: 'KeyJ',
  right: 'KeyK',
}
/*
WHAT AN OPEN RING HOLDS: the RIGHT stick, which points, and the buttons that
pick. The left stick stays the player's, so you can keep walking while you
choose.
*/
const OPEN_OWNS: (keyof VirtualGamepad)[] = [
  'rightStickX',
  'rightStickY',
  'buttonA',
  'buttonB',
]

interface Open {
  svg: RadialMenuSvg
  close: (() => void) | null
  opts: RadialMenuOptions
  /** What holds it open (let go to pick), or null (a click or A picks). */
  heldBy: RadialHold | null
  /** A and B must be let go of before they pick (the press that opened it). */
  armed: boolean
}

interface Hold {
  button: keyof VirtualGamepad
  action: HoldAction
  press: PressState
}

export class RadialHost {
  private holds: Hold[] = []
  private keys = new Set<string>()
  private src: HardwareGamepadSource | null = null
  private open: Open | null = null
  private pointer: { x: number; y: number } | null = null
  private offWindow: (() => void) | null = null

  constructor(private scene: RadialScene) {}

  /**
   * Give `button` a tap and, on a hold, a ring (`menu`). While set, the game
   * reads the button as up. Returns its undo.
   */
  setHold(button: keyof VirtualGamepad, action: HoldAction): () => void {
    this.holds = this.holds.filter((h) => h.button !== button)
    const hold: Hold = { button, action, press: pressState() }
    this.holds.push(hold)
    padMenuOwns.add(button)
    this.listen()
    return () => {
      if (!this.holds.includes(hold)) return
      this.holds = this.holds.filter((h) => h !== hold)
      padMenuOwns.delete(button)
    }
  }

  setDpad(dir: DpadDirection, action: DpadAction): () => void {
    if (!(dir in PAD_KEY)) {
      console.warn(
        `setDpad: '${dir}' is not down, left or right (up is the system bar's)`
      )
      return () => {}
    }
    return this.setHold(PAD_KEY[dir], { key: DIR_KEY[dir], ...action })
  }

  openMenu(opts: RadialMenuOptions, heldBy: RadialHold | null = null) {
    this.close()
    if (opts.items.length === 0) return () => {}
    this.listen()
    const svg = radialMenuSvg(opts.items, { title: opts.title })
    const open: Open = {
      svg,
      close: this.scene.present(svg, RADIAL_SIZE) ?? this.domFallback(svg),
      opts,
      heldBy,
      armed: false,
    }
    this.open = open
    for (const k of OPEN_OWNS) padMenuOwns.add(k)
    this.pointer = null
    return () => {
      if (this.open === open) this.close()
    }
  }

  /** Is a ring open? */
  get isOpen(): boolean {
    return this.open != null
  }

  /** Close the ring, picking item `pick` (-1: nothing). */
  close(pick = -1): void {
    const open = this.open
    if (open == null) return
    this.open = null
    open.close?.()
    for (const k of OPEN_OWNS)
      if (!this.holds.some((h) => h.button === k)) padMenuOwns.delete(k)
    const item = open.opts.items[pick]
    if (item != null && !item.disabled) open.opts.handleSelect?.(item, pick)
    open.opts.handleClose?.()
  }

  /** Once a frame. */
  tick(): void {
    if (!this.scene.hasInputFocus) return
    const pad = this.readPad()
    const now = realNow()
    const isDown = (h: RadialHold) =>
      (h.button != null && (pad?.[h.button] ?? 0) > 0.5) ||
      (h.key != null && this.keys.has(h.key))
    if (!this.scene.xrActive)
      for (const hold of this.holds) {
        const { action } = hold
        const ev = pressStep(
          hold.press,
          isDown({ button: hold.button, key: action.key }),
          now
        )
        if (ev === 'tap') action.tap?.()
        else if (ev === 'hold') {
          const items = action.menu?.() ?? []
          if (items.length === 0) action.tap?.()
          else
            this.openMenu(
              {
                items,
                title: action.title,
                handleSelect: action.handleSelect,
              },
              { button: hold.button, key: action.key }
            )
        }
      }
    const open = this.open
    if (open == null) return
    // Let go of what held it open: pick what is lit.
    if (open.heldBy != null && !isDown(open.heldBy))
      return this.close(open.svg.lit)
    // The right stick points (the right thumbstick in a headset); else the
    // mouse, from the middle.
    let pick = -1
    const stick = this.stick(pad)
    if (stick != null)
      pick = radialPick(stick, open.opts.items, { deadzone: 0.5 })
    if (pick < 0 && this.pointer != null)
      pick = radialPick(this.pointer, open.opts.items, { deadzone: 30 })
    // At rest the last pointed-at slice stays lit (a stick springs back).
    if (pick >= 0 && pick !== open.svg.lit) {
      open.svg.highlight(pick)
      if (open.svg.lit === pick) this.scene.rumble('tick')
    }
    // A or B picks when nothing holds it open.
    if (open.heldBy != null) return
    const press = Math.max(pad?.buttonA ?? 0, pad?.buttonB ?? 0) > 0.5
    if (!press) open.armed = true
    else if (open.armed) this.close(open.svg.lit)
  }

  dispose(): void {
    this.close()
    for (const h of this.holds) padMenuOwns.delete(h.button)
    this.holds = []
    this.offWindow?.()
    this.offWindow = null
  }

  private readPad(): VirtualGamepad | null {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return null
    this.src ??= new HardwareGamepadSource()
    return this.src.poll(true)
  }

  /** The pointing stick as a screen direction (+y down), the one pushed furthest. */
  private stick(pad: VirtualGamepad | null): { x: number; y: number } | null {
    const all: { x: number; y: number }[] = []
    if (pad != null) all.push({ x: pad.rightStickX, y: -pad.rightStickY })
    if (this.scene.xrActive)
      // xr-standard: the thumbstick is axes 2 and 3 (+y is down already).
      for (const gp of this.scene.xrGamepads())
        all.push({ x: gp.axes[2] ?? 0, y: gp.axes[3] ?? 0 })
    all.sort((a, b) => Math.hypot(b.x, b.y) - Math.hypot(a.x, a.y))
    return all[0] ?? null
  }

  private listen(): void {
    if (this.offWindow != null || typeof window === 'undefined') return
    const typing = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      return (
        t?.isContentEditable ||
        /^(INPUT|TEXTAREA|SELECT)$/.test(t?.tagName ?? '')
      )
    }
    const down = (e: KeyboardEvent) => {
      if (typing(e) || !this.scene.hasInputFocus) return
      if (this.holds.some((h) => h.action.key === e.code)) this.keys.add(e.code)
    }
    const up = (e: KeyboardEvent) => this.keys.delete(e.code)
    const move = (e: PointerEvent) => {
      if (this.open == null) return
      const c = this.scene.canvas()
      if (c == null) return
      const r = c.getBoundingClientRect()
      this.pointer = {
        x: e.clientX - (r.left + r.width / 2),
        y: e.clientY - (r.top + r.height / 2),
      }
    }
    const press = (e: PointerEvent) => {
      const open = this.open
      if (open == null || open.heldBy != null) return
      move(e)
      const at =
        this.pointer == null
          ? -1
          : radialPick(this.pointer, open.opts.items, { deadzone: 30 })
      e.stopPropagation()
      e.preventDefault()
      this.close(at)
    }
    const blur = () => this.keys.clear()
    window.addEventListener('keydown', down, true)
    window.addEventListener('keyup', up, true)
    window.addEventListener('pointermove', move, true)
    window.addEventListener('pointerdown', press, true)
    window.addEventListener('blur', blur)
    this.offWindow = () => {
      window.removeEventListener('keydown', down, true)
      window.removeEventListener('keyup', up, true)
      window.removeEventListener('pointermove', move, true)
      window.removeEventListener('pointerdown', press, true)
      window.removeEventListener('blur', blur)
    }
  }

  /** `flat-ui="dom"`: the drawing over the canvas, centred. */
  private domFallback(svg: SVGSVGElement): (() => void) | null {
    const c = this.scene.canvas()
    const host = c?.parentElement
    if (host == null) return null
    const box = document.createElement('div')
    box.style.cssText =
      'position:absolute;inset:0;display:flex;align-items:center;' +
      'justify-content:center;pointer-events:none;z-index:10'
    svg.style.width = 'min(60%, 60vh)'
    svg.style.height = 'auto'
    box.append(svg)
    host.append(box)
    return () => box.remove()
  }
}
