/*#
# control-input

Universal input abstraction for controllable entities. Any entity (biped, car, helicopter, etc.)
consumes a `ControlInput`, and any input source (keyboard, gamepad, XR controllers, AI) produces one.

## Example

A `ControlInput` is just a plain per-frame snapshot — a source produces one, a controllable
consumes one, and that indirection is why swapping keyboard for gamepad for AI is a new *source*,
not a rewrite. Start from `emptyInput()` and set what a source drives:

```javascript
import { emptyInput } from 'tosijs-3d'

// an AI "source" this frame: walk forward, veer left, and fire
const input = { ...emptyInput(), forward: 1, turn: -0.5, shoot: 1 }
```

## ControlInput

| Field | Range | Purpose |
|-------|-------|---------|
| `forward` | -1..1 | Forward/backward movement |
| `strafe` | -1..1 | Left/right strafe |
| `lookX`,`lookY` | -1..1 | Camera look — swings the view, springs back on release |
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
/*{ "parent": "Input" }*/
export function emptyInput() {
    return {
        forward: 0,
        strafe: 0,
        lookX: 0,
        lookY: 0,
        turn: 0,
        pitch: 0,
        throttle: 0,
        lift: 0,
        jump: 0,
        shoot: 0,
        sprint: 0,
        interact: 0,
        aim: 0,
        cameraZoom: 0,
        sneak: 0,
        view: 0,
        cameraPeek: 0,
    };
}
export class CompositeInputProvider {
    providers = [];
    constructor(...providers) {
        this.providers = providers;
    }
    add(provider) {
        this.providers.push(provider);
    }
    remove(provider) {
        const idx = this.providers.indexOf(provider);
        if (idx > -1)
            this.providers.splice(idx, 1);
    }
    activate() {
        for (const p of this.providers)
            p.activate?.();
    }
    deactivate() {
        for (const p of this.providers)
            p.deactivate?.();
    }
    poll(deltaTime) {
        const result = emptyInput();
        for (const provider of this.providers) {
            const input = provider.poll(deltaTime);
            // Axes: max-abs (preserve sign of whichever is larger)
            result.forward = maxAbs(result.forward, input.forward);
            result.strafe = maxAbs(result.strafe, input.strafe);
            result.lookX = maxAbs(result.lookX, input.lookX);
            result.lookY = maxAbs(result.lookY, input.lookY);
            result.turn = maxAbs(result.turn, input.turn);
            result.pitch = maxAbs(result.pitch, input.pitch);
            result.lift = maxAbs(result.lift, input.lift);
            result.cameraZoom = maxAbs(result.cameraZoom, input.cameraZoom);
            // Buttons/throttle: max
            result.throttle = Math.max(result.throttle, input.throttle);
            result.jump = Math.max(result.jump, input.jump);
            result.shoot = Math.max(result.shoot, input.shoot);
            result.sprint = Math.max(result.sprint, input.sprint);
            result.interact = Math.max(result.interact, input.interact);
            result.aim = Math.max(result.aim, input.aim);
            result.sneak = Math.max(result.sneak, input.sneak);
            result.view = Math.max(result.view, input.view);
            result.cameraPeek = maxAbs(result.cameraPeek, input.cameraPeek);
        }
        return result;
    }
}
function maxAbs(a, b) {
    return Math.abs(a) >= Math.abs(b) ? a : b;
}
//# sourceMappingURL=control-input.js.map