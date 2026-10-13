import { Component } from 'tosijs';
import { type GasGiantLook } from './gas-giant.js';
export declare class B3dMoon extends Component {
    static preferredTagName: string;
    static initAttributes: {
        azimuth: number;
        elevation: number;
        size: number;
        color: string;
        brightness: number;
        frame: "stars" | "ground";
        gas: string;
        bands: number;
        turbulence: number;
        storm: number;
        bandColors: string;
        axisTilt: number;
        spin: number;
        seed: number;
    };
    static shadowStyleSpec: {
        ':host': {
            display: string;
        };
    };
    azimuth: number;
    elevation: number;
    size: number;
    color: string;
    brightness: number;
    frame: 'stars' | 'ground';
    gas: string;
    bands: number;
    turbulence: number;
    storm: number;
    bandColors: string;
    axisTilt: number;
    spin: number;
    seed: number;
    /** What the sky shader draws when this is a gas giant; null for a moon. */
    gasLook(): GasGiantLook | null;
    /** Its direction: on the star sphere (the sky dome's local frame), or in
     * the world when `frame` is `'ground'`. */
    direction(): {
        x: number;
        y: number;
        z: number;
    };
    private _sky;
    render(): void;
    disconnectedCallback(): void;
}
export declare const b3dMoon: import("tosijs").ElementCreator<B3dMoon>;
//# sourceMappingURL=b3d-moon.d.ts.map