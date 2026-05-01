export interface ControlInput {
    forward: number;
    strafe: number;
    turn: number;
    pitch: number;
    throttle: number;
    jump: number;
    shoot: number;
    sprint: number;
    interact: number;
    aim: number;
    cameraZoom: number;
    sneak: number;
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