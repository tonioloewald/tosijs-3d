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

export interface RadialMenuOptions {
  items: RadialItem[]
  title?: string
  handleSelect?: (item: RadialItem, index: number) => void
  /** Told when it closes, picked or not. */
  handleClose?: () => void
}

/** What the host needs from its scene. */
export interface RadialScene {
  readonly hasInputFocus: boolean
  readonly xrActive: boolean
  /** Show an SVG over the scene; returns its close. */
  present(svg: SVGSVGElement, height: number): (() => void) | null
  /** The canvas (pointer picking, flat). */
  canvas(): HTMLCanvasElement | null
  /** The headset's controllers' gamepads, if any. */
  xrGamepads(): Gamepad[]
  rumble(name: 'tick'): void
}

const PAD_KEY: Record<DpadDirection, keyof VirtualGamepad> = {
  down: 'dpadDown',
  left: 'dpadLeft',
  right: 'dpadRight',
}
const KEY_DIR: Record<string, DpadDirection> = {
  KeyM: 'down',
  KeyJ: 'left',
  KeyK: 'right',
}
/** What an open ring holds: both sticks and the buttons that pick or cancel. */
const OPEN_OWNS: (keyof VirtualGamepad)[] = [
  'leftStickX',
  'leftStickY',
  'rightStickX',
  'rightStickY',
  'buttonA',
  'buttonB',
]

interface Open {
  svg: RadialMenuSvg
  close: (() => void) | null
  opts: RadialMenuOptions
  /** Held open by this D-pad direction (let go to pick), or null (click or A to pick). */
  heldBy: DpadDirection | null
  /** A and B must be let go of before they pick (the press that opened it). */
  armed: boolean
}

export class RadialHost {
  private actions = new Map<DpadDirection, DpadAction>()
  private presses: Record<DpadDirection, PressState> = {
    down: pressState(),
    left: pressState(),
    right: pressState(),
  }
  private keys = new Set<DpadDirection>()
  private src: HardwareGamepadSource | null = null
  private open: Open | null = null
  private pointer: { x: number; y: number } | null = null
  private offWindow: (() => void) | null = null

  constructor(private scene: RadialScene) {}

  setDpad(dir: DpadDirection, action: DpadAction): () => void {
    if (!(dir in PAD_KEY)) {
      console.warn(
        `setDpad: '${dir}' is not down, left or right (up is the system bar's)`
      )
      return () => {}
    }
    this.actions.set(dir, action)
    padMenuOwns.add(PAD_KEY[dir])
    this.listen()
    return () => {
      if (this.actions.get(dir) !== action) return
      this.actions.delete(dir)
      padMenuOwns.delete(PAD_KEY[dir])
    }
  }

  openMenu(opts: RadialMenuOptions, heldBy: DpadDirection | null = null) {
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

  /** Close the ring without picking. */
  close(pick = -1): void {
    const open = this.open
    if (open == null) return
    this.open = null
    open.close?.()
    for (const k of OPEN_OWNS) padMenuOwns.delete(k)
    const item = open.opts.items[pick]
    if (item != null && !item.disabled) open.opts.handleSelect?.(item, pick)
    open.opts.handleClose?.()
  }

  /** Once a frame. */
  tick(): void {
    if (!this.scene.hasInputFocus) return
    const pad = this.readPad()
    const now = realNow()
    if (!this.scene.xrActive)
      for (const dir of Object.keys(PAD_KEY) as DpadDirection[]) {
        const action = this.actions.get(dir)
        const down = (pad?.[PAD_KEY[dir]] ?? 0) > 0.5 || this.keys.has(dir)
        const ev = pressStep(this.presses[dir], down, now)
        if (action == null) continue
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
              dir
            )
        } else if (ev === 'release' && this.open?.heldBy === dir)
          this.close(this.open.svg.lit)
      }
    const open = this.open
    if (open == null) return
    const n = open.opts.items.length
    // The stick pushed furthest points; else the mouse, from the middle.
    let pick = -1
    const sticks = this.sticks(pad)
    const best = sticks.sort(
      (a, b) => Math.hypot(b.x, b.y) - Math.hypot(a.x, a.y)
    )[0]
    if (best != null) pick = radialPick(best, n, { deadzone: 0.5 })
    if (pick < 0 && this.pointer != null)
      pick = radialPick(this.pointer, n, { deadzone: 30 })
    // At rest the last pointed-at slice stays lit (a stick springs back).
    if (pick >= 0 && pick !== open.svg.lit) {
      open.svg.highlight(pick)
      if (open.svg.lit === pick) this.scene.rumble('tick')
    }
    // A or B: pick (not when held open by the D-pad: letting go picks there).
    const press = Math.max(pad?.buttonA ?? 0, pad?.buttonB ?? 0) > 0.5
    if (!press) open.armed = true
    else if (open.armed && open.heldBy == null) this.close(open.svg.lit)
  }

  dispose(): void {
    this.close()
    for (const dir of this.actions.keys()) padMenuOwns.delete(PAD_KEY[dir])
    this.actions.clear()
    this.offWindow?.()
    this.offWindow = null
  }

  private readPad(): VirtualGamepad | null {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return null
    this.src ??= new HardwareGamepadSource()
    return this.src.poll(true)
  }

  /** Each stick as a screen direction (+y down). */
  private sticks(pad: VirtualGamepad | null): { x: number; y: number }[] {
    const out: { x: number; y: number }[] = []
    if (pad != null) {
      out.push({ x: pad.leftStickX, y: -pad.leftStickY })
      out.push({ x: pad.rightStickX, y: -pad.rightStickY })
    }
    if (this.scene.xrActive)
      for (const gp of this.scene.xrGamepads()) {
        // xr-standard: the thumbstick is axes 2 and 3 (+y is down already).
        const x = gp.axes[2] ?? 0
        const y = gp.axes[3] ?? 0
        out.push({ x, y })
      }
    return out
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
      const dir = KEY_DIR[e.code]
      if (dir == null || typing(e) || !this.actions.has(dir)) return
      if (!this.scene.hasInputFocus) return
      this.keys.add(dir)
    }
    const up = (e: KeyboardEvent) => {
      const dir = KEY_DIR[e.code]
      if (dir != null) this.keys.delete(dir)
    }
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
      const n = open.opts.items.length
      const at =
        this.pointer == null
          ? -1
          : radialPick(this.pointer, n, { deadzone: 30 })
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
