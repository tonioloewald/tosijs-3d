import { Component } from 'tosijs';
import type { VirtualGamepad, GamepadSource, InputMapping } from './virtual-gamepad.js';
import { MappedInputProvider } from './virtual-gamepad.js';
import { HardwareGamepadSource } from './hardware-gamepad.js';
export declare class GameController extends Component implements GamepadSource {
    static preferredTagName: string;
    static initAttributes: {
        wheelSensitivity: number;
        updateIntervalMs: number;
        /**
         * How the mouse looks around: `'drag'`, `'lock'` or `'off'`.
         *
         * `'drag'` is the default because the danger with mouse look is not mouse
         * look, it is CAPTURE: a page that grabs the pointer is a page you cannot
         * use, and these demos live in a document alongside a scrollbar, a sidebar
         * and nine other demos. Holding a button to look is unmodal, needs no
         * escape hatch, and cannot strand anybody.
         *
         * `'lock'` is the right default for a real game and is one attribute away.
         */
        mouseLook: "drag" | "lock" | "off";
        /** Degrees of view per 100px of mouse movement, roughly. */
        mouseSensitivity: number;
    };
    mouseLook: 'drag' | 'lock' | 'off';
    mouseSensitivity: number;
    /** Accumulated mouse movement since the last poll, and the time it took. */
    private _lookDx;
    private _lookDy;
    private _lookAt;
    private _lastPoll;
    private _dragging;
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
    /**
     * The element actually under the pointer — NOT `event.target`.
     *
     * `<tosi-b3d>` renders its canvas inside a shadow root, and the DOM retargets
     * an event crossing that boundary: a listener on `window` is told the target
     * is `TOSI-B3D`, because that is the outermost node in the tree it can see.
     * So `event.target instanceof HTMLCanvasElement` is not merely unreliable
     * here, it is ALWAYS FALSE — which quietly disabled every mouse button on the
     * scene, the context-menu suppression that lets right-click be secondary
     * fire, and (when it was added) mouse look.
     *
     * `composedPath()[0]` is the node the event really started on, retargeting or
     * not, and it is what all three of those tests should always have used.
     */
    private _hitCanvas;
    private _handleMouseDown;
    private _handleMouseUp;
    private _handleContextMenu;
    private _updateSmoothing;
    /**
     * Movement in, as a delta. `movementX/Y` rather than client coordinates,
     * because under pointer lock there are no client coordinates to speak of and
     * a delta is what both modes have in common.
     */
    private _handleMouseMove;
    /**
     * Losing the lock must STOP the view, not leave it coasting.
     *
     * Escape releases pointer lock and the browser does not send a final
     * `mousemove`, so whatever delta was in flight would be the last thing the
     * mapping saw — a character left slowly spinning after you tried to get out.
     */
    private _handleLockChange;
    connectedCallback(): void;
    disconnectedCallback(): void;
}
export declare const gameController: import("tosijs").ElementCreator<GameController>;
//# sourceMappingURL=game-controller.d.ts.map