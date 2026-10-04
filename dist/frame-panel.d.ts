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
    /**
     * Where the panel exists: `'xr'` (default — only in an immersive session) or
     * `'both'` (also in the flat view, on frames derived from the flat camera).
     * tosijs-3d#81.
     */
    presence?: 'xr' | 'both';
    /**
     * The frame to use in the FLAT view, when it should differ from `frame`.
     *
     * Two jobs. The HANDS have no flat analogue: a wrist palette in VR is
     * usually a screen-edge palette flat, which is the author's call to write
     * down, not the library's to guess (without one, a hand panel stays VR-only
     * and says so once). And on a monitor the camera's PITCH is the designer's,
     * not the viewer's: the flat `eye` frame takes only the view's yaw, so
     * elevation is measured from the horizon, and under the default 30°-down
     * orbit camera elevation 0 is off the top of the screen. `flatFrame:
     * 'face'` measures from the view itself, so a menu at elevation 0 is
     * centred (tosijs-3d#92).
     */
    flatFrame?: FrameName;
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
    /**
     * Texture resolution in pixels (square). Default 384, which suits a
     * reticle, the job frame panels were first built for. A MENU wants more:
     * a ~1100 device-px panel on a 2× display at 384 upscales text ~2.9× and
     * reads soft (tosijs-3d#92). Costs VRAM as the square, so ask for what the
     * panel's on-screen size needs.
     */
    resolution?: number;
}
/** A simple titled placeholder panel SVG (rounded card + centred label). */
export declare function placeholderPanelSvg(title: string, w?: number, h?: number): SVGSVGElement;
/**
 * Make a glow layer bloom a mesh only as much as the mesh is actually visible.
 *
 * **Babylon's glow ignores opacity.** Its default emissive pick never reads
 * `mesh.visibility`, and it passes `material.alpha` through without weighting the
 * colour by it. So a full-screen emissive quad at 30% alpha (a fade-to-white
 * curtain on the way in) blooms at FULL strength, and the frame goes white while
 * the quad itself is barely there. Measured in manta-recon (board #2742): the
 * curtain at alpha 0.3 is a dim wash without glow, and with glow the background
 * goes white, the carrier washes out and the planet bleaches. The same rule is
 * why an emissive mesh hidden with `visibility = 0` still glowed.
 *
 * This installs an emissive selector that scales the colour by
 * `material.alpha × mesh.visibility`. It keeps Babylon's emissive-texture level
 * and `emissiveIntensity`, so an opaque, fully visible mesh glows exactly as before.
 * `<tosi-b3d>` applies it to the glow layer it builds; call it yourself on one you
 * build.
 */
export declare function opacityWeightedGlow(layer: BABYLON.GlowLayer): void;
/**
 * Keep a mesh out of every glow layer in the scene.
 *
 * A glow layer `<tosi-b3d>` builds weights glow by opacity (`opacityWeightedGlow`),
 * so a mesh hidden with `visibility = 0` no longer glows there. A plain Babylon
 * `GlowLayer` ignores `mesh.visibility` entirely, so under one of those an emissive
 * mesh whose visibility you animate (a gaze-revealed panel, a fading fragment) still
 * has to opt out of glow or it cannot actually hide. Exclusion is also right for
 * things that are emissive but are not light sources, like UI plaques.
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
    /** The plane itself — so a consumer never has to find it by diffing the
     * frame's children around the call (tosijs-3d#92). */
    readonly mesh: BABYLON.Mesh;
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