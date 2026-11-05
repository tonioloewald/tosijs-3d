import type { ControlBox, ControlNode } from './widget-semantics.js';
export interface AriaMirrorOptions {
    /** The region's accessible name (the panel's title). */
    label?: string | (() => string);
    /**
     * Where a control's box (panel units) is on the host, in CSS pixels: the
     * copy then sits over the drawn control, unpainted and (on a touch-first
     * device) taking touches, so a finger exploring the screen with a screen
     * reader finds it there. Null, or
     * no `place`, keeps it hidden in the corner.
     */
    place?: (box: ControlBox) => ControlBox | null;
    /** `dialog` for a modal (a pause, a respawn): marked modal. Default `region`. */
    role?: 'region' | 'dialog';
}
export interface AriaMirror {
    /** The element the controls are in. */
    readonly root: HTMLElement;
    /** Re-read the tree: values patch in place, a changed structure rebuilds (focus kept by path). */
    update(): void;
    /** Empty it (the panel closed). */
    clear(): void;
    dispose(): void;
}
/** Visually hidden, still in the accessibility tree and focusable. */
export declare const VISUALLY_HIDDEN: Partial<CSSStyleDeclaration>;
/**
A placed copy: a real, opaque, touchable box with nothing painted. Not
`opacity: 0` and not `pointer-events: none`: iOS VoiceOver finds what is under
a finger by hit-testing, and passed over such copies for the canvas. A range
input's thumb is a pseudo-element, which an inline style cannot reach: the
host's stylesheet hides it (`<tosi-b3d>` does).
*/
export declare const UNPAINTED: Partial<CSSStyleDeclaration>;
export declare function ariaMirror(host: HTMLElement, read: () => ControlNode[] | null, options?: AriaMirrorOptions): AriaMirror;
//# sourceMappingURL=aria-mirror.d.ts.map