import { B3dChild } from './b3d-utils';
import { type MeterName, type TraceKind, type HudWarning } from './hud';
import type { B3d } from './tosi-b3d';
import * as BABYLON from '@babylonjs/core';
export declare class B3dHud extends B3dChild {
    static preferredTagName: string;
    static initAttributes: {
        url: string;
        size: number;
        pxPerDeg: number;
    };
    static lightStyleSpec: {
        ':host': {
            position: string;
            inset: string;
            display: string;
            alignItems: string;
            justifyContent: string;
            pointerEvents: string;
            mixBlendMode: string;
            opacity: string;
            zIndex: string;
        };
        ':host([hidden])': {
            display: string;
        };
        ':host svg': {
            width: string;
            height: string;
            display: string;
        };
        '@keyframes hud-threat': {
            '0%, 100%': {
                strokeOpacity: string;
            };
            '50%': {
                strokeOpacity: string;
            };
        };
        ':host .hud-threat': {
            stroke: string;
            strokeWidth: string;
            animation: string;
        };
    };
    url: string;
    size: number;
    pxPerDeg: number;
    private controller;
    private _meters;
    private _horizon;
    private _warnings;
    private _svgTex;
    private _plane;
    private _planeMat;
    private _inSceneParent;
    private _inSceneOpts?;
    private _inSceneVisible;
    sceneReady(owner: B3d, _scene: BABYLON.Scene): void;
    /**
     * Project the HUD into the 3D scene on a plane parented to `parent` — e.g. an
     * aircraft canopy, so it banks with the airframe and reads correctly in a 3D
     * cockpit and in VR (where the DOM overlay is invisible). Position is in the
     * parent's local space; default sits it a little ahead of and above the origin.
     * Call `setInSceneVisible(true)` to show it (the aircraft toggles this per view).
     */
    attachInScene(parent: BABYLON.TransformNode, opts?: {
        size?: number;
        position?: BABYLON.Vector3;
        resolution?: number;
    }): void;
    private _buildInScenePlane;
    /** Show/hide the in-scene cockpit HUD plane (independent of the DOM overlay). */
    setInSceneVisible(visible: boolean): void;
    /** tosijs Component calls this on resize (it owns the observer + teardown).
     * `handleResize`, not `onResize` — the `on<Event>` prefix is reserved for the
     * elements factory's event sugar and collides with a component callback. */
    handleResize(): void;
    /**
     * Size the square HUD against BOTH viewport dimensions.
     *
     * `size`% of the smaller side alone is right in landscape and pathological in
     * portrait: on a 1400x713 window it paints 36% of the width, on a 500x757 one
     * it paints 70% of it — the same rule, twice the visual weight, because in
     * portrait the small side IS the width (measured 2026-08-15, reported from a
     * phone in fullscreen).
     *
     * So it is also capped at HALF that percentage of the LONG side, which keeps
     * roughly the landscape proportion in portrait and leaves landscape itself
     * within a couple of percent of where it was. Both dimensions, not just the
     * one that happens to be smaller.
     */
    private _measure;
    sceneDispose(): void;
    /** Fill a meter arc (`speed`/`altitude`/`health`/`energy`), level 0..1. */
    setMeter(name: MeterName, level: number): void;
    /** Reference marks (notches) on a meter — see `hud.setMeterMarks`. */
    setMeterMarks(name: MeterName, levels: number[]): void;
    private _marks;
    /** Drive the horizon: pitch/roll in degrees, optional centre AoA number. */
    setHorizon(pitchDeg: number, rollDeg: number, angle?: number): void;
    /** Show/hide the whole HUD (e.g. hide it in a chase view, show it in the cockpit). */
    setVisible(visible: boolean): void;
    /**
     * Show/hide just the artificial horizon + pitch ladder, keeping the meters,
     * radar traces and warnings. This is what a CHASE view wants: from outside
     * the aircraft a horizon drawn level with the airframe contradicts the real
     * horizon behind it, while everything else on the HUD is still true.
     */
    setHorizonVisible(visible: boolean): void;
    private _horizonVisible;
    /** Warning lines (PULL UP / MISSILE …); a warning's `side` flashes that arc red. */
    setWarnings(warnings: HudWarning[]): void;
    /**
     * Where a WORLD point appears ON THE HUD, in viewBox coords — using the HUD's REAL
     * geometry rather than re-deriving a projection.
     *
     * The in-scene HUD is a literal quad on the canopy (a combiner glass), so "where does
     * that target appear on the HUD" is just: cast a ray from the EYE through the target
     * and intersect it with the quad. We do it in the quad's LOCAL space (transform eye +
     * target by the plane's inverse world matrix; the plane is then the z=0 square from
     * -size/2..+size/2), which folds in the plane's position, orientation, parent and
     * scale for free — no projection matrix, no FOV, no handedness to get wrong. It
     * therefore cannot disagree with what the renderer draws through the glass.
     *
     * Returns null if the target isn't in front of the eye. `tracked` is false when the
     * hit falls OUTSIDE the glass — the caller pins those to the ring.
     */
    projectWorldToHud(world: {
        x: number;
        y: number;
        z: number;
    }, camera: BABYLON.Camera): {
        x: number;
        y: number;
        tracked: boolean;
    } | null;
    /** Flat-overlay projection: Babylon projects the world point to SCREEN (its real
     * projection — cannot disagree with what's drawn), then we map that screen point into
     * the overlay SVG's on-screen rect → viewBox coords. */
    private _projectViaScreen;
    /** Replace the radar traces from WORLD positions — the HUD projects them onto its
     * own quad (see projectWorldToHud), so blips land on the targets you see. */
    setTraces(traces: Array<{
        pos: {
            x: number;
            y: number;
            z: number;
        };
        kind: TraceKind;
        /** 0..1 lock acquisition — the trace fills in as it builds. */
        lockProgress?: number;
        locked?: boolean;
    }>, camera: BABYLON.Camera): void;
}
export declare const b3dHud: (...args: unknown[]) => B3dHud;
//# sourceMappingURL=b3d-hud.d.ts.map