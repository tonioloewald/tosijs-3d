import { Component } from 'tosijs';
import { type GamepadSource, type VirtualGamepad } from './virtual-gamepad.js';
export type ClusterAnchor = 'bottom-left' | 'bottom-right' | 'bottom-center' | 'top-left' | 'top-right' | 'top-center';
export type ClusterConfig = {
    /** SVG to load for this cluster. The default is the built-in sheet, cut to
     * this cluster's parts; any other url is shown whole. */
    url?: string;
    /** Which corner to pin it to. */
    anchor?: ClusterAnchor;
    /** Width of the cluster overlay in cqmin — relative to the host's own size,
     * so it scales with the view/card (multiplied by `scale`). The default sizes
     * every cluster cut from the sheet at one scale. */
    vmin?: number;
};
export type ClusterKey = 'left' | 'right' | 'center';
/** Every control the pad shows when none are named: all but the d-pad. */
export declare const DEFAULT_CONTROLS: string[];
export type Box = {
    x: number;
    y: number;
    width: number;
    height: number;
};
/**
 * The viewBox that shows a cluster cut from the sheet: its parts' boxes, grown
 * by `pad` (half the widest stroke), and every stick's full REACH — the travel
 * circle's radius plus the knob's, around the travel's centre — so a thumb
 * dragged to the rim is never clipped by the cluster's edge.
 */
export declare function cropBox(parts: Box[], pad: number, sticks?: {
    travel: Box;
    knob: Box;
}[]): Box;
/**
 * The box around a path's points, read from its `d` (absolute coordinates, as
 * the art is exported). A curve lies inside its control points, so this can
 * only be a little generous, never short.
 */
export declare function pathBox(d: string): Box | null;
/**
 * Parse a gamepad spec — e.g. `"a,b,right_stick(40,0),menu"` — into the controls
 * to show and any per-piece offsets. `''` / `'true'` → all controls. `a/b/x/y`
 * map to `A/B/X/Y`; `dpad` expands to the four directions.
 */
export declare function parseGamepadControls(spec: string): {
    controls?: string[];
    offsets: Record<string, {
        x: number;
        y: number;
    }>;
};
/**
 * The split touch gamepad as a Component: the element is a full-bleed overlay
 * (pointer-events pass through except on the clusters), and the element *is* the
 * `GamepadSource` — `poll()` merges every loaded cluster. b3dInputFocus finds it
 * and adds it to the active input provider.
 */
export declare class B3dGamepad extends Component implements GamepadSource {
    static preferredTagName: string;
    readonly kind = "glass";
    static initAttributes: {
        /** Spec string: `''`/`true` = full layout, else e.g. `"a,b,left_stick"`. */
        controls: string;
        /** Scale all clusters while keeping them anchored. */
        scale: number;
        deadzone: number;
        maxZone: number;
        /** Seconds of no keyboard/gamepad input before the pad fades back in. */
        idleSeconds: number;
        /** `'off'` keeps the pad visible whatever else you're holding — for
         * screenshots, desktop demos, or a scene where it IS the control. */
        fade: "on" | "off";
        /** Opacity while a real input device is in use (0 = invisible). */
        fadedOpacity: number;
    };
    content: HTMLDivElement[];
    controls: string;
    scale: number;
    deadzone: number;
    maxZone: number;
    idleSeconds: number;
    fade: 'on' | 'off';
    fadedOpacity: number;
    /** Advanced: per-cluster url/anchor/vmin overrides, or `false` to omit one.
     * `top` is the old name of `center`, which sits at the bottom now. */
    clusters?: {
        left?: ClusterConfig | false;
        right?: ClusterConfig | false;
        center?: ClusterConfig | false;
        /** @deprecated use `center` */
        top?: ClusterConfig | false;
    };
    handleButton?: (part: string, pressed: boolean) => void;
    private sources;
    private built;
    connectedCallback(): void;
    /**
     * FADE OUT when a real input device shows up, back IN after `idleSeconds`
     * of silence. On-screen controls are a fallback for a device with no
     * keyboard or gamepad; on a laptop they sit on top of the view being useless
     * — but removing them outright breaks the tablet case, and a manual toggle
     * is a setting nobody finds.
     *
     * WHAT COUNTS AS "a real input device": a **keypress**, or a **physical
     * gamepad**. Deliberately NOT the pointer, in any of its flavours:
     *
     * - **Touch** — touching the glass pad IS using it, so it must not fade away
     *   under your thumb.
     * - **Mouse / trackpad** — a pointer proves nothing about whether there's a
     *   keyboard, and the pad is fully operable by pointer (`pointerdown` drives
     *   the sticks). Fading on pointer movement meant the pad vanished exactly as
     *   you reached for it — you moved the mouse to click a stick, and the thing
     *   you were aiming at disappeared. It made the fade read as a bug rather
     *   than as a feature, and the demo on this page had to opt out of it
     *   entirely to be usable.
     *
     * A keypress is the honest signal, because it is the one that actually
     * implies the fallback isn't needed.
     */
    private _watchRealInput;
    /**
     * Is the pad currently hidden by the fade behaviour?
     *
     * Public because the fade is production-correct but development-hostile: once
     * a keyboard is in use the pad goes away and (short of an input
     * drought) doesn't come back, so checking it on a laptop meant reaching for
     * Chrome's responsive mode. `<tosi-b3d>` puts a gamepad gadget in the gear
     * panel that reads and flips this.
     */
    get hidden(): boolean;
    /**
     * Force the pad visible (`false`) or hand it back to the fade behaviour
     * (`true`). Reconciles immediately — a toggle that waited for the next
     * pointer move would read as broken.
     */
    setFade(on: boolean): void;
    private _setFaded;
    private _suppressedBy;
    /** Is the pad stepping aside for a menu (see `suppress`)? */
    get suppressed(): boolean;
    /**
     * Hide the pad and stop it reporting input until `release` is called with
     * the same reason. For a modal drawn in the scene, which would otherwise sit
     * under the pad. Reasons are counted separately.
     */
    suppress(reason?: string): void;
    release(reason?: string): void;
    private _inputWatch;
    private _idleTimer;
    private _faded;
    private _build;
    private _placed;
    private _resize?;
    private _layout;
    /** Did the `controls` spec name this part outright (not the default set)? */
    requested(part: string): boolean;
    /**
     * Press a button from somewhere else for a moment: the headset's system bar
     * presses view and menu this way, since the pad itself is not there. Held
     * for `ms`, long enough for every controllable's edge detector to see it.
     */
    pulse(part: 'view' | 'menu', ms?: number): void;
    private _pulses;
    poll(): VirtualGamepad;
    /** Mirror external gamepad state (hardware/keyboard) onto untouched controls. */
    reflectState(pad: VirtualGamepad): void;
    disconnectedCallback(): void;
}
export declare const b3dGamepad: import("tosijs").ElementCreator<B3dGamepad>;
//# sourceMappingURL=glass-gamepad.d.ts.map