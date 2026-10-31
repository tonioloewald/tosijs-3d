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
export function chooseFile(accept = '') {
    return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = accept;
        input.style.display = 'none';
        let done = false;
        const finish = (file) => {
            if (done)
                return;
            done = true;
            input.remove();
            resolve(file);
        };
        input.addEventListener('change', () => finish(input.files?.[0] ?? null));
        input.addEventListener('cancel', () => finish(null));
        document.body.appendChild(input);
        input.click();
    });
}
//# sourceMappingURL=choose-file.js.map