declare const DEFAULTS: {
    strokeColor: string;
    strokeWidth: string;
    widgetColor: string;
    controllerColor: string;
    stickTravelColor: string;
    fillA: string;
    fillB: string;
    fillX: string;
    fillY: string;
};
export type GamepadSvgColors = Partial<typeof DEFAULTS>;
export declare function gamepadSvg(colors?: GamepadSvgColors): SVGSVGElement;
export {};
//# sourceMappingURL=gamepad-svg.d.ts.map