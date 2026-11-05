/** MakeHuman's hm08 body pack, under the asset base. */
export declare const HM08_PACK_PATH = "makehuman/hm08/hm08.json";
/** Its version: bumped whenever the pack is rebaked, so caches let go. */
export declare const HM08_PACK_VERSION = 18;
/** The pack's URL, resolved against the asset base when asked (set it first). */
export declare function hm08PackUrl(): string;
/** Hair colour presets: a base and its usual highlight, sRGB hex. */
export declare const HAIR_COLOURS: Readonly<Record<string, {
    base: string;
    highlight: string;
}>>;
/** What can be worn, one of each at a time. */
export declare const CHARACTER_SLOTS: readonly ["outfit", "bodysuit", "armour", "top", "bottom", "shoes", "gloves", "hat", "mask", "glasses"];
/** Every setting a character has, with its default. */
export declare const DEFAULT_CHARACTER: Record<string, any>;
//# sourceMappingURL=character-settings.d.ts.map