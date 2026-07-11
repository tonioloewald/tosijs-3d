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
/*{ "parent": "Input" }*/
import { AbstractMesh } from './b3d-utils';
import { emptyInput } from './control-input';
export class B3dControllable extends AbstractMesh {
    inputProvider = null;
    inputMapping;
    /** Last polled input — read by the XR rig for camera zoom/peek intent. */
    lastInput = null;
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
        // Scene input focus: when a page hosts multiple demos, only the active (last
        // hovered/clicked) scene consumes the shared keyboard/gamepad — an unfocused
        // scene sees neutral input so it idles instead of being driven in the background.
        const focused = this.owner?.hasInputFocus ?? true;
        const input = focused ? this.inputProvider.poll(dt) : emptyInput();
        this.lastInput = input;
        this.applyInput(input, dt);
    };
}
//# sourceMappingURL=b3d-controllable.js.map