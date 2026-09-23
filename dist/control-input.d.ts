export interface ControlInput {
    forward: number;
    strafe: number;
    /** Camera look, −1..1. Not the craft's controls: it swings the view around
     * the vehicle (chase) or turns the pilot's head (cockpit), and springs back
     * to centre when released. */
    lookX: number;
    lookY: number;
    turn: number;
    pitch: number;
    throttle: number;
    lift: number;
    jump: number;
    shoot: number;
    sprint: number;
    interact: number;
    aim: number;
    /**
     * Raise or lower the weapon — a TOGGLE, edge-detected by whoever consumes it.
     *
     * Separate from `aim` because they are different questions: `aim` is "look
     * down the sights right now" and is held, `weapon` is "am I carrying this
     * thing ready or not" and persists. A character who has put the gun away is
     * not aiming, but a character who is not aiming may still be armed.
     */
    weapon: number;
    cameraZoom: number;
    sneak: number;
    view: number;
    cameraPeek: number;
}
export interface InputProvider {
    poll(deltaTime: number): ControlInput;
    activate?(): void;
    deactivate?(): void;
}
export declare function emptyInput(): ControlInput;
export declare class CompositeInputProvider implements InputProvider {
    providers: InputProvider[];
    constructor(...providers: InputProvider[]);
    add(provider: InputProvider): void;
    remove(provider: InputProvider): void;
    activate(): void;
    deactivate(): void;
    poll(deltaTime: number): ControlInput;
}
//# sourceMappingURL=control-input.d.ts.map