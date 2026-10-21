import type { VirtualGamepad, GamepadSource } from './virtual-gamepad.js';
/** Zero inside `deadzone`, rescaled to 0..1 beyond it. Shared with the XR source. */
export declare function applyDeadzone(value: number, deadzone: number): number;
export declare class HardwareGamepadSource implements GamepadSource {
    readonly kind = "hardware";
    deadzone: number;
    gamepadIndex: number;
    constructor(options?: {
        deadzone?: number;
        gamepadIndex?: number;
    });
    poll(): VirtualGamepad;
}
//# sourceMappingURL=hardware-gamepad.d.ts.map