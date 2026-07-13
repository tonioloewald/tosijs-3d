import { Component } from 'tosijs';
import * as BABYLON from '@babylonjs/core';
import * as GUI from '@babylonjs/gui';
import '@babylonjs/loaders';
import { type Widget3d } from './widgets3d';
import { CombatWorld } from './destroyable';
import { XrFrames } from './xr-frames';
import { type FramePanelSpec } from './frame-panel';
import { type QualitySetting } from './b3d-quality';
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
        ':host .scene-toolbar': {
            position: string;
            top: string;
            left: string;
            zIndex: string;
            display: string;
            alignItems: string;
            gap: string;
        };
        ':host .enter-vr-button': {
            display: string;
            alignItems: string;
            gap: string;
            padding: string;
            background: string;
            color: string;
            border: string;
            borderRadius: string;
            font: string;
            cursor: string;
            transition: string;
        };
        ':host .enter-vr-button[hidden]': {
            display: string;
        };
        ':host .enter-vr-button:hover': {
            background: string;
            transform: string;
        };
        ':host .scene-panel-gear': {
            width: string;
            height: string;
            display: string;
            alignItems: string;
            justifyContent: string;
            background: string;
            color: string;
            border: string;
            borderRadius: string;
            font: string;
            cursor: string;
            transition: string;
        };
        ':host .scene-panel-gear[hidden]': {
            display: string;
        };
        ':host .scene-panel-gear:hover': {
            background: string;
            transform: string;
        };
        ':host .scene-toolbar button:disabled': {
            opacity: string;
            cursor: string;
            pointerEvents: string;
            transform: string;
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
    private sceneListeners;
    private pastAdditions;
    private _sceneReady;
    private _readyQueue;
    private _libraries;
    /** Run `cb` when the scene is ready — now if it already is, else on scene-ready. */
    whenReady(cb: () => void): void;
    onSceneAddition(callback: SceneAdditionHandler): void;
    offSceneAddition(callback: SceneAdditionHandler): void;
    register(additions: SceneAdditions): void;
    private _worldRoots;
    private _originShiftListeners;
    private _radarBlips;
    readonly combat: CombatWorld;
    private _scenePanelWired;
    private _nameplates;
    private _nameplateList;
    private _nameplateScan;
    registerWorldRoot(node: BABYLON.TransformNode): void;
    unregisterWorldRoot(node: BABYLON.TransformNode): void;
    onOriginShift(callback: (dx: number, dz: number) => void): void;
    offOriginShift(callback: (dx: number, dz: number) => void): void;
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
     * world root, and every onOriginShift listener (which fixes its own node + JS).
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
    private _update;
    private _resizing;
    _resizeCount: number;
    onResize(): void;
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
    private _statsBaseScale;
    private _statsExpanded;
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
    private _recenterXr;
    /**
     * Re-seat the head: take your CURRENT head yaw as "facing forward". The same thing the
     * headset's own recentre (holding the Meta button) asks for — we listen for that too, so
     * it now works; this is the manual door, e.g. a panel button.
     */
    recenterXr(): void;
    /** Repaint BOTH presentations of the panel. The flat one rebuilds; the XR one rewrites
     * its contents in place. Unified on purpose — see `_perfPanelRows`. */
    private _repaintPanels;
    addDebugSource(source: DebugPanelSource): () => void;
    private _debugSourceRows;
    private _startLiveDebug;
    private _perfPanelRows;
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