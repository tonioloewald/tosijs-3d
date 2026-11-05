import type { ControlInput } from './control-input.js';
type Vec = {
    x: number;
    y?: number;
    z: number;
};
/** Degrees, 0 = +z, 90 = +x, from a direction. */
export declare function headingDeg(dir: Vec): number;
/** The turn from `heading` at `from` to face `to`: -180..180, + is right. */
export declare function bearingDeg(from: Vec, heading: number, to: Vec): number;
/** Where the driven thing is: world metres, heading in degrees, speed along its nose in m/s. */
export interface DriverPose {
    x: number;
    z: number;
    heading: number;
    speed: number;
}
export type DriverState = 'idle' | 'running' | 'arrived' | 'done' | 'stuck' | 'cancelled';
export interface DriverStatus {
    state: DriverState;
    command?: 'hold' | 'go';
    /** A go's destination, by name when it has one. */
    place?: string;
    target?: {
        x: number;
        z: number;
    };
    /** Metres left, on a go. */
    distance?: number;
    /** Seconds since the command started (world time). */
    elapsed: number;
    /** Why it ended, when it did not simply finish. */
    reason?: string;
}
/** How a go drives: the defaults suit a car in town. */
export interface GoOptions {
    place?: string;
    /** Top speed, m/s (default 10). */
    speed?: number;
    /** Close enough, metres (default 4). */
    arrive?: number;
    /** Give up after this long, seconds of world time (default 120). */
    timeout?: number;
}
/** Smallest stick or button the player can press on purpose. */
export declare const DELIBERATE = 0.2;
/** Is the player pressing anything? A twitch under `DELIBERATE` is not. */
export declare function isDeliberate(input: ControlInput): boolean;
export declare class AgentDriver {
    private _status;
    private hold;
    private goal;
    private best;
    private sinceProgress;
    get status(): DriverStatus;
    get running(): boolean;
    /** Hold some controls for `seconds` of world time. */
    holdInput(input: Partial<ControlInput>, seconds: number): void;
    /** Drive to `target` (world metres). */
    go(target: {
        x: number;
        z: number;
    }, options?: GoOptions): void;
    /** End the command: `cancelled` with a reason. */
    stop(reason?: string): void;
    private reset;
    private end;
    /**
     * One frame: the controls to apply, or null when there is no command (the
     * player's input stands).
     */
    step(dt: number, pose: DriverPose): Partial<ControlInput> | null;
}
export {};
//# sourceMappingURL=agent-driver.d.ts.map