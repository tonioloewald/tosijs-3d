import type { InventoryApi, Item, MoveResult, Place } from './inventory.js';
export interface TradeSides {
    /** Yours: a container (your bag). */
    mine: Place;
    /** Theirs: a container (a chest, a shop's stock). */
    theirs: Place;
}
export interface TradeChange {
    /** What crossed, by kind (stacks split and join, so ids do not last). */
    kind: string;
    qty: number;
    from: Place;
    to: Place;
}
export interface Trade {
    readonly sides: TradeSides;
    /** What has crossed since it began, by kind, from where. */
    changed: () => TradeChange[];
    /** What you pay; negative is what you receive. 0 without a price. */
    balance: () => number;
    /** Put everything back where it started. */
    revert: () => MoveResult;
    /**
     * Settle in `currency`: back, then the same moves paid. Refused, left as it
     * was. `upTo`: when you receive more than they have, take all they have
     * (one payment of what it comes to, see `offer`) rather than refusing.
     */
    deal: (currency: string, options?: {
        upTo?: boolean;
    }) => MoveResult;
    /**
     * What changes hands in `currency` if you deal with `upTo`: `pay` (what
     * you pay, negative is what you receive) and `short`, true when they
     * cannot pay what it comes to and `pay` is all they have.
     */
    offer: (currency: string) => {
        pay: number;
        short: boolean;
    };
}
/** Begin a trade between `sides`; `price` is the inventory's own price rule (for the balance). */
export declare function beginTrade(inv: InventoryApi, sides: TradeSides, price?: (item: Item, from: Place | null, to: Place | null) => number): Trade;
//# sourceMappingURL=trade.d.ts.map