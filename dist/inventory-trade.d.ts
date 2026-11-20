import type { PointerKind } from './box.js';
import type { CarryDecorations } from './carry-box.js';
import type { Carry } from './carry.js';
import { type InventoryControl } from './inventory-box.js';
import type { InventoryApi, Item, ItemKind, Move, Place } from './inventory.js';
import { type Trade } from './trade.js';
export interface TradePanelOptions {
    inv: InventoryApi;
    carry: Carry<string>;
    mine: Place;
    theirs: Place;
    titles?: {
        mine?: string;
        theirs?: string;
    };
    /** How the other side is named in a sentence ('he', 'the smith'). */
    they?: string;
    price?: (item: Item, from: Place | null, to: Place | null) => number;
    currency?: string;
    width?: number;
    height?: number;
    decorations?: (item: Item, kind: ItemKind | undefined) => CarryDecorations | undefined;
    info?: (item: Item, kind: ItemKind | undefined) => string[];
    /** The move a drop makes (a box of 24 rounds off a stack of 120): as inventoryPanel's. */
    moveFor?: (item: string, from: Place | null, to: Place) => Move;
    handleDone?: (result: {
        dealt: boolean;
    }) => void;
}
export interface TradePanel {
    svg: SVGSVGElement;
    /** Start a fresh trade: call it each time it opens. */
    begin: () => void;
    readonly trade: Trade | null;
    handlePointer: (kind: PointerKind, x: number, y: number) => void;
    /**
     * The things on both sides, then the buttons, as named controls (also
     * `svg.controls`): a press on a thing moves it straight across (it has
     * only one place to go); a chest's default is take all.
     */
    controls: () => InventoryControl[];
    dispose: () => void;
}
export declare function tradePanel(opts: TradePanelOptions): TradePanel;
//# sourceMappingURL=inventory-trade.d.ts.map