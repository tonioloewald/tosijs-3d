import * as BABYLON from '@babylonjs/core';
import { B3dChild } from './b3d-utils.js';
import type { B3d } from './tosi-b3d.js';
export declare class B3dLightShafts extends B3dChild {
    static preferredTagName: string;
    static initAttributes: {
        count: number;
        radius: number;
        width: number;
        spread: number;
        strength: number;
        rainBoost: number;
        color: string;
        underwater: "on" | "off";
        underwaterCount: number;
    };
    count: number;
    radius: number;
    width: number;
    spread: number;
    strength: number;
    rainBoost: number;
    color: string;
    underwater: 'on' | 'off';
    underwaterCount: number;
    /** Read-only: how rough the water above you is (0–1), last time rays were
     * placed. Drives their number, width and flicker. */
    waterRoughness: number;
    private _shafts;
    private _mats;
    private _obs;
    private _since;
    private _seq;
    private _pool;
    private _time;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    private _material;
    /** The light's colour, normalised so its brightest channel is 1. */
    private _lightColor;
    private _tick;
    /** Drop shafts that have faded out and are no longer wanted. */
    private _sweep;
    /**
     * Under the deck: score a world-anchored grid around you. A GAP (low
     * opacity) beside CLOUD is where the sun breaks through, and only where the
     * local cover is broken (0.5 up to 1). Keep the best `count`.
     */
    private _placeSky;
    /**
     * Under the water: shafts come down from the surface where the waves focus
     * the light. A world-anchored grid on the SURFACE, around the point your
     * view reaches it along the light; each cell lit or not by a hash that
     * changes every few seconds, so the shafts shimmer in and out.
     */
    private _placeWater;
    /** How rough the water is here: the wind over it plus the water element's
     * own wave settings. */
    private _roughness;
    /** The water medium you are under, if any, with how far light carries. */
    private _waterAbove;
    /** Sunlight tinted by the water's fog: the fog's HUE (its brightest
     * channel at 1), leaning the white light most of the way toward it. */
    private _waterTint;
    private _makeMesh;
    /**
     * The shaft's shape this frame: a trapezoid hanging from its source along
     * the light (widening only if `spread` asks), turned about its own axis to
     * face you.
     */
    private _shape;
    sceneDispose(): void;
}
export declare const b3dLightShafts: import("tosijs").ElementCreator<B3dLightShafts>;
//# sourceMappingURL=b3d-light-shafts.d.ts.map