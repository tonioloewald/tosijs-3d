/** A key `addPicture` made (or a file carried). */
export declare const isPictureKey: (ref: string) => boolean;
/** Keep a picture's bytes; the key to put in a recipe. */
export declare function addPicture(bytes: Uint8Array, name: string, type?: string): Promise<string>;
/** Put back a picture a file carried (its key and base64 bytes). */
export declare function registerPicture(key: string, base64: string, type?: string): void;
/** What a texture loads for a recipe's picture: a kept picture's URL, any other URL as it is, null for a key not kept here. */
export declare function pictureUrl(ref: string): string | null;
/** A kept picture's bytes as base64, for a file to carry. */
export declare function pictureData(key: string): string | undefined;
/** Every picture key anywhere in a value (a recipe, a character's settings). */
export declare function picturesIn(value: unknown): string[];
//# sourceMappingURL=material-pictures.d.ts.map