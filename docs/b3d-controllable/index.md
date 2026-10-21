# b3d-controllable

Base class for any entity that can be driven by a `ControlInput` — bipeds, cars,
helicopters, boats, etc.

Subclasses override `applyInput(input, dt)` with their specific movement model.
The base class handles the update loop: poll input → apply input.

## Example

The base class is abstract — you subclass it. A minimal one that yaws to the throttle
(real subclasses — [b3d-biped](/b3d-biped/), [b3d-car](/b3d-car/),
[b3d-aircraft](/b3d-aircraft/) — put a full movement model here):

```javascript
import { B3dControllable } from 'tosijs-3d'

class Spinner extends B3dControllable {
  applyInput(input, dt) {
    // input is a ControlInput; act on the fields this entity cares about.
    // `ry` is its yaw in degrees (from AbstractMesh), applied to its mesh.
    this.ry += input.throttle * dt * 180
  }
}
```

## Key Methods

- `applyInput(input, dt)` — override with movement/animation logic
- `getCameraTarget()` — returns the node cameras should follow
- `handleGainFocus()` / `handleLoseFocus()` — lifecycle hooks for input switching
