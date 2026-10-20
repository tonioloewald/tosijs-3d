/** Start sprinting above this share of full speed… */
export declare const SPRINT_ENTER = 0.8;
/** …and keep sprinting until below this one. */
export declare const SPRINT_LEAVE = 0.7;
export interface ForwardGait {
    state: 'sprint' | 'run' | 'walk';
    /** The clip's speed ratio. */
    scale: number;
    /** Pass back as `wasSprinting` next frame. */
    sprinting: boolean;
}
export declare function forwardGait(speed: number, sprintSpeed: number, wasSprinting: boolean, hasSprint: boolean): ForwardGait;
//# sourceMappingURL=gait.d.ts.map