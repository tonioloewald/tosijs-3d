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
    /**
     * A STABLE name for this kind of source — `'keyboard'`, `'hardware'`,
     * `'touch'`, `'xr'` — for code that needs to find or filter one.
     *
     * Exists because the obvious alternative silently fails: an adopter matched
     * our glass pad with `constructor?.name === 'B3dGamepad'`, their bundler
     * minified class names, the lookup never matched, and the patch they built on
     * it never ran — so every experiment they reasoned from was a no-op that
     * looked like a result (tosijs-3d#14). Class names are not API; this is.
     *
     * Optional so a consumer's own source needn't declare one.
     */
    readonly kind?: string;
}
/**
 * THE SIGN CONTRACT every source must honour: **up / forward is POSITIVE**, on
 * both sticks and on every device.
 *
 * Written down as a constant because it was documented in three places and
 * enforced in none, which cost a day: a device that disagrees is internally
 * consistent, so only a player with two devices ever notices, and the bug
 * presents as "the framework is broken" rather than "one source is inverted".
 * `stick-sign.test.ts` asserts it across the sources.
 */
export declare const STICK_UP_IS_POSITIVE = true;
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