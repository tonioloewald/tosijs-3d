import type { CharacterDoc } from './character-file.js';
export declare const CHARACTER_DB = "tosijs-characters";
/** The figure the builder is working on, kept as it changes. */
export declare const WORKING_CHARACTER = "(working)";
/** What a name typed to save or rename a character comes to. */
export type CharacterName = {
    ok: false;
    message: string;
} | {
    ok: true;
    name: string;
    replaces: boolean;
};
/**
 * A name typed to save or rename a character: trimmed, refused (with a
 * reason) when blank or the working figure's own key, and whether it
 * REPLACES another saved character. `current` is the name being saved again
 * or renamed: saving under it again replaces nothing.
 */
export declare function nameCharacter(typed: string, saved: readonly string[], current?: string): CharacterName;
/** Where in a document a run of bytes is: `garments/<name>` or `bodies/<name>`. */
type BlobPath = string;
/**
 * A document's bytes taken out (pure): the document left, and each base64
 * run by where it was.
 */
export declare function splitBlobs(doc: CharacterDoc): {
    doc: CharacterDoc;
    blobs: Record<BlobPath, string>;
};
/** The bytes put back (pure): the inverse of `splitBlobs`. A missing one is left out. */
export declare function joinBlobs(doc: CharacterDoc, blobs: Record<BlobPath, string | undefined>): CharacterDoc;
export interface CharacterStore {
    /** The named saves, sorted (not the working figure). */
    list(): Promise<string[]>;
    /** A save as a whole document, or null. */
    get(name: string): Promise<CharacterDoc | null>;
    /** Save a document under a name (its bytes kept once). */
    put(name: string, doc: CharacterDoc): Promise<void>;
    delete(name: string): Promise<void>;
}
/** This browser's characters. */
export declare function characterStore(): CharacterStore;
export {};
//# sourceMappingURL=character-store.d.ts.map