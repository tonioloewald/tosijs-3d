import { Component } from 'tosijs';
import type { VirtualGamepad, GamepadSource, InputMapping } from './virtual-gamepad';
import { MappedInputProvider } from './virtual-gamepad';
import { HardwareGamepadSource } from './hardware-gamepad';
export declare class GameController extends Component implements GamepadSource {
    static initAttributes: {
        wheelSensitivity: number;
        updateIntervalMs: number;
    };
    hardwareSource: HardwareGamepadSource;
    private provider;
    private axes;
    private buttons;
    private pressedKeys;
    private axisState;
    private buttonState;
    private wheelAccum;
    private interval;
    private lastUpdate;
    /** Poll keyboard/mouse state as a VirtualGamepad. */
    poll(): VirtualGamepad;
    /** Returns a MappedInputProvider that merges keyboard + hardware gamepad. */
    getInputProvider(mapping?: InputMapping): MappedInputProvider;
    private _handleKeyDown;
    private _handleKeyUp;
    private _handleWheel;
    private _updateSmoothing;
    connectedCallback(): void;
    disconnectedCallback(): void;
}
export declare const gameController: import("tosijs").ElementCreator<GameController>;
//# sourceMappingURL=game-controller.d.ts.map