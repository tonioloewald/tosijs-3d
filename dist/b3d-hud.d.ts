import { B3dChild } from './b3d-utils';
import { type MeterName, type HudTraceInput, type HudWarning } from './hud';
import type { HudTraceOptions } from './hud-math';
import type { Pose } from './spatial-transform';
import type { B3d } from './tosi-b3d';
import * as BABYLON from '@babylonjs/core';
export declare class B3dHud extends B3dChild {
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
    /** tosijs Component calls this on resize (it owns the observer + teardown). */
    onResize(): void;
    private _measure;
    sceneDispose(): void;
    /** Fill a meter arc (`speed`/`altitude`/`health`/`energy`), level 0..1. */
    setMeter(name: MeterName, level: number): void;
    /** Drive the horizon: pitch/roll in degrees, optional centre AoA number. */
    setHorizon(pitchDeg: number, rollDeg: number, angle?: number): void;
    /** Show/hide the whole HUD (e.g. hide it in a chase view, show it in the cockpit). */
    setVisible(visible: boolean): void;
    /** Warning lines (PULL UP / MISSILE …); a warning's `side` flashes that arc red. */
    setWarnings(warnings: HudWarning[]): void;
    /** Replace the radar/waypoint traces from world positions + the viewer pose. */
    setTraces(traces: HudTraceInput[], viewer: Pose, opts: HudTraceOptions): void;
}
export declare const b3dHud: (...args: unknown[]) => B3dHud;
//# sourceMappingURL=b3d-hud.d.ts.map