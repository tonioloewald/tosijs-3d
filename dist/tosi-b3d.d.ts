import { Component } from 'tosijs';
import * as BABYLON from '@babylonjs/core';
import * as GUI from '@babylonjs/gui';
import '@babylonjs/loaders';
import { type Widget3d } from './widgets3d.js';
import type { Medium } from './medium.js';
import { type Makers } from './make-mesh.js';
import { type PopupSurface, type PopupSurfaceOptions } from './popup-surface.js';
import { CombatWorld } from './destroyable.js';
import { XrFrames } from './xr-frames.js';
import { type FramePanelSpec } from './frame-panel.js';
import { type FogState, type FogLayer } from './atmosphere.js';
import { type QualitySetting } from './b3d-quality.js';
import { type AmbientEffect } from './ambient-budget.js';
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
        handleClick?: () => void;
        /** @deprecated use `handleClick` — removed in 0.9. */
        onClick?: () => void;
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
    static preferredTagName: string;
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
        /** Pause automatically when the tab/window goes to the background.
         * ⚠️ EXPERIMENTAL — see the pause demo; the VR path is unvalidated. */
        pauseWhenHidden: "on" | "off";
        /** Come up paused, showing the pause panel — the "press Start" shape. */
        startPaused: boolean;
        /**
         * Freeze the clock while the **re-seat** dialog is up (`'on'` default).
         *
         * Re-seating is a comfort action, and being shot while you do it is unfair.
         * But freezing is a decision only a LOCAL world can make — a networked one
         * cannot stop the other players — so set `'off'` for multiplayer and the
         * dialog still gates YOUR input, which is the half that always works.
         *
         * A string enum rather than a boolean because an HTML boolean attribute
         * cannot default to true (absent ⇒ false), and this one wants to.
         */
        reseatFreeze: "on" | "off";
        /**
         * On resume, enter immersive VR if the device supports it. This is why
         * starting paused matters: `enterXRAsync` REQUIRES a user gesture, and the
         * Continue tap is one. A scene that tried to enter XR on load would be
         * refused by the browser.
         *
         * The other direction — leaving VR pauses — is no longer gated on this; it
         * happens for every scene, because the pair is the point.
         */
        enterXrOnResume: "on" | "off";
    };
    static shadowStyleSpec: {
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
        ':host .pause-overlay': {
            position: string;
            inset: string;
            zIndex: string;
            display: string;
            alignItems: string;
            justifyContent: string;
            background: string;
        };
        ':host .pause-overlay[hidden]': {
            display: string;
        };
        ':host .pause-overlay > svg': {
            maxWidth: string;
            height: string;
            filter: string;
        };
        ':host .scene-panel-head': {
            position: string;
            top: string;
            right: string;
            zIndex: string;
            display: string;
            gap: string;
        };
        ':host .scene-panel-btn': {
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
            flex: string;
        };
        ':host .scene-panel-btn svg': {
            width: string;
            height: string;
            fill: string;
            stroke: string;
            strokeWidth: string;
            strokeLinecap: string;
            strokeLinejoin: string;
        };
        ':host .scene-panel-btn:hover': {
            background: string;
        };
        ':host .scene-panel-btn.active': {
            background: string;
            color: string;
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
    static BABYLON: typeof BABYLON;
    BABYLON: typeof BABYLON;
    private _xrSessions;
    private _xrBaseline;
    private _makers?;
    /**
     * Babylon primitives with the easy-to-forget parts done: material from
     * `color`/`glow`, `register()` so the sun and reflections see it, and
     * `computeWorldMatrix` so a ray this frame doesn't find it at the origin.
     *
     * `el.make.box({ y: 1, color: '#c33' })`. Same shape as a library's
     * `lib.make.scout({ y: 1 })` — one vocabulary whether you're making a
     * primitive or a model. See `make-mesh`.
     */
    get make(): Makers;
    /**
     * Open a popup as its own SURFACE — another plane, floating above the opener,
     * rather than more rows crammed into the panel you already have.
     *
     * See `popup-surface`: it can be owned (travels and dies with its opener) or
     * torn off (promoted to world space, preserving pose, and draggable).
     */
    openPopup(opts: PopupSurfaceOptions): PopupSurface;
    minElevation: number;
    maxElevation: number;
    minDistance: number;
    maxDistance: number;
    noXr: boolean;
    xrGrid: 'on' | 'off' | 'auto';
    xrReticle: 'on' | 'off';
    scenePanelOpen: boolean;
    stats: boolean;
    pauseWhenHidden: 'on' | 'off';
    startPaused: boolean;
    reseatFreeze: 'on' | 'off';
    enterXrOnResume: 'on' | 'off';
    private _paused;
    private _pausePanel;
    private _pauseWatch;
    private _cameraWasAttached;
    private _flatOrbitState;
    /** Is the simulation held? Rendering continues — the panel has to be drawn. */
    get paused(): boolean;
    /**
     * HOLD THE SIMULATION. Rendering keeps going (a frozen frame plus a panel is
     * the point; stopping the render loop would leave the panel invisible and the
     * canvas stale), but time does not advance: no combat tick, no fog, no
     * `update` hook, and `B3dControllable` sees an empty input so nothing drifts
     * while you are away.
     *
     * `reason` is carried on the `pause` event so a game can tell "the player
     * asked" from "the tab went away" — a settings menu and an interruption
     * deserve different handling.
     */
    /**
     * Modal input gate — the controls go dead, the world does NOT stop.
     *
     * For a dialog that borrows a control you also play with: the re-seat prompt
     * asks for a trigger pull, and without this that same pull fires the gun.
     * Deliberately not `pause()`: a pause raises the pause panel, can enter XR on
     * resume, and clobbers an existing pause when it lifts. Read by
     * `B3dControllable._update`.
     */
    private _inputSuppressed;
    get inputSuppressed(): boolean;
    suppressInput(on: boolean): void;
    /**
     * Stop the CLOCK for a transient modal — no pause panel, no resume semantics.
     *
     * `pause()` is a user-facing state: it raises the panel, can enter XR on
     * resume, and lifting it would clobber a pause the user set themselves. A
     * dialog that lasts two seconds wants none of that; it just wants the world
     * to hold still. This publishes `b3dFrameDelta = 0` exactly as a pause does,
     * so everything on `sceneDelta` stops, and lifts without touching pause state
     * (a scene paused underneath STAYS paused).
     *
     * **Local only, by definition.** Freezing is a decision your machine can make
     * and a networked world cannot honour — you cannot stop other players'
     * clocks. So `suppressInput` is the floor (your controls go dead, the world
     * carries on) and this is policy on top, which is why the re-seat dialog
     * always gates input and only optionally freezes (`reseatFreeze`).
     */
    private _frozen;
    get frozen(): boolean;
    freeze(on: boolean): void;
    pause(reason?: 'user' | 'hidden' | 'xr' | 'start' | string): void;
    /** Let time run again, and (if `enterXrOnResume`) take the user into VR —
     * this call is expected to be inside a user gesture, which is what makes
     * entering XR legal at all. */
    resume(): void;
    /**
     * The default pause panel: a title and a Continue button, centred in front of
     * the camera. Camera-relative so it works flat AND in a headset without a
     * second implementation — the same choice `b3d-death` makes.
     */
    private _showPausePanel;
    private _hidePausePanel;
    /**
     * Watch the things that should pause a scene without being asked.
     *
     * BACKGROUNDING: a hidden tab's rAF is throttled to nothing anyway, so the
     * value here isn't saving work — it's that the player comes back to a held
     * frame and a panel rather than to a world that carried on without them.
     *
     * ORIENTATION: reported, not acted on. A phone rotating is sometimes a pause
     * ("I put it down") and sometimes nothing at all, and only the game knows
     * which — so this dispatches `orientation` with the new value and lets the
     * game decide. Note that TILT (deviceorientation) is a different, permissioned
     * API on iOS and deliberately not touched here.
     */
    private _watchPause;
    /** Flip it. What the default panel's button and a pause key both want. */
    togglePause(): void;
    sceneCreated: B3dCallback;
    update: B3dCallback;
    setupXr: B3dCallback;
    scenePanel: (host: B3d) => Widget3d[];
    /**
     * The centred in-scene panel shown while paused. Return your own rows to
     * replace the default (a title and a Continue button) — a title screen, a
     * settings menu, a "you were away" summary.
     *
     * `resume` is passed in rather than left to be found: whatever you build must
     * be able to let the player back in, and a pause panel with no way out is the
     * failure mode this whole feature exists to avoid.
     *
     * Defaults to a function (not undefined) so the element creator treats it as
     * a settable prop, like `scenePanel`.
     */
    pausePanel: (host: B3d, resume: () => void) => Widget3d[] | null;
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
    private _disposeHandlers;
    private _libraries;
    /**
     * Run `cb` when the scene is ready — now if it already is, else on scene-ready.
     *
     * **It is a promise, not a hope.** A queued callback survives a teardown and
     * fires against the NEXT scene, because the alternative is the failure this
     * whole area specialises in: register, have the scene torn down before it was
     * ready, and your callback is dropped with no error and nothing to observe.
     * If the element is never re-added the callback is simply garbage along with
     * it, which costs nothing.
     */
    whenReady(cb: () => void): void;
    /**
     * Run `cb` when the scene is torn down — the other half of `whenReady`, and
     * the half that did not exist. Returns an unsubscribe.
     *
     * Anything holding a reference INTO the scene (a mesh, a material, an
     * observer, a timer closing over one) needs this: after teardown those
     * references are to a disposed scene, and Babylon's failure mode there is a
     * black material that still reports `isReady()` — silent, not loud.
     *
     * Subscriptions are durable across a rebuild; scene STATE is not. So a
     * handler registered once keeps working for every subsequent scene, and does
     * not need re-registering.
     */
    whenDisposed(cb: () => void): () => void;
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
        tier: import("./perf-probe.js").PerfTier;
        fps: number | null;
        resizeCount: number;
        xrActive: boolean;
    };
    loadScene: (path: string, file: string, processCallback?: (scene: BABYLON.Scene) => void) => Promise<void>;
    private _qualityOff;
    private static _probeStarted;
    private _setupQuality;
    /**
     * Run the device probe once the scene has actually settled.
     *
     * It used to go out on `setTimeout(…, 0)`, described as "deferred" — but a 0 ms
     * timeout defers by ONE TASK, so the benchmark ran inside the host scene's
     * heaviest moment: terrain building, shaders compiling, GLBs parsing. The probe
     * times GPU and CPU work against a fixed reference, so contention inflates every
     * measurement, and `classify()` puts anything scoring below 0.6 — under ~1.67×
     * the medium baseline — in the LOW tier. The result is then cached for 30 days.
     *
     * So the machine most able to show the engine off got the most conservative
     * budgets, because it loads the biggest scene and therefore contends the most,
     * and it stayed that way for a month. (tosijs-3d#11, reported on an M5 Max
     * holding 120fps.) Measuring an idle machine is the entire point of measuring.
     *
     * A spin-up sequence would let us measure a KNOWN workload during load instead
     * of waiting for quiet — see TODO.md. This is the fix that doesn't need one.
     */
    private _probeWhenIdle;
    private _applyHardwareScaling;
    private _ambient;
    /** Rationed by the watchdog: shed fast (`ratchetPool`), recovered slowly
     * (`recoverPool`) once the machine has held a good frame rate for 20 settled
     * seconds. The asymmetry is the damping — a transient must not cost the
     * session its weather, and a rebound must not cost it its frame rate. */
    private _ambientPoolScale;
    private _ambientSampleMs;
    private _ambientBadSamples;
    /** Sustained GOOD seconds, for the recovery path — see `_ambientWatchdog`. */
    private _ambientGoodSamples;
    private _ambientCooldownMs;
    /** Don't judge the frame rate until the scene has settled — see `_ambientWatchdog`.
     * A FLOOR, not the whole rule: `sceneBusy` holds the countdown while assets are
     * still landing, so this is the quiet time required AFTER loading finishes. */
    private _ambientWarmupMs;
    /**
     * Is the scene still building itself? Any frame-rate judgement taken while this
     * is true says nothing about the hardware.
     *
     * A fixed timer can't answer this: a streaming world loads for longer than any
     * number you'd pick, and a trivial scene settles sooner. `getWaitingItemsCount`
     * is what `reveal()` already trusts for exactly this question, and terrain
     * publishes its own settle state, so this asks THEM rather than the clock.
     * (tosijs-3d#11, manta-recon: ambient was shed during the loading screen and
     * ratcheted to zero for the session, on hardware that then ran fine.)
     */
    get sceneBusy(): boolean;
    /**
     * The ambient pool multiplier the watchdog has ratcheted down (1 = untouched,
     * 0 = garnish shed for the session).
     *
     * Settable because the watchdog's verdict is one-way by design, and a game may
     * legitimately know better — "that was the loading screen, try again". Manta
     * was reaching into two privates to say exactly that (#11).
     */
    get ambientPoolScale(): number;
    set ambientPoolScale(scale: number);
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
     *   actions: [{ label: () => (t.profiling ? 'Profiling ON' : 'Profile'), handleClick: () => t.setProfiling(!t.profiling) }],
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
    /**
     * THE MEDIA IN THIS SCENE — what things are moving through.
     *
     * A live list, not a snapshot: a water element registers itself here and
     * anything that cares (projectiles wanting drag, a vehicle wanting a regime,
     * a shader wanting depth) asks the scene rather than re-deriving the surface
     * from a mesh it had to go and find. Two subsystems deriving "am I under
     * water" separately is how they end up disagreeing at the boundary — the
     * failure that produced the fogged-sky/transparent-window conflict.
     *
     * See [[medium]] for the geometry (plane or sphere: a sea, or a planet's
     * ocean and atmosphere) and the queries.
     */
    readonly media: Medium[];
    /** Register a medium. Returns its unregister, like `addFogLayer`. */
    addMedium(m: Medium): () => void;
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
    private _errors;
    private _errorCaptureOff;
    private _installErrorCapture;
    private _debugRing;
    private _debugCapture;
    private _debugFrame;
    /** Monotone frame counter for ordering diagnostic events (NOT a clock). */
    get debugFrame(): number;
    /** The captured diagnostic events, oldest first. Read over haltija/DevTools. */
    get debugLog(): ReadonlyArray<Record<string, unknown>>;
    /** Arm (or, with on=false, disarm) diagnostic capture for a tag. */
    debugCapture(tag: string, on?: boolean): void;
    /** Record a diagnostic event if its tag is armed. Cheap no-op otherwise. */
    logDebug(tag: string, event: Record<string, unknown>): void;
    private _sourceRows;
    /**
     * ICON-BAR GADGETS — items that FLIP something rather than expanding a
     * readout. Same bar as the debug tools (one row of small icons, one UI in
     * both presentations), different job.
     *
     * The glass gamepad's fade is production-correct and development-hostile: as
     * soon as a mouse or trackpad is present it goes away and doesn't come back,
     * so checking it on a laptop meant switching Chrome into responsive mode.
     * This is the one-tap way back, and it works in a headset too.
     */
    private _panelGadgets;
    private _debugTools;
    private _startLiveDebug;
    private _perfReadoutRows;
    /**
     * The icon-bar items — diagnostics first, then gadgets.
     *
     * ONE list, two presentations, which is the panel's standing contract. Flat,
     * these render as small round buttons in the panel's header beside the close
     * button; in XR they render as an `iconBar3d` row, because a headset has no
     * DOM header to put them in. Same items, same handlers, different layout —
     * that is presentation, not divergence. What must never happen is the LIST
     * differing between the two.
     *
     * They moved out of the flat panel BODY because a full-width row per toggle
     * is a lot of panel for a thing you press once: "the graph button in the
     * standard panel is a waste of space" (Tonio).
     */
    private _barItems;
    private _panelWidgets;
    private _installXrRafPump;
    connectedCallback(): void;
    private _setupXR;
    private _startDefaultXrExperience;
    private _makePanel;
    private _setupNameplates;
    private _scanNameplates;
    private _setupScenePanel;
    /**
     * Open the flat scene panel: a header row of small round buttons pinned
     * top-right — the icon-bar items, then close — over the panel body.
     *
     * The toggles used to be a full-width `iconBar3d` row inside the body, which
     * spent a whole row of a small panel on things you press once. They are the
     * same items either way (`_barItems`); only the flat LAYOUT changed.
     */
    private _openScenePanel;
    private _closeScenePanel;
    /** Rebuild the flat scene panel from the current rows, if it's open.
     * Call after async state the panel reflects has changed (e.g. a library loaded,
     * or XR availability / session state) so an already-open panel updates. */
    refreshScenePanel(): void;
    private _setupGamepad;
    private _attachXrPanel;
    disconnectedCallback(): void;
    private _teardownTimer;
    private _teardown;
    render(): void;
}
export declare const b3d: import("tosijs").ElementCreator<B3d>;
export {};
//# sourceMappingURL=tosi-b3d.d.ts.map