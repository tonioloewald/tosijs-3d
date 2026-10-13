export interface ColorPreset {
    name?: string;
    value: string;
}
/**
 * A small general set: five greys from whitish to blackish, then seven dull,
 * greyed colours in the order of the spectrum. No pure white and no pure
 * black: a lit surface that is already at the limit has nowhere to go, so
 * white blows out under any light and black shows no shading at all. Muted on purpose: a scene's colours are mostly
 * earths and hazes, and a saturated swatch is rarely the one you want but
 * always the one that catches the eye. The picker above is one tap away for
 * anything brighter, and `+` keeps what you make.
 */
export declare const COLOR_PRESETS: string[];
/** Normalise, drop what does not parse, and keep the first of any repeat. */
export declare function presetList(own: Array<string | ColorPreset> | undefined, withDefaults: boolean): ColorPreset[];
/** Where each preset square goes: `columns` across, wrapping. */
export declare function presetCells(count: number, width: number, size?: number, gap?: number): {
    columns: number;
    height: number;
    at: (i: number) => {
        x: number;
        y: number;
    };
};
export interface SwatchStorage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}
export interface SwatchStore {
    /** The caller's, then the saved ones, then the general set; less the removed. */
    list(own?: Array<string | ColorPreset>, withDefaults?: boolean): ColorPreset[];
    /** Save a colour. False if it was already offered or does not parse. */
    add(hex: string): boolean;
    /**
     * Take a colour out of what is offered, whoever supplied it.
     * `stillOffered` says whether something other than this store supplies it
     * (the caller's presets); unset, anything not saved here is assumed to be.
     */
    remove(hex: string, stillOffered?: (hex: string) => boolean): void;
    readonly added: string[];
    readonly removed: string[];
    /** Told after every change. Returns its unsubscribe. */
    subscribe(cb: () => void): () => void;
}
export declare const SWATCH_KEY = "tosijs-3d:color-swatches";
export declare function createSwatchStore(storage?: SwatchStorage | null, key?: string): SwatchStore;
/** The page's one store, kept in `localStorage` where there is one. */
export declare function sharedSwatches(): SwatchStore;
//# sourceMappingURL=color-presets.d.ts.map