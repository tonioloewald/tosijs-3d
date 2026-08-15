import type { TosiXRControllerMap } from './gamepad';
import { type GamepadSource, type VirtualGamepad } from './virtual-gamepad';
export declare class XrGamepadSource implements GamepadSource {
    private controllers;
    readonly kind = "xr";
    constructor(controllers: TosiXRControllerMap);
    poll(): VirtualGamepad;
}
//# sourceMappingURL=xr-gamepad.d.ts.map