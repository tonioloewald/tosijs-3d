import * as BABYLON from '@babylonjs/core';
import { WaterMaterial } from '@babylonjs/materials';
import { AbstractMesh } from './b3d-utils.js';
import type { B3d } from './tosi-b3d.js';
export declare class B3dWater extends AbstractMesh {
    static preferredTagName: string;
    static initAttributes: {
        spherical: boolean;
        waterSize: number;
        subdivisions: number;
        textureSize: number;
        reflectionRefresh: number;
        twoSided: boolean;
        follow: boolean;
        normalMap: string;
        windForce: number;
        waveHeight: number;
        bumpHeight: number;
        waveLength: number;
        waterColor: string;
        colorBlendFactor: number;
        windDirectionX: number;
        windDirectionY: number;
        wind: "scene" | "own";
        x: number;
        y: number;
        z: number;
        rx: number;
        ry: number;
        rz: number;
        axes: boolean;
        underwaterFog: number;
        /** The colour of the water you are IN: sea blue by default; a methane sea
         * (Titan) is dark amber. The fog, the medium's optics and the light
         * shafts all read it. */
        fogColor: string;
        underwaterMurk: number;
        fogTransition: number;
        underside: "auto" | "on" | "off";
        undersideColor: string;
        undersideDepthColor: string;
        undersideSky: number;
        caustics: "auto" | "on" | "off";
        causticsStrength: number;
        /** Metres per caustic cell: bigger = a coarser, calmer web. */
        causticsScale: number;
    };
    waterMaterial?: WaterMaterial;
    private _callback?;
    private _underwaterUpdate?;
    private _removeFogLayer?;
    private _removeMedium?;
    private _medium;
    /** Is the sky currently fogged for us? Latched so we only touch it on a crossing. */
    private _skyFogged;
    /** What each sky mesh's `applyFog` was before we took it — restored on exit. */
    private _skyWasFogged;
    private _followTick?;
    private _ceilingTick?;
    private _caustics;
    private _ceiling;
    private _ceilingBump;
    /** The fog layer's crossing weight (0 in air, 1 fully under) — ONE value,
     * so the underside fades in exactly as the fog does. */
    private _underW;
    private _shimmer;
    private _ceilingKey;
    private _windTick?;
    private _wasUnderwater;
    private waterCallback;
    private _causticsOn;
    private _updateCaustics;
    /**
     * Wave wind: the scene's, or this element's own.
     *
     * `WaterMaterial` wants a force alongside a roughly UNIT direction, so the
     * speed cannot be folded into the vector — `waterWind` does that split.
     */
    private _wind;
    private updateWater;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    /**
     * THE SKY IS UNDERWATER TOO.
     *
     * A skybox is built `applyFog = false` and `infiniteDistance = true` — correct
     * in air, where a long fog layer would otherwise swallow the whole sky. But
     * submerged it means the fog does its job on everything EXCEPT the thing
     * filling most of the screen, so you fly through a faintly-tinted SKY instead
     * of through water. (tosijs-3d#12, manta-recon: "can't see anything underwater
     * except for the skybox".)
     *
     * Nastier than it sounds because of the trap it sets: turning `underwaterFog`
     * down to fix over-murky water makes it WORSE, since the heavy fog was the only
     * thing disguising an unfogged sky. So tuning clarity walks you into it.
     *
     * Under EXP2 fog an infinite-distance mesh resolves to the fog colour in every
     * direction, which is exactly what deep water looks like. This belongs here
     * because `b3d-water` already owns the fog layer and already computes camera
     * depth — anything else would have to duplicate both inputs and could disagree
     * with them at the boundary.
     *
     * Keyed off the same band weight as the fog itself (`w > 0`), so sky and fog
     * cannot disagree about where the surface is. It's a step where everything else
     * is a ramp, but density is ~0 at the crossing, so there is nothing to see;
     * `applyFog` is a boolean, so a true cross-fade would need per-mesh fog
     * strength, which Babylon doesn't offer.
     */
    private _fogTheSky;
    /** The skybox meshes to fog. Asks the `<tosi-b3d-skybox>` elements first —
     * a named element beats a name match — and falls back to the naming convention
     * so a hand-built or GLB skybox still works. */
    private _skyMeshes;
    private _fogKey;
    private _fogCache;
    /** `fogColor` as {r,g,b}, parsed only when it changes. */
    private _fogRgb;
    private _hexOr;
    private _undersideOn;
    private _updateCeiling;
    private _skyProbe;
    private _updateWindow;
    /** How much sun there is to blaze through: its light's intensity, 0 when
     * it is below the horizon. */
    private _sunUp;
    /** Stop photographing the sky while there is no window to show it in. */
    private _pauseWindow;
    private _buildCeiling;
    private _refreshObserver;
    sceneDispose(): void;
    /** Reposition the plane under the camera — but SNAPPED to a coarse grid, so it moves
     * occasionally (once per cell crossed), not every frame. Per-frame movement was the flicker.
     * The waves are world-anchored (procedural + the bump UV offset), so a snap is seamless: the
     * same sea, a differently-centred mesh. `follow` only. */
    private _applyFollow;
    render(): void;
}
export declare const b3dWater: import("tosijs").ElementCreator<B3dWater>;
//# sourceMappingURL=b3d-water.d.ts.map