import { Component } from 'tosijs';
import type { VirtualGamepad, GamepadSource } from './virtual-gamepad';
export declare class KeyboardGamepadSource extends Component implements GamepadSource {
    static initAttributes: {
        wheelSensitivity: number;
        updateIntervalMs: number;
    };
    private axes;
    private buttons;
    private pressedKeys;
    private axisState;
    private buttonState;
    private wheelAccum;
    private interval;
    private lastUpdate;
    poll(): VirtualGamepad;
    private _isMappedKey;
    private _handleKeyDown;
    private _handleKeyUp;
    private _handleWheel;
    private _updateSmoothing;
    connectedCallback(): void;
    disconnectedCallback(): void;
}
export declare const keyboardGamepad: import("tosijs").ElementCreator<KeyboardGamepadSource>;
//# sourceMappingURL=keyboard-gamepad.d.ts.map