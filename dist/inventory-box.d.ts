import type { PointerKind } from './box.js';
import { type CarryDecorations } from './carry-box.js';
import type { Carry } from './carry.js';
import type { InventoryApi, Item, ItemKind, Move, Place } from './inventory.js';
export interface InventoryPanelOptions {
    inv: InventoryApi;
    carry: Carry<string>;
    holder: string;
    host: SVGSVGElement;
    title?: string;
    decorations?: (item: Item, kind: ItemKind | undefined) => CarryDecorations | undefined;
    moveFor?: (item: string, from: Place | null, to: Place) => Move;
    /**
     * Reasons this panel will not take a move, on top of the model's rules: a
     * view's own policy (a shop's goods go to the counter, not into your bag).
     */
    refuse?: (item: string, from: Place | null, to: Place) => string[];
    totals?: boolean;
    /**
     * Art per container (container name → SVG source or element): its slots
     * are placed where the art's sockets are. A socket is an element with
     * `data-slot="<slot>"`, or any element with an `id` inside a group with
     * the id `Sockets` (the id is the slot). Slots the art has no socket for
     * are listed under it.
     */
    schematics?: Record<string, string | SVGSVGElement>;
    /** A fixed height: the panel scrolls (wheel) instead of growing. */
    height?: number;
    /** Draw only these containers. */
    only?: string[];
    /** Do not draw these containers. */
    hide?: string[];
    /**
     * Other slots (in the same container) an item takes up besides its own,
     * where it is drawn faded: a two-handed weapon shown in both hands. The
     * game decides; the panel only draws it. An empty slot only.
     */
    alsoIn?: (item: Item, kind: ItemKind | undefined, at: Place) => string[];
    /**
     * Shrink to fit the space the page gives it, keeping its shape, rather than
     * being cropped (default on). Panels side by side in a row shrink in
     * proportion; in a column it is no wider than the column; it is never
     * taller than its container. Never larger than it is drawn. Anything the
     * page sets inline on the host wins. Off for a host inside another SVG.
     */
    fit?: boolean;
    /**
     * What the info floater says about a thing (a title, then lines), shown
     * while it is pointed at or selected. Default: its name, its description,
     * its mass and what it adds.
     */
    info?: (item: Item, kind: ItemKind | undefined) => string[];
    /**
     * Draw the drag's ghost in a page overlay above every panel (default).
     * Off for a panel inside a 3D plane, which shares a `carryGhostLayer` in
     * the plane's SVG and is fed through `handlePointer`.
     */
    overlay?: boolean;
    /**
     * Give the panel a DROP target ("drop", heading its list): a thing dropped
     * there leaves the inventory. Called first with what is dropped and where
     * from; return reasons to refuse (it springs back), or nothing to let it
     * go, and put it in the world yourself (on the ground at the player's
     * feet). No drop target without it.
     */
    handleDrop?: (item: Item, kind: ItemKind | undefined, from: Place) => string[] | void;
}
export interface InventoryPanel {
    /** Pointer input in the host's own coordinates (a plane feeds it this way). */
    handlePointer: (kind: PointerKind, x: number, y: number) => void;
    dispose: () => void;
}
/** Where a schematic's sockets are, in its viewBox. */
export interface SchematicSocket {
    slot: string;
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface Schematic {
    viewBox: [number, number, number, number];
    /** What is actually drawn (the art's own bounds, a little padded), in its units. */
    content: [number, number, number, number];
    /** The art's root, to clone from. */
    root: SVGSVGElement;
    sockets: SchematicSocket[];
}
/**
 * Read a schematic: its viewBox, and where each socket is. Measured by the
 * browser when there is one (so transforms and relative paths are right),
 * else from the elements' own coordinates.
 */
export declare function readSchematic(src: string | SVGSVGElement): Schematic;
/**
 * How a schematic sits in `avail` panel units: at the art's OWN scale (a
 * socket drawn 44 units square is 44 on the panel, the size it was designed
 * as a target), shrunk only when the panel is too narrow, and centred.
 */
export declare function schematicFit(s: Schematic, avail: number): {
    k: number;
    height: number;
    /** A point in the art's units to panel units, relative to the art's box. */
    at: (x: number, y: number) => {
        x: number;
        y: number;
    };
};
/** Draw one holder of an inventory into `host`, redrawn whenever the inventory changes. */
export declare function inventoryPanel(opts: InventoryPanelOptions): InventoryPanel;
export interface InventoryDockOptions extends Pick<InventoryPanelOptions, 'inv' | 'carry' | 'holder' | 'title' | 'decorations' | 'moveFor' | 'refuse' | 'alsoIn' | 'info' | 'handleDrop'> {
    /** The slots container drawn as a schematic, and its art. */
    schematic: {
        container: string;
        art: string | SVGSVGElement;
    };
    /** The list shown beside it when open (a bag); none for a craft fitted from a carrier's stock. */
    list?: string | null;
    /**
     * The schematic panel's width (default 410) and the list's (200). The list
     * is as tall as the schematic panel unless `height` says otherwise (it
     * scrolls).
     */
    width?: number;
    listWidth?: number;
    height?: number;
    /** Called whenever the dock opens or closes, with its size in its own units. */
    handleResize?: (size: {
        width: number;
        height: number;
        open: boolean;
    }) => void;
}
export interface InventoryDock {
    /** The dock's SVG: give it to a plane (its viewBox is its size). */
    svg: SVGSVGElement;
    readonly open: boolean;
    setOpen: (open: boolean) => void;
    /** Pointer input in the dock's viewBox coordinates (what a plane routes). */
    handlePointer: (kind: PointerKind, x: number, y: number) => void;
    dispose: () => void;
}
export declare function inventoryDock(opts: InventoryDockOptions): InventoryDock;
//# sourceMappingURL=inventory-box.d.ts.map