import * as BABYLON from '@babylonjs/core';
import { type FrameName } from './xr-frames.js';
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
     * shouldn't clutter the view at range. A HARD cliff; prefer `fadeFrom`/`fadeTo`. */
    maxDistance?: number;
    /**
     * Soft distance falloff: full strength within `fadeFrom` m, gone by `fadeTo` m.
     *
     * A hard `maxDistance` was tried and removed — it snapped nameplates out of existence, and
     * the cutoff that felt right on a monitor was wrong in a headset (you stand further away).
     * A fade degrades instead of switching, which is the same lesson the fog and the underwater
     * bubbles already taught us.
     */
    fadeFrom?: number;
    fadeTo?: number;
    /**
     * **Measure gaze against THIS, not against the panel.** A nameplate floats above its NPC's
     * head, so looking straight AT the NPC leaves the plate well outside a tight cone — and you
     * cannot summon the thing by looking at the thing. The workaround was to widen the cone to
     * 70°, which is most of your field of view, so the plates then never went away.
     *
     * The honest fix is to point the cone at what the user is actually looking AT (the subject),
     * and let the panel hang wherever it likes. Then a tight, well-behaved cone works.
     */
    gazeTarget?: BABYLON.TransformNode;
    /**
     * Offset from `gazeTarget`'s origin to the point you'd actually LOOK at (metres, world axes).
     *
     * A character's node origin is at their FEET. Aim a tight cone there and, standing near
     * someone in VR, their feet are 40° below your gaze — so looking them in the eye reveals
     * nothing, forever. (Flat hides this: a chase camera looks down at the scene, so the feet
     * land near screen centre. It reads fine on a monitor and is dead in a headset.) Aim at the
     * chest.
     */
    gazeOffset?: [number, number, number];
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
 * Keep a mesh out of every glow layer in the scene.
 *
 * **A glow layer ignores `mesh.visibility` entirely** (Babylon's effect layer never reads it),
 * so ANY emissive mesh you hide by setting `visibility = 0` will still be drawn by the glow
 * pass. Anything whose visibility you animate — a gaze-revealed panel, a fading-out fragment —
 * and which is emissive, has to opt out of glow or it cannot actually hide.
 *
 * Exported because this is a trap, not a nameplate quirk.
 */
export declare function excludeFromGlow(scene: BABYLON.Scene, mesh: BABYLON.AbstractMesh): void;
/**
 * Mount a panel on a frame node. Call `update()` each XR frame (drives the gaze
 * reveal from the camera) and `dispose()` to tear down. Returns those handles.
 */
export declare function attachFramePanel(scene: BABYLON.Scene, cam: BABYLON.TargetCamera, frame: BABYLON.TransformNode, spec: FramePanelSpec): {
    update: (ctx?: {
        firstPerson?: boolean;
    }) => void;
    dispose: () => void;
    /** Last computed gaze state. Exposed for `addDebugSource` — in a headset this is
     * the ONLY way to see why a panel is (or isn't) revealing. */
    readonly debug: {
        reveal: number;
        cosine: number;
        distance: number;
        updates: number;
        camera: string;
    };
};
//# sourceMappingURL=frame-panel.d.ts.map