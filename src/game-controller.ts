import { Component } from 'tosijs'

function clamp(min: number, x: number, max: number): number {
  return x < min ? min : x > max ? max : x
}

function keycode(evt: KeyboardEvent): string {
  return evt.code.replace(/Key|Digit/, '')
}

type ControlSpec = {
  name: string
  attack?: number
  decay?: number
  buttons?: number[]
  keys?: string[]
  type?: string
}

class Control {
  name: string
  attack: number
  decay: number
  buttons: number[]
  keys: string[]
  type?: string

  constructor(spec: ControlSpec) {
    this.name = spec.name
    this.attack = spec.attack ?? 5
    this.decay = spec.decay ?? 10
    this.buttons = spec.buttons ?? []
    this.keys = spec.keys ?? []
    this.type = spec.type
  }

  static buildList(...specList: ControlSpec[]): Control[] {
    return specList.map((spec) => new Control(spec))
  }
}

export class GameController extends Component {
  static initAttributes = {
    wheel: 0.5,
    wheelSensitivity: 1,
    updateIntervalMs: 33,
  }

  controls: Control[] = Control.buildList(
    { name: 'forward', keys: ['W', 'ArrowUp'], attack: 2, decay: 5 },
    { name: 'backward', keys: ['S', 'ArrowDown'], attack: 2, decay: 5 },
    { name: 'left', keys: ['A', 'ArrowLeft'], attack: 2, decay: 5 },
    { name: 'right', keys: ['D', 'ArrowRight'], attack: 2, decay: 5 },
    { name: 'jump', keys: ['Space'] },
    { name: 'shoot', keys: ['F'] },
    { name: 'sneak', keys: ['G'], type: 'toggle' },
    { name: 'sprint', keys: ['ShiftLeft'] }
  )

  state: { [key: string]: number } = {}
  pressedKeys = new Set<string>()
  pressedButtons = new Set<number>()
  private interval = 0
  private lastUpdate = 0

  private _handleKeyDown = (event: KeyboardEvent) => {
    this.pressedKeys.add(keycode(event))
    this.updateToggles()
  }

  private _handleKeyUp = (event: KeyboardEvent) => {
    this.pressedKeys.delete(keycode(event))
  }

  private _handleMouseDown = (event: MouseEvent) => {
    this.pressedButtons.add(event.button)
    this.updateToggles()
  }

  private _handleMouseUp = (event: MouseEvent) => {
    this.pressedButtons.delete(event.button)
  }

  private _handleWheel = (event: WheelEvent) => {
    const attrs = this as any
    attrs.wheel = clamp(
      0,
      attrs.wheel + event.deltaY * attrs.wheelSensitivity * 0.01,
      1
    )
  }

  private updateToggles() {
    for (const control of this.controls.filter((c) => c.type === 'toggle')) {
      if (
        control.keys.some((key) => this.pressedKeys.has(key)) ||
        control.buttons.some((button) => this.pressedButtons.has(button))
      ) {
        this.state[control.name] = 1 - this.state[control.name]
      }
    }
  }

  private updateAxes = () => {
    const now = Date.now()
    const interval = (now - this.lastUpdate) * 0.001
    for (const control of this.controls.filter((c) => c.type !== 'toggle')) {
      if (
        control.keys.some((key) => this.pressedKeys.has(key)) ||
        control.buttons.some((button) => this.pressedButtons.has(button))
      ) {
        this.state[control.name] = Math.min(
          1,
          this.state[control.name] + control.attack * interval
        )
      } else {
        this.state[control.name] = Math.max(
          0,
          this.state[control.name] - control.decay * interval
        )
      }
    }
    this.lastUpdate = now
  }

  connectedCallback() {
    super.connectedCallback()
    this.pressedKeys = new Set()
    this.pressedButtons = new Set()
    for (const control of this.controls) {
      this.state[control.name] = 0
    }
    this.lastUpdate = Date.now()
    this.interval = window.setInterval(
      this.updateAxes,
      (this as any).updateIntervalMs
    )
    document.body.addEventListener('keydown', this._handleKeyDown)
    document.body.addEventListener('keyup', this._handleKeyUp)
    document.body.addEventListener('mousedown', this._handleMouseDown)
    document.body.addEventListener('mouseup', this._handleMouseUp)
    document.body.addEventListener('wheel', this._handleWheel, {
      passive: false,
    })
  }

  disconnectedCallback() {
    clearInterval(this.interval)
    this.interval = 0
    document.body.removeEventListener('keydown', this._handleKeyDown)
    document.body.removeEventListener('keyup', this._handleKeyUp)
    document.body.removeEventListener('mousedown', this._handleMouseDown)
    document.body.removeEventListener('mouseup', this._handleMouseUp)
    document.body.removeEventListener('wheel', this._handleWheel)
    super.disconnectedCallback()
  }
}

export const gameController = GameController.elementCreator({
  tag: 'tosi-game-controller',
})
