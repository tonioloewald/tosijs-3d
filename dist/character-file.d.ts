export declare const CHARACTER_FORMAT = "tosijs-character";
/** The layout this module writes. */
export declare const CHARACTER_VERSION = 1;
/** What a slot wears it in: a named colourway, and a material recipe. */
export interface SlotLook {
    look: string;
    material: unknown;
}
export interface Character {
    /** What the figure is called (the key it is saved under). */
    name: string;
    /** The builder's settings, by key: numbers, strings, booleans, recipes. */
    settings: Record<string, unknown>;
    /** Each clothing slot's look and material. */
    cloth: Record<string, SlotLook>;
    /** The tailor's outlines in progress: half outlines, [x, y] in metres on the character's left. */
    tailor: Array<Array<[number, number]>>;
    /** Garments of the wearer's own that it wears, by name, as GLB bytes. */
    garments: Record<string, Uint8Array>;
    /** Where its mesh body (by source name) comes from: a URL, or the file's bytes. */
    bodies?: Record<string, CharacterBody>;
}
/** Where a mesh body comes from: `url` (and `pick`), or the file itself. */
export interface CharacterBody {
    url?: string;
    /** The object in the file that is the body. */
    pick?: string;
    /** The file's bytes and its name (the extension says how to read it). */
    file?: {
        name: string;
        bytes: Uint8Array;
    };
}
export interface CharacterDoc {
    format: typeof CHARACTER_FORMAT;
    version: number;
    name: string;
    /** When it was written (ISO 8601), if the writer says. */
    saved?: string;
    settings: Record<string, unknown>;
    cloth: Record<string, SlotLook>;
    tailor: Array<Array<[number, number]>>;
    /** name → GLB, base64. */
    garments: Record<string, string>;
    /** source → `{ url, pick }`, or `{ file, data (base64), pick }`. */
    bodies?: Record<string, {
        url?: string;
        pick?: string;
        file?: string;
        data?: string;
    }>;
}
/** A character as a document, ready for `JSON.stringify`. */
export declare function writeCharacter(c: Character, options?: {
    saved?: string;
}): CharacterDoc;
export interface ReadCharacter {
    character: Character;
    /** What was skipped or filled in, one line each. */
    warnings: string[];
}
/**
 * Read a document (parsed, or its JSON text) against the page's defaults:
 * `settings` (every key the page has, with its default value) and `slots`
 * (the clothing slots, with their default look). Throws when it is not a
 * character document, or is newer than this module.
 */
export declare function readCharacter(input: string | unknown, defaults: {
    settings: Record<string, unknown>;
    slots?: Record<string, SlotLook>;
}): ReadCharacter;
//# sourceMappingURL=character-file.d.ts.map