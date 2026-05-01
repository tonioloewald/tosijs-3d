import type { ControlInput, InputProvider } from './control-input';
import type { TosiXRControllerMap } from './gamepad';
export declare class XRInputProvider implements InputProvider {
    controllerMap: TosiXRControllerMap | undefined;
    constructor(controllerMap?: TosiXRControllerMap);
    poll(): ControlInput;
}
//# sourceMappingURL=xr-input-provider.d.ts.map