import type * as BABYLON from '@babylonjs/core';
import { B3dChild } from './b3d-utils.js';
import { type WeatherCell } from './weather.js';
import type { B3d } from './tosi-b3d.js';
export declare class B3dWeatherCell extends B3dChild {
    static preferredTagName: string;
    static initAttributes: {
        x: number;
        z: number;
        radius: number;
        windSpeed: number;
        windBearingDeg: number;
        coverage: number;
        precipitation: number;
        storminess: number;
        temperature: number;
        drift: "off" | "wind";
        lifetime: number;
        /** Seconds to build from nothing to full (0 = at once). Independent of
         * `lifetime`, so a permanent storm can still gather. */
        grow: number;
    };
    x: number;
    z: number;
    radius: number;
    windSpeed: number;
    windBearingDeg: number;
    coverage: number;
    precipitation: number;
    storminess: number;
    temperature: number;
    drift: 'off' | 'wind';
    lifetime: number;
    grow: number;
    /** Seconds since it entered the scene (drives `lifetime`). */
    age: number;
    /** The live cell the scene composes (read each time the weather is asked). */
    readonly cell: WeatherCell;
    private _remove;
    private _obs;
    private _ended;
    private _onShift;
    /** Copy the attributes into the live cell. Only non-zero contributions
     * count: a `coverage` of 0 must mean "no opinion", or a cell that only
     * wanted a lee would flatten the clouds' own dial to zero. */
    private _sync;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    sceneDispose(): void;
}
export declare const b3dWeatherCell: import("tosijs").ElementCreator<B3dWeatherCell>;
//# sourceMappingURL=b3d-weather-cell.d.ts.map