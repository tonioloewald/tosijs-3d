import type { VirtualGamepad, GamepadSource } from './virtual-gamepad.js';
/** Zero inside `deadzone`, rescaled to 0..1 beyond it. Shared with the XR source. */
export declare function applyDeadzone(value: number, deadzone: number): number;
/**
 * Buttons the page's UI holds for itself (a scene's gamepad UI mode): every
 * source reads them as up, so a press that moves the UI's focus does not also
 * reload or use. `poll(true)` reads them anyway (the UI itself).
 */
export declare const padUiOwns: Set<keyof VirtualGamepad>;
export declare class HardwareGamepadSource implements GamepadSource {
    readonly kind = "hardware";
    deadzone: number;
    gamepadIndex: number;
    constructor(options?: {
        deadzone?: number;
        gamepadIndex?: number;
    });
    poll(raw?: boolean): VirtualGamepad;
    private _read;
}
//# sourceMappingURL=hardware-gamepad.d.ts.map