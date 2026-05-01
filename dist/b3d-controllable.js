/*#
# b3d-controllable

Base class for any entity that can be driven by a `ControlInput` — bipeds, cars,
helicopters, boats, etc.

Subclasses override `applyInput(input, dt)` with their specific movement model.
The base class handles the update loop: poll input → apply input.

## Key Methods

- `applyInput(input, dt)` — override with movement/animation logic
- `getCameraTarget()` — returns the node cameras should follow
- `onGainFocus()` / `onLoseFocus()` — lifecycle hooks for input switching
*/
import { AbstractMesh } from './b3d-utils';
export class B3dControllable extends AbstractMesh {
    inputProvider = null;
    inputMapping;
    lastUpdate = 0;
    sceneReady(owner, scene) {
        super.sceneReady(owner, scene);
    }
    sceneDispose() {
        this.inputProvider = null;
        super.sceneDispose();
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    applyInput(input, dt) {
        // Subclasses override this with their movement model
    }
    getCameraTarget() {
        return this.mesh ?? null;
    }
    onGainFocus() {
        this.inputProvider?.activate?.();
    }
    onLoseFocus() {
        this.inputProvider?.deactivate?.();
    }
    _update = () => {
        const now = Date.now();
        const dt = Math.min((now - this.lastUpdate) * 0.001, 0.1);
        this.lastUpdate = now;
        if (this.inputProvider == null)
            return;
        const input = this.inputProvider.poll(dt);
        this.applyInput(input, dt);
    };
}
//# sourceMappingURL=b3d-controllable.js.map