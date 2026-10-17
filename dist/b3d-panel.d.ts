import { Component } from 'tosijs';
import type { FramePanelSpec, AnchorSpec, AnchorPreset, ScreenAnchor } from './frame-panel.js';
export declare class B3dPanel extends Component {
    static preferredTagName: string;
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
        icon: string;
        chrome: string;
        url: string;
        width: number;
        revealStart: number;
        revealFull: number;
        maxDistance: number;
        presence: string;
        flatFrame: string;
        /** Texture px (square); 0 = the default 384 — see FramePanelSpec.resolution. */
        resolution: number;
        /** 'world' | 'ui' | 'modal': drawn and picked over the world (ui), or over that too (modal). */
        layer: string;
        /** System panel: 'off' stays open beside other system panels (an app's chrome). */
        exclusive: string;
        /** System panel: open when the scene starts. */
        open: boolean;
    };
    static shadowStyleSpec: {
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
    layer: string;
    view: string;
    title: string;
    icon: string;
    chrome: string;
    url: string;
    width: number;
    revealStart: number;
    revealFull: number;
    maxDistance: number;
    presence: string;
    flatFrame: string;
    resolution: number;
    exclusive: string;
    open: boolean;
    /**
     * Live content (JS only): an SVG, with its own `handlePointer` if it takes
     * the pointer. Setting it again swaps an open system panel's content in
     * place (same button, spot and open state, #111) and fires `panelcontent`;
     * disposing the old content is the setter's caller's job.
     */
    get svg(): SVGSVGElement | null;
    set svg(next: SVGSVGElement | null);
    private _svg;
    /** Where it goes in the flat view, in place of the anchor (JS only). */
    flatAnchor: AnchorPreset | AnchorSpec | null;
    /** Flat placement in screen terms (pixels / % / vmin pins); wins over `flatAnchor`. JS only. */
    screenAnchor: ScreenAnchor | null;
    /** Where it comes when its content asks for focus, and how much bigger (JS only). */
    focusAnchor: AnchorPreset | AnchorSpec | null;
    focusScale: number;
    private _child;
    private _content;
    /** Build the FramePanelSpec this element declares. */
    toSpec(): FramePanelSpec;
}
export declare const b3dPanel: (...args: unknown[]) => B3dPanel;
//# sourceMappingURL=b3d-panel.d.ts.map