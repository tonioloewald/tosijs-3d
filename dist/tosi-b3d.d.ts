import { Component } from 'tosijs';
import * as BABYLON from '@babylonjs/core';
import * as GUI from '@babylonjs/gui';
import '@babylonjs/loaders';
import { type Widget3d } from './widgets3d';
import { CombatWorld } from './destroyable';
import { XrFrames } from './xr-frames';
import { type FramePanelSpec } from './frame-panel';
import { type FogState, type FogLayer } from './atmosphere';
import { type QualitySetting } from './b3d-quality';
import { type AmbientEffect } from './ambient-budget';
export declare const showB3dStats: (on?: boolean) => void;
/**
 * A contributor to the Perf Stats panel (see `B3d.addDebugSource`). The panel is
 * dual-presence — flat overlay AND in-headset — which is the whole point: there's no
 * console in VR, and VR is where the frame budget is tightest.
 */
export type DebugPanelSource = {
    /** Short header, e.g. `'terrain'`. */
    name: string;
    /** Called on every refresh — return LIVE values, not a snapshot. */
    lines: () => string[];
    /** Rendered as buttons. This is how you toggle a profiler on from inside a headset. */
    actions?: Array<{
        label: string | (() => string);
        onClick: () => void;
    }>;
    /** Icon for this source's toggle in the panel's debug icon-bar (an `iconGlyph`
     * name — see [[svg-icons]]). Defaults to `'bug'`. */
    icon?: string;
};
export type SceneAdditionHandler = (additions: SceneAdditions) => void;
export type SceneAdditions = {
    meshes?: BABYLON.AbstractMesh[];
    lights?: BABYLON.Light[];
};
/** Radar alignment — matches the HUD's `TraceKind` so a blip's faction maps
 * straight to a radar-trace colour/template. Extend freely; these are the seed. */
export type RadarFaction = 'friendly' | 'neutral' | 'hostile' | 'waypoint';
/** Anything detectable on radar — a target, the player's own missile, a waypoint.
 * A radar platform (e.g. the aircraft HUD) enumerates `B3d.radarBlips`, gates each
 * by its `radarProfile` against the platform's range, and plots the survivors. */
