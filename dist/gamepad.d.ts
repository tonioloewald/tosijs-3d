export interface TosiButton {
    index: number;
    pressed: boolean;
    value: number;
}
export interface TosiGamepad {
    id: string;
    axes: number[];
    buttons: {
        [key: number]: number;
    };
}
export declare function gamepadState(): TosiGamepad[];
export declare function gamepadText(): string;
export interface TosiXRControllerComponentState {
    pressed: boolean;
    touched: boolean;
    value: number;
    axes: {
        x: number;
        y: number;
    };
}
export interface TosiXRControllerState {
    [key: string]: TosiXRControllerComponentState;
}
export interface TosiXRControllerMap {
    [key: string]: TosiXRControllerState;
}
export declare function xrControllers(xrHelper: any): TosiXRControllerMap;
export declare function xrControllersText(controllers?: TosiXRControllerMap): string;
//# sourceMappingURL=gamepad.d.ts.map