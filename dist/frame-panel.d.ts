import * as BABYLON from '@babylonjs/core';
import { type FrameName } from './xr-frames.js';
export type { FrameName };
export type AnchorPreset = 'system-bar' | 'waist' | 'left-shoulder' | 'right-shoulder' | 'overhead' | 'wrist';
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
    /**
     * Tip it about its own horizontal axis after it faces the viewer (deg):
     * positive brings its TOP toward you, as a sign hung above eye level is
     * tilted down to be read. Its place does not change; `focus` would move it.
     */
    tiltDeg?: number;
    /**
     * Parallel to the frame's own view plane ("flat on") instead of turned to
     * face the eye: on a head-locked frame (`face`), square to the screen, so an
     * off-centre panel is not foreshortened. `rollDeg`/`tiltDeg` still apply.
     */
    flatOn?: boolean;
    /** Gaze half-angle (deg) where the reveal begins / completes. */
    revealStartDeg?: number;
    revealFullDeg?: number;
}
/** The order UI is drawn and picked in: the world, then ui, then modal. */
export type PanelLayer = 'world' | 'ui' | 'modal';
/**
 * Has a person moved a panel by this anchor (its title bar, flat)? A host that
 * re-anchors its panels leaves those where they were put.
 */
export declare function screenAnchorDragged(a: ScreenAnchor): boolean;
export declare function panelLayerScene(scene: BABYLON.Scene, layer: 'ui' | 'modal'): BABYLON.Scene;
/**
 * HIDE EVERY PANEL for a frame or two, and put them back: the `ui` and
 * `modal` layers stop drawing, and world-layer panels are disabled (each
 * restored to what it was). For a picture of the scene alone, such as the
 * scene panel's screenshot "scene only". Returns the undo.
 */
export declare function setPanelsHidden(scene: BABYLON.Scene): () => void;
/**
 * Did a panel in the scene take this pointer event? For DOM listeners that
 * act on presses "on the background" (closing an overlay): a press on a
 * frame panel is not one. (`defaultPrevented` cannot say: Babylon cancels
 * every press on its canvas.)
 */
export declare function pointerClaimedByPanel(e: Event): boolean;
/** Mark a pointer event as taken by a panel in the scene (any in-scene UI
 * that is pressed, not only frame panels: a popup is a `b3dSvgPlane`). */
export declare function claimPointer(e: Event | null | undefined): void;
/** Which layer a mesh is in: a popup takes its opener's. */
export declare function panelLayerOf(mesh: BABYLON.Node | null | undefined): PanelLayer;
/**
 * What a ray hits in the panel LAYERS of `scene`, top first (modal, then ui),
 * or null: for an XR controller ray, which Babylon picks against the world
 * and its own default layer only. Never makes a layer that does not exist.
 */
