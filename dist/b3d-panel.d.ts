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
    /**
     * Flat placement in screen terms (pixels / % / vmin pins); wins over
     * `flatAnchor`. JS only. On an open system panel no one has dragged, a new
     * one moves it now (fires a bubbling `panelanchor`).
     */
    get screenAnchor(): ScreenAnchor | null;
    set screenAnchor(next: ScreenAnchor | null);
    private _screenAnchor;
    /** Is it open now (a system panel)? */
    get isOpen(): boolean;
    /** Open it (a system panel). Before the scene is up, it opens at start. */
    show(): void;
    /** Close it (a system panel). */
    hide(): void;
    /** Open it if closed, close it if open. */
    toggle(): void;
    /**
     * Blink its button on the system bar, flat and in a headset, for `ms`
     * (default 1600): something in it changed that is worth a look.
     */
    attention(ms?: number): void;
    /** The scene this panel is on, if it shows system panels. */
    private _host;
    /**
     * Where a point of its content (viewBox units, what the content's
     * `handlePointer` takes) is on the page, in client pixels: open, flat, as a
     * system panel; null otherwise. For a test or Haltija to click a row where
     * a person would (#113): drag, scale and title bar included.
     */
    contentToClient(x: number, y: number): {
        x: number;
        y: number;
    } | null;
    /** Its content's box on the page (client pixels), or null; see `contentToClient`. */
    clientRect(): DOMRect | null;
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