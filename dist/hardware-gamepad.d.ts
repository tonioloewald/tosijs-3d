import type { VirtualGamepad, GamepadSource } from './virtual-gamepad';
export declare class HardwareGamepadSource implements GamepadSource {
    deadzone: number;
    gamepadIndex: number;
    constructor(options?: {
        deadzone?: number;
        gamepadIndex?: number;
    });
    poll(): VirtualGamepad;
}
//# sourceMappingURL=hardware-gamepad.d.ts.map