import { Component } from 'tosijs';
export declare class B3dMoon extends Component {
    static preferredTagName: string;
    static initAttributes: {
        azimuth: number;
        elevation: number;
        size: number;
        color: string;
        brightness: number;
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
    /** Its direction on the star sphere (the sky dome's local frame). */
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