import type { GamepadSource, VirtualGamepad, MappingLabels } from './virtual-gamepad';
export type TouchGamepadOptions = {
    deadzone?: number;
    maxZone?: number;
    /** Handler called when an unmapped data-part element is pressed/released */
    onButton?: (part: string, pressed: boolean) => void;
};
export declare class TouchGamepadSource implements GamepadSource {
    private svg;
    private state;
    private sticks;
    private sticksInitialized;
    private buttonPointers;
    private customPointers;
    private deadzone;
    private maxZone;
    private onButton?;
    private boundPointerDown;
    private boundPointerMove;
    private boundPointerUp;
    constructor(svgElement: SVGSVGElement, options?: TouchGamepadOptions);
    private part;
    private ensureSticks;
    private initButtons;
    private findStickForElement;
    private findAnyPart;
    private onPointerDown;
    private onPointerMove;
    private onPointerUp;
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