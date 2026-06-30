import * as BABYLON from '@babylonjs/core';
export type FrameName = 'world' | 'rig' | 'body' | 'neck' | 'face';
export type AnchorPreset = 'waist' | 'left-shoulder' | 'right-shoulder';
export interface AnchorSpec {
    /** Local position in the frame (metres). */
    position: [number, number, number];
    /** Point the panel turns to face (default the head ≈ (0, 1.6, 0)). */
    focus?: [number, number, number];
    /** Gaze half-angle (deg) where the reveal begins / completes. */
    revealStartDeg?: number;
    revealFullDeg?: number;
}
export interface FramePanelSpec {
    /** Which reference frame to pin to. Default `body`. */
    frame?: FrameName;
    /** A preset, or an explicit anchor. */
    anchor: AnchorPreset | AnchorSpec;
    /** Placeholder title (ignored if `svg` is supplied). */
    title?: string;
    /** Custom panel SVG; defaults to a titled placeholder. */
    svg?: SVGSVGElement;
    /** Panel width in metres (height follows the SVG aspect). Default 0.26. */
    width?: number;
}
/** A simple titled placeholder panel SVG (rounded card + centred label). */
export declare function placeholderPanelSvg(title: string, w?: number, h?: number): SVGSVGElement;
/**
 * Mount a panel on a frame node. Call `update()` each XR frame (drives the gaze
 * reveal from the camera) and `dispose()` to tear down. Returns those handles.
 */
export declare function attachFramePanel(scene: BABYLON.Scene, cam: BABYLON.TargetCamera, frame: BABYLON.TransformNode, spec: FramePanelSpec): {
    update: () => void;
    dispose: () => void;
};
//# sourceMappingURL=frame-panel.d.ts.map