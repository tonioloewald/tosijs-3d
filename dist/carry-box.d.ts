import type { Box, BoxChild, PointerKind } from './box.js';
import { type Carry, type CarryTarget } from './carry.js';
/** How a thing shows its condition, supplied by the consumer per thing. */
export interface CarryDecorations {
    /** A small status bar, 0…1 (durability, charge, ammo). Absent: none. */
    bar?: number;
    barColor?: string;
    /** `'damaged'`, `'broken'`, or any CSS colour. */
    outline?: string | null;
    /** A short mark in the corner: a count, a quality, `2H`. */
    badge?: string;
}
/** How a thing looks while it is dragged: its picture, or its name. */
export interface CarryLook {
    label: string;
    icon?: string | SVGElement;
}
export interface CarryTileChild<T> extends BoxChild {
    carryThing: T;
    carryFrom: string;
    carryLook: CarryLook;
    /** Stop listening to the carry (call when the tile is thrown away). */
    dispose: () => void;
}
export interface CarryTileOptions<T> {
    carry: Carry<T>;
    thing: T;
    /** Where it is now (a socket's id, a list's id). */
    from: string;
    label: string;
    width?: number;
    height?: number;
    decorations?: () => CarryDecorations | undefined;
    /**
     * The place this tile is in, as a target: something dropped ON the tile
     * goes there. A long (scrolled) list is all tiles, so this is what makes
     * the whole list a place to drop.
     */
    target?: CarryTarget<T>;
    /**
     * Its picture (SVG markup or an element), drawn in a square. A row shows it
     * beside the name; a small tile (in a socket) shows the picture alone, and
     * the info floater names it. The picture is what a drag carries.
     */
    icon?: string | SVGElement;
    /** What the info floater says while the pointer is on it (or it is selected): a title, then lines. */
    info?: () => string[];
}
/** A thing you can pick up: its picture or label, and its decorations. */
export declare function carryTile<T>(opts: CarryTileOptions<T>): CarryTileChild<T>;
export interface CarrySocketChild<T> extends BoxChild {
    carryTarget: CarryTarget<T>;
    /** Stop listening to the carry (call when the socket is thrown away). */
    dispose: () => void;
}
export interface CarrySocketOptions<T> {
    carry: Carry<T>;
    target: CarryTarget<T>;
    label: string;
    width?: number;
    height?: number;
    /**
     * What is in it now, drawn inside it. A tile here can be picked up from
     * the socket: pressed and dragged, or tapped.
     */
    holding?: BoxChild | null;
    /**
     * `'row'` (default) draws a framed row with its label inside. `'art'` draws
     * nothing at rest, because a picture under it (a schematic) already shows
     * the socket: it outlines when it would take what is held, darkens when it
     * would not, and shows its label and the reason beneath it on hover. The
     * held tile fills it.
     */
    look?: 'row' | 'art';
    /**
     * `holding` is drawn faded: it is not IN this socket but takes it up too (a
     * two-handed weapon in the other hand). It can still be picked up here.
     */
    echo?: boolean;
}
/** A place a carried thing can go: lights, dims and says why. */
export declare function carrySocket<T>(opts: CarrySocketOptions<T>): CarrySocketChild<T>;
export interface CarryGhostLayer {
    /** Feed it the pointer, in `layer`'s coordinates. */
    handlePointer: (kind: PointerKind, x: number, y: number) => void;
    dispose: () => void;
}
/**
 * The ghost for several panels drawn in ONE SVG (`layer`): it follows the
 * pointer across all of them, and a drop that misses springs back to where
 * the drag began. Feed it the same pointer the panels get, in the layer's
 * coordinates (give each `carryPanel` `ghost: false`). This is how panels on
 * one 3D plane share a ghost; `carryOverlay` is the same on a page.
 */
export declare function carryGhostLayer<T>(carry: Carry<T>, layer: Element): CarryGhostLayer;
/**
 * The ghost for panels ON A PAGE: one overlay above everything, following
 * the pointer across panels (give each `carryPanel` `ghost: false`). A drop
 * that misses springs back to where the drag began, wherever that was. One
 * per carry; calling it again returns the same one. Panels on a 3D plane
 * use `carryGhostLayer` in the plane's SVG instead.
 */
export declare function carryOverlay<T>(carry: Carry<T>): {
    dispose: () => void;
};
export interface CarryPanel {
    /** Feed the panel's pointer events here instead of to the box. */
    handlePointer: (kind: PointerKind, x: number, y: number) => void;
    /** Stop listening to the carry (a panel that is rebuilt makes a new one). */
    dispose: () => void;
}
/**
 * Drag and drop for one box: a press on a tile that moves far enough is a
 * drag; a ghost follows the pointer; letting go drops it on the socket under
 * the pointer, and a drop that does not land springs back. Everything else is
 * the box's own pointer handling.
 */
export declare function carryPanel<T>(box: Box, carry: Carry<T>, opts?: {
    /** Where a drop goes when the pointer is over no socket or tile of its own (a list's whole panel). */
    fallback?: CarryTarget<T>;
    /**
     * Draw the ghost in this panel (default). Panels on a page pass `false`
     * and share a `carryOverlay`, so the ghost crosses from one to the next
     * instead of being clipped by each.
     */
    ghost?: boolean;
}): CarryPanel;
//# sourceMappingURL=carry-box.d.ts.map