export interface RadarBlip {
    /** Detectability multiplier: 1 = detectable at the platform's nominal range,
     * 2 = out to 2× range, 0.05 = very stealthy; NEGATIVE = always detectable
     * regardless of range (e.g. waypoints). */
    radarProfile: number;
    faction: RadarFaction;
    /** Current world position (floating-origin-corrected), or null if not yet placed
     * (mesh still loading, etc.) — the platform skips a null. */
    radarPosition(): {
        x: number;
        y: number;
        z: number;
    } | null;
    /** The mesh a homing weapon should chase when this blip is locked, or null (a
     * positional-only blip like a waypoint — a missile fired at it goes ballistic). */
    radarMesh(): BABYLON.AbstractMesh | null;
}
type B3dCallback = ((element: B3d, BABYLON: typeof import('@babylonjs/core')) => void) | ((element: B3d, BABYLON: typeof import('@babylonjs/core')) => Promise<void>);
/** A registered fog contributor: underwater, cloud, space… (see atmosphere.ts). */
type FogContributor = () => FogLayer | null;
export declare class B3d extends Component {
    static initAttributes: {
        glowLayerIntensity: number;
        frameRate: number;
        minElevation: number;
        maxElevation: number;
        minDistance: number;
        maxDistance: number;
        noXr: boolean;
        xrGrid: "on" | "off" | "auto";
        xrReticle: "on" | "off";
        scenePanelOpen: boolean;
        gamepad: boolean | string;
        gamepadScale: number;
        /** `'off'` stops the glass gamepad fading when a mouse/keyboard/pad is
         * used (see b3d-gamepad's `fade`). */
        gamepadFade: "on" | "off";
        quality: QualitySetting;
        stats: boolean;
    };
    static styleSpec: {
        ':host': {
            display: string;
            position: string;
            overflow: string;
            background: string;
            height: string;
            maxHeight: string;
        };
        ':host .spinner': {
            position: string;
            top: string;
            left: string;
            width: string;
            height: string;
            marginTop: string;
            marginLeft: string;
            border: string;
            borderTopColor: string;
            borderRadius: string;
            animation: string;
            transition: string;
        };
        ':host .spinner.hidden': {
            opacity: string;
            pointerEvents: string;
        };
        '@keyframes tosi-spin': {
            to: {
                transform: string;
            };
        };
        ':host canvas': {
            position: string;
            top: string;
            left: string;
            width: string;
            height: string;
            opacity: string;
            transition: string;
        };
        ':host canvas.ready': {
            opacity: string;
        };
        ':host .babylonVRicon': {
            height: number;
            width: number;
            backgroundColor: string;
            filter: string;
            backgroundPosition: string;
            backgroundRepeat: string;
            border: string;
            borderRadius: number;
            borderStyle: string;
            outline: string;
            transition: string;
        };
        ':host .babylonVRicon:hover': {
            transform: string;
        };
        ':host .scene-lozenge': {
            position: string;
            top: string;
            left: string;
            zIndex: string;
            display: string;
            alignItems: string;
            background: string;
            border: string;
            borderRadius: string;
            overflow: string;
            '--tosi-icon-size': string;
        };
        ':host .scene-lozenge:not(:has(.lozenge-button:not([hidden])))': {
            display: string;
        };
        ':host .lozenge-button': {
            minWidth: string;
            height: string;
            boxSizing: string;
            display: string;
            alignItems: string;
            justifyContent: string;
            padding: string;
            background: string;
            border: string;
            color: string;
            cursor: string;
            transition: string;
        };
        ':host .lozenge-button:hover': {
            background: string;
        };
        ':host .lozenge-button[hidden]': {
            display: string;
        };
        ':host .lozenge-button:not([hidden]) + .lozenge-button:not([hidden])': {
            borderLeft: string;
        };
        ':host .lozenge-button:disabled': {
            opacity: string;
            cursor: string;
            pointerEvents: string;
        };
        ':host .scene-panel-overlay': {
            position: string;
            top: string;
            left: string;
            zIndex: string;
            filter: string;
        };
        ':host .scene-panel-overlay[hidden]': {
            display: string;
        };
        ':host .scene-panel-close': {
            position: string;
            top: string;
            right: string;
            zIndex: string;
            width: string;
            height: string;
            border: string;
            borderRadius: string;
            background: string;
            color: string;
            cursor: string;
            fontSize: string;
            lineHeight: string;
            display: string;
            alignItems: string;
            justifyContent: string;
            padding: string;
        };
        ':host .scene-panel-close:hover': {
            background: string;
        };
    };
    content: (HTMLCanvasElement | HTMLDivElement | HTMLSlotElement)[];
    engine: BABYLON.Engine;
    scene: BABYLON.Scene;
    camera?: BABYLON.Camera;
    gui?: GUI.GUI3DManager;
    glowLayer?: BABYLON.GlowLayer;
    xrHelper?: BABYLON.WebXRDefaultExperience;
    xrActive: boolean;
    private static _active;
    /** True when this scene should consume shared keyboard/gamepad input — it's the
     * active (last hovered/clicked) scene, or none has been touched yet. Controllables
     * gate their input on this so one gamepad doesn't drive every demo on a page. */
    get hasInputFocus(): boolean;
    /** Make this the input-focused scene (also happens on pointerenter/pointerdown). */
    takeInputFocus(): void;
    /** Reference frames (world/rig/body/neck/face) for spatial UI, live only while
     * an XR session is running. Parent in-scene UI to `xrFrames.body` etc. */
    xrFrames: XrFrames | null;
    BABYLON: typeof BABYLON;
    minElevation: number;
    maxElevation: number;
    minDistance: number;
    maxDistance: number;
    noXr: boolean;
    xrGrid: 'on' | 'off' | 'auto';
    xrReticle: 'on' | 'off';
    scenePanelOpen: boolean;
    stats: boolean;
    sceneCreated: B3dCallback;
    update: B3dCallback;
    setupXr: B3dCallback;
    scenePanel: (host: B3d) => Widget3d[];
    bodyPanels: (host: B3d) => FramePanelSpec[];
    private lastRender;
    /** Seconds of wall clock since the previous rendered frame (clamped to
  
     * 100ms so a backgrounded tab can't teleport the sim). Use this — NOT
  
     * `engine.getDeltaTime()` — for anything advancing state inside a scene
  
     * observer; see the note in `_update`. */
    frameDelta: number;
    private sceneListeners;
    private pastAdditions;
    private _sceneReady;
    private _readyQueue;
    private _libraries;
    /** Run `cb` when the scene is ready — now if it already is, else on scene-ready. */
    whenReady(cb: () => void): void;
    addSceneListener(callback: SceneAdditionHandler): void;
    removeSceneListener(callback: SceneAdditionHandler): void;
    register(additions: SceneAdditions): void;
    private _worldRoots;
    private _originShiftListeners;
    private _radarBlips;
    readonly combat: CombatWorld;
    private _scenePanelWired;
    private _nameplates;
    private _nameplateList;
    private _nameplateScan;
    /**
     * CAVITIES — open air that lives INSIDE the ground (a bore, a cavern).
     *
     * Anything that navigates by "terrain is a heightfield below me" needs to
     * know when that stopped being true: a flat ground-plane floor, a downward
     * ray, a landing gate. A cavity predicate is how a volumetric patch tells
     * the rest of the engine "here, the rule is suspended" without either side
     * knowing about the other — the same shape as the origin listeners above,
     * and for the same reason.
     */
    addCavity(predicate: (x: number, y: number, z: number) => boolean): void;
    removeCavity(predicate: (x: number, y: number, z: number) => boolean): void;
    /** Is this world point inside open air within the ground? False when no
     * patch has claimed it — so a scene with no cavities pays one array-length
     * check and behaves exactly as it always did. */
    insideCavity(x: number, y: number, z: number): boolean;
    private _cavities;
    registerWorldRoot(node: BABYLON.TransformNode): void;
    unregisterWorldRoot(node: BABYLON.TransformNode): void;
    addOriginListener(callback: (dx: number, dz: number) => void): void;
    removeOriginListener(callback: (dx: number, dz: number) => void): void;
    registerRadarBlip(blip: RadarBlip): void;
    unregisterRadarBlip(blip: RadarBlip): void;
    /** Every radar-detectable blip in the scene (targets, own missiles, waypoints). */
    get radarBlips(): ReadonlySet<RadarBlip>;
    /**
     * Move every world-space thing by (-dx, -dz) so the viewpoint returns near the
     * origin with no visible motion. Called by the terrain AFTER it has rebased its
     * own tiles by (dx, dz). Shifts: the camera CARRIER (the piloted entity if one is
     * driven — the chase rig re-derives from it each frame, so shifting the rig would
     * be overwritten; else the camera's parent; else the camera), every registered
     * world root, and every addOriginListener listener (which fixes its own node + JS).
     * Skybox/water are viewer/origin-centred and intentionally NOT shifted.
     */
    shiftOrigin(dx: number, dz: number): void;
    registerLibrary(type: string, library: any): void;
    unregisterLibrary(type: string, library: any): void;
    getLibrary(type: string): any | null;
    getLibraries(type: string): any[];
    setActiveCamera(camera: BABYLON.Camera, options?: {
        attach?: boolean;
        preventDefault?: boolean;
    }): void;
    /**
     * Switch the **gameplay viewpoint** — chase↔cockpit, a death spectator orbit, climbing into a
     * vehicle. This is the ONE sanctioned way to change what the player looks through, and the ONE
     * place that knows the XR rule:
     *
     * > **In an XR session the WebXR camera OWNS the view. Never swap `scene.activeCamera` — that
     * > steals it from the headset and blanks the display.** Instead the piloted entity moves the
     * > XR *rig* (it parents the rig to itself), so the head rides along.
     *
     * So: flat → swap to `camera` (returns `true`); XR → **no-op on the camera** (returns `false`,
     * so the caller can skip building a flat-only camera and let the rig handle the view). Every
     * gameplay camera change must route through here rather than `setActiveCamera` /
     * `scene.activeCamera` directly — that's what stops "it breaks in VR" from recurring
     * (it bit the chase camera, then the death orbit; centralising the rule is the fix).
     */
    setGameplayCamera(camera: BABYLON.Camera, options?: {
        attach?: boolean;
        preventDefault?: boolean;
    }): boolean;
    private _update;
    private _resizing;
    _resizeCount: number;
    handleResize(): void;
    get debugState(): {
        renderWidth: number | null;
        renderHeight: number | null;
        cssWidth: number;
        cssHeight: number;
        devicePixelRatio: number | null;
        hardwareScaling: number | null;
        tier: import("./perf-probe").PerfTier;
        fps: number | null;
        resizeCount: number;
        xrActive: boolean;
    };
    loadScene: (path: string, file: string, processCallback?: (scene: BABYLON.Scene) => void) => Promise<void>;
    private _qualityOff;
    private static _probeStarted;
    private _setupQuality;
    private _applyHardwareScaling;
    private _ambient;
    /** Shrunk by the watchdog, never grown. See `ratchetPool` — and TODO: reclaiming budget in
     * quiet moments is a real want, but it must be a damped, deliberate thing, not a rebound. */
    private _ambientPoolScale;
    private _ambientSampleMs;
    private _ambientBadSamples;
    private _ambientCooldownMs;
    /** Don't judge the frame rate until the scene has settled — see `_ambientWatchdog`. */
    private _ambientWarmupMs;
    /** An ambient effect joins the scene's pool. Returns its unregister. */
    registerAmbient(effect: AmbientEffect): () => void;
    /** Divide the pool and tell everyone what they got (0 = switch off). */
    private _reallocAmbient;
    /**
     * Garnish is the first thing to go. If the frame stays under target we shrink the ambient
     * pool — effects that fall below their honest minimum switch themselves off.
     *
     * This needs NO cost attribution, which is the point: we can't measure what the rain costs
     * (Babylon has no per-system counter, and the real cost is GPU fill), but we don't have to.
     * We only need to know that ambient is the cheapest thing in the scene to give up.
     */
    private _ambientWatchdog;
    private _statsBaseScale;
    private _debugOpen;
    private _debugSources;
    private _liveDebug;
    private _liveDebugTimer;
    /** Set while an XR panel exists; rewrites its contents in place so debug numbers stay
     * live in the headset. No-op flat (the flat panel rebuilds on open). */
    private _refreshXrPanel;
    /**
     * Write into the **Perf Stats panel** — the only debug readout that exists BOTH as a
     * flat overlay and as a floating panel inside a headset. There is no console in VR, so
     * without this a profiler's numbers are unreadable on the one device whose budget is
     * tightest.
     *
     * Any code can contribute: a scene child, a demo, an ad-hoc investigation. `lines()` is
     * re-called on every panel refresh, so return live values, not a snapshot. `actions`
     * become buttons — which is how you turn a profiler ON from inside a headset.
     *
     * Returns an unregister function.
     *
     * ```js
     * const off = b3d.addDebugSource({
     *   name: 'terrain',
     *   lines: () => [`worst ${t.debugState.worstFrameMs.toFixed(1)}ms`],
     *   actions: [{ label: () => (t.profiling ? 'Profiling ON' : 'Profile'), onClick: () => t.setProfiling(!t.profiling) }],
     * })
     * ```
     */
    private _fogLayers;
    private _fogBase;
    private _fogNow;
    /**
     * Contribute a fog layer — underwater, inside a cloud, out in space. Return `null` (or
     * `weight: 0`) when you're not contributing. Returns an unregister function.
     *
     * `b3d-fog` sets the BASE (and the mode, once). Everyone else leans on it.
     */
    addFogLayer(layer: FogContributor): () => void;
    /** The fog everything else blends FROM. `b3d-fog` owns this; without one we still keep a
     * whisper of fog on, so a layer can ramp up without ever switching the mode. */
    setFogBase(base: FogState | null): void;
    private _updateFog;
    private _recenterXr;
    /**
     * Re-seat the head: take your CURRENT head yaw as "facing forward". The same thing the
     * headset's own recentre (holding the Meta button) asks for — we listen for that too, so
     * it now works; this is the manual door, e.g. a panel button.
     */
    recenterXr(): void;
    /**
     * Capture the current view as a PNG **data URL**. Resolution-independent — it
     * renders through an offscreen render target at the requested size (default: the
     * canvas size), so you can grab a large still from a small canvas, and it never
     * depends on the drawing buffer being preserved. Works in the flat view,
     * including **in-scene 3D panels** — which is how you eyeball the SVG-texture UI
     * (the same raster path the VR panels use) without a headset.
     *
     * Returns a `data:image/png;base64,…` string (handy from the console or a dev
     * channel); for a Blob, `await (await fetch(url)).blob()`.
     */
    snapshot(opts?: {
        width?: number;
        height?: number;
    }): Promise<string>;
    /** Repaint BOTH presentations of the panel. The flat one rebuilds; the XR one rewrites
     * its contents in place. Unified on purpose — see `_panelWidgets`. */
    private _repaintPanels;
    addDebugSource(source: DebugPanelSource): () => void;
    private _sourceRows;
    private _debugTools;
    private _startLiveDebug;
    private _perfReadoutRows;
    private _panelWidgets;
    private _installXrRafPump;
    connectedCallback(): void;
    private _setupXR;
    private _startDefaultXrExperience;
    private _makePanel;
    private _setupNameplates;
    private _scanNameplates;
    private _setupScenePanel;
    /** Open the flat scene panel, with a × close button pinned top-right. */
    private _openScenePanel;
    private _closeScenePanel;
    /** Rebuild the flat scene panel from the current rows, if it's open.
     * Call after async state the panel reflects has changed (e.g. a library loaded,
     * or XR availability / session state) so an already-open panel updates. */
    refreshScenePanel(): void;
    private _setupGamepad;
    private _attachXrPanel;
    disconnectedCallback(): void;
    render(): void;
}
export declare const b3d: import("tosijs").ElementCreator<B3d>;
export {};
//# sourceMappingURL=tosi-b3d.d.ts.map