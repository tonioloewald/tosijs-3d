import { type GamepadSource, type VirtualGamepad } from './virtual-gamepad';
export type ClusterAnchor = 'bottom-left' | 'bottom-right' | 'bottom-center' | 'top-left' | 'top-right' | 'top-center';
export type ClusterConfig = {
    /** SVG to load for this cluster. */
    url?: string;
    /** Which corner to pin it to. */
    anchor?: ClusterAnchor;
    /** Base width of the cluster overlay in vmin (multiplied by `scale`). */
    vmin?: number;
};
export type GlassGamepadConfig = {
    /** Set a cluster to `false` to omit it, or override its url/anchor/vmin. */
    left?: ClusterConfig | false;
    right?: ClusterConfig | false;
    top?: ClusterConfig | false;
    /** Show only these controls (data-part names). Omit → show everything. A
     * cluster with none of the requested controls isn't mounted. */
    controls?: string[];
    /** Scale all clusters down/up while keeping them anchored. Default 1. */
    scale?: number;
    deadzone?: number;
    maxZone?: number;
    onButton?: (part: string, pressed: boolean) => void;
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
 * A split touch gamepad. `element` is a full-bleed overlay (`pointer-events`
 * pass through except on the clusters themselves); `poll()` merges all loaded
 * clusters into one `VirtualGamepad`.
 */
export declare class GlassGamepad implements GamepadSource {
    readonly element: HTMLDivElement;
    private sources;
    private disposed;
    constructor(config?: GlassGamepadConfig);
    private mountCluster;
    poll(): VirtualGamepad;
    /** Mirror external gamepad state (hardware/keyboard) onto untouched controls. */
    reflectState(pad: VirtualGamepad): void;
    dispose(): void;
}
export declare function glassGamepad(config?: GlassGamepadConfig): GlassGamepad;
//# sourceMappingURL=glass-gamepad.d.ts.map