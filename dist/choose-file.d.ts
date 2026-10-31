/**
 * Ask for a file: the browser's file picker, resolving with the file chosen
 * or null when it is cancelled. Call it from a click (a picker needs the
 * user's gesture).
 *
 * THE INPUT IS IN THE PAGE until the picker answers. A detached
 * `<input type="file">` is held by nothing while its dialog is open, so it
 * can be collected (and Safari may not fire its `change`): the file you
 * picked then goes nowhere, with no error. It is hidden, and removed after.
 */
export declare function chooseFile(accept?: string): Promise<File | null>;
//# sourceMappingURL=choose-file.d.ts.map