import type { ControlInput, InputProvider } from './control-input';
export interface VirtualGamepad {
    leftStickX: number;
    leftStickY: number;
    rightStickX: number;
    rightStickY: number;
    buttonA: number;
    buttonB: number;
    buttonX: number;
    buttonY: number;
    leftBumper: number;
    rightBumper: number;
    leftTrigger: number;
    rightTrigger: number;
    dpadUp: number;
    dpadDown: number;
    dpadLeft: number;
    dpadRight: number;
    /** Start/options ("≡") button — typically opens a menu. */
    menu: number;
    /** Select/view ("⧉") button — typically cycles camera/view. */
    view: number;
}
export declare function emptyGamepad(): VirtualGamepad;
export declare function mergeGamepads(a: VirtualGamepad, b: VirtualGamepad): VirtualGamepad;
export interface GamepadSource {
    poll(): VirtualGamepad;
}
export type InputMapping = (pad: VirtualGamepad, dt: number) => ControlInput;
/** Labels for each gamepad control — used by UI visualizers */
export type MappingLabels = Partial<Record<keyof VirtualGamepad, string>>;
export interface InputMappingDescriptor {
    map: InputMapping;
    labels: MappingLabels;
}
export declare function bipedMapping(pad: VirtualGamepad, _dt: number): ControlInput;
export declare const bipedMappingDescriptor: InputMappingDescriptor;
export declare function carMapping(pad: VirtualGamepad, _dt: number): ControlInput;
export declare const carMappingDescriptor: InputMappingDescriptor;
export interface ThrottleDetentConfig {
    /** Detent levels as fractions 0..1 (e.g. [0.3, 0.5, 0.7]). Sorted ascending. */
    detents: number[];
    /** How fast the throttle moves (full range per second). Default 1.5 */
    rate: number;
}
/**
 * Preferences that change what an axis MEANS, which is the mapping's job and
 * nobody else's.
 *
 * `invertPitch` is the one nearly every project eventually wants: we ship the
 * flight-stick convention (pull back = nose up) and a large slice of players
 * expect the arcade one. Without this knob the natural place to implement it is
 * `entity.inputProvider` — which is per-entity and per-consumer, so the keyboard
 * ends up inverted and the glass gamepad doesn't, from a setting that was meant
 * to be global. That happened (tosijs-3d#10, reported by manta-recon); the
 * mapping is the only layer every source passes through.
 */
export interface AircraftMappingConfig extends Partial<ThrottleDetentConfig> {
    /** Push forward = nose up (arcade), instead of the flight-stick convention. */
    invertPitch?: boolean;
    /** Reverse the bank/turn axis. */
    invertRoll?: boolean;
    /** Reverse the look/camera pitch axis. */
    invertCameraY?: boolean;
}
export declare function aircraftMapping(config?: AircraftMappingConfig): InputMapping;
export declare function aircraftMappingDescriptor(config?: AircraftMappingConfig): InputMappingDescriptor;
export declare class MappedInputProvider implements InputProvider {
    private sources;
    mapping: InputMapping;
    constructor(mapping: InputMapping, ...sources: GamepadSource[]);
    setMapping(mapping: InputMapping): void;
    addSource(source: GamepadSource): void;
    removeSource(source: GamepadSource): void;
    /** Returns the merged VirtualGamepad before mapping — useful for visualizers */
    pollRaw(): VirtualGamepad;
    poll(dt: number): ControlInput;
}
//# sourceMappingURL=virtual-gamepad.d.ts.map