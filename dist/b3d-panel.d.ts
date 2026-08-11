import { Component } from 'tosijs';
import type { FramePanelSpec } from './frame-panel';
export declare class B3dPanel extends Component {
    static initAttributes: {
        frame: string;
        preset: string;
        azimuth: number;
        elevation: number;
        distance: number;
        position: string;
        roll: number;
        reveal: string;
        blend: string;
        view: string;
        title: string;
        url: string;
        width: number;
        revealStart: number;
        revealFull: number;
        maxDistance: number;
    };
    static styleSpec: {
        ':host': {
            display: string;
        };
    };
    frame: string;
    preset: string;
    azimuth: number;
    elevation: number;
    distance: number;
    position: string;
    roll: number;
    reveal: string;
    blend: string;
    view: string;
    title: string;
    url: string;
    width: number;
    revealStart: number;
    revealFull: number;
    maxDistance: number;
    /** Build the FramePanelSpec this element declares. */
    toSpec(): FramePanelSpec;
}
export declare const b3dPanel: (...args: unknown[]) => B3dPanel;
//# sourceMappingURL=b3d-panel.d.ts.map