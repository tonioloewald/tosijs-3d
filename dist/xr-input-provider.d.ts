import type { ControlInput, InputProvider } from './control-input.js';
import type { TosiXRControllerMap } from './gamepad.js';
export declare class XRInputProvider implements InputProvider {
    controllerMap: TosiXRControllerMap | undefined;
    constructor(controllerMap?: TosiXRControllerMap);
    poll(): ControlInput;
}
//# sourceMappingURL=xr-input-provider.d.ts.map