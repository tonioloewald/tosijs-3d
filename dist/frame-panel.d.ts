import * as BABYLON from '@babylonjs/core';
import { type FrameName } from './xr-frames';
export type { FrameName };
export type AnchorPreset = 'waist' | 'left-shoulder' | 'right-shoulder' | 'overhead' | 'wrist';
export interface AnchorSpec {
    /** Explicit local position in the frame (metres). */
    position?: [number, number, number];
    /** Or place it by angle off the focus: azimuth (+right/−left from forward),
     * elevation (+up/−down), at `distance` metres. The natural way to say
     * "70° to the side and 20° up". */
    azimuthDeg?: number;
    elevationDeg?: number;
    distance?: number;
    /** Point the panel turns to face (default the head ≈ (0, 1.6, 0)). Also the
     * origin angular placement is measured from. */
    focus?: [number, number, number];
    /** Roll about the panel's normal (deg) — e.g. 180 to flip an upside-down pin. */
    rollDeg?: number;
    /** Gaze half-angle (deg) where the reveal begins / completes. */
    revealStartDeg?: number;
    revealFullDeg?: number;
}
export interface FramePanelSpec {
    /** Which reference frame to pin to. Default `body`. */
    frame?: FrameName;
    /** A preset, or an explicit anchor. */
    anchor: AnchorPreset | AnchorSpec;
    /** `gaze` (default): show as you look toward it. `always`: always visible
     * (reticles, persistent HUD). */
    reveal?: 'gaze' | 'always';
    /** Restrict to a camera view: `first` (fpv/cockpit), `third` (chase), or
     * `both` (default). Hidden when the active view doesn't match. */
    view?: 'first' | 'third' | 'both';
    /** Hide beyond this distance (metres) from the head — e.g. NPC nameplates that
     * shouldn't clutter the view at range. */
    maxDistance?: number;
    /** `composite` (default): alpha-over, for dialogs/panels. `add`: additive, for
     * glowing HUD glyphs like reticles (dark pixels vanish, bright ones add). */
    blend?: 'composite' | 'add';
    /** Placeholder title (ignored if `svg`/`url` is supplied). */
    title?: string;
    /** Custom panel SVG element (live/dynamic content). */
    svg?: SVGSVGElement;
    /** Or fetch a static SVG from this URL (e.g. a reticle). */
    url?: string;
    /** Plane aspect (height/width) when using `url` (no element to measure). 1. */
    aspect?: number;
    /** Panel width in metres (height follows the aspect). Default 0.26. */
    width?: number;
}
/** A simple titled placeholder panel SVG (rounded card + centred label). */
export declare function placeholderPanelSvg(title: string, w?: number, h?: number): SVGSVGElement;
/**
 * Mount a panel on a frame node. Call `update()` each XR frame (drives the gaze
 * reveal from the camera) and `dispose()` to tear down. Returns those handles.
 */
export declare function attachFramePanel(scene: BABYLON.Scene, cam: BABYLON.TargetCamera, frame: BABYLON.TransformNode, spec: FramePanelSpec): {
    update: (ctx?: {
        firstPerson?: boolean;
    }) => void;
    dispose: () => void;
};
//# sourceMappingURL=frame-panel.d.ts.map