export declare function pickPanelLayers(scene: BABYLON.Scene, ray: BABYLON.Ray): BABYLON.PickingInfo | null;
/** A length on screen: pixels, a fraction of the axis, or of the shorter side. */
export type ScreenLength = number | `${number}%` | `${number}vmin`;
export interface ScreenAnchor {
    left?: ScreenLength;
    right?: ScreenLength;
    top?: ScreenLength;
    bottom?: ScreenLength;
    /** The point of the panel a pin places (0 left … 1 right); default 0. */
    anchorX?: number;
    /** The same, top to bottom; default 0. */
    anchorY?: number;
    /** `'center'` is both at 0.5. */
    anchor?: 'center';
    /** Its height on screen; default its `width` at `distance`. */
    height?: ScreenLength;
    /** Metres in front of the eye (pushed past the near plane). Default 1. */
    distance?: number;
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
    /**
     * Where the panel goes while its content asks for FOCUS: front and centre
     * by default (straight ahead, a little low, 0.75 m). Content asks by dispatching a `panelfocus` event on its SVG
     * with `detail: { focus: boolean }` (an inventory dock does as it opens and
     * closes); the panel comes here, enlarged by `focusScale`, always revealed,
     * and goes back to its anchor when focus ends. Content that keeps its focus
     * also marks its SVG `data-focus="true"` while it has it, so a panel made
     * later (entering or leaving a headset rebuilds them) starts focused: an
     * event is missed by a panel that did not exist yet.
     */
    focusAnchor?: AnchorPreset | AnchorSpec;
    /** How much bigger a focused panel is drawn. Default 1.9. */
    focusScale?: number;
    /**
     * Where it goes in the FLAT view, in place of `anchor` (with `presence:
     * 'both'`): the shoulder a headset turns to is off a monitor's edge, so a
     * panel pinned there in VR names a place in view flat (e.g. up and left in
     * the `face` frame).
     */
    flatAnchor?: AnchorPreset | AnchorSpec;
    /**
     * Where it goes in the FLAT view in SCREEN terms, which wins over
     * `flatAnchor`: pinned to the view's edges like an `anchorLayout` item, in
     * pixels, a fraction of that axis (`'5%'`), or of the shorter side
     * (`'3vmin'`), with an anchor point on the panel (default its top left).
     * `height` sets its size on screen the same way (default: its `width` in
     * metres at `distance`). Square to the screen, re-solved every frame, so a
     * resize or a different shape of screen keeps it where you put it. Degrees
     * are for a headset, where the panel is around you; a monitor is a rectangle.
     */
    screenAnchor?: ScreenAnchor;
    /**
     * Which LAYER it is drawn and picked in. `'world'` (default): in the scene
     * like anything else, so a nearer wall hides it and takes the press. `'ui'`:
     * over the whole world, and pressed first (what used to be a page overlay:
     * the corner controls, the scene panel, the loadout). `'modal'`: over even
     * the ui (pause, death, a dialog). Drawn AND picked in that order, because a
     * dialog drawn in front of a hill that the pointer still hits behind it is
     * worse than one honestly buried (see b3d-svg-plane).
     */
    layer?: PanelLayer;
    /** Placeholder title (ignored if `svg`/`url` is supplied). */
    title?: string;
    /**
     * `false`: ignore `panelfocus` from its content (stay where it is placed).
     * Default true.
     */
    focusable?: boolean;
    /**
     * Its button on the scene's system bar (an `svgIcons` name), for a panel
     * whose anchor is `'system-bar'`: the button opens it under the bar.
     */
    icon?: string;
    /**
     * A system panel wears the settings panel's title bar (move, its `title`,
     * ×) unless this is `'none'`, for content with chrome of its own.
     */
    chrome?: 'none';
    /**
     * A system panel: `false` lets it stay open beside other system panels
     * (an app's main chrome: tools, properties). Default true, one at a time
     * (an inventory, a journal).
     */
    exclusive?: boolean;
    /** A system panel: open when the scene starts. */
    open?: boolean;
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
 * The spec for ONE presentation of a panel that exists in both. Flat, a
 * `flatAnchor` stands in for the anchor and the screen pins apply; in a
 * headset the screen pins do NOT (there is no screen to pin to: they put the
 * loadout a metre ahead, sized from the flat canvas, instead of on your
 * shoulder, found by the 0.10.6 review). One rule, used by every attach site.
 */
export declare function presentationSpec(spec: FramePanelSpec, flat: boolean): FramePanelSpec;
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
    /** The mesh actually DRAWN: `mesh` itself, or its copy in a panel layer
     * (what a popup hangs from, which must be in the same scene). */
    readonly drawn: BABYLON.Mesh;
    /** Its SVG (null for a `url` panel). `panelfocus` on it brings it front and centre. */
    readonly el: SVGSVGElement | null;
    /** Last computed gaze state. Exposed for `addDebugSource` — in a headset this is
     * the ONLY way to see why a panel is (or isn't) revealing. */
    readonly debug: {
        reveal: number;
        cosine: number;
        distance: number;
        updates: number;
        camera: string;
    };
    /**
     * Where a point of its SVG (viewBox units) is on the page, in client
     * pixels: what a test, or Haltija, clicks to press it as a person would
     * (#113). Through the drawn plane, so a drag, a scale and the camera are all
     * in it. Null when it is not shown, or in a headset (no page to click).
     */
    toClient: (x: number, y: number) => {
        x: number;
        y: number;
    } | null;
};
//# sourceMappingURL=frame-panel.d.ts.map