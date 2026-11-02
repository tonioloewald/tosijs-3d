import * as BABYLON from '@babylonjs/core';
import type { B3d } from './tosi-b3d.js';
import { B3dChild } from './b3d-utils.js';
import { type CityLayout, type CityLayoutOptions, type RoadPiece, type Side } from './city-layout.js';
import { type Traffic } from './city-traffic.js';
/** One model in a kit. */
export interface KitPiece {
    /** A library `type` named in the kit's `libraries`. */
    library: string;
    mesh: string;
    /** Quarter turns clockwise (north to east) from the piece's canonical orientation (road pieces). */
    turns?: number;
    /** Footprint in cells, along the street and back from it (buildings). Default: measured from the model. */
    size?: [number, number];
    /** Which side of the unturned model is its front (buildings). Default `'n'`. */
    front?: Side;
    /** World metres per model unit, if not the city's (cars are not built to the city's grid). */
    scale?: number;
    /** How likely, against the others in its list. Default 1. */
    weight?: number;
}
export interface CityKit {
    /** Model units a cell (Kenney's city kits: 1). */
    cell: number;
    /** How much of a road tile's width is roadway, kerb to kerb (Kenney's: 0.8). Default 0.8. */
    roadway?: number;
    /** Library type → URL (a CDN path goes through `assetUrl`). */
    libraries: Record<string, string>;
    roads: Partial<Record<RoadPiece, KitPiece>>;
    buildings: {
        downtown: KitPiece[];
        suburbs: KitPiece[];
    };
    /** Its arm reaches toward -Z; `bulb` is where the light is, model units. */
    streetLight?: KitPiece & {
        bulb: [number, number, number];
    };
    /** Cars, parked and driving. */
    parkedCars?: KitPiece[];
    /** The ground between the buildings. */
    ground?: string;
}
/** Kenney's city kits (CC0): roads, commercial, suburban; Kenney's cars parked. */
export declare const KENNEY_CITY: CityKit;
/**
 * Where to start a car in the middle of a city: the straight road nearest the
 * centre, in the right-hand lane, facing along it. Metres in the city's frame
 * (add the city's `x`, `z`); `ry` in degrees. Give it the city's options.
 */
export declare function cityStart(options: CityLayoutOptions & {
    cell?: number;
    roadway?: number;
}): {
    x: number;
    z: number;
    ry: number;
};
/**
 * Ground for a city in a landscape: a terrain `landform` that is dead flat at
 * `level` under the whole grid and eases into the hills around it (a
 * [landform](/landform/) `pad`), and a decorator `clear` that keeps trees and
 * rocks off it. Give it the city's size and place (`x`, `z`: its middle, as
 * the city's own attributes). Both take the terrain's logical coordinates.
 */
export declare function cityGround(options: {
    width: number;
    depth: number;
    cell?: number;
    x?: number;
    z?: number;
    level: number;
    /** How far the slope back up to the hills runs, metres. Default 160. */
    blend?: number;
}): {
    landform: (x: number, z: number, h: number) => number;
    clear: (x: number, z: number) => number;
};
export declare class B3dCity extends B3dChild {
    static preferredTagName: string;
    static initAttributes: {
        width: number;
        depth: number;
        seed: number;
        cell: number;
        blockMin: number;
        blockMax: number;
        downtown: number;
        lightEvery: number;
        lampAngle: number;
        flicker: number;
        parked: number;
        chunk: number;
        traffic: number;
        sound: "on" | "off";
        x: number;
        y: number;
        z: number;
    };
    width: number;
    depth: number;
    seed: number;
    cell: number;
    blockMin: number;
    blockMax: number;
    downtown: number;
    lightEvery: number;
    lampAngle: number;
    flicker: number;
    parked: number;
    chunk: number;
    traffic: number;
    sound: 'on' | 'off';
    x: number;
    y: number;
    z: number;
    /** The manifest: which model is which. Set it before the city is built. */
    kit: CityKit;
    /** The plan it built. */
    layout: CityLayout | null;
    private root;
    private libraries;
    private templates;
    private lampLights;
    private releaseLamps;
    /** The cars driving round, and how each model draws them. */
    trafficState: Traffic | null;
    private trafficModels;
    private beams;
    private trafficLamps;
    private citySound;
    private windows;
    private generation;
    get lamps(): number;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    private template;
    private build;
    private rayProxy;
    private makeRayProxy;
    private startTraffic;
    /** The player's vehicles, in the city's frame: traffic stops for them, and is pushed by them. */
    private obstacles;
    private drawTraffic;
    /** At dusk the lamps come up; their positions follow the city (floating origin). */
    private updateLamps;
    sceneDispose(): void;
}
export declare const b3dCity: import("tosijs").ElementCreator<B3dCity>;
//# sourceMappingURL=b3d-city.d.ts.map