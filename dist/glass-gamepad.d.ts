import { type GamepadSource, type VirtualGamepad } from './virtual-gamepad';
export type ClusterAnchor = 'bottom-left' | 'bottom-right' | 'bottom-center' | 'top-left' | 'top-right' | 'top-center';
export type ClusterConfig = {
    /** SVG to load for this cluster. */
    url?: string;
    /** Which corner to pin it to. */
    anchor?: ClusterAnchor;
    /** CSS width of the cluster overlay (height follows the SVG aspect). */
    width?: string;
};
export type GlassGamepadConfig = {
    /** Set a cluster to `false` to omit it, or override its url/anchor/width. */
    left?: ClusterConfig | false;
    right?: ClusterConfig | false;
    top?: ClusterConfig | false;
    deadzone?: number;
    maxZone?: number;
    onButton?: (part: string, pressed: boolean) => void;
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