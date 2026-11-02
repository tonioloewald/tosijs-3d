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
| `lookX`,`lookY` | -1..1 | Camera look. A ground vehicle's chase camera orbits (X, springing back) and moves along an arc to almost above (Y, held); an aircraft's swings the view and springs back on release; a tank aims its turret and gun with it; on foot it turns the body (X) and holds its pitch (Y) |
| `turn` | -1..1 | Turning |
| `pitch` | -1..1 | Pitch (aircraft) |
| `throttle` | 0..1 | Continuous throttle |
| `jump` | 0..1 | Jump |
| `shoot` | 0..1 | Fire weapon |
| `sprint` | 0..1 | Sprint modifier |
| `interact` | 0..1 | Enter vehicle / pick up / use |
| `aim` | 0..1 | Aim down sights |
| `weapon` | 0..1 | Raise/lower the weapon — edge-detected by consumers, so it TOGGLES |
| `cameraZoom` | -1..1 | Camera zoom |
| `lookMode` | 0..1 | Toggle (edge-detected) what the look stick's up and down do: a tank's gun, or its camera |
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
