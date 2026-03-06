/*#
# control-input

Universal input abstraction for controllable entities. Any entity (biped, car, helicopter, etc.)
consumes a `ControlInput`, and any input source (keyboard, gamepad, XR controllers, AI) produces one.

## ControlInput

| Field | Range | Purpose |
|-------|-------|---------|
| `forward` | -1..1 | Forward/backward movement |
| `strafe` | -1..1 | Left/right strafe |
| `turn` | -1..1 | Turning |
| `pitch` | -1..1 | Pitch (aircraft) |
| `throttle` | 0..1 | Continuous throttle |
| `jump` | 0..1 | Jump |
| `shoot` | 0..1 | Fire weapon |
| `sprint` | 0..1 | Sprint modifier |
| `interact` | 0..1 | Enter vehicle / pick up / use |
| `aim` | 0..1 | Aim down sights |
| `cameraZoom` | -1..1 | Camera zoom |
| `sneak` | 0\|1 | Sneak toggle |

## InputProvider

Any input source implements `InputProvider`:

    interface InputProvider {
      poll(deltaTime: number): ControlInput
      activate?(): void
      deactivate?(): void
    }

## CompositeInputProvider

Merges multiple providers (e.g. keyboard + XR sticks). Axes use max-abs (preserves sign),
buttons use max.
*/

export interface ControlInput {
  forward: number // -1..1
  strafe: number // -1..1
  turn: number // -1..1
  pitch: number // -1..1 (aircraft)
  throttle: number // 0..1 (continuous throttle)
  jump: number // 0..1
  shoot: number // 0..1
  sprint: number // 0..1
  interact: number // 0..1 (enter vehicle / pick up / use)
  aim: number // 0..1
  cameraZoom: number // -1..1 (negative = zoom in, positive = zoom out)
  sneak: number // 0|1
}

export interface InputProvider {
  poll(deltaTime: number): ControlInput
  activate?(): void
  deactivate?(): void
}

export function emptyInput(): ControlInput {
  return {
    forward: 0,
    strafe: 0,
    turn: 0,
    pitch: 0,
    throttle: 0,
    jump: 0,
    shoot: 0,
    sprint: 0,
    interact: 0,
    aim: 0,
    cameraZoom: 0,
    sneak: 0,
  }
}

export class CompositeInputProvider implements InputProvider {
  providers: InputProvider[] = []

  constructor(...providers: InputProvider[]) {
    this.providers = providers
  }

  add(provider: InputProvider) {
    this.providers.push(provider)
  }

  remove(provider: InputProvider) {
    const idx = this.providers.indexOf(provider)
    if (idx > -1) this.providers.splice(idx, 1)
  }

  activate() {
    for (const p of this.providers) p.activate?.()
  }

  deactivate() {
    for (const p of this.providers) p.deactivate?.()
  }

  poll(deltaTime: number): ControlInput {
    const result = emptyInput()
    for (const provider of this.providers) {
      const input = provider.poll(deltaTime)
      // Axes: max-abs (preserve sign of whichever is larger)
      result.forward = maxAbs(result.forward, input.forward)
      result.strafe = maxAbs(result.strafe, input.strafe)
      result.turn = maxAbs(result.turn, input.turn)
      result.pitch = maxAbs(result.pitch, input.pitch)
      result.cameraZoom = maxAbs(result.cameraZoom, input.cameraZoom)
      // Buttons/throttle: max
      result.throttle = Math.max(result.throttle, input.throttle)
      result.jump = Math.max(result.jump, input.jump)
      result.shoot = Math.max(result.shoot, input.shoot)
      result.sprint = Math.max(result.sprint, input.sprint)
      result.interact = Math.max(result.interact, input.interact)
      result.aim = Math.max(result.aim, input.aim)
      result.sneak = Math.max(result.sneak, input.sneak)
    }
    return result
  }
}

function maxAbs(a: number, b: number): number {
  return Math.abs(a) >= Math.abs(b) ? a : b
}
