import * as BABYLON from '@babylonjs/core';
export interface FrameProfileSample {
    /** Seconds since the profile started. */
    at: number;
    /** Frame interval, ms. */
    frame: number;
    /** Inside the engine frame, ms. */
    inFrame: number;
    activeMeshes: number;
    renderTargets: number;
    render: number;
    draws: number;
    /** The heaviest callbacks, `name ms` per frame, heaviest first. */
    top: string;
}
export declare function frameProfile(scene: BABYLON.Scene, options: {
    seconds: number;
    every: number;
    report: (s: FrameProfileSample) => void;
    /** More observables to time, asked again each report (an XR session's arrive late). */
    extra?: () => [string, BABYLON.Observable<any> | undefined][];
}): () => void;
//# sourceMappingURL=frame-profile.d.ts.map