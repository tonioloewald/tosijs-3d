import { Component } from 'tosijs';
import { type GamepadSource, type VirtualGamepad } from './virtual-gamepad';
export type ClusterAnchor = 'bottom-left' | 'bottom-right' | 'bottom-center' | 'top-left' | 'top-right' | 'top-center';
export type ClusterConfig = {
    /** SVG to load for this cluster. */
    url?: string;
    /** Which corner to pin it to. */
    anchor?: ClusterAnchor;
    /** Base width of the cluster overlay in cqmin — relative to the host's own
     * size, so it scales with the view/card (multiplied by `scale`). */
    vmin?: number;
};
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
    static initAttributes: {
        /** Spec string: `''`/`true` = full layout, else e.g. `"a,b,left_stick"`. */
        controls: string;
        /** Scale all clusters while keeping them anchored. */
        scale: number;
        deadzone: number;
        maxZone: number;
    };
    content: HTMLDivElement[];
    controls: string;
    scale: number;
    deadzone: number;
    maxZone: number;
    /** Advanced: per-cluster url/anchor/vmin overrides, or `false` to omit one. */
    clusters?: {
        left?: ClusterConfig | false;
        right?: ClusterConfig | false;
        top?: ClusterConfig | false;
    };
    handleButton?: (part: string, pressed: boolean) => void;
    private sources;
    private built;
    connectedCallback(): void;
    private _build;
    poll(): VirtualGamepad;
    /** Mirror external gamepad state (hardware/keyboard) onto untouched controls. */
    reflectState(pad: VirtualGamepad): void;
    disconnectedCallback(): void;
}
export declare const b3dGamepad: import("tosijs").ElementCreator<B3dGamepad>;
//# sourceMappingURL=glass-gamepad.d.ts.map