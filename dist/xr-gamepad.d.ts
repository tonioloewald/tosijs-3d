import type { TosiXRControllerMap } from './gamepad.js';
import { type GamepadSource, type VirtualGamepad } from './virtual-gamepad.js';
export declare class XrGamepadSource implements GamepadSource {
    private controllers;
    readonly kind = "xr";
    constructor(controllers: TosiXRControllerMap);
    poll(): VirtualGamepad;
}
//# sourceMappingURL=xr-gamepad.d.ts.map