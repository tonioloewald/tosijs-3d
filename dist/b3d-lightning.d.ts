import * as BABYLON from '@babylonjs/core';
import { B3dChild } from './b3d-utils.js';
import type { B3d } from './tosi-b3d.js';
export declare class B3dLightning extends B3dChild {
    static preferredTagName: string;
    static initAttributes: {
        seed: number;
        bolts: "on" | "off";
        sprites: "on" | "off";
        thunder: "on" | "off";
        volume: number;
        groundLight: number;
        /** How much a nearby storm takes from the sun and the ambient light
         * (0.5 = half), so the flashes stand out. */
        darken: number;
        /** Shadows from the strike's light: 'on' | 'off'. */
        shadows: "on" | "off";
        shadowSize: number;
        /** How far from you (m) things cast strike shadows. */
        shadowRange: number;
        /** 'point' (shadows radiate from the bolt; 6 shadow renders per strike)
         * or 'directional' (1 render; right looking toward the strike). */
        flashLight: "point" | "directional";
        color: string;
        /** How often, as a multiple of the natural rate (storminess sets the
         * rest). */
        rate: number;
        /** How dramatic a flash is: the whole landscape, the cloud and the bolt
         * together. */
        brightness: number;
    };
    seed: number;
    bolts: 'on' | 'off';
    sprites: 'on' | 'off';
    thunder: 'on' | 'off';
    volume: number;
    groundLight: number;
    darken: number;
    shadows: 'on' | 'off';
    shadowSize: number;
    shadowRange: number;
    flashLight: 'point' | 'directional';
    rate: number;
    brightness: number;
    color: string;
    /** Strikes so far (a debug readout, and a test hook). */
    strikeCount: number;
    private _ids;
    private _nextId;
    private _lastT;
    private _live;
    private _obs;
    /** The strike's own (shadowed) light; replaces a point light so the scene
     * stays inside a material's 4-light budget. */
    private _dir;
    private _shadows;
    /** The strike the shadow map was last rendered for. */
    private _shadowStrike;
    private _sky;
    private _activity;
    private _glowMat;
    private _boltMat;
    private _spriteMat;
    private _audio;
    private _noise;
    private _id;
    private _storms;
    private _deck;
    private _groundY;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    private _tick;
    private _aim;
    private _start;
    private _color;
    private _glowMaterial;
    private _boltMaterial;
    private _sprite;
    private _thunder;
    sceneDispose(): void;
}
export declare const b3dLightning: import("tosijs").ElementCreator<B3dLightning>;
//# sourceMappingURL=b3d-lightning.d.ts.map