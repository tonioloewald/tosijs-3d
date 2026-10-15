export interface ItemKind {
    id: string;
    name?: string;
    tags?: string[];
    mass?: number;
    /** Grid footprint, cells wide and high. Default 1 × 1. */
    size?: [number, number];
    cost?: number;
    /** How many boxes it is, each destroyed on its own. Default 1. */
    boxes?: number;
    /** Most in one stack. Default 1 (does not stack). */
    stack?: number;
    /** Numbers it adds to its holder when fitted. */
    contributes?: Record<string, number>;
    /** Its picture, as SVG markup (a view draws it; the model never reads it). */
    icon?: string;
    /** A line or two about it, for an info floater. */
    description?: string;
    [key: string]: unknown;
}
export interface Item {
    id: string;
    kind: string;
    qty: number;
    /** Boxes destroyed so far. */
    damaged?: number;
    /** Whatever the consumer keeps on an item: durability, quality, charges. */
    props?: Record<string, unknown>;
}
export interface Slot {
    /** Tags any one of which lets a thing in. Absent: anything. */
    accepts?: string[];
    holds: string | null;
    /** Whatever the consumer keeps on a place: a firing arc, a bone, a mount. */
    props?: Record<string, unknown>;
}
export type Container = {
    type: 'slots';
    slots: Record<string, Slot>;
} | {
    type: 'list';
    holds: string[];
    maxCount?: number;
} | {
    type: 'grid';
    cols: number;
    rows: number;
    holds: {
        item: string;
        x: number;
        y: number;
    }[];
};
export interface Holder {
    id: string;
    containers: Record<string, Container>;
    /** Money, points, anything a price is paid in. */
    purse?: Record<string, number>;
}
export interface InventoryDoc {
    items: Record<string, Item>;
    holders: Record<string, Holder>;
}
/** Where a thing is, or is going. */
export interface Place {
    holder: string;
    container: string;
    /** For slots. */
    slot?: string;
    /** For a grid: the top-left cell. */
    x?: number;
    y?: number;
}
export interface Move {
    /** An item that exists… */
    item?: string;
    /** …or a new one of this kind, from the catalogue. */
    kind?: string;
    /** How many (for a stack). Default all of it, or 1 from the catalogue. */
    qty?: number;
    /** Where to; `null` removes it (spent, sold to nowhere, destroyed). */
    to: Place | null;
    /** If the place is full, send what is there back where this came from. */
    swap?: boolean;
    /** Who pays a price, and in what (`purse` key). */
    pay?: {
        holder: string;
        in: string;
    };
    /** Who is paid. */
    payee?: string;
}
/** Inputs and tools are matched by kind id or by tag. */
export interface RecipePart {
    kind?: string;
    tag?: string;
    qty?: number;
}
export interface Recipe {
    id: string;
    inputs: RecipePart[];
    tools?: RecipePart[];
    outputs: {
        kind: string;
        qty?: number;
    }[];
}
export interface RuleContext {
    doc: InventoryDoc;
    kinds: Record<string, ItemKind>;
    totals: (holder: string) => Record<string, number>;
    where: (item: string) => Place | null;
    moves: Move[];
}
export type Rule = (ctx: RuleContext) => string[];
export type InventoryEvent = {
    type: 'moved';
    item: string;
    from: Place | null;
    to: Place | null;
} | {
    type: 'created';
    item: string;
    kind: string;
    to: Place | null;
} | {
    type: 'paid';
    from: string;
    to: string | null;
    amount: number;
    in: string;
} | {
    type: 'damaged';
    item: string;
    boxes: number;
};
export interface InventoryPlugins {
    kinds: Record<string, ItemKind>;
    rules?: Rule[];
    contribution?: (item: Item, kind: ItemKind, place: Place, slot: Slot | null) => Record<string, number>;
    price?: (item: Item, from: Place | null, to: Place | null) => number;
    /** Which containers count toward totals. Default: all but lists. */
    fitted?: (holder: Holder, container: string) => boolean;
}
export interface MoveResult {
    ok: boolean;
    reasons: string[];
    events: InventoryEvent[];
}
export interface InventoryApi {
    readonly doc: InventoryDoc;
    /** The catalogue it was made with. */
    readonly kinds: Record<string, ItemKind>;
    where: (item: string) => Place | null;
    /** Why these moves would be refused; empty means they would go. */
    check: (...moves: Move[]) => string[];
    /** Make the moves, all or none. */
    move: (...moves: Move[]) => MoveResult;
    /** A draft that collects moves and commits them together. */
    stage: () => InventoryDraft;
    totals: (holder: string) => Record<string, number>;
    /**
     * A RECIPE: use up its inputs from `holder`, require its tools there (not
     * used up), and make its outputs into `into`, as one move: all or none.
     */
    craft: (recipe: Recipe, holder: string, into: Place) => MoveResult;
    /**
     * A finished DESIGN as a new kind: what `holder` adds up to becomes the
     * kind's `contributes` (and its cost), so a ship class, a learned spell or a
     * forged sword can be made, owned and fitted like anything else.
     */
    compile: (holder: string, as: {
        id: string;
        name?: string;
        tags?: string[];
    }) => ItemKind;
    /** Destroy `boxes` boxes of the first undamaged item with `tag` on `holder`. */
    damage: (holder: string, tag: string, boxes?: number) => MoveResult;
    subscribe: (fn: (doc: InventoryDoc, events: InventoryEvent[]) => void) => () => void;
}
export interface InventoryDraft {
    readonly moves: Move[];
    /** Keep a move; returns what is still wrong with the draft as a whole. */
    add: (move: Move) => string[];
    remove: (index: number) => void;
    /** The state as it would be. */
    preview: () => InventoryDoc;
    totals: (holder: string) => Record<string, number>;
    check: () => string[];
    commit: () => MoveResult;
}
export declare function createInventory(initial: InventoryDoc, plugins: InventoryPlugins): InventoryApi;
//# sourceMappingURL=inventory.d.ts.map