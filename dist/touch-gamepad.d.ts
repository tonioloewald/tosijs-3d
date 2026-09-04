import type { GamepadSource, VirtualGamepad, MappingLabels } from './virtual-gamepad.js';
/** Pointer phase for the coordinate-based (in-scene/VR) input path. */
export type GamepadPointerKind = 'down' | 'move' | 'up';
export type TouchGamepadOptions = {
    deadzone?: number;
    maxZone?: number;
    /** Handler called when an unmapped data-part element is pressed/released */
    handleButton?: (part: string, pressed: boolean) => void;
};
export declare class TouchGamepadSource implements GamepadSource {
    readonly kind = "touch";
    private svg;
    private state;
    private sticks;
    private sticksInitialized;
    private buttonPointers;
    private customPointers;
    private buttonBounds;
    private boundsReady;
    private deadzone;
    private maxZone;
    private handleButton?;
    private boundPointerDown;
    private boundPointerMove;
    private boundPointerUp;
    constructor(svgElement: SVGSVGElement, options?: TouchGamepadOptions);
    private part;
    private ensureSticks;
    private initButtons;
    private findStickForElement;
    private findAnyPart;
    private grabStick;
    private moveStick;
    private pressPart;
    /** Release whatever (stick or button) a pointer id currently holds. */
    private releasePointer;
    private onPointerDown;
    private onPointerMove;
    private onPointerUp;
    handlePointer(kind: GamepadPointerKind, x: number, y: number, pointerId?: number): void;
    /** Cache button rects (viewBox space) for coordinate hit-testing. */
    private ensureBounds;
    private updateStickVisual;
    poll(): VirtualGamepad;
    /**
     * Update SVG visuals to reflect external VirtualGamepad state.
     * Sticks and buttons not currently being touched will mirror the
     * provided values — useful for showing hardware gamepad or keyboard input.
     */
    reflectState(pad: VirtualGamepad): void;
    /**
     * Overlay text labels on gamepad elements showing mapped action names.
     * Call with new labels when the mapping changes.
     */
    showLabels(labels: MappingLabels): void;
    dispose(): void;
}
//# sourceMappingURL=touch-gamepad.d.ts.map