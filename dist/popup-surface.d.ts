import * as BABYLON from '@babylonjs/core';
import { type B3dSvgPlane } from './b3d-svg-plane';
import type { B3d } from './tosi-b3d';
export interface PopupSurfaceOptions {
    /** The panel's content. Its viewBox aspect sets the plane's height. */
    svg: SVGSVGElement;
    /**
     * What this popup belongs to. Parented to it, so it travels with it and dies
     * with it. Omit for a popup that is born free.
     */
    opener?: BABYLON.TransformNode | BABYLON.AbstractMesh | null;
    /** World width; height follows the svg's aspect. Default 1. */
    width?: number;
    /** Texture resolution. Default 512 — each surface is a texture, see Budget. */
    resolution?: number;
    /** Position relative to the opener (or world, if there is none). */
    offset?: {
        x?: number;
        y?: number;
        z?: number;
    };
    /**
     * Extra nudge toward the viewer, in world units. Depth is what makes a popup
     * read as "on top" without a z-index. Default 0.02 — enough to beat
     * co-planar z-fighting, small enough not to look detached.
     */
    lift?: number;
    /**
     * Can it be grabbed and moved? Default true.
     *
     * Dragging an OWNED popup tears it off first — the same gesture as pulling a
     * tab out of a window, and the reason an owned popup doesn't need a separate
     * "tear off" affordance to be discoverable.
     */
    draggable?: boolean;
    /**
     * Fraction of the panel's height that acts as the TITLE BAR — the only place
     * a drag starts. Default 0.2; `0` makes the whole panel draggable.
     *
     * A grip rather than the whole surface, because a popup with controls in it
     * needs its own pointer events: if dragging started anywhere, every button
     * press would try to move the panel. Tonio: "indicate you can only drag them
     * by the title bar in case the popup needs pointer stuff".
     */
    gripHeight?: number;
    /** Draw the move / close glyphs into the title bar. Default true — an
     * affordance nobody can see is not an affordance. */
    chrome?: boolean;
    /**
     * A modal blocks pointer interaction with everything BEHIND it until it
     * closes. The camera still moves — a modal owns the UI, not your head, and in
     * a headset you cannot take someone's view away without making them ill.
     */
    modal?: boolean;
}
export interface PopupSurface {
    /** The plane element (an `AbstractMesh`, so it has x/y/z and rx/ry/rz). */
    plane: B3dSvgPlane;
    /** Dispose it. Safe to call twice. */
    close(): void;
    /**
     * Promote to world space, preserving world pose: it stops being owned, stays
     * where it is, and becomes draggable. Idempotent.
     */
    tearOff(): void;
    readonly tornOff: boolean;
    /** Internal: the depth offset currently applied by the stack, so restacking
     * replaces it rather than accumulating. */
    stackLift?: {
        x: number;
        y: number;
        z: number;
    };
    /** Internal: does this one block what is behind it? */
    modal?: boolean;
    /** Internal: title-bar height as a fraction of the panel. */
    gripFraction: number;
    /** Internal: start the move gesture (called after the grip hit test). */
    beginDrag(pointerId: number): void;
    /** Bring this popup to the front of the stack. */
    toFront(): void;
}
export declare function openPopup(owner: B3d, opts: PopupSurfaceOptions): PopupSurface;
//# sourceMappingURL=popup-surface.d.ts.map